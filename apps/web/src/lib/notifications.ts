import type { Json } from '@/types'

/**
 * Helper per inserire notifiche in-app per lo staff del tenant.
 * Solo server-side. Non importare in componenti client.
 *
 * profile_id = NULL → broadcast: la riga è visibile a tutto lo staff attivo del tenant.
 *
 * insertStaffNotification fa due cose in parallelo (fire-and-forget):
 *   1. INSERT in `notifications` (centro notifiche in-app, sempre)
 *   2. Push Web Push agli staff con subscription attiva e preferenza abilitata
 *
 * Mapping type → notification_preferences key:
 *   new_booking  → appt_confirmation
 *   cancellation → appt_cancellation
 *   reschedule   → appt_reschedule
 *   new_client   → client_new
 *   churn_alert  → client_churn
 *
 * La notifica in-app viene sempre inserita indipendentemente dalle preferenze;
 * la push segue la preferenza per tipo del destinatario (default true se non impostata).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions, getSubscriptionsForProfile } from '@/lib/push/send-notification'

/** "Luca Esposito" → "Luca E." */
export function abbrevName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0]} ${(parts[parts.length - 1][0] ?? '').toUpperCase()}.`
}

type NotifType =
  | 'new_booking'
  | 'cancellation'
  | 'new_client'
  | 'reschedule'
  | 'churn_alert'
  | 'low_stock'
  | 'loyalty_milestone'

/** Mappa type → chiave in profiles.notification_preferences. */
const TYPE_TO_PREF_KEY: Partial<Record<NotifType, string>> = {
  new_booking:  'appt_confirmation',
  cancellation: 'appt_cancellation',
  reschedule:   'appt_reschedule',
  new_client:   'client_new',
  churn_alert:  'client_churn',
}

interface InsertParams {
  tenantId: string
  type: NotifType
  title: string
  body?: string
  meta?: Record<string, unknown>
}

// ─── Push helpers ────────────────────────────────────────────────────────────

/** Costruisce l'URL di azione per la push a partire da meta. */
function buildPushUrl(_tenantId: string, meta: Record<string, unknown>): string {
  if (meta.client_id) return `/clienti/${meta.client_id}`
  return '/'
}

/**
 * Invia push a tutti gli staff attivi del tenant che:
 *   - hanno la preferenza per questo type abilitata (default true)
 *   - hanno almeno una push_subscription attiva
 *
 * Nota implementativa: itera sugli staff lato route (~pochi record per tenant).
 * Se il numero di staff dovesse superare ~100 per tenant, valutare un batch SQL.
 */
async function sendPushToStaff(params: InsertParams): Promise<void> {
  const { tenantId, type, title, body, meta = {} } = params
  const prefKey = TYPE_TO_PREF_KEY[type]
  const db = createAdminClient()

  console.info('[push/staff] start', { tenantId, type, prefKey })

  // 1. Staff attivi del tenant con profile_id non null
  const { data: staffRows, error: staffErr } = await db
    .from('staff_members')
    .select('profile_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .not('profile_id', 'is', null)

  if (staffErr) {
    console.error('[push/staff] staff_members query error:', staffErr.message)
    return
  }

  if (!staffRows?.length) {
    console.info('[push/staff] no active staff found for tenant', tenantId)
    return
  }

  const profileIds = (staffRows as Array<{ profile_id: string }>).map((r) => r.profile_id)
  console.info('[push/staff] staff profiles found:', profileIds.length)

  // 2. Preferenze notifica di ciascun profilo
  const { data: profileRows, error: profErr } = await db
    .from('profiles')
    .select('id, notification_preferences')
    .in('id', profileIds)

  if (profErr) {
    console.error('[push/staff] profiles query error:', profErr.message)
    return
  }

  const actionUrl = buildPushUrl(tenantId, meta)
  const tag = `${type}-${meta.appointment_id ?? meta.client_id ?? Date.now()}`

  for (const p of (profileRows ?? []) as Array<{
    id: string
    notification_preferences: Record<string, boolean> | null
  }>) {
    // Rispetta la preferenza per tipo (default true se non impostata)
    if (prefKey) {
      const prefs = (p.notification_preferences ?? {}) as Record<string, boolean>
      const prefValue = prefs[prefKey]
      console.info('[push/staff] profile pref check', { profileId: p.id, prefKey, prefValue })
      if (prefValue === false) {
        console.info('[push/staff] skipping — pref disabled', { profileId: p.id, prefKey })
        continue
      }
    }

    const subs = await getSubscriptionsForProfile(tenantId, p.id)
    console.info('[push/staff] subscriptions for profile', { profileId: p.id, count: subs.length })
    if (!subs.length) continue

    const sent = await sendPushToSubscriptions(subs, {
      title,
      body:  body ?? '',
      url:   actionUrl,
      tag,
    })
    console.info('[push/staff] push sent', { profileId: p.id, sent, tag })
  }

  console.info('[push/staff] done', { tenantId, type })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Inserisce la notifica in-app e invia la push Web Push allo staff.
 *
 * L'insert in `notifications` è fire-and-forget (singola query rapida).
 * L'invio push è awaited direttamente: after() non garantiva l'esecuzione
 * in ambiente Vercel Lambda. La latenza aggiunta (200-500ms per 1-2 staff)
 * è accettabile. Per tenant con 10+ staff rivalutare una coda asincrona vera.
 */
export async function insertStaffNotification(params: InsertParams): Promise<void> {
  // In-app notification — fire-and-forget (non blocca, singola query)
  createAdminClient()
    .from('notifications')
    .insert({
      tenant_id: params.tenantId,
      profile_id: null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      meta: (params.meta ?? {}) as unknown as Json,
    })
    .then(({ error }) => {
      if (error) {
        console.error('[notifications] insert failed:', error.message, {
          type: params.type,
          tenantId: params.tenantId,
        })
      }
    })

  // Push Web — awaited: garantisce completamento prima del return della server action
  try {
    await sendPushToStaff(params)
  } catch (err: unknown) {
    console.error('[notifications] push to staff failed:', (err as Error).message ?? err, {
      type: params.type,
      tenantId: params.tenantId,
    })
    // Non rilanciamo: fallimento push non deve far fallire booking/cancellazione/reschedule
  }
}
