import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/app/admin/actions'
import {
  fetchSiteAnalyticsDailyRows,
  type SiteAnalyticsDb,
  type SiteAnalyticsDailyRow,
  type SiteAnalyticsSurface,
} from '@/lib/site-analytics/daily'
import { notFound } from 'next/navigation'
import { TenantAnalyticsClient } from './analytics-client'

export const dynamic = 'force-dynamic'

// ── DB types ────────────────────────────────────────────────────

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

// ── Data fetch ───────────────────────────────────────────────────

async function fetchSurfaceData(
  db: SiteAnalyticsDb,
  tenantId: string,
  surface: SiteAnalyticsSurface,
  since: string,
): Promise<SiteAnalyticsDailyRow[]> {
  return fetchSiteAnalyticsDailyRows(db, {
    context: `TenantAnalyticsPage ${surface}`,
    tenantId,
    surface,
    since,
  })
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
  const appointmentsSince = `${since}T00:00:00.000Z`

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
    fetchSurfaceData(db as unknown as SiteAnalyticsDb, tenantId, 'website', since),
    fetchSurfaceData(db as unknown as SiteAnalyticsDb, tenantId, 'pwa', since),
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
    .gte('created_at', appointmentsSince)
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
