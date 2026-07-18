// Pure DB query layer for the inbox.
// No 'use server', no path aliases (@/) — only relative imports so this file
// can be imported directly by Node.js unit tests with --experimental-strip-types.
//
// Auth is NOT here. Callers (server actions) MUST enforce inbox access BEFORE
// calling these functions.

import type { MessagingAdminClient } from './db'

// ── Shared types ─────────────────────────────────────────────────────────────

export interface InboxConversation {
  id: string
  contactName: string | null
  contactPhone: string | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  status: string
  ownershipMode: 'ai' | 'human' | 'hybrid'
  channel: 'whatsapp'
}

export interface InboxMessage {
  id: string
  bodyText: string | null
  direction: 'inbound' | 'outbound' | 'system'
  authorKind: 'customer' | 'assistant' | 'human' | 'system'
  createdAt: string
  usedTemplate: boolean
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function queryInboxConversations(
  db: MessagingAdminClient,
  tenantId: string,
): Promise<InboxConversation[]> {
  const { data, error } = await db
    .from('inbox_conversations')
    .select(
      'id, contact_display_name, contact_phone, last_message_preview, last_message_at, unread_count, status, ownership_mode, channel',
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
    status: row.status,
    ownershipMode: row.ownership_mode as 'ai' | 'human' | 'hybrid',
    channel: row.channel as 'whatsapp',
  }))
}

export async function queryInboxMessages(
  db: MessagingAdminClient,
  tenantId: string,
  conversationId: string,
): Promise<InboxMessage[]> {
  const { data, error } = await db
    .from('inbox_messages')
    .select('id, body_text, direction, author_kind, created_at, used_template')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    throw new Error(`[inbox] messages fetch failed: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    bodyText: row.body_text,
    direction: row.direction as 'inbound' | 'outbound' | 'system',
    authorKind: row.author_kind as 'customer' | 'assistant' | 'human' | 'system',
    createdAt: row.created_at,
    usedTemplate: row.used_template ?? false,
  }))
}
