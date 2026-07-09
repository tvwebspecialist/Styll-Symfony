/**
 * POST /api/cron/recalculate-analytics
 *
 * Cron giornaliero (Vercel) — 6:00 UTC, prima di /api/cron/reminders (7:00 UTC),
 * cosi i dati churn sono freschi quando il cron reminder/notifiche li legge.
 *
 * Flusso:
 *   1. Snapshot vecchio churn_status
 *   2. RPC recompute_all_client_analytics() — UPSERT set-based in SQL
 *   3. Fetch nuovi dati con client.full_name
 *   4. Diff old/new -> notifica churn_alert solo su peggioramenti
 *      (unknown|green -> yellow, any -> red se peggiora)
 *   5. Ritorna breakdown completo + churnAlertsCreated
 *
 * Idempotenza:
 *   - la RPC e` un bulk upsert set-based
 *   - le notifiche sono emesse solo su peggioramenti rispetto allo snapshot
 *     precedente, quindi yellow->yellow / red->red non duplicano alert
 */

import type { NextRequest } from 'next/server'
import {
  createRecalculateAnalyticsDeps,
  handleRecalculateAnalyticsRequest,
} from './handler'

export async function POST(req: NextRequest) {
  return handleRecalculateAnalyticsRequest(req, createRecalculateAnalyticsDeps())
}

export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'Use POST with Authorization: Bearer <CRON_SECRET> to trigger recalculation',
  })
}
