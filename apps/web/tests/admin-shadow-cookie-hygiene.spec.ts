import { randomBytes } from 'crypto'
import { expect, test, type BrowserContext, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const SHADOW_COOKIE = 'styll_impersonate_tenant'
const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface UserSeed {
  id: string
  email: string
  password: string
  fullName: string
}

interface TenantSeed {
  id: string
  slug: string
  businessName: string
}

interface ShadowCookieFixture {
  superadmin: UserSeed
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

function serializeShadowCookie(actorId: string, tenantId: string): string {
  return `${actorId}:${tenantId}`
}

async function createUser(
  service: ServiceClient,
  suffix: string,
  label: string,
  fullName: string,
  options?: { isSuperadmin?: boolean },
): Promise<UserSeed> {
  const email = `playwright-shadow-${label}-${suffix}@example.com`
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
      full_name: fullName,
      is_superadmin: options?.isSuperadmin ?? false,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  return { id: userId, email, password, fullName }
}

async function createTenant(
  service: ServiceClient,
  suffix: string,
  label: string,
): Promise<TenantSeed> {
  const slug = `pw-shadow-${label}-${suffix}`
  const businessName = `Playwright Shadow ${label} ${suffix}`
  const { data, error } = await service
    .from('tenants')
    .insert({
      business_name: businessName,
      primary_color: '#111111',
      settings: {},
      slug,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id, slug, business_name')
    .single()
  await assertNoSupabaseError(`create ${label} tenant`, error)

  const tenantId = data?.id
  if (!tenantId || !data.slug || !data.business_name) {
    throw new Error(`create ${label} tenant: missing tenant data`)
  }

  return {
    id: tenantId,
    slug: data.slug,
    businessName: data.business_name,
  }
}

async function createOwnerMembership(
  service: ServiceClient,
  tenantId: string,
  profileId: string,
): Promise<string> {
  const { data, error } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: profileId,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create owner membership for ${tenantId}`, error)

  const staffId = data?.id
  if (!staffId) throw new Error(`create owner membership for ${tenantId}: missing staff id`)
  return staffId
}

async function seedShadowCookieFixture(): Promise<ShadowCookieFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const createdTenantIds: string[] = []
  const createdStaffIds: string[] = []

  const superadmin = await createUser(
    service,
    suffix,
    'superadmin',
    'Playwright Shadow Superadmin',
    { isSuperadmin: true },
  )
  const ownerA = await createUser(service, suffix, 'owner-a', 'Playwright Shadow Owner A')
  const ownerB = await createUser(service, suffix, 'owner-b', 'Playwright Shadow Owner B')
  createdUserIds.push(superadmin.id, ownerA.id, ownerB.id)

  const tenantA = await createTenant(service, suffix, 'tenant-a')
  const tenantB = await createTenant(service, suffix, 'tenant-b')
  createdTenantIds.push(tenantA.id, tenantB.id)

  createdStaffIds.push(
    await createOwnerMembership(service, tenantA.id, ownerA.id),
    await createOwnerMembership(service, tenantB.id, ownerB.id),
  )

  return {
    superadmin,
    ownerA,
    ownerB,
    tenantA,
    tenantB,
    cleanup: async () => {
      if (createdTenantIds.length > 0) {
        await service.from('admin_audit_log').delete().in('tenant_id', createdTenantIds)
      }
      if (createdUserIds.length > 0) {
        await service.from('admin_audit_log').delete().in('actor_id', createdUserIds)
      }
      if (createdStaffIds.length > 0) {
        await service.from('staff_members').delete().in('id', createdStaffIds)
      }
      if (createdTenantIds.length > 0) {
        await service.from('tenants').delete().in('id', createdTenantIds)
      }
      for (const userId of createdUserIds) {
        await service.auth.admin.deleteUser(userId)
      }
    },
  }
}

async function loginAs(page: Page, user: UserSeed, redirectTo: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
  await page.evaluate(() => {
    window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
  })
  await page.locator('#email').fill(user.email)
  await page.locator('#password').fill(user.password)
  const normalizedRedirectTo = normalizePathname(redirectTo)
  await Promise.all([
    page.waitForURL((url) => normalizePathname(url.pathname) === normalizedRedirectTo, {
      waitUntil: 'commit',
    }),
    page.getByRole('button', { name: 'Accedi' }).click(),
  ])
}

async function setShadowCookie(context: BrowserContext, actorId: string, tenantId: string) {
  await context.addCookies([
    {
      name: SHADOW_COOKIE,
      value: serializeShadowCookie(actorId, tenantId),
      url: APP_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

async function setInvalidShadowCookie(context: BrowserContext, value: string) {
  await context.addCookies([
    {
      name: SHADOW_COOKIE,
      value,
      url: APP_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

async function getShadowCookie(context: BrowserContext) {
  const cookies = await context.cookies()
  return cookies.find((cookie) => cookie.name === SHADOW_COOKIE)?.value ?? null
}

async function expectShadowCookieCleared(context: BrowserContext) {
  await expect.poll(() => getShadowCookie(context), { timeout: 10_000 }).toBeNull()
}

test.describe.serial('admin shadow cookie hygiene', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for shadow cookie fixtures.')

  let fixture: ShadowCookieFixture | null = null

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    fixture = await seedShadowCookieFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): ShadowCookieFixture {
    if (!fixture) throw new Error('Shadow cookie fixture not initialized')
    return fixture
  }

  test('logout clears shadow cookie and the next normal login cannot inherit tenant A', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const tenantARoot = buildTenantDashboardPath(fixture.tenantA.slug)
    const tenantBRoot = buildTenantDashboardPath(fixture.tenantB.slug)

    await loginAs(page, fixture.superadmin, '/admin')
    await setShadowCookie(page.context(), fixture.superadmin.id, fixture.tenantA.id)
    await page.goto(tenantARoot)
    await expect(page.getByText(/come Admin\./)).toBeVisible({ timeout: 10_000 })

    await page.goto('/admin')
    await page.getByRole('button', { name: /^Esci$/ }).click()
    await page.waitForURL((url) => normalizePathname(url.pathname) === '/login')
    await expectShadowCookieCleared(page.context())

    await loginAs(page, fixture.ownerB, tenantBRoot)
    await expect(page.getByText(/come Admin\./)).toHaveCount(0)
    await expectShadowCookieCleared(page.context())

    await page.goto(tenantARoot)
    await page.waitForURL(
      (url) => normalizePathname(url.pathname) !== normalizePathname(tenantARoot),
      { timeout: 10_000 },
    )
    expect(page.url()).not.toContain(fixture.tenantA.slug)
    await expect(page.getByText(/come Admin\./)).toHaveCount(0)
    await expectShadowCookieCleared(page.context())
  })

  test('stop shadow clears the shadow cookie', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const tenantARoot = buildTenantDashboardPath(fixture.tenantA.slug)

    await loginAs(page, fixture.superadmin, '/admin')
    await setShadowCookie(page.context(), fixture.superadmin.id, fixture.tenantA.id)
    await page.goto(tenantARoot)
    await expect(page.getByText(/come Admin\./)).toBeVisible({ timeout: 10_000 })

    const reachedAdmin = page
      .waitForURL((url) => normalizePathname(url.pathname) === '/admin', { timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    await page.getByRole('button', { name: 'Esci da shadow mode' }).click()
    await expectShadowCookieCleared(page.context())
    if (!(await reachedAdmin)) {
      await expect
        .poll(() => normalizePathname(new URL(page.url()).pathname), { timeout: 15_000 })
        .toBe('/admin')
    }
  })

  test('invalid shadow cookie is ignored and cleared', async ({ page }) => {
    test.setTimeout(120_000)
    const fixture = getFixture()
    const tenantARoot = buildTenantDashboardPath(fixture.tenantA.slug)

    await loginAs(page, fixture.superadmin, '/admin')
    await setInvalidShadowCookie(page.context(), 'not-a-valid-shadow-cookie')
    await page.goto(tenantARoot)

    await expect(page.getByText(/come Admin\./)).toHaveCount(0)
    await expectShadowCookieCleared(page.context())
  })
})
