'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getOptionalSymfonyStaffMe,
  listSymfonyStaffMemberships,
} from '@/lib/symfony/staff-context'
import { getActiveTenantId } from '@/lib/tenant-context'

export interface NotifRow {
  id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  meta: Record<string, unknown>
  created_at: string
}

async function getStaffNotificationContext(expectedTenantId?: string): Promise<{
  tenantId: string
  userId: string
  db: ReturnType<typeof createAdminClient>
} | null> {
  const me = await getOptionalSymfonyStaffMe()
  if (!me) return null

  const tenantId = await getActiveTenantId()
  if (!tenantId) return null
  if (expectedTenantId && expectedTenantId !== tenantId) return null

  const db = createAdminClient()
  const membership = listSymfonyStaffMemberships(me)
    .find((entry) => entry.tenant.id === tenantId)

  if (!membership) return null

  return {
    tenantId,
    userId: me.user.id,
    db,
  }
}

/**
 * Fetch le ultime 50 notifiche per lo staff.
 * Usa il client autenticato — RLS filtra per tenant e profilo.
 * Broadcast (profile_id IS NULL) + personali (profile_id = user.id) incluse.
 */
export async function getNotifications(tenantId: string): Promise<NotifRow[]> {
  const ctx = await getStaffNotificationContext(tenantId)
  if (!ctx) return []

  const { data } = await ctx.db
    .from('notifications')
    .select('id, type, title, body, is_read, meta, created_at')
    .eq('tenant_id', ctx.tenantId)
    .or(`profile_id.is.null,profile_id.eq.${ctx.userId}`)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as NotifRow[]
}

/**
 * Conta le notifiche non lette (per il badge in TopBar).
 * Versione head-only — nessun dato trasferito, solo count.
 */
export async function getUnreadCount(tenantId: string): Promise<number> {
  const ctx = await getStaffNotificationContext(tenantId)
  if (!ctx) return 0

  const { count } = await ctx.db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('is_read', false)
    .or(`profile_id.is.null,profile_id.eq.${ctx.userId}`)

  return count ?? 0
}

/** Marca una singola notifica come letta (ottimistica lato client, confermata qui). */
export async function markNotificationRead(
  tenantId: string,
  notifId: string,
): Promise<{ ok: boolean }> {
  const ctx = await getStaffNotificationContext(tenantId)
  if (!ctx) return { ok: false }

  const { data: notification } = await ctx.db
    .from('notifications')
    .select('id')
    .eq('id', notifId)
    .eq('tenant_id', ctx.tenantId)
    .or(`profile_id.is.null,profile_id.eq.${ctx.userId}`)
    .maybeSingle()

  if (!notification) return { ok: false }

  const { error } = await ctx.db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId)
    .eq('tenant_id', ctx.tenantId)
    .or(`profile_id.is.null,profile_id.eq.${ctx.userId}`)

  if (error) {
    console.error('[notifiche] markRead error:', error.message)
    return { ok: false }
  }

  revalidatePath('/notifiche')
  return { ok: true }
}

/** Marca tutte le notifiche non lette del tenant come lette. */
export async function markAllNotificationsRead(tenantId: string): Promise<{ ok: boolean }> {
  const ctx = await getStaffNotificationContext(tenantId)
  if (!ctx) return { ok: false }

  const { error } = await ctx.db
    .from('notifications')
    .update({ is_read: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('is_read', false)
    .or(`profile_id.is.null,profile_id.eq.${ctx.userId}`)

  if (error) {
    console.error('[notifiche] markAllRead error:', error.message)
    return { ok: false }
  }

  revalidatePath('/notifiche')
  return { ok: true }
}
