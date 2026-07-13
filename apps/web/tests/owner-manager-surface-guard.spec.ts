import { randomBytes } from 'crypto'
import { expect, test, type Browser, type BrowserContext, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'
import { gotoDomContentLoaded, waitForUrlDomContentLoaded } from './helpers/navigation'

interface UserSeed {
  id: string
  email: string
  password: string
}

interface SurfaceFixture {
  tenantId: string
  slug: string
  owner: UserSeed
  manager: UserSeed
  receptionist: UserSeed
  cleanup: () => Promise<void>
}

interface CapturedActionRequest {
  url: string
  headers: Record<string, string>
  body: Buffer
}

const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

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

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  label: string
): Promise<UserSeed> {
  const email = `playwright-role-${label}-${suffix}@example.com`
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
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  return { id: userId, email, password }
}

async function seedSurfaceFixture(): Promise<SurfaceFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const createdStaffIds: string[] = []

  const owner = await createStaffUser(service, suffix, 'owner')
  const manager = await createStaffUser(service, suffix, 'manager')
  const receptionist = await createStaffUser(service, suffix, 'receptionist')
  createdUserIds.push(owner.id, manager.id, receptionist.id)

  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Roles ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-roles-${suffix}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id, slug')
    .single()
  await assertNoSupabaseError('create tenant', tenantError)

  const tenantId = tenant?.id
  const slug = tenant?.slug
  if (!tenantId || !slug) throw new Error('create tenant: missing tenant data')

  for (const [profileId, role] of [
    [owner.id, 'owner'],
    [manager.id, 'manager'],
    [receptionist.id, 'receptionist'],
  ] as const) {
    const { data: staffRow, error: staffError } = await service
      .from('staff_members')
      .insert({
        is_active: true,
        profile_id: profileId,
        role,
        tenant_id: tenantId,
      })
      .select('id')
      .single()
    await assertNoSupabaseError(`create ${role} membership`, staffError)
    if (staffRow?.id) createdStaffIds.push(staffRow.id)
  }

  return {
    tenantId,
    slug,
    owner,
    manager,
    receptionist,
    cleanup: async () => {
      if (createdStaffIds.length > 0) {
        await service.from('staff_members').delete().in('id', createdStaffIds)
      }
      await service.from('tenants').delete().eq('id', tenantId)
      for (const userId of createdUserIds) {
        await service.auth.admin.deleteUser(userId)
      }
    },
  }
}

async function resetSession(page: Page) {
  await page.context().clearCookies()
  await gotoDomContentLoaded(page, '/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    // Re-set analytics consent so the cookie banner never blocks test interactions
    window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
  })
}

async function loginAs(page: Page, user: UserSeed, redirectTo: string) {
  const normalizedRedirectTo = normalizePathname(redirectTo)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await gotoDomContentLoaded(page, `/login?redirectTo=${encodeURIComponent(redirectTo)}`)
    // Pre-set analytics consent so the cookie banner never blocks test interactions
    await page.evaluate(() => {
      window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
    })
    await expect(page.locator('#email')).toBeVisible()
    await page.locator('#email').fill(user.email)
    await page.locator('#password').fill(user.password)
    await page.getByRole('button', { name: 'Accedi' }).click()

    try {
      await waitForUrlDomContentLoaded(
        page,
        (url) => normalizePathname(url.pathname) === normalizedRedirectTo,
        { timeout: 15_000 },
      )
      return
    } catch (error) {
      if (attempt === 1) throw error
      await resetSession(page)
    }
  }
}

async function createLoggedInSession(
  browser: Browser,
  user: UserSeed,
  redirectTo: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: APP_URL })
  const page = await context.newPage()
  await loginAs(page, user, redirectTo)
  return { context, page }
}

async function captureNextActionRequest(
  page: Page,
  trigger: () => Promise<void>
): Promise<CapturedActionRequest> {
  const requestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && Boolean(request.headers()['next-action'])
  )

  await trigger()
  const request = await requestPromise
  const body = request.postDataBuffer()
  if (!body) {
    throw new Error('Captured Next-Action request without body')
  }

  return {
    url: request.url(),
    headers: request.headers(),
    body,
  }
}

async function replayCapturedAction(page: Page, captured: CapturedActionRequest) {
  const headers = Object.fromEntries(
    Object.entries(captured.headers).filter(([name]) => {
      const lower = name.toLowerCase()
      return !['cookie', 'content-length', 'host', 'connection', 'accept-encoding'].includes(lower)
    })
  )

  try {
    return await page.context().request.fetch(captured.url, {
      method: 'POST',
      headers,
      data: captured.body,
      failOnStatusCode: false,
      timeout: 5_000,
    })
  } catch {
    return null
  }
}

test.describe.serial('owner-manager surface guard', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for role guard fixtures.')
  let fixture: SurfaceFixture | null = null
  let service: ServiceClient | null = null

  test.beforeAll(async () => {
    service = requireServiceClient()
    fixture = await seedSurfaceFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): SurfaceFixture {
    if (!fixture) throw new Error('Role guard fixture not initialized')
    return fixture
  }

  function getService(): ServiceClient {
    if (!service) throw new Error('Role guard service client not initialized')
    return service
  }

  test('receptionist cannot access owner-manager management pages by URL while owner and manager can', async ({ browser }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const protectedPaths = [
      buildTenantDashboardPath(fixture.slug, '/marketing'),
      buildTenantDashboardPath(fixture.slug, '/catalogo'),
      buildTenantDashboardPath(fixture.slug, '/impostazioni'),
      buildTenantDashboardPath(fixture.slug, '/vendite'),
      buildTenantDashboardPath(fixture.slug, '/app'),
    ]

    const receptionistLanding = buildTenantDashboardPath(fixture.slug, '/profilo')
    let receptionistSession: { context: BrowserContext; page: Page } | null = null
    let ownerSession: { context: BrowserContext; page: Page } | null = null
    let managerSession: { context: BrowserContext; page: Page } | null = null

    try {
      receptionistSession = await createLoggedInSession(browser, fixture.receptionist, receptionistLanding)

      for (const path of protectedPaths) {
        const response = await gotoDomContentLoaded(receptionistSession.page, path)
        expect(response?.status()).toBe(403)
      }

      ownerSession = await createLoggedInSession(browser, fixture.owner, protectedPaths[0])
      for (const path of protectedPaths) {
        const response = await gotoDomContentLoaded(ownerSession.page, path)
        expect(response?.status()).toBe(200)
        expect(ownerSession.page.url()).toContain(path)
      }

      managerSession = await createLoggedInSession(browser, fixture.manager, protectedPaths[0])
      for (const path of protectedPaths) {
        const response = await gotoDomContentLoaded(managerSession.page, path)
        expect(response?.status()).toBe(200)
        expect(managerSession.page.url()).toContain(path)
      }
    } finally {
      await Promise.allSettled([
        receptionistSession?.context.close(),
        ownerSession?.context.close(),
        managerSession?.context.close(),
      ])
    }
  })

  test('receptionist cannot replay forbidden settings server actions', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const service = getService()
    const settingsPath = buildTenantDashboardPath(fixture.slug, '/impostazioni')

    await loginAs(page, fixture.owner, settingsPath)
    const newLocationName = `Replay Location ${randomSuffix()}`
    const capturedSettingsAction = await captureNextActionRequest(page, async () => {
      await page.getByRole('button', { name: 'Sedi' }).click()
      await page.getByRole('button', { name: /Aggiungi sede|Nuova sede/ }).click()
      await page.getByPlaceholder('Es. Sede principale').fill(newLocationName)
      await page.getByRole('button', { name: 'Crea sede' }).click()
      await expect(page.getByText('Sede creata')).toBeVisible({ timeout: 10_000 })
    })

    await resetSession(page)
    await loginAs(page, fixture.receptionist, buildTenantDashboardPath(fixture.slug, '/profilo'))
    await replayCapturedAction(page, capturedSettingsAction)

    const { data: locationsAfterReplay, error: locationsAfterReplayError } = await service
      .from('locations')
      .select('id')
      .eq('tenant_id', fixture.tenantId)
      .eq('name', newLocationName)
    await assertNoSupabaseError('read locations after blocked settings replay', locationsAfterReplayError)
    expect(locationsAfterReplay ?? []).toHaveLength(1)
  })

  test('receptionist cannot replay forbidden catalog server actions', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const service = getService()
    const catalogoPath = buildTenantDashboardPath(fixture.slug, '/catalogo')

    await loginAs(page, fixture.owner, catalogoPath)
    const newServiceName = `Replay Service ${randomSuffix()}`
    const capturedCatalogAction = await captureNextActionRequest(page, async () => {
      await page.getByRole('button', { name: 'Nuovo servizio' }).click()
      await page.getByPlaceholder('Es. Taglio uomo').fill(newServiceName)
      await page.getByPlaceholder('0.00').first().fill('25')
      await page.getByPlaceholder('30').fill('30')
      await page.getByRole('button', { name: 'Crea servizio' }).click()
      await expect(page.getByText('Servizio creato')).toBeVisible({ timeout: 10_000 })
    })

    await resetSession(page)
    await loginAs(page, fixture.receptionist, buildTenantDashboardPath(fixture.slug, '/profilo'))
    await replayCapturedAction(page, capturedCatalogAction)

    const { data: createdServiceRows, error: createdServiceRowsError } = await service
      .from('services')
      .select('id')
      .eq('tenant_id', fixture.tenantId)
      .eq('name', newServiceName)
    await assertNoSupabaseError('read services after blocked catalog replay', createdServiceRowsError)
    expect(createdServiceRows ?? []).toHaveLength(1)
  })

  test('receptionist cannot replay forbidden marketing server actions', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const marketingPath = buildTenantDashboardPath(fixture.slug, '/marketing?tab=messaggi')

    // Capture the marketing Server Action (getMessagesData) by navigating to the page.
    // The action is called on component mount — capturing it from a page.goto is reliable.
    await loginAs(page, fixture.owner, buildTenantDashboardPath(fixture.slug, '/'))

    // Set up the listener BEFORE navigating to marketing so mount-time Server Actions are captured.
    const capturedMarketingAction = await captureNextActionRequest(page, async () => {
      await gotoDomContentLoaded(page, marketingPath)
      await expect(page.getByRole('switch').first()).toBeVisible({ timeout: 15_000 })
    })

    await resetSession(page)
    await loginAs(page, fixture.receptionist, buildTenantDashboardPath(fixture.slug, '/profilo'))
    const marketingReplayResponse = await replayCapturedAction(page, capturedMarketingAction)
    // Receptionist must be blocked — Next.js translates throwForbidden() to HTTP 403.
    expect(marketingReplayResponse).not.toBeNull()
    expect(marketingReplayResponse!.status()).toBe(403)
  })

  test('receptionist cannot replay forbidden app server actions', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const service = getService()
    const appPath = buildTenantDashboardPath(fixture.slug, '/app')

    await loginAs(page, fixture.owner, appPath)
    const appReplayValue = `Replay App Name ${randomSuffix()}`
    const appControlValue = `App Guard Control ${randomSuffix()}`
    const capturedAppAction = await captureNextActionRequest(page, async () => {
      await page.getByPlaceholder('Es. Barber Studio Marco').fill(appReplayValue)
      await page.getByRole('button', { name: 'Salva impostazioni' }).click()
      await expect(page.getByText(/Impostazioni salvate/i)).toBeVisible({ timeout: 10_000 })
    })

    const { error: appControlUpdateError } = await service
      .from('tenants')
      .update({
        business_name: appControlValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fixture.tenantId)
    await assertNoSupabaseError(
      'set tenant control value before blocked app replay',
      appControlUpdateError
    )

    await resetSession(page)
    await loginAs(page, fixture.receptionist, buildTenantDashboardPath(fixture.slug, '/profilo'))
    await replayCapturedAction(page, capturedAppAction)

    const { data: tenantAfterAppReplay, error: tenantAfterAppReplayError } = await service
      .from('tenants')
      .select('business_name')
      .eq('id', fixture.tenantId)
      .maybeSingle()
    await assertNoSupabaseError('read tenant after blocked app replay', tenantAfterAppReplayError)
    expect(tenantAfterAppReplay?.business_name).toBe(appControlValue)
  })

  test('receptionist cannot call marketing notify route handler', async ({ page }) => {
    const fixture = getFixture()
    const service = getService()
    const { data: promotion, error: promotionError } = await service
      .from('promotions')
      .insert({
        tenant_id: fixture.tenantId,
        title: `Replay Promotion ${randomSuffix()}`,
        description: 'Marketing test promotion',
        is_active: true,
        show_in_app: true,
        show_on_landing: true,
        status: 'active',
        valid_from: new Date().toISOString(),
      })
      .select('id')
      .single()
    await assertNoSupabaseError('create marketing promotion seed', promotionError)

    const promotionId = promotion?.id
    if (!promotionId) throw new Error('create marketing promotion seed: missing id')

    await loginAs(page, fixture.receptionist, buildTenantDashboardPath(fixture.slug, '/profilo'))
    const marketingResponse = await page.context().request.post(
      `/api/promotions/${promotionId}/notify`,
      { failOnStatusCode: false }
    )
    expect(marketingResponse.status()).toBe(403)
  })
})
