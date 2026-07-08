/**
 * Invia push notification a tutti i clienti PWA di un tenant
 * quando una promozione viene pubblicata (status → 'active').
 *
 * Solo server-side. Non importare in componenti client.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from './send-notification'
import type { PushSubscriptionRow } from './send-notification'

export async function sendPromotionPush(
  promotionId: string,
  tenantId: string,
): Promise<{ sent: number; failed: number; skipped?: boolean }> {
  const db = createAdminClient()

  // 1. Verifica che la promozione esista, sia attiva, appartenga al tenant
  const { data: promo } = await (db as any)
    .from('promotions')
    .select('id, title, show_in_app')
    .eq('id', promotionId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (!promo || !(promo as any).show_in_app) return { sent: 0, failed: 0 }

  // 2. Idempotenza: se già inviato per questa promozione, salta
  const { count } = await (db as any)
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', 'promotion_published')
    .eq('promotion_id', promotionId)

  if ((count ?? 0) > 0) return { sent: 0, failed: 0, skipped: true }

  // 3. Leggi logo tenant per l'icona
  const { data: tenant } = await db
    .from('tenants')
    .select('logo_url, slug')
    .eq('id', tenantId)
    .maybeSingle()

  const icon = (tenant as any)?.logo_url ?? '/icon-192.png'
  const slug = (tenant as any)?.slug ?? ''

  // 4. Leggi le subscription del tenant — solo clienti (user_type = 'client')
  //    Il barbiere ha spesso una propria subscription per le notifiche dashboard;
  //    il join con profiles esclude staff/owner/manager dall'invio.
  const { data: allSubs } = await (db as any)
    .from('push_subscriptions')
    .select('id, profile_id, endpoint, p256dh, auth, profiles!inner(user_type)')
    .eq('tenant_id', tenantId)
    .eq('profiles.user_type', 'client')

  if (!allSubs || (allSubs as any[]).length === 0) return { sent: 0, failed: 0 }

  // 5. Raggruppa per profile_id (un profilo può avere più dispositivi)
  const byProfile = new Map<string, PushSubscriptionRow[]>()
  for (const sub of allSubs as any[]) {
    const arr = byProfile.get(sub.profile_id) ?? []
    arr.push({ id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth })
    byProfile.set(sub.profile_id, arr)
  }

  const promoUrl = `/offerte/${promotionId}`
  const payload = {
    title: 'Nuova offerta per te 🎉',
    body:   (promo as any).title as string,
    icon,
    badge: '/icon-192.png',
    url:   promoUrl,
    tag:   `promotion-${promotionId}`,
  }

  let totalSent  = 0
  let totalFailed = 0

  for (const [profileId, subs] of byProfile) {
    const sent = await sendPushToSubscriptions(subs, payload)
    totalSent  += sent
    totalFailed += subs.length - sent

    if (sent > 0) {
      await (db as any)
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
