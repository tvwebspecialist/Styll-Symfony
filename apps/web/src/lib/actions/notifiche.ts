'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface NotifRow {
  id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  meta: Record<string, unknown>
  created_at: string
}

/**
 * Fetch le ultime 50 notifiche per lo staff.
 * Usa il client autenticato — RLS filtra per tenant e profilo.
 * Broadcast (profile_id IS NULL) + personali (profile_id = user.id) incluse.
 */
export async function getNotifications(tenantId: string): Promise<NotifRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, meta, created_at')
    .eq('tenant_id', tenantId)
    .or(`profile_id.is.null,profile_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as NotifRow[]
}

/**
 * Conta le notifiche non lette (per il badge in TopBar).
 * Versione head-only — nessun dato trasferito, solo count.
 */
export async function getUnreadCount(tenantId: string): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_read', false)
    .or(`profile_id.is.null,profile_id.eq.${user.id}`)

  return count ?? 0
}

/** Marca una singola notifica come letta (ottimistica lato client, confermata qui). */
export async function markNotificationRead(
  tenantId: string,
  notifId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const db = createAdminClient()
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[notifiche] markRead error:', error.message)
    return { ok: false }
  }

  revalidatePath('/notifiche')
  return { ok: true }
}

/** Marca tutte le notifiche non lette del tenant come lette. */
export async function markAllNotificationsRead(tenantId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const db = createAdminClient()
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('tenant_id', tenantId)
    .eq('is_read', false)

  if (error) {
    console.error('[notifiche] markAllRead error:', error.message)
    return { ok: false }
  }

  revalidatePath('/notifiche')
  return { ok: true }
}
