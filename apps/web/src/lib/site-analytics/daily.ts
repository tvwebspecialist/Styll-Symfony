export type SiteAnalyticsSurface = 'website' | 'pwa'

export interface SiteAnalyticsDailyRow {
  tenant_id: string
  date: string
  app_surface: string
  sessions: number
  page_views: number
  unique_visitors: number
  booking_started: number
  booking_completed: number
  conversion_rate: number
  new_signups: number
  logins: number
  mobile_sessions: number
  desktop_sessions: number
}

interface SiteAnalyticsQuery
  extends PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }> {
  eq(col: string, val: string): SiteAnalyticsQuery
  gte(col: string, val: string): SiteAnalyticsQuery
  lt(col: string, val: string): SiteAnalyticsQuery
  order(col: string, opts?: { ascending?: boolean }): SiteAnalyticsQuery
}

export interface SiteAnalyticsDb {
  from(table: string): {
    select(cols: string): SiteAnalyticsQuery
  }
}

interface FetchSiteAnalyticsDailyRowsOptions {
  context: string
  tenantId?: string
  surface?: SiteAnalyticsSurface
  since?: string
  until?: string
}

interface DeviceBreakdown {
  mobile_sessions: number
  desktop_sessions: number
}

const SITE_ANALYTICS_DAILY_SELECT = [
  'tenant_id',
  'date',
  'app_surface',
  'sessions',
  'page_views',
  'unique_visitors',
  'booking_started_count',
  'booking_completed_count',
  'signup_count',
  'conversion_rate',
  'device_breakdown',
].join(',')

function num(value: unknown): number {
  return typeof value === 'number' ? value : Number(value) || 0
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readCount(value: unknown): number {
  if (typeof value === 'number' || typeof value === 'string') {
    return num(value)
  }

  const record = asRecord(value)
  if (!record) return 0

  return num(record.count ?? record.sessions ?? record.value)
}

function normalizeDeviceBreakdown(value: unknown): DeviceBreakdown {
  const emptyBreakdown = { mobile_sessions: 0, desktop_sessions: 0 }

  const record = asRecord(value)
  if (record) {
    let mobileSessions = 0
    let desktopSessions = 0

    for (const [key, rawValue] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase()
      const count = readCount(rawValue)

      if (normalizedKey.includes('mobile')) mobileSessions += count
      if (normalizedKey.includes('desktop')) desktopSessions += count
    }

    if (
      mobileSessions > 0 ||
      desktopSessions > 0 ||
      'mobile' in record ||
      'desktop' in record ||
      'mobile_sessions' in record ||
      'desktop_sessions' in record
    ) {
      return {
        mobile_sessions: mobileSessions,
        desktop_sessions: desktopSessions,
      }
    }
  }

  if (Array.isArray(value)) {
    let mobileSessions = 0
    let desktopSessions = 0

    for (const entry of value) {
      const item = asRecord(entry)
      if (!item) continue

      const label = str(item.device ?? item.type ?? item.label ?? item.name).toLowerCase()
      const count = readCount(item.count ?? item.sessions ?? item.value)

      if (label.includes('mobile')) mobileSessions += count
      if (label.includes('desktop')) desktopSessions += count
    }

    return {
      mobile_sessions: mobileSessions,
      desktop_sessions: desktopSessions,
    }
  }

  return emptyBreakdown
}

function normalizeSiteAnalyticsDailyRow(row: Record<string, unknown>): SiteAnalyticsDailyRow {
  const { mobile_sessions, desktop_sessions } = normalizeDeviceBreakdown(row.device_breakdown)

  return {
    tenant_id: str(row.tenant_id),
    date: str(row.date),
    app_surface: str(row.app_surface),
    sessions: num(row.sessions),
    page_views: num(row.page_views),
    unique_visitors: num(row.unique_visitors),
    booking_started: num(row.booking_started_count),
    booking_completed: num(row.booking_completed_count),
    conversion_rate: num(row.conversion_rate),
    new_signups: num(row.signup_count),
    logins: 0,
    mobile_sessions,
    desktop_sessions,
  }
}

function logSiteAnalyticsDailyError(
  context: string,
  error: unknown,
  { tenantId, surface, since, until }: Omit<FetchSiteAnalyticsDailyRowsOptions, 'context'>,
): void {
  console.error(`[site-analytics-daily] ${context} query failed`, {
    tenantId: tenantId ?? null,
    surface: surface ?? null,
    since: since ?? null,
    until: until ?? null,
    error,
  })
}

export async function fetchSiteAnalyticsDailyRows(
  db: SiteAnalyticsDb,
  options: FetchSiteAnalyticsDailyRowsOptions,
): Promise<SiteAnalyticsDailyRow[]> {
  let query = db.from('site_analytics_daily').select(SITE_ANALYTICS_DAILY_SELECT)

  if (options.tenantId) {
    query = query.eq('tenant_id', options.tenantId)
  }

  if (options.surface) {
    query = query.eq('app_surface', options.surface)
  }

  if (options.since) {
    query = query.gte('date', options.since)
  }

  if (options.until) {
    query = query.lt('date', options.until)
  }

  const { data, error } = await query.order('date', { ascending: true })

  if (error) {
    logSiteAnalyticsDailyError(options.context, error, options)
    return []
  }

  return (data ?? []).map(normalizeSiteAnalyticsDailyRow)
}
