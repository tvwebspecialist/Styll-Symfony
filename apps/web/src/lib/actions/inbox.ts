'use server'

import { createAdminClient } from '@/lib/supabase/admin'
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

function parseProfileName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  const maybeArray = value as Array<{ full_name?: string | null }> | { full_name?: string | null }
  const profile = Array.isArray(maybeArray) ? maybeArray[0] : maybeArray
  const fullName = profile?.full_name?.trim() ?? ''

  return fullName.length > 0 ? fullName : null
}

async function loadStaffNameById(
  tenantId: string,
  staffIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(staffIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()

  const db = createAdminClient()
  const { data, error } = await db
    .from('staff_members')
    .select('id, profiles(full_name)')
    .eq('tenant_id', tenantId)
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`[inbox] staff name lookup failed: ${error.message}`)
  }

  const names = new Map<string, string>()
  for (const row of data ?? []) {
    const fullName = parseProfileName((row as { profiles?: unknown }).profiles)
    if (fullName) {
      names.set(row.id, fullName)
    }
  }

  return names
}

// ── Server actions ────────────────────────────────────────────────────────────

export async function getInboxConversations(tenantId: string) {
  await requireInboxTenantContext(tenantId)
  const db = createMessagingAdminClient()
  const conversations = await queryInboxConversations(db, tenantId)
  const staffNames = await loadStaffNameById(
    tenantId,
    conversations.map((conversation) => conversation.assignedStaffId).filter(Boolean) as string[],
  )

  return conversations.map((conversation) => ({
    ...conversation,
    assignedStaffName: conversation.assignedStaffId
      ? staffNames.get(conversation.assignedStaffId) ?? null
      : null,
  }))
}

export async function getInboxMessages(tenantId: string, conversationId: string) {
  await requireInboxTenantContext(tenantId)
  const db = createMessagingAdminClient()
  const messages = await queryInboxMessages(db, tenantId, conversationId)
  const staffNames = await loadStaffNameById(
    tenantId,
    messages.map((message) => message.authorStaffId).filter(Boolean) as string[],
  )

  return messages.map((message) => ({
    ...message,
    authorName: message.authorStaffId
      ? staffNames.get(message.authorStaffId) ?? null
      : message.authorName,
  }))
}
