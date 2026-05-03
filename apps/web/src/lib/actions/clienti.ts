'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from './vendite'

export type ChurnStatus = 'active' | 'warning' | 'danger' | 'inactive'

type DbChurnStatus = 'unknown' | 'green' | 'yellow' | 'red'

function mapDbChurnToUi(s: DbChurnStatus | string | null | undefined): ChurnStatus {
  switch (s) {
    case 'green':   return 'active'
    case 'yellow':  return 'warning'
    case 'red':     return 'danger'
    case 'unknown':
    default:        return 'inactive'
  }
}

export interface ClienteRow {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  churn: ChurnStatus
  lastVisit: string | null
  daysSinceLastVisit: number | null
  visitFrequencyDays: number | null
  totalVisits: number
  loyaltyPoints: number
  totalSpent: number
  tags: string[]
}

interface ClientRow {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  tags: unknown
}

interface AppointmentRow {
  id: string
  client_id: string | null
  status: string | null
  start_time: string
}

interface LoyaltyRow {
  client_id: string
  total_points: number | null
  last_visit_date: string | null
}

interface ServiceRow {
  appointment_id: string
  price_at_booking: number | null
}

interface ProductRow {
  appointment_id: string
  price_at_sale: number | null
  quantity: number | null
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string')
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw)
      if (Array.isArray(v)) return v.filter((t): t is string => typeof t === 'string')
    } catch {
      return []
    }
  }
  return []
}


export async function getClienti(): Promise<{
  clienti: ClienteRow[]
  tenantId: string | null
}> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { clienti: [], tenantId: null }

  const db = createAdminClient()

  const [clientsRes, apptRes, loyaltyRes, analyticsRes] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name, email, phone, tags')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true }),
    db
      .from('appointments')
      .select('id, client_id, status, start_time')
      .eq('tenant_id', tenantId),
    db
      .from('client_loyalty')
      .select('client_id, total_points, last_visit_date')
      .eq('tenant_id', tenantId),
    db
      .from('client_analytics')
      .select('client_id, churn_status, days_since_last_visit, avg_frequency_days, last_visit_date, total_visits')
      .eq('tenant_id', tenantId),
  ])

  const clients = (clientsRes.data ?? []) as ClientRow[]
  const appts = (apptRes.data ?? []) as AppointmentRow[]
  const loyalty = (loyaltyRes.data ?? []) as LoyaltyRow[]

  type AnalyticsRow = {
    client_id: string
    churn_status: string | null
    days_since_last_visit: number | null
    avg_frequency_days: number | null
    last_visit_date: string | null
    total_visits: number
  }
  const analyticsMap = new Map<string, AnalyticsRow>(
    ((analyticsRes.data ?? []) as AnalyticsRow[]).map((a) => [a.client_id, a]),
  )

  const completedIds = appts.filter((a) => a.status === 'completed').map((a) => a.id)

  const [servicesRes, productsRes] = await Promise.all([
    completedIds.length > 0
      ? db
          .from('appointment_services')
          .select('appointment_id, price_at_booking')
          .eq('tenant_id', tenantId)
          .in('appointment_id', completedIds)
      : Promise.resolve({ data: [] as ServiceRow[] }),
    completedIds.length > 0
      ? db
          .from('appointment_products')
          .select('appointment_id, price_at_sale, quantity')
          .eq('tenant_id', tenantId)
          .in('appointment_id', completedIds)
      : Promise.resolve({ data: [] as ProductRow[] }),
  ])

  const services = (servicesRes.data ?? []) as ServiceRow[]
  const products = (productsRes.data ?? []) as ProductRow[]

  const apptToClient = new Map<string, string>()
  appts.forEach((a) => {
    if (a.client_id) apptToClient.set(a.id, a.client_id)
  })

  const spentByClient = new Map<string, number>()
  for (const s of services) {
    const cid = apptToClient.get(s.appointment_id)
    if (!cid) continue
    spentByClient.set(cid, (spentByClient.get(cid) ?? 0) + Number(s.price_at_booking ?? 0))
  }
  for (const p of products) {
    const cid = apptToClient.get(p.appointment_id)
    if (!cid) continue
    const v = Number(p.price_at_sale ?? 0) * Number(p.quantity ?? 1)
    spentByClient.set(cid, (spentByClient.get(cid) ?? 0) + v)
  }

  const visitsByClient = new Map<string, Date[]>()
  for (const a of appts) {
    if (a.status !== 'completed' || !a.client_id) continue
    const arr = visitsByClient.get(a.client_id) ?? []
    arr.push(new Date(a.start_time))
    visitsByClient.set(a.client_id, arr)
  }

  const loyaltyByClient = new Map<string, LoyaltyRow>()
  loyalty.forEach((l) => loyaltyByClient.set(l.client_id, l))

  const now = Date.now()
  const DAY = 86_400_000

  const clienti: ClienteRow[] = clients.map((c) => {
    const analytics = analyticsMap.get(c.id)
    const visits = (visitsByClient.get(c.id) ?? []).sort((a, b) => a.getTime() - b.getTime())
    const loyaltyRow = loyaltyByClient.get(c.id)

    // Prefer pre-computed analytics when available; fall back to local calc for
    // brand-new clients not yet processed by the trigger/cron.
    const lastVisitDate =
      analytics?.last_visit_date ??
      (visits.length > 0 ? visits[visits.length - 1].toISOString() : loyaltyRow?.last_visit_date ?? null)

    const daysSince =
      analytics?.days_since_last_visit ??
      (lastVisitDate ? Math.floor((now - new Date(lastVisitDate).getTime()) / DAY) : null)

    const frequency =
      analytics?.avg_frequency_days != null
        ? Math.round(analytics.avg_frequency_days)
        : visits.length >= 2
          ? Math.round(
              (visits[visits.length - 1].getTime() - visits[0].getTime()) / DAY / (visits.length - 1),
            )
          : null

    const totalVisits = analytics?.total_visits ?? visits.length

    return {
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      churn: mapDbChurnToUi(analytics?.churn_status),
      lastVisit: lastVisitDate,
      daysSinceLastVisit: daysSince,
      visitFrequencyDays: frequency,
      totalVisits,
      loyaltyPoints: Number(loyaltyRow?.total_points ?? 0),
      totalSpent: spentByClient.get(c.id) ?? 0,
      tags: parseTags(c.tags),
    }
  })

  return { clienti, tenantId }
}

// ─── Dettaglio cliente ────────────────────────────────────────────────────────

export interface ClienteInfo {
  id: string
  fullName: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  preferredChannel: string | null
  marketingConsent: boolean
  tags: string[]
  clienteSince: string
}

export interface ClienteAnalytics {
  totalVisits: number
  completedVisits: number
  cancelledVisits: number
  noShowVisits: number
  totalSpent: number
  avgSpend: number
  lastVisitDate: string | null
  daysSinceLastVisit: number | null
  avgDaysBetweenVisits: number | null
  churnStatus: 'green' | 'yellow' | 'red' | 'unknown'
  churnDelayDays: number
  vipScore: number
  lastApptTotal: number
}

export interface PrefInfo {
  servizioPreferito: string | null
  servizioCount: string | null
  orarioPreferito: string | null
  prodottoPrincipale: string | null
  prodottoCount: string | null
}

export interface AppuntamentoItem {
  id: string
  startTime: string
  services: string[]
  staffName: string
  total: number
  status: string
}

export interface LoyaltyInfo {
  totalPoints: number
  availablePoints: number
  currentStreak: number
  longestStreak: number
  lastVisitDate: string | null
  tier: 'bronze' | 'silver' | 'gold' | 'diamond'
  tierLabel: string
  progress: number
  pointsToNextTier: number
  nextTierLabel: string | null
  transactions: { id: string; type: string; points: number; description: string | null; createdAt: string }[]
  rewards: { id: string; name: string; pointsCost: number; rewardType: string }[]
  redemptions: { id: string; rewardName: string; pointsSpent: number; confirmedAt: string | null; createdAt: string }[]
}

export interface NotaItem {
  id: string
  text: string
  staffName: string
  createdAt: string
}

export interface VenditaItem {
  productId: string
  productName: string
  brand: string | null
  totalQuantity: number
  totalSpent: number
  lastDate: string
}

export interface ClienteDettaglioData {
  cliente: ClienteInfo
  analytics: ClienteAnalytics
  preferenze: PrefInfo
  appuntamenti: AppuntamentoItem[]
  loyalty: LoyaltyInfo
  note: NotaItem[]
  vendite: VenditaItem[]
}

// ─── Tier helper ──────────────────────────────────────────────────────────────

const TIERS = [
  { key: 'bronze' as const, label: 'Bronzo', min: 0, max: 999 },
  { key: 'silver' as const, label: 'Argento', min: 1000, max: 2999 },
  { key: 'gold' as const, label: 'Oro', min: 3000, max: 7499 },
  { key: 'diamond' as const, label: 'Diamante', min: 7500, max: Infinity },
]

function computeTier(pts: number) {
  let current = TIERS[0]
  for (const t of TIERS) {
    if (pts >= t.min) current = t
  }
  const idx = TIERS.indexOf(current)
  const next = TIERS[idx + 1]
  if (!next) return { tier: current.key, label: current.label, progress: 100, pointsToNext: 0, nextLabel: null }
  const progress = Math.round(((pts - current.min) / (next.min - current.min)) * 100)
  return { tier: current.key, label: current.label, progress, pointsToNext: next.min - pts, nextLabel: next.label }
}

// ─── getClienteDettaglio ──────────────────────────────────────────────────────

export async function getClienteDettaglio(
  clienteId: string,
): Promise<ClienteDettaglioData | null> {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) return null

  const db = createAdminClient()

  // ── 1. Client base ──────────────────────────────────────────────────────────
  const { data: clientRow } = await db
    .from('clients')
    .select('id, full_name, phone, email, date_of_birth, preferred_contact_channel, marketing_consent, tags, created_at')
    .eq('tenant_id', tenantId)
    .eq('id', clienteId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!clientRow) return null

  // ── 1.5. Pre-computed churn analytics ───────────────────────────────────────
  const { data: analyticsRow } = await db
    .from('client_analytics')
    .select('churn_status, days_since_last_visit, avg_frequency_days, last_visit_date')
    .eq('tenant_id', tenantId)
    .eq('client_id', clienteId)
    .maybeSingle()

  // ── 2. Appointments ─────────────────────────────────────────────────────────
  const { data: rawAppts } = await db
    .from('appointments')
    .select('id, start_time, end_time, status, staff_id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clienteId)
    .is('deleted_at', null)
    .order('start_time', { ascending: false })

  const appts = (rawAppts ?? []) as { id: string; start_time: string; end_time: string; status: string; staff_id: string }[]
  const apptIds = appts.map((a) => a.id)

  // ── 3. Services for appointments ────────────────────────────────────────────
  const { data: rawSvcs } = apptIds.length
    ? await db.from('appointment_services').select('appointment_id, service_id, price_at_booking').eq('tenant_id', tenantId).in('appointment_id', apptIds)
    : { data: [] as { appointment_id: string; service_id: string; price_at_booking: number }[] }

  const svcRows = (rawSvcs ?? []) as { appointment_id: string; service_id: string; price_at_booking: number }[]
  const svcIds = [...new Set(svcRows.map((s) => s.service_id))]

  const { data: rawSvcNames } = svcIds.length
    ? await db.from('services').select('id, name').in('id', svcIds)
    : { data: [] as { id: string; name: string }[] }

  const svcNameMap = new Map((rawSvcNames ?? []).map((s) => [s.id, s.name]))

  // ── 4. Products for appointments ────────────────────────────────────────────
  const { data: rawProds } = apptIds.length
    ? await db.from('appointment_products').select('appointment_id, product_id, quantity, price_at_sale').eq('tenant_id', tenantId).in('appointment_id', apptIds)
    : { data: [] as { appointment_id: string; product_id: string; quantity: number; price_at_sale: number }[] }

  const prodRows = (rawProds ?? []) as { appointment_id: string; product_id: string; quantity: number; price_at_sale: number }[]
  const prodIds = [...new Set(prodRows.map((p) => p.product_id))]

  const { data: rawProdDetails } = prodIds.length
    ? await db.from('products').select('id, name, brand').in('id', prodIds)
    : { data: [] as { id: string; name: string; brand: string | null }[] }

  const prodDetailMap = new Map((rawProdDetails ?? []).map((p) => [p.id, { name: p.name, brand: p.brand }]))

  // ── 5. Staff names ──────────────────────────────────────────────────────────
  const staffIds = [...new Set(appts.map((a) => a.staff_id).filter(Boolean))]
  const { data: rawStaff } = staffIds.length
    ? await db.from('staff_members').select('id, profile_id').in('id', staffIds)
    : { data: [] as { id: string; profile_id: string }[] }

  const profileIds = [...new Set((rawStaff ?? []).map((s) => s.profile_id).filter(Boolean))]
  const { data: rawProfiles } = profileIds.length
    ? await db.from('profiles').select('id, full_name').in('id', profileIds)
    : { data: [] as { id: string; full_name: string | null }[] }

  const profileNameMap = new Map((rawProfiles ?? []).map((p) => [p.id, p.full_name ?? '—']))
  const staffToProfile = new Map((rawStaff ?? []).map((s) => [s.id, s.profile_id]))

  function staffName(staffId: string): string {
    const pid = staffToProfile.get(staffId)
    return pid ? (profileNameMap.get(pid) ?? '—') : '—'
  }

  // ── 6. Compute analytics ────────────────────────────────────────────────────
  const completed = appts.filter((a) => a.status === 'completed')
  const cancelled = appts.filter((a) => a.status === 'cancelled')
  const noShows = appts.filter((a) => a.status === 'no_show')

  const completedDates = completed.map((a) => new Date(a.start_time)).sort((a, b) => a.getTime() - b.getTime())
  const lastVisitDate = completedDates.length ? completedDates[completedDates.length - 1].toISOString() : null

  const DAY = 86_400_000
  const now = Date.now()
  const daysSince = lastVisitDate ? Math.floor((now - new Date(lastVisitDate).getTime()) / DAY) : null
  let avgDays: number | null = null
  if (completedDates.length >= 2) {
    const span = completedDates[completedDates.length - 1].getTime() - completedDates[0].getTime()
    avgDays = Math.round(span / DAY / (completedDates.length - 1))
  }

  const svcsByAppt = new Map<string, { name: string; price: number }[]>()
  for (const s of svcRows) {
    const arr = svcsByAppt.get(s.appointment_id) ?? []
    arr.push({ name: svcNameMap.get(s.service_id) ?? '?', price: Number(s.price_at_booking) })
    svcsByAppt.set(s.appointment_id, arr)
  }

  const svcSpend = svcRows.reduce((sum, s) => {
    const a = appts.find((x) => x.id === s.appointment_id)
    return a?.status === 'completed' ? sum + Number(s.price_at_booking) : sum
  }, 0)
  const prodSpend = prodRows.reduce((sum, p) => {
    const a = appts.find((x) => x.id === p.appointment_id)
    return a?.status === 'completed' ? sum + Number(p.price_at_sale) * Number(p.quantity) : sum
  }, 0)
  const totalSpent = svcSpend + prodSpend
  const avgSpend = completed.length ? Math.round(totalSpent / completed.length) : 0

  // Last appointment total (most recent completed)
  const lastCompletedAppt = completed[0] // appts sorted desc
  const lastApptTotal = lastCompletedAppt
    ? (svcsByAppt.get(lastCompletedAppt.id) ?? []).reduce((s, x) => s + x.price, 0)
    : 0

  // Churn — read from pre-computed client_analytics; fall back to local JS calc
  // only when the analytics row is absent (brand-new client, pending backfill).
  const dbChurnStatus = (analyticsRow?.churn_status ?? 'unknown') as DbChurnStatus
  let churnStatus: 'green' | 'yellow' | 'red' | 'unknown' = dbChurnStatus
  let churnDelayDays = 0
  if (analyticsRow?.days_since_last_visit != null && analyticsRow?.avg_frequency_days != null) {
    churnDelayDays = Math.max(
      0,
      Math.round(analyticsRow.days_since_last_visit - analyticsRow.avg_frequency_days),
    )
  } else if (analyticsRow == null && daysSince !== null) {
    const threshold = avgDays ?? 30
    if (daysSince > threshold * 1.5) {
      churnStatus = 'red'
      churnDelayDays = Math.round(daysSince - threshold)
    } else if (daysSince > threshold) {
      churnStatus = 'yellow'
      churnDelayDays = Math.round(daysSince - threshold)
    } else {
      churnStatus = 'green'
    }
  }

  // VIP score (simplified, 0-100)
  const freqScore = avgDays !== null ? Math.max(0, Math.min(100, ((90 - avgDays) / 90) * 100)) : 0
  const spendScore = Math.min(100, totalSpent / 20)
  const visitScore = Math.min(100, completed.length * 5)
  const reliabilityScore =
    appts.length > 0 ? (1 - (noShows.length + cancelled.length) / appts.length) * 100 : 100
  const vipScore = Math.round(freqScore * 0.3 + spendScore * 0.25 + visitScore * 0.2 + reliabilityScore * 0.25)

  // ── 7. Preferences ──────────────────────────────────────────────────────────
  const svcCount = new Map<string, number>()
  for (const s of svcRows) {
    const a = appts.find((x) => x.id === s.appointment_id)
    if (a?.status !== 'completed') continue
    const name = svcNameMap.get(s.service_id) ?? '?'
    svcCount.set(name, (svcCount.get(name) ?? 0) + 1)
  }
  const topSvcs = [...svcCount.entries()].sort((a, b) => b[1] - a[1])
  const servizioPreferito = topSvcs.slice(0, 2).map(([n]) => n).join(' + ') || null
  const servizioCount =
    topSvcs[0] ? `${topSvcs[0][1]} volte su ${completed.length} visite` : null

  const timeMap = new Map<string, number>()
  for (const a of completed) {
    const d = new Date(a.start_time)
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    const h = d.getHours()
    const period = h < 12 ? 'mattina' : h < 17 ? 'pomeriggio' : 'sera'
    const key = `${dayNames[d.getDay()]} ${period}`
    timeMap.set(key, (timeMap.get(key) ?? 0) + 1)
  }
  const topTime = [...timeMap.entries()].sort((a, b) => b[1] - a[1])[0]
  const orarioPreferito = topTime?.[0] ?? null

  const prodCountMap = new Map<string, number>()
  for (const p of prodRows) {
    const detail = prodDetailMap.get(p.product_id)
    if (!detail) continue
    prodCountMap.set(detail.name, (prodCountMap.get(detail.name) ?? 0) + Number(p.quantity))
  }
  const topProd = [...prodCountMap.entries()].sort((a, b) => b[1] - a[1])[0]
  const prodottoPrincipale = topProd?.[0] ?? null
  const prodottoCount = topProd ? `${topProd[1]} ${topProd[1] === 1 ? 'volta' : 'volte'} in totale` : null

  // ── 8. Appointments list ────────────────────────────────────────────────────
  const appuntamenti: AppuntamentoItem[] = appts.map((a) => {
    const svcs = svcsByAppt.get(a.id) ?? []
    return {
      id: a.id,
      startTime: a.start_time,
      services: svcs.map((s) => s.name),
      staffName: staffName(a.staff_id),
      total: svcs.reduce((s, x) => s + x.price, 0),
      status: a.status,
    }
  })

  // ── 9. Loyalty ──────────────────────────────────────────────────────────────
  const { data: loyaltyRow } = await db
    .from('client_loyalty')
    .select('total_points, available_points, current_streak, longest_streak, last_visit_date')
    .eq('tenant_id', tenantId)
    .eq('client_id', clienteId)
    .maybeSingle()

  const totalPts = Number(loyaltyRow?.total_points ?? 0)
  const tierInfo = computeTier(totalPts)

  const [txRes, rewardsRes, redemptionsRes] = await Promise.all([
    db.from('loyalty_transactions').select('id, type, points, description, created_at').eq('tenant_id', tenantId).eq('client_id', clienteId).order('created_at', { ascending: false }).limit(30),
    db.from('rewards').select('id, name, points_cost, reward_type').eq('tenant_id', tenantId).eq('is_active', true).order('display_order'),
    db.from('reward_redemptions').select('id, reward_id, points_spent, confirmed_at, created_at').eq('tenant_id', tenantId).eq('client_id', clienteId).order('created_at', { ascending: false }),
  ])

  const rewardNameMap = new Map((rewardsRes.data ?? []).map((r) => [r.id, r.name]))

  const loyalty: LoyaltyInfo = {
    totalPoints: totalPts,
    availablePoints: Number(loyaltyRow?.available_points ?? 0),
    currentStreak: Number(loyaltyRow?.current_streak ?? 0),
    longestStreak: Number(loyaltyRow?.longest_streak ?? 0),
    lastVisitDate: loyaltyRow?.last_visit_date ?? null,
    tier: tierInfo.tier,
    tierLabel: tierInfo.label,
    progress: tierInfo.progress,
    pointsToNextTier: tierInfo.pointsToNext,
    nextTierLabel: tierInfo.nextLabel,
    transactions: (txRes.data ?? []).map((t) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      description: t.description,
      createdAt: t.created_at,
    })),
    rewards: (rewardsRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      pointsCost: r.points_cost,
      rewardType: r.reward_type,
    })),
    redemptions: (redemptionsRes.data ?? []).map((r) => ({
      id: r.id,
      rewardName: rewardNameMap.get(r.reward_id) ?? '?',
      pointsSpent: r.points_spent,
      confirmedAt: r.confirmed_at,
      createdAt: r.created_at,
    })),
  }

  // ── 10. Notes ───────────────────────────────────────────────────────────────
  const { data: rawNotes } = await db
    .from('client_notes')
    .select('id, note_text, staff_id, created_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', clienteId)
    .order('created_at', { ascending: false })

  const noteStaffIds = [...new Set((rawNotes ?? []).map((n) => n.staff_id))]
  const { data: noteStaffRows } = noteStaffIds.length
    ? await db.from('staff_members').select('id, profile_id').in('id', noteStaffIds)
    : { data: [] as { id: string; profile_id: string }[] }
  const noteProfileIds = [...new Set((noteStaffRows ?? []).map((s) => s.profile_id))]
  const { data: noteProfileRows } = noteProfileIds.length
    ? await db.from('profiles').select('id, full_name').in('id', noteProfileIds)
    : { data: [] as { id: string; full_name: string | null }[] }

  const noteProfMap = new Map((noteProfileRows ?? []).map((p) => [p.id, p.full_name ?? '—']))
  const noteStaffMap = new Map((noteStaffRows ?? []).map((s) => [s.id, s.profile_id]))

  const note: NotaItem[] = (rawNotes ?? []).map((n) => ({
    id: n.id,
    text: n.note_text,
    staffName: (() => { const pid = noteStaffMap.get(n.staff_id); return pid ? (noteProfMap.get(pid) ?? '—') : '—' })(),
    createdAt: n.created_at,
  }))

  // ── 11. Vendite ─────────────────────────────────────────────────────────────
  const venditeMap = new Map<string, { productName: string; brand: string | null; qty: number; spent: number; lastDate: string }>()
  for (const p of prodRows) {
    const detail = prodDetailMap.get(p.product_id)
    if (!detail) continue
    const apptDate = appts.find((a) => a.id === p.appointment_id)?.start_time ?? ''
    const cur = venditeMap.get(p.product_id)
    if (cur) {
      cur.qty += Number(p.quantity)
      cur.spent += Number(p.price_at_sale) * Number(p.quantity)
      if (apptDate > cur.lastDate) cur.lastDate = apptDate
    } else {
      venditeMap.set(p.product_id, {
        productName: detail.name,
        brand: detail.brand,
        qty: Number(p.quantity),
        spent: Number(p.price_at_sale) * Number(p.quantity),
        lastDate: apptDate,
      })
    }
  }

  const vendite: VenditaItem[] = [...venditeMap.entries()]
    .map(([productId, v]) => ({ productId, productName: v.productName, brand: v.brand, totalQuantity: v.qty, totalSpent: v.spent, lastDate: v.lastDate }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))

  return {
    cliente: {
      id: clientRow.id,
      fullName: clientRow.full_name,
      phone: clientRow.phone,
      email: clientRow.email,
      dateOfBirth: clientRow.date_of_birth,
      preferredChannel: clientRow.preferred_contact_channel,
      marketingConsent: clientRow.marketing_consent,
      tags: parseTags(clientRow.tags),
      clienteSince: clientRow.created_at,
    },
    analytics: {
      totalVisits: completed.length,
      completedVisits: completed.length,
      cancelledVisits: cancelled.length,
      noShowVisits: noShows.length,
      totalSpent,
      avgSpend,
      lastVisitDate,
      daysSinceLastVisit: daysSince,
      avgDaysBetweenVisits: avgDays,
      churnStatus,
      churnDelayDays,
      vipScore,
      lastApptTotal,
    },
    preferenze: { servizioPreferito, servizioCount, orarioPreferito, prodottoPrincipale, prodottoCount },
    appuntamenti,
    loyalty,
    note,
    vendite,
  }
}

// ─── addClienteNota ───────────────────────────────────────────────────────────

export async function addClienteNota(
  clienteId: string,
  noteText: string,
): Promise<{ error?: string }> {
  const trimmed = noteText.trim()
  if (!trimmed) return { error: 'La nota non può essere vuota' }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { error: 'Tenant non trovato' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autenticato' }

  const db = createAdminClient()

  // Find staff_member for this user in this tenant (or fall back to tenant owner)
  let { data: staffRow } = await db
    .from('staff_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!staffRow) {
    const { data: ownerRow } = await db
      .from('staff_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    staffRow = ownerRow
  }

  if (!staffRow) return { error: 'Nessun membro dello staff trovato per questo tenant' }

  const { error } = await db.from('client_notes').insert({
    tenant_id: tenantId,
    client_id: clienteId,
    staff_id: staffRow.id,
    note_text: trimmed,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clienti/${clienteId}`)
  return {}
}
