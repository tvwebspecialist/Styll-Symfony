import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { Json } from '@/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { INBOX_TENANT_ROLES } from '@/lib/tenant-role-guard'

import { syncConversationStateAfterHumanReply } from './conversation-state-service'
import { createMessagingAdminClient } from './db'
import {
  MANUAL_WHATSAPP_OUTBOX_MAX_ATTEMPTS,
  parseManualInboxOutboxPayload,
  planManualWhatsAppOutboxRetry,
  type ManualInboxOutboxPayload,
} from './manual-whatsapp-outbox-core'
import {
  ManualWhatsAppReplyError,
  RECENT_DUPLICATE_WINDOW_MS,
  isManualWhatsAppReplyError,
  sendManualWhatsAppReplyCore,
  type ManualWhatsAppReplyInput,
  type ManualWhatsAppReplyMessage,
} from './manual-whatsapp-reply-core'
import { metaWhatsAppAdapter } from './meta-whatsapp-adapter'
import {
  toInboxDeliveryStatus,
  type InboxDeliveryStatus,
  type MessageLogStatus,
} from './message-delivery'

const MANUAL_REPLY_SCHEMA = z.object({
  text: z.string(),
}).strict()

type MetaOutboundConfig =
  | {
      state: 'enabled'
      accessToken: string
      graphApiVersion: string
    }
  | {
      state: 'misconfigured'
      message: string
    }

type MetaResponseEnvelope = {
  messages?: Array<{
    id?: string
    message_status?: string
  }>
  error?: {
    code?: number
    error_subcode?: number
    message?: string
    type?: string
  }
}

type StoredOutboxRow = {
  attempts: number
  client_id: string | null
  conversation_id: string | null
  id: string
  last_error: string | null
  messages_log_id: string | null
  payload: Json
  recipient: string
  scheduled_for: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  tenant_id: string
}

type PendingManualOutboxSummary = {
  claimed: number
  deadLettered: number
  processed: number
  reconciled: number
  remainingPending: number
  retried: number
  sent: number
  skipped: number
}

function normalizeEnvValue(value: string | undefined): string {
  return value?.trim() ?? ''
}

function resolveMetaOutboundConfig(env: NodeJS.ProcessEnv = process.env): MetaOutboundConfig {
  const accessToken = normalizeEnvValue(env.META_WHATSAPP_ACCESS_TOKEN)
  const graphApiVersion = normalizeEnvValue(env.META_WHATSAPP_GRAPH_API_VERSION)

  if (!accessToken) {
    return {
      state: 'misconfigured',
      message: 'WhatsApp outbound is not configured. META_WHATSAPP_ACCESS_TOKEN is missing.',
    }
  }

  if (!graphApiVersion) {
    return {
      state: 'misconfigured',
      message: 'WhatsApp outbound is not configured. META_WHATSAPP_GRAPH_API_VERSION is missing.',
    }
  }

  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    return {
      state: 'misconfigured',
      message: 'WhatsApp outbound is misconfigured. META_WHATSAPP_GRAPH_API_VERSION must look like v23.0.',
    }
  }

  return {
    state: 'enabled',
    accessToken,
    graphApiVersion,
  }
}

function normalizeWhatsAppRecipient(value: string | null): string | null {
  if (!value) return null

  const digitsOnly = value.replace(/\D/g, '')
  if (digitsOnly.length < 6 || digitsOnly.length > 20) return null

  return digitsOnly
}

function toMessageLogStatus(status: Extract<InboxDeliveryStatus, 'pending' | 'sent'>): MessageLogStatus {
  return status === 'pending' ? 'queued' : 'sent'
}

function buildReplyMessage(input: {
  authorName: string | null
  bodyText: string
  conversationId: string
  createdAt: string
  deliveryStatus: InboxDeliveryStatus
  id: string
}): ManualWhatsAppReplyMessage {
  return {
    id: input.id,
    conversationId: input.conversationId,
    bodyText: input.bodyText,
    direction: 'outbound',
    authorKind: 'human',
    authorName: input.authorName,
    createdAt: input.createdAt,
    usedTemplate: false,
    deliveryStatus: input.deliveryStatus,
  }
}

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505'
}

async function readJsonResponse(response: Response): Promise<Json | null> {
  const raw = await response.text()
  if (raw.trim().length === 0) return null

  try {
    return JSON.parse(raw) as Json
  } catch {
    return null
  }
}

function asMetaResponseEnvelope(payload: Json | null): MetaResponseEnvelope {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  return payload as MetaResponseEnvelope
}

function extractMetaResponseMessageId(payload: Json | null): string | null {
  const firstMessage = asMetaResponseEnvelope(payload).messages?.[0]
  const value = firstMessage?.id?.trim()
  return value ? value : null
}

function extractInitialDeliveryStatus(payload: Json | null): Extract<InboxDeliveryStatus, 'pending' | 'sent'> {
  const firstMessage = asMetaResponseEnvelope(payload).messages?.[0]
  const providerStatus = firstMessage?.message_status?.trim().toLowerCase()

  if (providerStatus === 'held_for_quality_assessment' || providerStatus === 'queued') {
    return 'pending'
  }

  return 'sent'
}

function summarizeMetaError(payload: Json | null): {
  code: number | null
  subcode: number | null
  message: string | null
  type: string | null
} {
  const error = asMetaResponseEnvelope(payload).error

  return {
    code: typeof error?.code === 'number' ? error.code : null,
    subcode: typeof error?.error_subcode === 'number' ? error.error_subcode : null,
    message: typeof error?.message === 'string' ? error.message : null,
    type: typeof error?.type === 'string' ? error.type : null,
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

async function getRequestTenantId(): Promise<string | null> {
  return getActiveTenantId()
}

async function getConversation(conversationId: string) {
  const db = createMessagingAdminClient()
  const { data, error } = await db
    .from('inbox_conversations')
    .select(
      'id, tenant_id, provider, provider_phone_number_id, external_contact_id, contact_phone, client_id',
    )
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    throw new Error(`[whatsapp/manual-send] inbox_conversations lookup failed: ${error.message}`)
  }

  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    provider: data.provider,
    phoneNumberId: data.provider_phone_number_id?.trim() || null,
    recipient: normalizeWhatsAppRecipient(data.external_contact_id || data.contact_phone),
    clientId: data.client_id,
  } as const
}

async function getAuthorizedActor(tenantId: string, userId: string) {
  const db = createAdminClient()
  const { data, error } = await db
    .from('staff_members')
    .select('id, role, profiles(full_name)')
    .eq('tenant_id', tenantId)
    .eq('profile_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('role', [...INBOX_TENANT_ROLES])
    .maybeSingle()

  if (error) {
    throw new Error(`[whatsapp/manual-send] staff_members lookup failed: ${error.message}`)
  }

  if (!data) return null

  const profileRel = (data as {
    profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null
  }).profiles
  const profile = Array.isArray(profileRel) ? profileRel[0] : profileRel
  const displayName = profile?.full_name?.trim() ?? null

  return {
    tenantId,
    userId,
    staffId: data.id,
    role: data.role as typeof INBOX_TENANT_ROLES[number],
    displayName: displayName && displayName.length > 0 ? displayName : null,
  }
}

async function findRecentDuplicate(input: {
  bodyText: string
  conversationId: string
  recipient: string
  tenantId: string
  userId: string
}) {
  const db = createMessagingAdminClient()
  const cutoff = new Date(Date.now() - RECENT_DUPLICATE_WINDOW_MS).toISOString()

  const { data: recentLogs, error: logsError } = await db
    .from('messages_log')
    .select('id, status, created_at, sent_at')
    .eq('tenant_id', input.tenantId)
    .eq('conversation_id', input.conversationId)
    .eq('provider', 'meta_whatsapp')
    .eq('direction', 'outbound')
    .eq('body_sent', input.bodyText)
    .eq('recipient', input.recipient)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(5)

  if (logsError) {
    throw new Error(`[whatsapp/manual-send] messages_log duplicate lookup failed: ${logsError.message}`)
  }

  for (const log of recentLogs ?? []) {
    const { data: message, error: messageError } = await db
      .from('inbox_messages')
      .select('id, conversation_id, body_text, created_at')
      .eq('messages_log_id', log.id)
      .maybeSingle()

    if (messageError) {
      throw new Error(`[whatsapp/manual-send] inbox_messages duplicate lookup failed: ${messageError.message}`)
    }

    if (message) {
      return buildReplyMessage({
        authorName: null,
        id: message.id,
        conversationId: message.conversation_id,
        bodyText: message.body_text ?? input.bodyText,
        createdAt: message.created_at,
        deliveryStatus: toInboxDeliveryStatus(log.status as MessageLogStatus),
      })
    }

    if (log.status !== 'failed' && log.status !== 'bounced') {
      throw new ManualWhatsAppReplyError(
        'RECENT_SEND_PENDING_RECONCILIATION',
        409,
        'Un invio identico risulta gia in corso o gia eseguito di recente. Verifica la conversazione prima di ritentare.',
      )
    }
  }

  return null
}

function buildManualOutboxPayload(input: {
  actor: {
    displayName: string | null
    role: typeof INBOX_TENANT_ROLES[number]
    staffId: string
    userId: string
  }
  bodyText: string
  phoneNumberId: string
}): ManualInboxOutboxPayload {
  return {
    source: 'dashboard_manual_inbox',
    type: 'text',
    text: input.bodyText,
    phone_number_id: input.phoneNumberId,
    actor: {
      user_id: input.actor.userId,
      staff_id: input.actor.staffId,
      role: input.actor.role,
      display_name: input.actor.displayName,
    },
  }
}

async function loadOutboxRow(outboxId: string): Promise<StoredOutboxRow | null> {
  const db = createMessagingAdminClient()
  const { data, error } = await db
    .from('messaging_outbox')
    .select(
      'id, tenant_id, conversation_id, client_id, recipient, payload, status, attempts, last_error, scheduled_for, messages_log_id',
    )
    .eq('id', outboxId)
    .maybeSingle()

  if (error) {
    throw new Error(`[whatsapp/manual-send] messaging_outbox lookup failed: ${error.message}`)
  }

  return (data as StoredOutboxRow | null) ?? null
}

async function createDraft(input: {
  actor: {
    displayName: string | null
    role: typeof INBOX_TENANT_ROLES[number]
    staffId: string
    userId: string
  }
  bodyText: string
  clientId: string | null
  conversationId: string
  phoneNumberId: string
  recipient: string
  tenantId: string
}) {
  const db = createMessagingAdminClient()
  const createdAt = new Date().toISOString()
  const logMetadata: Json = {
    source: 'dashboard_manual_inbox',
  }

  const { data: messageLog, error: logError } = await db
    .from('messages_log')
    .insert({
      tenant_id: input.tenantId,
      conversation_id: input.conversationId,
      client_id: input.clientId,
      channel: 'whatsapp',
      provider: 'meta_whatsapp',
      direction: 'outbound',
      type: 'manual_reply',
      recipient: input.recipient,
      body_sent: input.bodyText,
      status: 'queued',
      metadata: logMetadata,
    })
    .select('id')
    .single()

  if (logError || !messageLog) {
    throw new Error(logError?.message ?? 'messages_log insert failed')
  }

  const outboxPayload = buildManualOutboxPayload({
    actor: input.actor,
    bodyText: input.bodyText,
    phoneNumberId: input.phoneNumberId,
  })

  const { data: outboxRow, error: outboxError } = await db
    .from('messaging_outbox')
    .insert({
      tenant_id: input.tenantId,
      conversation_id: input.conversationId,
      client_id: input.clientId,
      channel: 'whatsapp',
      provider: 'meta_whatsapp',
      recipient: input.recipient,
      scheduled_for: createdAt,
      payload: outboxPayload as unknown as Json,
      status: 'processing',
      attempts: 1,
      last_attempt_at: createdAt,
      messages_log_id: messageLog.id,
      idempotency_key: randomUUID(),
    })
    .select('id')
    .single()

  if (outboxError || !outboxRow) {
    const failureMetadata: Json = {
      source: 'dashboard_manual_inbox',
      failure_stage: 'outbox_insert',
    }

    await db
      .from('messages_log')
      .update({
        status: 'failed',
        metadata: failureMetadata,
      })
      .eq('id', messageLog.id)

    throw new Error(outboxError?.message ?? 'messaging_outbox insert failed')
  }

  return {
    messageLogId: messageLog.id,
    outboxId: outboxRow.id,
  }
}

export async function dispatchMessage(input: {
  tenantId: string
  phoneNumberId: string
  recipient: string
  text: string
}) {
  await ensureActiveIntegration(input.tenantId, input.phoneNumberId)

  const config = resolveMetaOutboundConfig()
  if (config.state !== 'enabled') {
    throw new ManualWhatsAppReplyError(
      'WHATSAPP_NOT_CONFIGURED',
      503,
      'Canale WhatsApp non configurato per l\'invio manuale.',
    )
  }

  const payload = metaWhatsAppAdapter.buildOutboundRequest({
    channel: 'whatsapp',
    provider: 'meta_whatsapp',
    conversationKey: `meta_whatsapp:${input.phoneNumberId}:${input.recipient}`,
    recipient: input.recipient,
    text: input.text,
  })

  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${input.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  const providerPayload = await readJsonResponse(response)

  if (!response.ok) {
    const providerError = summarizeMetaError(providerPayload)
    console.error('[whatsapp/manual-send] Meta send failed', {
      status: response.status,
      code: providerError.code,
      subcode: providerError.subcode,
      type: providerError.type,
      message: providerError.message,
      phoneNumberId: input.phoneNumberId,
    })

    throw new ManualWhatsAppReplyError(
      'META_SEND_FAILED',
      502,
      'WhatsApp non ha accettato il messaggio.',
    )
  }

  const messageId = extractMetaResponseMessageId(providerPayload)
  if (!messageId) {
    console.error('[whatsapp/manual-send] Meta response missing message id', {
      phoneNumberId: input.phoneNumberId,
      responseStatus: response.status,
    })

    throw new ManualWhatsAppReplyError(
      'META_MISSING_MESSAGE_ID',
      502,
      'Meta ha risposto senza un message id valido.',
    )
  }

  return {
    messageId,
    occurredAt: new Date().toISOString(),
    providerPayload,
    deliveryStatus: extractInitialDeliveryStatus(providerPayload),
  } as const
}

async function loadExistingPersistedMessage(input: {
  conversationId: string
  messageId: string
  tenantId: string
}) {
  const db = createMessagingAdminClient()
  const { data, error } = await db
    .from('inbox_messages')
    .select('id, conversation_id, body_text, created_at')
    .eq('tenant_id', input.tenantId)
    .eq('conversation_id', input.conversationId)
    .eq('meta_message_id', input.messageId)
    .maybeSingle()

  if (error) {
    throw new Error(`[whatsapp/manual-send] existing inbox message lookup failed: ${error.message}`)
  }

  return data
}

export async function persistSentMessage(input: {
  actor: {
    displayName: string | null
    role: typeof INBOX_TENANT_ROLES[number]
    staffId: string
    tenantId: string
    userId: string
  }
  bodyText: string
  conversation: {
    clientId: string | null
    id: string
    tenantId: string
  }
  deliveryStatus: Extract<InboxDeliveryStatus, 'pending' | 'sent'>
  draft: {
    messageLogId: string
    outboxId: string
  }
  messageId: string
  occurredAt: string
  attemptCount?: number
  providerPayload: unknown
}) {
  const db = createMessagingAdminClient()
  const attemptCount = input.attemptCount ?? 1
  const messageLogStatus = toMessageLogStatus(input.deliveryStatus)
  const messageLogMetadata: Json = {
    source: 'dashboard_manual_inbox',
    attempt_count: attemptCount,
    outbox_id: input.draft.outboxId,
    provider_status: input.deliveryStatus,
  }

  const { error: logUpdateError } = await db
    .from('messages_log')
    .update({
      external_id: input.messageId,
      status: messageLogStatus,
      sent_at: input.occurredAt,
      metadata: messageLogMetadata,
    })
    .eq('id', input.draft.messageLogId)

  if (logUpdateError) {
    throw new Error(`messages_log update failed: ${logUpdateError.message}`)
  }

  const rawPayload: Json = {
    source: 'dashboard_manual_inbox',
    response: (input.providerPayload as Json | null) ?? null,
  }

  const { data: insertedMessage, error: insertMessageError } = await db
    .from('inbox_messages')
    .insert({
      tenant_id: input.conversation.tenantId,
      conversation_id: input.conversation.id,
      provider: 'meta_whatsapp',
      direction: 'outbound',
      author_kind: 'human',
      author_profile_id: input.actor.userId,
      author_staff_id: input.actor.staffId,
      meta_message_id: input.messageId,
      used_template: false,
      body_text: input.bodyText,
      media: [],
      raw_payload: rawPayload,
      messages_log_id: input.draft.messageLogId,
      created_at: input.occurredAt,
    })
    .select('id, conversation_id, body_text, created_at')
    .single()

  let persistedMessage = insertedMessage

  if (insertMessageError) {
    if (!isUniqueViolation(insertMessageError)) {
      throw new Error(insertMessageError.message)
    }

    persistedMessage = await loadExistingPersistedMessage({
      tenantId: input.conversation.tenantId,
      conversationId: input.conversation.id,
      messageId: input.messageId,
    })
  }

  if (!persistedMessage) {
    throw new Error(insertMessageError?.message ?? 'inbox_messages insert failed')
  }

  const { error: outboxUpdateError } = await db
    .from('messaging_outbox')
    .update({
      status: 'sent',
      attempts: attemptCount,
      last_attempt_at: input.occurredAt,
      last_error: null,
    })
    .eq('id', input.draft.outboxId)

  if (outboxUpdateError) {
    throw new Error(`messaging_outbox update failed: ${outboxUpdateError.message}`)
  }

  const replyMessage = buildReplyMessage({
    authorName: input.actor.displayName,
    id: persistedMessage.id,
    conversationId: persistedMessage.conversation_id,
    bodyText: persistedMessage.body_text ?? input.bodyText,
    createdAt: persistedMessage.created_at,
    deliveryStatus: input.deliveryStatus,
  })

  try {
    await syncConversationStateAfterHumanReply({
      conversationId: input.conversation.id,
      actor: {
        tenantId: input.actor.tenantId,
        userId: input.actor.userId,
        staffId: input.actor.staffId,
        role: input.actor.role,
        displayName: input.actor.displayName,
      },
      reason: 'manual_reply',
    })
  } catch (error) {
    console.error('[whatsapp/manual-send] failed to sync conversation ownership state', {
      conversationId: input.conversation.id,
      actorStaffId: input.actor.staffId,
      error,
    })
  }

  return replyMessage
}

export async function markDispatchFailure(input: {
  draft: {
    messageLogId: string
    outboxId: string
  }
  errorCode: string
  errorMessage: string
}) {
  const db = createMessagingAdminClient()
  const outboxRow = await loadOutboxRow(input.draft.outboxId)
  if (!outboxRow) return

  const attemptedAt = new Date().toISOString()
  const retryPlan = planManualWhatsAppOutboxRetry({
    attempts: outboxRow.attempts,
    errorCode: input.errorCode,
    now: new Date(attemptedAt),
  })
  const failureMetadata: Json = {
    source: 'dashboard_manual_inbox',
    failure_stage: 'dispatch',
    failure_code: input.errorCode,
    attempts: outboxRow.attempts,
    dead_letter: retryPlan.deadLetter,
    max_attempts: MANUAL_WHATSAPP_OUTBOX_MAX_ATTEMPTS,
    retry_scheduled_for: retryPlan.scheduledFor,
  }

  await Promise.all([
    db
      .from('messages_log')
      .update({
        status: retryPlan.status === 'pending' ? 'queued' : 'failed',
        metadata: failureMetadata,
      })
      .eq('id', input.draft.messageLogId),
    db
      .from('messaging_outbox')
      .update({
        status: retryPlan.status,
        attempts: outboxRow.attempts,
        last_attempt_at: attemptedAt,
        last_error: input.errorMessage,
        scheduled_for: retryPlan.scheduledFor ?? outboxRow.scheduled_for,
      })
      .eq('id', input.draft.outboxId),
  ])
}

export async function markPersistenceFailure(input: {
  draft: {
    messageLogId: string
    outboxId: string
  }
  deliveryStatus: Extract<InboxDeliveryStatus, 'pending' | 'sent'>
  errorMessage: string
  messageId: string
  occurredAt: string
  providerPayload: unknown
}) {
  const db = createMessagingAdminClient()
  const outboxRow = await loadOutboxRow(input.draft.outboxId)
  if (!outboxRow) return

  const attemptedAt = new Date().toISOString()
  const retryPlan = planManualWhatsAppOutboxRetry({
    attempts: outboxRow.attempts,
    errorCode: 'MESSAGE_PERSIST_FAILED',
    now: new Date(attemptedAt),
  })
  const currentPayload = parseManualInboxOutboxPayload(outboxRow.payload)
  const nextPayload: Json = currentPayload
    ? {
        ...currentPayload,
        provider_result: {
          message_id: input.messageId,
          occurred_at: input.occurredAt,
          delivery_status: input.deliveryStatus,
          provider_payload: (input.providerPayload as Json | null) ?? null,
        },
      }
    : outboxRow.payload
  const failureMetadata: Json = {
    source: 'dashboard_manual_inbox',
    failure_stage: 'persistence',
    attempts: outboxRow.attempts,
    dead_letter: retryPlan.deadLetter,
    external_message_id: input.messageId,
    max_attempts: MANUAL_WHATSAPP_OUTBOX_MAX_ATTEMPTS,
    provider_status: input.deliveryStatus,
    retry_scheduled_for: retryPlan.scheduledFor,
  }

  await Promise.all([
    db
      .from('messages_log')
      .update({
        external_id: input.messageId,
        sent_at: input.occurredAt,
        status: toMessageLogStatus(input.deliveryStatus),
        metadata: failureMetadata,
      })
      .eq('id', input.draft.messageLogId),
    db
      .from('messaging_outbox')
      .update({
        payload: nextPayload,
        status: retryPlan.status,
        attempts: outboxRow.attempts,
        last_attempt_at: attemptedAt,
        last_error: input.errorMessage,
        scheduled_for: retryPlan.scheduledFor ?? outboxRow.scheduled_for,
      })
      .eq('id', input.draft.outboxId),
  ])
}

async function ensureActiveIntegration(tenantId: string, phoneNumberId: string) {
  const db = createMessagingAdminClient()
  const { data, error } = await db
    .from('tenant_integrations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider', 'meta_whatsapp')
    .eq('external_account_id', phoneNumberId)
    .is('disconnected_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`[whatsapp/manual-send] tenant_integrations lookup failed: ${error.message}`)
  }

  if (!data) {
    throw new ManualWhatsAppReplyError(
      'WHATSAPP_INTEGRATION_INACTIVE',
      409,
      'La connessione WhatsApp del salone non risulta attiva.',
    )
  }
}

async function markInvalidOutboxPayload(input: {
  outboxRow: StoredOutboxRow
  reason: string
}) {
  const db = createMessagingAdminClient()
  const failureMetadata: Json = {
    source: 'dashboard_manual_inbox',
    failure_stage: 'outbox_payload',
    failure_code: 'INVALID_OUTBOX_PAYLOAD',
    dead_letter: true,
    reason: input.reason,
  }

  await Promise.all([
    input.outboxRow.messages_log_id
      ? db
          .from('messages_log')
          .update({
            status: 'failed',
            metadata: failureMetadata,
          })
          .eq('tenant_id', input.outboxRow.tenant_id)
          .eq('id', input.outboxRow.messages_log_id)
      : Promise.resolve(),
    db
      .from('messaging_outbox')
      .update({
        status: 'failed',
        last_error: input.reason,
      })
      .eq('tenant_id', input.outboxRow.tenant_id)
      .eq('id', input.outboxRow.id),
  ])
}

async function claimPendingOutboxRow(input: {
  attempts: number
  outboxId: string
  tenantId: string
}) {
  const db = createMessagingAdminClient()
  const attemptedAt = new Date().toISOString()
  const { data, error } = await db
    .from('messaging_outbox')
    .update({
      status: 'processing',
      attempts: input.attempts + 1,
      last_attempt_at: attemptedAt,
    })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.outboxId)
    .eq('status', 'pending')
    .select(
      'id, tenant_id, conversation_id, client_id, recipient, payload, status, attempts, last_error, scheduled_for, messages_log_id',
    )
    .maybeSingle()

  if (error) {
    throw new Error(`[whatsapp/outbox] claim failed: ${error.message}`)
  }

  return (data as StoredOutboxRow | null) ?? null
}

async function processClaimedManualOutboxRow(
  outboxRow: StoredOutboxRow,
): Promise<'dead_lettered' | 'reconciled' | 'retried' | 'sent' | 'skipped'> {
  if (!outboxRow.conversation_id || !outboxRow.messages_log_id) {
    await markInvalidOutboxPayload({
      outboxRow,
      reason: 'Outbox row missing conversation_id or messages_log_id.',
    })
    return 'dead_lettered'
  }

  const payload = parseManualInboxOutboxPayload(outboxRow.payload)
  if (!payload) {
    await markInvalidOutboxPayload({
      outboxRow,
      reason: 'Outbox payload is not a supported dashboard manual reply payload.',
    })
    return 'dead_lettered'
  }

  const actor = {
    tenantId: outboxRow.tenant_id,
    userId: payload.actor.user_id,
    staffId: payload.actor.staff_id,
    role: payload.actor.role,
    displayName: payload.actor.display_name,
  } as const

  const conversation = {
    tenantId: outboxRow.tenant_id,
    id: outboxRow.conversation_id,
    clientId: outboxRow.client_id,
  } as const

  const draft = {
    messageLogId: outboxRow.messages_log_id,
    outboxId: outboxRow.id,
  } as const

  if (payload.provider_result) {
    const retryPlan = planManualWhatsAppOutboxRetry({
      attempts: outboxRow.attempts,
      errorCode: 'MESSAGE_PERSIST_FAILED',
    })

    try {
      await persistSentMessage({
        actor,
        bodyText: payload.text,
        conversation,
        deliveryStatus: payload.provider_result.delivery_status,
        draft,
        messageId: payload.provider_result.message_id,
        occurredAt: payload.provider_result.occurred_at,
        attemptCount: outboxRow.attempts,
        providerPayload: payload.provider_result.provider_payload,
      })
      return 'reconciled'
    } catch (error) {
      await markPersistenceFailure({
        draft,
        deliveryStatus: payload.provider_result.delivery_status,
        errorMessage: error instanceof Error ? error.message : 'unknown_persistence_error',
        messageId: payload.provider_result.message_id,
        occurredAt: payload.provider_result.occurred_at,
        providerPayload: payload.provider_result.provider_payload,
      })

      return retryPlan.deadLetter ? 'dead_lettered' : 'retried'
    }
  }

  let dispatchResult: Awaited<ReturnType<typeof dispatchMessage>>
  try {
    dispatchResult = await dispatchMessage({
      tenantId: outboxRow.tenant_id,
      phoneNumberId: payload.phone_number_id,
      recipient: outboxRow.recipient,
      text: payload.text,
    })
  } catch (error) {
    const errorCode = isManualWhatsAppReplyError(error) ? error.code : 'META_SEND_FAILED'
    const retryPlan = planManualWhatsAppOutboxRetry({
      attempts: outboxRow.attempts,
      errorCode,
    })

    await markDispatchFailure({
      draft,
      errorCode,
      errorMessage: error instanceof Error ? error.message : 'unknown_dispatch_error',
    })

    return retryPlan.deadLetter ? 'dead_lettered' : 'retried'
  }

  try {
    await persistSentMessage({
      actor,
      bodyText: payload.text,
      conversation,
      deliveryStatus: dispatchResult.deliveryStatus,
      draft,
      messageId: dispatchResult.messageId,
      occurredAt: dispatchResult.occurredAt,
      attemptCount: outboxRow.attempts,
      providerPayload: dispatchResult.providerPayload,
    })
    return 'sent'
  } catch (error) {
    const retryPlan = planManualWhatsAppOutboxRetry({
      attempts: outboxRow.attempts,
      errorCode: 'MESSAGE_PERSIST_FAILED',
    })

    await markPersistenceFailure({
      draft,
      deliveryStatus: dispatchResult.deliveryStatus,
      errorMessage: error instanceof Error ? error.message : 'unknown_persistence_error',
      messageId: dispatchResult.messageId,
      occurredAt: dispatchResult.occurredAt,
      providerPayload: dispatchResult.providerPayload,
    })

    return retryPlan.deadLetter ? 'dead_lettered' : 'retried'
  }
}

export async function processPendingManualWhatsAppOutboxBatch(input?: {
  limit?: number
}): Promise<PendingManualOutboxSummary> {
  const db = createMessagingAdminClient()
  const limit = Math.max(1, Math.min(input?.limit ?? 20, 50))
  const nowIso = new Date().toISOString()

  const { data: candidateRows, error: candidateError } = await db
    .from('messaging_outbox')
    .select(
      'id, tenant_id, conversation_id, client_id, recipient, payload, status, attempts, last_error, scheduled_for, messages_log_id',
    )
    .eq('provider', 'meta_whatsapp')
    .eq('channel', 'whatsapp')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (candidateError) {
    throw new Error(`[whatsapp/outbox] pending fetch failed: ${candidateError.message}`)
  }

  const summary: PendingManualOutboxSummary = {
    claimed: 0,
    deadLettered: 0,
    processed: 0,
    reconciled: 0,
    remainingPending: 0,
    retried: 0,
    sent: 0,
    skipped: 0,
  }

  for (const candidate of (candidateRows as StoredOutboxRow[] | null) ?? []) {
    const claimedRow = await claimPendingOutboxRow({
      outboxId: candidate.id,
      tenantId: candidate.tenant_id,
      attempts: candidate.attempts,
    })

    if (!claimedRow) {
      summary.skipped += 1
      continue
    }

    summary.claimed += 1
    summary.processed += 1

    const outcome = await processClaimedManualOutboxRow(claimedRow)
    if (outcome === 'dead_lettered') summary.deadLettered += 1
    if (outcome === 'reconciled') summary.reconciled += 1
    if (outcome === 'retried') summary.retried += 1
    if (outcome === 'sent') summary.sent += 1
    if (outcome === 'skipped') summary.skipped += 1
  }

  const { count, error: countError } = await db
    .from('messaging_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'meta_whatsapp')
    .eq('channel', 'whatsapp')
    .eq('status', 'pending')

  if (countError) {
    throw new Error(`[whatsapp/outbox] pending count failed: ${countError.message}`)
  }

  summary.remainingPending = count ?? 0
  return summary
}

export async function sendManualWhatsAppReply(input: ManualWhatsAppReplyInput) {
  return sendManualWhatsAppReplyCore(input, {
    getAuthenticatedUserId,
    getRequestTenantId,
    getConversation,
    getAuthorizedActor,
    findRecentDuplicate,
    createDraft,
    dispatchMessage,
    persistSentMessage,
    markDispatchFailure,
    markPersistenceFailure,
  })
}

export async function handleSendManualWhatsAppReplyRequest(
  request: Request,
  conversationId: string,
) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Body JSON non valido.',
        },
      },
      { status: 400 },
    )
  }

  const parsed = MANUAL_REPLY_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: parsed.error.issues[0]?.message ?? 'Body non valido.',
        },
      },
      { status: 400 },
    )
  }

  try {
    const result = await sendManualWhatsAppReply({
      conversationId,
      text: parsed.data.text,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (isManualWhatsAppReplyError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.publicMessage,
          },
        },
        { status: error.httpStatus },
      )
    }

    console.error('[whatsapp/manual-send] unexpected error', error)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Errore interno durante l\'invio del messaggio.',
        },
      },
      { status: 500 },
    )
  }
}
