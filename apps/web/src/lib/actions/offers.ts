'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { applyBestOffer, type OfferForPricing } from '@/lib/utils/offer-pricing'

// ── Types ────────────────────────────────────────────────────────────────────

export type OfferStatus = 'draft' | 'active' | 'expired' | 'archived'
export type OfferType = 'catalog' | 'free_text'
export type DiscountType = 'percentage' | 'fixed_amount'
export type TargetType = 'all' | 'segment'
export type TargetSegment = 'churn_red' | 'churn_yellow' | 'vip' | 'new'

export interface OfferRow {
  id: string
  tenant_id: string
  title: string
  description: string | null
  offer_type: OfferType
  discount_type: DiscountType | null
  discount_value: number | null
  target_type: TargetType
  target_segment: TargetSegment | null
  starts_at: string
  ends_at: string
  status: OfferStatus
  created_at: string
  // aggregates (joined)
  service_names: string[]
  product_names: string[]
  recipients_notified: number
  recipients_viewed: number
  recipients_converted: number
}

export interface CatalogoItem {
  id: string
  name: string
  price: number
  type: 'service' | 'product'
}

export interface ActiveOfferForClient {
  id: string
  title: string
  description: string | null
  offer_type: OfferType
  discount_type: DiscountType | null
  discount_value: number | null
  ends_at: string
  service_names: string[]
}

export interface ServiceOffer {
  serviceId: string
  offers: OfferForPricing[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireTenantId(providedId?: string): Promise<string> {
  const id = providedId ?? (await getActiveTenantId())
  if (!id) throw new Error('Unauthorized')
  return id
}

function isClientEligibleForSegment(
  analytics: { churn_status: string; total_visits: number } | null,
  segment: TargetSegment | null,
): boolean {
  if (!segment) return true
  if (!analytics) return false
  if (segment === 'churn_red') return analytics.churn_status === 'red'
  if (segment === 'churn_yellow') return analytics.churn_status === 'yellow'
  if (segment === 'vip') return analytics.total_visits >= 10
  if (segment === 'new') return analytics.total_visits <= 1
  return false
}

// ── Dashboard: list offers ────────────────────────────────────────────────────

export async function getOfferte(tenantId: string): Promise<OfferRow[]> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return []

  const db = createAdminClient()

  const { data: offers, error } = await (db as any)
    .from('offers')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !offers) return []

  const offerIds = (offers as any[]).map((o: any) => o.id)
  if (offerIds.length === 0) return []

  const [{ data: offerServices }, { data: offerProducts }, { data: recipientStats }] =
    await Promise.all([
      (db as any)
        .from('offer_services')
        .select('offer_id, services(name)')
        .eq('tenant_id', tenantId)
        .in('offer_id', offerIds),
      (db as any)
        .from('offer_products')
        .select('offer_id, products(name)')
        .eq('tenant_id', tenantId)
        .in('offer_id', offerIds),
      (db as any)
        .from('offer_recipients')
        .select('offer_id, status')
        .eq('tenant_id', tenantId)
        .in('offer_id', offerIds),
    ])

  // Build lookup maps
  const serviceNamesByOffer = new Map<string, string[]>()
  for (const row of (offerServices ?? []) as any[]) {
    const names = serviceNamesByOffer.get(row.offer_id) ?? []
    const svc = Array.isArray(row.services) ? row.services[0] : row.services
    if (svc?.name) names.push(svc.name)
    serviceNamesByOffer.set(row.offer_id, names)
  }
  const productNamesByOffer = new Map<string, string[]>()
  for (const row of (offerProducts ?? []) as any[]) {
    const names = productNamesByOffer.get(row.offer_id) ?? []
    const prd = Array.isArray(row.products) ? row.products[0] : row.products
    if (prd?.name) names.push(prd.name)
    productNamesByOffer.set(row.offer_id, names)
  }

  const statsByOffer = new Map<
    string,
    { notified: number; viewed: number; converted: number }
  >()
  for (const row of (recipientStats ?? []) as any[]) {
    const s = statsByOffer.get(row.offer_id) ?? { notified: 0, viewed: 0, converted: 0 }
    s.notified++
    if (row.status === 'viewed' || row.status === 'converted') s.viewed++
    if (row.status === 'converted') s.converted++
    statsByOffer.set(row.offer_id, s)
  }

  return (offers as any[]).map((o: any) => {
    const stats = statsByOffer.get(o.id) ?? { notified: 0, viewed: 0, converted: 0 }
    return {
      id: o.id,
      tenant_id: o.tenant_id,
      title: o.title,
      description: o.description,
      offer_type: o.offer_type,
      discount_type: o.discount_type,
      discount_value: o.discount_value,
      target_type: o.target_type,
      target_segment: o.target_segment,
      starts_at: o.starts_at,
      ends_at: o.ends_at,
      status: o.status,
      created_at: o.created_at,
      service_names: serviceNamesByOffer.get(o.id) ?? [],
      product_names: productNamesByOffer.get(o.id) ?? [],
      recipients_notified: stats.notified,
      recipients_viewed: stats.viewed,
      recipients_converted: stats.converted,
    } satisfies OfferRow
  })
}

// ── Dashboard: catalog for offer form ────────────────────────────────────────

export async function getCatalogoPerOfferta(tenantId: string): Promise<CatalogoItem[]> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return []

  const db = createAdminClient()
  const [{ data: services }, { data: products }] = await Promise.all([
    db.from('services').select('id, name, price').eq('tenant_id', tenantId).eq('is_active', true).order('display_order'),
    db.from('products').select('id, name, price_sell').eq('tenant_id', tenantId).eq('is_active', true).order('display_order'),
  ])

  return [
    ...((services ?? []) as any[]).map((s: any) => ({ id: s.id, name: s.name, price: Number(s.price), type: 'service' as const })),
    ...((products ?? []) as any[]).map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price_sell), type: 'product' as const })),
  ]
}

// ── Dashboard: segment audience estimate ─────────────────────────────────────

export async function getSegmentEstimate(
  tenantId: string,
  targetType: TargetType,
  segment: TargetSegment | null,
): Promise<{ count: number }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return { count: 0 }

  const db = createAdminClient()

  if (targetType === 'all') {
    const { count } = await db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .eq('marketing_consent', true)
    return { count: count ?? 0 }
  }

  const { data: analyticsRows } = await db
    .from('client_analytics')
    .select('client_id, churn_status, total_visits')
    .eq('tenant_id', tenantId)

  if (!analyticsRows) return { count: 0 }

  const eligible = (analyticsRows as any[]).filter((row: any) =>
    isClientEligibleForSegment(row, segment),
  )
  const eligibleIds = eligible.map((r: any) => r.client_id)
  if (eligibleIds.length === 0) return { count: 0 }

  const { count } = await db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .eq('marketing_consent', true)
    .in('id', eligibleIds)
  return { count: count ?? 0 }
}

// ── Dashboard: create offer ───────────────────────────────────────────────────

export interface CreateOffertaInput {
  tenantId: string
  title: string
  description?: string
  offer_type: OfferType
  discount_type?: DiscountType
  discount_value?: number
  target_type: TargetType
  target_segment?: TargetSegment
  starts_at: string
  ends_at: string
  status: OfferStatus
  service_ids?: string[]
  product_ids?: string[]
  created_by?: string
}

export async function createOfferta(
  input: CreateOffertaInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== input.tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }

  const db = createAdminClient()

  const { data: offer, error } = await (db as any)
    .from('offers')
    .insert({
      tenant_id: input.tenantId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      offer_type: input.offer_type,
      discount_type: input.offer_type === 'catalog' ? (input.discount_type ?? null) : null,
      discount_value: input.offer_type === 'catalog' ? (input.discount_value ?? null) : null,
      target_type: input.target_type,
      target_segment: input.target_type === 'segment' ? (input.target_segment ?? null) : null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      status: input.status,
      created_by: input.created_by ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !offer) {
    return { success: false, error: error?.message ?? 'Errore creazione offerta' }
  }

  const offerId = (offer as any).id

  // Insert offer_services
  if (input.offer_type === 'catalog' && (input.service_ids ?? []).length > 0) {
    await (db as any).from('offer_services').insert(
      (input.service_ids ?? []).map((sid) => ({
        tenant_id: input.tenantId,
        offer_id: offerId,
        service_id: sid,
      })),
    )
  }

  // Insert offer_products
  if (input.offer_type === 'catalog' && (input.product_ids ?? []).length > 0) {
    await (db as any).from('offer_products').insert(
      (input.product_ids ?? []).map((pid) => ({
        tenant_id: input.tenantId,
        offer_id: offerId,
        product_id: pid,
      })),
    )
  }

  // TODO: trigger invio notifica via outbox quando status = 'active'

  return { success: true, id: offerId }
}

// ── Dashboard: update status ──────────────────────────────────────────────────

export async function updateOffertaStatus(
  offerId: string,
  status: OfferStatus,
  tenantId: string,
): Promise<{ success: boolean }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return { success: false }

  const db = createAdminClient()
  const { error } = await (db as any)
    .from('offers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', offerId)
    .eq('tenant_id', tenantId)

  // TODO: quando status diventa 'active', trigger invio notifica via outbox

  return { success: !error }
}

// ── Dashboard: duplicate offer ────────────────────────────────────────────────

export async function duplicateOfferta(
  offerId: string,
  tenantId: string,
): Promise<{ success: boolean; id?: string }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) return { success: false }

  const db = createAdminClient()

  const { data: original } = await (db as any)
    .from('offers')
    .select('*, offer_services(service_id), offer_products(product_id)')
    .eq('id', offerId)
    .eq('tenant_id', tenantId)
    .single()

  if (!original) return { success: false }

  const o = original as any
  const result = await createOfferta({
    tenantId,
    title: `${o.title} (copia)`,
    description: o.description,
    offer_type: o.offer_type,
    discount_type: o.discount_type,
    discount_value: o.discount_value,
    target_type: o.target_type,
    target_segment: o.target_segment,
    starts_at: new Date().toISOString(),
    ends_at: o.ends_at,
    status: 'draft',
    service_ids: (o.offer_services ?? []).map((s: any) => s.service_id),
    product_ids: (o.offer_products ?? []).map((p: any) => p.product_id),
  })

  return result
}

// ── PWA: active offers for client (home section) ──────────────────────────────

export async function getActiveOffersForClient(
  tenantId: string,
  clientId: string,
): Promise<ActiveOfferForClient[]> {
  const db = createAdminClient()
  const now = new Date().toISOString()

  // 1. Check marketing consent
  const { data: clientRow } = await db
    .from('clients')
    .select('marketing_consent')
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!(clientRow as any)?.marketing_consent) return []

  // 2. Get client analytics for segment check (don't expose to client)
  const { data: analytics } = await db
    .from('client_analytics')
    .select('churn_status, total_visits')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .maybeSingle()

  // 3. Fetch active offers
  const { data: offers } = await (db as any)
    .from('offers')
    .select('id, title, description, offer_type, discount_type, discount_value, target_type, target_segment, ends_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .lte('starts_at', now)
    .gte('ends_at', now)

  if (!offers || (offers as any[]).length === 0) return []

  // 4. Filter by client eligibility (segment check done server-side)
  const eligible = (offers as any[]).filter((offer: any) => {
    if (offer.target_type === 'all') return true
    return isClientEligibleForSegment(analytics as any, offer.target_segment)
  })

  if (eligible.length === 0) return []

  // 5. Fetch service names for catalog offers (don't expose offer IDs as segment hints)
  const catalogOfferIds = eligible.filter((o: any) => o.offer_type === 'catalog').map((o: any) => o.id)
  let serviceNamesByOffer = new Map<string, string[]>()

  if (catalogOfferIds.length > 0) {
    const { data: offerSvcs } = await (db as any)
      .from('offer_services')
      .select('offer_id, services(name)')
      .eq('tenant_id', tenantId)
      .in('offer_id', catalogOfferIds)

    for (const row of (offerSvcs ?? []) as any[]) {
      const names = serviceNamesByOffer.get(row.offer_id) ?? []
      const svc = Array.isArray(row.services) ? row.services[0] : row.services
      if (svc?.name) names.push(svc.name)
      serviceNamesByOffer.set(row.offer_id, names)
    }
  }

  return eligible.map((offer: any) => ({
    id: offer.id,
    title: offer.title,
    description: offer.description,
    offer_type: offer.offer_type,
    discount_type: offer.discount_type,
    discount_value: offer.discount_value,
    ends_at: offer.ends_at,
    service_names: serviceNamesByOffer.get(offer.id) ?? [],
  }))
}

// ── PWA: active offers per service for booking step ──────────────────────────

export async function getActiveOffersForBooking(
  tenantId: string,
  serviceIds: string[],
  clientId?: string | null,
): Promise<Record<string, OfferForPricing[]>> {
  if (serviceIds.length === 0) return {}
  const db = createAdminClient()
  const now = new Date().toISOString()

  // Check marketing consent if client is known
  if (clientId) {
    const { data: clientRow } = await db
      .from('clients')
      .select('marketing_consent')
      .eq('tenant_id', tenantId)
      .eq('id', clientId)
      .is('deleted_at', null)
      .maybeSingle()
    if (!(clientRow as any)?.marketing_consent) return {}
  }

  // Get client analytics for segment eligibility
  let analytics: { churn_status: string; total_visits: number } | null = null
  if (clientId) {
    const { data } = await db
      .from('client_analytics')
      .select('churn_status, total_visits')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .maybeSingle()
    analytics = data as any
  }

  // Fetch active catalog offers that have at least one of our services
  const { data: offerSvcs } = await (db as any)
    .from('offer_services')
    .select('offer_id, service_id')
    .eq('tenant_id', tenantId)
    .in('service_id', serviceIds)

  if (!offerSvcs || (offerSvcs as any[]).length === 0) return {}

  const uniqueOfferIds = [...new Set((offerSvcs as any[]).map((r: any) => r.offer_id))]

  const { data: offers } = await (db as any)
    .from('offers')
    .select('id, title, discount_type, discount_value, target_type, target_segment, starts_at, ends_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('offer_type', 'catalog')
    .is('deleted_at', null)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .in('id', uniqueOfferIds)

  if (!offers || (offers as any[]).length === 0) return {}

  // Filter by eligibility
  const eligibleOffers = (offers as any[]).filter((offer: any) => {
    if (offer.target_type === 'all') return true
    if (!clientId) return false // guests not eligible for segmented offers
    return isClientEligibleForSegment(analytics, offer.target_segment)
  })

  if (eligibleOffers.length === 0) return {}

  // Build serviceId → offers map
  const eligibleOfferIds = new Set(eligibleOffers.map((o: any) => o.id))
  const offerById = new Map(eligibleOffers.map((o: any) => [o.id, o]))
  const result: Record<string, OfferForPricing[]> = {}

  for (const row of (offerSvcs as any[]) as any[]) {
    if (!eligibleOfferIds.has(row.offer_id)) continue
    const offer = offerById.get(row.offer_id)
    if (!offer) continue
    const list = result[row.service_id] ?? []
    list.push({
      id: offer.id,
      title: offer.title,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      starts_at: offer.starts_at,
    })
    result[row.service_id] = list
  }

  return result
}

// ── Server-side: apply best offer when saving appointment_services ────────────
// Called from create-booking.ts — resolves and returns the best offer per service.

export async function resolveOfferForService(
  tenantId: string,
  serviceId: string,
  basePrice: number,
  clientId?: string | null,
  marketingConsentGivenAtBooking?: boolean,
): Promise<{ discountedPrice: number; appliedOfferId: string | null }> {
  // For guests who gave consent during booking, treat them as eligible for 'all' offers
  const hasConsent = !!marketingConsentGivenAtBooking

  if (!clientId && !hasConsent) {
    return { discountedPrice: basePrice, appliedOfferId: null }
  }

  const offersMap = await getActiveOffersForBooking(tenantId, [serviceId], clientId)
  let offers = offersMap[serviceId] ?? []

  // For guests with consent given at booking time, also consider 'all' targeted offers
  if (!clientId && hasConsent && offers.length === 0) {
    const db = createAdminClient()
    const now = new Date().toISOString()
    const { data: offerSvcs } = await (db as any)
      .from('offer_services')
      .select('offer_id')
      .eq('tenant_id', tenantId)
      .eq('service_id', serviceId)

    if (offerSvcs && (offerSvcs as any[]).length > 0) {
      const offerIds = (offerSvcs as any[]).map((r: any) => r.offer_id)
      const { data: rawOffers } = await (db as any)
        .from('offers')
        .select('id, title, discount_type, discount_value, starts_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .eq('offer_type', 'catalog')
        .eq('target_type', 'all')
        .is('deleted_at', null)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .in('id', offerIds)

      offers = (rawOffers ?? []) as OfferForPricing[]
    }
  }

  const { discountedPrice, appliedOffer } = applyBestOffer(basePrice, offers)
  return { discountedPrice, appliedOfferId: appliedOffer?.id ?? null }
}
