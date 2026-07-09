import { randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import { expect, test } from 'playwright/test'
import {
  handleRecalculateAnalyticsRequest,
  type AnalyticsRow,
  type InsertStaffNotificationInput,
  type PreviousAnalyticsRow,
  type RecalculateAnalyticsDeps,
} from '../src/app/api/cron/recalculate-analytics/handler'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const TEST_SECRET = 'recalculate-analytics-test-secret'
const LARGE_TENANT_CLIENT_COUNT = 90

interface UserSeed {
  id: string
}

interface TenantSeed {
  tenantId: string
  locationId: string
  staffId: string
  clientIds: string[]
  clientIdsByName: Record<string, string>
}

interface AnalyticsFixture {
  tenantA: TenantSeed
  tenantB: TenantSeed
  tenantLarge: TenantSeed
  cleanup: () => Promise<void>
}

function daysAgo(days: number, hour: number, minute: number = 0): Date {
  const value = new Date()
  value.setDate(value.getDate() - days)
  value.setHours(hour, minute, 0, 0)
  return value
}

function buildCronRequest(headers: HeadersInit = {}): Request {
  return new Request('https://example.test/api/cron/recalculate-analytics', {
    method: 'POST',
    headers,
  })
}

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  label: string,
): Promise<UserSeed> {
  const email = `playwright-analytics-${label}-${suffix}@example.com`
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
      full_name: `Playwright Analytics ${label}`,
      onboarding_completed: true,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  return { id: userId }
}

async function createTenant(
  service: ServiceClient,
  ownerProfileId: string,
  suffix: string,
  label: string,
): Promise<TenantSeed> {
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Analytics ${label.toUpperCase()} ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-analytics-${label}-${suffix}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create tenant ${label}`, tenantError)

  const tenantId = tenant?.id
  if (!tenantId) {
    throw new Error(`create tenant ${label}: missing tenant id`)
  }

  const { data: location, error: locationError } = await service
    .from('locations')
    .insert({
      is_active: true,
      name: `Analytics Location ${label.toUpperCase()}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create location ${label}`, locationError)

  const locationId = location?.id
  if (!locationId) {
    throw new Error(`create location ${label}: missing location id`)
  }

  const { data: staff, error: staffError } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: ownerProfileId,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create owner staff ${label}`, staffError)

  const staffId = staff?.id
  if (!staffId) {
    throw new Error(`create owner staff ${label}: missing staff id`)
  }

  return {
    tenantId,
    locationId,
    staffId,
    clientIds: [],
    clientIdsByName: {},
  }
}

async function insertClients(
  service: ServiceClient,
  tenant: TenantSeed,
  suffix: string,
  label: string,
  names: string[],
): Promise<void> {
  const phoneSeed = String(parseInt(suffix.slice(0, 8), 16)).padStart(8, '0')
  const { data: clients, error: clientsError } = await service
    .from('clients')
    .insert(
      names.map((name, index) => ({
        email: `${label}-${index}-${suffix}@example.com`,
        full_name: name,
        marketing_consent: false,
        phone: `+39${phoneSeed}${String(index).padStart(3, '0')}`,
        preferred_contact_channel: 'whatsapp',
        tags: [],
        tenant_id: tenant.tenantId,
      })),
    )
    .select('id, full_name')
  await assertNoSupabaseError(`insert clients ${label}`, clientsError)

  for (const client of clients ?? []) {
    tenant.clientIds.push(client.id)
    tenant.clientIdsByName[client.full_name] = client.id
  }
}

async function insertAppointments(
  service: ServiceClient,
  tenant: TenantSeed,
  appointments: Array<{
    clientName: string
    startTime: Date
    status: 'completed' | 'cancelled' | 'no_show'
  }>,
): Promise<void> {
  const rows = appointments.map((appointment) => {
    const clientId = tenant.clientIdsByName[appointment.clientName]
    if (!clientId) {
      throw new Error(`Missing client id for ${appointment.clientName}`)
    }

    const endTime = new Date(appointment.startTime.getTime() + 30 * 60 * 1000)
    return {
      booking_source: 'dashboard_owner' as const,
      client_id: clientId,
      end_time: endTime.toISOString(),
      location_id: tenant.locationId,
      staff_id: tenant.staffId,
      start_time: appointment.startTime.toISOString(),
      status: appointment.status,
      tenant_id: tenant.tenantId,
    }
  })

  const { error } = await service.from('appointments').insert(rows)
  await assertNoSupabaseError(`insert appointments for ${tenant.tenantId}`, error)
}

async function seedAnalyticsFixture(): Promise<AnalyticsFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const tenantIds: string[] = []
  const locationIds: string[] = []
  const staffIds: string[] = []
  const clientIds: string[] = []

  const owner = await createStaffUser(service, suffix, 'owner')
  createdUserIds.push(owner.id)

  const tenantA = await createTenant(service, owner.id, suffix, 'a')
  const tenantB = await createTenant(service, owner.id, suffix, 'b')
  const tenantLarge = await createTenant(service, owner.id, suffix, 'large')

  tenantIds.push(tenantA.tenantId, tenantB.tenantId, tenantLarge.tenantId)
  locationIds.push(tenantA.locationId, tenantB.locationId, tenantLarge.locationId)
  staffIds.push(tenantA.staffId, tenantB.staffId, tenantLarge.staffId)

  await insertClients(service, tenantA, suffix, 'tenant-a', [
    'Analytics A Green',
    'Analytics A Yellow',
    'Analytics A Red',
    'Analytics A One Visit',
    'Analytics A No Visits',
  ])
  await insertClients(service, tenantB, suffix, 'tenant-b', [
    'Analytics B Green',
    'Analytics B No Visits',
  ])
  await insertClients(
    service,
    tenantLarge,
    suffix,
    'tenant-large',
    Array.from({ length: LARGE_TENANT_CLIENT_COUNT }, (_, index) => `Analytics Large ${String(index + 1).padStart(3, '0')}`),
  )

  clientIds.push(...tenantA.clientIds, ...tenantB.clientIds, ...tenantLarge.clientIds)

  await insertAppointments(service, tenantA, [
    { clientName: 'Analytics A Green', startTime: daysAgo(30, 9), status: 'completed' },
    { clientName: 'Analytics A Green', startTime: daysAgo(10, 9), status: 'completed' },
    { clientName: 'Analytics A Green', startTime: daysAgo(1, 9), status: 'cancelled' },
    { clientName: 'Analytics A Yellow', startTime: daysAgo(50, 10), status: 'completed' },
    { clientName: 'Analytics A Yellow', startTime: daysAgo(30, 10), status: 'completed' },
    { clientName: 'Analytics A Red', startTime: daysAgo(70, 11), status: 'completed' },
    { clientName: 'Analytics A Red', startTime: daysAgo(60, 11), status: 'completed' },
    { clientName: 'Analytics A One Visit', startTime: daysAgo(5, 12), status: 'completed' },
  ])

  await insertAppointments(service, tenantB, [
    { clientName: 'Analytics B Green', startTime: daysAgo(25, 9), status: 'completed' },
    { clientName: 'Analytics B Green', startTime: daysAgo(5, 9), status: 'completed' },
  ])

  await insertAppointments(
    service,
    tenantLarge,
    tenantLarge.clientIds.map((clientId, index) => {
      const clientName = Object.entries(tenantLarge.clientIdsByName).find(([, id]) => id === clientId)?.[0]
      if (!clientName) {
        throw new Error(`Missing large client name for ${clientId}`)
      }

      const firstVisit = new Date(daysAgo(60, 8).getTime() + index * 60 * 60 * 1000)
      const secondVisit = new Date(daysAgo(20, 8).getTime() + index * 60 * 60 * 1000)

      return [
        {
          clientName,
          startTime: firstVisit,
          status: 'completed' as const,
        },
        {
          clientName,
          startTime: secondVisit,
          status: 'completed' as const,
        },
      ]
    }).flat(),
  )

  return {
    tenantA,
    tenantB,
    tenantLarge,
    cleanup: async () => {
      if (clientIds.length > 0) {
        await service.from('client_analytics').delete().in('client_id', clientIds)
      }
      if (tenantIds.length > 0) {
        await service.from('appointments').delete().in('tenant_id', tenantIds)
      }
      if (clientIds.length > 0) {
        await service.from('clients').delete().in('id', clientIds)
      }
      if (staffIds.length > 0) {
        await service.from('staff_members').delete().in('id', staffIds)
      }
      if (locationIds.length > 0) {
        await service.from('locations').delete().in('id', locationIds)
      }
      if (tenantIds.length > 0) {
        await service.from('tenants').delete().in('id', tenantIds)
      }
      for (const userId of createdUserIds) {
        await service.auth.admin.deleteUser(userId)
      }
    },
  }
}

test.describe('recalculate analytics cron handler auth', () => {
  function createDeps(
    overrides: Partial<RecalculateAnalyticsDeps> = {},
  ): { deps: RecalculateAnalyticsDeps; inserted: InsertStaffNotificationInput[]; calls: Record<string, number> } {
    const inserted: InsertStaffNotificationInput[] = []
    const calls = {
      loadPreviousAnalytics: 0,
      recomputeAllAnalytics: 0,
      loadCurrentAnalytics: 0,
    }

    const previousRows: PreviousAnalyticsRow[] = [
      { client_id: 'client-a', churn_status: 'green' },
      { client_id: 'client-b', churn_status: 'red' },
      { client_id: 'client-c', churn_status: 'unknown' },
    ]

    const currentRows: AnalyticsRow[] = [
      {
        client_id: 'client-a',
        tenant_id: 'tenant-a',
        churn_status: 'yellow',
        days_since_last_visit: 31,
        avg_frequency_days: 20,
        clients: { full_name: 'Mario Rossi' },
      },
      {
        client_id: 'client-b',
        tenant_id: 'tenant-a',
        churn_status: 'red',
        days_since_last_visit: 60,
        avg_frequency_days: 10,
        clients: { full_name: 'Luigi Verdi' },
      },
      {
        client_id: 'client-c',
        tenant_id: 'tenant-b',
        churn_status: 'green',
        days_since_last_visit: 5,
        avg_frequency_days: 15,
        clients: { full_name: 'Anna Bianchi' },
      },
    ]

    const deps: RecalculateAnalyticsDeps = {
      env: { cronSecret: TEST_SECRET },
      loadPreviousAnalytics: async () => {
        calls.loadPreviousAnalytics += 1
        return { data: previousRows, error: null }
      },
      recomputeAllAnalytics: async () => {
        calls.recomputeAllAnalytics += 1
        return { data: 3, error: null }
      },
      loadCurrentAnalytics: async () => {
        calls.loadCurrentAnalytics += 1
        return { data: currentRows, error: null }
      },
      insertStaffNotification: async (params) => {
        inserted.push(params)
      },
      now: () => 1_000,
      logError: () => undefined,
      logInfo: () => undefined,
      ...overrides,
    }

    return { deps, inserted, calls }
  }

  test('missing or wrong secret is rejected before any DB work', async () => {
    const missing = createDeps()
    const missingResponse = await handleRecalculateAnalyticsRequest(buildCronRequest(), missing.deps)
    expect(missingResponse.status).toBe(401)
    expect(missing.calls).toEqual({
      loadPreviousAnalytics: 0,
      recomputeAllAnalytics: 0,
      loadCurrentAnalytics: 0,
    })

    const wrong = createDeps()
    const wrongResponse = await handleRecalculateAnalyticsRequest(
      buildCronRequest({ authorization: 'Bearer wrong-secret' }),
      wrong.deps,
    )
    expect(wrongResponse.status).toBe(401)
    expect(wrong.calls).toEqual({
      loadPreviousAnalytics: 0,
      recomputeAllAnalytics: 0,
      loadCurrentAnalytics: 0,
    })
  })

  test('valid secret keeps the cron protected and only alerts on deteriorations', async () => {
    const { deps, inserted, calls } = createDeps()

    const response = await handleRecalculateAnalyticsRequest(
      buildCronRequest({ authorization: `Bearer ${TEST_SECRET}` }),
      deps,
    )

    expect(response.status).toBe(200)
    expect(calls).toEqual({
      loadPreviousAnalytics: 1,
      recomputeAllAnalytics: 1,
      loadCurrentAnalytics: 1,
    })
    await expect(response.json()).resolves.toEqual({
      processed: 3,
      churnAlertsCreated: 1,
      total: 3,
      green: 1,
      yellow: 1,
      red: 1,
      unknown: 0,
      durationMs: 0,
    })
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      tenantId: 'tenant-a',
      type: 'churn_alert',
      title: 'Cliente a rischio',
      meta: {
        client_id: 'client-a',
        churn_status: 'yellow',
        previous_status: 'green',
      },
    })
  })
})

test.describe.serial('client analytics recompute scalability', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for analytics recompute fixtures.')
  let fixture: AnalyticsFixture | null = null

  test.beforeAll(async () => {
    fixture = await seedAnalyticsFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): AnalyticsFixture {
    if (!fixture) {
      throw new Error('Analytics recompute fixture not initialized')
    }
    return fixture
  }

  test('tenant-scoped recompute produces correct analytics and stays isolated', async () => {
    const service = requireServiceClient()
    const fixture = getFixture()

    const targetClientIds = [...fixture.tenantA.clientIds, ...fixture.tenantB.clientIds]
    const { error: clearError } = await service
      .from('client_analytics')
      .delete()
      .in('client_id', targetClientIds)
    await assertNoSupabaseError('clear seeded client analytics', clearError)

    const { data: processedA, error: recomputeAError } = await service.rpc(
      'recompute_tenant_client_analytics',
      { p_tenant_id: fixture.tenantA.tenantId },
    )
    await assertNoSupabaseError('recompute tenant A analytics', recomputeAError)
    expect(processedA).toBe(fixture.tenantA.clientIds.length)

    const { data: tenantARows, error: tenantAAnalyticsError } = await service
      .from('client_analytics')
      .select('client_id, tenant_id, total_visits, avg_frequency_days, days_since_last_visit, churn_status')
      .in('client_id', targetClientIds)
    await assertNoSupabaseError('read tenant A analytics rows', tenantAAnalyticsError)

    const analyticsByClientId = new Map((tenantARows ?? []).map((row) => [row.client_id, row]))
    expect((tenantARows ?? []).filter((row) => row.tenant_id === fixture.tenantA.tenantId)).toHaveLength(5)
    expect((tenantARows ?? []).filter((row) => row.tenant_id === fixture.tenantB.tenantId)).toHaveLength(0)

    const green = analyticsByClientId.get(fixture.tenantA.clientIdsByName['Analytics A Green'])
    expect(green?.total_visits).toBe(2)
    expect(Number(green?.avg_frequency_days ?? 0)).toBeCloseTo(20, 2)
    expect(green?.days_since_last_visit).toBe(10)
    expect(green?.churn_status).toBe('green')

    const yellow = analyticsByClientId.get(fixture.tenantA.clientIdsByName['Analytics A Yellow'])
    expect(yellow?.total_visits).toBe(2)
    expect(Number(yellow?.avg_frequency_days ?? 0)).toBeCloseTo(20, 2)
    expect(yellow?.days_since_last_visit).toBe(30)
    expect(yellow?.churn_status).toBe('yellow')

    const red = analyticsByClientId.get(fixture.tenantA.clientIdsByName['Analytics A Red'])
    expect(red?.total_visits).toBe(2)
    expect(Number(red?.avg_frequency_days ?? 0)).toBeCloseTo(10, 2)
    expect(red?.days_since_last_visit).toBe(60)
    expect(red?.churn_status).toBe('red')

    const oneVisit = analyticsByClientId.get(fixture.tenantA.clientIdsByName['Analytics A One Visit'])
    expect(oneVisit?.total_visits).toBe(1)
    expect(oneVisit?.avg_frequency_days).toBeNull()
    expect(oneVisit?.days_since_last_visit).toBe(5)
    expect(oneVisit?.churn_status).toBe('unknown')

    const noVisits = analyticsByClientId.get(fixture.tenantA.clientIdsByName['Analytics A No Visits'])
    expect(noVisits?.total_visits).toBe(0)
    expect(noVisits?.avg_frequency_days).toBeNull()
    expect(noVisits?.days_since_last_visit).toBeNull()
    expect(noVisits?.churn_status).toBe('unknown')

    const { data: processedB, error: recomputeBError } = await service.rpc(
      'recompute_tenant_client_analytics',
      { p_tenant_id: fixture.tenantB.tenantId },
    )
    await assertNoSupabaseError('recompute tenant B analytics', recomputeBError)
    expect(processedB).toBe(fixture.tenantB.clientIds.length)

    const { data: tenantBRows, error: tenantBAnalyticsError } = await service
      .from('client_analytics')
      .select('client_id, tenant_id, total_visits, avg_frequency_days, days_since_last_visit, churn_status')
      .in('client_id', fixture.tenantB.clientIds)
    await assertNoSupabaseError('read tenant B analytics rows', tenantBAnalyticsError)

    const tenantBAnalyticsByClientId = new Map((tenantBRows ?? []).map((row) => [row.client_id, row]))
    const bGreen = tenantBAnalyticsByClientId.get(fixture.tenantB.clientIdsByName['Analytics B Green'])
    expect(bGreen?.tenant_id).toBe(fixture.tenantB.tenantId)
    expect(bGreen?.total_visits).toBe(2)
    expect(Number(bGreen?.avg_frequency_days ?? 0)).toBeCloseTo(20, 2)
    expect(bGreen?.days_since_last_visit).toBe(5)
    expect(bGreen?.churn_status).toBe('green')

    const bNoVisits = tenantBAnalyticsByClientId.get(fixture.tenantB.clientIdsByName['Analytics B No Visits'])
    expect(bNoVisits?.tenant_id).toBe(fixture.tenantB.tenantId)
    expect(bNoVisits?.total_visits).toBe(0)
    expect(bNoVisits?.avg_frequency_days).toBeNull()
    expect(bNoVisits?.days_since_last_visit).toBeNull()
    expect(bNoVisits?.churn_status).toBe('unknown')
  })

  test('large simulated tenant recompute stays set-based and avoids per-client loops', async () => {
    const service = requireServiceClient()
    const fixture = getFixture()

    const { error: clearError } = await service
      .from('client_analytics')
      .delete()
      .in('client_id', fixture.tenantLarge.clientIds)
    await assertNoSupabaseError('clear large tenant analytics', clearError)

    const { data: processedLarge, error: recomputeLargeError } = await service.rpc(
      'recompute_tenant_client_analytics',
      { p_tenant_id: fixture.tenantLarge.tenantId },
    )
    await assertNoSupabaseError('recompute large tenant analytics', recomputeLargeError)
    expect(processedLarge).toBe(LARGE_TENANT_CLIENT_COUNT)

    const { count: analyticsCount, error: analyticsCountError } = await service
      .from('client_analytics')
      .select('client_id', { count: 'exact', head: true })
      .in('client_id', fixture.tenantLarge.clientIds)
    await assertNoSupabaseError('count large tenant analytics rows', analyticsCountError)
    expect(analyticsCount).toBe(LARGE_TENANT_CLIENT_COUNT)

    const { data: sampleRows, error: sampleRowsError } = await service
      .from('client_analytics')
      .select('total_visits, churn_status')
      .in('client_id', fixture.tenantLarge.clientIds.slice(0, 5))
    await assertNoSupabaseError('read large tenant sample analytics rows', sampleRowsError)
    expect((sampleRows ?? []).every((row) => row.total_visits === 2 && row.churn_status === 'green')).toBe(true)

    const migrationSql = readFileSync(
      path.join(
        process.cwd(),
        '..',
        '..',
        'supabase',
        'migrations',
        '20260709120000_set_based_client_analytics_recompute.sql',
      ),
      'utf8',
    )
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.recompute_tenant_client_analytics')
    expect(migrationSql).toContain('INSERT INTO public.client_analytics')
    expect(migrationSql).not.toContain('FOR r IN SELECT id FROM public.clients LOOP')
  })
})
