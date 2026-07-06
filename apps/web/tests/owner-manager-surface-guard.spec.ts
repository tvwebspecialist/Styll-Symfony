import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

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

function buildTenantDashboardPath(slug: string, relativePath: string): string {
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `/tenant/dashboard/${slug}${normalizedPath}`
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
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
}

async function loginAs(page: Page, user: UserSeed, redirectTo: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
  await page.locator('#email').fill(user.email)
  await page.locator('#password').fill(user.password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL((url) => url.pathname === redirectTo)
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

test.describe('owner-manager surface guard', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for role guard fixtures.')

  test('receptionist cannot access owner-manager pages by URL while owner and manager can', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = await seedSurfaceFixture()
    const protectedPaths = [
      buildTenantDashboardPath(fixture.slug, '/marketing'),
      buildTenantDashboardPath(fixture.slug, '/catalogo'),
      buildTenantDashboardPath(fixture.slug, '/impostazioni'),
      buildTenantDashboardPath(fixture.slug, '/vendite'),
      buildTenantDashboardPath(fixture.slug, '/app'),
    ]

    try {
      const receptionistLanding = buildTenantDashboardPath(fixture.slug, '/profilo')
      await loginAs(page, fixture.receptionist, receptionistLanding)

      for (const path of protectedPaths) {
        const response = await page.goto(path)
        expect(response?.status()).toBe(403)
      }

      await resetSession(page)
      await loginAs(page, fixture.owner, protectedPaths[0])
      for (const path of protectedPaths) {
        await page.goto(path)
        expect(page.url()).toContain(path)
      }

      await resetSession(page)
      await loginAs(page, fixture.manager, protectedPaths[0])
      for (const path of protectedPaths) {
        await page.goto(path)
        expect(page.url()).toContain(path)
      }
    } finally {
      await fixture.cleanup()
    }
  })

  test('receptionist cannot replay forbidden settings, catalog, or marketing server actions', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = await seedSurfaceFixture()
    const service = requireServiceClient()
    const settingsPath = buildTenantDashboardPath(fixture.slug, '/impostazioni')
    const catalogoPath = buildTenantDashboardPath(fixture.slug, '/catalogo')
    const marketingPath = buildTenantDashboardPath(fixture.slug, '/marketing?tab=messaggi')

    try {
      await loginAs(page, fixture.owner, settingsPath)
      const newLocationName = `Replay Location ${randomSuffix()}`
      const capturedSettingsAction = await captureNextActionRequest(page, async () => {
        await page.getByRole('button', { name: 'Sedi' }).click()
        await page.getByRole('button', { name: /Aggiungi sede|Nuova sede/ }).click()
        await page.getByLabel('Nome sede').fill(newLocationName)
        await page.getByRole('button', { name: 'Crea sede' }).click()
        await expect(page.getByText('Sede creata')).toBeVisible()
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

      await resetSession(page)
      await loginAs(page, fixture.owner, catalogoPath)
      const newServiceName = `Replay Service ${randomSuffix()}`
      const capturedCatalogAction = await captureNextActionRequest(page, async () => {
        await page.getByRole('button', { name: 'Nuovo servizio' }).click()
        await page.getByLabel('Nome').fill(newServiceName)
        await page.getByLabel('Prezzo (€)').fill('25')
        await page.getByLabel('Durata (min)').fill('30')
        await page.getByRole('button', { name: 'Crea servizio' }).click()
        await expect(page.getByText('Servizio creato')).toBeVisible()
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

      await resetSession(page)
      await loginAs(page, fixture.owner, marketingPath)
      await expect(page.getByRole('switch').first()).toBeVisible()
      const capturedMarketingAction = await captureNextActionRequest(page, async () => {
        await page.getByRole('switch').first().click()
      })

      const { error: resetMarketingAutomationError } = await service
        .from('message_automations')
        .upsert(
          {
            tenant_id: fixture.tenantId,
            type: 'reminder_1d',
            enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,type' }
        )
      await assertNoSupabaseError('reset marketing automation state', resetMarketingAutomationError)

      await resetSession(page)
      await loginAs(page, fixture.receptionist, buildTenantDashboardPath(fixture.slug, '/profilo'))
      await replayCapturedAction(page, capturedMarketingAction)

      const { data: marketingAutomationRow, error: marketingAutomationRowError } = await service
        .from('message_automations')
        .select('enabled')
        .eq('tenant_id', fixture.tenantId)
        .eq('type', 'reminder_1d')
        .maybeSingle()
      await assertNoSupabaseError('read marketing automation after blocked replay', marketingAutomationRowError)
      expect(marketingAutomationRow?.enabled).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })

  test('receptionist cannot call marketing notify route handler', async ({ page }) => {
    const fixture = await seedSurfaceFixture()
    const service = requireServiceClient()

    try {
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
    } finally {
      await fixture.cleanup()
    }
  })
})
