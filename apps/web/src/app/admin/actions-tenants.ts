'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import {
  clearAdminShadowCookie,
  parseAdminShadowCookieValue,
  setAdminShadowCookie,
} from '@/lib/admin-shadow-cookie'
import { IMPERSONATE_COOKIE } from '@/lib/tenant-context'
import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'
import { getOptionalSymfonyStaffMe } from '@/lib/symfony/staff-context'

import { bumpAdmin, type ActionResult } from './actions'

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

export interface TenantInput {
  business_name: string
  slug: string
  timezone?: string
  status?: string
  primary_color?: string | null
  secondary_color?: string | null
  logo_url?: string | null
  font_family?: string | null
  settings?: Record<string, unknown> | null
}

export async function createTenant(input: TenantInput): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson('/api/admin/tenants', {
      method: 'POST',
      body: input,
    })
    bumpAdmin()
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateTenant(id: string, input: Partial<TenantInput>): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    })
    bumpAdmin()
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function toggleTenantStatus(id: string, status: string): Promise<ActionResult> {
  return updateTenant(id, { status })
}

export async function deleteTenant(id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    bumpAdmin()
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function softDeleteTenant(id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(id)}/soft-delete`, {
      method: 'POST',
    })
    revalidatePath('/admin/tenants')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function exportTenantData(
  id: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<Record<string, unknown>>(
      `/api/admin/tenants/${encodeURIComponent(id)}/export`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export interface TenantSubscriptionInput {
  plan_id: string | null
  status?: string
  starts_at?: string | null
  ends_at?: string | null
}

export async function updateTenantSubscription(
  tenantId: string,
  input: TenantSubscriptionInput
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}/subscription`, {
      method: 'PUT',
      body: input,
    })
    revalidatePath(`/admin/tenants/${tenantId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function startTenantImpersonation(
  tenantId: string,
): Promise<ActionResult> {
  try {
    const me = await getOptionalSymfonyStaffMe()
    if (!me) {
      return { success: false, error: 'Sessione non valida.' }
    }

    const tenants = await fetchSymfonyAdminJson<Array<{
      id: string
      business_name: string
      active_staff_count: number
    }>>('/api/admin/tenants')

    const tenant = tenants.find((entry) => entry.id === tenantId)
    if (!tenant) {
      return { success: false, error: 'Tenant non trovato.' }
    }
    if ((tenant.active_staff_count ?? 0) === 0) {
      return { success: false, error: 'Tenant senza proprietario. Assegna prima un owner.' }
    }

    const cookieStore = await cookies()
    setAdminShadowCookie(cookieStore, tenantId, me.user.id)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function stopTenantImpersonation(): Promise<ActionResult> {
  const cookieStore = await cookies()
  const previous = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null
  clearAdminShadowCookie(cookieStore)

  const previousTenantId = parseAdminShadowCookieValue(previous)?.tenantId ?? null
  if (previousTenantId) {
    revalidatePath('/admin')
  }

  return { success: true }
}

export interface TopTenantRow {
  id: string
  business_name: string
  logo_url: string | null
  primary_color: string | null
  total_revenue: number
  appointments_30d: number
}

export interface AdminGlobalOverview {
  total_revenue: number
  active_tenants: number
  appointments_30d: number
  top_tenants: TopTenantRow[]
}

export async function getAdminGlobalOverview(): Promise<{
  success: boolean
  data?: AdminGlobalOverview
  error?: string
}> {
  try {
    const data = await fetchSymfonyAdminJson<AdminGlobalOverview>('/api/admin/global-overview')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function assignTenantOwnerToMe(
  tenantId: string,
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}/owner/self`, {
      method: 'POST',
    })
    revalidatePath('/admin/tenants')
    revalidatePath(`/admin/tenants/${tenantId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function assignTenantOwnerByEmail(
  tenantId: string,
  email: string,
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}/owner/by-email`, {
      method: 'POST',
      body: { email },
    })
    revalidatePath('/admin/tenants')
    revalidatePath(`/admin/tenants/${tenantId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function getTenantOwnerInfo(tenantId: string): Promise<{
  success: boolean
  data?: {
    profileId: string
    fullName: string | null
    email: string | null
    avatarUrl: string | null
  } | null
  error?: string
}> {
  try {
    const data = await fetchSymfonyAdminJson<{
      profileId: string
      fullName: string | null
      email: string | null
      avatarUrl: string | null
    } | null>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/owner`)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}
