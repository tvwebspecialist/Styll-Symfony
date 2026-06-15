/**
 * POST /api/cron/recalculate-analytics
 *
 * Cron giornaliero (Vercel) — 6:00 UTC, prima di /api/cron/reminders (7:00 UTC),
 * così i dati churn sono freschi quando il cron reminder/notifiche li legge.
 *
 * Ricalcola client_analytics per ogni cliente non soft-deleted:
 *   total_visits, last_visit_date, avg_frequency_days,
 *   days_since_last_visit, churn_status (unknown|green|yellow|red).
 *
 * Logica e soglie sono nella SQL function `recompute_client_analytics(uuid)`
 * (e wrapper `recompute_all_client_analytics()`):
 *   - green:   days_since <= avg_freq_days
 *   - yellow:  days_since <= avg_freq_days * 1.5
 *   - red:     altrimenti
 *   - unknown: < 2 visite completate o avg_freq non calcolabile
 *
 * Sicurezza: header Authorization: Bearer <CRON_SECRET>.
 * Idempotenza: SQL function fa UPSERT su client_analytics.client_id (PK).
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/recalculate-analytics", "schedule": "0 6 * * *" }
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ChurnSummary {
  total: number
  green: number
  yellow: number
  red: number
  unknown: number
}

async function getBreakdown(): Promise<ChurnSummary> {
  const db = createAdminClient()
  const { data } = await db
    .from('client_analytics')
    .select('churn_status')

  const summary: ChurnSummary = { total: 0, green: 0, yellow: 0, red: 0, unknown: 0 }
  for (const row of (data ?? []) as Array<{ churn_status: string }>) {
    summary.total++
    if (row.churn_status === 'green')        summary.green++
    else if (row.churn_status === 'yellow')  summary.yellow++
    else if (row.churn_status === 'red')     summary.red++
    else                                     summary.unknown++
  }
  return summary
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/recalculate-analytics] CRON_SECRET non configurato')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const startedAt = Date.now()

  const { data: processed, error } = await db.rpc('recompute_all_client_analytics')
  if (error) {
    console.error('[cron/recalculate-analytics] rpc error:', error.message)
    return NextResponse.json({ error: 'Recalculation failed', details: error.message }, { status: 500 })
  }

  const breakdown = await getBreakdown()
  const durationMs = Date.now() - startedAt

  const result = {
    processed: processed ?? 0,
    ...breakdown,
    durationMs,
  }

  console.info('[cron/recalculate-analytics]', JSON.stringify(result))
  return NextResponse.json(result)
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Use POST with Bearer CRON_SECRET to trigger recalculation',
  })
}
