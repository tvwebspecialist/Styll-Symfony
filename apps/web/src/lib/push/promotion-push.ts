/**
 * Invia push notification a tutti i clienti PWA di un tenant
 * quando una promozione viene pubblicata (status → 'active').
 *
 * Solo server-side. Non importare in componenti client.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from './send-notification'
import type { PushPayload, PushSubscriptionRow } from './send-notification'

export type PromotionPushDb = Pick<ReturnType<typeof createAdminClient>, 'from'>

type PromotionPushSender = (
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
) => Promise<number>

interface PromotionPushDeps {
  db?: PromotionPushDb
  sendPush?: PromotionPushSender
}

export async function sendPromotionPush(
  promotionId: string,
  tenantId: string,
  deps: PromotionPushDeps = {},
): Promise<{ sent: number; failed: number; skipped?: boolean }> {
  const db = deps.db ?? createAdminClient()
  const sendPush = deps.sendPush ?? sendPushToSubscriptions

  // 1. Verifica che la promozione esista, sia attiva, appartenga al tenant
  const { data: promo } = await db
    .from('promotions')
    .select('id, title, show_in_app')
    .eq('id', promotionId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (!promo?.show_in_app) return { sent: 0, failed: 0 }

  // 2. Idempotenza: se già inviato per questa promozione, salta
  const { count } = await db
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', 'promotion_published')
    .eq('promotion_id', promotionId)

  if ((count ?? 0) > 0) return { sent: 0, failed: 0, skipped: true }

  // 3. Leggi logo tenant per l'icona
  const { data: tenant } = await db
    .from('tenants')
    .select('logo_url')
    .eq('id', tenantId)
    .maybeSingle()

  const icon = tenant?.logo_url ?? '/icon-192.png'

  // 4. Seleziona solo i profili client con un record `clients` valido nel tenant
  //    e con consenso marketing esplicito attivo.
  const { data: eligibleClients } = await db
    .from('clients')
    .select('profile_id')
    .eq('tenant_id', tenantId)
    .eq('marketing_consent', true)
    .is('deleted_at', null)
    .not('profile_id', 'is', null)

  const candidateProfileIds = Array.from(
    new Set(
      (eligibleClients ?? [])
        .map((client) => client.profile_id)
        .filter((profileId): profileId is string => !!profileId),
    ),
  )

  if (candidateProfileIds.length === 0) return { sent: 0, failed: 0 }

  // Difesa aggiuntiva: invia solo a profili esplicitamente marcati come `client`.
  const { data: eligibleProfiles } = await db
    .from('profiles')
    .select('id')
    .eq('user_type', 'client')
    .in('id', candidateProfileIds)

  const eligibleProfileIds = Array.from(
    new Set((eligibleProfiles ?? []).map((profile) => profile.id)),
  )

  if (eligibleProfileIds.length === 0) return { sent: 0, failed: 0 }

  // 5. Leggi le subscription del tenant solo per i client con consenso marketing.
  const { data: allSubs } = await db
    .from('push_subscriptions')
    .select('id, profile_id, endpoint, p256dh, auth')
    .eq('tenant_id', tenantId)
    .in('profile_id', eligibleProfileIds)

  if (!allSubs || allSubs.length === 0) return { sent: 0, failed: 0 }

  // 6. Raggruppa per profile_id (un profilo può avere più dispositivi)
  const byProfile = new Map<string, PushSubscriptionRow[]>()
  for (const sub of allSubs) {
    const arr = byProfile.get(sub.profile_id) ?? []
    arr.push({ id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth })
    byProfile.set(sub.profile_id, arr)
  }

  const promoUrl = `/offerte/${promotionId}`
  const payload = {
    title: 'Nuova offerta per te 🎉',
    body:   promo.title,
    icon,
    badge: '/icon-192.png',
    url:   promoUrl,
    tag:   `promotion-${promotionId}`,
  }

  let totalSent  = 0
  let totalFailed = 0

  for (const [profileId, subs] of byProfile) {
    const sent = await sendPush(subs, payload)
    totalSent  += sent
    totalFailed += subs.length - sent

    if (sent > 0) {
      await db
        .from('notification_log')
        .insert({
          tenant_id:      tenantId,
          profile_id:     profileId,
          type:           'promotion_published',
          appointment_id: null,
          promotion_id:   promotionId,
        })
      const { error: notifErr } = await db.from('notifications').insert({
        tenant_id: tenantId,
        profile_id: profileId,
        type: 'promotion_published',
        title: payload.title,
        body: payload.body,
        is_read: false,
        meta: { url: promoUrl, promotion_id: promotionId },
      })
      if (notifErr) console.error('[promotion-push] notifications insert failed:', notifErr.message)
    }
  }

  return { sent: totalSent, failed: totalFailed }
}
