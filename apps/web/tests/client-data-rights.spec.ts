import { randomBytes } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from 'playwright/test'
import type { Database } from '../src/types'
import { ANALYTICS_CONSENT_POLICY_VERSION } from '../src/lib/analytics-consent-copy'
import { buildTenantAppPath } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  createTenantFixture,
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

const hasAuthEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)
const AUTHORIZATION_HEADER = 'Authorization'

type UserClient = SupabaseClient<Database>

interface AuthUserFixture {
  accessToken: string
  client: UserClient
  email: string
  password: string
  userId: string
}

interface SeededTenantData {
  anonymousId: string
  appointmentId: string
  badgeId: string
  clientId: string
  notificationId: string
  paymentId: string
  productId: string
  rewardId: string
  serviceId: string
  sessionId: string
  staffMemberId: string
  tenantId: string
  tenantSlug: string
  unsubscribeTokenId: string
}

interface ClientRightsFixture {
  foreignUser: AuthUserFixture
  staffUser: AuthUserFixture
  subjectUser: AuthUserFixture
  tenantA: SeededTenantData
  tenantB: SeededTenantData
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

function authHeaders(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    [AUTHORIZATION_HEADER]: `Bearer ${token}`,
    ...extra,
  }
}

async function createAuthUser(
  service: ServiceClient,
  {
    emailPrefix,
    suffix,
    userType,
  }: {
    emailPrefix: string
    suffix: string
    userType: 'client' | 'staff'
  },
): Promise<AuthUserFixture> {
  const email = `${emailPrefix}-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: userType },
  })
  await assertNoSupabaseError(`create ${emailPrefix} auth user`, authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error(`create ${emailPrefix} auth user: missing user id`)
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Playwright ${emailPrefix} ${suffix}`,
      notification_preferences: {},
      phone: '+39 333 123 4567',
      user_type: userType,
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${emailPrefix} profile`, profileError)

  const client = requireUserClient()
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  })
  await assertNoSupabaseError(`sign in ${emailPrefix} user`, signInError)

  const accessToken = signInData.session?.access_token
  if (!accessToken) {
    throw new Error(`sign in ${emailPrefix} user: missing access token`)
  }

  return { accessToken, client, email, password, userId }
}

async function createSiteSession(
  service: ServiceClient,
  payload: {
    anonymousId: string
    clientId: string
    tenantId: string
  },
): Promise<{ id: string }> {
  const result = await service
    .from('site_sessions' as never)
    .insert({
      anonymous_id: payload.anonymousId,
      client_id: payload.clientId,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      tenant_id: payload.tenantId,
    } as never)
    .select('id')
    .single()

  const typed = result as unknown as {
    data: { id: string } | null
    error: { message: string } | null
  }
  await assertNoSupabaseError('create site session', typed.error)

  if (!typed.data?.id) {
    throw new Error('create site session: missing id')
  }

  return typed.data
}

async function countSiteSessionsForClient(
  service: ServiceClient,
  params: { clientId: string; tenantId: string },
): Promise<number> {
  const result = await service
    .from('site_sessions' as never)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', params.tenantId)
    .eq('client_id', params.clientId)

  const typed = result as unknown as {
    count: number | null
    error: { message: string } | null
  }
  await assertNoSupabaseError('count site sessions', typed.error)
  return typed.count ?? 0
}

async function seedTenantData(
  service: ServiceClient,
  {
    label,
    tenantId,
    tenantSlug,
    userEmail,
    userId,
    staffUserId,
  }: {
    label: string
    tenantId: string
    tenantSlug: string
    userEmail: string
    userId: string
    staffUserId: string
  },
): Promise<SeededTenantData> {
  const now = new Date()
  const pastStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const pastEnd = new Date(pastStart.getTime() + 45 * 60 * 1000)
  const anonymId = `${randomSuffix()}-${label}`

  const { data: staffMember, error: staffError } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: staffUserId,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create staff membership ${label}`, staffError)
  if (!staffMember?.id) throw new Error(`create staff membership ${label}: missing id`)

  const { data: location, error: locationError } = await service
    .from('locations')
    .insert({
      address: `Via ${label} 1`,
      city: 'Milano',
      is_active: true,
      name: `Location ${label}`,
      tenant_id: tenantId,
      zip_code: '20121',
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create location ${label}`, locationError)
  if (!location?.id) throw new Error(`create location ${label}: missing id`)

  const { data: serviceRow, error: serviceError } = await service
    .from('services')
    .insert({
      duration_minutes: 45,
      is_active: true,
      name: `Taglio ${label}`,
      price: 28,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create service ${label}`, serviceError)
  if (!serviceRow?.id) throw new Error(`create service ${label}: missing id`)

  const { data: product, error: productError } = await service
    .from('products')
    .insert({
      is_active: true,
      name: `Prodotto ${label}`,
      price_sell: 18,
      show_on_site: true,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create product ${label}`, productError)
  if (!product?.id) throw new Error(`create product ${label}: missing id`)

  const { data: reward, error: rewardError } = await service
    .from('rewards')
    .insert({
      is_active: true,
      name: `Reward ${label}`,
      points_cost: 120,
      reward_type: 'service',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create reward ${label}`, rewardError)
  if (!reward?.id) throw new Error(`create reward ${label}: missing id`)

  const { data: badge, error: badgeError } = await service
    .from('badges')
    .insert({
      condition_type: 'visits_count',
      condition_value: 1,
      description: `Badge ${label}`,
      is_active: true,
      name: `Badge ${label}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create badge ${label}`, badgeError)
  if (!badge?.id) throw new Error(`create badge ${label}: missing id`)

  const { data: client, error: clientError } = await service
    .from('clients')
    .insert({
      date_of_birth: '1990-01-02',
      email: userEmail,
      full_name: `Cliente ${label}`,
      marketing_consent: true,
      phone: `+39${Date.now().toString().slice(-9)}`,
      preferred_contact_channel: 'push',
      profile_id: userId,
      tags: ['vip'],
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create client ${label}`, clientError)
  if (!client?.id) throw new Error(`create client ${label}: missing id`)

  const { data: appointment, error: appointmentError } = await service
    .from('appointments')
    .insert({
      booked_by: userId,
      booking_confirmation_token_expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      booking_confirmation_token_hash: randomBytes(32).toString('hex'),
      booking_source: 'pwa',
      client_id: client.id,
      end_time: pastEnd.toISOString(),
      location_id: location.id,
      notes: `Nota privata ${label}`,
      staff_id: staffMember.id,
      start_time: pastStart.toISOString(),
      status: 'completed',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create appointment ${label}`, appointmentError)
  if (!appointment?.id) throw new Error(`create appointment ${label}: missing id`)

  await assertNoSupabaseError(
    `create appointment service ${label}`,
    (
      await service.from('appointment_services').insert({
        appointment_id: appointment.id,
        price_at_booking: 28,
        service_id: serviceRow.id,
        tenant_id: tenantId,
      })
    ).error,
  )

  await assertNoSupabaseError(
    `create appointment product ${label}`,
    (
      await service.from('appointment_products').insert({
        appointment_id: appointment.id,
        price_at_sale: 18,
        product_id: product.id,
        quantity: 1,
        tenant_id: tenantId,
      })
    ).error,
  )

  const { data: payment, error: paymentError } = await service
    .from('payments')
    .insert({
      amount: 28,
      appointment_id: appointment.id,
      client_id: client.id,
      notes: `Pagamento ${label}`,
      paid_at: now.toISOString(),
      payment_method: 'card_terminal',
      status: 'completed',
      tenant_id: tenantId,
      tip_amount: 2,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create payment ${label}`, paymentError)
  if (!payment?.id) throw new Error(`create payment ${label}: missing id`)

  await assertNoSupabaseError(
    `create client loyalty ${label}`,
    (
      await service.from('client_loyalty').insert({
        available_points: 180,
        client_id: client.id,
        current_streak: 2,
        longest_streak: 4,
        tenant_id: tenantId,
        total_points: 240,
      })
    ).error,
  )

  await assertNoSupabaseError(
    `create loyalty transaction ${label}`,
    (
      await service.from('loyalty_transactions').insert({
        client_id: client.id,
        description: `Earn ${label}`,
        points: 40,
        tenant_id: tenantId,
        type: 'earn',
      })
    ).error,
  )

  await assertNoSupabaseError(
    `create reward redemption ${label}`,
    (
      await service.from('reward_redemptions').insert({
        client_id: client.id,
        confirmed_at: now.toISOString(),
        points_spent: 120,
        reward_id: reward.id,
        tenant_id: tenantId,
      })
    ).error,
  )

  await assertNoSupabaseError(
    `create client badge ${label}`,
    (
      await service.from('client_badges').insert({
        badge_id: badge.id,
        client_id: client.id,
        tenant_id: tenantId,
      })
    ).error,
  )

  await assertNoSupabaseError(
    `create client analytics ${label}`,
    (
      await service.from('client_analytics').upsert({
        churn_status: 'green',
        client_id: client.id,
        days_since_last_visit: 7,
        last_visit_date: pastStart.toISOString(),
        tenant_id: tenantId,
        total_visits: 5,
      }, { onConflict: 'client_id' })
    ).error,
  )

  await assertNoSupabaseError(
    `create client note ${label}`,
    (
      await service.from('client_notes').insert({
        client_id: client.id,
        note_text: `Nota interna ${label}`,
        staff_id: staffMember.id,
        tenant_id: tenantId,
      })
    ).error,
  )

  await assertNoSupabaseError(
    `create wishlist ${label}`,
    (
      await service.from('client_product_wishlist').insert({
        client_id: client.id,
        product_id: product.id,
        tenant_id: tenantId,
      })
    ).error,
  )

  await assertNoSupabaseError(
    `create push subscription ${label}`,
    (
      await service.from('push_subscriptions').insert({
        auth: `auth-${label}`,
        endpoint: `https://push.example.com/${tenantSlug}/${label}`,
        p256dh: `p256dh-${label}`,
        profile_id: userId,
        tenant_id: tenantId,
        user_agent: 'Playwright Push',
      })
    ).error,
  )

  const { data: notification, error: notificationError } = await service
    .from('notifications')
    .insert({
      body: `Notifica ${label}`,
      profile_id: userId,
      tenant_id: tenantId,
      title: `Titolo ${label}`,
      type: 'campaign',
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create notification ${label}`, notificationError)
  if (!notification?.id) throw new Error(`create notification ${label}: missing id`)

  await assertNoSupabaseError(
    `create notification log ${label}`,
    (
      await service.from('notification_log').insert({
        appointment_id: appointment.id,
        profile_id: userId,
        tenant_id: tenantId,
        type: 'booking_confirmed',
      })
    ).error,
  )

  const { data: unsubscribeToken, error: unsubscribeError } = await service
    .from('marketing_unsubscribe_tokens')
    .insert({
      client_id: client.id,
      expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      tenant_id: tenantId,
      token_hash: randomBytes(32).toString('hex'),
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create unsubscribe token ${label}`, unsubscribeError)
  if (!unsubscribeToken?.id) throw new Error(`create unsubscribe token ${label}: missing id`)

  await assertNoSupabaseError(
    `create consent event ${label}`,
    (
      await service.from('consent_events').insert({
        changed_by: 'CLIENT_PROFILE',
        changed_by_profile_id: userId,
        channel: 'PWA',
        client_id: client.id,
        consent_text: `Consenso marketing ${label}`,
        consent_text_version: 'f08-v1',
        legal_basis: 'Art. 6(1)(a) GDPR',
        metadata: {},
        occurred_at: now.toISOString(),
        previous_status: 'UNKNOWN',
        purpose: 'MARKETING_EMAIL',
        source: 'PWA_PROFILE_PREFERENCES',
        status: 'ALLOWED',
        tenant_id: tenantId,
      })
    ).error,
  )

  const siteSession = await createSiteSession(service, {
    anonymousId: anonymId,
    clientId: client.id,
    tenantId,
  })

  await assertNoSupabaseError(
    `create analytics consent event ${label}`,
    (
      await service.from('analytics_consent_events').insert({
        anonymous_id: anonymId,
        host: 'localhost',
        metadata: {
          pathname: buildTenantAppPath(tenantSlug, '/profilo'),
          tenant_slug: tenantSlug,
        },
        policy_version: ANALYTICS_CONSENT_POLICY_VERSION,
        source: 'BANNER',
        status: 'accepted',
        surface: 'TENANT_PWA',
      })
    ).error,
  )

  return {
    anonymousId: anonymId,
    appointmentId: appointment.id,
    badgeId: badge.id,
    clientId: client.id,
    notificationId: notification.id,
    paymentId: payment.id,
    productId: product.id,
    rewardId: reward.id,
    serviceId: serviceRow.id,
    sessionId: siteSession.id,
    staffMemberId: staffMember.id,
    tenantId,
    tenantSlug,
    unsubscribeTokenId: unsubscribeToken.id,
  }
}

async function seedClientRightsFixture(): Promise<ClientRightsFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const subjectUser = await createAuthUser(service, {
    emailPrefix: 'playwright-rights-subject',
    suffix,
    userType: 'client',
  })
  const foreignUser = await createAuthUser(service, {
    emailPrefix: 'playwright-rights-foreign',
    suffix,
    userType: 'client',
  })
  const staffUser = await createAuthUser(service, {
    emailPrefix: 'playwright-rights-owner',
    suffix,
    userType: 'staff',
  })

  const tenantAFixture = await createTenantFixture(`rights-a-${suffix}`)
  const tenantBFixture = await createTenantFixture(`rights-b-${suffix}`)

  const tenantA = await seedTenantData(service, {
    label: 'tenant-a',
    staffUserId: staffUser.userId,
    tenantId: tenantAFixture.tenantId,
    tenantSlug: tenantAFixture.slug,
    userEmail: subjectUser.email,
    userId: subjectUser.userId,
  })
  const tenantB = await seedTenantData(service, {
    label: 'tenant-b',
    staffUserId: staffUser.userId,
    tenantId: tenantBFixture.tenantId,
    tenantSlug: tenantBFixture.slug,
    userEmail: subjectUser.email,
    userId: subjectUser.userId,
  })

  await assertNoSupabaseError(
    'create foreign tenant B client',
    (
      await service.from('clients').insert({
        email: foreignUser.email,
        full_name: `Cliente foreign ${suffix}`,
        marketing_consent: false,
        phone: `+39${Date.now().toString().slice(-9)}`,
        profile_id: foreignUser.userId,
        tags: [],
        tenant_id: tenantBFixture.tenantId,
      })
    ).error,
  )

  return {
    foreignUser,
    staffUser,
    subjectUser,
    tenantA,
    tenantB,
    cleanup: async () => {
      try {
        await subjectUser.client.auth.signOut()
        await foreignUser.client.auth.signOut()
        await staffUser.client.auth.signOut()
      } catch {
        // best effort
      }

      await tenantAFixture.cleanup()
      await tenantBFixture.cleanup()

      await service.auth.admin.deleteUser(subjectUser.userId)
      await service.auth.admin.deleteUser(foreignUser.userId)
      await service.auth.admin.deleteUser(staffUser.userId)
    },
  }
}

async function openOtpStep(page: Page, slug: string, email: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
  })
  await page.goto(buildTenantAppPath(slug, '/accesso'))
  await page.locator('#email-otp-input').fill(email)
  await page.getByRole('button', { name: 'Continua', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Controlla la tua email' })).toBeVisible({
    timeout: 15_000,
  })
}

async function fillOtp(page: Page, otp: string) {
  for (let index = 0; index < otp.length; index += 1) {
    await page.getByLabel(`Cifra ${index + 1}`).fill(otp[index])
  }
}

async function loginClientViaOtp(
  page: Page,
  service: ServiceClient,
  {
    email,
    slug,
  }: {
    email: string
    slug: string
  },
) {
  await openOtpStep(page, slug, email)

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  await assertNoSupabaseError('generate client OTP', linkError)

  const otp = linkData.properties?.email_otp
  if (!otp) {
    throw new Error('generate client OTP: missing email_otp')
  }

  await fillOtp(page, otp)
  await page.waitForURL(`**/tenant/app/${slug}/profilo`, { timeout: 20_000 })
}

test.describe('client data rights workflow', () => {
  test.skip(!hasAuthEnv, 'Requires Supabase URL, publishable key, and service-role env for client rights tests.')

  test('export is tenant-scoped, manual requests are logged, and anonymous/foreign JWT access is rejected', async ({ request }) => {
    test.setTimeout(90_000)
    const fixture = await seedClientRightsFixture()
    const service = requireServiceClient()

    try {
      const exportAPath = `/api/pwa/privacy/export?tenantId=${fixture.tenantA.tenantId}`

      const anonymousExport = await request.get(exportAPath)
      expect(anonymousExport.status()).toBe(401)

      const foreignExport = await request.get(exportAPath, {
        headers: authHeaders(fixture.foreignUser.accessToken),
      })
      expect(foreignExport.status()).toBe(403)

      const exportResponse = await request.get(exportAPath, {
        headers: authHeaders(fixture.subjectUser.accessToken),
      })
      expect(exportResponse.status()).toBe(200)
      expect(exportResponse.headers()['content-type']).toContain('application/json')
      expect(exportResponse.headers()['content-disposition']).toContain('attachment;')

      const payload = await exportResponse.json()
      expect(payload.tenant.id).toBe(fixture.tenantA.tenantId)
      expect(payload.subject.client.id).toBe(fixture.tenantA.clientId)
      expect(payload.subject.client.id).not.toBe(fixture.tenantB.clientId)
      expect(payload.data.appointments).toHaveLength(1)
      expect(payload.data.appointments[0]?.id).toBe(fixture.tenantA.appointmentId)
      expect(payload.data.appointments[0]?.tenant_id).toBe(fixture.tenantA.tenantId)
      expect(payload.data.appointments[0]?.services[0]?.service?.id).toBe(fixture.tenantA.serviceId)
      expect(payload.data.appointments[0]?.products[0]?.product?.id).toBe(fixture.tenantA.productId)
      expect(payload.data.payments[0]?.id).toBe(fixture.tenantA.paymentId)
      expect(payload.data.rewardRedemptions[0]?.reward?.id).toBe(fixture.tenantA.rewardId)
      expect(payload.data.clientBadges[0]?.badge?.id).toBe(fixture.tenantA.badgeId)
      expect(payload.data.siteSessions[0]?.id).toBe(fixture.tenantA.sessionId)
      expect(payload.data.analyticsConsentEvents[0]?.metadata?.tenant_slug).toBe(fixture.tenantA.tenantSlug)
      expect(payload.data.wishlist[0]?.product?.id).toBe(fixture.tenantA.productId)
      expect(payload.selfServiceLimitations[0]?.category).toBe('client_notes')

      const serialized = JSON.stringify(payload)
      expect(serialized).toContain(fixture.tenantA.clientId)
      expect(serialized).toContain(fixture.tenantA.appointmentId)
      expect(serialized).not.toContain(fixture.tenantB.clientId)
      expect(serialized).not.toContain(fixture.tenantB.appointmentId)
      expect(serialized).not.toContain(fixture.tenantB.productId)
      expect(serialized).not.toContain(fixture.tenantB.rewardId)

      const manualRequestResponse = await request.post('/api/pwa/privacy/requests', {
        headers: authHeaders(fixture.subjectUser.accessToken, {
          'Content-Type': 'application/json',
        }),
        data: {
          action: 'restriction',
          tenantId: fixture.tenantA.tenantId,
        },
      })
      expect(manualRequestResponse.status()).toBe(200)
      const manualRequestPayload = await manualRequestResponse.json()
      expect(manualRequestPayload.success).toBe(true)
      expect(manualRequestPayload.duplicate).toBe(false)
      expect(typeof manualRequestPayload.requestId).toBe('string')

      const duplicateManualRequestResponse = await request.post('/api/pwa/privacy/requests', {
        headers: authHeaders(fixture.subjectUser.accessToken, {
          'Content-Type': 'application/json',
        }),
        data: {
          action: 'restriction',
          tenantId: fixture.tenantA.tenantId,
        },
      })
      expect(duplicateManualRequestResponse.status()).toBe(200)
      const duplicateManualRequestPayload = await duplicateManualRequestResponse.json()
      expect(duplicateManualRequestPayload.success).toBe(true)
      expect(duplicateManualRequestPayload.duplicate).toBe(true)

      const { data: auditRows, error: auditRowsError } = await service
        .from('client_privacy_requests')
        .select('action, status')
        .eq('tenant_id', fixture.tenantA.tenantId)
        .eq('profile_id', fixture.subjectUser.userId)
        .order('created_at', { ascending: true })
      await assertNoSupabaseError('read privacy audit rows after export/request', auditRowsError)
      expect((auditRows ?? []).some((row) => row.action === 'access_export' && row.status === 'completed')).toBe(true)
      expect((auditRows ?? []).some((row) => row.action === 'restriction' && row.status === 'submitted')).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })

  test('delete removes cancellable tenant data, preserves required records, logs out, and blocks further tenant access', async ({ page, request }) => {
    test.setTimeout(90_000)
    const fixture = await seedClientRightsFixture()
    const service = requireServiceClient()

    try {
      await loginClientViaOtp(page, service, {
        email: fixture.subjectUser.email,
        slug: fixture.tenantA.tenantSlug,
      })

      await page.goto(buildTenantAppPath(fixture.tenantA.tenantSlug, '/profilo/dati'))
      await expect(page.getByText('Gestisci i tuoi dati per')).toBeVisible()
      await page.getByRole('button', { name: 'Apri conferma cancellazione' }).click()
      await page.getByPlaceholder(fixture.subjectUser.email).fill(fixture.subjectUser.email)
      await page.getByRole('button', { name: 'Conferma cancellazione', exact: true }).click()
      await page.waitForURL(`**/tenant/app/${fixture.tenantA.tenantSlug}`, { timeout: 20_000 })

      await page.goto(buildTenantAppPath(fixture.tenantA.tenantSlug, '/profilo'))
      await expect(page.getByRole('heading', { name: 'Bentornato.' })).toBeVisible({
        timeout: 20_000,
      })

      const exportAfterDelete = await request.get(`/api/pwa/privacy/export?tenantId=${fixture.tenantA.tenantId}`, {
        headers: authHeaders(fixture.subjectUser.accessToken),
      })
      expect([401, 403]).toContain(exportAfterDelete.status())

      const { data: deletedClient, error: deletedClientError } = await service
        .from('clients')
        .select('deleted_at, email, full_name, phone, profile_id')
        .eq('id', fixture.tenantA.clientId)
        .single()
      await assertNoSupabaseError('read deleted tenant A client', deletedClientError)
      expect(deletedClient?.deleted_at).toBeTruthy()
      expect(deletedClient?.profile_id).toBeNull()
      expect(deletedClient?.email).toBeNull()
      expect(deletedClient?.phone).toBeNull()
      expect(deletedClient?.full_name).toBe('Cliente eliminato')

      const { data: survivingClient, error: survivingClientError } = await service
        .from('clients')
        .select('deleted_at, profile_id')
        .eq('id', fixture.tenantB.clientId)
        .single()
      await assertNoSupabaseError('read surviving tenant B client', survivingClientError)
      expect(survivingClient?.deleted_at).toBeNull()
      expect(survivingClient?.profile_id).toBe(fixture.subjectUser.userId)

      const tenantBStateChecks = await Promise.all([
        service.from('client_product_wishlist').select('id').eq('tenant_id', fixture.tenantB.tenantId).eq('client_id', fixture.tenantB.clientId),
        service.from('push_subscriptions').select('id').eq('tenant_id', fixture.tenantB.tenantId).eq('profile_id', fixture.subjectUser.userId),
      ])
      await assertNoSupabaseError('read tenant B wishlist after tenant A delete', tenantBStateChecks[0].error)
      await assertNoSupabaseError('read tenant B push after tenant A delete', tenantBStateChecks[1].error)
      expect(tenantBStateChecks[0].data ?? []).toHaveLength(1)
      expect(tenantBStateChecks[1].data ?? []).toHaveLength(1)

      const [
        notesAfter,
        wishlistAfter,
        loyaltyAfter,
        badgesAfter,
        analyticsAfter,
        notificationsAfter,
        pushAfter,
        notificationLogAfter,
        unsubscribeAfter,
        siteSessionsAfter,
      ] = await Promise.all([
        service.from('client_notes').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('client_product_wishlist').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('client_loyalty').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('client_badges').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('client_analytics').select('client_id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('notifications').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('profile_id', fixture.subjectUser.userId),
        service.from('push_subscriptions').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('profile_id', fixture.subjectUser.userId),
        service.from('notification_log').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('profile_id', fixture.subjectUser.userId),
        service.from('marketing_unsubscribe_tokens').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        countSiteSessionsForClient(service, { clientId: fixture.tenantA.clientId, tenantId: fixture.tenantA.tenantId }),
      ])

      await assertNoSupabaseError('read client notes after delete', notesAfter.error)
      await assertNoSupabaseError('read wishlist after delete', wishlistAfter.error)
      await assertNoSupabaseError('read loyalty after delete', loyaltyAfter.error)
      await assertNoSupabaseError('read badges after delete', badgesAfter.error)
      await assertNoSupabaseError('read analytics after delete', analyticsAfter.error)
      await assertNoSupabaseError('read notifications after delete', notificationsAfter.error)
      await assertNoSupabaseError('read push after delete', pushAfter.error)
      await assertNoSupabaseError('read notification log after delete', notificationLogAfter.error)
      await assertNoSupabaseError('read unsubscribe token after delete', unsubscribeAfter.error)

      expect(notesAfter.data ?? []).toHaveLength(0)
      expect(wishlistAfter.data ?? []).toHaveLength(0)
      expect(loyaltyAfter.data ?? []).toHaveLength(0)
      expect(badgesAfter.data ?? []).toHaveLength(0)
      expect(analyticsAfter.data ?? []).toHaveLength(0)
      expect(notificationsAfter.data ?? []).toHaveLength(0)
      expect(pushAfter.data ?? []).toHaveLength(0)
      expect(notificationLogAfter.data ?? []).toHaveLength(0)
      expect(unsubscribeAfter.data ?? []).toHaveLength(0)
      expect(siteSessionsAfter).toBe(0)

      const { data: scrubbedAppointment, error: scrubbedAppointmentError } = await service
        .from('appointments')
        .select('booked_by, booking_confirmation_token_expires_at, booking_confirmation_token_hash, notes')
        .eq('id', fixture.tenantA.appointmentId)
        .single()
      await assertNoSupabaseError('read scrubbed appointment after delete', scrubbedAppointmentError)
      expect(scrubbedAppointment?.notes).toBeNull()
      expect(scrubbedAppointment?.booking_confirmation_token_hash).toBeNull()
      expect(scrubbedAppointment?.booking_confirmation_token_expires_at).toBeNull()
      expect(scrubbedAppointment?.booked_by).toBeNull()

      const preservedChecks = await Promise.all([
        service.from('payments').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('loyalty_transactions').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('reward_redemptions').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('consent_events').select('id').eq('tenant_id', fixture.tenantA.tenantId).eq('client_id', fixture.tenantA.clientId),
        service.from('client_privacy_requests').select('action, status').eq('tenant_id', fixture.tenantA.tenantId).eq('profile_id', fixture.subjectUser.userId),
      ])

      await assertNoSupabaseError('read payments after delete', preservedChecks[0].error)
      await assertNoSupabaseError('read loyalty transactions after delete', preservedChecks[1].error)
      await assertNoSupabaseError('read reward redemptions after delete', preservedChecks[2].error)
      await assertNoSupabaseError('read consent events after delete', preservedChecks[3].error)
      await assertNoSupabaseError('read privacy requests after delete', preservedChecks[4].error)
      expect(preservedChecks[0].data ?? []).toHaveLength(1)
      expect(preservedChecks[1].data ?? []).toHaveLength(1)
      expect(preservedChecks[2].data ?? []).toHaveLength(1)
      expect(preservedChecks[3].data ?? []).toHaveLength(1)
      expect((preservedChecks[4].data ?? []).some((row) => row.action === 'erasure' && row.status === 'completed')).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })
})
