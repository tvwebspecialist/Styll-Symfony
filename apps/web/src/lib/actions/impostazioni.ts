'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId, resolveActiveProfile } from '@/lib/tenant-context'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileSettings {
  id: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  phone: string | null
}

export interface TenantSettings {
  id: string
  businessName: string | null
  slug: string | null
  primaryColor: string | null
  logoUrl: string | null
}

export interface LocationSettings {
  id: string
  name: string
  address: string | null
  phone: string | null
  isActive: boolean
  photos: string[]
}

export interface SubscriptionInfo {
  status: string
  planName: string | null
  planSlug: string | null
  trialEndsAt: string | null
}

export interface ImpostazioniData {
  profile: ProfileSettings | null
  tenant: TenantSettings | null
  locations: LocationSettings[]
  subscription: SubscriptionInfo | null
}

// ─── getImpostazioniData ──────────────────────────────────────────────────────

export async function getImpostazioniData(): Promise<ImpostazioniData> {
  const ctx = await resolveActiveProfile()
  if (!ctx) return { profile: null, tenant: null, locations: [], subscription: null }

  const tenantId = await getActiveTenantId()
  const db = createAdminClient()

  const [profileRes, tenantRes, locationsRes, subscriptionRes] = await Promise.all([
    db.from('profiles').select('id, full_name, email, avatar_url, phone').eq('id', ctx.profileId).maybeSingle(),
    tenantId
      ? db.from('tenants').select('id, business_name, slug, primary_color, logo_url').eq('id', tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
    tenantId
      ? db.from('locations').select('id, name, address, phone, is_active, photos').eq('tenant_id', tenantId).order('name')
      : Promise.resolve({ data: [] }),
    tenantId
      ? db
          .from('tenant_subscriptions')
          .select('status, trial_ends_at, subscription_plans(name, slug)')
          .eq('tenant_id', tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const profileData = profileRes.data as any
  const tenantData = tenantRes.data as any
  const locs = (locationsRes.data as any[]) ?? []
  const subData = subscriptionRes.data as any

  return {
    profile: profileData
      ? {
          id: profileData.id,
          fullName: profileData.full_name ?? null,
          email: profileData.email ?? null,
          avatarUrl: profileData.avatar_url ?? null,
          phone: profileData.phone ?? null,
        }
      : null,
    tenant: tenantData
      ? {
          id: tenantData.id,
          businessName: tenantData.business_name ?? null,
          slug: tenantData.slug ?? null,
          primaryColor: tenantData.primary_color ?? null,
          logoUrl: tenantData.logo_url ?? null,
        }
      : null,
    locations: locs.map((l) => ({
      id: l.id,
      name: l.name ?? '',
      address: l.address ?? null,
      phone: l.phone ?? null,
      isActive: l.is_active ?? true,
      photos: (l.photos as string[] | null) ?? [],
    })),
    subscription: subData
      ? {
          status: subData.status ?? 'unknown',
          planName: (subData.subscription_plans as any)?.name ?? null,
          planSlug: (subData.subscription_plans as any)?.slug ?? null,
          trialEndsAt: subData.trial_ends_at ?? null,
        }
      : null,
  }
}

// ─── updateProfile ────────────────────────────────────────────────────────────

export async function updateProfile(data: {
  fullName?: string
  phone?: string
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await resolveActiveProfile()
  if (!ctx) return { success: false, error: 'Non autenticato' }
  const db = createAdminClient()
  const { error } = await db
    .from('profiles')
    .update({ full_name: data.fullName ?? null, phone: data.phone ?? null, updated_at: new Date().toISOString() })
    .eq('id', ctx.profileId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/impostazioni')
  return { success: true }
}

// ─── updateTenant ─────────────────────────────────────────────────────────────

export async function updateTenant(data: {
  businessName?: string
  primaryColor?: string | null
  logoUrl?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }
  const db = createAdminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.businessName !== undefined) updates.business_name = data.businessName
  if (data.primaryColor !== undefined) updates.primary_color = data.primaryColor
  if (data.logoUrl !== undefined) updates.logo_url = data.logoUrl
  const { error } = await db.from('tenants').update(updates).eq('id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/impostazioni')
  return { success: true }
}

// ─── upsertLocation ───────────────────────────────────────────────────────────

export async function upsertLocation(data: {
  id?: string
  name: string
  address?: string | null
  phone?: string | null
  isActive?: boolean
  photos?: string[]
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }
  const db = createAdminClient()
  const now = new Date().toISOString()
  if (data.id) {
    const { error } = await db
      .from('locations')
      .update({
        name: data.name,
        address: data.address ?? null,
        phone: data.phone ?? null,
        is_active: data.isActive ?? true,
        photos: data.photos ?? [],
        updated_at: now,
      })
      .eq('id', data.id)
      .eq('tenant_id', tenantId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/impostazioni')
    return { success: true, id: data.id }
  } else {
    const { data: inserted, error } = await db
      .from('locations')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        address: data.address ?? null,
        phone: data.phone ?? null,
        is_active: data.isActive ?? true,
        photos: data.photos ?? [],
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/impostazioni')
    return { success: true, id: (inserted as { id: string }).id }
  }
}

// ─── deleteLocation ───────────────────────────────────────────────────────────

export async function deleteLocation(id: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }
  const db = createAdminClient()
  const { error } = await db.from('locations').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/impostazioni')
  return { success: true }
}
