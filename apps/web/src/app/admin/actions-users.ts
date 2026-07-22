'use server'

import { cookies } from 'next/headers'

import { setAdminShadowCookie } from '@/lib/admin-shadow-cookie'
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

export async function updateProfile(
  id: string,
  input: { full_name?: string | null; is_superadmin?: boolean }
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    })
    bumpAdmin()
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    bumpAdmin()
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function inviteUser(input: {
  email: string
  fullName?: string | null
  isSuperadmin?: boolean
  tenantId?: string
  role?: string
}): Promise<ActionResult & { userId?: string; setupLink?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<{
      success: boolean
      userId: string
      setupLink: string
    }>('/api/admin/users/invite', {
      method: 'POST',
      body: input,
    })
    return { success: true, userId: data.userId, setupLink: data.setupLink }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function resetUserPassword(
  userId: string
): Promise<ActionResult & { tempPassword?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<{
      success: boolean
      tempPassword: string
    }>(`/api/admin/users/${encodeURIComponent(userId)}/password-reset`, {
      method: 'POST',
    })
    return { success: true, tempPassword: data.tempPassword }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function impersonateUser(
  userId: string
): Promise<ActionResult> {
  try {
    const me = await getOptionalSymfonyStaffMe()
    if (!me) {
      return { success: false, error: 'Sessione non valida.' }
    }
    const ctx = await fetchSymfonyAdminJson<{
      tenantId: string
      tenantName: string
    }>(`/api/admin/users/${encodeURIComponent(userId)}/impersonation-context`)
    const cookieStore = await cookies()
    setAdminShadowCookie(cookieStore, ctx.tenantId, me.user.id)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function getUserTenants(
  userId: string
): Promise<{
  success: boolean
  data?: Array<{
    staff_id: string
    role: string
    is_active: boolean
    tenant: { id: string; business_name: string; slug: string }
  }>
  error?: string
}> {
  try {
    const data = await fetchSymfonyAdminJson<Array<{
      staff_id: string
      role: string
      is_active: boolean
      tenant: { id: string; business_name: string; slug: string }
    }>>(`/api/admin/users/${encodeURIComponent(userId)}/tenants`)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function getTenantOwner(
  tenantId: string
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<{
      profileId: string
      fullName: string | null
      email: string | null
      avatarUrl: string | null
    } | null>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/owner`)

    if (!data?.profileId) {
      return { success: false, error: 'Nessun owner trovato per questo tenant.' }
    }

    return { success: true, profileId: data.profileId }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}
