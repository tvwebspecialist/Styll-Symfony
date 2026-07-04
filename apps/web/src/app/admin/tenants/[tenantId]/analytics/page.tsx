import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/app/admin/actions'
import { notFound } from 'next/navigation'
import { TenantAnalyticsClient } from './analytics-client'

export const dynamic = 'force-dynamic'

// ── DB types ────────────────────────────────────────────────────

interface DailyRaw {
  day: string
  sessions: number
  page_views: number
  booking_started: number
  booking_completed: number
  conversion_rate: number
  new_signups: number
  logins: number
  mobile_sessions: number
  desktop_sessions: number
}

interface ActivityRaw {
  last_login_at: string | null
}

interface UntypedQuery
  extends PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }> {
  eq(col: string, val: string): UntypedQuery
  gte(col: string, val: string): UntypedQuery
  lt(col: string, val: string): UntypedQuery
  order(col: string, opts?: { ascending?: boolean }): UntypedQuery
  limit(n: number): UntypedQuery
}

interface UntypedDb {
  from(table: string): { select(cols: string): UntypedQuery }
}

// ── Period helpers ───────────────────────────────────────────────

const VALID_PERIODS = [7, 30, 90] as const
type ValidPeriod = (typeof VALID_PERIODS)[number]

function parsePeriod(raw: string | string[] | undefined): ValidPeriod {
  const n = parseInt(typeof raw === 'string' ? raw : '30', 10)
  return (VALID_PERIODS.includes(n as ValidPeriod) ? n : 30) as ValidPeriod
}

function sinceDate(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '')
}

// ── Data fetch ───────────────────────────────────────────────────

async function fetchSurfaceData(
  db: UntypedDb,
  tenantId: string,
  surface: 'website' | 'pwa',
  since: string,
): Promise<DailyRaw[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await db
    .from('site_analytics_daily')
    .select('day,sessions,page_views,booking_started,booking_completed,conversion_rate,new_signups,logins,mobile_sessions,desktop_sessions')
    .eq('tenant_id', tenantId)
    .eq('app_surface', surface)
    .gte('day', since)
    .order('day', { ascending: true })

  // DEBUG — remove before shipping
  console.log('[analytics-debug] fetchSurfaceData', {
    surface,
    tenantId,
    since,
    today,
    rowCount: data?.length ?? null,
    firstRow: data?.[0] ?? null,
    error,
  })

  return (data ?? []).map((r) => ({
    day: str(r.day),
    sessions: num(r.sessions),
    page_views: num(r.page_views),
    booking_started: num(r.booking_started),
    booking_completed: num(r.booking_completed),
    conversion_rate: num(r.conversion_rate),
    new_signups: num(r.new_signups),
    logins: num(r.logins),
    mobile_sessions: num(r.mobile_sessions),
    desktop_sessions: num(r.desktop_sessions),
  }))
}

// ── Page ────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ tenantId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TenantAnalyticsPage({ params, searchParams }: PageProps) {
  const auth = await requireSuperadmin()
  if ('error' in auth) {
    return <p className="text-sm" style={{ color: 'var(--admin-accent)' }}>Accesso negato.</p>
  }

  const { tenantId } = await params
  const sp = await searchParams
  const period = parsePeriod(sp.days)
  const since = sinceDate(period)

  const db = createAdminClient() as unknown as UntypedDb

  // Check tenant exists (typed client for known table)
  const adminClient = createAdminClient()
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, business_name, slug')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenant) notFound()

  // Fetch site data per surface in parallel
  const [websiteDaily, pwaDaily] = await Promise.all([
    fetchSurfaceData(db, tenantId, 'website', since),
    fetchSurfaceData(db, tenantId, 'pwa', since),
  ])

  // Dashboard section: last login from tenant_activity_log (graceful degrade)
  let lastLoginAt: string | null = null
  try {
    const { data: activity } = await db
      .from('tenant_activity_log')
      .select('last_login_at')
      .eq('tenant_id', tenantId)
      .limit(1)
    const first = (activity ?? []) as unknown as ActivityRaw[]
    lastLoginAt = first[0]?.last_login_at ?? null
  } catch {
    // table may not exist
  }

  // Appointments in period (typed client)
  const { count: appointmentsInPeriod } = await adminClient
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', new Date(Date.now() - period * 86400000).toISOString())
    .is('deleted_at', null)

  return (
    <TenantAnalyticsClient
      tenantName={tenant.business_name}
      period={period}
      websiteDaily={websiteDaily}
      pwaDaily={pwaDaily}
      lastLoginAt={lastLoginAt}
      appointmentsInPeriod={appointmentsInPeriod ?? 0}
    />
  )
}
