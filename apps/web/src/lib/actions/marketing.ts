'use server'

import { createAdminClient } from '@/lib/supabase/admin'

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
  try {
    const db  = createAdminClient()
    const now = Date.now()
    const DAY = 86_400_000

    // Fetch all completed, non-deleted appointments for the tenant (newest first)
    const { data: appts, error: apptError } = await db
      .from('appointments')
      .select('id, client_id, start_time')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('start_time', { ascending: false })

    if (apptError) {
      console.error('[getRetentionData] appointments error:', apptError)
      return EMPTY
    }

    if (!appts || appts.length === 0) return EMPTY

    // Keep only the latest completed appointment per client
    const latestByClient = new Map<string, { id: string; client_id: string; start_time: string }>()
    for (const appt of appts) {
      if (!appt.client_id) continue
      if (!latestByClient.has(appt.client_id)) latestByClient.set(appt.client_id, appt)
    }

    // Classify by segment (only clients who have been absent >45 days)
    const cutoff45  = 45  * DAY
    const cutoff90  = 90  * DAY
    const cutoff180 = 180 * DAY

    type SegmentInfo = { apptId: string; days: number; segment: 'rischio' | 'winback' | 'persi' }
    const segmented = new Map<string, SegmentInfo>()

    for (const [clientId, appt] of latestByClient) {
      const elapsed = now - new Date(appt.start_time).getTime()
      if (elapsed < cutoff45) continue

      let segment: 'rischio' | 'winback' | 'persi'
      if      (elapsed <= cutoff90)  segment = 'rischio'
      else if (elapsed <= cutoff180) segment = 'winback'
      else                           segment = 'persi'

      segmented.set(clientId, { apptId: appt.id, days: Math.floor(elapsed / DAY), segment })
    }

    if (segmented.size === 0) return EMPTY

    const clientIds = [...segmented.keys()]
    const apptIds   = [...segmented.values()].map((v) => v.apptId)

    // Fetch client names (exclude deleted)
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

    // Fetch service names for the latest appointment of each retention client
    // TODO: join con appointment_services + services se serve più granularità
    const { data: apptSvcs } = await db
      .from('appointment_services')
      .select('appointment_id, services(name)')
      .eq('tenant_id', tenantId)
      .in('appointment_id', apptIds)

    const serviceByAppt = new Map<string, string>()
    for (const row of apptSvcs ?? []) {
      if (serviceByAppt.has(row.appointment_id)) continue
      const svc = Array.isArray(row.services) ? row.services[0] : row.services
      const name = (svc as { name?: string } | null)?.name
      if (name) serviceByAppt.set(row.appointment_id, name)
    }

    const clientNameMap = new Map<string, string>(
      (clients ?? []).map((c) => [c.id, c.full_name as string])
    )

    const result: RetentionData = { rischio: [], winback: [], persi: [] }

    for (const [clientId, info] of segmented) {
      const name = clientNameMap.get(clientId)
      if (!name) continue // deleted client — skip

      result[info.segment].push({
        id:             clientId,
        name,
        daysSinceVisit: info.days,
        lastService:    serviceByAppt.get(info.apptId) ?? null,
        segment:        info.segment,
      })
    }

    // Sort each segment: most at-risk (longest absence) first
    for (const seg of ['rischio', 'winback', 'persi'] as const) {
      result[seg].sort((a, b) => b.daysSinceVisit - a.daysSinceVisit)
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
