'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { getLocalMinutes } from '@/lib/utils/timezone'
import { DASHBOARD_HOURS, DEFAULT_TIMEZONE } from '@/lib/constants'

export interface TodayAppointment {
  id: string
  start_time: string
  end_time: string
  status: string
  client_id: string
  client_name: string
  service_names: string[]
  total_price: number
}

export interface WeekSlot {
  date: string  // YYYY-MM-DD
  hour: number  // 8-19
  is_booked: boolean
}

export interface WeekStats {
  revenue: number
  revenue_prev: number
  client_count: number
  client_count_prev: number
}

export interface AtRiskClient {
  client_id: string
  full_name: string | null
  days_since: number
  avg_frequency: number | null
  churn_status: 'red' | 'yellow'
}

export interface TopLoyaltyClient {
  clientId: string
  fullName: string
  totalPoints: number
  currentStreak: number
  currentTier: string
}

export interface YesterdayStats {
  appointment_count: number
  revenue: number
}

export interface WorkingHour {
  day_of_week: number   // 0=Dom … 6=Sab
  start_time: string    // "HH:MM:SS"
  end_time: string      // "HH:MM:SS"
}

export interface DashboardHomeData {
  staffName: string | null
  todayAppointments: TodayAppointment[]
  weekAppointments: TodayAppointment[]
  weekSlots: WeekSlot[]
  weekStats: WeekStats
  yesterdayStats: YesterdayStats
  atRiskClients: AtRiskClient[]
  topLoyaltyClients: TopLoyaltyClient[]
  workingHours: WorkingHour[]
}

export async function getDashboardHomeData(): Promise<DashboardHomeData> {
  const tenantId = await getActiveTenantId()
  const empty: DashboardHomeData = {
    staffName: null,
    todayAppointments: [],
    weekAppointments: [],
    weekSlots: [],
    weekStats: { revenue: 0, revenue_prev: 0, client_count: 0, client_count_prev: 0 },
    yesterdayStats: { appointment_count: 0, revenue: 0 },
    atRiskClients: [],
    topLoyaltyClients: [],
    workingHours: [],
  }
  if (!tenantId) return empty

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient()

  // Date helpers (UTC-safe: use local day boundaries via date strings)
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)

  // Week boundaries (Mon–Sun of current week)
  const dow = now.getDay() // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const weekMonday = new Date(now.getTime() - daysFromMon * 86400000)
  const weekMondayStr = weekMonday.toISOString().slice(0, 10)
  const weekSundayStr = new Date(weekMonday.getTime() + 6 * 86400000).toISOString().slice(0, 10)

  // Previous week boundaries
  const prevMonStr = new Date(weekMonday.getTime() - 7 * 86400000).toISOString().slice(0, 10)
  const prevSunStr = new Date(weekMonday.getTime() - 1).toISOString().slice(0, 10)

  const [staffRes, todayRes, weekRes, prevWeekRes, atRiskRes, yesterdayRes] = await Promise.all([
    // Staff name
    user
      ? db
          .from('staff_members')
          .select('id, profiles(full_name)')
          .eq('tenant_id', tenantId)
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Today's appointments
    db
      .from('appointments')
      .select(`
        id, start_time, end_time, status, client_id,
        clients(full_name),
        appointment_services(price_at_booking, services(name))
      `)
      .eq('tenant_id', tenantId)
      .gte('start_time', `${todayStr}T00:00:00`)
      .lt('start_time', `${tomorrowStr}T00:00:00`)
      .not('status', 'eq', 'cancelled')
      .order('start_time', { ascending: true }),

    // This week's appointments for heatmap + mini calendar
    db
      .from('appointments')
      .select('id, start_time, end_time, status, client_id, clients(full_name), appointment_services(price_at_booking, services(name))')
      .eq('tenant_id', tenantId)
      .gte('start_time', `${weekMondayStr}T00:00:00`)
      .lte('start_time', `${weekSundayStr}T23:59:59`)
      .not('status', 'eq', 'cancelled')
      .order('start_time', { ascending: true }),

    // Previous week for stats
    db
      .from('appointments')
      .select('client_id, appointment_services(price_at_booking)')
      .eq('tenant_id', tenantId)
      .gte('start_time', `${prevMonStr}T00:00:00`)
      .lte('start_time', `${prevSunStr}T23:59:59`)
      .eq('status', 'completed'),

    // At-risk clients
    db
      .from('client_analytics')
      .select(`
        client_id, churn_status, days_since_last_visit, avg_frequency_days,
        clients(full_name)
      `)
      .eq('tenant_id', tenantId)
      .in('churn_status', ['yellow', 'red'])
      .order('days_since_last_visit', { ascending: false })
      .limit(10),

    // Yesterday's appointments (for KPI trend)
    db
      .from('appointments')
      .select('client_id, appointment_services(price_at_booking)')
      .eq('tenant_id', tenantId)
      .gte('start_time', `${yesterdayStr}T00:00:00`)
      .lt('start_time', `${todayStr}T00:00:00`)
      .not('status', 'eq', 'cancelled'),
  ])

  // Staff name + id
  const staffProfile = (staffRes.data as any)?.profiles ?? null
  const staffName: string | null = staffProfile?.full_name ?? null
  const staffMemberId: string | null = (staffRes.data as any)?.id ?? null

  // Working hours (all days of week for this staff member)
  let workingHours: WorkingHour[] = []
  if (staffMemberId) {
    const { data: whData } = await db
      .from('working_hours')
      .select('day_of_week, start_time, end_time')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffMemberId)
    workingHours = (whData ?? []).map((row: any) => ({
      day_of_week: row.day_of_week as number,
      start_time: row.start_time as string,
      end_time: row.end_time as string,
    }))
  }

  // Today appointments
  const todayAppointments: TodayAppointment[] = (todayRes.data ?? []).map((appt: any) => {
    const services: any[] = appt.appointment_services ?? []
    const serviceNames = services.map((s: any) => s.services?.name ?? '').filter(Boolean)
    const totalPrice = services.reduce((sum: number, s: any) => sum + (s.price_at_booking ?? 0), 0)
    return {
      id: appt.id,
      start_time: appt.start_time,
      end_time: appt.end_time,
      status: appt.status,
      client_id: appt.client_id,
      client_name: appt.clients?.full_name ?? 'Cliente',
      service_names: serviceNames,
      total_price: totalPrice,
    }
  })

  // Week heatmap slots
  const weekSlots: WeekSlot[] = []
  const bookedSet = new Set<string>()
  for (const appt of weekRes.data ?? []) {
    const d = (appt as any).start_time?.slice(0, 10)
    const h = Math.floor(getLocalMinutes((appt as any).start_time, DEFAULT_TIMEZONE) / 60)
    if (d && h >= DASHBOARD_HOURS.SLOT_START && h <= DASHBOARD_HOURS.SLOT_END) bookedSet.add(`${d}:${h}`)
  }
  for (let d = 0; d < 6; d++) {
    const date = new Date(weekMonday.getTime() + d * 86400000)
    const dateStr = date.toISOString().slice(0, 10)
    for (let h = DASHBOARD_HOURS.RANGE_START; h <= DASHBOARD_HOURS.RANGE_END; h++) {
      weekSlots.push({ date: dateStr, hour: h, is_booked: bookedSet.has(`${dateStr}:${h}`) })
    }
  }

  const weekRevenue = (weekRes.data ?? []).reduce((sum: number, appt: any) => {
    const svcs: any[] = appt.appointment_services ?? []
    return sum + svcs.reduce((s: number, sv: any) => s + (sv.price_at_booking ?? 0), 0)
  }, 0)
  const weekClientIds = new Set((weekRes.data ?? []).map((a: any) => (a as any).client_id).filter(Boolean))

  const prevRevenue = (prevWeekRes.data ?? []).reduce((sum: number, appt: any) => {
    const svcs: any[] = appt.appointment_services ?? []
    return sum + svcs.reduce((s: number, sv: any) => s + (sv.price_at_booking ?? 0), 0)
  }, 0)
  const prevClientIds = new Set((prevWeekRes.data ?? []).map((a: any) => (a as any).client_id).filter(Boolean))

  const weekStats: WeekStats = {
    revenue: weekRevenue,
    revenue_prev: prevRevenue,
    client_count: weekClientIds.size,
    client_count_prev: prevClientIds.size,
  }

  // Week appointments for mini calendar
  const weekAppointments: TodayAppointment[] = (weekRes.data ?? []).map((appt: any) => {
    const services: any[] = appt.appointment_services ?? []
    const serviceNames = services.map((s: any) => s.services?.name ?? '').filter(Boolean)
    const totalPrice = services.reduce((sum: number, s: any) => sum + (s.price_at_booking ?? 0), 0)
    return {
      id: appt.id,
      start_time: appt.start_time,
      end_time: appt.end_time ?? appt.start_time,
      status: appt.status,
      client_id: appt.client_id,
      client_name: appt.clients?.full_name ?? 'Cliente',
      service_names: serviceNames,
      total_price: totalPrice,
    }
  })

  // Yesterday stats (for KPI trend)
  const yesterdayStats: YesterdayStats = {
    appointment_count: (yesterdayRes.data ?? []).length,
    revenue: (yesterdayRes.data ?? []).reduce((sum: number, appt: any) => {
      const svcs: any[] = appt.appointment_services ?? []
      return sum + svcs.reduce((s: number, sv: any) => s + (sv.price_at_booking ?? 0), 0)
    }, 0),
  }

  // At-risk clients
  const atRiskClients: AtRiskClient[] = (atRiskRes.data ?? []).map((row: any) => ({
    client_id: row.client_id,
    full_name: row.clients?.full_name ?? null,
    days_since: row.days_since_last_visit ?? 0,
    avg_frequency: row.avg_frequency_days ?? null,
    churn_status: row.churn_status as 'red' | 'yellow',
  }))

  // Top loyalty clients (max 10)
  const { data: topLoyaltyRaw } = await db
    .from('client_loyalty')
    .select('client_id, total_points, current_streak, current_tier, clients(full_name)')
    .eq('tenant_id', tenantId)
    .order('total_points', { ascending: false })
    .limit(10)

  type TopRow = { client_id: string; total_points: number; current_streak: number; current_tier: string; clients: { full_name: string } | null }
  const topLoyaltyClients: TopLoyaltyClient[] = ((topLoyaltyRaw ?? []) as unknown as TopRow[]).map((r) => ({
    clientId: r.client_id,
    fullName: r.clients?.full_name ?? '—',
    totalPoints: r.total_points ?? 0,
    currentStreak: r.current_streak ?? 0,
    currentTier: r.current_tier ?? 'bronze',
  }))

  return { staffName, todayAppointments, weekAppointments, weekSlots, weekStats, yesterdayStats, atRiskClients, topLoyaltyClients, workingHours }
}
