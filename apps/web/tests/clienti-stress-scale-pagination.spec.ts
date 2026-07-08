import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'
import type { TablesInsert } from '../src/types'

const PAGE_SIZE = 25
const TENANT_A_CLIENTS = 90
const TENANT_B_CLIENTS = 5
const MAX_HTML_LENGTH = 600_000

interface UserSeed {
  id: string
  email: string
  password: string
}

interface TenantSeed {
  tenantId: string
  slug: string
  locationId: string
  serviceId: string
  productId: string
  ownerStaffId: string
  clientIds: string[]
  appointmentIds: string[]
}

interface ClientiScaleFixture {
  ownerA: UserSeed
  ownerB: UserSeed
  tenantA: TenantSeed
  tenantB: TenantSeed
  cleanup: () => Promise<void>
}

type ClientAnalyticsInsert = TablesInsert<'client_analytics'>

function buildTenantDashboardPath(slug: string, relativePath: string): string {
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `/tenant/dashboard/${slug}${normalizedPath}`
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function longTags(prefix: string): string[] {
  return Array.from({ length: 4 }, (_, index) =>
    `${prefix}-tag-${index}-${'x'.repeat(1200)}`,
  )
}

function tenantAClientName(index: number): string {
  const padded = String(index).padStart(3, '0')
  switch (index) {
    case 4:
      return `CRM A ${padded} Needle Client`
    case 26:
      return `CRM A ${padded} Page Two Client`
    case 48:
      return `CRM A ${padded} Danger Client`
    case 56:
      return `CRM A ${padded} Inactive Unknown`
    case 61:
      return `CRM A ${padded} Inactive Null`
    case 81:
      return `CRM A ${padded} Inactive Page Two`
    default:
      return `CRM A ${padded} Client`
  }
}

function tenantBClientName(index: number): string {
  const padded = String(index).padStart(3, '0')
  if (index === 2) return `CRM B ${padded} Secret Tenant Client`
  return `CRM B ${padded} Client`
}

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  label: string,
): Promise<UserSeed> {
  const email = `playwright-clienti-${label}-${suffix}@example.com`
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
      full_name: `Playwright ${label}`,
      onboarding_completed: true,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  return { id: userId, email, password }
}

async function seedTenantBundle(
  service: ServiceClient,
  owner: UserSeed,
  suffix: string,
  label: 'a' | 'b',
  clientCount: number,
): Promise<TenantSeed> {
  const slug = `pw-clienti-${label}-${suffix}`
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Clienti ${label.toUpperCase()} ${suffix}`,
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
  if (!tenantId || !tenantSlug) throw new Error(`create tenant ${label}: missing data`)

  const { data: location, error: locationError } = await service
    .from('locations')
    .insert({
      is_active: true,
      name: `Clienti Location ${label.toUpperCase()}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create location ${label}`, locationError)
  const locationId = location?.id
  if (!locationId) throw new Error(`create location ${label}: missing id`)

  const { data: serviceRow, error: serviceError } = await service
    .from('services')
    .insert({
      duration_minutes: 30,
      is_active: true,
      name: `Clienti Service ${label.toUpperCase()}`,
      price: 28,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create service ${label}`, serviceError)
  const serviceId = serviceRow?.id
  if (!serviceId) throw new Error(`create service ${label}: missing id`)

  const { data: productRow, error: productError } = await service
    .from('products')
    .insert({
      is_active: true,
      is_new: false,
      name: `Clienti Product ${label.toUpperCase()}`,
      price_sell: 9,
      show_on_site: false,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create product ${label}`, productError)
  const productId = productRow?.id
  if (!productId) throw new Error(`create product ${label}: missing id`)

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
  if (!ownerStaffId) throw new Error(`create owner staff ${label}: missing id`)

  const clientRows = Array.from({ length: clientCount }, (_, index) => {
    const ordinal = index + 1
    const fullName = label === 'a' ? tenantAClientName(ordinal) : tenantBClientName(ordinal)
    return {
      email: `${label}-${ordinal}-${suffix}@example.com`,
      full_name: fullName,
      marketing_consent: false,
      phone: `+3900${label}${String(ordinal).padStart(6, '0')}`,
      preferred_contact_channel: 'whatsapp',
      tags: longTags(`${label}-${ordinal}`),
      tenant_id: tenantId,
    }
  })

  const { data: insertedClients, error: clientsError } = await service
    .from('clients')
    .insert(clientRows)
    .select('id, full_name')
  await assertNoSupabaseError(`create clients ${label}`, clientsError)
  const clients = insertedClients ?? []
  const clientIds = clients.map((client) => client.id)

  const appointments = clients.map((client, index) => {
    const start = new Date(Date.UTC(2026, 0, 1 + index, 9, 0, 0))
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    return {
      booking_source: 'dashboard_owner',
      client_id: client.id,
      end_time: end.toISOString(),
      location_id: locationId,
      staff_id: ownerStaffId,
      start_time: start.toISOString(),
      status: 'completed',
      tenant_id: tenantId,
    }
  })

  const { data: insertedAppointments, error: appointmentsError } = await service
    .from('appointments')
    .insert(appointments)
    .select('id, client_id')
  await assertNoSupabaseError(`create appointments ${label}`, appointmentsError)
  const appointmentIds = (insertedAppointments ?? []).map((appointment) => appointment.id)

  const appointmentServices = (insertedAppointments ?? []).map((appointment) => ({
    appointment_id: appointment.id,
    price_at_booking: 28,
    service_id: serviceId,
    tenant_id: tenantId,
  }))
  const appointmentProducts = (insertedAppointments ?? []).map((appointment) => ({
    appointment_id: appointment.id,
    price_at_sale: 9,
    product_id: productId,
    quantity: 1,
    tenant_id: tenantId,
  }))

  if (appointmentServices.length > 0) {
    const { error: appointmentServicesError } = await service
      .from('appointment_services')
      .insert(appointmentServices)
    await assertNoSupabaseError(`create appointment services ${label}`, appointmentServicesError)
  }

  if (appointmentProducts.length > 0) {
    const { error: appointmentProductsError } = await service
      .from('appointment_products')
      .insert(appointmentProducts)
    await assertNoSupabaseError(`create appointment products ${label}`, appointmentProductsError)
  }

  const analyticsRows: ClientAnalyticsInsert[] = []
  if (label === 'a') {
    for (const [index, client] of clients.entries()) {
      const ordinal = index + 1
      if (ordinal <= 30) {
        analyticsRows.push({
          avg_frequency_days: 21,
          churn_status: 'green',
          client_id: client.id,
          days_since_last_visit: 7,
          last_visit_date: new Date(Date.UTC(2026, 5, 20)).toISOString(),
          tenant_id: tenantId,
          total_visits: 6,
        })
        continue
      }
      if (ordinal <= 45) {
        analyticsRows.push({
          avg_frequency_days: 21,
          churn_status: 'yellow',
          client_id: client.id,
          days_since_last_visit: 34,
          last_visit_date: new Date(Date.UTC(2026, 5, 1)).toISOString(),
          tenant_id: tenantId,
          total_visits: 5,
        })
        continue
      }
      if (ordinal <= 55) {
        analyticsRows.push({
          avg_frequency_days: 21,
          churn_status: 'red',
          client_id: client.id,
          days_since_last_visit: 90,
          last_visit_date: new Date(Date.UTC(2026, 2, 1)).toISOString(),
          tenant_id: tenantId,
          total_visits: 4,
        })
        continue
      }
      if (ordinal <= 60) {
        analyticsRows.push({
          avg_frequency_days: null,
          churn_status: 'unknown',
          client_id: client.id,
          days_since_last_visit: null,
          last_visit_date: null,
          tenant_id: tenantId,
          total_visits: 1,
        })
      }
    }
  }

  if (analyticsRows.length > 0) {
    const { error: analyticsError } = await service
      .from('client_analytics')
      .upsert(analyticsRows, { onConflict: 'client_id' })
    await assertNoSupabaseError(`upsert analytics ${label}`, analyticsError)
  }

  return {
    tenantId,
    slug: tenantSlug,
    locationId,
    serviceId,
    productId,
    ownerStaffId,
    clientIds,
    appointmentIds,
  }
}

async function seedClientiScaleFixture(): Promise<ClientiScaleFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const tenantIds: string[] = []
  const locationIds: string[] = []
  const serviceIds: string[] = []
  const productIds: string[] = []
  const staffIds: string[] = []
  const clientIds: string[] = []
  const appointmentIds: string[] = []

  const ownerA = await createStaffUser(service, suffix, 'owner-a')
  const ownerB = await createStaffUser(service, suffix, 'owner-b')
  createdUserIds.push(ownerA.id, ownerB.id)

  const tenantA = await seedTenantBundle(service, ownerA, suffix, 'a', TENANT_A_CLIENTS)
  const tenantB = await seedTenantBundle(service, ownerB, suffix, 'b', TENANT_B_CLIENTS)

  tenantIds.push(tenantA.tenantId, tenantB.tenantId)
  locationIds.push(tenantA.locationId, tenantB.locationId)
  serviceIds.push(tenantA.serviceId, tenantB.serviceId)
  productIds.push(tenantA.productId, tenantB.productId)
  staffIds.push(tenantA.ownerStaffId, tenantB.ownerStaffId)
  clientIds.push(...tenantA.clientIds, ...tenantB.clientIds)
  appointmentIds.push(...tenantA.appointmentIds, ...tenantB.appointmentIds)

  return {
    ownerA,
    ownerB,
    tenantA,
    tenantB,
    cleanup: async () => {
      if (appointmentIds.length > 0) {
        await service.from('appointment_services').delete().in('appointment_id', appointmentIds)
        await service.from('appointment_products').delete().in('appointment_id', appointmentIds)
        await service.from('appointments').delete().in('id', appointmentIds)
      }
      if (clientIds.length > 0) {
        await service.from('client_analytics').delete().in('client_id', clientIds)
        await service.from('client_loyalty').delete().in('client_id', clientIds)
        await service.from('clients').delete().in('id', clientIds)
      }
      if (staffIds.length > 0) {
        await service.from('staff_members').delete().in('id', staffIds)
      }
      if (productIds.length > 0) {
        await service.from('products').delete().in('id', productIds)
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

test.describe.serial('clienti scalability pagination', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for clienti scalability fixtures.')
  let fixture: ClientiScaleFixture | null = null

  test.beforeAll(async () => {
    fixture = await seedClientiScaleFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): ClientiScaleFixture {
    if (!fixture) throw new Error('Clienti scale fixture not initialized')
    return fixture
  }

  test('page 1, search and churn filters stay server-side and tenant-isolated', async ({ page }) => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const clientiPath = buildTenantDashboardPath(fixture.tenantA.slug, '/clienti')

    await resetSession(page)
    await loginAs(page, fixture.ownerA, clientiPath)

    const firstPageHtml = await gotoAndReadHtml(page, clientiPath)
    await expect(page.locator('a[href^="/clienti/"]')).toHaveCount(PAGE_SIZE)
    expect(firstPageHtml).toContain('CRM A 001 Client')
    expect(firstPageHtml).not.toContain('CRM A 026 Page Two Client')
    expect(firstPageHtml).not.toContain('CRM B 002 Secret Tenant Client')

    const searchHtml = await gotoAndReadHtml(page, `${clientiPath}?query=Needle`)
    await expect(page.locator('a[href^="/clienti/"]')).toHaveCount(1)
    expect(searchHtml).toContain('CRM A 004 Needle Client')
    expect(searchHtml).not.toContain('CRM A 001 Client')
    expect(searchHtml).not.toContain('CRM B 002 Secret Tenant Client')

    const dangerHtml = await gotoAndReadHtml(page, `${clientiPath}?filter=danger`)
    await expect(page.locator('a[href^="/clienti/"]')).toHaveCount(10)
    expect(dangerHtml).toContain('CRM A 048 Danger Client')
    expect(dangerHtml).not.toContain('CRM A 004 Needle Client')

    const inactiveHtml = await gotoAndReadHtml(page, `${clientiPath}?filter=inactive`)
    await expect(page.locator('a[href^="/clienti/"]')).toHaveCount(PAGE_SIZE)
    expect(inactiveHtml).toContain('CRM A 056 Inactive Unknown')
    expect(inactiveHtml).toContain('CRM A 061 Inactive Null')
    expect(inactiveHtml).not.toContain('CRM A 048 Danger Client')
    expect(inactiveHtml).not.toContain('CRM A 081 Inactive Page Two')

    const isolatedSearchHtml = await gotoAndReadHtml(page, `${clientiPath}?query=Secret%20Tenant`)
    await expect(page.locator('a[href^="/clienti/"]')).toHaveCount(0)
    expect(isolatedSearchHtml).not.toContain('CRM B 002 Secret Tenant Client')
  })

  test('large simulated tenant keeps the clienti payload bounded to one page', async ({ page }) => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const clientiPath = buildTenantDashboardPath(fixture.tenantA.slug, '/clienti')

    await resetSession(page)
    await loginAs(page, fixture.ownerA, clientiPath)

    const html = await gotoAndReadHtml(page, clientiPath)

    await expect(page.locator('a[href^="/clienti/"]')).toHaveCount(PAGE_SIZE)
    expect(html.length).toBeLessThan(MAX_HTML_LENGTH)
    expect(html).not.toContain('CRM A 081 Inactive Page Two')
    expect(html).not.toContain('CRM B 002 Secret Tenant Client')
  })
})
