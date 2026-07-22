'use server'

import { revalidatePath } from 'next/cache'

import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'

import type { ActionResult } from './actions'

function actionError(error: unknown): string {
  if (error instanceof SymfonyAdminApiError) {
    if (error.details.body) {
      try {
        const parsed = JSON.parse(error.details.body) as { error?: string }
        if (parsed.error) return parsed.error
      } catch {}
    }
  }

  return error instanceof Error ? error.message : 'Errore sconosciuto.'
}

export interface AuditEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  tenant_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export async function getAuditLog(params: {
  tenantId?: string
  limit?: number
}): Promise<{ success: boolean; data?: AuditEntry[]; error?: string }> {
  try {
    const search = new URLSearchParams()
    if (params.tenantId) search.set('tenantId', params.tenantId)
    if (params.limit) search.set('limit', String(params.limit))

    const data = await fetchSymfonyAdminJson<AuditEntry[]>(
      `/api/admin/audit-log${search.size > 0 ? `?${search.toString()}` : ''}`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export interface AdminStats {
  total_tenants: number
  active_tenants: number
  suspended_tenants: number
  total_staff: number
  new_signups_7d: number
  new_signups_30d: number
  total_services: number
  total_plans: number
  mrr: number
  tenants_without_services: number
  tenants_without_hours: number
  tenants_without_locations: number
  tenants_without_owner: number
  growth_by_month: { month: string; count: number }[]
  signups_by_month: { month: string; count: number }[]
  recent_events: Array<{
    id: string
    action: string
    entity_type: string
    created_at: string
    details: Record<string, unknown>
  }>
}

export async function getAdminStats(): Promise<{
  success: boolean
  data?: AdminStats
  error?: string
}> {
  try {
    const data = await fetchSymfonyAdminJson<AdminStats>('/api/admin/stats')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function getAdminSettings(
  keys: string[]
): Promise<{
  success: boolean
  data?: Record<string, Record<string, unknown>>
  error?: string
}> {
  try {
    const search = new URLSearchParams()
    for (const key of keys) search.append('keys', key)
    const data = await fetchSymfonyAdminJson<Record<string, Record<string, unknown>>>(
      `/api/admin/settings${search.size > 0 ? `?${search.toString()}` : ''}`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function setAdminSetting(
  key: string,
  value: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson('/api/admin/settings/' + encodeURIComponent(key), {
      method: 'PUT',
      body: { value },
    })
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export interface EmailTemplate {
  id: string
  slug: string
  name: string
  subject: string
  body: string
  variables: string[]
  is_active: boolean
}

export async function listEmailTemplates(): Promise<{
  success: boolean
  data?: EmailTemplate[]
  error?: string
}> {
  try {
    const data = await fetchSymfonyAdminJson<EmailTemplate[]>('/api/admin/email-templates')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateEmailTemplate(
  id: string,
  input: { name?: string; subject?: string; body?: string; is_active?: boolean }
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/email-templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    })
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function adminGlobalSearch(query: string): Promise<{
  success: boolean
  data?: {
    tenants: Array<{ id: string; business_name: string; slug: string }>
    users: Array<{ id: string; full_name: string | null; email: string | null }>
    services: Array<{ id: string; name: string; tenant_id: string; tenant_name: string }>
  }
  error?: string
}> {
  try {
    const search = new URLSearchParams()
    search.set('q', query)
    const data = await fetchSymfonyAdminJson<{
      tenants: Array<{ id: string; business_name: string; slug: string }>
      users: Array<{ id: string; full_name: string | null; email: string | null }>
      services: Array<{ id: string; name: string; tenant_id: string; tenant_name: string }>
    }>(`/api/admin/search?${search.toString()}`)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}
