/**
 * POST /api/cron/recalculate-analytics
 *
 * Cron giornaliero (Vercel) — 6:00 UTC, prima di /api/cron/reminders (7:00 UTC),
 * così i dati churn sono freschi quando il cron reminder/notifiche li legge.
 *
 * Flusso:
 *   1. Snapshot vecchio churn_status (prima del recompute)
 *   2. RPC recompute_all_client_analytics() — UPSERT set-based in SQL
 *   3. Fetch nuovi dati con client.full_name (unico round-trip post-recompute)
 *   4. Diff vecchio vs nuovo → notifica churn_alert solo su peggioramenti
 *      (unknown|green → yellow, any → red se peggiora)
 *   5. Ritorna breakdown completo + churnAlertsCreated
 *
 * Nota implementativa: il confronto old/new avviene lato route (2 SELECT + 1 RPC).
 * Con 46 clienti è trascurabile. Se i clienti crescono oltre ~10k, spostare
 * il diff nella funzione RPC per eliminare i round-trip.
 *
 * Sicurezza: header Authorization: Bearer <CRON_SECRET>.
 * Idempotenza: RPC fa UPSERT; notifiche generate solo su peggioramenti,
 *   quindi la stessa transizione red→red non genera duplicati.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/recalculate-analytics", "schedule": "0 6 * * *" }
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { insertStaffNotification, abbrevName } from '@/lib/notifications'

// Gravità crescente: unknown < green < yellow < red
const SEVERITY: Record<string, number> = {
  unknown: 0,
  green:   1,
  yellow:  2,
  red:     3,
}

/**
 * Ritorna true se il nuovo status è yellow o red AND peggiore del vecchio.
 * Non genera alert per stasi (red→red) o miglioramenti (red→yellow).
 */
function isDeterioration(newStatus: string, oldStatus: string): boolean {
  if (newStatus !== 'yellow' && newStatus !== 'red') return false
  return (SEVERITY[newStatus] ?? 0) > (SEVERITY[oldStatus] ?? 0)
}

type AnalyticsRow = {
  client_id: string
  tenant_id: string
  churn_status: string
  days_since_last_visit: number | null
  avg_frequency_days: number | null
  clients: { full_name: string | null } | null
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

  // ── 1. Snapshot vecchio churn_status ──────────────────────────────────────
  const { data: prevData } = await db
    .from('client_analytics')
    .select('client_id, churn_status')

  const prevStatus = new Map<string, string>(
    ((prevData ?? []) as Array<{ client_id: string; churn_status: string }>)
      .map((r) => [r.client_id, r.churn_status]),
  )

  // ── 2. Recompute ──────────────────────────────────────────────────────────
  const { data: processed, error } = await db.rpc('recompute_all_client_analytics')
  if (error) {
    console.error('[cron/recalculate-analytics] rpc error:', error.message)
    return NextResponse.json({ error: 'Recalculation failed', details: error.message }, { status: 500 })
  }

  // ── 3. Fetch nuovi dati + nome cliente (unico round-trip post-recompute) ──
  const { data: newData } = await db
    .from('client_analytics')
    .select('client_id, tenant_id, churn_status, days_since_last_visit, avg_frequency_days, clients(full_name)')

  const rows = (newData ?? []) as unknown as AnalyticsRow[]

  // ── 4. Diff + notifiche churn_alert ───────────────────────────────────────
  let churnAlertsCreated = 0
  const breakdown = { total: 0, green: 0, yellow: 0, red: 0, unknown: 0 }

  for (const row of rows) {
    // Accumula breakdown
    breakdown.total++
    if (row.churn_status === 'green')       breakdown.green++
    else if (row.churn_status === 'yellow') breakdown.yellow++
    else if (row.churn_status === 'red')    breakdown.red++
    else                                    breakdown.unknown++

    // Confronto con snapshot precedente
    const oldStatus = prevStatus.get(row.client_id) ?? 'unknown'
    if (!isDeterioration(row.churn_status, oldStatus)) continue

    // Peggioramento rilevato → crea notifica staff (fire-and-forget)
    const fullName = row.clients?.full_name ?? 'Cliente'
    const daysSince = row.days_since_last_visit ?? 0
    const avgFreq = row.avg_frequency_days != null
      ? Math.round(Number(row.avg_frequency_days))
      : null

    const body = avgFreq != null
      ? `${abbrevName(fullName)} non viene da ${daysSince} giorni — di solito ogni ${avgFreq}`
      : `${abbrevName(fullName)} non viene da ${daysSince} giorni`

    insertStaffNotification({
      tenantId: row.tenant_id,
      type: 'churn_alert',
      title: row.churn_status === 'red' ? 'Cliente a rischio alto' : 'Cliente a rischio',
      body,
      meta: {
        client_id:            row.client_id,
        churn_status:         row.churn_status,
        days_since_last_visit: daysSince,
        previous_status:      oldStatus,
      },
    })

    churnAlertsCreated++
  }

  const result = {
    processed:         processed ?? 0,
    churnAlertsCreated,
    ...breakdown,
    durationMs: Date.now() - startedAt,
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
