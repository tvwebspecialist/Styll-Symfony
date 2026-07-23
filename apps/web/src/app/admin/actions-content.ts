'use server'

import { revalidatePath } from 'next/cache'

import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'

import { requireSuperadmin, type ActionResult } from './actions'

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

// =====================================================
// SERVICES
// =====================================================

export interface ServiceInput {
  name: string
  description?: string | null
  price: number
  duration_minutes: number
  category?: string | null
  display_order?: number
  is_active?: boolean
}

export async function createService(
  tenantId: string,
  input: ServiceInput
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}/services`, {
      method: 'POST',
      body: input,
    })
    revalidatePath(`/admin/tenants/${tenantId}/services`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateService(
  tenantId: string,
  id: string,
  input: Partial<ServiceInput>
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/services/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: input,
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/services`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function reorderServices(
  tenantId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/services/reorder`,
      {
        method: 'POST',
        body: { orderedIds },
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/services`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteService(tenantId: string, id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/services/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/services`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// LOCATIONS
// =====================================================

export interface LocationInput {
  name: string
  address?: string | null
  city?: string | null
  zip_code?: string | null
  phone?: string | null
  email?: string | null
  is_active?: boolean
}

export async function createLocation(
  tenantId: string,
  input: LocationInput
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}/locations`, {
      method: 'POST',
      body: input,
    })
    revalidatePath(`/admin/tenants/${tenantId}/locations`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateLocation(
  tenantId: string,
  id: string,
  input: Partial<LocationInput>
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/locations/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: input,
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/locations`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteLocation(tenantId: string, id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/locations/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/locations`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// STAFF MEMBERS
// =====================================================

export interface StaffInput {
  profile_id: string
  role: string
  bio?: string | null
  photo_url?: string | null
  is_active?: boolean
}

export async function createStaff(tenantId: string, input: StaffInput): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}/staff`, {
      method: 'POST',
      body: input,
    })
    revalidatePath(`/admin/tenants/${tenantId}/staff`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateStaff(
  tenantId: string,
  id: string,
  input: Partial<StaffInput>
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/staff/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: input,
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/staff`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteStaff(tenantId: string, id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/staff/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/staff`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// WORKING HOURS
// =====================================================

export interface DaySlot {
  day_of_week: number
  is_open: boolean
  start_time: string
  end_time: string
}

export async function setWorkingHours(
  tenantId: string,
  staffId: string,
  days: DaySlot[]
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/staff/${encodeURIComponent(staffId)}/working-hours`,
      {
        method: 'PUT',
        body: { days },
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/working-hours`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =============================================================
// IMAGE UPLOAD (admin only)
// =============================================================

const ALLOWED_BUCKETS = ['tenants', 'locations', 'avatars'] as const
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number]

export async function uploadAdminImage(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const bucket = String(formData.get('bucket') ?? '')
  if (!ALLOWED_BUCKETS.includes(bucket as AllowedBucket)) {
    return { success: false, error: 'Bucket non valido.' }
  }

  try {
    const data = await fetchSymfonyAdminJson<{ url: string }>('/api/admin/uploads/image', {
      method: 'POST',
      body: formData,
    })

    return { success: true, url: data.url }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}
