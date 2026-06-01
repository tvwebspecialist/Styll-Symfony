'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'

import { bumpAdmin, requireSuperadmin, type ActionResult } from './actions'

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
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('services').insert({
    tenant_id: tenantId,
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    duration_minutes: input.duration_minutes,
    category: input.category ?? null,
    display_order: input.display_order ?? 0,
    is_active: input.is_active ?? true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
}

export async function updateService(
  tenantId: string,
  id: string,
  input: Partial<ServiceInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('services').update(input).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
}

export async function reorderServices(
  tenantId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db
      .from('services')
      .update({ display_order: i })
      .eq('id', orderedIds[i])
      .eq('tenant_id', tenantId)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
}

export async function deleteService(tenantId: string, id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('services').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
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
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('locations').insert({
    tenant_id: tenantId,
    name: input.name,
    address: input.address ?? null,
    city: input.city ?? null,
    zip_code: input.zip_code ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    is_active: input.is_active ?? true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/locations`)
  return { success: true }
}

export async function updateLocation(
  tenantId: string,
  id: string,
  input: Partial<LocationInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('locations').update(input).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/locations`)
  return { success: true }
}

export async function deleteLocation(tenantId: string, id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('locations').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/locations`)
  return { success: true }
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
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('staff_members').insert({
    tenant_id: tenantId,
    profile_id: input.profile_id,
    role: input.role,
    bio: input.bio ?? null,
    photo_url: input.photo_url ?? null,
    is_active: input.is_active ?? true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/staff`)
  return { success: true }
}

export async function updateStaff(
  tenantId: string,
  id: string,
  input: Partial<StaffInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db
    .from('staff_members')
    .update(input)
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/staff`)
  return { success: true }
}

export async function deleteStaff(tenantId: string, id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db
    .from('staff_members')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/staff`)
  return { success: true }
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
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error: delErr } = await db
    .from('working_hours')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('staff_id', staffId)
  if (delErr) return { success: false, error: delErr.message }

  const rows = days
    .filter((d) => d.is_open)
    .map((d) => ({
      tenant_id: tenantId,
      staff_id: staffId,
      day_of_week: d.day_of_week,
      start_time: d.start_time,
      end_time: d.end_time,
    }))
  if (rows.length > 0) {
    const { error } = await db.from('working_hours').insert(rows)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(`/admin/tenants/${tenantId}/working-hours`)
  return { success: true }
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

  const file = formData.get('file')
  const bucket = String(formData.get('bucket') ?? '')
  const pathPrefix = String(formData.get('pathPrefix') ?? 'misc')

  if (!(file instanceof File)) return { success: false, error: 'File mancante.' }
  if (!ALLOWED_BUCKETS.includes(bucket as AllowedBucket)) {
    return { success: false, error: 'Bucket non valido.' }
  }
  if (file.size > 1024 * 1024) {
    return { success: false, error: 'File troppo grande (max 1 MB dopo compressione).' }
  }

  const db = createAdminClient()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const safePrefix = pathPrefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'misc'
  const path = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await db.storage
    .from(bucket)
    .upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: false })
  if (upErr) return { success: false, error: upErr.message }

  const { data: pub } = db.storage.from(bucket).getPublicUrl(path)
  return { success: true, url: pub.publicUrl }
}
