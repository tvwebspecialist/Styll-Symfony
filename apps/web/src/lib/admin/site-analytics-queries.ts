import { createAdminClient } from '@/lib/supabase/admin'

// ── Exported types ──────────────────────────────────────────────

export interface DailyPoint {
  day: string
  sessions: number
  page_views: number
  booking_completed: number
}

export interface TenantAnalyticsRow {
  tenant_id: string
  business_name: string
  slug: string
  sessions: number
  page_views: number
  booking_completed: number
  avg_conversion_rate: number
  days_with_data: number
  last_login_at: string | null
}

export interface PlatformSummary {
  total_sessions: number
  avg_conversion_rate: number
  top_tenant: { name: string; slug: string; sessions: number } | null
  at_risk_count: number
  prev_total_sessions: number
  prev_avg_conversion_rate: number
  mobile_sessions: number
  desktop_sessions: number
  median_sessions: number
  at_risk_threshold: number
}

export interface AdminSiteAnalyticsData {
  summary: PlatformSummary
  daily: DailyPoint[]
  tenants: TenantAnalyticsRow[]
  period_days: number
  insight_text: string
}

// ── Internal DB types ───────────────────────────────────────────

interface UntypedQuery
  extends PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }> {
  gte(col: string, val: string): UntypedQuery
  lt(col: string, val: string): UntypedQuery
  in(col: string, vals: string[]): UntypedQuery
  order(col: string, opts?: { ascending?: boolean }): UntypedQuery
  limit(n: number): UntypedQuery
}

interface UntypedDb {
  from(table: string): {
    select(cols: string): UntypedQuery
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function isoDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '')
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return (current - prev) / prev
}

function buildInsightText(
  totalSessions: number,
  prevTotalSessions: number,
  avgConversionRate: number,
  prevAvgConversionRate: number,
  atRiskCount: number,
): string {
  if (totalSessions === 0) return 'Nessun dato disponibile per il periodo selezionato.'

  const sessionChange = pctChange(totalSessions, prevTotalSessions)
  const convChange = pctChange(avgConversionRate, prevAvgConversionRate)

  const parts: string[] = []

  if (sessionChange !== null) {
    const sign = sessionChange >= 0 ? '+' : ''
    const dir = sessionChange >= 0 ? 'cresciute' : 'calate'
    parts.push(`Le visite sono ${dir} del ${sign}${(sessionChange * 100).toFixed(1)}% rispetto al periodo precedente.`)
  }

  if (convChange !== null && Math.abs(convChange) > 0.001) {
    const sign = convChange >= 0 ? '+' : ''
    const dir = convChange >= 0 ? 'salita' : 'scesa'
    parts.push(`La conversione media è ${dir} del ${sign}${(convChange * 100).toFixed(1)}%.`)
  }

  if (atRiskCount > 0) {
    parts.push(
      `${atRiskCount} tenant ${atRiskCount === 1 ? 'ha' : 'hanno'} traffico elevato ma bassa conversione — contattali per supporto o upsell.`,
    )
  }

  return parts.join(' ') || `${totalSessions.toLocaleString('it-IT')} visite totali nel periodo.`
}

// ── Main export ─────────────────────────────────────────────────

export async function getAdminSiteAnalytics(periodDays: number): Promise<AdminSiteAnalyticsData> {
  const db = createAdminClient() as unknown as UntypedDb

  const now = Date.now()
  const currentSince = isoDate(now - periodDays * 86400000)
  const currentUntil = isoDate(now)
  const prevSince = isoDate(now - 2 * periodDays * 86400000)

  // Current period
  const { data: currentRaw } = await db
    .from('site_analytics_daily')
    .select('tenant_id,day,sessions,page_views,booking_completed,conversion_rate,mobile_sessions,desktop_sessions')
    .gte('day', currentSince)
    .lt('day', currentUntil)
    .order('day', { ascending: true })

  // Previous period (for trends)
  const { data: prevRaw } = await db
    .from('site_analytics_daily')
    .select('tenant_id,sessions,conversion_rate')
    .gte('day', prevSince)
    .lt('day', currentSince)

  // Tenant names
  const tenantIds = Array.from(new Set((currentRaw ?? []).map((r) => str(r.tenant_id))))
  const tenantNames: Record<string, { business_name: string; slug: string }> = {}

  if (tenantIds.length > 0) {
    const { data: tenants } = await db
      .from('tenants')
      .select('id,business_name,slug')
      .in('id', tenantIds)
    for (const t of tenants ?? []) {
      tenantNames[str(t.id)] = { business_name: str(t.business_name), slug: str(t.slug) }
    }
  }

  // Activity log for churn health — degrade silently if table absent
  const activityByTenant: Record<string, string | null> = {}
  try {
    const probe = tenantIds.length > 0 ? tenantIds : ['00000000-0000-0000-0000-000000000000']
    const { data: activity } = await db
      .from('tenant_activity_log')
      .select('tenant_id,last_login_at')
      .in('tenant_id', probe)
      .limit(500)
    for (const a of activity ?? []) {
      activityByTenant[str(a.tenant_id)] = a.last_login_at ? str(a.last_login_at) : null
    }
  } catch {
    // not fatal
  }

  // ── Aggregate per-tenant and per-day ───────────────────────────

  interface TenantAgg {
    sessions: number
    page_views: number
    booking_completed: number
    conversion_sum: number
    mobile: number
    desktop: number
    days: number
  }

  const tenantAgg = new Map<string, TenantAgg>()
  const dailyAgg = new Map<string, { sessions: number; page_views: number; booking_completed: number }>()

  for (const row of currentRaw ?? []) {
    const tid = str(row.tenant_id)
    const day = str(row.day)

    const ta = tenantAgg.get(tid) ?? { sessions: 0, page_views: 0, booking_completed: 0, conversion_sum: 0, mobile: 0, desktop: 0, days: 0 }
    tenantAgg.set(tid, {
      sessions: ta.sessions + num(row.sessions),
      page_views: ta.page_views + num(row.page_views),
      booking_completed: ta.booking_completed + num(row.booking_completed),
      conversion_sum: ta.conversion_sum + num(row.conversion_rate),
      mobile: ta.mobile + num(row.mobile_sessions),
      desktop: ta.desktop + num(row.desktop_sessions),
      days: ta.days + 1,
    })

    const da = dailyAgg.get(day) ?? { sessions: 0, page_views: 0, booking_completed: 0 }
    dailyAgg.set(day, {
      sessions: da.sessions + num(row.sessions),
      page_views: da.page_views + num(row.page_views),
      booking_completed: da.booking_completed + num(row.booking_completed),
    })
  }

  // Build tenants array
  const tenants: TenantAnalyticsRow[] = []
  for (const [tenantId, agg] of tenantAgg.entries()) {
    const info = tenantNames[tenantId]
    if (!info) continue
    tenants.push({
      tenant_id: tenantId,
      business_name: info.business_name,
      slug: info.slug,
      sessions: agg.sessions,
      page_views: agg.page_views,
      booking_completed: agg.booking_completed,
      avg_conversion_rate: agg.days > 0 ? agg.conversion_sum / agg.days : 0,
      days_with_data: agg.days,
      last_login_at: activityByTenant[tenantId] ?? null,
    })
  }
  tenants.sort((a, b) => b.sessions - a.sessions)

  // Build sorted daily series
  const daily: DailyPoint[] = Array.from(dailyAgg.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, agg]) => ({ day, ...agg }))

  // ── Platform-level aggregates ───────────────────────────────────

  const totalSessions = tenants.reduce((s, t) => s + t.sessions, 0)
  const totalMobile = Array.from(tenantAgg.values()).reduce((s, a) => s + a.mobile, 0)
  const totalDesktop = Array.from(tenantAgg.values()).reduce((s, a) => s + a.desktop, 0)
  const convRates = tenants.map((t) => t.avg_conversion_rate)
  const avgConversionRate =
    convRates.length > 0 ? convRates.reduce((s, v) => s + v, 0) / convRates.length : 0
  const topTenant = tenants[0] ?? null

  const sessionValues = tenants.map((t) => t.sessions)
  const medianSessions = median(sessionValues)
  // At-risk: traffic above median AND conversion below half platform average (min 3%)
  const atRiskThreshold = Math.min(avgConversionRate * 0.5, 0.03)
  const atRiskCount = tenants.filter(
    (t) => t.sessions > medianSessions && t.avg_conversion_rate < atRiskThreshold,
  ).length

  // Previous period
  let prevTotalSessions = 0
  let prevConvSum = 0
  let prevConvCount = 0
  for (const row of prevRaw ?? []) {
    prevTotalSessions += num(row.sessions)
    prevConvSum += num(row.conversion_rate)
    prevConvCount++
  }
  const prevAvgConversionRate = prevConvCount > 0 ? prevConvSum / prevConvCount : 0

  return {
    summary: {
      total_sessions: totalSessions,
      avg_conversion_rate: avgConversionRate,
      top_tenant: topTenant
        ? { name: topTenant.business_name, slug: topTenant.slug, sessions: topTenant.sessions }
        : null,
      at_risk_count: atRiskCount,
      prev_total_sessions: prevTotalSessions,
      prev_avg_conversion_rate: prevAvgConversionRate,
      mobile_sessions: totalMobile,
      desktop_sessions: totalDesktop,
      median_sessions: medianSessions,
      at_risk_threshold: atRiskThreshold,
    },
    daily,
    tenants,
    period_days: periodDays,
    insight_text: buildInsightText(
      totalSessions,
      prevTotalSessions,
      avgConversionRate,
      prevAvgConversionRate,
      atRiskCount,
    ),
  }
}
