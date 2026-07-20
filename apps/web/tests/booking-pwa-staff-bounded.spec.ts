import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import { loadLocationScopedBookingStaffSnapshot } from '../src/lib/actions/booking-public'
import { buildTenantAppPath } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const EXTRA_OTHER_LOCATION_STAFF_COUNT = 24
const MAX_STAFF_PAYLOAD_BYTES = 4_000
const MAX_BARBIERE_HTML_LENGTH = 140_000

const TENANT_A_LOCATION_NAME = 'PWA Booking Location A'
const TENANT_B_LOCATION_NAME = 'PWA Booking Secret Location'
const STAFF_ALPHA = 'Alpha Barber'
const STAFF_BETA = 'Beta Barber'
const STAFF_GAMMA = 'Gamma Barber'
const STAFF_SECRET = 'Secret Barber'
const SERVICE_FADE = 'Fade Service'
const SERVICE_BEARD = 'Beard Service'
const SERVICE_COLOR = 'Color Service'
const SERVICE_INACTIVE = 'Inactive Service'
const SERVICE_SECRET = 'Secret Service'

interface UserSeed {
  id: string
}

interface TenantSeed {
  tenantId: string
  slug: string
  locationIdsByName: Record<string, string>
  serviceIdsByName: Record<string, string>
  staffIdsByName: Record<string, string>
}

interface BookingStaffFixture {
  tenantA: TenantSeed
  tenantB: TenantSeed
  cleanup: () => Promise<void>
}

function buildExtraStaffName(index: number): string {
  return `Location B Extra ${String(index + 1).padStart(2, '0')}`
}

async function cleanupBookingStaffFixtureResources(
  service: ServiceClient,
  tenantIds: string[],
  userIds: string[],
): Promise<void> {
  const uniqueTenantIds = Array.from(new Set(tenantIds))
  const uniqueUserIds = Array.from(new Set(userIds))

  if (uniqueTenantIds.length > 0) {
    await service.from('working_hours').delete().in('tenant_id', uniqueTenantIds)
    await service.from('staff_services').delete().in('tenant_id', uniqueTenantIds)
    await service.from('staff_locations').delete().in('tenant_id', uniqueTenantIds)
    await service.from('staff_members').delete().in('tenant_id', uniqueTenantIds)
    await service.from('services').delete().in('tenant_id', uniqueTenantIds)
    await service.from('locations').delete().in('tenant_id', uniqueTenantIds)
    await service.from('tenants').delete().in('id', uniqueTenantIds)
  }

  for (const userId of uniqueUserIds) {
    await service.auth.admin.deleteUser(userId)
  }
}

async function cleanupLeakedBookingStaffFixtures(service: ServiceClient): Promise<void> {
  const [{ data: tenants, error: tenantsError }, { data: profiles, error: profilesError }] = await Promise.all([
    service
      .from('tenants')
      .select('id')
      .or('slug.ilike.pw-booking-staff-a-%,slug.ilike.pw-booking-staff-b-%'),
    service
      .from('profiles')
      .select('id')
      .ilike('email', 'playwright-booking-staff-%@example.com'),
  ])
  await assertNoSupabaseError('list leaked booking staff tenants', tenantsError)
  await assertNoSupabaseError('list leaked booking staff profiles', profilesError)

  await cleanupBookingStaffFixtureResources(
    service,
    (tenants ?? []).map((tenant) => tenant.id),
    (profiles ?? []).map((profile) => profile.id),
  )
}

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  label: string,
  fullName: string,
): Promise<UserSeed> {
  const email = `playwright-booking-staff-${label}-${Date.now()}-${suffix}@example.com`
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

  return { id: userId }
}

async function createTenant(
  service: ServiceClient,
  suffix: string,
  label: 'a' | 'b',
): Promise<TenantSeed> {
  const slug = `pw-booking-staff-${label}-${suffix}`
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Booking Staff ${label.toUpperCase()} ${suffix}`,
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

  return {
    tenantId,
    slug: tenantSlug,
    locationIdsByName: {},
    serviceIdsByName: {},
    staffIdsByName: {},
  }
}

async function insertLocations(
  service: ServiceClient,
  tenant: TenantSeed,
  names: string[],
  label: string,
): Promise<void> {
  const { data, error } = await service
    .from('locations')
    .insert(names.map((name) => ({
      is_active: true,
      name,
      tenant_id: tenant.tenantId,
    })))
    .select('id, name')
  await assertNoSupabaseError(`insert locations ${label}`, error)

  for (const location of data ?? []) {
    tenant.locationIdsByName[location.name] = location.id
  }
}

async function insertServices(
  service: ServiceClient,
  tenant: TenantSeed,
  rows: Array<{ name: string; active: boolean; displayOrder: number }>,
  label: string,
): Promise<void> {
  const { data, error } = await service
    .from('services')
    .insert(rows.map((row, index) => ({
      category: index % 2 === 0 ? 'Hair' : 'Care',
      display_order: row.displayOrder,
      duration_minutes: 30,
      is_active: row.active,
      name: row.name,
      price: 20 + index,
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
      bio: 'Public booking staff fixture',
      is_active: true,
      profile_id: user.id,
      role: 'staff',
      tenant_id: tenant.tenantId,
    })))
    .select('id, profile_id, profiles(full_name)')
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

async function insertStaffLocations(
  service: ServiceClient,
  tenant: TenantSeed,
  mappings: Array<{ staffName: string; locationName: string }>,
  label: string,
): Promise<void> {
  const rows = mappings.map((mapping) => {
    const staffId = tenant.staffIdsByName[mapping.staffName]
    const locationId = tenant.locationIdsByName[mapping.locationName]
    if (!staffId || !locationId) {
      throw new Error(`insert staff locations ${label}: missing ids for ${mapping.staffName}/${mapping.locationName}`)
    }

    return {
      location_id: locationId,
      staff_id: staffId,
      tenant_id: tenant.tenantId,
    }
  })

  const { error } = await service.from('staff_locations').insert(rows)
  await assertNoSupabaseError(`insert staff locations ${label}`, error)
}

async function insertStaffServices(
  service: ServiceClient,
  tenant: TenantSeed,
  mappings: Array<{ staffName: string; serviceNames: string[] }>,
  label: string,
): Promise<void> {
  const rows = mappings.flatMap((mapping) => {
    const staffId = tenant.staffIdsByName[mapping.staffName]
    if (!staffId) {
      throw new Error(`insert staff services ${label}: missing staff id for ${mapping.staffName}`)
    }

    return mapping.serviceNames.map((serviceName) => {
      const serviceId = tenant.serviceIdsByName[serviceName]
      if (!serviceId) {
        throw new Error(`insert staff services ${label}: missing service id for ${serviceName}`)
      }

      return {
        service_id: serviceId,
        staff_id: staffId,
        tenant_id: tenant.tenantId,
      }
    })
  })

  const { error } = await service.from('staff_services').insert(rows)
  await assertNoSupabaseError(`insert staff services ${label}`, error)
}

async function insertWorkingHours(
  service: ServiceClient,
  tenant: TenantSeed,
  mappings: Array<{ staffName: string; startTime: string; locationName: string }>,
  label: string,
): Promise<void> {
  const dayOfWeek = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`).getUTCDay()
  const rows = mappings.map((mapping) => {
    const staffId = tenant.staffIdsByName[mapping.staffName]
    const locationId = tenant.locationIdsByName[mapping.locationName]
    if (!staffId || !locationId) {
      throw new Error(`insert working hours ${label}: missing ids for ${mapping.staffName}`)
    }

    return {
      day_of_week: dayOfWeek,
      end_time: '18:00:00',
      location_id: locationId,
      staff_id: staffId,
      start_time: mapping.startTime,
      tenant_id: tenant.tenantId,
    }
  })

  const { error } = await service.from('working_hours').insert(rows)
  await assertNoSupabaseError(`insert working hours ${label}`, error)
}

async function seedBookingStaffFixture(): Promise<BookingStaffFixture> {
  const service = requireServiceClient()
  await cleanupLeakedBookingStaffFixtures(service)
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const tenantIds: string[] = []

  try {
    const tenantA = await createTenant(service, suffix, 'a')
    const tenantB = await createTenant(service, suffix, 'b')
    tenantIds.push(tenantA.tenantId, tenantB.tenantId)

    await insertLocations(service, tenantA, [TENANT_A_LOCATION_NAME, 'PWA Booking Location B'], 'tenant-a')
    await insertLocations(service, tenantB, [TENANT_B_LOCATION_NAME], 'tenant-b')

    await insertServices(service, tenantA, [
      { name: SERVICE_FADE, active: true, displayOrder: 1 },
      { name: SERVICE_BEARD, active: true, displayOrder: 2 },
      { name: SERVICE_COLOR, active: true, displayOrder: 3 },
      { name: SERVICE_INACTIVE, active: false, displayOrder: 4 },
    ], 'tenant-a')
    await insertServices(service, tenantB, [
      { name: SERVICE_SECRET, active: true, displayOrder: 1 },
    ], 'tenant-b')

    const extraStaffNames = Array.from(
      { length: EXTRA_OTHER_LOCATION_STAFF_COUNT },
      (_, index) => buildExtraStaffName(index),
    )

    await insertStaffMembers(
      service,
      tenantA,
      suffix,
      [STAFF_ALPHA, STAFF_BETA, STAFF_GAMMA, ...extraStaffNames],
      'tenant-a',
      createdUserIds,
    )
    await insertStaffMembers(
      service,
      tenantB,
      suffix,
      [STAFF_SECRET],
      'tenant-b',
      createdUserIds,
    )

    await insertStaffLocations(service, tenantA, [
      { staffName: STAFF_ALPHA, locationName: TENANT_A_LOCATION_NAME },
      { staffName: STAFF_BETA, locationName: TENANT_A_LOCATION_NAME },
      { staffName: STAFF_GAMMA, locationName: 'PWA Booking Location B' },
      ...extraStaffNames.map((name) => ({
        staffName: name,
        locationName: 'PWA Booking Location B',
      })),
    ], 'tenant-a')
    await insertStaffLocations(service, tenantB, [
      { staffName: STAFF_SECRET, locationName: TENANT_B_LOCATION_NAME },
    ], 'tenant-b')

    await insertStaffServices(service, tenantA, [
      { staffName: STAFF_ALPHA, serviceNames: [SERVICE_FADE, SERVICE_BEARD, SERVICE_INACTIVE] },
      { staffName: STAFF_BETA, serviceNames: [SERVICE_BEARD] },
      { staffName: STAFF_GAMMA, serviceNames: [SERVICE_COLOR] },
      ...extraStaffNames.map((name) => ({
        staffName: name,
        serviceNames: [SERVICE_COLOR],
      })),
    ], 'tenant-a')
    await insertStaffServices(service, tenantB, [
      { staffName: STAFF_SECRET, serviceNames: [SERVICE_SECRET] },
    ], 'tenant-b')

    await insertWorkingHours(service, tenantA, [
      { staffName: STAFF_ALPHA, startTime: '09:00:00', locationName: TENANT_A_LOCATION_NAME },
      { staffName: STAFF_BETA, startTime: '10:00:00', locationName: TENANT_A_LOCATION_NAME },
      { staffName: STAFF_GAMMA, startTime: '11:00:00', locationName: 'PWA Booking Location B' },
      ...extraStaffNames.map((name) => ({
        staffName: name,
        startTime: '12:00:00',
        locationName: 'PWA Booking Location B',
      })),
    ], 'tenant-a')
    await insertWorkingHours(service, tenantB, [
      { staffName: STAFF_SECRET, startTime: '08:30:00', locationName: TENANT_B_LOCATION_NAME },
    ], 'tenant-b')

    return {
      tenantA,
      tenantB,
      cleanup: async () => {
        await cleanupBookingStaffFixtureResources(service, tenantIds, createdUserIds)
      },
    }
  } catch (error) {
    await cleanupBookingStaffFixtureResources(service, tenantIds, createdUserIds)
    throw error
  }
}

async function gotoAndReadHtml(page: Page, path: string): Promise<string> {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  return page.content()
}

test.describe.serial('booking pwa staff bounded SS-07', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for booking SS-07 fixtures.')

  let fixture: BookingStaffFixture | null = null

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    fixture = await seedBookingStaffFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): BookingStaffFixture {
    if (!fixture) {
      throw new Error('Booking staff fixture not initialized')
    }
    return fixture
  }

  test('location-scoped booking data finds the correct staff and services only', async () => {
    const fixture = getFixture()
    const locationAId = fixture.tenantA.locationIdsByName[TENANT_A_LOCATION_NAME]
    const staffSnapshot = await loadLocationScopedBookingStaffSnapshot(
      fixture.tenantA.tenantId,
      locationAId,
    )

    expect(staffSnapshot.map((member) => member.full_name ?? member.id)).toEqual([
      STAFF_ALPHA,
      STAFF_BETA,
    ])
    expect(staffSnapshot.find((member) => member.full_name === STAFF_ALPHA)?.services.map((service) => service.name)).toEqual([
      SERVICE_FADE,
      SERVICE_BEARD,
    ])
    expect(staffSnapshot.find((member) => member.full_name === STAFF_BETA)?.services.map((service) => service.name)).toEqual([
      SERVICE_BEARD,
    ])
    expect(staffSnapshot.some((member) => member.full_name === STAFF_GAMMA)).toBe(false)
    expect(staffSnapshot.some((member) => member.full_name === STAFF_SECRET)).toBe(false)
    expect(JSON.stringify(staffSnapshot).length).toBeLessThan(MAX_STAFF_PAYLOAD_BYTES)
  })

  test('booking pages stay bounded and filtered to the selected location and staff', async ({ page }) => {
    const fixture = getFixture()
    const locationAId = fixture.tenantA.locationIdsByName[TENANT_A_LOCATION_NAME]
    const alphaId = fixture.tenantA.staffIdsByName[STAFF_ALPHA]

    await page.addInitScript(() => {
      window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
    })

    const staffHtml = await gotoAndReadHtml(
      page,
      buildTenantAppPath(
        fixture.tenantA.slug,
        `/prenota/barbiere?location=${locationAId}&locationName=${encodeURIComponent(TENANT_A_LOCATION_NAME)}`,
      ),
    )

    await expect(page.getByText(STAFF_ALPHA, { exact: true })).toBeVisible()
    await expect(page.getByText(STAFF_BETA, { exact: true })).toBeVisible()
    await expect(page.getByText(STAFF_GAMMA, { exact: true })).toHaveCount(0)
    await expect(page.getByText(buildExtraStaffName(0), { exact: true })).toHaveCount(0)
    await expect(page.getByText(STAFF_SECRET, { exact: true })).toHaveCount(0)
    expect(staffHtml.length).toBeLessThan(MAX_BARBIERE_HTML_LENGTH)

    const servicesPage = await page.context().newPage()
    await servicesPage.addInitScript(() => {
      window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
    })

    try {
      await servicesPage.goto(
        buildTenantAppPath(
          fixture.tenantA.slug,
          `/prenota/servizi?location=${locationAId}&staff=${alphaId}`,
        ),
        { waitUntil: 'domcontentloaded' },
      )

      await expect(servicesPage.getByText(SERVICE_FADE, { exact: true })).toBeVisible()
      await expect(servicesPage.getByText(SERVICE_BEARD, { exact: true })).toBeVisible()
      await expect(servicesPage.getByText(SERVICE_COLOR, { exact: true })).toHaveCount(0)
      await expect(servicesPage.getByText(SERVICE_INACTIVE, { exact: true })).toHaveCount(0)
      await expect(servicesPage.getByText(SERVICE_SECRET, { exact: true })).toHaveCount(0)
    } finally {
      await servicesPage.close()
    }
  })
})
