'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { MANAGER_ROLES } from '@/lib/constants'
import type { Json, TablesUpdate } from '@/types'
import {
  buildImportClientsResult,
  prepareClientImportPlan,
} from '@/lib/utils/client-import-core'
import type {
  ClientImportUpdate,
  ImportClientsInput,
  ImportClientsResult,
  ImportError,
  ImportColumn,
  ImportRow,
} from '@/lib/utils/client-import-core'

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

type StaffRole = 'owner' | 'manager' | 'staff' | 'receptionist'

interface ClientiActorContext {
  tenantId: string
  db: ReturnType<typeof createAdminClient>
  currentStaff: {
    id: string
    role: StaffRole
  }
}

function throwForbidden(): never {
  const error = new Error('Forbidden')
  ;(error as Error & { digest?: string }).digest = 'NEXT_HTTP_ERROR_FALLBACK;403'
  throw error
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

async function getClientiActorContext(): Promise<ClientiActorContext | null> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: currentStaff } = await db
    .from('staff_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!currentStaff) return null

  return {
    tenantId,
    db,
    currentStaff: currentStaff as ClientiActorContext['currentStaff'],
  }
}

function hasFullCrmAccess(role: StaffRole): boolean {
  return MANAGER_ROLES.includes(role as typeof MANAGER_ROLES[number])
}

function canCreateClient(role: StaffRole): boolean {
  return hasFullCrmAccess(role) || role === 'receptionist'
}

function canWritePrivateNotes(role: StaffRole): boolean {
  return hasFullCrmAccess(role) || role === 'staff'
}

async function getStaffClientIds(
  db: ReturnType<typeof createAdminClient>,
  tenantId: string,
  staffId: string,
): Promise<Set<string>> {
  const { data: appointments } = await db
    .from('appointments')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .eq('staff_id', staffId)
    .is('deleted_at', null)
    .not('client_id', 'is', null)

  return new Set(
    ((appointments ?? []) as Array<{ client_id: string | null }>)
      .map((row) => row.client_id)
      .filter((id): id is string => !!id)
  )
}

async function getClientTenantId(
  db: ReturnType<typeof createAdminClient>,
  clientId: string,
): Promise<string | null> {
  const { data: client } = await db
    .from('clients')
    .select('tenant_id')
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle()

  return (client as { tenant_id?: string } | null)?.tenant_id ?? null
}

async function assertClientAccess(
  ctx: ClientiActorContext,
  clientId: string,
): Promise<'full' | 'staff' | 'receptionist'> {
  const tenantId = await getClientTenantId(ctx.db, clientId)
  if (!tenantId) return throwForbidden()
  if (tenantId !== ctx.tenantId) return throwForbidden()

  if (hasFullCrmAccess(ctx.currentStaff.role)) return 'full'
  if (ctx.currentStaff.role === 'receptionist') return 'receptionist'

  const ownedClientIds = await getStaffClientIds(ctx.db, ctx.tenantId, ctx.currentStaff.id)
  if (!ownedClientIds.has(clientId)) return throwForbidden()
  return 'staff'
}

function redactClienteRowForReceptionist(row: ClienteRow): ClienteRow {
  return {
    ...row,
    churn: 'inactive',
    lastVisit: null,
    daysSinceLastVisit: null,
    visitFrequencyDays: null,
    totalVisits: 0,
    loyaltyPoints: 0,
    totalSpent: 0,
    tags: [],
  }
}

function redactClienteDettaglioForReceptionist(
  data: ClienteDettaglioData,
): ClienteDettaglioData {
  return {
    cliente: {
      ...data.cliente,
      dateOfBirth: null,
      preferredChannel: null,
      marketingConsent: false,
      tags: [],
    },
    analytics: {
      totalVisits: 0,
      completedVisits: 0,
      cancelledVisits: 0,
      noShowVisits: 0,
      totalSpent: 0,
      avgSpend: 0,
      lastVisitDate: null,
      daysSinceLastVisit: null,
      avgDaysBetweenVisits: null,
      churnStatus: 'unknown',
      churnDelayDays: 0,
      vipScore: 0,
      lastApptTotal: 0,
    },
    preferenze: {
      servizioPreferito: null,
      servizioCount: null,
      orarioPreferito: null,
      prodottoPrincipale: null,
      prodottoCount: null,
    },
    appuntamenti: data.appuntamenti.map((appointment) => ({
      ...appointment,
      total: 0,
    })),
    loyalty: {
      totalPoints: 0,
      availablePoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastVisitDate: null,
      tier: 'bronze',
      tierLabel: 'Bronzo',
      progress: 0,
      pointsToNextTier: 0,
      nextTierLabel: null,
      transactions: [],
      rewards: [],
      redemptions: [],
    },
    note: [],
    vendite: [],
  }
}


export async function getClienti(): Promise<{
  clienti: ClienteRow[]
  tenantId: string | null
}> {
  const ctx = await getClientiActorContext()
  if (!ctx) return { clienti: [], tenantId: null }

  const { tenantId, db } = ctx
  const ownedClientIds =
    ctx.currentStaff.role === 'staff'
      ? await getStaffClientIds(db, tenantId, ctx.currentStaff.id)
      : null

  const [clientsRes, apptRes, loyaltyRes, analyticsRes] = await Promise.all([
    ownedClientIds
      ? ownedClientIds.size > 0
        ? db
            .from('clients')
            .select('id, full_name, email, phone, tags')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .in('id', [...ownedClientIds])
            .order('full_name', { ascending: true })
        : Promise.resolve({ data: [] as ClientRow[] })
      : db
          .from('clients')
          .select('id, full_name, email, phone, tags')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('full_name', { ascending: true }),
    db
      .from('appointments')
      .select('id, client_id, status, start_time')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .then((result) => ({
        ...result,
        data: ownedClientIds
          ? (result.data ?? []).filter((row) => row.client_id && ownedClientIds.has(row.client_id))
          : result.data,
      })),
    ctx.currentStaff.role === 'receptionist'
      ? Promise.resolve({ data: [] as LoyaltyRow[] })
      : db
          .from('client_loyalty')
          .select('client_id, total_points, last_visit_date')
          .eq('tenant_id', tenantId)
          .then((result) => ({
            ...result,
            data: ownedClientIds
              ? (result.data ?? []).filter((row) => ownedClientIds.has(row.client_id))
              : result.data,
          })),
    ctx.currentStaff.role === 'receptionist'
      ? Promise.resolve({ data: [] as Array<{
          client_id: string
          churn_status: string | null
          days_since_last_visit: number | null
          avg_frequency_days: number | null
          last_visit_date: string | null
          total_visits: number
        }> })
      : db
          .from('client_analytics')
          .select('client_id, churn_status, days_since_last_visit, avg_frequency_days, last_visit_date, total_visits')
          .eq('tenant_id', tenantId)
          .then((result) => ({
            ...result,
            data: ownedClientIds
              ? (result.data ?? []).filter((row) => ownedClientIds.has(row.client_id))
              : result.data,
          })),
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

  return {
    clienti: ctx.currentStaff.role === 'receptionist'
      ? clienti.map(redactClienteRowForReceptionist)
      : clienti,
    tenantId,
  }
}

// ─── Dettaglio cliente ────────────────────────────────────────────────────────

export interface ClienteInfo {
  id: string
  fullName: string
  phone: string | null
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
  const ctx = await getClientiActorContext()
  if (!ctx) return null

  const accessLevel = await assertClientAccess(ctx, clienteId)
  const { tenantId, db } = ctx

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

  // ── 3–5. Round A: appointment_services, appointment_products, staff_members in parallel ──
  const staffIds = [...new Set(appts.map((a) => a.staff_id).filter(Boolean))]
  const [{ data: rawSvcs }, { data: rawProds }, { data: rawStaff }] = await Promise.all([
    apptIds.length
      ? db.from('appointment_services').select('appointment_id, service_id, price_at_booking').eq('tenant_id', tenantId).in('appointment_id', apptIds)
      : Promise.resolve({ data: [] as { appointment_id: string; service_id: string; price_at_booking: number }[] }),
    apptIds.length
      ? db.from('appointment_products').select('appointment_id, product_id, quantity, price_at_sale').eq('tenant_id', tenantId).in('appointment_id', apptIds)
      : Promise.resolve({ data: [] as { appointment_id: string; product_id: string; quantity: number; price_at_sale: number }[] }),
    staffIds.length
      ? db.from('staff_members').select('id, profile_id').in('id', staffIds)
      : Promise.resolve({ data: [] as { id: string; profile_id: string }[] }),
  ])

  const svcRows = (rawSvcs ?? []) as { appointment_id: string; service_id: string; price_at_booking: number }[]
  const svcIds = [...new Set(svcRows.map((s) => s.service_id))]
  const prodRows = (rawProds ?? []) as { appointment_id: string; product_id: string; quantity: number; price_at_sale: number }[]
  const prodIds = [...new Set(prodRows.map((p) => p.product_id))]
  const profileIds = [...new Set((rawStaff ?? []).map((s) => s.profile_id).filter(Boolean))]

  // ── Round B: service names, product details, profiles in parallel ────────────
  const [{ data: rawSvcNames }, { data: rawProdDetails }, { data: rawProfiles }] = await Promise.all([
    svcIds.length
      ? db.from('services').select('id, name').in('id', svcIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    prodIds.length
      ? db.from('products').select('id, name, brand').in('id', prodIds)
      : Promise.resolve({ data: [] as { id: string; name: string; brand: string | null }[] }),
    profileIds.length
      ? db.from('profiles').select('id, full_name').in('id', profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])

  const svcNameMap = new Map((rawSvcNames ?? []).map((s) => [s.id, s.name]))
  const prodDetailMap = new Map((rawProdDetails ?? []).map((p) => [p.id, { name: p.name, brand: p.brand }]))
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

  // O(1) lookup map — built once, replaces appts.find() in both reduces
  const apptStatusMap = new Map(
    appts.map((a) => [a.id, a.status])
  )

  const svcSpend = svcRows.reduce((sum, s) => {
    const status = apptStatusMap.get(s.appointment_id)
    return status === 'completed' ? sum + Number(s.price_at_booking) : sum
  }, 0)
  const prodSpend = prodRows.reduce((sum, p) => {
    const status = apptStatusMap.get(p.appointment_id)
    return status === 'completed' ? sum + Number(p.price_at_sale) * Number(p.quantity) : sum
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

  const fullData: ClienteDettaglioData = {
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

  return accessLevel === 'receptionist'
    ? redactClienteDettaglioForReceptionist(fullData)
    : fullData
}

// ─── addClienteNota ───────────────────────────────────────────────────────────

export async function addClienteNota(
  clienteId: string,
  noteText: string,
): Promise<{ error?: string }> {
  const trimmed = noteText.trim()
  if (!trimmed) return { error: 'La nota non può essere vuota' }

  const ctx = await getClientiActorContext()
  if (!ctx) return { error: 'Non autorizzato' }
  if (!canWritePrivateNotes(ctx.currentStaff.role)) {
    return { error: 'Non autorizzato' }
  }

  const tenantId = await getClientTenantId(ctx.db, clienteId)
  if (!tenantId) return { error: 'Cliente non trovato' }
  if (tenantId !== ctx.tenantId) return { error: 'Non autorizzato' }

  if (ctx.currentStaff.role === 'staff') {
    const ownedClientIds = await getStaffClientIds(ctx.db, ctx.tenantId, ctx.currentStaff.id)
    if (!ownedClientIds.has(clienteId)) {
      return { error: 'Non autorizzato' }
    }
  }

  const { error } = await ctx.db.from('client_notes').insert({
    tenant_id: ctx.tenantId,
    client_id: clienteId,
    staff_id: ctx.currentStaff.id,
    note_text: trimmed,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clienti/${clienteId}`)
  return {}
}

export async function createCliente(input: {
  fullName: string
  email?: string | null
  phone?: string | null
  preferredChannel?: 'whatsapp' | 'email' | 'sms'
  marketingConsent?: boolean
}): Promise<{ success: boolean; error?: string; clienteId?: string }> {
  const trimmed = input.fullName?.trim()
  if (!trimmed) return { success: false, error: 'Nome obbligatorio' }

  const ctx = await getClientiActorContext()
  if (!ctx) return { success: false, error: 'Non autorizzato' }
  if (!canCreateClient(ctx.currentStaff.role)) {
    return { success: false, error: 'Non autorizzato' }
  }

  const { data, error } = await ctx.db.from('clients').insert({
    tenant_id: ctx.tenantId,
    full_name: trimmed,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    preferred_contact_channel: input.preferredChannel ?? 'whatsapp',
    marketing_consent: input.marketingConsent ?? false,
    tags: '["active"]',
  }).select('id').single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/clienti')
  return { success: true, clienteId: data?.id }
}

// ─── Import clienti da CSV ─────────────────────────────────────

import {
  normalizePhone,
  normalizeEmail,
  parseDateOfBirth,
  parseBooleanField,
  parseCsvTags,
} from '@/lib/utils/client-import-utils'

export {
  type ImportClientsInput,
  type ImportClientsResult,
  type ImportError,
  type ImportColumn,
  type ImportRow,
  normalizePhone,
  normalizeEmail,
  parseDateOfBirth,
  parseBooleanField,
  parseCsvTags,
}

export async function importClients(
  input: ImportClientsInput,
): Promise<ImportClientsResult> {
  const ctx = await getClientiActorContext()
  if (!ctx) {
    return { success: false, status: 'failed', error: 'Non autorizzato', imported: 0, merged: 0, skipped: 0, errors: [] }
  }
  if (!hasFullCrmAccess(ctx.currentStaff.role)) {
    return { success: false, status: 'failed', error: 'Non autorizzato', imported: 0, merged: 0, skipped: 0, errors: [] }
  }

  const { tenantId, db } = ctx
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, status: 'failed', error: 'Non autenticato', imported: 0, merged: 0, skipped: 0, errors: [] }
  }

  if (!input.rows || input.rows.length === 0) {
    return { success: false, status: 'failed', error: 'Nessuna riga da importare', imported: 0, merged: 0, skipped: 0, errors: [] }
  }
  if (input.rows.length > 10_000) {
    return { success: false, status: 'failed', error: 'Massimo 10.000 righe per file', imported: 0, merged: 0, skipped: 0, errors: [] }
  }

  const hasName = Object.values(input.mapping).includes('full_name')
  if (!hasName) {
    return { success: false, status: 'failed', error: 'Devi mappare almeno la colonna Nome', imported: 0, merged: 0, skipped: 0, errors: [] }
  }

  const { data: existing } = await db
    .from('clients')
    .select('id, full_name, email, phone, date_of_birth, marketing_consent, tags')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  const plan = prepareClientImportPlan({
    tenantId,
    existingClients: (existing ?? []) as Array<{
      id: string
      full_name: string | null
      email: string | null
      phone: string | null
      date_of_birth: string | null
      marketing_consent: boolean
      tags: Json | null
    }>,
    rows: input.rows,
    mapping: input.mapping,
    duplicateStrategy: input.duplicateStrategy,
    fallbackTags: ['imported'],
  })

  const errors: ImportError[] = [...plan.errors]
  const toInsert = plan.toInsert
  const skipped = plan.skipped
  const merged = plan.merged

  async function applyClientUpdate(update: ClientImportUpdate): Promise<void> {
    const patch: TablesUpdate<'clients'> = { ...update.patch }
    const { error } = await db
      .from('clients')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('id', update.id)

    if (error) {
      errors.push({ rowIndex: 0, message: `Errore DB (merge): ${error.message}` })
    }
  }

  for (const update of plan.toUpdate) {
    await applyClientUpdate(update)
  }

  let imported = 0
  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500)
      const { error, count } = await db
        .from('clients')
        .insert(chunk, { count: 'exact' })
      if (error) {
        errors.push({ rowIndex: 0, message: `Errore DB: ${error.message}` })
        break
      }
      imported += count ?? chunk.length
    }
  }

  const result = buildImportClientsResult({
    imported,
    merged,
    skipped,
    errors,
  })

  const { data: jobRow } = await db
    .from('client_import_jobs')
    .insert({
      tenant_id: tenantId,
      initiated_by: user.id,
      source: input.source,
      filename: input.filename ?? null,
      total_rows: input.rows.length,
      imported_count: imported,
      merged_count: merged,
      skipped_count: skipped,
      error_count: errors.length,
      errors: errors.slice(0, 100) as unknown as Json,
      status: result.status,
    })
    .select('id')
    .single()

  revalidatePath('/dashboard/clienti')

  return {
    ...result,
    jobId: jobRow?.id,
  }
}
