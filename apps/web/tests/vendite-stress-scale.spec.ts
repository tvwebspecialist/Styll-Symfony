import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const LARGE_APPOINTMENT_COUNT = 180
const MAX_SUMMARY_PAYLOAD_BYTES = 2_000
const MAX_PRODUCTS_PAYLOAD_BYTES = 2_000

const TENANT_A_TOP_SERVICE = 'Vendite A Top Service'
const TENANT_A_OTHER_SERVICE = 'Vendite A Other Service'
const TENANT_A_PRODUCT_A = 'Vendite A Pomade'
const TENANT_A_PRODUCT_B = 'Vendite A Beard Oil'
const TENANT_B_SECRET_SERVICE = 'Vendite B Secret Service'
const TENANT_B_SECRET_PRODUCT = 'Vendite B Secret Product'
const TENANT_B_SECRET_CLIENT = 'Vendite B Secret Client'

interface UserSeed {
  id: string
  email: string
  password: string
}

interface TenantFixture {
  tenantId: string
  slug: string
  owner: UserSeed
}

interface VenditeFixture {
  tenantA: TenantFixture
  tenantB: TenantFixture
  tenantLargeId: string
  cleanup: () => Promise<void>
}

function startOfDay(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfDay(date: Date): Date {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function daysAgo(days: number, hour: number): Date {
  const value = new Date()
  value.setDate(value.getDate() - days)
  value.setHours(hour, 0, 0, 0)
  return value
}

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

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  label: string,
): Promise<UserSeed> {
  const email = `playwright-vendite-${label}-${suffix}@example.com`
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

function buildSummaryArgs(tenantId: string, now: Date) {
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const weekStartDate = new Date(now)
  weekStartDate.setDate(weekStartDate.getDate() - 6)
  const weekStart = startOfDay(weekStartDate).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  return {
    p_tenant_id: tenantId,
    p_today_start: todayStart,
    p_today_end: todayEnd,
    p_week_start: weekStart,
    p_month_start: monthStart,
    p_month_end: monthEnd,
    p_prev_month_start: startOfMonth(previousMonth).toISOString(),
    p_prev_month_end: endOfMonth(previousMonth).toISOString(),
  }
}

async function seedVenditeFixture(): Promise<VenditeFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const phoneSuffix = String(parseInt(suffix.slice(0, 8), 16)).padStart(8, '0')
  const createdUserIds: string[] = []
  const tenantIds: string[] = []
  const locationIds: string[] = []
  const serviceIds: string[] = []
  const productIds: string[] = []
  const inventoryIds: string[] = []
  const staffIds: string[] = []
  const clientIds: string[] = []
  const appointmentIds: string[] = []
  const paymentIds: string[] = []

  async function createTenant(owner: UserSeed, label: string) {
    const { data: tenant, error: tenantError } = await service
      .from('tenants')
      .insert({
        business_name: `Playwright Vendite ${label.toUpperCase()} ${suffix}`,
        primary_color: '#111111',
        settings: {},
        slug: `pw-vendite-${label}-${suffix}`,
        status: 'active',
        timezone: 'Europe/Rome',
      })
      .select('id, slug')
      .single()
    await assertNoSupabaseError(`create tenant ${label}`, tenantError)

    const tenantId = tenant?.id
    const slug = tenant?.slug
    if (!tenantId || !slug) throw new Error(`create tenant ${label}: missing data`)
    tenantIds.push(tenantId)

    const { data: location, error: locationError } = await service
      .from('locations')
      .insert({
        is_active: true,
        name: `Vendite Location ${label.toUpperCase()}`,
        tenant_id: tenantId,
      })
      .select('id')
      .single()
    await assertNoSupabaseError(`create location ${label}`, locationError)
    const locationId = location?.id
    if (!locationId) throw new Error(`create location ${label}: missing id`)
    locationIds.push(locationId)

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
    staffIds.push(ownerStaffId)

    return { tenantId, slug, locationId, ownerStaffId }
  }

  const ownerA = await createStaffUser(service, suffix, 'owner-a')
  const ownerB = await createStaffUser(service, suffix, 'owner-b')
  const ownerLarge = await createStaffUser(service, suffix, 'owner-large')
  createdUserIds.push(ownerA.id, ownerB.id, ownerLarge.id)

  const tenantAData = await createTenant(ownerA, 'a')
  const tenantBData = await createTenant(ownerB, 'b')
  const tenantLargeData = await createTenant(ownerLarge, 'large')

  const { data: tenantAServices, error: tenantAServicesError } = await service
    .from('services')
    .insert([
      {
        duration_minutes: 30,
        is_active: true,
        name: TENANT_A_TOP_SERVICE,
        price: 30,
        tenant_id: tenantAData.tenantId,
      },
      {
        duration_minutes: 45,
        is_active: true,
        name: TENANT_A_OTHER_SERVICE,
        price: 40,
        tenant_id: tenantAData.tenantId,
      },
    ])
    .select('id, name')
  await assertNoSupabaseError('create tenant A services', tenantAServicesError)
  const tenantATopServiceId = tenantAServices?.find((row) => row.name === TENANT_A_TOP_SERVICE)?.id
  const tenantAOtherServiceId = tenantAServices?.find((row) => row.name === TENANT_A_OTHER_SERVICE)?.id
  if (!tenantATopServiceId || !tenantAOtherServiceId) {
    throw new Error('create tenant A services: missing ids')
  }
  serviceIds.push(...(tenantAServices ?? []).map((row) => row.id))

  const { data: tenantAProducts, error: tenantAProductsError } = await service
    .from('products')
    .insert([
      {
        is_active: true,
        is_new: false,
        name: TENANT_A_PRODUCT_A,
        price_sell: 10,
        show_on_site: false,
        tenant_id: tenantAData.tenantId,
      },
      {
        is_active: true,
        is_new: false,
        name: TENANT_A_PRODUCT_B,
        price_sell: 5,
        show_on_site: false,
        tenant_id: tenantAData.tenantId,
      },
    ])
    .select('id, name')
  await assertNoSupabaseError('create tenant A products', tenantAProductsError)
  const tenantAProductAId = tenantAProducts?.find((row) => row.name === TENANT_A_PRODUCT_A)?.id
  const tenantAProductBId = tenantAProducts?.find((row) => row.name === TENANT_A_PRODUCT_B)?.id
  if (!tenantAProductAId || !tenantAProductBId) {
    throw new Error('create tenant A products: missing ids')
  }
  productIds.push(...(tenantAProducts ?? []).map((row) => row.id))

  const { data: tenantAInventory, error: tenantAInventoryError } = await service
    .from('product_inventory')
    .insert([
      {
        location_id: tenantAData.locationId,
        low_stock_threshold: 5,
        product_id: tenantAProductAId,
        quantity: 3,
        tenant_id: tenantAData.tenantId,
      },
      {
        location_id: tenantAData.locationId,
        low_stock_threshold: 4,
        product_id: tenantAProductBId,
        quantity: 10,
        tenant_id: tenantAData.tenantId,
      },
    ])
    .select('id')
  await assertNoSupabaseError('create tenant A inventory', tenantAInventoryError)
  inventoryIds.push(...(tenantAInventory ?? []).map((row) => row.id))

  const { data: tenantAClients, error: tenantAClientsError } = await service
    .from('clients')
    .insert([
      {
        full_name: 'Vendite A Today Paid',
        marketing_consent: false,
        phone: `+39001${phoneSuffix}1`,
        preferred_contact_channel: 'whatsapp',
        tags: [],
        tenant_id: tenantAData.tenantId,
      },
      {
        full_name: 'Vendite A Week Partial',
        marketing_consent: false,
        phone: `+39001${phoneSuffix}2`,
        preferred_contact_channel: 'whatsapp',
        tags: [],
        tenant_id: tenantAData.tenantId,
      },
      {
        full_name: 'Vendite A Month Pending',
        marketing_consent: false,
        phone: `+39001${phoneSuffix}3`,
        preferred_contact_channel: 'whatsapp',
        tags: [],
        tenant_id: tenantAData.tenantId,
      },
      {
        full_name: 'Vendite A Previous Month',
        marketing_consent: false,
        phone: `+39001${phoneSuffix}4`,
        preferred_contact_channel: 'whatsapp',
        tags: [],
        tenant_id: tenantAData.tenantId,
      },
    ])
    .select('id, full_name')
  await assertNoSupabaseError('create tenant A clients', tenantAClientsError)
  clientIds.push(...(tenantAClients ?? []).map((row) => row.id))

  const tenantAClientIdByName = new Map((tenantAClients ?? []).map((row) => [row.full_name, row.id]))
  const tenantAAppointmentSeeds = [
    {
      clientName: 'Vendite A Today Paid',
      start: daysAgo(0, 9),
      end: daysAgo(0, 9),
      status: 'completed',
    },
    {
      clientName: 'Vendite A Week Partial',
      start: daysAgo(3, 11),
      end: daysAgo(3, 11),
      status: 'completed',
    },
    {
      clientName: 'Vendite A Month Pending',
      start: daysAgo(8, 14),
      end: daysAgo(8, 14),
      status: 'completed',
    },
    {
      clientName: 'Vendite A Previous Month',
      start: daysAgo(35, 16),
      end: daysAgo(35, 16),
      status: 'completed',
    },
  ].map((seed) => {
    const start = new Date(seed.start)
    const end = new Date(seed.end)
    end.setMinutes(end.getMinutes() + 30)

    const clientId = tenantAClientIdByName.get(seed.clientName)
    if (!clientId) throw new Error(`missing tenant A client id for ${seed.clientName}`)

    return {
      booking_source: 'dashboard_owner' as const,
      client_id: clientId,
      end_time: end.toISOString(),
      location_id: tenantAData.locationId,
      staff_id: tenantAData.ownerStaffId,
      start_time: start.toISOString(),
      status: seed.status,
      tenant_id: tenantAData.tenantId,
    }
  })

  const { data: tenantAAppointments, error: tenantAAppointmentsError } = await service
    .from('appointments')
    .insert(tenantAAppointmentSeeds)
    .select('id, client_id, start_time')
  await assertNoSupabaseError('create tenant A appointments', tenantAAppointmentsError)
  appointmentIds.push(...(tenantAAppointments ?? []).map((row) => row.id))

  const tenantAAppointmentsByClientId = new Map((tenantAAppointments ?? []).map((row) => [row.client_id, row.id]))
  const tenantATodayClientId = tenantAClientIdByName.get('Vendite A Today Paid')
  const tenantAWeekClientId = tenantAClientIdByName.get('Vendite A Week Partial')
  const tenantAMonthClientId = tenantAClientIdByName.get('Vendite A Month Pending')
  const tenantAPreviousClientId = tenantAClientIdByName.get('Vendite A Previous Month')
  if (!tenantATodayClientId || !tenantAWeekClientId || !tenantAMonthClientId || !tenantAPreviousClientId) {
    throw new Error('missing tenant A client ids')
  }
  const tenantATodayAppointmentId = tenantAAppointmentsByClientId.get(tenantATodayClientId)
  const tenantAWeekAppointmentId = tenantAAppointmentsByClientId.get(tenantAWeekClientId)
  const tenantAMonthAppointmentId = tenantAAppointmentsByClientId.get(tenantAMonthClientId)
  const tenantAPreviousAppointmentId = tenantAAppointmentsByClientId.get(tenantAPreviousClientId)
  if (!tenantATodayAppointmentId || !tenantAWeekAppointmentId || !tenantAMonthAppointmentId || !tenantAPreviousAppointmentId) {
    throw new Error('missing tenant A appointment ids')
  }

  const { error: tenantAAppointmentServicesError } = await service
    .from('appointment_services')
    .insert([
      {
        appointment_id: tenantATodayAppointmentId,
        price_at_booking: 30,
        service_id: tenantATopServiceId,
        tenant_id: tenantAData.tenantId,
      },
      {
        appointment_id: tenantAWeekAppointmentId,
        price_at_booking: 30,
        service_id: tenantATopServiceId,
        tenant_id: tenantAData.tenantId,
      },
      {
        appointment_id: tenantAMonthAppointmentId,
        price_at_booking: 40,
        service_id: tenantAOtherServiceId,
        tenant_id: tenantAData.tenantId,
      },
      {
        appointment_id: tenantAPreviousAppointmentId,
        price_at_booking: 30,
        service_id: tenantATopServiceId,
        tenant_id: tenantAData.tenantId,
      },
    ])
  await assertNoSupabaseError('create tenant A appointment services', tenantAAppointmentServicesError)

  const { error: tenantAAppointmentProductsError } = await service
    .from('appointment_products')
    .insert([
      {
        appointment_id: tenantATodayAppointmentId,
        price_at_sale: 10,
        product_id: tenantAProductAId,
        quantity: 1,
        tenant_id: tenantAData.tenantId,
      },
      {
        appointment_id: tenantAWeekAppointmentId,
        price_at_sale: 5,
        product_id: tenantAProductBId,
        quantity: 2,
        tenant_id: tenantAData.tenantId,
      },
      {
        appointment_id: tenantAPreviousAppointmentId,
        price_at_sale: 10,
        product_id: tenantAProductAId,
        quantity: 1,
        tenant_id: tenantAData.tenantId,
      },
    ])
  await assertNoSupabaseError('create tenant A appointment products', tenantAAppointmentProductsError)

  const { data: tenantAPayments, error: tenantAPaymentsError } = await service
    .from('payments')
    .insert([
      {
        amount: 40,
        appointment_id: tenantATodayAppointmentId,
        client_id: tenantATodayClientId,
        paid_at: new Date().toISOString(),
        payment_method: 'cash',
        status: 'completed',
        tenant_id: tenantAData.tenantId,
      },
      {
        amount: 20,
        appointment_id: tenantAWeekAppointmentId,
        client_id: tenantAWeekClientId,
        paid_at: daysAgo(3, 12).toISOString(),
        payment_method: 'card_terminal',
        status: 'completed',
        tenant_id: tenantAData.tenantId,
      },
      {
        amount: 40,
        appointment_id: tenantAPreviousAppointmentId,
        client_id: tenantAPreviousClientId,
        paid_at: daysAgo(35, 17).toISOString(),
        payment_method: 'cash',
        status: 'completed',
        tenant_id: tenantAData.tenantId,
      },
    ])
    .select('id')
  await assertNoSupabaseError('create tenant A payments', tenantAPaymentsError)
  paymentIds.push(...(tenantAPayments ?? []).map((row) => row.id))

  const { data: tenantBService, error: tenantBServiceError } = await service
    .from('services')
    .insert({
      duration_minutes: 30,
      is_active: true,
      name: TENANT_B_SECRET_SERVICE,
      price: 999,
      tenant_id: tenantBData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant B service', tenantBServiceError)
  const tenantBServiceId = tenantBService?.id
  if (!tenantBServiceId) throw new Error('create tenant B service: missing id')
  serviceIds.push(tenantBServiceId)

  const { data: tenantBProduct, error: tenantBProductError } = await service
    .from('products')
    .insert({
      is_active: true,
      is_new: false,
      name: TENANT_B_SECRET_PRODUCT,
      price_sell: 111,
      show_on_site: false,
      tenant_id: tenantBData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant B product', tenantBProductError)
  const tenantBProductId = tenantBProduct?.id
  if (!tenantBProductId) throw new Error('create tenant B product: missing id')
  productIds.push(tenantBProductId)

  const { data: tenantBInventory, error: tenantBInventoryError } = await service
    .from('product_inventory')
    .insert({
      location_id: tenantBData.locationId,
      low_stock_threshold: 2,
      product_id: tenantBProductId,
      quantity: 9,
      tenant_id: tenantBData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant B inventory', tenantBInventoryError)
  if (!tenantBInventory?.id) throw new Error('create tenant B inventory: missing id')
  inventoryIds.push(tenantBInventory.id)

  const { data: tenantBClient, error: tenantBClientError } = await service
    .from('clients')
    .insert({
      full_name: TENANT_B_SECRET_CLIENT,
      marketing_consent: false,
      phone: `+39002${phoneSuffix}1`,
      preferred_contact_channel: 'whatsapp',
      tags: [],
      tenant_id: tenantBData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant B client', tenantBClientError)
  const tenantBClientId = tenantBClient?.id
  if (!tenantBClientId) throw new Error('create tenant B client: missing id')
  clientIds.push(tenantBClientId)

  const tenantBAppointmentStart = daysAgo(0, 13)
  const tenantBAppointmentEnd = new Date(tenantBAppointmentStart)
  tenantBAppointmentEnd.setMinutes(tenantBAppointmentEnd.getMinutes() + 30)

  const { data: tenantBAppointment, error: tenantBAppointmentError } = await service
    .from('appointments')
    .insert({
      booking_source: 'dashboard_owner',
      client_id: tenantBClientId,
      end_time: tenantBAppointmentEnd.toISOString(),
      location_id: tenantBData.locationId,
      staff_id: tenantBData.ownerStaffId,
      start_time: tenantBAppointmentStart.toISOString(),
      status: 'completed',
      tenant_id: tenantBData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant B appointment', tenantBAppointmentError)
  const tenantBAppointmentId = tenantBAppointment?.id
  if (!tenantBAppointmentId) throw new Error('create tenant B appointment: missing id')
  appointmentIds.push(tenantBAppointmentId)

  const { error: tenantBAppointmentServicesError } = await service
    .from('appointment_services')
    .insert({
      appointment_id: tenantBAppointmentId,
      price_at_booking: 999,
      service_id: tenantBServiceId,
      tenant_id: tenantBData.tenantId,
    })
  await assertNoSupabaseError('create tenant B appointment services', tenantBAppointmentServicesError)

  const { error: tenantBAppointmentProductsError } = await service
    .from('appointment_products')
    .insert({
      appointment_id: tenantBAppointmentId,
      price_at_sale: 111,
      product_id: tenantBProductId,
      quantity: 1,
      tenant_id: tenantBData.tenantId,
    })
  await assertNoSupabaseError('create tenant B appointment products', tenantBAppointmentProductsError)

  const { data: tenantBPayment, error: tenantBPaymentError } = await service
    .from('payments')
    .insert({
      amount: 1_110,
      appointment_id: tenantBAppointmentId,
      client_id: tenantBClientId,
      paid_at: tenantBAppointmentStart.toISOString(),
      payment_method: 'cash',
      status: 'completed',
      tenant_id: tenantBData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant B payment', tenantBPaymentError)
  if (!tenantBPayment?.id) throw new Error('create tenant B payment: missing id')
  paymentIds.push(tenantBPayment.id)

  const { data: tenantLargeService, error: tenantLargeServiceError } = await service
    .from('services')
    .insert({
      duration_minutes: 30,
      is_active: true,
      name: 'Vendite Large Service',
      price: 25,
      tenant_id: tenantLargeData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create large service', tenantLargeServiceError)
  const tenantLargeServiceId = tenantLargeService?.id
  if (!tenantLargeServiceId) throw new Error('create large service: missing id')
  serviceIds.push(tenantLargeServiceId)

  const { data: tenantLargeProduct, error: tenantLargeProductError } = await service
    .from('products')
    .insert({
      is_active: true,
      is_new: false,
      name: 'Vendite Large Product',
      price_sell: 7,
      show_on_site: false,
      tenant_id: tenantLargeData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create large product', tenantLargeProductError)
  const tenantLargeProductId = tenantLargeProduct?.id
  if (!tenantLargeProductId) throw new Error('create large product: missing id')
  productIds.push(tenantLargeProductId)

  const { data: tenantLargeInventory, error: tenantLargeInventoryError } = await service
    .from('product_inventory')
    .insert({
      location_id: tenantLargeData.locationId,
      low_stock_threshold: 10,
      product_id: tenantLargeProductId,
      quantity: 500,
      tenant_id: tenantLargeData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create large inventory', tenantLargeInventoryError)
  if (!tenantLargeInventory?.id) throw new Error('create large inventory: missing id')
  inventoryIds.push(tenantLargeInventory.id)

  const { data: tenantLargeClient, error: tenantLargeClientError } = await service
    .from('clients')
    .insert({
      full_name: 'Vendite Large Client',
      marketing_consent: false,
      phone: `+39003${phoneSuffix}1`,
      preferred_contact_channel: 'whatsapp',
      tags: [],
      tenant_id: tenantLargeData.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create large client', tenantLargeClientError)
  const tenantLargeClientId = tenantLargeClient?.id
  if (!tenantLargeClientId) throw new Error('create large client: missing id')
  clientIds.push(tenantLargeClientId)

  const largeStartBase = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1, 8, 0, 0))
  const largeAppointments = Array.from({ length: LARGE_APPOINTMENT_COUNT }, (_, index) => {
    const start = new Date(largeStartBase.getTime() + index * 30 * 60 * 1000)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    return {
      booking_source: 'dashboard_owner' as const,
      client_id: tenantLargeClientId,
      end_time: end.toISOString(),
      location_id: tenantLargeData.locationId,
      staff_id: tenantLargeData.ownerStaffId,
      start_time: start.toISOString(),
      status: 'completed',
      tenant_id: tenantLargeData.tenantId,
    }
  })

  const { data: insertedLargeAppointments, error: insertedLargeAppointmentsError } = await service
    .from('appointments')
    .insert(largeAppointments)
    .select('id')
  await assertNoSupabaseError('create large appointments', insertedLargeAppointmentsError)
  const largeAppointmentIds = (insertedLargeAppointments ?? []).map((row) => row.id)
  appointmentIds.push(...largeAppointmentIds)

  const { error: largeAppointmentServicesError } = await service
    .from('appointment_services')
    .insert(
      largeAppointmentIds.map((appointmentId) => ({
        appointment_id: appointmentId,
        price_at_booking: 25,
        service_id: tenantLargeServiceId,
        tenant_id: tenantLargeData.tenantId,
      })),
    )
  await assertNoSupabaseError('create large appointment services', largeAppointmentServicesError)

  const { error: largeAppointmentProductsError } = await service
    .from('appointment_products')
    .insert(
      largeAppointmentIds.map((appointmentId) => ({
        appointment_id: appointmentId,
        price_at_sale: 7,
        product_id: tenantLargeProductId,
        quantity: 1,
        tenant_id: tenantLargeData.tenantId,
      })),
    )
  await assertNoSupabaseError('create large appointment products', largeAppointmentProductsError)

  const { data: largePayments, error: largePaymentsError } = await service
    .from('payments')
    .insert(
      largeAppointmentIds.map((appointmentId, index) => ({
        amount: 32,
        appointment_id: appointmentId,
        client_id: tenantLargeClientId,
        paid_at: new Date(largeStartBase.getTime() + index * 30 * 60 * 1000).toISOString(),
        payment_method: 'cash',
        status: 'completed',
        tenant_id: tenantLargeData.tenantId,
      })),
    )
    .select('id')
  await assertNoSupabaseError('create large payments', largePaymentsError)
  paymentIds.push(...(largePayments ?? []).map((row) => row.id))

  return {
    tenantA: {
      tenantId: tenantAData.tenantId,
      slug: tenantAData.slug,
      owner: ownerA,
    },
    tenantB: {
      tenantId: tenantBData.tenantId,
      slug: tenantBData.slug,
      owner: ownerB,
    },
    tenantLargeId: tenantLargeData.tenantId,
    cleanup: async () => {
      if (paymentIds.length > 0) {
        await service.from('payments').delete().in('id', paymentIds)
      }
      if (appointmentIds.length > 0) {
        await service.from('appointment_services').delete().in('appointment_id', appointmentIds)
        await service.from('appointment_products').delete().in('appointment_id', appointmentIds)
        await service.from('appointments').delete().in('id', appointmentIds)
      }
      if (inventoryIds.length > 0) {
        await service.from('product_inventory').delete().in('id', inventoryIds)
      }
      if (clientIds.length > 0) {
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

test.describe.serial('vendite stress-scale SS-02', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for vendite SS-02 fixtures.')
  let fixture: VenditeFixture | null = null
  let service: ServiceClient | null = null

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    service = requireServiceClient()
    fixture = await seedVenditeFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): VenditeFixture {
    if (!fixture) throw new Error('Vendite fixture not initialized')
    return fixture
  }

  function getService(): ServiceClient {
    if (!service) throw new Error('Vendite service client not initialized')
    return service
  }

  test('sales summary, products, and appointments stay correct and tenant-isolated', async () => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const service = getService()
    const now = new Date()

    const { data: summaryA, error: summaryAError } = await service
      .rpc('get_sales_summary', buildSummaryArgs(fixture.tenantA.tenantId, now))
      .single()
    await assertNoSupabaseError('read tenant A sales summary', summaryAError)
    expect(Number(summaryA?.revenue_today ?? 0)).toBe(40)
    expect(Number(summaryA?.revenue_week ?? 0)).toBe(80)
    expect(Number(summaryA?.revenue_month ?? 0)).toBe(120)
    expect(Number(summaryA?.revenue_previous_month ?? 0)).toBe(40)
    expect(Number(summaryA?.revenue_services_month ?? 0)).toBe(100)
    expect(Number(summaryA?.revenue_products_month ?? 0)).toBe(20)
    expect(Number(summaryA?.appointments_completed_today ?? 0)).toBe(1)
    expect(Number(summaryA?.appointments_completed_month ?? 0)).toBe(3)
    expect(summaryA?.top_service_name).toBe(TENANT_A_TOP_SERVICE)
    expect(Number(summaryA?.top_service_count ?? 0)).toBe(2)

    const { data: summaryB, error: summaryBError } = await service
      .rpc('get_sales_summary', buildSummaryArgs(fixture.tenantB.tenantId, now))
      .single()
    await assertNoSupabaseError('read tenant B sales summary', summaryBError)
    expect(Number(summaryB?.revenue_month ?? 0)).toBe(1_110)
    expect(summaryB?.top_service_name).toBe(TENANT_B_SECRET_SERVICE)

    const { data: productsA, error: productsAError } = await service.rpc('get_sales_products', {
      p_tenant_id: fixture.tenantA.tenantId,
      p_from: startOfMonth(now).toISOString(),
      p_to: endOfDay(now).toISOString(),
    })
    await assertNoSupabaseError('read tenant A sold products', productsAError)
    expect((productsA ?? []).map((row) => row.product_name)).toEqual([TENANT_A_PRODUCT_B, TENANT_A_PRODUCT_A])
    expect(Number(productsA?.[0]?.total_qty ?? 0)).toBe(2)
    expect(Number(productsA?.[0]?.total_revenue ?? 0)).toBe(10)
    expect(Number(productsA?.[0]?.current_stock ?? 0)).toBe(8)
    expect(Boolean(productsA?.[0]?.low_stock_alert)).toBe(false)
    expect(Number(productsA?.[1]?.total_qty ?? 0)).toBe(1)
    expect(Number(productsA?.[1]?.total_revenue ?? 0)).toBe(10)
    expect(Number(productsA?.[1]?.current_stock ?? 0)).toBe(1)
    expect(Boolean(productsA?.[1]?.low_stock_alert)).toBe(true)

    const { data: appointmentsA, error: appointmentsAError } = await service.rpc('get_sales_appointments', {
      p_tenant_id: fixture.tenantA.tenantId,
      p_date_from: null,
      p_date_to: null,
      p_status: null,
    })
    await assertNoSupabaseError('read tenant A sales appointments', appointmentsAError)
    expect((appointmentsA ?? []).map((row) => row.client_name)).toEqual([
      'Vendite A Today Paid',
      'Vendite A Week Partial',
      'Vendite A Month Pending',
      'Vendite A Previous Month',
    ])
    expect((appointmentsA ?? []).every((row) => !row.client_name.includes('Secret'))).toBe(true)
    expect(Number(appointmentsA?.[0]?.total_amount ?? 0)).toBe(40)
    expect(Number(appointmentsA?.[0]?.paid_amount ?? 0)).toBe(40)
    expect(appointmentsA?.[0]?.service_names).toEqual([TENANT_A_TOP_SERVICE])
    expect(Number(appointmentsA?.[1]?.total_amount ?? 0)).toBe(40)
    expect(Number(appointmentsA?.[1]?.paid_amount ?? 0)).toBe(20)
    expect(appointmentsA?.[1]?.service_names).toEqual([TENANT_A_TOP_SERVICE])
    expect(Number(appointmentsA?.[2]?.total_amount ?? 0)).toBe(40)
    expect(Number(appointmentsA?.[2]?.paid_amount ?? 0)).toBe(0)
    expect(appointmentsA?.[2]?.service_names).toEqual([TENANT_A_OTHER_SERVICE])
  })

  test('vendite dashboard renders aggregated data without cross-tenant leakage', async ({ page }) => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const venditePath = buildTenantDashboardPath(fixture.tenantA.slug, '/vendite')

    await resetSession(page)
    await loginAs(page, fixture.tenantA.owner, venditePath)

    await expect(page.getByText(TENANT_A_TOP_SERVICE)).toBeVisible()
    await expect(page.getByText(/200\.0%/)).toBeVisible()
    await expect(page.getByText(TENANT_B_SECRET_SERVICE)).toHaveCount(0)

    await page.getByRole('button', { name: 'Prodotti' }).click()
    await expect(page.getByText(TENANT_A_PRODUCT_A).first()).toBeVisible()
    await expect(page.getByText(TENANT_A_PRODUCT_B).first()).toBeVisible()
    await expect(page.getByText(TENANT_B_SECRET_PRODUCT)).toHaveCount(0)

    await page.getByRole('button', { name: 'Appuntamenti' }).click()
    await expect(page.getByText('Vendite A Today Paid').first()).toBeVisible()
    await expect(page.getByText('Vendite A Week Partial').first()).toBeVisible()
    await expect(page.getByText(TENANT_B_SECRET_CLIENT)).toHaveCount(0)
    await expect(page.getByText('Pagato').first()).toBeVisible()
    await expect(page.getByText('Parziale').first()).toBeVisible()
    await expect(page.getByText('Da pagare').first()).toBeVisible()
  })

  test('large simulated tenant keeps aggregated sales payloads bounded', async () => {
    test.setTimeout(180_000)
    const fixture = getFixture()
    const service = getService()
    const now = new Date()

    const { data: summaryRows, error: summaryRowsError } = await service.rpc(
      'get_sales_summary',
      buildSummaryArgs(fixture.tenantLargeId, now),
    )
    await assertNoSupabaseError('read large tenant summary', summaryRowsError)
    expect(summaryRows ?? []).toHaveLength(1)
    expect(Number(summaryRows?.[0]?.appointments_completed_month ?? 0)).toBe(LARGE_APPOINTMENT_COUNT)
    expect(Number(summaryRows?.[0]?.revenue_month ?? 0)).toBe(LARGE_APPOINTMENT_COUNT * 32)

    const { data: productRows, error: productRowsError } = await service.rpc('get_sales_products', {
      p_tenant_id: fixture.tenantLargeId,
      p_from: startOfMonth(now).toISOString(),
      p_to: endOfDay(now).toISOString(),
    })
    await assertNoSupabaseError('read large tenant sold products', productRowsError)
    expect(productRows ?? []).toHaveLength(1)
    expect(Number(productRows?.[0]?.total_qty ?? 0)).toBe(LARGE_APPOINTMENT_COUNT)
    expect(Number(productRows?.[0]?.total_revenue ?? 0)).toBe(LARGE_APPOINTMENT_COUNT * 7)
    expect(JSON.stringify(summaryRows ?? []).length).toBeLessThan(MAX_SUMMARY_PAYLOAD_BYTES)
    expect(JSON.stringify(productRows ?? []).length).toBeLessThan(MAX_PRODUCTS_PAYLOAD_BYTES)
  })
})
