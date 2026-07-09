import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const EXTRA_STAFF_COUNT = 14
const HISTORICAL_APPOINTMENT_COUNT = 90
const MAX_FILTERED_HTML_LENGTH = 220_000

interface UserSeed {
  id: string
  email: string
  password: string
}

interface TenantSeed {
  tenantId: string
  slug: string
  locationId: string
  ownerStaffId: string
  staffIdsByName: Record<string, string>
  serviceIdsByName: Record<string, string>
  clientIdsByName: Record<string, string>
  appointmentIds: string[]
}

interface AppointmentSeed {
  clientName: string
  staffName: string
  date: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'completed' | 'pending'
  serviceNames: string[]
  notes?: string | null
}

interface CalendarioFixture {
  ownerA: UserSeed
  ownerB: UserSeed
  tenantA: TenantSeed
  tenantB: TenantSeed
  weekStart: string
  dayViewDate: string
  cleanup: () => Promise<void>
}

const ALPHA_STAFF = 'Calendario Alpha Staff'
const BETA_STAFF = 'Calendario Beta Staff'
const SECRET_STAFF = 'Calendario Secret Staff'
const ALPHA_MONDAY_CLIENT = 'Calendario Alpha Monday'
const ALPHA_WEDNESDAY_CLIENT = 'Calendario Alpha Wednesday'
const BETA_TUESDAY_CLIENT = 'Calendario Beta Tuesday'
const PREVIOUS_WEEK_CLIENT = 'Calendario Previous Week'
const SECRET_TENANT_CLIENT = 'Calendario Secret Tenant'
const SERVICE_FADE = 'Calendario Fade'
const SERVICE_BEARD = 'Calendario Beard'

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

function getFutureWeekMonday(weeksFromNow: number = 1): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday + weeksFromNow * 7)
  monday.setHours(12, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const value = new Date(`${dateStr}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function toIso(dateStr: string, time: string): string {
  return `${dateStr}T${time}:00.000Z`
}

function buildExtraStaffName(index: number): string {
  return `Calendario Extra Staff ${String(index + 1).padStart(2, '0')}`
}

function buildHistoricalClientName(index: number): string {
  return `Calendario Historical ${String(index + 1).padStart(3, '0')}`
}

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  label: string,
  fullName: string,
): Promise<UserSeed> {
  const email = `playwright-calendario-${label}-${suffix}@example.com`
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
      full_name: fullName,
      onboarding_completed: true,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  return { id: userId, email, password }
}

async function createTenant(
  service: ServiceClient,
  suffix: string,
  label: 'a' | 'b',
  owner: UserSeed,
): Promise<TenantSeed> {
  const slug = `pw-calendario-${label}-${suffix}`
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Calendario ${label.toUpperCase()} ${suffix}`,
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
      name: `Calendario Location ${label.toUpperCase()}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create location ${label}`, locationError)

  const locationId = location?.id
  if (!locationId) {
    throw new Error(`create location ${label}: missing location id`)
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

  return {
    tenantId,
    slug: tenantSlug,
    locationId,
    ownerStaffId,
    staffIdsByName: {},
    serviceIdsByName: {},
    clientIdsByName: {},
    appointmentIds: [],
  }
}

async function insertServices(
  service: ServiceClient,
  tenant: TenantSeed,
  rows: Array<{ name: string; color: string; displayOrder: number }>,
  label: string,
): Promise<void> {
  const { data, error } = await service
    .from('services')
    .insert(rows.map((row) => ({
      category: 'Hair',
      color: row.color,
      display_order: row.displayOrder,
      duration_minutes: 30,
      is_active: true,
      name: row.name,
      price: 20 + row.displayOrder,
      tenant_id: tenant.tenantId,
    })))
    .select('id, name')
  await assertNoSupabaseError(`insert services ${label}`, error)

  for (const serviceRow of data ?? []) {
    tenant.serviceIdsByName[serviceRow.name] = serviceRow.id
  }
}

async function insertStaffMembers(
  service: ServiceClient,
  tenant: TenantSeed,
  suffix: string,
  names: string[],
  label: string,
  createdUserIds: string[],
): Promise<void> {
  const users = await Promise.all(
    names.map((name, index) =>
      createStaffUser(service, suffix, `${label}-${index + 1}`, name),
    ),
  )

  createdUserIds.push(...users.map((user) => user.id))

  const { data, error } = await service
    .from('staff_members')
    .insert(users.map((user) => ({
      bio: 'Calendario stress fixture',
      is_active: true,
      profile_id: user.id,
      role: 'staff',
      tenant_id: tenant.tenantId,
    })))
    .select('id, profiles(full_name)')
  await assertNoSupabaseError(`insert staff members ${label}`, error)

  for (const row of (data ?? []) as Array<{
    id: string
    profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null
  }>) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    if (profile?.full_name) {
      tenant.staffIdsByName[profile.full_name] = row.id
    }
  }
}

async function insertClients(
  service: ServiceClient,
  tenant: TenantSeed,
  suffix: string,
  names: string[],
  label: string,
): Promise<void> {
  const { data, error } = await service
    .from('clients')
    .insert(names.map((name, index) => ({
      email: `${label}-${index}-${suffix}@example.com`,
      full_name: name,
      marketing_consent: false,
      phone: `+3903${suffix.slice(0, 6)}${String(index).padStart(4, '0')}`,
      preferred_contact_channel: 'whatsapp',
      tags: [],
      tenant_id: tenant.tenantId,
    })))
    .select('id, full_name')
  await assertNoSupabaseError(`insert clients ${label}`, error)

  for (const client of data ?? []) {
    tenant.clientIdsByName[client.full_name] = client.id
  }
}

async function insertWorkingHours(
  service: ServiceClient,
  tenant: TenantSeed,
  staffNames: string[],
  label: string,
): Promise<void> {
  const rows = staffNames.flatMap((staffName) => {
    const staffId = tenant.staffIdsByName[staffName]
    if (!staffId) {
      throw new Error(`insert working hours ${label}: missing staff id for ${staffName}`)
    }

    return Array.from({ length: 6 }, (_, index) => ({
      day_of_week: index + 1,
      end_time: '18:00:00',
      location_id: tenant.locationId,
      staff_id: staffId,
      start_time: '09:00:00',
      tenant_id: tenant.tenantId,
    }))
  })

  const { error } = await service.from('working_hours').insert(rows)
  await assertNoSupabaseError(`insert working hours ${label}`, error)
}

async function insertOverrides(
  service: ServiceClient,
  tenant: TenantSeed,
  staffNames: string[],
  weekStart: string,
  label: string,
): Promise<void> {
  const overrideDate = addDays(weekStart, 4)
  const rows = staffNames.map((staffName) => {
    const staffId = tenant.staffIdsByName[staffName]
    if (!staffId) {
      throw new Error(`insert overrides ${label}: missing staff id for ${staffName}`)
    }

    return {
      date: overrideDate,
      end_time: '17:00:00',
      is_closed: false,
      reason: 'Fixture override',
      staff_id: staffId,
      start_time: '10:00:00',
      tenant_id: tenant.tenantId,
    }
  })

  const { error } = await service.from('working_hour_overrides').insert(rows)
  await assertNoSupabaseError(`insert overrides ${label}`, error)
}

async function insertAppointments(
  service: ServiceClient,
  tenant: TenantSeed,
  appointments: AppointmentSeed[],
  label: string,
): Promise<void> {
  const appointmentRows = appointments.map((appointment) => {
    const clientId = tenant.clientIdsByName[appointment.clientName]
    const staffId = tenant.staffIdsByName[appointment.staffName]
    if (!clientId || !staffId) {
      throw new Error(`insert appointments ${label}: missing ids for ${appointment.clientName}/${appointment.staffName}`)
    }

    return {
      booking_source: 'dashboard_owner' as const,
      client_id: clientId,
      end_time: toIso(appointment.date, appointment.endTime),
      location_id: tenant.locationId,
      notes: appointment.notes ?? null,
      staff_id: staffId,
      start_time: toIso(appointment.date, appointment.startTime),
      status: appointment.status,
      tenant_id: tenant.tenantId,
    }
  })

  const { data, error } = await service
    .from('appointments')
    .insert(appointmentRows)
    .select('id, client_id')
  await assertNoSupabaseError(`insert appointments ${label}`, error)

  const insertedByClientId = new Map((data ?? []).map((row) => [row.client_id, row.id]))
  const appointmentServices = appointments.flatMap((appointment) => {
    const clientId = tenant.clientIdsByName[appointment.clientName]
    const appointmentId = clientId ? insertedByClientId.get(clientId) : null
    if (!appointmentId) {
      throw new Error(`insert appointment services ${label}: missing appointment id for ${appointment.clientName}`)
    }

    tenant.appointmentIds.push(appointmentId)

    return appointment.serviceNames.map((serviceName) => {
      const serviceId = tenant.serviceIdsByName[serviceName]
      if (!serviceId) {
        throw new Error(`insert appointment services ${label}: missing service id for ${serviceName}`)
      }

      return {
        appointment_id: appointmentId,
        price_at_booking: serviceName === SERVICE_FADE ? 25 : 18,
        service_id: serviceId,
        tenant_id: tenant.tenantId,
      }
    })
  })

  const { error: servicesError } = await service.from('appointment_services').insert(appointmentServices)
  await assertNoSupabaseError(`insert appointment services ${label}`, servicesError)
}

async function seedCalendarioFixture(): Promise<CalendarioFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const tenantIds: string[] = []

  const ownerA = await createStaffUser(service, suffix, 'owner-a', 'Calendario Owner A')
  const ownerB = await createStaffUser(service, suffix, 'owner-b', 'Calendario Owner B')
  createdUserIds.push(ownerA.id, ownerB.id)

  const tenantA = await createTenant(service, suffix, 'a', ownerA)
  const tenantB = await createTenant(service, suffix, 'b', ownerB)
  tenantIds.push(tenantA.tenantId, tenantB.tenantId)

  const weekStart = getFutureWeekMonday(1)
  const dayViewDate = addDays(weekStart, 2)
  const extraStaffNames = Array.from({ length: EXTRA_STAFF_COUNT }, (_, index) => buildExtraStaffName(index))

  await insertServices(service, tenantA, [
    { name: SERVICE_FADE, color: '#2563eb', displayOrder: 1 },
    { name: SERVICE_BEARD, color: '#16a34a', displayOrder: 2 },
  ], 'tenant-a')
  await insertServices(service, tenantB, [
    { name: 'Calendario Secret Service', color: '#dc2626', displayOrder: 1 },
  ], 'tenant-b')

  await insertStaffMembers(
    service,
    tenantA,
    suffix,
    [ALPHA_STAFF, BETA_STAFF, ...extraStaffNames],
    'tenant-a',
    createdUserIds,
  )
  await insertStaffMembers(
    service,
    tenantB,
    suffix,
    [SECRET_STAFF],
    'tenant-b',
    createdUserIds,
  )

  await insertClients(
    service,
    tenantA,
    suffix,
    [
      ALPHA_MONDAY_CLIENT,
      ALPHA_WEDNESDAY_CLIENT,
      BETA_TUESDAY_CLIENT,
      PREVIOUS_WEEK_CLIENT,
      ...Array.from({ length: HISTORICAL_APPOINTMENT_COUNT }, (_, index) => buildHistoricalClientName(index)),
    ],
    'tenant-a',
  )
  await insertClients(
    service,
    tenantB,
    suffix,
    [SECRET_TENANT_CLIENT],
    'tenant-b',
  )

  await insertWorkingHours(service, tenantA, [ALPHA_STAFF, BETA_STAFF, ...extraStaffNames], 'tenant-a')
  await insertWorkingHours(service, tenantB, [SECRET_STAFF], 'tenant-b')
  await insertOverrides(service, tenantA, [ALPHA_STAFF, BETA_STAFF, ...extraStaffNames], weekStart, 'tenant-a')
  await insertOverrides(service, tenantB, [SECRET_STAFF], weekStart, 'tenant-b')

  await insertAppointments(service, tenantA, [
    {
      clientName: ALPHA_MONDAY_CLIENT,
      staffName: ALPHA_STAFF,
      date: weekStart,
      startTime: '10:00',
      endTime: '10:30',
      status: 'confirmed',
      serviceNames: [SERVICE_FADE],
    },
    {
      clientName: ALPHA_WEDNESDAY_CLIENT,
      staffName: ALPHA_STAFF,
      date: dayViewDate,
      startTime: '14:00',
      endTime: '15:00',
      status: 'completed',
      serviceNames: [SERVICE_FADE, SERVICE_BEARD],
      notes: 'Note fixture',
    },
    {
      clientName: BETA_TUESDAY_CLIENT,
      staffName: BETA_STAFF,
      date: addDays(weekStart, 1),
      startTime: '11:00',
      endTime: '11:30',
      status: 'pending',
      serviceNames: [SERVICE_BEARD],
    },
    {
      clientName: PREVIOUS_WEEK_CLIENT,
      staffName: ALPHA_STAFF,
      date: addDays(weekStart, -1),
      startTime: '09:00',
      endTime: '09:30',
      status: 'completed',
      serviceNames: [SERVICE_FADE],
    },
    ...Array.from({ length: HISTORICAL_APPOINTMENT_COUNT }, (_, index) => {
      const historicalDate = addDays(weekStart, -14 - index)
      return {
        clientName: buildHistoricalClientName(index),
        staffName: extraStaffNames[index % extraStaffNames.length],
        date: historicalDate,
        startTime: '09:00',
        endTime: '09:30',
        status: 'completed' as const,
        serviceNames: [SERVICE_FADE],
      }
    }),
  ], 'tenant-a')

  await insertAppointments(service, tenantB, [
    {
      clientName: SECRET_TENANT_CLIENT,
      staffName: SECRET_STAFF,
      date: weekStart,
      startTime: '12:00',
      endTime: '12:30',
      status: 'confirmed',
      serviceNames: ['Calendario Secret Service'],
    },
  ], 'tenant-b')

  return {
    ownerA,
    ownerB,
    tenantA,
    tenantB,
    weekStart,
    dayViewDate,
    cleanup: async () => {
      if (tenantIds.length > 0) {
        await service.from('appointment_services').delete().in('tenant_id', tenantIds)
        await service.from('appointments').delete().in('tenant_id', tenantIds)
        await service.from('working_hour_overrides').delete().in('tenant_id', tenantIds)
        await service.from('working_hours').delete().in('tenant_id', tenantIds)
        await service.from('clients').delete().in('tenant_id', tenantIds)
        await service.from('staff_members').delete().in('tenant_id', tenantIds)
        await service.from('services').delete().in('tenant_id', tenantIds)
        await service.from('locations').delete().in('tenant_id', tenantIds)
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
  const redirectUrl = new URL(redirectTo, 'http://localhost')
  const expectedPathWithSearch = `${normalizePathname(redirectUrl.pathname)}${redirectUrl.search}`
  await page.waitForURL((url) => `${normalizePathname(url.pathname)}${url.search}` === expectedPathWithSearch)
}

async function gotoAndReadHtml(page: Page, path: string): Promise<string> {
  const response = await page.goto(path)
  if (response) {
    return response.text()
  }
  return page.content()
}

test.describe.serial('calendario stress-scale SS-05', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for calendario SS-05 fixtures.')

  let fixture: CalendarioFixture | null = null

  test.beforeAll(async () => {
    fixture = await seedCalendarioFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): CalendarioFixture {
    if (!fixture) {
      throw new Error('Calendario fixture not initialized')
    }
    return fixture
  }

  test('week and day calendario views stay correct and tenant-isolated', async ({ page }) => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const weekPath = buildTenantDashboardPath(
      fixture.tenantA.slug,
      `/calendario?week=${fixture.weekStart}`,
    )

    await resetSession(page)
    await loginAs(page, fixture.ownerA, weekPath)

    await expect(page.getByText(ALPHA_MONDAY_CLIENT, { exact: true })).toBeVisible()
    await expect(page.getByText(ALPHA_WEDNESDAY_CLIENT, { exact: true })).toBeVisible()
    await expect(page.getByText(BETA_TUESDAY_CLIENT, { exact: true })).toBeVisible()
    await expect(page.getByText(PREVIOUS_WEEK_CLIENT, { exact: true })).toHaveCount(0)
    await expect(page.getByText(SECRET_TENANT_CLIENT, { exact: true })).toHaveCount(0)

    const alphaStaffId = fixture.tenantA.staffIdsByName[ALPHA_STAFF]
    const dayPath = buildTenantDashboardPath(
      fixture.tenantA.slug,
      `/calendario?day=${fixture.dayViewDate}&staff=${alphaStaffId}`,
    )
    await page.goto(dayPath)

    await expect(page.getByText(ALPHA_WEDNESDAY_CLIENT, { exact: true })).toBeVisible()
    await expect(page.getByText(ALPHA_MONDAY_CLIENT, { exact: true })).toHaveCount(0)
    await expect(page.getByText(BETA_TUESDAY_CLIENT, { exact: true })).toHaveCount(0)
  })

  test('selected staff filter keeps calendario payload bounded on a large tenant dataset', async ({ page }) => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const alphaStaffId = fixture.tenantA.staffIdsByName[ALPHA_STAFF]
    const filteredPath = buildTenantDashboardPath(
      fixture.tenantA.slug,
      `/calendario?week=${fixture.weekStart}&staff=${alphaStaffId}`,
    )

    await resetSession(page)
    await loginAs(page, fixture.ownerA, filteredPath)

    const html = await gotoAndReadHtml(page, filteredPath)

    await expect(page.getByText(ALPHA_MONDAY_CLIENT, { exact: true })).toBeVisible()
    await expect(page.getByText(ALPHA_WEDNESDAY_CLIENT, { exact: true })).toBeVisible()
    await expect(page.getByText(BETA_TUESDAY_CLIENT, { exact: true })).toHaveCount(0)
    await expect(page.getByText(SECRET_TENANT_CLIENT, { exact: true })).toHaveCount(0)

    expect(html.length).toBeLessThan(MAX_FILTERED_HTML_LENGTH)
    expect(html).not.toContain(BETA_TUESDAY_CLIENT)
    expect(html).not.toContain(SECRET_TENANT_CLIENT)
    expect(html).not.toContain(buildHistoricalClientName(0))
    expect(html).not.toContain(buildExtraStaffName(0))
  })
})
