'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { revalidatePath, revalidateTag } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  businessName: string
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  logoUrl: string | null
  slug: string | null
}

async function revalidateTenantApp(db: ReturnType<typeof createAdminClient>, tenantId: string) {
  const { data: tenantData } = await db
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .maybeSingle()

  const slug = (tenantData as { slug?: string } | null)?.slug
  if (slug) {
    revalidateTag(`tenant-${slug}`, {})
    revalidatePath(`/tenant/app/${slug}`)
    revalidatePath(`/tenant/app/${slug}/`, 'layout')
  }

  revalidatePath('/dashboard/app')
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

  await revalidateTenantApp(db, tenantId)

  return { ok: true }
}

// ─── uploadTenantLogo ────────────────────────────────────────────────────────

export async function uploadTenantLogo(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'Nessun file' }

  const MAX_SIZE = 2 * 1024 * 1024
  if (file.size > MAX_SIZE) return { ok: false, error: 'File troppo grande (max 2MB)' }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: 'Formato non supportato (PNG, JPG, WebP, SVG)' }
  }

  const db = createAdminClient()
  const extByType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  const ext = extByType[file.type] ?? 'png'
  const path = `logos/${tenantId}/logo.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await db.storage
    .from('tenants')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = db.storage.from('tenants').getPublicUrl(path)
  const publicUrl = urlData.publicUrl

  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('tenants')
    .update({
      logo_url: publicUrl,
      updated_at: now,
    })
    .eq('id', tenantId)

  if (updateError) return { ok: false, error: updateError.message }

  await revalidateTenantApp(db, tenantId)

  return { ok: true, url: publicUrl }
}
