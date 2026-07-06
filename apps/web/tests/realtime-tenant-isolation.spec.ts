import { randomBytes } from 'crypto'
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
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

const hasSupabaseRealtimeEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)

type UserClient = SupabaseClient<Database>

interface UserFixture {
  userId: string
  email: string
  password: string
  client: UserClient
}

interface TenantFixtureData {
  tenantId: string
  locationId: string
  serviceId: string
  staffMemberId: string
  clientId: string
}

interface IsolationFixture {
  ownerA: UserFixture
  ownerB: UserFixture
  tenantA: TenantFixtureData
  tenantB: TenantFixtureData
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

async function createUserFixture(
  service: ServiceClient,
  suffix: string,
  label: string
): Promise<UserFixture> {
  const email = `playwright-realtime-${label}-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError(`create ${label} auth user`, authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error(`create ${label} auth user: missing user id`)
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Playwright Realtime ${label}`,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  const client = requireUserClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  await assertNoSupabaseError(`sign in ${label}`, signInError)

  return { userId, email, password, client }
}

async function createTenantBundle(
  service: ServiceClient,
  ownerProfileId: string,
  suffix: string,
  index: number
): Promise<TenantFixtureData> {
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Realtime ${suffix} ${index}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-realtime-${suffix}-${index}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create tenant ${index}`, tenantError)
  const tenantId = tenant?.id
  if (!tenantId) throw new Error(`create tenant ${index}: missing tenant id`)

  const { data: location, error: locationError } = await service
    .from('locations')
    .insert({
      is_active: true,
      name: `Realtime Location ${index}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create location ${index}`, locationError)
  const locationId = location?.id
  if (!locationId) throw new Error(`create location ${index}: missing location id`)

  const { data: serviceRow, error: serviceError } = await service
    .from('services')
    .insert({
      duration_minutes: 30,
      is_active: true,
      name: `Realtime Service ${index}`,
      price: 25,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create service ${index}`, serviceError)
  const serviceId = serviceRow?.id
  if (!serviceId) throw new Error(`create service ${index}: missing service id`)

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
  await assertNoSupabaseError(`create staff member ${index}`, staffError)
  const staffMemberId = staffMember?.id
  if (!staffMemberId) throw new Error(`create staff member ${index}: missing id`)

  const { error: staffLocationError } = await service.from('staff_locations').insert({
    location_id: locationId,
    staff_id: staffMemberId,
    tenant_id: tenantId,
  })
  await assertNoSupabaseError(`create staff location ${index}`, staffLocationError)

  const { error: staffServiceError } = await service.from('staff_services').insert({
    service_id: serviceId,
    staff_id: staffMemberId,
    tenant_id: tenantId,
  })
  await assertNoSupabaseError(`create staff service ${index}`, staffServiceError)

  const { data: clientRow, error: clientError } = await service
    .from('clients')
    .insert({
      email: `realtime-client-${index}-${suffix}@example.com`,
      full_name: `Realtime Client ${index}`,
      marketing_consent: false,
      phone: `+39${Date.now().toString().slice(-9)}${index}`,
      preferred_contact_channel: 'whatsapp',
      tags: [],
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create client ${index}`, clientError)
  const clientId = clientRow?.id
  if (!clientId) throw new Error(`create client ${index}: missing client id`)

  return { tenantId, locationId, serviceId, staffMemberId, clientId }
}

async function seedIsolationFixture(): Promise<IsolationFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const tenantIds: string[] = []
  const locationIds: string[] = []
  const serviceIds: string[] = []
  const staffMemberIds: string[] = []
  const clientIds: string[] = []
  const ownerA = await createUserFixture(service, suffix, 'owner-a')
  const ownerB = await createUserFixture(service, suffix, 'owner-b')

  const tenantA = await createTenantBundle(service, ownerA.userId, suffix, 1)
  const tenantB = await createTenantBundle(service, ownerB.userId, suffix, 2)
  tenantIds.push(tenantA.tenantId, tenantB.tenantId)
  locationIds.push(tenantA.locationId, tenantB.locationId)
  serviceIds.push(tenantA.serviceId, tenantB.serviceId)
  staffMemberIds.push(tenantA.staffMemberId, tenantB.staffMemberId)
  clientIds.push(tenantA.clientId, tenantB.clientId)

  return {
    ownerA,
    ownerB,
    tenantA,
    tenantB,
    cleanup: async () => {
      try {
        await ownerA.client.auth.signOut()
        await ownerB.client.auth.signOut()
      } catch {
        // best effort
      }

      if (tenantIds.length > 0) {
        await service.from('notifications').delete().in('tenant_id', tenantIds)
      }
      if (clientIds.length > 0) {
        await service.from('clients').delete().in('id', clientIds)
      }
      if (staffMemberIds.length > 0) {
        await service.from('staff_services').delete().in('staff_id', staffMemberIds)
        await service.from('staff_locations').delete().in('staff_id', staffMemberIds)
        await service.from('staff_members').delete().in('id', staffMemberIds)
      }
      if (serviceIds.length > 0) {
        await service.from('services').delete().in('id', serviceIds)
      }
      if (locationIds.length > 0) {
        await service.from('locations').delete().in('id', locationIds)
      }
      if (tenantIds.length > 0) {
        await service.from('tenants').delete().in('id', tenantIds)
      }

      await service.auth.admin.deleteUser(ownerA.userId)
      await service.auth.admin.deleteUser(ownerB.userId)
    },
  }
}

function waitForSubscribed(channel: RealtimeChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(err ?? new Error(`Realtime subscription failed with status ${status}`))
      }
    })
  })
}

function subscribeForNextEvent<T>(
  client: UserClient,
  channelName: string,
  config: { event: '*' | 'INSERT' | 'UPDATE' | 'DELETE'; table: string; filter?: string },
  timeoutMs: number = 8000
): {
  channel: RealtimeChannel
  ready: Promise<void>
  event: Promise<{ eventType: string; payload: T }>
} {
  let resolveEvent!: (value: { eventType: string; payload: T }) => void
  let rejectEvent!: (reason?: unknown) => void

  const event = new Promise<{ eventType: string; payload: T }>((resolve, reject) => {
    resolveEvent = resolve
    rejectEvent = reject
  })

  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: config.event,
        schema: 'public',
        table: config.table,
        ...(config.filter ? { filter: config.filter } : {}),
      },
      (payload) => {
        clearTimeout(timer)
        resolveEvent({ eventType: payload.eventType, payload: payload.new as T })
      }
    )

  const timer = setTimeout(() => {
    void client.removeChannel(channel)
    rejectEvent(new Error(`Timed out waiting for ${config.table} realtime event on ${channelName}`))
  }, timeoutMs)

  const ready = waitForSubscribed(channel).catch((error) => {
    clearTimeout(timer)
    rejectEvent(error)
    throw error
  })

  return { channel, ready, event }
}

async function expectNoEvent(
  client: UserClient,
  channelName: string,
  config: { event: '*' | 'INSERT' | 'UPDATE' | 'DELETE'; table: string; filter?: string },
  action: () => Promise<void>,
  waitMs: number = 1500
): Promise<void> {
  let received = false

  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: config.event,
        schema: 'public',
        table: config.table,
        ...(config.filter ? { filter: config.filter } : {}),
      },
      () => {
        received = true
      }
    )

  await waitForSubscribed(channel)
  await action()
  await new Promise((resolve) => setTimeout(resolve, waitMs))
  await client.removeChannel(channel)
  expect(received).toBe(false)
}

async function insertAppointmentForTenant(
  service: ServiceClient,
  resource: TenantFixtureData,
  offsetMinutes: number
): Promise<string> {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000 + offsetMinutes * 60 * 1000)
  const end = new Date(start.getTime() + 30 * 60 * 1000)

  const { data: appointment, error: appointmentError } = await service
    .from('appointments')
    .insert({
      booking_source: 'dashboard_owner',
      client_id: resource.clientId,
      location_id: resource.locationId,
      staff_id: resource.staffMemberId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'confirmed',
      tenant_id: resource.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('insert appointment', appointmentError)

  const appointmentId = appointment?.id
  if (!appointmentId) {
    throw new Error('insert appointment: missing appointment id')
  }

  const { error: serviceLinkError } = await service.from('appointment_services').insert({
    appointment_id: appointmentId,
    price_at_booking: 25,
    service_id: resource.serviceId,
    tenant_id: resource.tenantId,
  })
  await assertNoSupabaseError('insert appointment service link', serviceLinkError)

  return appointmentId
}

async function insertNotificationForTenant(
  service: ServiceClient,
  tenantId: string,
  title: string
): Promise<void> {
  const { error } = await service.from('notifications').insert({
    body: 'Realtime test notification',
    is_read: false,
    meta: {},
    profile_id: null,
    tenant_id: tenantId,
    title,
    type: 'new_booking',
  })
  await assertNoSupabaseError('insert notification', error)
}

test.describe('realtime tenant isolation', () => {
  test.skip(
    !hasSupabaseRealtimeEnv,
    'Requires Supabase URL, publishable key, and service-role env for realtime isolation tests.'
  )

  test('appointments queries stay tenant-scoped and cross-tenant realtime is blocked', async () => {
    const fixture = await seedIsolationFixture()
    const service = requireServiceClient()
    const createdAppointmentIds: string[] = []

    try {
      const appointmentIdA = await insertAppointmentForTenant(service, fixture.tenantA, 0)
      createdAppointmentIds.push(appointmentIdA)

      await expectNoEvent(
        fixture.ownerA.client,
        `appt-a-no-b-${randomSuffix()}`,
        {
          event: 'INSERT',
          table: 'appointments',
          filter: `tenant_id=eq.${fixture.tenantA.tenantId}`,
        },
        async () => {
          const appointmentId = await insertAppointmentForTenant(service, fixture.tenantB, 90)
          createdAppointmentIds.push(appointmentId)
        }
      )

      const { data: ownerAOwnRows, error: ownerAOwnRowsError } = await fixture.ownerA.client
        .from('appointments')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantA.tenantId)
      await assertNoSupabaseError('owner A select own tenant appointments', ownerAOwnRowsError)
      expect((ownerAOwnRows ?? []).some((row) => row.tenant_id === fixture.tenantA.tenantId)).toBe(true)

      const { data: ownerAForeignRows, error: ownerAForeignRowsError } = await fixture.ownerA.client
        .from('appointments')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantB.tenantId)
      await assertNoSupabaseError('owner A select foreign tenant appointments', ownerAForeignRowsError)
      expect(ownerAForeignRows ?? []).toHaveLength(0)
    } finally {
      if (createdAppointmentIds.length > 0) {
        await service.from('appointment_services').delete().in('appointment_id', createdAppointmentIds)
        await service.from('appointments').delete().in('id', createdAppointmentIds)
      }
      await fixture.cleanup()
    }
  })

  test('same-tenant notifications realtime still delivers legitimate events', async () => {
    const fixture = await seedIsolationFixture()
    const service = requireServiceClient()

    try {
      const notificationEvent = subscribeForNextEvent<{ tenant_id: string; title: string }>(
        fixture.ownerA.client,
        `notif-a-${randomSuffix()}`,
        {
          event: 'INSERT',
          table: 'notifications',
          filter: `tenant_id=eq.${fixture.tenantA.tenantId}`,
        }
      )
      await notificationEvent.ready

      await insertNotificationForTenant(
        service,
        fixture.tenantA.tenantId,
        `Realtime notification ${randomSuffix()}`
      )

      const received = await notificationEvent.event
      expect(received.payload.tenant_id).toBe(fixture.tenantA.tenantId)
      expect(received.payload.title).toContain('Realtime notification')
      await fixture.ownerA.client.removeChannel(notificationEvent.channel)
    } finally {
      await fixture.cleanup()
    }
  })

  test('clients cross-tenant queries and subscriptions stay isolated', async () => {
    const fixture = await seedIsolationFixture()
    const service = requireServiceClient()

    try {
      const { data: ownerAOwnClients, error: ownerAOwnClientsError } = await fixture.ownerA.client
        .from('clients')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantA.tenantId)
      await assertNoSupabaseError('owner A select own tenant clients', ownerAOwnClientsError)
      expect((ownerAOwnClients ?? []).some((row) => row.id === fixture.tenantA.clientId)).toBe(true)

      const { data: ownerAForeignClients, error: ownerAForeignClientsError } = await fixture.ownerA.client
        .from('clients')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantB.tenantId)
      await assertNoSupabaseError('owner A select foreign tenant clients', ownerAForeignClientsError)
      expect(ownerAForeignClients ?? []).toHaveLength(0)

      await expectNoEvent(
        fixture.ownerA.client,
        `clients-a-no-b-${randomSuffix()}`,
        {
          event: 'UPDATE',
          table: 'clients',
          filter: `tenant_id=eq.${fixture.tenantA.tenantId}`,
        },
        async () => {
          const { error } = await service
            .from('clients')
            .update({ full_name: `Updated ${randomSuffix()}` })
            .eq('id', fixture.tenantB.clientId)
            .eq('tenant_id', fixture.tenantB.tenantId)
          await assertNoSupabaseError('update foreign tenant client', error)
        }
      )
    } finally {
      await fixture.cleanup()
    }
  })
})
