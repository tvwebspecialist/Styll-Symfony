import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const HISTORICAL_APPOINTMENT_COUNT = 120
const MAX_HTML_LENGTH = 250_000

interface UserSeed {
  id: string
  email: string
  password: string
}

interface AppointmentSeed {
  clientName: string
  startTime: Date
  endTime: Date
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  price: number
}

interface TenantSeed {
  tenantId: string
  slug: string
  locationId: string
  serviceId: string
  ownerStaffId: string
  clientIdsByName: Record<string, string>
  clientIds: string[]
  appointmentIds: string[]
}

interface DashboardHomeFixture {
  ownerA: UserSeed
  ownerB: UserSeed
  tenantA: TenantSeed
  tenantB: TenantSeed
  cleanup: () => Promise<void>
}

function buildTenantDashboardPath(slug: string, relativePath: string = '/'): string {
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `/tenant/dashboard/${slug}${normalizedPath}`
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function dayOffsetDate(dayOffset: number, hour: number, minute: number = 0): Date {
  const value = new Date()
  value.setDate(value.getDate() + dayOffset)
  value.setHours(hour, minute, 0, 0)
  return value
}

function endFromStart(start: Date, minutes: number = 30): Date {
  return new Date(start.getTime() + minutes * 60 * 1000)
}

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  label: string,
): Promise<UserSeed> {
  const email = `playwright-dashboard-home-${label}-${suffix}@example.com`
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
      full_name: `Playwright Dashboard ${label}`,
      onboarding_completed: true,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  return { id: userId, email, password }
}

async function createTenantSeed(
  service: ServiceClient,
  owner: UserSeed,
  suffix: string,
  label: 'a' | 'b',
): Promise<TenantSeed> {
  const slug = `pw-dashboard-home-${label}-${suffix}`
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Dashboard Home ${label.toUpperCase()} ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id, slug')
    .single()
  await assertNoSupabaseError(`create tenant ${label}`, tenantError)

  const tenantId = tenant?.id
  const tenantSlug = tenant?.slug
  if (!tenantId || !tenantSlug) {
    throw new Error(`create tenant ${label}: missing tenant data`)
  }

  const { data: location, error: locationError } = await service
    .from('locations')
    .insert({
      is_active: true,
      name: `Dashboard Location ${label.toUpperCase()}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create location ${label}`, locationError)
  const locationId = location?.id
  if (!locationId) {
    throw new Error(`create location ${label}: missing location id`)
  }

  const { data: serviceRow, error: serviceError } = await service
    .from('services')
    .insert({
      duration_minutes: 30,
      is_active: true,
      name: `Dashboard Service ${label.toUpperCase()}`,
      price: 20,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create service ${label}`, serviceError)
  const serviceId = serviceRow?.id
  if (!serviceId) {
    throw new Error(`create service ${label}: missing service id`)
  }

  const { data: ownerStaff, error: ownerStaffError } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: owner.id,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create owner staff ${label}`, ownerStaffError)
  const ownerStaffId = ownerStaff?.id
  if (!ownerStaffId) {
    throw new Error(`create owner staff ${label}: missing owner staff id`)
  }

  const workingHoursRows = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    day_of_week: dayOfWeek,
    end_time: '18:00:00',
    location_id: locationId,
    staff_id: ownerStaffId,
    start_time: '09:00:00',
    tenant_id: tenantId,
  }))

  const { error: workingHoursError } = await service.from('working_hours').insert(workingHoursRows)
  await assertNoSupabaseError(`create working hours ${label}`, workingHoursError)

  return {
    tenantId,
    slug: tenantSlug,
    locationId,
    serviceId,
    ownerStaffId,
    clientIdsByName: {},
    clientIds: [],
    appointmentIds: [],
  }
}

async function insertClients(
  service: ServiceClient,
  tenant: TenantSeed,
  suffix: string,
  label: string,
  names: string[],
): Promise<void> {
  const clientRows = names.map((name, index) => ({
    email: `${label}-${index}-${suffix}@example.com`,
    full_name: name,
    marketing_consent: false,
    phone: `+3902${suffix.slice(0, 6)}${String(index).padStart(4, '0')}`,
    preferred_contact_channel: 'whatsapp',
    tags: [],
    tenant_id: tenant.tenantId,
  }))

  const { data: insertedClients, error: clientsError } = await service
    .from('clients')
    .insert(clientRows)
    .select('id, full_name')
  await assertNoSupabaseError(`insert clients ${label}`, clientsError)

  for (const client of insertedClients ?? []) {
    tenant.clientIds.push(client.id)
    tenant.clientIdsByName[client.full_name] = client.id
  }
}

async function insertAppointments(
  service: ServiceClient,
  tenant: TenantSeed,
  label: string,
  appointments: AppointmentSeed[],
): Promise<void> {
  const appointmentRows = appointments.map((appointment) => {
    const clientId = tenant.clientIdsByName[appointment.clientName]
    if (!clientId) {
      throw new Error(`insert appointments ${label}: missing client id for ${appointment.clientName}`)
    }

    return {
      booking_source: 'dashboard_owner' as const,
      client_id: clientId,
      end_time: appointment.endTime.toISOString(),
      location_id: tenant.locationId,
      staff_id: tenant.ownerStaffId,
      start_time: appointment.startTime.toISOString(),
      status: appointment.status,
      tenant_id: tenant.tenantId,
    }
  })

  const { data: insertedAppointments, error: appointmentsError } = await service
    .from('appointments')
    .insert(appointmentRows)
    .select('id, client_id')
  await assertNoSupabaseError(`insert appointments ${label}`, appointmentsError)

  const insertedByClientId = new Map(
    (insertedAppointments ?? []).map((appointment) => [appointment.client_id, appointment.id]),
  )

  const appointmentServices = appointments.map((appointment) => {
    const clientId = tenant.clientIdsByName[appointment.clientName]
    const appointmentId = clientId ? insertedByClientId.get(clientId) : null
    if (!appointmentId) {
      throw new Error(`insert appointments ${label}: missing appointment id for ${appointment.clientName}`)
    }

    tenant.appointmentIds.push(appointmentId)

    return {
      appointment_id: appointmentId,
      price_at_booking: appointment.price,
      service_id: tenant.serviceId,
      tenant_id: tenant.tenantId,
    }
  })

  const { error: servicesError } = await service
    .from('appointment_services')
    .insert(appointmentServices)
  await assertNoSupabaseError(`insert appointment services ${label}`, servicesError)
}

async function insertAtRiskAnalytics(
  service: ServiceClient,
  tenant: TenantSeed,
  clientName: string,
): Promise<void> {
  const clientId = tenant.clientIdsByName[clientName]
  if (!clientId) {
    throw new Error(`insert analytics: missing client id for ${clientName}`)
  }

  const { error } = await service.from('client_analytics').upsert({
    avg_frequency_days: 21,
    churn_status: 'red',
    client_id: clientId,
    days_since_last_visit: 75,
    last_visit_date: dayOffsetDate(-75, 12).toISOString(),
    tenant_id: tenant.tenantId,
    total_visits: 4,
  }, { onConflict: 'client_id' })
  await assertNoSupabaseError(`insert analytics ${clientName}`, error)
}

async function seedDashboardHomeFixture(): Promise<DashboardHomeFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const tenantIds: string[] = []
  const locationIds: string[] = []
  const serviceIds: string[] = []
  const staffIds: string[] = []
  const clientIds: string[] = []
  const appointmentIds: string[] = []

  const ownerA = await createStaffUser(service, suffix, 'owner-a')
  const ownerB = await createStaffUser(service, suffix, 'owner-b')
  createdUserIds.push(ownerA.id, ownerB.id)

  const tenantA = await createTenantSeed(service, ownerA, suffix, 'a')
  const tenantB = await createTenantSeed(service, ownerB, suffix, 'b')

  tenantIds.push(tenantA.tenantId, tenantB.tenantId)
  locationIds.push(tenantA.locationId, tenantB.locationId)
  serviceIds.push(tenantA.serviceId, tenantB.serviceId)
  staffIds.push(tenantA.ownerStaffId, tenantB.ownerStaffId)

  const tenantAClientNames = [
    'Dashboard A Today First',
    'Dashboard A Today Second',
    'Dashboard A Yesterday Client',
    'Dashboard A Previous Week Client',
    'Dashboard A At Risk',
    ...Array.from(
      { length: HISTORICAL_APPOINTMENT_COUNT },
      (_, index) => `Dashboard A Historic ${String(index + 1).padStart(3, '0')}`,
    ),
  ]
  const tenantBClientNames = ['Dashboard B Secret Client', 'Dashboard B Secret At Risk']

  await insertClients(service, tenantA, suffix, 'tenant-a-dashboard-home', tenantAClientNames)
  await insertClients(service, tenantB, suffix, 'tenant-b-dashboard-home', tenantBClientNames)

  clientIds.push(...tenantA.clientIds, ...tenantB.clientIds)

  await insertAppointments(service, tenantA, 'tenant-a-recent', [
    {
      clientName: 'Dashboard A Today First',
      endTime: endFromStart(dayOffsetDate(0, 10)),
      price: 20,
      startTime: dayOffsetDate(0, 10),
      status: 'completed',
    },
    {
      clientName: 'Dashboard A Today Second',
      endTime: endFromStart(dayOffsetDate(0, 14)),
      price: 40,
      startTime: dayOffsetDate(0, 14),
      status: 'confirmed',
    },
    {
      clientName: 'Dashboard A Yesterday Client',
      endTime: endFromStart(dayOffsetDate(-1, 11)),
      price: 30,
      startTime: dayOffsetDate(-1, 11),
      status: 'completed',
    },
    {
      clientName: 'Dashboard A Previous Week Client',
      endTime: endFromStart(dayOffsetDate(-7, 12)),
      price: 25,
      startTime: dayOffsetDate(-7, 12),
      status: 'completed',
    },
  ])

  await insertAppointments(service, tenantA, 'tenant-a-historical', Array.from(
    { length: HISTORICAL_APPOINTMENT_COUNT },
    (_, index) => {
      const startTime = dayOffsetDate(-60 - index, 9 + (index % 6))
      return {
        clientName: `Dashboard A Historic ${String(index + 1).padStart(3, '0')}`,
        endTime: endFromStart(startTime),
        price: 18,
        startTime,
        status: 'completed' as const,
      }
    },
  ))

  await insertAppointments(service, tenantB, 'tenant-b', [
    {
      clientName: 'Dashboard B Secret Client',
      endTime: endFromStart(dayOffsetDate(0, 15)),
      price: 999,
      startTime: dayOffsetDate(0, 15),
      status: 'confirmed',
    },
  ])

  appointmentIds.push(...tenantA.appointmentIds, ...tenantB.appointmentIds)

  await insertAtRiskAnalytics(service, tenantA, 'Dashboard A At Risk')
  await insertAtRiskAnalytics(service, tenantB, 'Dashboard B Secret At Risk')

  return {
    ownerA,
    ownerB,
    tenantA,
    tenantB,
    cleanup: async () => {
      if (appointmentIds.length > 0) {
        await service.from('appointment_services').delete().in('appointment_id', appointmentIds)
        await service.from('appointments').delete().in('id', appointmentIds)
      }
      if (clientIds.length > 0) {
        await service.from('client_analytics').delete().in('client_id', clientIds)
        await service.from('clients').delete().in('id', clientIds)
      }
      if (staffIds.length > 0) {
        await service.from('working_hours').delete().in('staff_id', staffIds)
        await service.from('staff_members').delete().in('id', staffIds)
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
      for (const userId of createdUserIds) {
        await service.auth.admin.deleteUser(userId)
      }
    },
  }
}

async function resetSession(page: Page) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
  })
}

async function loginAs(page: Page, user: UserSeed, redirectTo: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
  await page.evaluate(() => {
    window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
  })
  await page.locator('#email').fill(user.email)
  await page.locator('#password').fill(user.password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  const normalizedRedirectTo = normalizePathname(redirectTo)
  await page.waitForURL((url) => normalizePathname(url.pathname) === normalizedRedirectTo)
}

async function gotoAndReadHtml(page: Page, path: string): Promise<string> {
  const response = await page.goto(path)
  if (response) {
    return response.text()
  }
  return page.content()
}

test.describe.serial('dashboard home stress-scale SS-04', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for dashboard home SS-04 fixtures.')

  let fixture: DashboardHomeFixture | null = null

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    fixture = await seedDashboardHomeFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): DashboardHomeFixture {
    if (!fixture) {
      throw new Error('Dashboard home fixture not initialized')
    }
    return fixture
  }

  test('dashboard home keeps today KPIs correct and tenant-isolated', async ({ page }) => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const dashboardPath = buildTenantDashboardPath(fixture.tenantA.slug)

    await resetSession(page)
    await loginAs(page, fixture.ownerA, dashboardPath)

    await expect(page.getByText(/Oggi hai 2 appuntamenti/)).toBeVisible()
    await expect(page.getByText(/Revenue prevista: €60/)).toBeVisible()
    await expect(page.getByText('Dashboard A Today First', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Dashboard A Today Second', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Dashboard A At Risk', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Dashboard B Secret Client')).toHaveCount(0)
    await expect(page.getByText('Dashboard B Secret At Risk')).toHaveCount(0)
  })

  test('dashboard home keeps the payload bounded on a large historical tenant dataset', async ({ page }) => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const dashboardPath = buildTenantDashboardPath(fixture.tenantA.slug)

    await resetSession(page)
    await loginAs(page, fixture.ownerA, dashboardPath)

    const html = await gotoAndReadHtml(page, dashboardPath)

    expect(html.length).toBeLessThan(MAX_HTML_LENGTH)
    expect(html).toContain('Dashboard A Today First')
    expect(html).toContain('Dashboard A Today Second')
    expect(html).not.toContain('Dashboard A Historic 001')
    expect(html).not.toContain('Dashboard A Historic 120')
    expect(html).not.toContain('Dashboard B Secret Client')
    expect(html).not.toContain('Dashboard B Secret At Risk')
  })
})
