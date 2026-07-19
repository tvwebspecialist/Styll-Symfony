import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Json } from '@/types'
import { metaWhatsAppAdapter } from '@/lib/messaging/meta-whatsapp-adapter'
import { createMessagingAdminClient } from '@/lib/messaging/db'
import {
  coalesceMessageLogStatus,
  getWebhookMessageStatus,
  type MessageLogStatus,
} from '@/lib/messaging/message-delivery'
import { verifyMetaWebhookSignature } from '@/lib/messaging/meta-whatsapp-signature'
import { resolveMetaWhatsAppIntegrationByPhoneNumberId } from '@/lib/messaging/tenant-resolution'

export const runtime = 'nodejs'

const VERIFY_TOKEN_ENV = 'META_WHATSAPP_WEBHOOK_VERIFY_TOKEN'
const APP_SECRET_ENV = 'META_APP_SECRET'

interface ProcessingSummary {
  received: number
  duplicates: number
  inboundMessages: number
  statusUpdates: number
  unresolvedTenant: number
  failed: number
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : null
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

async function markWebhookEvent(
  webhookId: string,
  status: 'processed' | 'skipped' | 'failed',
  error: string | null = null,
) {
  const db = createMessagingAdminClient()
  const payload =
    status === 'processed'
      ? { status, processed_at: new Date().toISOString(), error: null }
      : { status, processed_at: new Date().toISOString(), error }

  await db.from('webhook_events_inbox').update(payload).eq('id', webhookId)
}

async function ensureConversationForEvent(
  phoneNumberId: string,
  integrationId: string,
  tenantId: string,
  externalContactId: string,
  contactPhone: string | null,
  contactDisplayName: string | null,
): Promise<{ id: string; clientId: string | null }> {
  const db = createMessagingAdminClient()
  const conversationKey = `meta_whatsapp:${phoneNumberId}:${externalContactId}`
  const normalizedPhone = normalizePhone(contactPhone)

  const [{ data: existingConversation, error: conversationError }, { data: clientRow, error: clientError }] =
    await Promise.all([
      db
        .from('inbox_conversations')
        .select('id, client_id')
        .eq('conversation_key', conversationKey)
        .maybeSingle(),
      normalizedPhone
        ? db
            .from('clients')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('phone', normalizedPhone)
            .is('deleted_at', null)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

  if (conversationError) {
    throw new Error(`inbox_conversations lookup failed: ${conversationError.message}`)
  }
  if (clientError) {
    throw new Error(`clients lookup failed: ${clientError.message}`)
  }

  const resolvedClientId = existingConversation?.client_id ?? clientRow?.id ?? null

  if (existingConversation) {
    const { error: updateError } = await db
      .from('inbox_conversations')
      .update({
        client_id: resolvedClientId,
        contact_display_name: contactDisplayName,
        contact_phone: normalizedPhone,
      })
      .eq('id', existingConversation.id)

    if (updateError) {
      throw new Error(`inbox_conversations update failed: ${updateError.message}`)
    }

    return { id: existingConversation.id, clientId: resolvedClientId }
  }

  const { data: createdConversation, error: insertError } = await db
    .from('inbox_conversations')
    .insert({
      tenant_id: tenantId,
      integration_id: integrationId,
      channel: 'whatsapp',
      provider: 'meta_whatsapp',
      conversation_key: conversationKey,
      provider_phone_number_id: phoneNumberId,
      external_contact_id: externalContactId,
      contact_phone: normalizedPhone,
      contact_display_name: contactDisplayName,
      client_id: resolvedClientId,
      ownership_mode: 'hybrid',
      status: 'new',
    })
    .select('id, client_id')
    .single()

  if (insertError || !createdConversation) {
    throw new Error(insertError?.message ?? 'inbox_conversations insert failed')
  }

  return { id: createdConversation.id, clientId: createdConversation.client_id }
}

async function persistInboundMessage(input: {
  tenantId: string
  conversationId: string
  clientId: string | null
  occurredAt: string
  externalId: string
  providerEventId: string
  recipient: string | null
  bodyText: string | null
  media: Array<{ kind: 'image' | 'video' | 'audio' | 'document' | 'unknown'; url?: string; mimeType?: string; sha256?: string }>
  rawPayload: unknown
  eventType: string
}) {
  const db = createMessagingAdminClient()

  const { data: messageLog, error: logError } = await db
    .from('messages_log')
    .insert({
      tenant_id: input.tenantId,
      conversation_id: input.conversationId,
      client_id: input.clientId,
      channel: 'whatsapp',
      provider: 'meta_whatsapp',
      direction: 'inbound',
      type: 'customer_message',
      recipient: input.recipient,
      body_sent: input.bodyText,
      external_id: input.externalId,
      status: 'received',
      sent_at: input.occurredAt,
      metadata: {
        event_type: input.eventType,
        media_count: input.media.length,
      },
    })
    .select('id')
    .single()

  if (logError || !messageLog) {
    throw new Error(logError?.message ?? 'messages_log insert failed')
  }

  const { error: inboxError } = await db.from('inbox_messages').insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId,
    provider: 'meta_whatsapp',
    direction: 'inbound',
    author_kind: 'customer',
    meta_message_id: input.externalId,
    provider_event_id: input.providerEventId,
    used_template: false,
    body_text: input.bodyText,
    media: input.media,
    raw_payload: input.rawPayload as Json,
    messages_log_id: messageLog.id,
  })

  if (inboxError) {
    throw new Error(`inbox_messages insert failed: ${inboxError.message}`)
  }
}

async function persistStatusUpdate(input: {
  tenantId: string
  conversationId: string
  externalId: string
  recipient: string | null
  occurredAt: string
  eventType: string
}) {
  const db = createMessagingAdminClient()
  const nextStatus = getWebhookMessageStatus(input.eventType)
  const providerMetadata: Json = {
    provider_status_event: input.eventType,
    provider_status_at: input.occurredAt,
  }

  const { data: linkedMessage, error: linkedMessageError } = await db
    .from('inbox_messages')
    .select('messages_log_id')
    .eq('meta_message_id', input.externalId)
    .maybeSingle()

  if (linkedMessageError) {
    throw new Error(`inbox_messages status lookup failed: ${linkedMessageError.message}`)
  }

  const targetMessageLogId = linkedMessage?.messages_log_id ?? null

  const logLookup = targetMessageLogId
    ? db
        .from('messages_log')
        .select('id, status, sent_at')
        .eq('id', targetMessageLogId)
        .maybeSingle()
    : db
        .from('messages_log')
        .select('id, status, sent_at')
        .eq('provider', 'meta_whatsapp')
        .eq('external_id', input.externalId)
        .maybeSingle()

  const { data: existingLog, error: selectError } = await logLookup

  if (selectError) {
    throw new Error(`messages_log status lookup failed: ${selectError.message}`)
  }

  if (existingLog) {
    const currentStatus = existingLog.status as MessageLogStatus
    const coalescedStatus = coalesceMessageLogStatus(currentStatus, nextStatus)
    const nextSentAt = existingLog.sent_at ?? (nextStatus === 'sent' ? input.occurredAt : null)

    const { error: updateError } = await db
      .from('messages_log')
      .update({
        status: coalescedStatus,
        sent_at: nextSentAt,
        metadata: providerMetadata,
      })
      .eq('id', existingLog.id)

    if (updateError) {
      throw new Error(`messages_log status update failed: ${updateError.message}`)
    }

    return
  }

  const { error: insertError } = await db.from('messages_log').insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId,
    channel: 'whatsapp',
    provider: 'meta_whatsapp',
    direction: 'outbound',
    type: 'whatsapp_status',
    recipient: input.recipient,
    external_id: input.externalId,
    status: nextStatus,
    sent_at: nextStatus === 'sent' ? input.occurredAt : null,
    metadata: providerMetadata,
  })

  if (insertError) {
    throw new Error(`messages_log status insert failed: ${insertError.message}`)
  }
}

export async function GET(req: NextRequest) {
  const verifyToken = process.env[VERIFY_TOKEN_ENV]
  if (!verifyToken) {
    return jsonError(503, 'Webhook verify token not configured')
  }

  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || token !== verifyToken || !challenge) {
    return jsonError(403, 'Forbidden')
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (!verifyMetaWebhookSignature(rawBody, req.headers.get('x-hub-signature-256'), process.env[APP_SECRET_ENV])) {
    return jsonError(401, 'Invalid signature')
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return jsonError(400, 'Invalid JSON')
  }

  const events = metaWhatsAppAdapter.normalizeWebhook(payload)
  const summary: ProcessingSummary = {
    received: events.length,
    duplicates: 0,
    inboundMessages: 0,
    statusUpdates: 0,
    unresolvedTenant: 0,
    failed: 0,
  }

  if (events.length === 0) {
    return NextResponse.json({ received: true, processed: 0 })
  }

  const db = createMessagingAdminClient()
  const integrationCache = new Map<string, Awaited<ReturnType<typeof resolveMetaWhatsAppIntegrationByPhoneNumberId>>>()

  for (const event of events) {
    let webhookId: string | null = null

    try {
      let connection = integrationCache.get(event.phoneNumberId)
      if (connection === undefined) {
        connection = await resolveMetaWhatsAppIntegrationByPhoneNumberId(db, event.phoneNumberId)
        integrationCache.set(event.phoneNumberId, connection)
      }

      const { data: createdWebhook, error: webhookInsertError } = await db
        .from('webhook_events_inbox')
        .insert({
          provider: event.provider,
          external_id: event.eventId,
          event_type: event.eventType,
          tenant_id: connection?.tenantId ?? null,
          integration_id: connection?.id ?? null,
          payload: event.rawPayload as Json,
          signature: req.headers.get('x-hub-signature-256'),
          status: 'received',
        })
        .select('id')
        .single()

      if (webhookInsertError) {
        if (webhookInsertError.code === '23505') {
          summary.duplicates++
          continue
        }
        throw new Error(`webhook_events_inbox insert failed: ${webhookInsertError.message}`)
      }

      webhookId = createdWebhook.id

      if (!connection) {
        summary.unresolvedTenant++
        await markWebhookEvent(webhookId, 'skipped', 'tenant_unresolved')
        continue
      }

      const conversation = await ensureConversationForEvent(
        event.phoneNumberId,
        connection.id,
        connection.tenantId,
        event.externalContactId,
        event.contactPhone,
        event.contactDisplayName,
      )

      if (event.direction === 'inbound' && event.authorKind === 'customer' && event.messageId) {
        await persistInboundMessage({
          tenantId: connection.tenantId,
          conversationId: conversation.id,
          clientId: conversation.clientId,
          occurredAt: event.occurredAt,
          externalId: event.messageId,
          providerEventId: event.eventId,
          recipient: event.contactPhone,
          bodyText: event.text,
          media: event.media,
          rawPayload: event.rawPayload,
          eventType: event.eventType,
        })
        // last_message_at, last_message_preview, unread_count are updated
        // by the DB trigger handle_inbox_message_insert (migration 20260717093000)

        summary.inboundMessages++
      } else if (event.messageId) {
        await persistStatusUpdate({
          tenantId: connection.tenantId,
          conversationId: conversation.id,
          externalId: event.messageId,
          recipient: event.contactPhone,
          occurredAt: event.occurredAt,
          eventType: event.eventType,
        })
        summary.statusUpdates++
      }

      await markWebhookEvent(webhookId, 'processed')
    } catch (error) {
      summary.failed++
      console.error('[webhooks/meta-whatsapp] processing failed', error)
      if (webhookId) {
        const message = error instanceof Error ? error.message : 'unknown_processing_error'
        await markWebhookEvent(webhookId, 'failed', message)
      }
    }
  }

  return NextResponse.json({
    received: true,
    summary,
  })
}
