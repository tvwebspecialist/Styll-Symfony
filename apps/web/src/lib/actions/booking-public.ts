'use server'

import { unstable_cache } from 'next/cache'
import type {
  PublicBookingLocation,
  PublicBookingStaffMember,
  PublicBookingTenant,
} from '@/components/pwa/booking/types'
import { createAdminClient } from '@/lib/supabase/admin'

type RawStaffRow = {
  id: string
  bio: string | null
  photo_url: string | null
  role: string
  profile:
    | { full_name: string | null; avatar_url: string | null }
    | Array<{ full_name: string | null; avatar_url: string | null }>
    | null
}

type RawLocationScopedStaffRow = {
  id: string
  bio: string | null
  photo_url: string | null
  role: string
  profile:
    | { full_name: string | null; avatar_url: string | null }
    | Array<{ full_name: string | null; avatar_url: string | null }>
    | null
}

type RawLocationScopedServiceRow = {
  staff_id: string
  services: {
    id: string
    name: string
    price: number | string | null
    duration_minutes: number | string | null
    category: string | null
    display_order: number | string | null
    is_active: boolean | null
  } | null
}

type RawLocationScopedWorkingHourRow = {
  staff_id: string
  start_time: string
}

export type LocationScopedBookingService = {
  id: string
  name: string
  price: number
  duration_minutes: number
  category: string | null
  display_order: number
}

export type LocationScopedBookingStaffSnapshot = {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string
  bio: string | null
  next_available: string | null
  services: LocationScopedBookingService[]
}

function readProfile(
  profile: RawStaffRow['profile']
): { full_name: string | null; avatar_url: string | null } {
  if (Array.isArray(profile)) {
    return profile[0] ?? { full_name: null, avatar_url: null }
  }

  return profile ?? { full_name: null, avatar_url: null }
}

function firstAvailableEntry(): PublicBookingStaffMember {
  return {
    id: 'any',
    full_name: 'Primo disponibile',
    avatar_url: null,
    role: 'any',
    bio: 'Verrà assegnato il barbiere con il primo slot libero',
    service_count: 0,
    next_available: null,
  }
}

export async function loadLocationScopedBookingStaffSnapshot(
  tenantId: string,
  locationId: string,
): Promise<LocationScopedBookingStaffSnapshot[]> {
  const db = createAdminClient()
  const todayDate = new Date().toISOString().slice(0, 10)
  const dayOfWeek = new Date(`${todayDate}T12:00:00Z`).getUTCDay()

  const { data: staffRows } = await db
    .from('staff_members')
    .select(
      'id, bio, photo_url, role, profile:profiles(full_name, avatar_url), staff_locations!inner(location_id)',
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .neq('role', 'receptionist')
    .eq('staff_locations.location_id', locationId)

  const members = (staffRows ?? []) as RawLocationScopedStaffRow[]
  if (members.length === 0) {
    return []
  }

  const memberIds = members.map((member) => member.id)
  const [{ data: staffServiceRows }, { data: workingHoursRows }] = await Promise.all([
    db
      .from('staff_services')
      .select(
        'staff_id, services(id, name, price, duration_minutes, category, display_order, is_active)',
      )
      .eq('tenant_id', tenantId)
      .in('staff_id', memberIds),
    db
      .from('working_hours')
      .select('staff_id, start_time')
      .eq('tenant_id', tenantId)
      .eq('day_of_week', dayOfWeek)
      .in('staff_id', memberIds)
      .order('start_time', { ascending: true }),
  ])

  const servicesByStaff = new Map<string, LocationScopedBookingService[]>()
  for (const row of (staffServiceRows ?? []) as RawLocationScopedServiceRow[]) {
    if (!row.services || row.services.is_active !== true) {
      continue
    }

    const current = servicesByStaff.get(row.staff_id) ?? []
    current.push({
      id: row.services.id,
      name: row.services.name,
      price: Number(row.services.price ?? 0),
      duration_minutes: Number(row.services.duration_minutes ?? 0),
      category: row.services.category,
      display_order: Number(row.services.display_order ?? 0),
    })
    servicesByStaff.set(row.staff_id, current)
  }

  const nextAvailableByStaff = new Map<string, string>()
  for (const row of (workingHoursRows ?? []) as RawLocationScopedWorkingHourRow[]) {
    if (!nextAvailableByStaff.has(row.staff_id)) {
      nextAvailableByStaff.set(row.staff_id, `${todayDate}T${row.start_time}`)
    }
  }

  return members
    .map((member) => {
      const profile = readProfile(member.profile)
      const services = (servicesByStaff.get(member.id) ?? [])
        .sort((left, right) =>
          left.display_order === right.display_order
            ? left.name.localeCompare(right.name, 'it')
            : left.display_order - right.display_order,
        )

      return {
        id: member.id,
        full_name: profile.full_name,
        avatar_url: member.photo_url || profile.avatar_url || null,
        role: member.role,
        bio: member.bio,
        next_available: nextAvailableByStaff.get(member.id) ?? null,
        services,
      }
    })
    .sort((left, right) => (left.full_name ?? '').localeCompare(right.full_name ?? '', 'it'))
}

export async function getLocationScopedBookingStaffSnapshot(
  tenantId: string,
  locationId: string,
): Promise<LocationScopedBookingStaffSnapshot[]> {
  return unstable_cache(
    async () => loadLocationScopedBookingStaffSnapshot(tenantId, locationId),
    [`location-booking-staff-${tenantId}-${locationId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-staff`, `tenant-${tenantId}-locations`, 'public-staff', 'staff-locations'],
    },
  )()
}

export async function getPublicTenantBySlug(slug: string): Promise<PublicBookingTenant | null> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data, error } = await db
        .from('tenants')
        .select('id, business_name, primary_color, secondary_color, logo_url, font_family, status, settings')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle()

      if (error || !data) {
        return null
      }

      return {
        id: data.id as string,
        business_name: data.business_name as string,
        primary_color: (data.primary_color as string | null) ?? '#1a1a1a',
        secondary_color: (data.secondary_color as string | null) ?? '#c9a96e',
        logo_url: (data.logo_url as string | null) ?? null,
        font_family: (data.font_family as string | null) ?? null,
        settings: (data.settings as Record<string, unknown> | null) ?? null,
      }
    },
    [`tenant-slug-${slug}`],
    {
      revalidate: 60,
      tags: [`tenant-${slug}`],
    }
  )()
}

export async function getPublicBookingLocations(tenantId: string): Promise<PublicBookingLocation[]> {
  return unstable_cache(
    async () => {
      const db = createAdminClient()
      const { data } = await db
        .from('locations')
        .select('id, name, address, city, phone, photos')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      return ((data ?? []) as Array<{
        id: string
        name: string
        address: string | null
        city: string | null
        phone: string | null
        photos: string[]
      }>).map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        phone: location.phone,
        cover_image_url: location.photos?.[0] ?? null,
      }))
    },
    [`booking-locations-${tenantId}`],
    {
      revalidate: 60,
      tags: [`tenant-${tenantId}-locations`],
    }
  )()
}

async function getPublicStaffByLocationImpl(
  tenantId: string,
  locationId: string
): Promise<PublicBookingStaffMember[]> {
  const staffSnapshot = await getLocationScopedBookingStaffSnapshot(tenantId, locationId)

  if (staffSnapshot.length === 0) {
    return [firstAvailableEntry()]
  }

  const staff: PublicBookingStaffMember[] = staffSnapshot
    .map((member) => ({
      id: member.id,
      full_name: member.full_name,
      avatar_url: member.avatar_url,
      role: member.role,
      bio: member.bio,
      service_count: member.services.length,
      next_available: member.next_available,
    }))

  return [firstAvailableEntry(), ...staff]
}

export const getPublicStaffByLocation = unstable_cache(
  getPublicStaffByLocationImpl,
  ['public-staff-by-location'],
  {
    revalidate: 60,
    tags: ['public-staff', 'staff-locations'],
  }
)
