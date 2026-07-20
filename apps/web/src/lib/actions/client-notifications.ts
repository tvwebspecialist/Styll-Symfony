'use server'

import { createClient } from '@/lib/supabase/server'

export interface ClientNotification {
  id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  meta: Record<string, unknown> | null
  created_at: string
}

export async function getClientNotifications(
  tenantId: string,
  limit = 50,
): Promise<ClientNotification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, meta, created_at')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[client-notifications] getClientNotifications error:', error.message)
    return []
  }

  return (data ?? []).map(row => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    is_read: row.is_read ?? false,
    meta: (row.meta as Record<string, unknown> | null) ?? null,
    created_at: row.created_at,
  }))
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('profile_id', user.id)
}

export async function markAllNotificationsRead(tenantId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_read', false)
}
