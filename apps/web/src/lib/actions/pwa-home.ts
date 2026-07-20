'use server'
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types'
import type { Database } from '@/types/database.types'

export type HomeStaffMember = { id: string; fullName: string | null; avatarUrl: string | null }
export type HomeNextAppointment = {
  id: string
  startTime: string
  endTime: string
  serviceNames: string[]
  locationAddress: string | null
  locationCity: string | null
  staffName: string | null
}
export type HomeLoyalty = {
  availablePoints: number
  totalPoints: number
  currentStreak: number
  longestStreak: number
  lastVisitDate: string | null
}
export type HomeReward = { id: string; name: string; pointsCost: number; rewardType: string }
export type HomeProduct = {
  id: string
  name: string
  brand: string | null
  photo_url: string | null
  price_sell: number
}
export type HomeService = {
  id: string
  name: string
  price: number
  duration_minutes: number
}

export type HomePageData = {
  isLoggedIn: boolean
  staffMembers: HomeStaffMember[]
  staffCount: number
  clientName?: string | null
  clientId?: string | null
  nextAppointment?: HomeNextAppointment | null
  loyalty?: HomeLoyalty | null
  activeRewards?: HomeReward[]
  loyaltyConfig?: {
    template: string | null
    pointsPerVisit: number | null
    streakThresholdDays: number | null
  } | null
  lastAppointmentServiceNames?: string[]
  lastAppointmentServiceIds?: string[]
  lastAppointmentStaffName?: string | null
  lastAppointmentStaffAvatarUrl?: string | null
  lastAppointmentStaffId?: string | null
  lastAppointmentLocationId?: string | null
  lastAppointmentDuration?: number | null
  lastAppointmentPrice?: number | null
  lastAppointmentStaffIsActive?: boolean
  lastAppointmentServicesAllActive?: boolean
  nextAppointmentIsImminent?: boolean
  nextAppointmentIsToday?: boolean
  products?: HomeProduct[]
  services?: HomeService[]
}

type StaffWithProfile = Pick<Tables<'staff_members'>, 'id' | 'photo_url'> & {
  profiles: any
}

type ClientRow = Pick<Tables<'clients'>, 'id' | 'full_name'>
type HomeProductRow = Pick<Tables<'products'>, 'id' | 'name' | 'brand' | 'photo_url' | 'price_sell'>
type ProductInventoryRow = Pick<Tables<'product_inventory'>, 'product_id' | 'quantity'>

type RawAppointment = Pick<Tables<'appointments'>, 'id' | 'start_time' | 'end_time'> & {
  staff_id?: string | null
  location_id?: string | null
  appointment_services: any[] | null
  locations: any | null
  staff_members: any | null
}

function readRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

const getCachedStaffMembers = unstable_cache(
  async (tenantId: string) => {
    const db = createAdminClient()
    const { data: rawStaffMembers, count } = await db
      .from('staff_members')
      .select('id, photo_url, profiles(full_name, avatar_url)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(10)
    return { rawStaffMembers: rawStaffMembers ?? [], count: count ?? 0 }
  },
  ['pwa-home-staff'],
  {
    revalidate: 60,
    tags: ['staff-members'],
  }
)

function extractServiceNames(appointmentServices: any[]): string[] {
  return (appointmentServices ?? [])
    .map((as: any) => {
      const svc = Array.isArray(as.services) ? as.services[0] : as.services
      return svc?.name ?? ''
    })
    .filter(Boolean)
}

function extractServiceDuration(appointmentServices: any[]): number | null {
  const total = (appointmentServices ?? []).reduce((sum: number, as: any) => {
    const svc = Array.isArray(as.services) ? as.services[0] : as.services
    return sum + (svc?.duration_minutes ?? 0)
  }, 0)
  return total > 0 ? total : null
}

function extractServicePrice(appointmentServices: any[]): number | null {
  const total = (appointmentServices ?? []).reduce((sum: number, as: any) => {
    return sum + (as.price_at_booking ?? 0)
  }, 0)
  return total > 0 ? total : null
}

function extractStaffName(staffRelation: any): string | null {
  const staff = Array.isArray(staffRelation) ? staffRelation[0] : staffRelation
  if (!staff) return null
  const profile = Array.isArray(staff.profiles) ? staff.profiles[0] : staff.profiles
  return profile?.full_name ?? null
}

function extractServiceIds(appointmentServices: any[]): string[] {
  return (appointmentServices ?? []).map((as: any) => as.service_id).filter(Boolean)
}

function extractServicesAllActive(appointmentServices: any[]): boolean {
  if (!appointmentServices?.length) return false
  return appointmentServices.every((as: any) => {
    const svc = Array.isArray(as.services) ? as.services[0] : as.services
    return svc?.is_active === true
  })
}

function extractStaffId(staffRelation: any): string | null {
  const staff = Array.isArray(staffRelation) ? staffRelation[0] : staffRelation
  return (staff?.id as string | null) ?? null
}

function extractStaffIsActive(staffRelation: any): boolean {
  const staff = Array.isArray(staffRelation) ? staffRelation[0] : staffRelation
  return staff?.is_active === true
}

function extractStaffAvatarUrl(staffRelation: any): string | null {
  const staff = Array.isArray(staffRelation) ? staffRelation[0] : staffRelation
  if (!staff) return null
  const profile = Array.isArray(staff.profiles) ? staff.profiles[0] : staff.profiles
  return (staff.photo_url as string | null) ?? (profile?.avatar_url as string | null) ?? null
}

function extractLocationAddress(locationsRelation: any): { address: string | null; city: string | null } {
  const loc = Array.isArray(locationsRelation) ? locationsRelation[0] : locationsRelation
  return { address: loc?.address ?? null, city: loc?.city ?? null }
}

export async function getVisibleHomeProducts(
  db: SupabaseClient<Database>,
  tenantId: string,
): Promise<HomeProduct[]> {
  const { data: rawProducts } = await db
    .from('products')
    .select('id, name, brand, photo_url, price_sell')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('show_on_site', true)
    .order('display_order', { ascending: true })
    .limit(8)

  const visibleProducts = (rawProducts ?? []) as HomeProductRow[]
  const productIds = visibleProducts.map((product) => product.id)

  if (productIds.length === 0) {
    return []
  }

  const { data: inventoryRows } = await db
    .from('product_inventory')
    .select('product_id, quantity')
    .eq('tenant_id', tenantId)
    .in('product_id', productIds)

  const inventoryMap = new Map<string, number>()
  for (const row of (inventoryRows ?? []) as ProductInventoryRow[]) {
    inventoryMap.set(row.product_id, (inventoryMap.get(row.product_id) ?? 0) + row.quantity)
  }

  return visibleProducts
    .filter((product) => (inventoryMap.get(product.id) ?? 0) > 0)
    .map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      photo_url: product.photo_url,
      price_sell: product.price_sell,
    }))
}

export async function getHomePageData(tenantId: string): Promise<HomePageData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const db = createAdminClient()

  // Fetch public data in parallel. Products stay bounded by first selecting the
  // visible slice and then loading inventory only for those product IDs.
  const [{ rawStaffMembers, count }, products, servicesResult] =
    await Promise.all([
      getCachedStaffMembers(tenantId),
      getVisibleHomeProducts(db, tenantId),
      db
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(8),
    ])

  const services: HomeService[] = (
    (servicesResult.data ?? []) as {
      id: string
      name: string
      price: number
      duration_minutes: number
    }[]
  ).map((s) => ({ id: s.id, name: s.name, price: s.price, duration_minutes: s.duration_minutes }))

  const staffMembers: HomeStaffMember[] = ((rawStaffMembers as StaffWithProfile[] | null) ?? []).map(
    (member) => {
      const profile = readRelation(member.profiles as any)
      return {
        id: member.id,
        fullName: profile?.full_name ?? null,
        avatarUrl: member.photo_url || profile?.avatar_url || null,
      }
    }
  )

  const staffCount = count ?? staffMembers.length

  if (!user) {
    return { isLoggedIn: false, staffMembers, staffCount, products, services }
  }

  const clientRes = await db
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  const client = clientRes.data as ClientRow | null

  if (!client) {
    return {
      isLoggedIn: true,
      clientName: (user.user_metadata?.full_name as string | undefined) ?? null,
      clientId: null,
      staffMembers,
      staffCount,
      products,
      services,
    }
  }

  const now = new Date().toISOString()
  const [loyaltyRes, nextAppointmentRes, rewardsRes, loyaltyConfigRes, lastAppointmentRes] =
    await Promise.all([
      db
        .from('client_loyalty')
        .select('available_points, total_points, current_streak, longest_streak, last_visit_date')
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
        .maybeSingle(),
      db
        .from('appointments')
        .select(
          'id, start_time, end_time, appointment_services(services(name)), locations(address, city), staff_members(profiles(full_name))'
        )
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
        .is('deleted_at', null)
        .in('status', ['confirmed', 'pending'])
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle(),
      db
        .from('rewards')
        .select('id, name, points_cost, reward_type')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('points_cost', { ascending: true })
        .limit(3),
      db
        .from('loyalty_configs')
        .select('template, points_per_visit, streak_threshold_days')
        .eq('tenant_id', tenantId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('appointments')
        .select(
          'id, staff_id, location_id, start_time, end_time, appointment_services(service_id, price_at_booking, services(name, duration_minutes, is_active)), staff_members(id, is_active, photo_url, profiles(full_name, avatar_url))'
        )
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
        .is('deleted_at', null)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const nextAppointment = nextAppointmentRes.data as RawAppointment | null
  const lastAppointment = lastAppointmentRes.data as RawAppointment | null

  const nextLoc = nextAppointment
    ? extractLocationAddress(nextAppointment.locations)
    : { address: null, city: null }

  return {
    isLoggedIn: true,
    staffMembers,
    staffCount,
    clientName: client.full_name ?? ((user.user_metadata?.full_name as string | undefined) ?? null),
    clientId: client.id,
    nextAppointment: nextAppointment
      ? {
          id: nextAppointment.id,
          startTime: nextAppointment.start_time,
          endTime: nextAppointment.end_time,
          serviceNames: extractServiceNames(nextAppointment.appointment_services as any[]),
          locationAddress: nextLoc.address,
          locationCity: nextLoc.city,
          staffName: extractStaffName(nextAppointment.staff_members),
        }
      : null,
    loyalty: loyaltyRes.data
      ? {
          availablePoints: loyaltyRes.data.available_points ?? 0,
          totalPoints: loyaltyRes.data.total_points ?? 0,
          currentStreak: loyaltyRes.data.current_streak ?? 0,
          longestStreak: loyaltyRes.data.longest_streak ?? 0,
          lastVisitDate: loyaltyRes.data.last_visit_date ?? null,
        }
      : null,
    activeRewards: (rewardsRes.data ?? []).map((reward) => ({
      id: reward.id,
      name: reward.name,
      pointsCost: reward.points_cost,
      rewardType: reward.reward_type,
    })),
    loyaltyConfig: loyaltyConfigRes.data
      ? {
          template: loyaltyConfigRes.data.template ?? null,
          pointsPerVisit: loyaltyConfigRes.data.points_per_visit ?? null,
          streakThresholdDays: loyaltyConfigRes.data.streak_threshold_days ?? null,
        }
      : null,
    lastAppointmentServiceNames: extractServiceNames(lastAppointment?.appointment_services as any[]),
    lastAppointmentServiceIds: extractServiceIds(lastAppointment?.appointment_services as any[]),
    lastAppointmentStaffName: lastAppointment ? extractStaffName(lastAppointment.staff_members) : null,
    lastAppointmentStaffAvatarUrl: lastAppointment ? extractStaffAvatarUrl(lastAppointment.staff_members) : null,
    lastAppointmentStaffId: lastAppointment ? extractStaffId(lastAppointment.staff_members) : null,
    lastAppointmentLocationId: lastAppointment?.location_id ?? null,
    lastAppointmentDuration: lastAppointment
      ? extractServiceDuration(lastAppointment.appointment_services as any[])
      : null,
    lastAppointmentPrice: lastAppointment
      ? extractServicePrice(lastAppointment.appointment_services as any[])
      : null,
    lastAppointmentStaffIsActive: lastAppointment ? extractStaffIsActive(lastAppointment.staff_members) : false,
    lastAppointmentServicesAllActive: lastAppointment ? extractServicesAllActive(lastAppointment.appointment_services as any[]) : false,
    nextAppointmentIsImminent: nextAppointment
      ? new Date(nextAppointment.start_time).getTime() - Date.now() < 48 * 3600 * 1000
      : false,
    nextAppointmentIsToday: (() => {
      if (!nextAppointment) return false
      const n = new Date()
      const d = new Date(nextAppointment.start_time)
      return (
        d.getFullYear() === n.getFullYear() &&
        d.getMonth() === n.getMonth() &&
        d.getDate() === n.getDate()
      )
    })(),
    products,
    services,
  }
}
