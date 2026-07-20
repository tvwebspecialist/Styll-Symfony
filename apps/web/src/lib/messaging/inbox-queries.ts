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
