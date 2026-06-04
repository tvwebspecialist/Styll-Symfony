import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tables } from '@/types'

export type PublicLocation = Pick<
  Tables<'locations'>,
  'id' | 'name' | 'address' | 'city' | 'phone' | 'photo_url' | 'photos' | 'email' | 'latitude' | 'longitude'
>

export interface PublicProduct {
  id: string
  name: string
  brand: string | null
  price_sell: number
  photo_url: string | null
  category: string | null
  description: string | null
  display_order: number
  inventory: Array<{ locationName: string; quantity: number }>
}

export interface PublicPortfolioPhoto {
  id: string
  photo_url: string
  service_tags: string[] | null
  display_order: number
}

export interface PublicWebsitePhoto {
  id: string
  url: string
  sort_order: number
}

export type PublicService = Pick<
  Tables<'services'>,
  'id' | 'name' | 'description' | 'price' | 'duration_minutes' | 'category' | 'display_order' | 'color'
>

export interface PublicStaffMember {
  id: string
  full_name: string | null
  bio: string | null
  photo_url: string | null
}

export interface StaffForBooking {
  id: string
  full_name: string | null
  avatar_url: string | null
  services: Array<{ id: string; name: string; price: number; duration_minutes: number }>
}

export interface ServiceForStaff {
  id: string
  name: string
  price: number
  duration_minutes: number
  category: string | null
}

export interface Promotion {
  id: string
  title: string
  description: string | null
  discount_type: 'percent' | 'fixed' | 'free_service' | 'none'
  discount_value: number | null
  valid_from: string
  valid_until: string | null
  show_on_landing: boolean
  show_in_app: boolean
  display_order: number
}

export type PublicLoyaltyConfig = Pick<
  Tables<'loyalty_configs'>,
  'id' | 'template' | 'points_per_visit' | 'points_per_euro' | 'streak_threshold_days'
>

export type PublicReward = Pick<
  Tables<'rewards'>,
  'id' | 'name' | 'description' | 'points_cost' | 'reward_type' | 'display_order'
>

export interface PublicAppointmentSummary {
  id: string
  tenant_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  staff_name: string | null
  staff_photo_url: string | null
  location_name: string | null
  location_address: string | null
  location_city: string | null
  location_phone: string | null
  services: Array<{
    id: string
    name: string
    price_at_booking: number
  }>
}

type RawProfileRelation = { full_name: string | null } | Array<{ full_name: string | null }> | null

type RawPublicStaffMember = {
  id: string
  bio: string | null
  photo_url: string | null
  profile: RawProfileRelation
}

type RawProfileWithAvatar =
  | { full_name: string | null; avatar_url: string | null }
  | Array<{ full_name: string | null; avatar_url: string | null }>
  | null

type RawStaffForBooking = {
  id: string
  photo_url: string | null
  profile: RawProfileWithAvatar
}

type RawStaffServiceRow = {
  staff_id: string
  services: {
    id: string
    name: string
    price: number | string
    duration_minutes: number | string
    display_order: number | string
    is_active: boolean
  } | null
}

function readProfileWithAvatar(profile: RawProfileWithAvatar): {
  full_name: string | null
  avatar_url: string | null
} {
  if (Array.isArray(profile)) {
    return { full_name: profile[0]?.full_name ?? null, avatar_url: profile[0]?.avatar_url ?? null }
  }
  return { full_name: profile?.full_name ?? null, avatar_url: profile?.avatar_url ?? null }
}

type RawPromotion = Promotion & {
  tenant_id: string
  is_active: boolean
}

type RawAppointmentSummary = {
  id: string
  tenant_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  client: {
    full_name: string | null
    phone: string | null
    email: string | null
  } | null
  location: {
    name: string | null
    address: string | null
    city: string | null
    phone: string | null
  } | null
  staff: {
    photo_url: string | null
    profile: RawProfileRelation
  } | null
  appointment_services:
    | Array<{
        price_at_booking: number
        services: { id: string; name: string } | null
      }>
    | null
}

function readProfileFullName(profile: RawProfileRelation): string | null {
  if (Array.isArray(profile)) {
    return profile[0]?.full_name ?? null
  }

  return profile?.full_name ?? null
}

function isPromotionCurrentlyActive(promotion: RawPromotion, now: Date): boolean {
  const validFrom = new Date(promotion.valid_from)
  const validUntil = promotion.valid_until ? new Date(promotion.valid_until) : null

  if (Number.isNaN(validFrom.getTime()) || validFrom > now) {
    return false
  }

  if (validUntil && !Number.isNaN(validUntil.getTime()) && validUntil < now) {
    return false
  }

  return promotion.is_active
}

function sortByRequestedIds<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const order = new Map(ids.map((id, index) => [id, index]))
  return [...items].sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
}

export function getPublicLocations(tenantId: string): Promise<PublicLocation[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('locations')
        .select('id, name, address, city, phone, photo_url, photos, email, latitude, longitude')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('show_on_website', true)
        .order('name', { ascending: true })

      return ((data ?? []) as unknown as PublicLocation[]).map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        phone: location.phone,
        photo_url: location.photo_url,
        photos: location.photos ?? [],
        email: location.email,
        latitude: location.latitude,
        longitude: location.longitude,
      }))
    },
    [`public-locations-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-locations`],
    }
  )()
}

export interface PublicTeamMember {
  id: string
  full_name: string | null
  bio: string | null
  photo_url: string | null
  role: string
}

type RawTeamMemberProfile =
  | { full_name: string | null; avatar_url: string | null }
  | Array<{ full_name: string | null; avatar_url: string | null }>
  | null

type RawTeamMember = {
  id: string
  bio: string | null
  photo_url: string | null
  role: string
  profile: RawTeamMemberProfile
}

export function getPublicTeam(tenantId: string): Promise<PublicTeamMember[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('staff_members')
        .select('id, bio, photo_url, role, profile:profiles(full_name, avatar_url)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('show_on_website', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      return ((data ?? []) as unknown as RawTeamMember[]).map((member) => {
        const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile
        // Prefer staff-specific photo (set on staff_members row) over generic profile avatar.
        // Use || instead of ?? so empty strings are also skipped.
        const photo_url = member.photo_url || profile?.avatar_url || null
        return {
          id: member.id,
          full_name: profile?.full_name ?? null,
          bio: member.bio ?? null,
          photo_url,
          role: member.role,
        }
      })
    },
    [`public-team-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-staff`],
    }
  )()
}

export function getPublicPortfolioPhotos(tenantId: string): Promise<PublicPortfolioPhoto[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('portfolio_photos')
        .select('id, photo_url, service_tags, display_order')
        .eq('tenant_id', tenantId)
        .eq('is_visible', true)
        .order('display_order', { ascending: true })
        .limit(12)

      return ((data ?? []) as unknown as PublicPortfolioPhoto[]).map((photo) => ({
        id: photo.id,
        photo_url: photo.photo_url,
        service_tags: photo.service_tags,
        display_order: Number(photo.display_order ?? 0),
      }))
    },
    [`public-portfolio-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-portfolio`],
    }
  )()
}

export function getPublicWebsitePhotos(tenantId: string): Promise<PublicWebsitePhoto[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('website_photos')
        .select('id, url, sort_order')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })
        .limit(12)

      return ((data ?? []) as unknown as PublicWebsitePhoto[]).map((photo) => ({
        id: photo.id,
        url: photo.url,
        sort_order: Number(photo.sort_order ?? 0),
      }))
    },
    [`public-website-photos-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-website-photos`],
    }
  )()
}

export function getPublicLocationById(
  tenantId: string,
  locationId: string
): Promise<PublicLocation | null> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('locations')
        .select('id, name, address, city, phone, photo_url, photos, email, latitude, longitude')
        .eq('tenant_id', tenantId)
        .eq('id', locationId)
        .eq('is_active', true)
        .maybeSingle()

      if (!data) {
        return null
      }

      const location = data as unknown as PublicLocation
      return {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        phone: location.phone,
        photo_url: location.photo_url,
        photos: location.photos ?? [],
        email: location.email,
        latitude: location.latitude,
        longitude: location.longitude,
      }
    },
    [`public-location-${tenantId}-${locationId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-locations`],
    }
  )()
}

export function getPublicServices(tenantId: string): Promise<PublicService[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('services')
        .select('id, name, description, price, duration_minutes, category, color, display_order')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('show_on_website', true)
        .order('display_order', { ascending: true })

      return ((data ?? []) as unknown as PublicService[]).map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: Number(service.price ?? 0),
        duration_minutes: Number(service.duration_minutes ?? 0),
        category: service.category,
        color: service.color ?? null,
        display_order: Number(service.display_order ?? 0),
      }))
    },
    [`public-services-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-services`],
    }
  )()
}

export async function getPublicServicesByIds(
  tenantId: string,
  serviceIds: string[]
): Promise<PublicService[]> {
  if (serviceIds.length === 0) {
    return []
  }

  const db = createAdminClient()
  const { data } = await db
    .from('services')
    .select('id, name, description, price, duration_minutes, category, color, display_order')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('id', serviceIds)

  const services = ((data ?? []) as unknown as PublicService[]).map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price: Number(service.price ?? 0),
    duration_minutes: Number(service.duration_minutes ?? 0),
    category: service.category,
    color: service.color ?? null,
    display_order: Number(service.display_order ?? 0),
  }))

  return sortByRequestedIds(services, serviceIds)
}

export function getActivePromotions(
  tenantId: string,
  surface?: 'landing' | 'app'
): Promise<Promotion[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('promotions')
        .select(
          'id, tenant_id, title, description, discount_type, discount_value, valid_from, valid_until, show_on_landing, show_in_app, is_active, display_order'
        )
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      const now = new Date()
      const promotions = ((data ?? []) as unknown as RawPromotion[])
        .filter((promotion) => isPromotionCurrentlyActive(promotion, now))
        .filter((promotion) => {
          if (surface === 'landing') {
            return promotion.show_on_landing
          }

          if (surface === 'app') {
            return promotion.show_in_app
          }

          return true
        })
        .map((promotion) => ({
          id: promotion.id,
          title: promotion.title,
          description: promotion.description,
          discount_type: promotion.discount_type,
          discount_value: promotion.discount_value,
          valid_from: promotion.valid_from,
          valid_until: promotion.valid_until,
          show_on_landing: promotion.show_on_landing,
          show_in_app: promotion.show_in_app,
          display_order: Number(promotion.display_order ?? 0),
        }))

      return promotions
    },
    [`active-promotions-${tenantId}-${surface ?? 'all'}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-promotions`],
    }
  )()
}

export function getLoyaltyConfig(tenantId: string): Promise<PublicLoyaltyConfig | null> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('loyalty_configs')
        .select('id, template, points_per_visit, points_per_euro, streak_threshold_days')
        .eq('tenant_id', tenantId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .maybeSingle()

      if (!data) {
        return null
      }

      const config = data as unknown as PublicLoyaltyConfig
      return {
        id: config.id,
        template: config.template,
        points_per_visit: config.points_per_visit,
        points_per_euro: config.points_per_euro,
        streak_threshold_days: config.streak_threshold_days,
      }
    },
    [`loyalty-config-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-loyalty`],
    }
  )()
}

export function getActiveRewards(tenantId: string): Promise<PublicReward[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('rewards')
        .select('id, name, description, points_cost, reward_type, display_order')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      return ((data ?? []) as unknown as PublicReward[]).map((reward) => ({
        id: reward.id,
        name: reward.name,
        description: reward.description,
        points_cost: Number(reward.points_cost ?? 0),
        reward_type: reward.reward_type,
        display_order: Number(reward.display_order ?? 0),
      }))
    },
    [`active-rewards-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-rewards`],
    }
  )()
}

export async function getAvailableStaff(
  tenantId: string,
  locationId: string,
  serviceIds: string[]
): Promise<PublicStaffMember[]> {
  const db = createAdminClient()
  const { data: locationRows } = await db
    .from('staff_locations')
    .select('staff_id')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)

  const locationStaffIds = ((locationRows ?? []) as Array<{ staff_id: string }>).map((row) => row.staff_id)

  if (locationStaffIds.length === 0) {
    return []
  }

  let qualifiedIds = new Set(locationStaffIds)

  if (serviceIds.length > 0) {
    const { data: staffServiceRows } = await db
      .from('staff_services')
      .select('staff_id, service_id')
      .eq('tenant_id', tenantId)
      .in('staff_id', locationStaffIds)
      .in('service_id', serviceIds)

    const counts = new Map<string, Set<string>>()
    for (const row of (staffServiceRows ?? []) as Array<{ staff_id: string; service_id: string }>) {
      const current = counts.get(row.staff_id) ?? new Set<string>()
      current.add(row.service_id)
      counts.set(row.staff_id, current)
    }

    qualifiedIds = new Set(
      locationStaffIds.filter((staffId) => counts.get(staffId)?.size === serviceIds.length)
    )
  }

  if (qualifiedIds.size === 0) {
    return []
  }

  const { data: staffRows } = await db
    .from('staff_members')
    .select('id, bio, photo_url, profile:profiles(full_name)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('id', Array.from(qualifiedIds))

  return ((staffRows ?? []) as unknown as RawPublicStaffMember[])
    .map((member) => ({
      id: member.id,
      full_name: readProfileFullName(member.profile),
      bio: member.bio,
      photo_url: member.photo_url,
    }))
    .sort((left, right) => (left.full_name ?? '').localeCompare(right.full_name ?? '', 'it'))
}

export async function getPublicStaffMemberById(
  tenantId: string,
  staffId: string
): Promise<PublicStaffMember | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('staff_members')
    .select('id, bio, photo_url, profile:profiles(full_name, avatar_url)')
    .eq('tenant_id', tenantId)
    .eq('id', staffId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!data) {
    return null
  }

  const member = data as unknown as {
    id: string
    bio: string | null
    photo_url: string | null
    profile: RawProfileWithAvatar
  }
  const profileData = readProfileWithAvatar(member.profile)
  return {
    id: member.id,
    full_name: profileData.full_name,
    bio: member.bio,
    photo_url: profileData.avatar_url ?? member.photo_url,
  }
}

export function getTenantTimezone(tenantId: string): Promise<string> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('tenants')
        .select('timezone')
        .eq('id', tenantId)
        .maybeSingle()

      return (data as { timezone?: string } | null)?.timezone ?? 'Europe/Rome'
    },
    [`tenant-timezone-${tenantId}`],
    {
      revalidate: 300,
      tags: [`tenant-${tenantId}`],
    }
  )()
}

export async function getAppointmentSummary(
  appointmentId: string
): Promise<PublicAppointmentSummary | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('appointments')
    .select(
      'id, tenant_id, staff_id, location_id, start_time, end_time, status, notes, client:clients(full_name, phone, email), location:locations(name, address, city, phone), staff:staff_members(photo_url, profile:profiles(full_name)), appointment_services(price_at_booking, services(id, name))'
    )
    .eq('id', appointmentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!data) {
    return null
  }

  const appointment = data as unknown as RawAppointmentSummary
  return {
    id: appointment.id,
    tenant_id: appointment.tenant_id,
    staff_id: appointment.staff_id,
    location_id: appointment.location_id,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    status: appointment.status,
    notes: appointment.notes,
    client_name: appointment.client?.full_name ?? null,
    client_phone: appointment.client?.phone ?? null,
    client_email: appointment.client?.email ?? null,
    staff_name: readProfileFullName(appointment.staff?.profile ?? null),
    staff_photo_url: appointment.staff?.photo_url ?? null,
    location_name: appointment.location?.name ?? null,
    location_address: appointment.location?.address ?? null,
    location_city: appointment.location?.city ?? null,
    location_phone: appointment.location?.phone ?? null,
    services: (appointment.appointment_services ?? [])
      .filter((item) => item.services !== null)
      .map((item) => ({
        id: item.services!.id,
        name: item.services!.name,
        price_at_booking: Number(item.price_at_booking ?? 0),
      })),
  }
}

export async function getStaffForBooking(
  tenantId: string,
  locationId: string | null
): Promise<{ staff: StaffForBooking[]; autoSelected: boolean }> {
  const db = createAdminClient()

  let targetStaffIds: string[] | null = null

  if (locationId) {
    const { data: locationRows } = await db
      .from('staff_locations')
      .select('staff_id')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)

    targetStaffIds = ((locationRows ?? []) as Array<{ staff_id: string }>).map((row) => row.staff_id)

    if (targetStaffIds.length === 0) {
      return { staff: [], autoSelected: false }
    }
  }

  let staffQuery = db
    .from('staff_members')
    .select('id, photo_url, profile:profiles(full_name, avatar_url)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (targetStaffIds !== null) {
    staffQuery = staffQuery.in('id', targetStaffIds)
  }

  const { data: staffRows } = await staffQuery
  const typedStaff = ((staffRows ?? []) as unknown as RawStaffForBooking[])

  if (typedStaff.length === 0) {
    return { staff: [], autoSelected: false }
  }

  const memberIds = typedStaff.map((m) => m.id)

  const { data: ssRows } = await db
    .from('staff_services')
    .select('staff_id, services(id, name, price, duration_minutes, display_order, is_active)')
    .eq('tenant_id', tenantId)
    .in('staff_id', memberIds)

  const servicesByStaff = new Map<
    string,
    Array<{ id: string; name: string; price: number; duration_minutes: number; display_order: number }>
  >()

  for (const row of ((ssRows ?? []) as unknown as RawStaffServiceRow[])) {
    if (!row.services || !row.services.is_active) continue
    const list = servicesByStaff.get(row.staff_id) ?? []
    list.push({
      id: row.services.id,
      name: row.services.name,
      price: Number(row.services.price ?? 0),
      duration_minutes: Number(row.services.duration_minutes ?? 0),
      display_order: Number(row.services.display_order ?? 0),
    })
    servicesByStaff.set(row.staff_id, list)
  }

  const staff: StaffForBooking[] = typedStaff
    .map((member) => {
      const profile = readProfileWithAvatar(member.profile)
      const services = (servicesByStaff.get(member.id) ?? [])
        .sort((a, b) => a.display_order - b.display_order)
        .map(({ id, name, price, duration_minutes }) => ({ id, name, price, duration_minutes }))
      return {
        id: member.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url ?? member.photo_url,
        services,
      }
    })
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', 'it'))

  return { staff, autoSelected: staff.length === 1 }
}

export async function getServicesForStaff(
  tenantId: string,
  staffId: string
): Promise<{ services: ServiceForStaff[] }> {
  const db = createAdminClient()

  if (staffId === 'any') {
    const { data } = await db
      .from('services')
      .select('id, name, price, duration_minutes, category, display_order')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    const services: ServiceForStaff[] = ((data ?? []) as unknown as Array<{
      id: string
      name: string
      price: number | null
      duration_minutes: number | null
      category: string | null
      display_order: number | null
    }>).map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price ?? 0),
      duration_minutes: Number(s.duration_minutes ?? 30),
      category: s.category ?? null,
    }))

    return { services }
  }

  const { data: ssRows } = await db
    .from('staff_services')
    .select('service_id')
    .eq('tenant_id', tenantId)
    .eq('staff_id', staffId)

  const serviceIds = ((ssRows ?? []) as Array<{ service_id: string }>).map((r) => r.service_id)

  if (serviceIds.length === 0) {
    console.warn(
      `[getServicesForStaff] ATTENZIONE: nessun servizio in staff_services per staffId=${staffId}. Verifica che staff_services sia popolata.`
    )
    return { services: [] }
  }

  const { data } = await db
    .from('services')
    .select('id, name, price, duration_minutes, category, display_order')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('id', serviceIds)
    .order('display_order', { ascending: true })

  const services: ServiceForStaff[] = ((data ?? []) as unknown as Array<{
    id: string
    name: string
    price: number | string
    duration_minutes: number | string
    category: string | null
  }>).map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price ?? 0),
    duration_minutes: Number(s.duration_minutes ?? 0),
    category: s.category,
  }))

  return { services }
}

export interface UpsellProduct {
  id: string
  name: string
  brand: string | null
  price_sell: number
  photo_url: string | null
  category: string | null
  description: string | null
  is_new: boolean
  is_favourite: boolean
  available: boolean
}

export async function getUpsellProducts(params: {
  tenantId: string
  locationId: string
  serviceCategories: string[]
  clientId?: string
  limit?: number
}): Promise<UpsellProduct[]> {
  const { tenantId, locationId, serviceCategories, clientId, limit = 6 } = params
  const db = createAdminClient()

  // Single query with priority ordering via raw SQL executed through rpc or
  // via JS-side merge of two small queries — no N+1.
  // We run two parallel lookups (wishlist + inventory) and merge in JS.
  const [productRes, inventoryRes, wishlistRes] = await Promise.all([
    db
      .from('products')
      .select('id, name, brand, price_sell, photo_url, category, description, display_order, is_new')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('show_on_site', true)
      .order('display_order', { ascending: true })
      .limit(30),
    db
      .from('product_inventory')
      .select('product_id, quantity')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId),
    clientId
      ? db
          .from('client_product_wishlist')
          .select('product_id')
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
      : Promise.resolve({ data: [] as Array<{ product_id: string }> }),
  ])

  if (!productRes.data?.length) return []

  const inventoryMap = new Map<string, number>()
  for (const row of (inventoryRes.data ?? []) as Array<{ product_id: string; quantity: number }>) {
    inventoryMap.set(row.product_id, (inventoryMap.get(row.product_id) ?? 0) + row.quantity)
  }

  const wishlistSet = new Set(
    ((wishlistRes as { data: Array<{ product_id: string }> | null }).data ?? []).map(
      (r) => r.product_id,
    ),
  )

  const categorySet = new Set(serviceCategories)

  type RawProduct = {
    id: string
    name: string
    brand: string | null
    price_sell: number
    photo_url: string | null
    category: string | null
    description: string | null
    display_order: number
    is_new: boolean
  }

  const products = (productRes.data as unknown as RawProduct[]).map((p) => ({
    ...p,
    is_favourite: wishlistSet.has(p.id),
    available: (inventoryMap.get(p.id) ?? 0) > 0,
    price_sell: Number(p.price_sell ?? 0),
  }))

  // Priority: wishlist=1, category match=2, fallback=3
  function priority(p: (typeof products)[0]): number {
    if (p.is_favourite) return 1
    if (p.category && categorySet.has(p.category)) return 2
    return 3
  }

  return products
    .sort((a, b) => priority(a) - priority(b) || a.display_order - b.display_order)
    .slice(0, limit)
    .map(({ display_order: _d, ...rest }) => rest)
}

export function getPublicProducts(tenantId: string): Promise<PublicProduct[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('products')
        .select(
          'id, name, brand, price_sell, photo_url, category, description, display_order, product_inventory(quantity, locations(name))',
        )
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('show_on_site', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      return ((data ?? []) as unknown[]).map((row) => {
        const p = row as Record<string, unknown>
        const invRaw = p.product_inventory
        const inventory: Array<{ locationName: string; quantity: number }> = Array.isArray(invRaw)
          ? invRaw.map((invRow: unknown) => {
              const inv = invRow as Record<string, unknown>
              const loc = inv.locations as Record<string, unknown> | null
              return {
                locationName: typeof loc?.name === 'string' ? loc.name : 'Sede',
                quantity: Number(inv.quantity ?? 0),
              }
            })
          : []

        return {
          id: p.id as string,
          name: p.name as string,
          brand: (p.brand as string | null) ?? null,
          price_sell: Number(p.price_sell ?? 0),
          photo_url: (p.photo_url as string | null) ?? null,
          category: (p.category as string | null) ?? null,
          description: (p.description as string | null) ?? null,
          display_order: Number(p.display_order ?? 0),
          inventory,
        }
      })
    },
    [`public-products-${tenantId}`],
    {
      revalidate: 120,
      tags: [`tenant-${tenantId}-products`],
    }
  )()
}
