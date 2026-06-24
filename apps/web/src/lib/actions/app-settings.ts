'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { TablesUpdate } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  businessName: string
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  logoUrl: string | null
  aboutTitle: string | null
  aboutText: string | null
  aboutImageUrl: string | null
  slug: string | null
  heroImageUrl: string | null
  heroTagline: string | null
  heroDescription: string | null
  teamDescription: string | null
  locationsDescription: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactWhatsapp: string | null
  socialInstagram: string | null
  socialFacebook: string | null
  socialTiktok: string | null
}

export interface SiteContent {
  tagline: string | null
  description: string | null
  teamDescription: string | null
  aboutTitle: string | null
  aboutText: string | null
  locationsDescription: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactWhatsapp: string | null
  socialInstagram: string | null
  socialFacebook: string | null
  socialTiktok: string | null
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
    revalidatePath(`/tenant/landing/${slug}`)
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
    .select('business_name, primary_color, secondary_color, font_family, logo_url, settings, slug')
    .eq('id', tenantId)
    .maybeSingle()

  if (!data) return null

  const d = data as Record<string, unknown>
  const settings = (d.settings as Record<string, unknown> | null) ?? null
  const about = (settings?.about as Record<string, unknown> | null) ?? null
  const social = (settings?.social_links as Record<string, unknown> | null) ?? null

  return {
    businessName: (d.business_name as string | null) ?? '',
    primaryColor: (d.primary_color as string | null) ?? null,
    secondaryColor: (d.secondary_color as string | null) ?? null,
    fontFamily: (d.font_family as string | null) ?? null,
    logoUrl: (d.logo_url as string | null) ?? null,
    aboutTitle: (about?.title as string | null) ?? null,
    aboutText: (about?.text as string | null) ?? null,
    aboutImageUrl: (about?.image_url as string | null) ?? null,
    slug: (d.slug as string | null) ?? null,
    heroImageUrl: (settings?.hero_image_url as string | null) ?? null,
    heroTagline: (settings?.tagline as string | null) ?? null,
    heroDescription: (settings?.bio as string | null) ?? null,
    teamDescription: (settings?.team_description as string | null) ?? null,
    locationsDescription: (settings?.locations_description as string | null) ?? null,
    contactPhone: (settings?.contact_phone as string | null) ?? null,
    contactEmail: (settings?.contact_email as string | null) ?? null,
    contactWhatsapp: (social?.whatsapp as string | null) ?? null,
    socialInstagram: (social?.instagram as string | null) ?? null,
    socialFacebook: (social?.facebook as string | null) ?? null,
    socialTiktok: (social?.tiktok as string | null) ?? null,
  }
}

// ─── updateAppSettings ────────────────────────────────────────────────────────

export async function updateAppSettings(
  settings: Partial<Omit<AppSettings, 'slug'>>,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const updates: TablesUpdate<'tenants'> = { updated_at: new Date().toISOString() }

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

  if (
    settings.aboutTitle !== undefined ||
    settings.aboutText !== undefined ||
    settings.aboutImageUrl !== undefined
  ) {
    const { data: current, error: currentError } = await db
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single()

    if (currentError) return { ok: false, error: currentError.message }

    const currentSettings = (current?.settings as Record<string, unknown> | null) ?? {}
    const merged = {
      ...currentSettings,
      about: {
        ...((currentSettings.about as Record<string, unknown> | null) ?? {}),
        ...(settings.aboutTitle !== undefined ? { title: settings.aboutTitle } : {}),
        ...(settings.aboutText !== undefined ? { text: settings.aboutText } : {}),
        ...(settings.aboutImageUrl !== undefined ? { image_url: settings.aboutImageUrl } : {}),
      },
    }

    const { error: settingsError } = await db
      .from('tenants')
      .update({ settings: merged })
      .eq('id', tenantId)

    if (settingsError) return { ok: false, error: settingsError.message }
  }

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


// ─── WebsiteData ─────────────────────────────────────────────────────────────

export interface WebsitePhoto {
  id: string
  url: string
  sortOrder: number
}

export interface WebsiteStaff {
  id: string
  fullName: string | null
  role: string
  photoUrl: string | null
  showOnWebsite: boolean
}

export interface WebsiteLocation {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  showOnWebsite: boolean
}

export interface WebsiteService {
  id: string
  name: string
  price: number
  category: string | null
  showOnWebsite: boolean
}

export interface WebsiteProduct {
  id: string
  name: string
  brand: string | null
  priceSell: number
  photoUrl: string | null
  showOnSite: boolean
  isOutOfStock: boolean
}

export interface WebsiteData {
  photos: WebsitePhoto[]
  staff: WebsiteStaff[]
  locations: WebsiteLocation[]
  services: WebsiteService[]
  products: WebsiteProduct[]
}

export async function getWebsiteData(): Promise<WebsiteData> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { photos: [], staff: [], locations: [], services: [], products: [] }

  const db = createAdminClient()

  const [{ data: photos }, { data: staffRows }, { data: locRows }, { data: svcRows }, { data: productRows }, { data: inventoryRows }] = await Promise.all([
    db.from('website_photos').select('id, url, sort_order').eq('tenant_id', tenantId).order('sort_order', { ascending: true }),
    db
      .from('staff_members')
      .select('id, role, is_active, photo_url, show_on_website, profiles(full_name)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    db
      .from('locations')
      .select('id, name, address, city, phone, email, show_on_website')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    db
      .from('services')
      .select('id, name, price, category, show_on_website')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    db
      .from('products')
      .select('id, name, brand, price_sell, photo_url, show_on_site, display_order')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('product_inventory')
      .select('product_id, quantity')
      .eq('tenant_id', tenantId),
  ])

  const inventoryByProduct = new Map<string, number>()
  for (const row of (inventoryRows ?? [])) {
    const prev = inventoryByProduct.get(row.product_id) ?? 0
    inventoryByProduct.set(row.product_id, prev + (row.quantity ?? 0))
  }

  return {
    photos: (photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.url,
      sortOrder: photo.sort_order ?? 0,
    })),
    staff: ((staffRows ?? []) as Array<Record<string, unknown>>).map((staff) => ({
      id: staff.id as string,
      fullName: ((staff.profiles as Record<string, unknown> | null)?.full_name as string | null) ?? null,
      role: (staff.role as string | null) ?? '',
      photoUrl: (staff.photo_url as string | null) ?? null,
      showOnWebsite: (staff.show_on_website as boolean | null) ?? true,
    })),
    locations: (locRows ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      address: location.address,
      city: (location as Record<string, unknown>).city as string | null ?? null,
      phone: (location as Record<string, unknown>).phone as string | null ?? null,
      email: (location as Record<string, unknown>).email as string | null ?? null,
      showOnWebsite: location.show_on_website ?? true,
    })),
    services: (svcRows ?? []).map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price ?? 0,
      category: service.category,
      showOnWebsite: service.show_on_website ?? true,
    })),
    products: ((productRows ?? []) as Array<Record<string, unknown>>).map((product) => {
      const totalQty = inventoryByProduct.get(product.id as string)
      return {
        id: product.id as string,
        name: product.name as string,
        brand: (product.brand as string | null) ?? null,
        priceSell: Number(product.price_sell ?? 0),
        photoUrl: (product.photo_url as string | null) ?? null,
        showOnSite: (product.show_on_site as boolean | null) ?? false,
        isOutOfStock: totalQty !== undefined ? totalQty === 0 : false,
      }
    }),
  }
}

export async function updateShowOnWebsite(
  table: 'staff_members' | 'services' | 'locations',
  id: string,
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  const query =
    table === 'staff_members'
      ? db.from('staff_members').update({ show_on_website: value }).eq('id', id).eq('tenant_id', tenantId)
      : table === 'services'
        ? db.from('services').update({ show_on_website: value }).eq('id', id).eq('tenant_id', tenantId)
        : db.from('locations').update({ show_on_website: value }).eq('id', id).eq('tenant_id', tenantId)

  const { error } = await query

  if (error) return { ok: false, error: error.message }

  if (table === 'staff_members') revalidateTag(`tenant-${tenantId}-staff`, {})
  if (table === 'services') revalidateTag(`tenant-${tenantId}-services`, {})
  if (table === 'locations') revalidateTag(`tenant-${tenantId}-locations`, {})

  return { ok: true }
}

export async function updateProductShowOnSite(
  id: string,
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  const { error } = await db
    .from('products')
    .update({ show_on_site: value })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { ok: false, error: error.message }

  revalidateTag(`tenant-${tenantId}-products`, {})
  return { ok: true }
}

export async function uploadAboutImage(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'Nessun file' }

  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) return { ok: false, error: 'File troppo grande (max 5MB)' }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: 'Formato non supportato (PNG, JPG, WebP)' }
  }

  const db = createAdminClient()
  const extByType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  const ext = extByType[file.type] ?? 'jpg'
  const path = `about/${tenantId}/about.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await db.storage
    .from('tenants')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = db.storage.from('tenants').getPublicUrl(path)
  return { ok: true, url: urlData.publicUrl }
}

export async function uploadWebsitePhoto(
  formData: FormData,
): Promise<{ ok: boolean; photo?: WebsitePhoto; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'Nessun file' }

  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) return { ok: false, error: 'File troppo grande (max 5MB)' }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: 'Formato non supportato (PNG, JPG, WebP)' }
  }

  const db = createAdminClient()
  const extByType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  const ext = extByType[file.type] ?? 'jpg'
  const uniqueId = crypto.randomUUID()
  const path = `website-photos/${tenantId}/${uniqueId}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await db.storage
    .from('tenants')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = db.storage.from('tenants').getPublicUrl(path)
  const publicUrl = urlData.publicUrl

  const { data: maxRow } = await db
    .from('website_photos')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxRow?.sort_order ?? -1) + 1

  const { data: inserted, error: insertError } = await db
    .from('website_photos')
    .insert({ tenant_id: tenantId, url: publicUrl, sort_order: nextOrder })
    .select('id, url, sort_order')
    .single()

  if (insertError) return { ok: false, error: insertError.message }

  revalidateTag(`tenant-${tenantId}-website-photos`, {})

  return {
    ok: true,
    photo: {
      id: inserted.id,
      url: inserted.url,
      sortOrder: inserted.sort_order ?? 0,
    },
  }
}

export async function deleteWebsitePhoto(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const { error } = await db
    .from('website_photos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { ok: false, error: error.message }

  revalidateTag(`tenant-${tenantId}-website-photos`, {})
  return { ok: true }
}

export async function reorderWebsitePhotos(
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const results = await Promise.all(
    orderedIds.map((photoId, index) =>
      db.from('website_photos').update({ sort_order: index }).eq('id', photoId).eq('tenant_id', tenantId),
    ),
  )

  const firstError = results.find((result) => result.error)?.error
  if (firstError) return { ok: false, error: firstError.message }

  revalidateTag(`tenant-${tenantId}-website-photos`, {})
  return { ok: true }
}

// ─── uploadHeroImage ──────────────────────────────────────────────────────────

export async function uploadHeroImage(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'Nessun file' }

  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) return { ok: false, error: 'Immagine troppo grande. Max 5MB' }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: 'Formato non supportato (PNG, JPG, WebP)' }
  }

  const db = createAdminClient()
  const extByType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  const ext = extByType[file.type] ?? 'jpg'
  const path = `hero/${tenantId}/hero.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await db.storage
    .from('tenants')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = db.storage.from('tenants').getPublicUrl(path)
  const publicUrl = urlData.publicUrl

  // Merge hero_image_url into settings JSONB
  const { data: current, error: fetchError } = await db
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError) return { ok: false, error: fetchError.message }

  const currentSettings = (current?.settings as Record<string, unknown> | null) ?? {}
  const merged = { ...currentSettings, hero_image_url: publicUrl }

  const { error: updateError } = await db
    .from('tenants')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (updateError) return { ok: false, error: updateError.message }

  await revalidateTenantApp(db, tenantId)

  return { ok: true, url: publicUrl }
}

// ─── clearHeroImage ───────────────────────────────────────────────────────────

export async function clearHeroImage(): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  const { data: current, error: fetchError } = await db
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError) return { ok: false, error: fetchError.message }

  const currentSettings = (current?.settings as Record<string, unknown> | null) ?? {}
  const merged = { ...currentSettings, hero_image_url: null }

  const { error: updateError } = await db
    .from('tenants')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (updateError) return { ok: false, error: updateError.message }

  await revalidateTenantApp(db, tenantId)

  return { ok: true }
}

// ─── updateHeroContent ────────────────────────────────────────────────────────

export async function updateHeroContent(
  tagline: string | null,
  description: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  const { data: current, error: fetchError } = await db
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError) return { ok: false, error: fetchError.message }

  const currentSettings = (current?.settings as Record<string, unknown> | null) ?? {}
  const merged = {
    ...currentSettings,
    tagline: tagline ?? null,
    bio: description ?? null,
  }

  const { error: updateError } = await db
    .from('tenants')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (updateError) return { ok: false, error: updateError.message }

  await revalidateTenantApp(db, tenantId)

  return { ok: true }
}

// ─── saveSiteContent ──────────────────────────────────────────────────────────

export async function saveSiteContent(
  content: SiteContent,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  const { data: current, error: fetchError } = await db
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError) return { ok: false, error: fetchError.message }

  const currentSettings = (current?.settings as Record<string, unknown> | null) ?? {}

  const merged = {
    ...currentSettings,
    tagline: content.tagline ?? null,
    bio: content.description ?? null,
    team_description: content.teamDescription ?? null,
    about: {
      ...((currentSettings.about as Record<string, unknown> | null) ?? {}),
      title: content.aboutTitle ?? null,
      text: content.aboutText ?? null,
    },
    locations_description: content.locationsDescription ?? null,
    contact_phone: content.contactPhone ?? null,
    contact_email: content.contactEmail ?? null,
    social_links: {
      instagram: content.socialInstagram ?? null,
      facebook: content.socialFacebook ?? null,
      tiktok: content.socialTiktok ?? null,
      whatsapp: content.contactWhatsapp ?? null,
    },
  }

  const { error: updateError } = await db
    .from('tenants')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (updateError) return { ok: false, error: updateError.message }

  await revalidateTenantApp(db, tenantId)
  return { ok: true }
}

// ─── updateTeamDescription ────────────────────────────────────────────────────

export async function updateTeamDescription(
  description: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  const { data: current, error: fetchError } = await db
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (fetchError) return { ok: false, error: fetchError.message }

  const currentSettings = (current?.settings as Record<string, unknown> | null) ?? {}
  const merged = { ...currentSettings, team_description: description ?? null }

  const { error: updateError } = await db
    .from('tenants')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (updateError) return { ok: false, error: updateError.message }

  await revalidateTenantApp(db, tenantId)

  return { ok: true }
}