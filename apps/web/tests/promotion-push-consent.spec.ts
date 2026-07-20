import { expect, test } from 'playwright/test'
import type { PushPayload, PushSubscriptionRow } from '../src/lib/push/send-notification'
import { getSubscriptionsForProfile } from '../src/lib/push/send-notification'
import { sendPromotionPush, type PromotionPushDb } from '../src/lib/push/promotion-push'
import {
  assertNoSupabaseError,
  createTenantFixture,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
} from './helpers/supabase-admin'

type ServiceClient = ReturnType<typeof requireServiceClient>

interface PushClientSeed {
  endpoint: string
  profileId: string
}

async function cleanupPromotionPushFixtures(
  service: ServiceClient,
  tenantIds: string[],
  profileIds: string[],
): Promise<void> {
  const uniqueTenantIds = Array.from(new Set(tenantIds))
  const uniqueProfileIds = Array.from(new Set(profileIds))

  if (uniqueTenantIds.length > 0) {
    const [
      { error: notificationsError },
      { error: notificationLogError },
      { error: subscriptionsError },
      { error: clientsError },
      { error: promotionsError },
    ] = await Promise.all([
      service.from('notifications').delete().in('tenant_id', uniqueTenantIds),
      service.from('notification_log').delete().in('tenant_id', uniqueTenantIds),
      service.from('push_subscriptions').delete().in('tenant_id', uniqueTenantIds),
      service.from('clients').delete().in('tenant_id', uniqueTenantIds),
      service.from('promotions').delete().in('tenant_id', uniqueTenantIds),
    ])
    await assertNoSupabaseError('cleanup promotion push notifications', notificationsError)
    await assertNoSupabaseError('cleanup promotion push notification_log', notificationLogError)
    await assertNoSupabaseError('cleanup promotion push subscriptions', subscriptionsError)
    await assertNoSupabaseError('cleanup promotion push clients', clientsError)
    await assertNoSupabaseError('cleanup promotion push promotions', promotionsError)

    const { error: tenantsError } = await service
      .from('tenants')
      .delete()
      .in('id', uniqueTenantIds)
    await assertNoSupabaseError('cleanup promotion push tenants', tenantsError)
  }

  if (uniqueProfileIds.length > 0) {
    const { data: existingProfiles, error: profilesError } = await service
      .from('profiles')
      .select('id')
      .in('id', uniqueProfileIds)
    await assertNoSupabaseError('list existing promotion push profiles', profilesError)

    const userDeletionResults = await Promise.all(
      (existingProfiles ?? []).map(async (profile) => ({
        profileId: profile.id,
        result: await service.auth.admin.deleteUser(profile.id),
      })),
    )

    for (const deletion of userDeletionResults) {
      await assertNoSupabaseError(
        `cleanup promotion push auth user ${deletion.profileId}`,
        deletion.result.error,
      )
    }
  }
}

async function createPushProfile(
  service: ServiceClient,
  {
    createClientRecord = true,
    label,
    marketingConsent,
    profileTenantId,
    subscriptionTenantId,
  }: {
    createClientRecord?: boolean
    label: string
    marketingConsent: boolean
    profileTenantId?: string
    subscriptionTenantId: string
  },
): Promise<PushClientSeed> {
  const email = `push-${label}-${Date.now()}-${randomSuffix()}@example.com`
  const password = 'Testpass123!'

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Push ${label}`, user_type: 'client' },
  })
  await assertNoSupabaseError(`create push auth user ${label}`, authError)

  const profileId = authData.user?.id ?? null
  if (!profileId) {
    throw new Error(`create push auth user ${label}: missing user id`)
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Push ${label}`,
      notification_preferences: { push_accepted: true, push_prompted: true },
      user_type: 'client',
    })
    .eq('id', profileId)
  await assertNoSupabaseError(`seed push profile ${label}`, profileError)

  if (createClientRecord) {
    const tenantId = profileTenantId ?? subscriptionTenantId
    const { error: clientError } = await service
      .from('clients')
      .insert({
        tenant_id: tenantId,
        profile_id: profileId,
        full_name: `Client ${label}`,
        email,
        phone: `+39000${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        marketing_consent: marketingConsent,
        tags: [],
      })
    await assertNoSupabaseError(`seed client row ${label}`, clientError)
  }

  const endpoint = `https://example.com/push/${label}-${randomSuffix()}`
  const { error: subscriptionError } = await service.from('push_subscriptions').insert({
    tenant_id: subscriptionTenantId,
    profile_id: profileId,
    endpoint,
    p256dh: `p256-${label}-${randomSuffix()}`,
    auth: `auth-${label}-${randomSuffix()}`,
  })
  await assertNoSupabaseError(`seed push subscription ${label}`, subscriptionError)

  return {
    profileId,
    endpoint,
  }
}

async function createPromotion(
  service: ServiceClient,
  tenantId: string,
  title: string,
): Promise<string> {
  const { data, error } = await service
    .from('promotions')
    .insert({
      tenant_id: tenantId,
      title,
      description: `${title} description`,
      is_active: true,
      show_in_app: true,
      show_on_landing: true,
      status: 'active',
      valid_from: new Date().toISOString(),
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create promotion seed', error)

  const promotionId = data?.id
  if (!promotionId) {
    throw new Error('create promotion seed: missing id')
  }

  return promotionId
}

test.describe.serial('promotion push marketing consent gate', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for promotion push fixtures.')

  test('promotional push sends only to tenant clients with marketing consent and leaves transactional subscription access untouched', async () => {
    test.setTimeout(60_000)
    const service = requireServiceClient()
    const [tenantA, tenantB] = await Promise.all([
      createTenantFixture('promo-push-a'),
      createTenantFixture('promo-push-b'),
    ])
    const [allowed, denied, orphan, otherTenantClient] = await Promise.all([
      createPushProfile(service, {
        label: 'allowed',
        marketingConsent: true,
        subscriptionTenantId: tenantA.tenantId,
      }),
      createPushProfile(service, {
        label: 'denied',
        marketingConsent: false,
        subscriptionTenantId: tenantA.tenantId,
      }),
      createPushProfile(service, {
        createClientRecord: false,
        label: 'orphan',
        marketingConsent: false,
        subscriptionTenantId: tenantA.tenantId,
      }),
      createPushProfile(service, {
        label: 'other-tenant',
        marketingConsent: true,
        profileTenantId: tenantB.tenantId,
        subscriptionTenantId: tenantA.tenantId,
      }),
    ])

    const promotionId = await createPromotion(
      service,
      tenantA.tenantId,
      `Promo Push ${randomSuffix()}`,
    )

    const deliveredEndpoints: string[] = []
    const deliveredPayloads: PushPayload[] = []

    try {
      const result = await sendPromotionPush(promotionId, tenantA.tenantId, {
        db: service as unknown as PromotionPushDb,
        sendPush: async (subscriptions: PushSubscriptionRow[], payload: PushPayload) => {
          deliveredEndpoints.push(...subscriptions.map((sub) => sub.endpoint))
          deliveredPayloads.push(payload)
          return subscriptions.length
        },
      })

      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
      expect(deliveredEndpoints).toEqual([allowed.endpoint])
      expect(deliveredPayloads).toHaveLength(1)
      expect(deliveredPayloads[0]?.tag).toBe(`promotion-${promotionId}`)
      expect(deliveredPayloads[0]?.url).toBe(`/offerte/${promotionId}`)

      const [
        { data: logs, error: logsError },
        { data: notifications, error: notificationsError },
        deniedSubs,
        orphanSubs,
        crossTenantSubs,
      ] = await Promise.all([
        service
          .from('notification_log')
          .select('profile_id, promotion_id, type')
          .eq('tenant_id', tenantA.tenantId)
          .eq('promotion_id', promotionId)
          .eq('type', 'promotion_published'),
        service
          .from('notifications')
          .select('profile_id, tenant_id, type')
          .eq('tenant_id', tenantA.tenantId)
          .eq('type', 'promotion_published'),
        getSubscriptionsForProfile(tenantA.tenantId, denied.profileId),
        getSubscriptionsForProfile(tenantA.tenantId, orphan.profileId),
        getSubscriptionsForProfile(tenantA.tenantId, otherTenantClient.profileId),
      ])
      await assertNoSupabaseError('read promotion notification_log rows', logsError)
      await assertNoSupabaseError('read promotion notifications rows', notificationsError)

      expect(logs ?? []).toHaveLength(1)
      expect(logs?.[0]?.profile_id).toBe(allowed.profileId)

      expect(notifications ?? []).toHaveLength(1)
      expect(notifications?.[0]?.profile_id).toBe(allowed.profileId)
      expect(notifications?.[0]?.tenant_id).toBe(tenantA.tenantId)

      // Transactional paths still resolve the subscription directly; the marketing
      // gate only affects the promotional selection layer in sendPromotionPush().
      expect(deniedSubs).toHaveLength(1)
      expect(deniedSubs[0]?.endpoint).toBe(denied.endpoint)

      expect(orphanSubs).toHaveLength(1)
      expect(orphanSubs[0]?.endpoint).toBe(orphan.endpoint)

      expect(crossTenantSubs).toHaveLength(1)
      expect(crossTenantSubs[0]?.endpoint).toBe(otherTenantClient.endpoint)
    } finally {
      await cleanupPromotionPushFixtures(
        service,
        [tenantA.tenantId, tenantB.tenantId],
        [
          allowed.profileId,
          denied.profileId,
          orphan.profileId,
          otherTenantClient.profileId,
        ],
      )
    }
  })
})
