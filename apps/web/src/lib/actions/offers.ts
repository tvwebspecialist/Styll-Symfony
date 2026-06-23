'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { applyBestPromotion, type PromotionServicePricing } from '@/lib/utils/offer-pricing'
import { sendPromotionPush } from '@/lib/push/promotion-push'

// ── Types ────────────────────────────────────────────────────────────────────

export type PromotionStatus = 'draft' | 'active' | 'expired' | 'archived'
export type DiscountType = 'percent' | 'fixed'

export interface PromotionServiceItem {
  serviceId: string
  serviceName: string
  discount_type: DiscountType
  discount_value: number
  originalPrice?: number
}

export interface PromotionProductItem {
  productId: string
  productName: string
  discount_type: DiscountType
  discount_value: number
  originalPrice?: number
}

export interface PromotionRow {
  id: string
  tenant_id: string
  title: string
  description: string | null
  cover_image_url: string | null
  valid_from: string
  valid_until: string | null
  show_in_app: boolean
  show_on_landing: boolean
  status: PromotionStatus
  created_at: string
  service_items: PromotionServiceItem[]
  product_items: PromotionProductItem[]
}

export interface OffertaAnalytics {
  notificheInviate: number
  prenotazioniGenerate: number
  revenueGenerato: number
}

export interface CatalogoItem {
  id: string
  name: string
  price: number
  type: 'service' | 'product'
  category?: string | null
}

export interface ActivePromotionForClient {
  id: string
  title: string
  description: string | null
  valid_until: string | null
  cover_image_url: string | null
  service_items: PromotionServiceItem[]
  product_items: PromotionProductItem[]
}

export interface PromotionServiceDiscountInput {
  serviceId: string
  discount_type: DiscountType
  discount_value: number
}

export interface PromotionProductDiscountInput {
  productId: string
  discount_type: DiscountType
  discount_value: number
}

export interface CreatePromozionInput {
  tenantId: string
  title: string
  description?: string
  cover_image_url?: string | null
  valid_from: string
  valid_until?: string | null
  show_in_app: boolean
  show_on_landing: boolean
  status: PromotionStatus
  service_discounts: PromotionServiceDiscountInput[]
  product_discounts: PromotionProductDiscountInput[]
}

// ── Dashboard: list promotions ────────────────────────────────────────────────

export async function getOfferte(tenantId: string): Promise<PromotionRow[]> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return []

  const db = createAdminClient()

  // status is a new column not in generated types — cast to any
  const { data: rows } = await (db as any)
    .from('promotions')
    .select('id, tenant_id, title, description, cover_image_url, valid_from, valid_until, show_in_app, show_on_landing, is_active, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (!rows || (rows as any[]).length === 0) return []

  const promotionIds = (rows as any[]).map((r: any) => r.id)

  const [{ data: svcRows }, { data: prdRows }] = await Promise.all([
    (db as any)
      .from('promotion_services')
      .select('promotion_id, service_id, discount_type, discount_value, services(name, price)')
      .eq('tenant_id', tenantId)
      .in('promotion_id', promotionIds),
    (db as any)
      .from('promotion_products')
      .select('promotion_id, product_id, discount_type, discount_value, products(name, price_sell)')
      .eq('tenant_id', tenantId)
      .in('promotion_id', promotionIds),
  ])

  const svcByPromotion = new Map<string, PromotionServiceItem[]>()
  for (const row of (svcRows ?? []) as any[]) {
    const svc = Array.isArray(row.services) ? row.services[0] : row.services
    const items = svcByPromotion.get(row.promotion_id) ?? []
    items.push({ serviceId: row.service_id, serviceName: svc?.name ?? '', discount_type: row.discount_type, discount_value: Number(row.discount_value), originalPrice: svc?.price !== undefined ? Number(svc.price) : undefined })
    svcByPromotion.set(row.promotion_id, items)
  }

  const prdByPromotion = new Map<string, PromotionProductItem[]>()
  for (const row of (prdRows ?? []) as any[]) {
    const prd = Array.isArray(row.products) ? row.products[0] : row.products
    const items = prdByPromotion.get(row.promotion_id) ?? []
    items.push({ productId: row.product_id, productName: prd?.name ?? '', discount_type: row.discount_type, discount_value: Number(row.discount_value), originalPrice: prd?.price_sell !== undefined ? Number(prd.price_sell) : undefined })
    prdByPromotion.set(row.promotion_id, items)
  }

  return (rows as any[]).map((r: any) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    title: r.title,
    description: r.description,
    cover_image_url: r.cover_image_url ?? null,
    valid_from: r.valid_from,
    valid_until: r.valid_until,
    show_in_app: r.show_in_app,
    show_on_landing: r.show_on_landing,
    status: (r.status ?? (r.is_active ? 'active' : 'draft')) as PromotionStatus,
    created_at: r.created_at,
    service_items: svcByPromotion.get(r.id) ?? [],
    product_items: prdByPromotion.get(r.id) ?? [],
  } satisfies PromotionRow))
}

// ── Dashboard: catalog for form ───────────────────────────────────────────────

export async function getCatalogoPerOfferta(tenantId: string): Promise<CatalogoItem[]> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return []

  const db = createAdminClient()
  const [{ data: services }, { data: products }] = await Promise.all([
    db.from('services').select('id, name, price, category').eq('tenant_id', tenantId).eq('is_active', true).order('display_order'),
    db.from('products').select('id, name, price_sell, category').eq('tenant_id', tenantId).eq('is_active', true).order('display_order'),
  ])

  return [
    ...((services ?? []) as any[]).map((s: any) => ({ id: s.id, name: s.name, price: Number(s.price), type: 'service' as const, category: s.category ?? null })),
    ...((products ?? []) as any[]).map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price_sell), type: 'product' as const, category: p.category ?? null })),
  ]
}

// ── Dashboard: create promotion ───────────────────────────────────────────────

export async function createOfferta(
  input: CreatePromozionInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== input.tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }

  const db = createAdminClient()
  const isActive = input.status === 'active'
  const now = new Date().toISOString()

  const { data: promotion, error } = await (db as any)
    .from('promotions')
    .insert({
      tenant_id: input.tenantId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      cover_image_url: input.cover_image_url ?? null,
      valid_from: input.valid_from,
      valid_until: input.valid_until ?? null,
      show_in_app: input.show_in_app,
      show_on_landing: input.show_on_landing,
      is_active: isActive,
      status: input.status,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (error || !promotion) {
    return { success: false, error: error?.message ?? 'Errore creazione promozione' }
  }

  const promotionId = (promotion as any).id

  if (input.service_discounts.length > 0) {
    await (db as any).from('promotion_services').insert(
      input.service_discounts.map((sd) => ({
        tenant_id: input.tenantId,
        promotion_id: promotionId,
        service_id: sd.serviceId,
        discount_type: sd.discount_type,
        discount_value: sd.discount_value,
      })),
    )
  }

  if (input.product_discounts.length > 0) {
    await (db as any).from('promotion_products').insert(
      input.product_discounts.map((pd) => ({
        tenant_id: input.tenantId,
        promotion_id: promotionId,
        product_id: pd.productId,
        discount_type: pd.discount_type,
        discount_value: pd.discount_value,
      })),
    )
  }

  if (input.status === 'active' && input.show_in_app) {
    sendPromotionPush(promotionId, input.tenantId).catch((err) => {
      console.error('[push] Errore notifica promozione:', err)
    })
  }

  return { success: true, id: promotionId }
}

// ── Dashboard: update status ──────────────────────────────────────────────────

export async function updateOffertaStatus(
  promotionId: string,
  status: PromotionStatus,
  tenantId: string,
): Promise<{ success: boolean }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return { success: false }

  const db = createAdminClient()

  // Keep is_active in sync for legacy readers (public-booking.ts, LandingPromo.tsx)
  const { error } = await (db as any)
    .from('promotions')
    .update({ status, is_active: status === 'active', updated_at: new Date().toISOString() })
    .eq('id', promotionId)
    .eq('tenant_id', tenantId)

  if (!error && status === 'active') {
    sendPromotionPush(promotionId, tenantId).catch((err) => {
      console.error('[push] Errore notifica promozione:', err)
    })
  }

  return { success: !error }
}

// ── Dashboard: duplicate promotion ────────────────────────────────────────────

export async function duplicateOfferta(
  promotionId: string,
  tenantId: string,
): Promise<{ success: boolean; id?: string }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return { success: false }

  const db = createAdminClient()

  const { data: original } = await (db as any)
    .from('promotions')
    .select('title, description, valid_from, valid_until, show_in_app, show_on_landing')
    .eq('id', promotionId)
    .eq('tenant_id', tenantId)
    .single()

  if (!original) return { success: false }

  const [{ data: svcRows }, { data: prdRows }] = await Promise.all([
    (db as any)
      .from('promotion_services')
      .select('service_id, discount_type, discount_value')
      .eq('promotion_id', promotionId)
      .eq('tenant_id', tenantId),
    (db as any)
      .from('promotion_products')
      .select('product_id, discount_type, discount_value')
      .eq('promotion_id', promotionId)
      .eq('tenant_id', tenantId),
  ])

  const o = original as any
  return createOfferta({
    tenantId,
    title: `${o.title} (copia)`,
    description: o.description,
    valid_from: new Date().toISOString(),
    valid_until: o.valid_until,
    show_in_app: o.show_in_app,
    show_on_landing: o.show_on_landing,
    status: 'draft',
    service_discounts: ((svcRows ?? []) as any[]).map((r: any) => ({ serviceId: r.service_id, discount_type: r.discount_type, discount_value: r.discount_value })),
    product_discounts: ((prdRows ?? []) as any[]).map((r: any) => ({ productId: r.product_id, discount_type: r.discount_type, discount_value: r.discount_value })),
  })
}

// ── PWA: active promotions for client (home section) ─────────────────────────

export async function getActiveOffersForClient(
  tenantId: string,
  clientId: string,
): Promise<ActivePromotionForClient[]> {
  const db = createAdminClient()
  const now = new Date().toISOString()

  const { data: clientRow } = await db
    .from('clients')
    .select('marketing_consent')
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!(clientRow as any)?.marketing_consent) return []

  const { data: rows } = await (db as any)
    .from('promotions')
    .select('id, title, description, valid_until, cover_image_url')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('show_in_app', true)
    .lte('valid_from', now)
    .or(`valid_until.is.null,valid_until.gte.${now}`)

  if (!rows || (rows as any[]).length === 0) return []

  const promotionIds = (rows as any[]).map((r: any) => r.id)

  const [{ data: svcRows }, { data: prdRows }] = await Promise.all([
    (db as any)
      .from('promotion_services')
      .select('promotion_id, service_id, discount_type, discount_value, services(name)')
      .eq('tenant_id', tenantId)
      .in('promotion_id', promotionIds),
    (db as any)
      .from('promotion_products')
      .select('promotion_id, product_id, discount_type, discount_value, products(name)')
      .eq('tenant_id', tenantId)
      .in('promotion_id', promotionIds),
  ])

  const svcByPromotion = new Map<string, PromotionServiceItem[]>()
  for (const row of (svcRows ?? []) as any[]) {
    const svc = Array.isArray(row.services) ? row.services[0] : row.services
    const items = svcByPromotion.get(row.promotion_id) ?? []
    items.push({ serviceId: row.service_id, serviceName: svc?.name ?? '', discount_type: row.discount_type, discount_value: Number(row.discount_value) })
    svcByPromotion.set(row.promotion_id, items)
  }

  const prdByPromotion = new Map<string, PromotionProductItem[]>()
  for (const row of (prdRows ?? []) as any[]) {
    const prd = Array.isArray(row.products) ? row.products[0] : row.products
    const items = prdByPromotion.get(row.promotion_id) ?? []
    items.push({ productId: row.product_id, productName: prd?.name ?? '', discount_type: row.discount_type, discount_value: Number(row.discount_value) })
    prdByPromotion.set(row.promotion_id, items)
  }

  return (rows as any[]).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    valid_until: r.valid_until,
    cover_image_url: r.cover_image_url ?? null,
    service_items: svcByPromotion.get(r.id) ?? [],
    product_items: prdByPromotion.get(r.id) ?? [],
  }))
}

// ── PWA: per-service pricing for booking step ─────────────────────────────────

export async function getActiveOffersForBooking(
  tenantId: string,
  serviceIds: string[],
  clientId?: string | null,
): Promise<Record<string, PromotionServicePricing[]>> {
  if (serviceIds.length === 0) return {}

  const db = createAdminClient()
  const now = new Date().toISOString()

  // Marketing consent gate
  if (clientId) {
    const { data: clientRow } = await db
      .from('clients')
      .select('marketing_consent')
      .eq('tenant_id', tenantId)
      .eq('id', clientId)
      .is('deleted_at', null)
      .maybeSingle()
    if (!(clientRow as any)?.marketing_consent) return {}
  } else {
    return {} // guests don't see discounts in service selection UI
  }

  // Find promotion_services rows for the requested service IDs
  const { data: psRows } = await (db as any)
    .from('promotion_services')
    .select('promotion_id, service_id, discount_type, discount_value')
    .eq('tenant_id', tenantId)
    .in('service_id', serviceIds)

  if (!psRows || (psRows as any[]).length === 0) return {}

  const uniquePromotionIds = [...new Set((psRows as any[]).map((r: any) => r.promotion_id))]

  // Filter to active promotions within date range
  const { data: promoRows } = await (db as any)
    .from('promotions')
    .select('id, title, valid_from')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('show_in_app', true)
    .lte('valid_from', now)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .in('id', uniquePromotionIds)

  if (!promoRows || (promoRows as any[]).length === 0) return {}

  const activePromoMap = new Map((promoRows as any[]).map((r: any) => [r.id, r]))
  const result: Record<string, PromotionServicePricing[]> = {}

  for (const row of (psRows as any[]) as any[]) {
    const promo = activePromoMap.get(row.promotion_id)
    if (!promo) continue
    const list = result[row.service_id] ?? []
    list.push({
      promotionId: promo.id,
      promotionTitle: promo.title,
      discount_type: row.discount_type,
      discount_value: Number(row.discount_value),
      valid_from: promo.valid_from,
    })
    result[row.service_id] = list
  }

  return result
}

// ── Dashboard: upload cover image ─────────────────────────────────────────────

function detectImageMime(buf: ArrayBuffer): string | null {
  const b = new Uint8Array(buf, 0, 12)
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  return null
}

export async function uploadPromozioneCopertina(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Non autenticato' }

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'Nessun file' }

  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'File troppo grande (max 5MB)' }

  const arrayBuffer = await file.arrayBuffer()
  const detectedMime = detectImageMime(arrayBuffer)
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  if (!detectedMime || !ALLOWED_TYPES.includes(detectedMime)) {
    return { ok: false, error: 'Formato non supportato (JPG, PNG, WebP)' }
  }

  const db = createAdminClient()
  const extByType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const ext = extByType[detectedMime] ?? 'jpg'
  const path = `${tenantId}/promotions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await db.storage
    .from('promotions')
    .upload(path, arrayBuffer, { contentType: detectedMime, upsert: false })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: urlData } = db.storage.from('promotions').getPublicUrl(path)
  return { ok: true, url: urlData.publicUrl }
}

// ── Dashboard: update promotion ───────────────────────────────────────────────

export async function updateOfferta(
  promotionId: string,
  input: CreatePromozionInput,
): Promise<{ success: boolean; error?: string }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== input.tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }

  const db = createAdminClient()
  const isActive = input.status === 'active'
  const now = new Date().toISOString()

  const { error } = await (db as any)
    .from('promotions')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      cover_image_url: input.cover_image_url ?? null,
      valid_from: input.valid_from,
      valid_until: input.valid_until ?? null,
      show_in_app: input.show_in_app,
      show_on_landing: input.show_on_landing,
      is_active: isActive,
      status: input.status,
      updated_at: now,
    })
    .eq('id', promotionId)
    .eq('tenant_id', input.tenantId)

  if (error) return { success: false, error: error.message }

  await (db as any).from('promotion_services').delete().eq('promotion_id', promotionId).eq('tenant_id', input.tenantId)
  if (input.service_discounts.length > 0) {
    await (db as any).from('promotion_services').insert(
      input.service_discounts.map((sd) => ({
        tenant_id: input.tenantId,
        promotion_id: promotionId,
        service_id: sd.serviceId,
        discount_type: sd.discount_type,
        discount_value: sd.discount_value,
      })),
    )
  }

  await (db as any).from('promotion_products').delete().eq('promotion_id', promotionId).eq('tenant_id', input.tenantId)
  if (input.product_discounts.length > 0) {
    await (db as any).from('promotion_products').insert(
      input.product_discounts.map((pd) => ({
        tenant_id: input.tenantId,
        promotion_id: promotionId,
        product_id: pd.productId,
        discount_type: pd.discount_type,
        discount_value: pd.discount_value,
      })),
    )
  }

  return { success: true }
}

// ── Dashboard: analytics per offerta ─────────────────────────────────────────

export async function getOffertaAnalytics(
  promotionId: string,
  tenantId: string,
): Promise<OffertaAnalytics> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) {
    return { notificheInviate: 0, prenotazioniGenerate: 0, revenueGenerato: 0 }
  }

  const db = createAdminClient()

  const [notifResult, prenResult, revenueResult] = await Promise.all([
    (db as any)
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('promotion_id', promotionId)
      .eq('type', 'promotion_published'),
    (db as any)
      .from('appointment_services')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('applied_promotion_id', promotionId),
    (db as any)
      .from('appointment_services')
      .select('price_at_booking')
      .eq('tenant_id', tenantId)
      .eq('applied_promotion_id', promotionId),
  ])

  const revenueGenerato = ((revenueResult.data ?? []) as { price_at_booking: number }[])
    .reduce((sum, r) => sum + Number(r.price_at_booking), 0)

  return {
    notificheInviate: notifResult.count ?? 0,
    prenotazioniGenerate: prenResult.count ?? 0,
    revenueGenerato,
  }
}

// ── Dashboard: reset idempotenza notifica promozione ─────────────────────────

export async function resetNotificationIdempotenza(
  promotionId: string,
  tenantId: string,
): Promise<{ success: boolean }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return { success: false }

  const db = createAdminClient()
  await (db as any)
    .from('notification_log')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('promotion_id', promotionId)
    .eq('type', 'promotion_published')

  return { success: true }
}

// ── Dashboard: soft delete promozione (solo draft) ────────────────────────────

export async function deleteOfferta(
  promotionId: string,
  tenantId: string,
): Promise<{ success: boolean }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return { success: false }

  const db = createAdminClient()
  await (db as any)
    .from('promotions')
    .delete()
    .eq('id', promotionId)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')

  return { success: true }
}

// ── Server-side: resolve best promotion when saving appointment_services ──────

export async function resolveOfferForService(
  tenantId: string,
  serviceId: string,
  basePrice: number,
  clientId?: string | null,
): Promise<{ discountedPrice: number; appliedPromotionId: string | null }> {
  const offersMap = await getActiveOffersForBooking(tenantId, [serviceId], clientId)
  const items = offersMap[serviceId] ?? []
  const { discountedPrice, appliedPromotionId } = applyBestPromotion(basePrice, items)
  return { discountedPrice, appliedPromotionId }
}
