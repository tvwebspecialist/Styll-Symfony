'use server'

import { createMessagingAdminClient } from '@/lib/messaging/db'
import { requireTenantRole } from '@/lib/tenant-role-guard'
import { queryInboxConversations, queryInboxMessages } from '@/lib/messaging/inbox-queries'

// ── Authorization policy ──────────────────────────────────────────────────────
//
// TODO(product): decide which roles can access inbox conversations.
//
// Current decision (temporary, pending product sign-off):
//   owner + manager + receptionist → see all conversations in the tenant.
//
// Alternatives under consideration:
//   A. owner/manager/receptionist see all; staff sees only assigned conversations
//   B. only owner/manager see all; receptionist and staff see only assigned
//   C. only owner/manager (current requireOwnerManagerTenantContext behavior)
//
// Do NOT extend to 'staff' without a product decision.
// When decided, update INBOX_ROLES and add a test in inbox-helpers.test.mjs.

const INBOX_ROLES = ['owner', 'manager', 'receptionist'] as const

// Re-export types so callers import from a single path
export type { InboxConversation, InboxMessage } from '@/lib/messaging/inbox-queries'

// ── Server actions ────────────────────────────────────────────────────────────

export async function getInboxConversations(tenantId: string) {
  await requireTenantRole(INBOX_ROLES, tenantId)
  const db = createMessagingAdminClient()
  // queryInboxConversations throws on DB error — the component's .catch() branch handles it
  return queryInboxConversations(db, tenantId)
}

export async function getInboxMessages(tenantId: string, conversationId: string) {
  await requireTenantRole(INBOX_ROLES, tenantId)
  const db = createMessagingAdminClient()
  // queryInboxMessages throws on DB error — component distinguishes from empty result
  return queryInboxMessages(db, tenantId, conversationId)
}
