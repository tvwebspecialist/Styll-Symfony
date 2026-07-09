import { createAdminClient } from '@/lib/supabase/admin'
import { insertStaffNotification, abbrevName } from '@/lib/notifications'

// Gravita crescente: unknown < green < yellow < red
const SEVERITY: Record<string, number> = {
  unknown: 0,
  green: 1,
  yellow: 2,
  red: 3,
}

export type PreviousAnalyticsRow = {
  client_id: string
  churn_status: string
}

export type AnalyticsRow = {
  client_id: string
  tenant_id: string
  churn_status: string
  days_since_last_visit: number | null
  avg_frequency_days: number | null
  clients: { full_name: string | null } | null
}

type ErrorLike = { message: string }

type QueryResult<T> = {
  data: T | null
  error: ErrorLike | null
}

type LogFn = (message: string, ...args: unknown[]) => void

export interface InsertStaffNotificationInput {
  tenantId: string
  type: 'churn_alert'
  title: string
  body?: string
  meta?: Record<string, unknown>
}

export interface RecalculateAnalyticsDeps {
  env: {
    cronSecret?: string
  }
  loadPreviousAnalytics: () => Promise<QueryResult<PreviousAnalyticsRow[]>>
  recomputeAllAnalytics: () => Promise<QueryResult<number>>
  loadCurrentAnalytics: () => Promise<QueryResult<AnalyticsRow[]>>
  insertStaffNotification: (params: InsertStaffNotificationInput) => Promise<void>
  now?: () => number
  logError?: LogFn
  logInfo?: LogFn
}

/**
 * Ritorna true se il nuovo status e` yellow o red AND peggiore del vecchio.
 * Non genera alert per stasi (red->red) o miglioramenti (red->yellow).
 */
export function isDeterioration(newStatus: string, oldStatus: string): boolean {
  if (newStatus !== 'yellow' && newStatus !== 'red') return false
  return (SEVERITY[newStatus] ?? 0) > (SEVERITY[oldStatus] ?? 0)
}

export function createRecalculateAnalyticsDeps(): RecalculateAnalyticsDeps {
  const db = createAdminClient()

  return {
    env: {
      cronSecret: process.env.CRON_SECRET,
    },
    loadPreviousAnalytics: async () => {
      const result = await db
        .from('client_analytics')
        .select('client_id, churn_status')

      return {
        data: (result.data ?? null) as PreviousAnalyticsRow[] | null,
        error: result.error,
      }
    },
    recomputeAllAnalytics: async () => {
      const result = await db.rpc('recompute_all_client_analytics')
      return {
        data: typeof result.data === 'number' ? result.data : null,
        error: result.error,
      }
    },
    loadCurrentAnalytics: async () => {
      const result = await db
        .from('client_analytics')
        .select('client_id, tenant_id, churn_status, days_since_last_visit, avg_frequency_days, clients(full_name)')

      return {
        data: (result.data ?? null) as unknown as AnalyticsRow[] | null,
        error: result.error,
      }
    },
    insertStaffNotification,
    now: () => Date.now(),
    logError: (...args: unknown[]) => console.error(...args),
    logInfo: (...args: unknown[]) => console.info(...args),
  }
}

export async function handleRecalculateAnalyticsRequest(
  req: Request,
  deps: RecalculateAnalyticsDeps,
): Promise<Response> {
  const cronSecret = deps.env.cronSecret
  const logError = deps.logError ?? console.error
  const logInfo = deps.logInfo ?? console.info
  const now = deps.now ?? Date.now

  if (!cronSecret) {
    logError('[cron/recalculate-analytics] CRON_SECRET non configurato')
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = now()

  const { data: previousRows, error: previousError } = await deps.loadPreviousAnalytics()
  if (previousError) {
    logError('[cron/recalculate-analytics] previous snapshot error:', previousError.message)
    return Response.json({ error: 'Previous snapshot failed' }, { status: 500 })
  }

  const previousStatus = new Map(
    (previousRows ?? []).map((row) => [row.client_id, row.churn_status]),
  )

  const { data: processed, error: recomputeError } = await deps.recomputeAllAnalytics()
  if (recomputeError) {
    logError('[cron/recalculate-analytics] rpc error:', recomputeError.message)
    return Response.json({ error: 'Recalculation failed' }, { status: 500 })
  }

  const { data: currentRows, error: currentError } = await deps.loadCurrentAnalytics()
  if (currentError) {
    logError('[cron/recalculate-analytics] current analytics fetch error:', currentError.message)
    return Response.json({ error: 'Current analytics fetch failed' }, { status: 500 })
  }

  let churnAlertsCreated = 0
  const breakdown = { total: 0, green: 0, yellow: 0, red: 0, unknown: 0 }

  for (const row of currentRows ?? []) {
    breakdown.total += 1
    if (row.churn_status === 'green') breakdown.green += 1
    else if (row.churn_status === 'yellow') breakdown.yellow += 1
    else if (row.churn_status === 'red') breakdown.red += 1
    else breakdown.unknown += 1

    const oldStatus = previousStatus.get(row.client_id) ?? 'unknown'
    if (!isDeterioration(row.churn_status, oldStatus)) continue

    const fullName = row.clients?.full_name ?? 'Cliente'
    const daysSince = row.days_since_last_visit ?? 0
    const avgFreq = row.avg_frequency_days != null
      ? Math.round(Number(row.avg_frequency_days))
      : null

    const body = avgFreq != null
      ? `${abbrevName(fullName)} non viene da ${daysSince} giorni — di solito ogni ${avgFreq}`
      : `${abbrevName(fullName)} non viene da ${daysSince} giorni`

    await deps.insertStaffNotification({
      tenantId: row.tenant_id,
      type: 'churn_alert',
      title: row.churn_status === 'red' ? 'Cliente a rischio alto' : 'Cliente a rischio',
      body,
      meta: {
        client_id: row.client_id,
        churn_status: row.churn_status,
        days_since_last_visit: daysSince,
        previous_status: oldStatus,
      },
    })

    churnAlertsCreated += 1
  }

  const result = {
    processed: processed ?? 0,
    churnAlertsCreated,
    ...breakdown,
    durationMs: now() - startedAt,
  }

  logInfo('[cron/recalculate-analytics]', JSON.stringify(result))
  return Response.json(result)
}
