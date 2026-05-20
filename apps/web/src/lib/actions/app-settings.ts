'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  businessName: string
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  logoUrl: string | null
  slug: string | null
}

// ─── getAppSettings ───────────────────────────────────────────────────────────

export async function getAppSettings(): Promise<AppSettings | null> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return null

  const db = createAdminClient()
  const { data } = await db
    .from('tenants')
    .select('business_name, primary_color, secondary_color, font_family, logo_url, slug')
    .eq('id', tenantId)
    .maybeSingle()

  if (!data) return null

  const d = data as Record<string, unknown>
  return {
    businessName: (d.business_name as string | null) ?? '',
    primaryColor: (d.primary_color as string | null) ?? null,
    secondaryColor: (d.secondary_color as string | null) ?? null,
    fontFamily: (d.font_family as string | null) ?? null,
    logoUrl: (d.logo_url as string | null) ?? null,
    slug: (d.slug as string | null) ?? null,
  }
}

// ─── updateAppSettings ────────────────────────────────────────────────────────

export async function updateAppSettings(
  settings: Partial<Omit<AppSettings, 'slug'>>,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (settings.businessName !== undefined) updates.business_name = settings.businessName
  if (settings.primaryColor !== undefined) updates.primary_color = settings.primaryColor
  if (settings.secondaryColor !== undefined) updates.secondary_color = settings.secondaryColor
  if (settings.fontFamily !== undefined) updates.font_family = settings.fontFamily
  if (settings.logoUrl !== undefined) updates.logo_url = settings.logoUrl

  const { error } = await db
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/app')

  return { ok: true }
}
