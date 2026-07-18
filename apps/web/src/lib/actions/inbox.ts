'use server'

import { createMessagingAdminClient } from '@/lib/messaging/db'
import { requireInboxTenantContext } from '@/lib/tenant-role-guard'
import { queryInboxConversations, queryInboxMessages } from '@/lib/messaging/inbox-queries'

// ── Authorization policy ──────────────────────────────────────────────────────
//
// Product decision:
//   all active staff_members of the tenant can view inbox conversations.
//
// Blocking rules remain enforced in getTenantRoleContext():
//   - is_active must be true
//   - deleted_at must be null
//   - tenant_id must match the requested tenant

// Re-export types so callers import from a single path
export type { InboxConversation, InboxMessage } from '@/lib/messaging/inbox-queries'

// ── Server actions ────────────────────────────────────────────────────────────

export async function getInboxConversations(tenantId: string) {
  await requireInboxTenantContext(tenantId)
  const db = createMessagingAdminClient()
  // queryInboxConversations throws on DB error — the component's .catch() branch handles it
  return queryInboxConversations(db, tenantId)
}

export async function getInboxMessages(tenantId: string, conversationId: string) {
  await requireInboxTenantContext(tenantId)
  const db = createMessagingAdminClient()
  // queryInboxMessages throws on DB error — component distinguishes from empty result
  return queryInboxMessages(db, tenantId, conversationId)
}
