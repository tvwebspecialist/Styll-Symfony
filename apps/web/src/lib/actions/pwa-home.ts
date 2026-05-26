'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types'

export type HomeStaffMember = { id: string; fullName: string | null; avatarUrl: string | null }
export type HomeNextAppointment = { id: string; startTime: string; endTime: string; serviceNames: string[] }
export type HomeLoyalty = {
  availablePoints: number
  totalPoints: number
  currentStreak: number
  longestStreak: number
  lastVisitDate: string | null
}
export type HomeReward = { id: string; name: string; pointsCost: number; rewardType: string }
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
}

type StaffWithProfile = Pick<Tables<'staff_members'>, 'id' | 'photo_url'> & {
  profiles: any
}

type ClientRow = Pick<Tables<'clients'>, 'id' | 'full_name'>

type RawAppointment = Pick<Tables<'appointments'>, 'id' | 'start_time' | 'end_time'> & {
  appointment_services: any[] | null
}

function readRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

function extractServiceNames(appointmentServices: any[]): string[] {
  return (appointmentServices ?? [])
    .map((as: any) => {
      const svc = Array.isArray(as.services) ? as.services[0] : as.services
      return svc?.name ?? ''
    })
    .filter(Boolean)
}

export async function getHomePageData(tenantId: string): Promise<HomePageData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const db = createAdminClient()
  const { data: rawStaffMembers, count } = await db
    .from('staff_members')
    .select('id, photo_url, profiles(full_name, avatar_url)', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(10)

  const staffMembers: HomeStaffMember[] = ((rawStaffMembers as StaffWithProfile[] | null) ?? []).map((member) => {
    const profile = readRelation(member.profiles as any)
    return {
      id: member.id,
      fullName: profile?.full_name ?? null,
      avatarUrl: member.photo_url || profile?.avatar_url || null,
    }
  })

  const staffCount = count ?? staffMembers.length

  if (!user) {
    return { isLoggedIn: false, staffMembers, staffCount }
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
        .select('id, start_time, end_time, appointment_services(services(name))')
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
        .select('id, start_time, end_time, appointment_services(services(name))')
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
  }
}
