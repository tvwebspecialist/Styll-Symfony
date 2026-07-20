'use server'

import { createClient } from '@/lib/supabase/server'

export interface PlatformNotifRow {
  id: string
  type: string
  title: string
  body: string | null
  tenant_id: string | null
  related_profile_id: string | null
  meta: Record<string, unknown>
  is_read: boolean
  created_at: string
}

async function requireSuperadmin(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_superadmin) throw new Error('Forbidden')
  return user.id
}

export async function getPlatformNotifications(): Promise<PlatformNotifRow[]> {
  await requireSuperadmin()
  const supabase = await createClient()
  const { data } = await supabase
    .from('platform_notifications')
    .select('id, type, title, body, tenant_id, related_profile_id, meta, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as PlatformNotifRow[]
}

export async function getPlatformUnreadCount(): Promise<number> {
  await requireSuperadmin()
  const supabase = await createClient()
  const { count } = await supabase
    .from('platform_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  return count ?? 0
}

export async function markPlatformNotificationRead(id: string): Promise<{ ok: boolean }> {
  await requireSuperadmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('platform_notifications')
    .update({ is_read: true })
    .eq('id', id)
  return { ok: !error }
}

export async function markAllPlatformNotificationsRead(): Promise<{ ok: boolean }> {
  await requireSuperadmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('platform_notifications')
    .update({ is_read: true })
    .eq('is_read', false)
  return { ok: !error }
}
