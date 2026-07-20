import { randomBytes } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from 'playwright/test'
import type { Database } from '../src/types'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const supabaseUrl =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey =
  process.env.PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const hasNotificationEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)

type UserClient = SupabaseClient<Database>

interface UserFixture {
  userId: string
  client: UserClient
}

interface TenantNotificationSeed {
  tenantId: string
  staffMemberId: string
  notificationId: string
}

interface NotificationFixture {
  ownerA: UserFixture
  ownerB: UserFixture
  tenantA: TenantNotificationSeed
  tenantB: TenantNotificationSeed
  platformNotificationId: string
  cleanup: () => Promise<void>
}

function requireUserClient(): UserClient {
  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'Missing Playwright Supabase publishable environment. Set PLAYWRIGHT_SUPABASE_URL and PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY, or reuse NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return createClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function createOwner(
  service: ServiceClient,
  suffix: string,
  label: string
): Promise<UserFixture> {
  const email = `playwright-notif-${label}-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError(`create ${label} auth user`, authError)

  const userId = authData.user?.id
  if (!userId) throw new Error(`create ${label} auth user: missing user id`)

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Playwright Notifications ${label}`,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  const client = requireUserClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  await assertNoSupabaseError(`sign in ${label}`, signInError)

  return { userId, client }
}

async function createTenantSeed(
  service: ServiceClient,
  ownerProfileId: string,
  suffix: string,
  index: number
): Promise<TenantNotificationSeed> {
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Notifications ${suffix} ${index}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-notif-${suffix}-${index}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create tenant ${index}`, tenantError)

  const tenantId = tenant?.id
  if (!tenantId) throw new Error(`create tenant ${index}: missing tenant id`)

  const { data: staffMember, error: staffError } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: ownerProfileId,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create owner membership ${index}`, staffError)

  const staffMemberId = staffMember?.id
  if (!staffMemberId) throw new Error(`create owner membership ${index}: missing staff member id`)

  const { data: notification, error: notificationError } = await service
    .from('notifications')
    .insert({
      body: `Seed notification body ${index}`,
      is_read: false,
      meta: {},
      profile_id: null,
      tenant_id: tenantId,
      title: `Seed notification ${index}`,
      type: 'new_booking',
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create seed notification ${index}`, notificationError)

  const notificationId = notification?.id
  if (!notificationId) throw new Error(`create seed notification ${index}: missing id`)

  return { tenantId, staffMemberId, notificationId }
}

async function seedNotificationFixture(): Promise<NotificationFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const tenantIds: string[] = []
  const staffIds: string[] = []
  const notificationIds: string[] = []

  const ownerA = await createOwner(service, suffix, 'owner-a')
  const ownerB = await createOwner(service, suffix, 'owner-b')

  const tenantA = await createTenantSeed(service, ownerA.userId, suffix, 1)
  const tenantB = await createTenantSeed(service, ownerB.userId, suffix, 2)
  tenantIds.push(tenantA.tenantId, tenantB.tenantId)
  staffIds.push(tenantA.staffMemberId, tenantB.staffMemberId)
  notificationIds.push(tenantA.notificationId, tenantB.notificationId)

  const { data: platformNotification, error: platformError } = await service
    .from('platform_notifications')
    .insert({
      body: 'Platform seed body',
      is_read: false,
      meta: {},
      title: 'Platform seed notification',
      type: 'tenant_created',
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create platform notification', platformError)

  const platformNotificationId = platformNotification?.id
  if (!platformNotificationId) {
    throw new Error('create platform notification: missing id')
  }

  return {
    ownerA,
    ownerB,
    tenantA,
    tenantB,
    platformNotificationId,
    cleanup: async () => {
      try {
        await ownerA.client.auth.signOut()
        await ownerB.client.auth.signOut()
      } catch {
        // best effort
      }

      await service.from('platform_notifications').delete().eq('id', platformNotificationId)
      if (notificationIds.length > 0) {
        await service.from('notifications').delete().in('id', notificationIds)
      }
      if (staffIds.length > 0) {
        await service.from('staff_members').delete().in('id', staffIds)
      }
      if (tenantIds.length > 0) {
        await service.from('tenants').delete().in('id', tenantIds)
      }

      await service.auth.admin.deleteUser(ownerA.userId)
      await service.auth.admin.deleteUser(ownerB.userId)
    },
  }
}

test.describe('notification write isolation', () => {
  test.skip(
    !hasNotificationEnv,
    'Requires Supabase URL, publishable key, and service-role env for notification isolation tests.'
  )

  test('cross-tenant notification writes are denied while same-tenant and internal flows work', async () => {
    test.setTimeout(90_000)
    const fixture = await seedNotificationFixture()
    const service = requireServiceClient()

    try {
      const { data: ownVisible, error: ownVisibleError } = await fixture.ownerA.client
        .from('notifications')
        .select('id, tenant_id, is_read')
        .eq('id', fixture.tenantA.notificationId)
        .maybeSingle()
      await assertNoSupabaseError('owner A reads own notification', ownVisibleError)
      expect(ownVisible?.tenant_id).toBe(fixture.tenantA.tenantId)

      const { data: foreignVisible, error: foreignVisibleError } = await fixture.ownerA.client
        .from('notifications')
        .select('id, tenant_id')
        .eq('id', fixture.tenantB.notificationId)
        .maybeSingle()
      await assertNoSupabaseError('owner A reads foreign notification', foreignVisibleError)
      expect(foreignVisible).toBeNull()

      const { error: ownMarkReadError } = await fixture.ownerA.client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', fixture.tenantA.notificationId)
      await assertNoSupabaseError('owner A marks own notification read', ownMarkReadError)

      const { data: ownAfter, error: ownAfterError } = await service
        .from('notifications')
        .select('is_read')
        .eq('id', fixture.tenantA.notificationId)
        .single()
      await assertNoSupabaseError('read own notification after update', ownAfterError)
      expect(ownAfter?.is_read).toBe(true)

      const { error: foreignMarkReadError } = await fixture.ownerA.client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', fixture.tenantB.notificationId)
      if (foreignMarkReadError) {
        expect(foreignMarkReadError).toBeTruthy()
      }

      const { data: foreignAfter, error: foreignAfterError } = await service
        .from('notifications')
        .select('is_read')
        .eq('id', fixture.tenantB.notificationId)
        .single()
      await assertNoSupabaseError('read foreign notification after failed read-mark', foreignAfterError)
      expect(foreignAfter?.is_read).toBe(false)

      const { error: foreignModifyError } = await fixture.ownerA.client
        .from('notifications')
        .update({ title: 'Tampered title' })
        .eq('id', fixture.tenantB.notificationId)
      if (foreignModifyError) {
        expect(foreignModifyError).toBeTruthy()
      }

      const { data: foreignTitle, error: foreignTitleError } = await service
        .from('notifications')
        .select('title')
        .eq('id', fixture.tenantB.notificationId)
        .single()
      await assertNoSupabaseError('read foreign notification title after failed update', foreignTitleError)
      expect(foreignTitle?.title).toBe('Seed notification 2')

      const { error: foreignDeleteError } = await fixture.ownerA.client
        .from('notifications')
        .delete()
        .eq('id', fixture.tenantB.notificationId)
      if (foreignDeleteError) {
        expect(foreignDeleteError).toBeTruthy()
      }

      const { data: foreignStillThere, error: foreignStillThereError } = await service
        .from('notifications')
        .select('id')
        .eq('id', fixture.tenantB.notificationId)
        .maybeSingle()
      await assertNoSupabaseError('read foreign notification after failed delete', foreignStillThereError)
      expect(foreignStillThere?.id).toBe(fixture.tenantB.notificationId)

      const { error: createForeignError } = await fixture.ownerA.client
        .from('notifications')
        .insert({
          body: 'Cross-tenant create attempt',
          is_read: false,
          meta: {},
          profile_id: null,
          tenant_id: fixture.tenantB.tenantId,
          title: 'Should fail',
          type: 'new_booking',
        })
      if (createForeignError) {
        expect(createForeignError).toBeTruthy()
      }

      const { data: failedCreateRows, error: failedCreateRowsError } = await service
        .from('notifications')
        .select('id')
        .eq('tenant_id', fixture.tenantB.tenantId)
        .eq('title', 'Should fail')
      await assertNoSupabaseError('read failed cross-tenant create rows', failedCreateRowsError)
      expect(failedCreateRows ?? []).toHaveLength(0)

      const { error: platformUpdateError } = await fixture.ownerA.client
        .from('platform_notifications')
        .update({ is_read: true })
        .eq('id', fixture.platformNotificationId)
      if (platformUpdateError) {
        expect(platformUpdateError).toBeTruthy()
      }

      const { data: platformAfter, error: platformAfterError } = await service
        .from('platform_notifications')
        .select('is_read')
        .eq('id', fixture.platformNotificationId)
        .single()
      await assertNoSupabaseError('read platform notification after failed update', platformAfterError)
      expect(platformAfter?.is_read).toBe(false)

      const { error: internalInsertError } = await service
        .from('notifications')
        .insert({
          body: 'Internal flow body',
          is_read: false,
          meta: {},
          profile_id: null,
          tenant_id: fixture.tenantA.tenantId,
          title: 'Internal flow notification',
          type: 'new_booking',
        })
      await assertNoSupabaseError('internal notification insert', internalInsertError)
    } finally {
      await fixture.cleanup()
    }
  })
})
