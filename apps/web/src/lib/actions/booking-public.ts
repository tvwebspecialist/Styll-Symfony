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

export async function getPublicStaffByLocation(
  tenantId: string,
  locationId: string
): Promise<PublicBookingStaffMember[]> {
  const db = createAdminClient()

  const { data: locationRows } = await db
    .from('staff_locations')
    .select('staff_id')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)

  const staffIds = ((locationRows ?? []) as Array<{ staff_id: string }>).map((row) => row.staff_id)

  if (staffIds.length === 0) {
    return [firstAvailableEntry()]
  }

  const { data: staffRows } = await db
    .from('staff_members')
    .select('id, bio, photo_url, role, profile:profiles(full_name, avatar_url)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('id', staffIds)
    .neq('role', 'receptionist')

  const members = (staffRows ?? []) as unknown as RawStaffRow[]

  if (members.length === 0) {
    return [firstAvailableEntry()]
  }

  const memberIds = members.map((member) => member.id)

  const { data: staffServiceRows } = await db
    .from('staff_services')
    .select('staff_id, service_id')
    .eq('tenant_id', tenantId)
    .in('staff_id', memberIds)

  const serviceIds = Array.from(
    new Set(
      ((staffServiceRows ?? []) as Array<{ staff_id: string; service_id: string }>).map(
        (row) => row.service_id
      )
    )
  )

  const { data: activeServiceRows } = serviceIds.length
    ? await db
        .from('services')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('id', serviceIds)
    : { data: [] as Array<{ id: string }> }

  const activeServiceIds = new Set(
    ((activeServiceRows ?? []) as Array<{ id: string }>).map((service) => service.id)
  )

  const serviceCountMap = new Map<string, number>()
  for (const row of (staffServiceRows ?? []) as Array<{ staff_id: string; service_id: string }>) {
    if (!activeServiceIds.has(row.service_id)) {
      continue
    }

    serviceCountMap.set(row.staff_id, (serviceCountMap.get(row.staff_id) ?? 0) + 1)
  }

  const todayDate = new Date().toISOString().slice(0, 10)
  const dayOfWeek = new Date(`${todayDate}T12:00:00Z`).getUTCDay()

  const { data: workingHoursRows } = await db
    .from('working_hours')
    .select('staff_id, start_time')
    .eq('tenant_id', tenantId)
    .in('staff_id', memberIds)
    .eq('day_of_week', dayOfWeek)
    .order('start_time', { ascending: true })

  const nextAvailableMap = new Map<string, string>()
  for (const row of (workingHoursRows ?? []) as Array<{ staff_id: string; start_time: string }>) {
    if (!nextAvailableMap.has(row.staff_id)) {
      nextAvailableMap.set(row.staff_id, `${todayDate}T${row.start_time}`)
    }
  }

  const staff: PublicBookingStaffMember[] = members
    .sort((left, right) => {
      const leftName = readProfile(left.profile).full_name ?? ''
      const rightName = readProfile(right.profile).full_name ?? ''
      return leftName.localeCompare(rightName, 'it')
    })
    .map((member) => {
      const profile = readProfile(member.profile)
      return {
        id: member.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url ?? member.photo_url,
        role: member.role,
        bio: member.bio,
        service_count: serviceCountMap.get(member.id) ?? 0,
        next_available: nextAvailableMap.get(member.id) ?? null,
      }
    })

  return [firstAvailableEntry(), ...staff]
}
