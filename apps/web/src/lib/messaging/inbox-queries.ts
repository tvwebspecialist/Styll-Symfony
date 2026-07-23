// Pure DB query layer for the inbox.
// No 'use server', no path aliases (@/) — only relative imports so this file
// can be imported directly by Node.js unit tests with --experimental-strip-types.
//
// Auth is NOT here. Callers (server actions) MUST enforce inbox access BEFORE
// calling these functions.

import type { MessagingAdminClient } from './db'
import type { InboxConversationStatus, InboxOwnershipMode } from './contracts'
import {
  toInboxDeliveryStatus,
  type InboxDeliveryStatus,
  type MessageLogStatus,
} from './message-delivery.ts'

// ── Shared types ─────────────────────────────────────────────────────────────

export interface InboxConversation {
  id: string
  contactName: string | null
  contactPhone: string | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  status: InboxConversationStatus
  ownershipMode: InboxOwnershipMode
  assignedStaffId: string | null
  assignedStaffName: string | null
  aiPausedAt: string | null
  channel: 'whatsapp'
}

export interface InboxMessage {
  id: string
  bodyText: string | null
  direction: 'inbound' | 'outbound' | 'system'
  authorKind: 'customer' | 'assistant' | 'human' | 'system'
  authorStaffId: string | null
  authorName: string | null
  createdAt: string
  usedTemplate: boolean
  timelineKind: 'message' | 'conversation_audit' | 'internal_note'
  deliveryStatus?: InboxDeliveryStatus
  auditAction?: string | null
}

export interface InboxLatestAiRun {
  id: string
  messageId: string
  messageBodyText: string | null
  messageCreatedAt: string | null
  status: 'queued' | 'started' | 'completed' | 'failed' | 'blocked' | 'skipped'
  providerId: string | null
  promptId: string | null
  promptVersion: string | null
  outputSummary: string | null
  decisionKind: string | null
  reasonCode: string | null
  usedAuthoritativeKnowledge: boolean
  citedSourceSummary: Array<{
    kind: 'conversation' | 'knowledge' | 'policy' | 'tool_result'
    label: string
  }>
  appointmentPreparation: {
    action: 'booking' | 'reschedule' | 'cancellation'
    plannerState: string
    eligible: boolean
    completeFields: string[]
    missingFields: string[]
    nextQuestion: string | null
    preparedToolCall: {
      name:
        | 'prepare_booking_sandbox'
        | 'prepare_appointment'
        | 'prepare_reschedule'
        | 'prepare_cancellation'
      arguments: {
        service?: string
        requested_date?: string
        requested_time?: string
        selected_slot?: string
        customer_name?: string | null
        current_appointment_reference?: string
        customer_notes: string
        conversation_summary: string
      }
    } | null
    service: string | null
    requestedDate: string | null
    requestedTime: string | null
    availabilityResult: {
      available: boolean
      requestedSlot: {
        date: string
        startTime: string
        endTime: string
        staffIds: string[]
      } | null
      suggestedSlots: Array<{
        date: string
        startTime: string
        endTime: string
        staffIds: string[]
      }>
      reason:
        | 'available'
        | 'slot_unavailable'
        | 'business_closed'
        | 'service_unavailable'
    } | null
  } | null
  errorCategory: string | null
  createdAt: string
  completedAt: string | null
}

function readAuditAction(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const action = (metadata as Record<string, unknown>).action
  return typeof action === 'string' && action.length > 0 ? action : null
}

function readActorStaffId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const actor = (metadata as Record<string, unknown>).actor
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) {
    return null
  }

  const staffId = (actor as Record<string, unknown>).staff_id
  return typeof staffId === 'string' && staffId.length > 0 ? staffId : null
}

function readActorDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const actor = (metadata as Record<string, unknown>).actor
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) {
    return null
  }

  const displayName = (actor as Record<string, unknown>).display_name
  return typeof displayName === 'string' && displayName.length > 0 ? displayName : null
}

function readAiSourceSummary(value: unknown): InboxLatestAiRun['citedSourceSummary'] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return []
    }

    const kind = (entry as Record<string, unknown>).kind
    const label = (entry as Record<string, unknown>).label
    if (
      (kind !== 'conversation' && kind !== 'knowledge' && kind !== 'policy' && kind !== 'tool_result')
      || typeof label !== 'string'
      || label.length === 0
    ) {
      return []
    }

    return [{
      kind,
      label,
    }]
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

function readPreparedToolCall(value: unknown): InboxLatestAiRun['appointmentPreparation'] extends infer T
  ? T extends { preparedToolCall: infer P } ? P : never
  : never {
  if (!isRecord(value)) return null

  const name = value.name
  if (
    name !== 'prepare_booking_sandbox'
    && name !== 'prepare_appointment'
    && name !== 'prepare_reschedule'
    && name !== 'prepare_cancellation'
  ) {
    return null
  }

  const rawArguments = isRecord(value.arguments) ? value.arguments : {}
  const customerNotes = typeof rawArguments.customer_notes === 'string'
    ? rawArguments.customer_notes
    : ''
  const conversationSummary = typeof rawArguments.conversation_summary === 'string'
    ? rawArguments.conversation_summary
    : ''

  return {
    name,
    arguments: {
      service: typeof rawArguments.service === 'string' ? rawArguments.service : undefined,
      requested_date:
        typeof rawArguments.requested_date === 'string' ? rawArguments.requested_date : undefined,
      requested_time:
        typeof rawArguments.requested_time === 'string' ? rawArguments.requested_time : undefined,
      selected_slot:
        typeof rawArguments.selected_slot === 'string' ? rawArguments.selected_slot : undefined,
      customer_name:
        typeof rawArguments.customer_name === 'string' ? rawArguments.customer_name : null,
      current_appointment_reference:
        typeof rawArguments.current_appointment_reference === 'string'
          ? rawArguments.current_appointment_reference
          : undefined,
      customer_notes: customerNotes,
      conversation_summary: conversationSummary,
    },
  }
}

function readAvailabilitySlot(value: unknown): {
  date: string
  startTime: string
  endTime: string
  staffIds: string[]
} | null {
  if (!isRecord(value)) return null

  if (
    typeof value.date !== 'string'
    || typeof value.startTime !== 'string'
    || typeof value.endTime !== 'string'
    || !Array.isArray(value.staffIds)
  ) {
    return null
  }

  return {
    date: value.date,
    startTime: value.startTime,
    endTime: value.endTime,
    staffIds: value.staffIds.filter((entry): entry is string => typeof entry === 'string'),
  }
}

function readAvailabilityResult(
  value: unknown,
): InboxLatestAiRun['appointmentPreparation'] extends infer T
  ? T extends { availabilityResult: infer R } ? R : never
  : never {
  if (!isRecord(value)) return null

  const requestedSlot = readAvailabilitySlot(value.requestedSlot)
  const suggestedSlots = Array.isArray(value.suggestedSlots)
    ? value.suggestedSlots
      .map((slot) => readAvailabilitySlot(slot))
      .filter((slot): slot is NonNullable<typeof requestedSlot> => slot !== null)
    : []

  if (
    typeof value.available !== 'boolean'
    || (
      value.reason !== 'available'
      && value.reason !== 'slot_unavailable'
      && value.reason !== 'business_closed'
      && value.reason !== 'service_unavailable'
    )
  ) {
    return null
  }

  return {
    available: value.available,
    requestedSlot,
    suggestedSlots,
    reason: value.reason,
  }
}

function readAiAppointmentPreparation(value: unknown): InboxLatestAiRun['appointmentPreparation'] {
  if (!isRecord(value)) return null

  const response = isRecord(value.response) ? value.response : null
  const decision = response && isRecord(response.decision) ? response.decision : null
  const preparation = decision && isRecord(decision.appointment_preparation)
    ? decision.appointment_preparation
    : null

  if (!preparation) return null

  const action = preparation.action
  if (action !== 'booking' && action !== 'reschedule' && action !== 'cancellation') {
    return null
  }

  return {
    action,
    plannerState:
      typeof preparation.plannerState === 'string'
        ? preparation.plannerState
        : typeof preparation.state === 'string'
          ? preparation.state
          : 'not_applicable',
    eligible: preparation.eligible === true,
    completeFields: readStringArray(preparation.completeFields),
    missingFields: readStringArray(preparation.missingFields),
    nextQuestion: typeof preparation.nextQuestion === 'string' ? preparation.nextQuestion : null,
    preparedToolCall: readPreparedToolCall(preparation.preparedToolCall),
    service: typeof preparation.service === 'string' ? preparation.service : null,
    requestedDate:
      typeof preparation.requestedDate === 'string' ? preparation.requestedDate : null,
    requestedTime:
      typeof preparation.requestedTime === 'string' ? preparation.requestedTime : null,
    availabilityResult: readAvailabilityResult(preparation.availabilityResult),
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function queryInboxConversations(
  db: MessagingAdminClient,
  tenantId: string,
): Promise<InboxConversation[]> {
  const { data, error } = await db
    .from('inbox_conversations')
    .select(
      'id, contact_display_name, contact_phone, last_message_preview, last_message_at, unread_count, status, ownership_mode, assigned_staff_id, ai_paused_at, channel',
    )
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) {
    // Throw so the caller can distinguish DB error from empty result.
    throw new Error(`[inbox] conversations fetch failed: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    contactName: row.contact_display_name,
    contactPhone: row.contact_phone,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count ?? 0,
    status: row.status as InboxConversationStatus,
    ownershipMode: row.ownership_mode as InboxOwnershipMode,
    assignedStaffId: row.assigned_staff_id ?? null,
    assignedStaffName: null,
    aiPausedAt: row.ai_paused_at ?? null,
    channel: row.channel as 'whatsapp',
  }))
}

export async function queryInboxMessages(
  db: MessagingAdminClient,
  tenantId: string,
  conversationId: string,
): Promise<InboxMessage[]> {
  const { data: messageRows, error } = await db
    .from('inbox_messages')
    .select(
      'id, body_text, direction, author_kind, author_staff_id, created_at, used_template, messages_log_id',
    )
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    throw new Error(`[inbox] messages fetch failed: ${error.message}`)
  }

  const messageLogIds = [...new Set(
    (messageRows ?? [])
      .map((row) => row.messages_log_id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  )]

  const [{ data: messageLogRows, error: messageLogError }, { data: timelineRows, error: timelineError }] =
    await Promise.all([
      messageLogIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : db
            .from('messages_log')
            .select('id, status')
            .eq('tenant_id', tenantId)
            .in('id', messageLogIds)
            .limit(messageLogIds.length),
      db
        .from('messages_log')
        .select('id, type, body_sent, created_at, metadata')
        .eq('tenant_id', tenantId)
        .eq('conversation_id', conversationId)
        .in('type', ['conversation_audit', 'internal_note'])
        .order('created_at', { ascending: true })
        .limit(200),
    ])

  if (messageLogError) {
    throw new Error(`[inbox] message_log status fetch failed: ${messageLogError.message}`)
  }

  if (timelineError) {
    throw new Error(`[inbox] timeline log fetch failed: ${timelineError.message}`)
  }

  const deliveryByLogId = new Map<string, InboxDeliveryStatus>()
  for (const row of messageLogRows ?? []) {
    deliveryByLogId.set(row.id, toInboxDeliveryStatus(row.status as MessageLogStatus))
  }

  const messages = (messageRows ?? []).map((row) => ({
    id: row.id,
    bodyText: row.body_text,
    direction: row.direction as 'inbound' | 'outbound' | 'system',
    authorKind: row.author_kind as 'customer' | 'assistant' | 'human' | 'system',
    authorStaffId: row.author_staff_id ?? null,
    authorName: null,
    createdAt: row.created_at,
    usedTemplate: row.used_template ?? false,
    timelineKind: 'message' as const,
    deliveryStatus:
      row.direction === 'outbound'
        ? deliveryByLogId.get(row.messages_log_id ?? '') ?? 'sent'
        : undefined,
    auditAction: null,
  }))

  const timelineMessages = (timelineRows ?? []).map((row) => {
    if (row.type === 'internal_note') {
      return {
        id: `note:${row.id}`,
        bodyText: row.body_sent ?? 'Nota interna',
        direction: 'system' as const,
        authorKind: 'human' as const,
        authorStaffId: readActorStaffId(row.metadata),
        authorName: readActorDisplayName(row.metadata),
        createdAt: row.created_at,
        usedTemplate: false,
        timelineKind: 'internal_note' as const,
        deliveryStatus: undefined,
        auditAction: null,
      }
    }

    return {
      id: `audit:${row.id}`,
      bodyText: row.body_sent ?? 'Evento conversazione',
      direction: 'system' as const,
      authorKind: 'system' as const,
      authorStaffId: null,
      authorName: null,
      createdAt: row.created_at,
      usedTemplate: false,
      timelineKind: 'conversation_audit' as const,
      deliveryStatus: undefined,
      auditAction: readAuditAction(row.metadata),
    }
  })

  return [...messages, ...timelineMessages].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      if (left.direction === right.direction) return left.id.localeCompare(right.id)
      return left.direction === 'system' ? 1 : -1
    }

    return left.createdAt.localeCompare(right.createdAt)
  })
}

export async function queryLatestInboundInboxAiRun(
  db: MessagingAdminClient,
  tenantId: string,
  conversationId: string,
): Promise<InboxLatestAiRun | null> {
  const { data: runRows, error } = await db
    .from('inbox_ai_runs')
    .select('id, message_id, status, provider_id, prompt_id, prompt_version, output_summary, decision_kind, reason_code, used_authoritative_knowledge, cited_source_summary, error_category, created_at, completed_at, mode, input_context')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .eq('mode', 'draft_only')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    throw new Error(`[inbox] latest ai run fetch failed: ${error.message}`)
  }

  const latestRun = (runRows ?? []).find(
    (row) => typeof row.message_id === 'string' && row.message_id.length > 0,
  )

  if (!latestRun || !latestRun.message_id) {
    return null
  }

  const { data: messageRows, error: messageError } = await db
    .from('inbox_messages')
    .select('id, body_text, created_at')
    .eq('tenant_id', tenantId)
    .eq('id', latestRun.message_id)
    .limit(1)

  if (messageError) {
    throw new Error(`[inbox] latest ai inbound message fetch failed: ${messageError.message}`)
  }

  const message = (messageRows ?? [])[0] ?? null

  return {
    id: latestRun.id,
    messageId: latestRun.message_id,
    messageBodyText: message?.body_text ?? null,
    messageCreatedAt: message?.created_at ?? null,
    status: latestRun.status as InboxLatestAiRun['status'],
    providerId: latestRun.provider_id ?? null,
    promptId: latestRun.prompt_id ?? null,
    promptVersion: latestRun.prompt_version ?? null,
    outputSummary: latestRun.output_summary ?? null,
    decisionKind: latestRun.decision_kind ?? null,
    reasonCode: latestRun.reason_code ?? null,
    usedAuthoritativeKnowledge: latestRun.used_authoritative_knowledge ?? false,
    citedSourceSummary: readAiSourceSummary(latestRun.cited_source_summary),
    appointmentPreparation: readAiAppointmentPreparation(latestRun.input_context),
    errorCategory: latestRun.error_category ?? null,
    createdAt: latestRun.created_at,
    completedAt: latestRun.completed_at ?? null,
  }
}
