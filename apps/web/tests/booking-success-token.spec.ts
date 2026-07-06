import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import { hashBookingConfirmationToken } from '../src/lib/booking-confirmation-token'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

interface SeededAppointment {
  appointmentId: string
  slug: string
  token: string
  serviceName: string
  path: string
}

interface BookingFixture {
  primary: SeededAppointment
  alternateAppointment?: SeededAppointment
  alternateTenant?: {
    slug: string
  }
  cleanup: () => Promise<void>
}

interface SeedBookingOptions {
  includeSecondAppointment?: boolean
  includeSecondTenant?: boolean
  expiredPrimary?: boolean
}

interface TenantResource {
  tenantId: string
  slug: string
  locationId: string
  serviceId: string
  serviceName: string
  staffId: string
  clientId: string
}

function randomToken(): string {
  return randomBytes(32).toString('base64url')
}

function buildSuccessPath(slug: string, appointmentId: string, token?: string): string {
  const params = new URLSearchParams({ appointment: appointmentId })
  if (token) {
    params.set('token', token)
  }

  return `/tenant/app/${slug}/prenota/successo?${params.toString()}`
}

async function createStaffIdentity(
  supabase: ServiceClient,
  suffix: string
): Promise<{ userId: string }> {
  const email = `playwright-booking-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  await assertNoSupabaseError('create auth user', authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error('create auth user: missing user id')
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      email_verified: true,
      full_name: `Playwright Staff ${suffix}`,
      user_type: 'staff',
    },
    { onConflict: 'id' }
  )
  await assertNoSupabaseError('upsert profile', profileError)

  return { userId }
}

async function createTenantResource(
  supabase: ServiceClient,
  staffProfileId: string,
  suffix: string,
  index: number
): Promise<TenantResource> {
  const tenantSlug = `pw-booking-${suffix}-${index}`

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      business_name: `Playwright Booking ${suffix} ${index}`,
      primary_color: '#111111',
      settings: {},
      slug: tenantSlug,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id, slug')
    .single()
  await assertNoSupabaseError('insert tenant', tenantError)

  const tenantId = tenantRow?.id
  const slug = tenantRow?.slug
  if (!tenantId || !slug) {
    throw new Error('insert tenant: missing tenant data')
  }

  const { data: locationRow, error: locationError } = await supabase
    .from('locations')
    .insert({
      is_active: true,
      name: `Playwright HQ ${suffix} ${index}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('insert location', locationError)

  const locationId = locationRow?.id
  if (!locationId) {
    throw new Error('insert location: missing location id')
  }

  const serviceName = `Playwright Service ${suffix} ${index}`
  const { data: serviceRow, error: serviceError } = await supabase
    .from('services')
    .insert({
      duration_minutes: 45,
      is_active: true,
      name: serviceName,
      price: 35,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('insert service', serviceError)

  const serviceId = serviceRow?.id
  if (!serviceId) {
    throw new Error('insert service: missing service id')
  }

  const { data: staffRow, error: staffError } = await supabase
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: staffProfileId,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('insert staff member', staffError)

  const staffId = staffRow?.id
  if (!staffId) {
    throw new Error('insert staff member: missing staff id')
  }

  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .insert({
      email: `guest-${suffix}-${index}@example.com`,
      full_name: `Playwright Guest ${suffix} ${index}`,
      marketing_consent: false,
      phone: `+39${Date.now().toString().slice(-9)}${index}`,
      preferred_contact_channel: 'whatsapp',
      tags: [],
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('insert client', clientError)

  const clientId = clientRow?.id
  if (!clientId) {
    throw new Error('insert client: missing client id')
  }

  return {
    tenantId,
    slug,
    locationId,
    serviceId,
    serviceName,
    staffId,
    clientId,
  }
}

async function createAppointment(
  supabase: ServiceClient,
  resource: TenantResource,
  expired: boolean,
  startOffsetMinutes: number
): Promise<SeededAppointment> {
  const token = randomToken()
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000 + startOffsetMinutes * 60 * 1000)
  const end = new Date(start.getTime() + 45 * 60 * 1000)
  const expiresAt = new Date(
    Date.now() + (expired ? -5 * 60 * 1000 : 30 * 60 * 1000)
  ).toISOString()

  const { data: appointmentRow, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      booking_confirmation_token_expires_at: expiresAt,
      booking_confirmation_token_hash: hashBookingConfirmationToken(token),
      booking_source: 'pwa',
      client_id: resource.clientId,
      location_id: resource.locationId,
      notes: 'Playwright seed',
      staff_id: resource.staffId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'confirmed',
      tenant_id: resource.tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('insert appointment', appointmentError)

  const appointmentId = appointmentRow?.id
  if (!appointmentId) {
    throw new Error('insert appointment: missing appointment id')
  }

  const { error: appointmentServiceError } = await supabase
    .from('appointment_services')
    .insert({
      appointment_id: appointmentId,
      price_at_booking: 35,
      service_id: resource.serviceId,
      tenant_id: resource.tenantId,
    })
  await assertNoSupabaseError('insert appointment service', appointmentServiceError)

  return {
    appointmentId,
    slug: resource.slug,
    token,
    serviceName: resource.serviceName,
    path: buildSuccessPath(resource.slug, appointmentId, token),
  }
}

async function seedBookingFixture(options: SeedBookingOptions = {}): Promise<BookingFixture> {
  const supabase = requireServiceClient()
  const suffix = randomSuffix()
  const createdAppointmentIds: string[] = []
  const createdClientIds: string[] = []
  const createdStaffIds: string[] = []
  const createdServiceIds: string[] = []
  const createdLocationIds: string[] = []
  const createdTenantIds: string[] = []

  const { userId } = await createStaffIdentity(supabase, suffix)

  const registerResource = (resource: TenantResource) => {
    createdClientIds.push(resource.clientId)
    createdStaffIds.push(resource.staffId)
    createdServiceIds.push(resource.serviceId)
    createdLocationIds.push(resource.locationId)
    createdTenantIds.push(resource.tenantId)
  }

  const primaryResource = await createTenantResource(supabase, userId, suffix, 1)
  registerResource(primaryResource)
  const primary = await createAppointment(
    supabase,
    primaryResource,
    options.expiredPrimary ?? false,
    0
  )
  createdAppointmentIds.push(primary.appointmentId)

  let alternateAppointment: SeededAppointment | undefined
  if (options.includeSecondAppointment) {
    alternateAppointment = await createAppointment(supabase, primaryResource, false, 90)
    createdAppointmentIds.push(alternateAppointment.appointmentId)
  }

  let alternateTenant: { slug: string } | undefined
  if (options.includeSecondTenant) {
    const otherTenantResource = await createTenantResource(supabase, userId, suffix, 2)
    registerResource(otherTenantResource)
    const otherTenantAppointment = await createAppointment(supabase, otherTenantResource, false, 0)
    createdAppointmentIds.push(otherTenantAppointment.appointmentId)
    alternateTenant = { slug: otherTenantResource.slug }
  }

  async function cleanup() {
    try {
      if (createdAppointmentIds.length > 0) {
        await supabase.from('appointment_services').delete().in('appointment_id', createdAppointmentIds)
        await supabase.from('appointments').delete().in('id', createdAppointmentIds)
      }
      if (createdClientIds.length > 0) {
        await supabase.from('clients').delete().in('id', createdClientIds)
      }
      if (createdStaffIds.length > 0) {
        await supabase.from('staff_members').delete().in('id', createdStaffIds)
      }
      if (createdServiceIds.length > 0) {
        await supabase.from('services').delete().in('id', createdServiceIds)
      }
      if (createdLocationIds.length > 0) {
        await supabase.from('locations').delete().in('id', createdLocationIds)
      }
      if (createdTenantIds.length > 0) {
        await supabase.from('tenants').delete().in('id', createdTenantIds)
      }

      await supabase.from('profiles').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
    } catch (error) {
      console.warn('[playwright][booking-success-token] cleanup failed', error)
    }
  }

  return {
    primary,
    alternateAppointment,
    alternateTenant,
    cleanup,
  }
}

async function expectRestrictedSuccessPage(
  page: Page,
  responseStatus: number | undefined,
  hiddenText: string
) {
  expect([404, 410]).toContain(responseStatus)
  await expect(page.getByText('Dettagli non disponibili')).toBeVisible()
  await expect(page.getByText(hiddenText)).toHaveCount(0)
  await expect(page.getByText('Prenotazione confermata!')).toHaveCount(0)
}

test.describe('booking success confirmation token', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for booking fixtures.')

  test('shows the booking summary with a valid token', async ({ page }) => {
    const fixture = await seedBookingFixture()

    try {
      const response = await page.goto(fixture.primary.path)

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: 'Prenotazione confermata!' })).toBeVisible()
      await expect(page.getByText(fixture.primary.serviceName)).toBeVisible()
      await expect(page.getByRole('link', { name: 'Crea account gratis' })).toHaveAttribute(
        'href',
        new RegExp('return_to=.*token%3D')
      )
    } finally {
      await fixture.cleanup()
    }
  })

  test('blocks an invalid token', async ({ page }) => {
    const fixture = await seedBookingFixture()

    try {
      const response = await page.goto(
        buildSuccessPath(fixture.primary.slug, fixture.primary.appointmentId, randomToken())
      )

      await expectRestrictedSuccessPage(page, response?.status(), fixture.primary.serviceName)
    } finally {
      await fixture.cleanup()
    }
  })

  test('blocks an expired token', async ({ page }) => {
    const fixture = await seedBookingFixture({ expiredPrimary: true })

    try {
      const response = await page.goto(fixture.primary.path)

      await expectRestrictedSuccessPage(page, response?.status(), fixture.primary.serviceName)
    } finally {
      await fixture.cleanup()
    }
  })

  test('blocks a missing token', async ({ page }) => {
    const fixture = await seedBookingFixture()

    try {
      const response = await page.goto(
        buildSuccessPath(fixture.primary.slug, fixture.primary.appointmentId)
      )

      await expectRestrictedSuccessPage(page, response?.status(), fixture.primary.serviceName)
    } finally {
      await fixture.cleanup()
    }
  })

  test('blocks a token from another appointment', async ({ page }) => {
    const fixture = await seedBookingFixture({ includeSecondAppointment: true })

    try {
      if (!fixture.alternateAppointment) {
        throw new Error('Missing alternate appointment fixture')
      }

      const response = await page.goto(
        buildSuccessPath(
          fixture.primary.slug,
          fixture.alternateAppointment.appointmentId,
          fixture.primary.token
        )
      )

      await expectRestrictedSuccessPage(page, response?.status(), fixture.primary.serviceName)
    } finally {
      await fixture.cleanup()
    }
  })

  test('blocks a token from another tenant', async ({ page }) => {
    const fixture = await seedBookingFixture({ includeSecondTenant: true })

    try {
      if (!fixture.alternateTenant) {
        throw new Error('Missing alternate tenant fixture')
      }

      const response = await page.goto(
        buildSuccessPath(
          fixture.alternateTenant.slug,
          fixture.primary.appointmentId,
          fixture.primary.token
        )
      )

      await expectRestrictedSuccessPage(page, response?.status(), fixture.primary.serviceName)
    } finally {
      await fixture.cleanup()
    }
  })
})
