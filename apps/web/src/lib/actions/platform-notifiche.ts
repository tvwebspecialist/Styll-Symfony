'use server'

import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'

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

function actionError(error: unknown): never {
  if (error instanceof SymfonyAdminApiError && error.details.body) {
    try {
      const parsed = JSON.parse(error.details.body) as { error?: string }
      throw new Error(parsed.error ?? error.message)
    } catch {}
  }

  throw error instanceof Error ? error : new Error('Errore sconosciuto.')
}

export async function getPlatformNotifications(): Promise<PlatformNotifRow[]> {
  try {
    return await fetchSymfonyAdminJson<PlatformNotifRow[]>('/api/admin/notifications')
  } catch (error) {
    actionError(error)
  }
}

export async function getPlatformUnreadCount(): Promise<number> {
  try {
    const data = await fetchSymfonyAdminJson<{ count: number }>('/api/admin/notifications/unread-count')
    return data.count ?? 0
  } catch (error) {
    actionError(error)
  }
}

export async function markPlatformNotificationRead(id: string): Promise<{ ok: boolean }> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    })
    return { ok: true }
  } catch (error) {
    actionError(error)
  }
}

export async function markAllPlatformNotificationsRead(): Promise<{ ok: boolean }> {
  try {
    await fetchSymfonyAdminJson('/api/admin/notifications/read-all', {
      method: 'POST',
    })
    return { ok: true }
  } catch (error) {
    actionError(error)
  }
}
