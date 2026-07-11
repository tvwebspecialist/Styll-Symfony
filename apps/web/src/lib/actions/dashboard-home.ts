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

export interface LowStockProduct {
  product_id: string
  name: string
  quantity: number
  low_stock_threshold: number
  risk: 'red' | 'yellow'
}

export interface PendingReward {
  client_id: string
  full_name: string | null
  reward_name: string
  points_available: number
  points_cost: number
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

type Relation<T> = T | T[] | null | undefined

interface StaffProfileRelationRow {
  full_name: string | null
}

interface StaffMembershipRow {
  id: string
  profiles: Relation<StaffProfileRelationRow>
}

interface AppointmentClientRelationRow {
  full_name: string | null
}

interface AppointmentServiceNameRelationRow {
  name: string | null
}

interface AppointmentServiceRow {
  price_at_booking: number | null
  services: Relation<AppointmentServiceNameRelationRow>
}

interface AppointmentWindowRow {
  id: string
  start_time: string
  end_time: string | null
  status: string
  client_id: string | null
  clients: Relation<AppointmentClientRelationRow>
  appointment_services: AppointmentServiceRow[] | null
}

interface AtRiskClientRelationRow {
  full_name: string | null
}

interface AtRiskAnalyticsRow {
  client_id: string
  churn_status: string | null
  days_since_last_visit: number | null
  avg_frequency_days: number | null
  clients: Relation<AtRiskClientRelationRow>
}

const EMPTY_WEEK_STATS: WeekStats = {
  revenue: 0,
  revenue_prev: 0,
  client_count: 0,
  client_count_prev: 0,
}

const EMPTY_YESTERDAY_STATS: YesterdayStats = {
  appointment_count: 0,
  revenue: 0,
}

const DAY_MS = 86_400_000

function readSingleRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function getIsoDatePart(value: string): string {
  return value.slice(0, 10)
}

function mapAppointmentRow(row: AppointmentWindowRow): TodayAppointment {
  const services = row.appointment_services ?? []
  const serviceNames = services
    .map((service) => readSingleRelation(service.services)?.name ?? '')
    .filter(Boolean)

  return {
    id: row.id,
    start_time: row.start_time,
    end_time: row.end_time ?? row.start_time,
    status: row.status,
    client_id: row.client_id ?? '',
    client_name: readSingleRelation(row.clients)?.full_name ?? 'Cliente',
    service_names: serviceNames,
    total_price: services.reduce((sum, service) => sum + (service.price_at_booking ?? 0), 0),
  }
}

function sumAppointmentRevenue(appointments: TodayAppointment[]): number {
  return appointments.reduce((sum, appointment) => sum + appointment.total_price, 0)
}

function countDistinctClients(appointments: TodayAppointment[]): number {
  return new Set(
    appointments
      .map((appointment) => appointment.client_id)
      .filter((clientId): clientId is string => Boolean(clientId)),
  ).size
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
  lowStockProducts: LowStockProduct[]
  pendingRewards: PendingReward[]
}

const EMPTY_DASHBOARD_HOME_DATA: DashboardHomeData = {
  staffName: null,
  todayAppointments: [],
  weekAppointments: [],
  weekSlots: [],
  weekStats: EMPTY_WEEK_STATS,
  yesterdayStats: EMPTY_YESTERDAY_STATS,
  atRiskClients: [],
  topLoyaltyClients: [],
  workingHours: [],
  lowStockProducts: [],
  pendingRewards: [],
}

export async function getDashboardHomeData(): Promise<DashboardHomeData> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return EMPTY_DASHBOARD_HOME_DATA

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient()

  // Date helpers (UTC-safe: use local day boundaries via date strings)
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)

  // Week boundaries (Mon–Sun of current week)
  const dow = now.getDay() // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const weekMonday = new Date(now.getTime() - daysFromMon * 86400000)
  const weekMondayStr = weekMonday.toISOString().slice(0, 10)
  const weekSundayStr = new Date(weekMonday.getTime() + 6 * 86400000).toISOString().slice(0, 10)
  const nextWeekMondayStr = new Date(weekMonday.getTime() + 7 * DAY_MS).toISOString().slice(0, 10)

  // Previous week boundaries
  const prevMonStr = new Date(weekMonday.getTime() - 7 * DAY_MS).toISOString().slice(0, 10)

  const [staffRes, appointmentWindowRes, atRiskRes, inventoryRes, rewardsRes] = await Promise.all([
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

    // A single bounded appointment window drives both the visible agenda
    // and the hidden summary fields, avoiding repeated appointment scans.
    db
      .from('appointments')
      .select(`
        id, start_time, end_time, status, client_id,
        clients(full_name),
        appointment_services(price_at_booking, services(name))
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('start_time', `${prevMonStr}T00:00:00`)
      .lt('start_time', `${nextWeekMondayStr}T00:00:00`)
      .not('status', 'eq', 'cancelled')
      .order('start_time', { ascending: true }),

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

    // Low stock inventory
    db
      .from('product_inventory')
      .select('product_id, quantity, low_stock_threshold, products(name)')
      .eq('tenant_id', tenantId)
      .gt('low_stock_threshold', 0)
      .order('quantity', { ascending: true })
      .limit(20),

    // Active rewards (to cross-match with loyal clients)
    db
      .from('rewards')
      .select('id, name, points_cost')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('points_cost', { ascending: true })
      .limit(10),
  ])

  // Staff name + id
  const staff = (staffRes.data ?? null) as StaffMembershipRow | null
  const staffName = readSingleRelation(staff?.profiles)?.full_name ?? null
  const staffMemberId = staff?.id ?? null

  // Working hours (all days of week for this staff member)
  let workingHours: WorkingHour[] = []
  if (staffMemberId) {
    const { data: whData } = await db
      .from('working_hours')
      .select('day_of_week, start_time, end_time')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffMemberId)
    workingHours = (whData ?? []) as WorkingHour[]
  }

  const appointmentWindow = ((appointmentWindowRes.data ?? []) as AppointmentWindowRow[]).map(mapAppointmentRow)
  const weekAppointments = appointmentWindow.filter((appointment) => {
    const appointmentDate = getIsoDatePart(appointment.start_time)
    return appointmentDate >= weekMondayStr && appointmentDate <= weekSundayStr
  })
  const todayAppointments = weekAppointments.filter(
    (appointment) => getIsoDatePart(appointment.start_time) === todayStr,
  )
  const yesterdayAppointments = appointmentWindow.filter(
    (appointment) => getIsoDatePart(appointment.start_time) === yesterdayStr,
  )
  const previousWeekCompletedAppointments = appointmentWindow.filter((appointment) => {
    const appointmentDate = getIsoDatePart(appointment.start_time)
    return appointment.status === 'completed'
      && appointmentDate >= prevMonStr
      && appointmentDate < weekMondayStr
  })

  // Week heatmap slots
  const weekSlots: WeekSlot[] = []
  const bookedSet = new Set<string>()
  for (const appointment of weekAppointments) {
    const d = getIsoDatePart(appointment.start_time)
    const h = Math.floor(getLocalMinutes(appointment.start_time, DEFAULT_TIMEZONE) / 60)
    if (d && h >= DASHBOARD_HOURS.SLOT_START && h <= DASHBOARD_HOURS.SLOT_END) bookedSet.add(`${d}:${h}`)
  }
  for (let d = 0; d < 6; d++) {
    const date = new Date(weekMonday.getTime() + d * 86400000)
    const dateStr = date.toISOString().slice(0, 10)
    for (let h = DASHBOARD_HOURS.RANGE_START; h <= DASHBOARD_HOURS.RANGE_END; h++) {
      weekSlots.push({ date: dateStr, hour: h, is_booked: bookedSet.has(`${dateStr}:${h}`) })
    }
  }

  const weekStats: WeekStats = {
    revenue: sumAppointmentRevenue(weekAppointments),
    revenue_prev: sumAppointmentRevenue(previousWeekCompletedAppointments),
    client_count: countDistinctClients(weekAppointments),
    client_count_prev: countDistinctClients(previousWeekCompletedAppointments),
  }

  // Yesterday stats (for KPI trend)
  const yesterdayStats: YesterdayStats = {
    appointment_count: yesterdayAppointments.length,
    revenue: sumAppointmentRevenue(yesterdayAppointments),
  }

  // At-risk clients
  const atRiskClients: AtRiskClient[] = ((atRiskRes.data ?? []) as AtRiskAnalyticsRow[]).map((row) => ({
    client_id: row.client_id,
    full_name: readSingleRelation(row.clients)?.full_name ?? null,
    days_since: row.days_since_last_visit ?? 0,
    avg_frequency: row.avg_frequency_days ?? null,
    churn_status: row.churn_status as 'red' | 'yellow',
  }))

  // Low stock products (filter client-side: quantity <= threshold)
  interface InventoryRow { product_id: string; quantity: number | null; low_stock_threshold: number | null; products: { name: string | null } | { name: string | null }[] | null }
  const lowStockProducts: LowStockProduct[] = ((inventoryRes.data ?? []) as InventoryRow[])
    .filter((row) => (row.quantity ?? 0) <= (row.low_stock_threshold ?? 0))
    .slice(0, 6)
    .map((row) => {
      const qty = row.quantity ?? 0
      const threshold = row.low_stock_threshold ?? 0
      return {
        product_id: row.product_id,
        name: readSingleRelation(row.products as { name: string | null } | { name: string | null }[] | null)?.name ?? 'Prodotto',
        quantity: qty,
        low_stock_threshold: threshold,
        risk: qty === 0 ? 'red' : 'yellow',
      }
    })

  // Pending rewards: find clients who can afford at least the cheapest reward
  interface RewardRow { id: string; name: string | null; points_cost: number | null }
  const rewards = (rewardsRes.data ?? []) as RewardRow[]
  const minCost = rewards.length > 0
    ? Math.min(...rewards.map((r) => r.points_cost ?? Infinity))
    : Infinity

  let pendingRewards: PendingReward[] = []
  if (Number.isFinite(minCost)) {
    interface LoyaltyRow { client_id: string; available_points: number | null; clients: { full_name: string | null } | { full_name: string | null }[] | null }
    const { data: loyaltyData } = await db
      .from('client_loyalty')
      .select('client_id, available_points, clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('available_points', minCost)
      .order('available_points', { ascending: false })
      .limit(5)
    pendingRewards = ((loyaltyData ?? []) as LoyaltyRow[]).map((row) => {
      const pts = row.available_points ?? 0
      const affordableReward = rewards.find((r) => (r.points_cost ?? Infinity) <= pts)
      return {
        client_id: row.client_id,
        full_name: readSingleRelation(row.clients as { full_name: string | null } | { full_name: string | null }[] | null)?.full_name ?? null,
        reward_name: affordableReward?.name ?? 'Premio',
        points_available: pts,
        points_cost: affordableReward?.points_cost ?? 0,
      }
    })
  }

  return {
    staffName,
    todayAppointments,
    weekAppointments,
    weekSlots,
    weekStats,
    yesterdayStats,
    atRiskClients,
    topLoyaltyClients: [],
    workingHours,
    lowStockProducts,
    pendingRewards,
  }
}
