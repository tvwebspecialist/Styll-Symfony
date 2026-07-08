import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

type TeamRole = 'owner' | 'manager' | 'staff' | 'receptionist'

interface UserSeed {
  id: string
  email: string
  password: string
  fullName: string
}

interface CapturedActionRequest {
  url: string
  headers: Record<string, string>
  body: Buffer
}

interface TeamOwnerRoleFixture {
  tenantId: string
  slug: string
  ownerPrimary: UserSeed
  ownerPeer: UserSeed
  manager: UserSeed
  staffA: UserSeed
  staffB: UserSeed
  staffIds: Record<'ownerPrimary' | 'ownerPeer' | 'manager' | 'staffA' | 'staffB', string>
  cleanup: () => Promise<void>
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

async function createStaffUser(
  service: ServiceClient,
  suffix: string,
  slug: string,
  fullName: string
): Promise<UserSeed> {
  const email = `playwright-team-${slug}-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError(`create ${slug} auth user`, authError)

  const userId = authData.user?.id
  if (!userId) throw new Error(`create ${slug} auth user: missing user id`)

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: fullName,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${slug} profile`, profileError)

  return { id: userId, email, password, fullName }
}

async function createMembership(
  service: ServiceClient,
  tenantId: string,
  profileId: string,
  role: TeamRole
): Promise<string> {
  const { data, error } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: profileId,
      role,
      tenant_id: tenantId,
    })
    .select('id')
    .single()

  await assertNoSupabaseError(`create ${role} membership`, error)
  const staffId = data?.id
  if (!staffId) throw new Error(`create ${role} membership: missing staff id`)
  return staffId
}

async function seedTeamOwnerRoleFixture(): Promise<TeamOwnerRoleFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const createdStaffIds: string[] = []

  const ownerPrimary = await createStaffUser(service, suffix, 'owner-primary', 'Playwright Owner Primary')
  const ownerPeer = await createStaffUser(service, suffix, 'owner-peer', 'Playwright Owner Peer')
  const manager = await createStaffUser(service, suffix, 'manager', 'Playwright Manager')
  const staffA = await createStaffUser(service, suffix, 'staff-a', 'Playwright Staff Alpha')
  const staffB = await createStaffUser(service, suffix, 'staff-b', 'Playwright Staff Beta')
  createdUserIds.push(ownerPrimary.id, ownerPeer.id, manager.id, staffA.id, staffB.id)

  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Team Roles ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-team-roles-${suffix}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id, slug')
    .single()
  await assertNoSupabaseError('create tenant', tenantError)

  const tenantId = tenant?.id
  const slug = tenant?.slug
  if (!tenantId || !slug) throw new Error('create tenant: missing tenant data')

  const staffIds = {
    ownerPrimary: await createMembership(service, tenantId, ownerPrimary.id, 'owner'),
    ownerPeer: await createMembership(service, tenantId, ownerPeer.id, 'owner'),
    manager: await createMembership(service, tenantId, manager.id, 'manager'),
    staffA: await createMembership(service, tenantId, staffA.id, 'staff'),
    staffB: await createMembership(service, tenantId, staffB.id, 'staff'),
  }
  createdStaffIds.push(...Object.values(staffIds))

  return {
    tenantId,
    slug,
    ownerPrimary,
    ownerPeer,
    manager,
    staffA,
    staffB,
    staffIds,
    cleanup: async () => {
      await service.from('team_invitations').delete().eq('tenant_id', tenantId)
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

async function selectRole(page: Page, triggerName: string, optionName: string) {
  await page.getByRole('button', { name: triggerName }).click()
  await page.getByRole('option', { name: optionName }).click()
}

async function openEditModal(page: Page, memberName: string) {
  await page.getByRole('button', { name: `Modifica ${memberName}` }).click()
}

async function waitForInviteEmailError(page: Page) {
  await expect(page.getByText(/Email service not configured/i)).toBeVisible({ timeout: 10_000 })
}

async function readStaffRole(
  service: ServiceClient,
  staffId: string
) {
  const { data, error } = await service
    .from('staff_members')
    .select('role')
    .eq('id', staffId)
    .maybeSingle()
  await assertNoSupabaseError(`read staff role ${staffId}`, error)
  return (data?.role as TeamRole | undefined) ?? null
}

async function runWithTeamFixture(
  run: (context: { fixture: TeamOwnerRoleFixture; service: ServiceClient }) => Promise<void>
) {
  const service = requireServiceClient()
  const fixture = await seedTeamOwnerRoleFixture()

  try {
    await run({ fixture, service })
  } finally {
    await fixture.cleanup()
  }
}

test.describe.serial('team owner role guard', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for team role guard fixtures.')

  test('manager can invoke the ordinary invite action path', async ({ page }) => {
    test.setTimeout(120_000)
    await runWithTeamFixture(async ({ fixture, service }) => {
      const teamPath = buildTenantDashboardPath(fixture.slug, '/team')
      const inviteEmail = `playwright-manager-staff-${randomSuffix()}@example.com`

      await loginAs(page, fixture.manager, teamPath)
      await page.getByRole('button', { name: 'Invita membro' }).click()
      await page.getByPlaceholder('mario@example.com').fill(inviteEmail)
      await page.getByRole('button', { name: 'Invia invito' }).click()
      await waitForInviteEmailError(page)

      const { data: invitationAfterAttempt, error: invitationAfterAttemptError } = await service
        .from('team_invitations')
        .select('id')
        .eq('tenant_id', fixture.tenantId)
        .eq('email', inviteEmail.toLowerCase())
      await assertNoSupabaseError('read ordinary invitation after email failure', invitationAfterAttemptError)
      expect(invitationAfterAttempt ?? []).toHaveLength(0)
    })
  })

  test('owner can invite owner but manager cannot replay the same owner invite action', async ({ page }) => {
    test.setTimeout(120_000)
    await runWithTeamFixture(async ({ fixture, service }) => {
      const teamPath = buildTenantDashboardPath(fixture.slug, '/team')
      const inviteEmail = `playwright-owner-owner-${randomSuffix()}@example.com`

      await loginAs(page, fixture.ownerPrimary, teamPath)
      await page.getByRole('button', { name: 'Invita membro' }).click()
      await page.getByPlaceholder('mario@example.com').fill(inviteEmail)
      await selectRole(page, 'Ruolo invito team', 'Titolare')

      const capturedOwnerInviteAction = await captureNextActionRequest(page, async () => {
        await page.getByRole('button', { name: 'Invia invito' }).click()
        await waitForInviteEmailError(page)
      })

      const { data: invitationAfterOwnerAttempt, error: invitationAfterOwnerAttemptError } = await service
        .from('team_invitations')
        .select('id')
        .eq('tenant_id', fixture.tenantId)
        .eq('email', inviteEmail.toLowerCase())
      await assertNoSupabaseError('read owner invitation after email failure', invitationAfterOwnerAttemptError)
      expect(invitationAfterOwnerAttempt ?? []).toHaveLength(0)

      await resetSession(page)
      await loginAs(page, fixture.manager, teamPath)
      const replayResponse = await replayCapturedAction(page, capturedOwnerInviteAction)
      expect(replayResponse).not.toBeNull()
      const replayText = await replayResponse!.text()
      expect(replayText).toContain('Solo il titolare può invitare un altro titolare')

      const { data: invitationAfterReplay, error: invitationAfterReplayError } = await service
        .from('team_invitations')
        .select('id')
        .eq('tenant_id', fixture.tenantId)
        .eq('email', inviteEmail.toLowerCase())
      await assertNoSupabaseError('read invitation after manager replay', invitationAfterReplayError)
      expect(invitationAfterReplay ?? []).toHaveLength(0)
    })
  })

  test('owner can promote staff to owner but manager cannot replay the same promotion action', async ({ page }) => {
    test.setTimeout(120_000)
    await runWithTeamFixture(async ({ fixture, service }) => {
      const teamPath = buildTenantDashboardPath(fixture.slug, '/team')

      await loginAs(page, fixture.ownerPrimary, teamPath)

      await openEditModal(page, fixture.staffB.fullName)
      await selectRole(page, 'Ruolo membro team', 'Titolare')
      await page.getByRole('button', { name: 'Salva modifiche' }).click()
      await expect(page.getByText('Membro aggiornato')).toBeVisible({ timeout: 10_000 })
      await expect
        .poll(() => readStaffRole(service, fixture.staffIds.staffB), { timeout: 15_000 })
        .toBe('owner')

      await openEditModal(page, fixture.staffA.fullName)
      await selectRole(page, 'Ruolo membro team', 'Titolare')
      const capturedOwnerPromotionAction = await captureNextActionRequest(page, async () => {
        await page.getByRole('button', { name: 'Salva modifiche' }).click()
        await expect(page.getByText('Membro aggiornato')).toBeVisible({ timeout: 10_000 })
      })
      await expect
        .poll(() => readStaffRole(service, fixture.staffIds.staffA), { timeout: 15_000 })
        .toBe('owner')

      const { error: resetStaffRoleError } = await service
        .from('staff_members')
        .update({ role: 'staff' })
        .eq('id', fixture.staffIds.staffA)
      await assertNoSupabaseError('reset promoted staff before manager replay', resetStaffRoleError)

      await resetSession(page)
      await loginAs(page, fixture.manager, teamPath)
      await replayCapturedAction(page, capturedOwnerPromotionAction)

      await expect
        .poll(() => readStaffRole(service, fixture.staffIds.staffA), { timeout: 15_000 })
        .toBe('staff')
    })
  })

  test('manager cannot modify an existing owner', async ({ page }) => {
    test.setTimeout(120_000)
    await runWithTeamFixture(async ({ fixture, service }) => {
      const teamPath = buildTenantDashboardPath(fixture.slug, '/team')

      await loginAs(page, fixture.ownerPrimary, teamPath)
      await openEditModal(page, fixture.ownerPeer.fullName)
      await selectRole(page, 'Ruolo membro team', 'Manager')
      const capturedOwnerEditAction = await captureNextActionRequest(page, async () => {
        await page.getByRole('button', { name: 'Salva modifiche' }).click()
        await expect(page.getByText('Membro aggiornato')).toBeVisible({ timeout: 10_000 })
      })
      await expect
        .poll(() => readStaffRole(service, fixture.staffIds.ownerPeer), { timeout: 15_000 })
        .toBe('manager')

      const { error: resetOwnerRoleError } = await service
        .from('staff_members')
        .update({ role: 'owner' })
        .eq('id', fixture.staffIds.ownerPeer)
      await assertNoSupabaseError('reset owner role before manager replay', resetOwnerRoleError)

      await resetSession(page)
      await loginAs(page, fixture.manager, teamPath)
      await replayCapturedAction(page, capturedOwnerEditAction)

      await expect
        .poll(() => readStaffRole(service, fixture.staffIds.ownerPeer), { timeout: 15_000 })
        .toBe('owner')
    })
  })
})
