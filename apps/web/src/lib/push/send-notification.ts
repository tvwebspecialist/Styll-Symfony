/**
 * Invia una Web Push notification a una lista di subscription.
 * Rimuove automaticamente le subscription scadute/invalide dal DB.
 *
 * Solo server-side. Non importare in componenti client.
 */
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL       = process.env.VAPID_EMAIL       ?? 'mailto:noreply@styll.it'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

const PUSH_TIMEOUT_MS = 5000

export interface PushPayload {
  title: string
  body:  string
  icon?: string
  badge?: string
  /** URL relativo da aprire al click, es. "/tenant/app/mario/prenota/successo?appointment=xxx&token=yyy" */
  url?:  string
  tag?:  string
}

export interface PushSubscriptionRow {
  id:       string
  endpoint: string
  p256dh:   string
  auth:     string
}

/**
 * Invia una notifica a tutte le subscription fornite.
 * Restituisce il numero di invii riusciti.
 */
export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured — skipping push')
    return 0
  }

  const db = createAdminClient()
  let sent = 0
  const expiredIds: string[] = []

  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      try {
        await Promise.race([
          webpush.sendNotification(pushSub, JSON.stringify(payload)),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(Object.assign(new Error('push timeout'), { _timeout: true })),
              PUSH_TIMEOUT_MS,
            )
          ),
        ])
        sent++
      } catch (err: unknown) {
        const e = err as { statusCode?: number; body?: string; headers?: Record<string, string>; _timeout?: boolean }
        if (e._timeout) {
          console.warn('[push] sendNotification timeout', sub.endpoint.slice(0, 60))
        } else if (e.statusCode === 404 || e.statusCode === 410) {
          expiredIds.push(sub.id)
        } else {
          console.error('[push] sendNotification error', {
            statusCode: e.statusCode,
            body: e.body,
            endpoint: sub.endpoint.slice(0, 60),
          })
        }
      }
    })
  )

  // Rimuovi le subscription scadute
  if (expiredIds.length > 0) {
    await db.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return sent
}

/**
 * Carica le subscription di un profile_id per un dato tenant.
 */
export async function getSubscriptionsForProfile(
  tenantId: string,
  profileId: string,
): Promise<PushSubscriptionRow[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('tenant_id', tenantId)
    .eq('profile_id', profileId)

  return (data ?? []) as PushSubscriptionRow[]
}
