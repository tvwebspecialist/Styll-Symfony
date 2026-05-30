'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'

export interface RetentionClient {
  id:             string
  name:           string
  daysSinceVisit: number
  lastService:    string | null
  segment:        'rischio' | 'winback' | 'persi'
}

export interface RetentionData {
  rischio: RetentionClient[]
  winback: RetentionClient[]
  persi:   RetentionClient[]
}

const EMPTY: RetentionData = { rischio: [], winback: [], persi: [] }

export async function getRetentionData(tenantId: string): Promise<RetentionData> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }

  try {
    const db = createAdminClient()

    // ── 1. Pre-computed churn analytics: only at-risk clients ─────────────────
    const { data: analyticsRows, error: analyticsError } = await db
      .from('client_analytics')
      .select('client_id, churn_status, days_since_last_visit, avg_frequency_days')
      .eq('tenant_id', tenantId)
      .in('churn_status', ['yellow', 'red'])

    if (analyticsError) {
      console.error('[getRetentionData] analytics error:', analyticsError)
      return EMPTY
    }

    if (!analyticsRows || analyticsRows.length === 0) return EMPTY

    // ── 2. Classify each row into a segment ───────────────────────────────────
    const grouped: Record<'rischio' | 'winback' | 'persi', Array<{ clientId: string; days: number }>> = {
      rischio: [],
      winback: [],
      persi:   [],
    }

    for (const row of analyticsRows) {
      const days = row.days_since_last_visit ?? 0
      let segment: 'rischio' | 'winback' | 'persi'

      if (row.churn_status === 'yellow') {
        segment = 'rischio'
      } else {
        // red — winback if still within 3× personal frequency, otherwise persi
        const avg = row.avg_frequency_days
        segment = avg != null && days <= avg * 3 ? 'winback' : 'persi'
      }

      grouped[segment].push({ clientId: row.client_id, days })
    }

    // ── 3. Sort by absence (desc) and cap at 50 per segment ───────────────────
    for (const seg of ['rischio', 'winback', 'persi'] as const) {
      grouped[seg].sort((a, b) => b.days - a.days)
      grouped[seg] = grouped[seg].slice(0, 50)
    }

    const clientIds = [
      ...grouped.rischio.map((r) => r.clientId),
      ...grouped.winback.map((r) => r.clientId),
      ...grouped.persi.map((r)   => r.clientId),
    ]

    if (clientIds.length === 0) return EMPTY

    // ── 4. Client names (exclude soft-deleted) ─────────────────────────────────
    const { data: clients, error: clientError } = await db
      .from('clients')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .in('id', clientIds)
      .is('deleted_at', null)

    if (clientError) {
      console.error('[getRetentionData] clients error:', clientError)
      return EMPTY
    }

    const clientNameMap = new Map<string, string>(
      (clients ?? []).map((c) => [c.id, c.full_name as string]),
    )

    // ── 5. Last completed appointment per client (needed only for lastService) ─
    const { data: appts } = await db
      .from('appointments')
      .select('id, client_id')
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('start_time', { ascending: false })

    const latestApptByClient = new Map<string, string>() // client_id → appt_id
    for (const appt of appts ?? []) {
      if (!appt.client_id) continue
      if (!latestApptByClient.has(appt.client_id)) {
        latestApptByClient.set(appt.client_id, appt.id)
      }
    }

    const apptIds = [...latestApptByClient.values()]

    // ── 6. Service names for those appointments ────────────────────────────────
    const { data: apptSvcs } = apptIds.length
      ? await db
          .from('appointment_services')
          .select('appointment_id, services(name)')
          .eq('tenant_id', tenantId)
          .in('appointment_id', apptIds)
      : { data: [] as { appointment_id: string; services: { name: string } | { name: string }[] | null }[] }

    const serviceByAppt = new Map<string, string>()
    for (const row of apptSvcs ?? []) {
      if (serviceByAppt.has(row.appointment_id)) continue
      const svc = Array.isArray(row.services) ? row.services[0] : row.services
      const name = (svc as { name?: string } | null)?.name
      if (name) serviceByAppt.set(row.appointment_id, name)
    }

    // ── 7. Assemble result (already sorted + capped in step 3) ────────────────
    const result: RetentionData = { rischio: [], winback: [], persi: [] }

    for (const seg of ['rischio', 'winback', 'persi'] as const) {
      for (const { clientId, days } of grouped[seg]) {
        const name = clientNameMap.get(clientId)
        if (!name) continue // deleted client — skip

        const apptId = latestApptByClient.get(clientId)
        result[seg].push({
          id:             clientId,
          name,
          daysSinceVisit: days,
          lastService:    apptId ? (serviceByAppt.get(apptId) ?? null) : null,
          segment:        seg,
        })
      }
    }

    return result
  } catch (err) {
    console.error('[getRetentionData] unexpected error:', err)
    return EMPTY
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGGI
// TABELLA NON TROVATA: message_templates — verifica DATABASE.md
// TABELLA NON TROVATA: messages_log     — verifica DATABASE.md
// ─────────────────────────────────────────────────────────────────────────────

export interface SegmentCounts {
  total:   number
  rischio: number
  vip:     number
  winback: number
}

export async function getSegmentCounts(tenantId: string): Promise<SegmentCounts> {
  try {
    const db = createAdminClient()

    const [clientsRes, analyticsRes] = await Promise.all([
      // Total active clients
      db
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      // At-risk + VIP data from analytics
      db
        .from('client_analytics')
        .select('churn_status, avg_frequency_days, days_since_last_visit, total_visits')
        .eq('tenant_id', tenantId),
    ])

    const total   = clientsRes.count ?? 0
    const rows    = analyticsRes.data ?? []

    let rischio = 0
    let winback = 0
    let vip     = 0

    for (const row of rows) {
      if ((row.total_visits ?? 0) >= 10) vip++

      if (row.churn_status === 'yellow') {
        rischio++
      } else if (row.churn_status === 'red') {
        const avg  = row.avg_frequency_days
        const days = row.days_since_last_visit ?? 0
        if (avg != null && days <= avg * 3) winback++
      }
    }

    return { total, rischio, vip, winback }
  } catch (err) {
    console.error('[getSegmentCounts] error:', err)
    return { total: 0, rischio: 0, vip: 0, winback: 0 }
  }
}

export interface MessageAutomation {
  id:          string
  name:        string
  triggerType: string
  isActive:    boolean
  timing:      string
  channel:     string
}

export interface MessageLogEntry {
  id:        string
  recipient: string
  type:      string
  status:    string
  sentAt:    string
  costCents: number | null
}

export interface MessagesData {
  automations: MessageAutomation[]
  log:         MessageLogEntry[]
}

const EMPTY_MESSAGES: MessagesData = { automations: [], log: [] }

export async function getMessagesData(
  _tenantId: string,
  _days: number = 30,
): Promise<MessagesData> {
  // TABELLA NON TROVATA: message_templates — verifica DATABASE.md
  // TABELLA NON TROVATA: messages_log — verifica DATABASE.md
  return EMPTY_MESSAGES
}

export async function toggleAutomation(
  _id: string,
  _isActive: boolean,
): Promise<{ success: boolean }> {
  // TABELLA NON TROVATA: message_templates — verifica DATABASE.md
  return { success: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMOZIONI
// TABELLA NON TROVATA: promotions/offers/discounts/promo_codes — verifica DATABASE.md
// ─────────────────────────────────────────────────────────────────────────────

export interface Promozione {
  id:            string
  title:         string
  description:   string | null
  discountType:  string
  discountValue: number
  expiresAt:     string | null
  usageCount:    number
  isActive:      boolean
}

export async function getPromozioni(_tenantId: string): Promise<Promozione[]> {
  // TABELLA NON TROVATA: promotions/offers/discounts/promo_codes — verifica DATABASE.md
  return []
}

// ─────────────────────────────────────────────────────────────────────────────
// REPUTAZIONE
// TABELLA NON TROVATA: reviews — verifica DATABASE.md
// ─────────────────────────────────────────────────────────────────────────────

export interface Review {
  id:         string
  clientName: string
  rating:     number
  body:       string | null
  createdAt:  string
  replyBody:  string | null
  source:     string | null
}

export interface ReputazioneData {
  reviews:      Review[]
  avgRating:    number | null
  totalReviews: number
  nps:          number | null
}

const EMPTY_REPUTAZIONE: ReputazioneData = {
  reviews:      [],
  avgRating:    null,
  totalReviews: 0,
  nps:          null,
}

export async function getReputazioneData(_tenantId: string): Promise<ReputazioneData> {
  // TABELLA NON TROVATA: reviews — verifica DATABASE.md
  return EMPTY_REPUTAZIONE
}
