import { randomBytes } from 'crypto'
import { expect, test, type Page } from 'playwright/test'
import { buildTenantAppPath } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

interface TenantFixture {
  tenantId: string
  slug: string
}

interface ExistingClientFixture {
  email: string
  userId: string
  cleanup: () => Promise<void>
}

interface KnownAccountWithoutClientFixture {
  email: string
  userId: string
  cleanup: () => Promise<void>
}

async function createTenantFixture(service: ServiceClient): Promise<TenantFixture> {
  const suffix = randomSuffix()
  const { data, error } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright PWA Access ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-pwa-access-${suffix}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id, slug')
    .single()

  await assertNoSupabaseError('create tenant fixture', error)

  const tenantId = data?.id
  const slug = data?.slug
  if (!tenantId || !slug) {
    throw new Error('create tenant fixture: missing tenant data')
  }

  return { tenantId, slug }
}

async function createAuthUser(
  service: ServiceClient,
  email: string
): Promise<{ userId: string }> {
  const password = randomBytes(18).toString('hex')
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'client' },
  })
  await assertNoSupabaseError(`create auth user ${email}`, error)

  const userId = data.user?.id
  if (!userId) {
    throw new Error(`create auth user ${email}: missing user id`)
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Playwright ${email}`,
      user_type: 'client',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed profile ${email}`, profileError)

  return { userId }
}

async function createExistingClientFixture(
  service: ServiceClient,
  tenantId: string
): Promise<ExistingClientFixture> {
  const email = `playwright-existing-client-${randomSuffix()}@example.com`
  const { userId } = await createAuthUser(service, email)

  const { error: clientError } = await service.from('clients').insert({
    tenant_id: tenantId,
    profile_id: userId,
    full_name: 'Cliente Esistente',
    phone: '+393331112233',
    email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    marketing_consent: false,
    tags: [],
  })
  await assertNoSupabaseError('create existing client row', clientError)

  return {
    email,
    userId,
    cleanup: async () => {
      await service.from('clients').delete().eq('tenant_id', tenantId).eq('email', email)
      await service.auth.admin.deleteUser(userId)
    },
  }
}

async function createKnownAccountWithoutClientFixture(
  service: ServiceClient
): Promise<KnownAccountWithoutClientFixture> {
  const email = `playwright-new-client-${randomSuffix()}@example.com`
  const { userId } = await createAuthUser(service, email)

  return {
    email,
    userId,
    cleanup: async () => {
      await service.auth.admin.deleteUser(userId)
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
  await expect(page.getByText('Inserisci il codice a 6 cifre')).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByRole('button', { name: 'Cambia email' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('Completa il tuo profilo')).toHaveCount(0)
  await expect(page.getByText(/account trovato|account non trovato/i)).toHaveCount(0)
}

async function fillOtp(page: Page, otp: string) {
  const digits = otp.split('')
  for (let index = 0; index < digits.length; index += 1) {
    await page.getByLabel(`Cifra ${index + 1}`).fill(digits[index])
  }
}

test.describe('PWA email anti-enumeration', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for PWA email fixtures.')

  test('existing and new emails land on the same visible OTP step', async ({ browser }) => {
    test.setTimeout(60_000)
    const service = requireServiceClient()
    const tenant = await createTenantFixture(service)
    const existingClient = await createExistingClientFixture(service, tenant.tenantId)
    const newEmail = `playwright-public-new-${randomSuffix()}@example.com`

    const existingPage = await browser.newPage()
    const newPage = await browser.newPage()

    try {
      await openOtpStep(existingPage, tenant.slug, existingClient.email)
      await openOtpStep(newPage, tenant.slug, newEmail)

      const existingTitle = await existingPage.getByRole('heading', { name: 'Controlla la tua email' }).textContent()
      const newTitle = await newPage.getByRole('heading', { name: 'Controlla la tua email' }).textContent()
      expect(existingTitle).toBe(newTitle)

      await expect(existingPage.getByText(existingClient.email)).toBeVisible()
      await expect(newPage.getByText(newEmail)).toBeVisible()
    } finally {
      const { data: createdProfile } = await service
        .from('profiles')
        .select('id')
        .eq('email', newEmail)
        .maybeSingle()
      if (createdProfile?.id) {
        await service.auth.admin.deleteUser(createdProfile.id)
      }
      await existingPage.close()
      await newPage.close()
      await existingClient.cleanup()
      await service.from('tenants').delete().eq('id', tenant.tenantId)
    }
  })

  test('existing client can still complete email OTP access', async ({ page }) => {
    test.setTimeout(60_000)
    const service = requireServiceClient()
    const tenant = await createTenantFixture(service)
    const existingClient = await createExistingClientFixture(service, tenant.tenantId)

    try {
      await openOtpStep(page, tenant.slug, existingClient.email)

      const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
        type: 'magiclink',
        email: existingClient.email,
      })
      await assertNoSupabaseError('generate existing client email OTP', linkError)
      const otp = linkData.properties?.email_otp
      if (!otp) {
        throw new Error('generate existing client email OTP: missing email_otp')
      }

      await fillOtp(page, otp)
      await page.waitForURL(`**/tenant/app/${tenant.slug}/profilo`)

      const { data: linkedClient, error: linkedClientError } = await service
        .from('clients')
        .select('profile_id')
        .eq('tenant_id', tenant.tenantId)
        .eq('email', existingClient.email)
        .maybeSingle()
      await assertNoSupabaseError('read existing client after OTP access', linkedClientError)
      expect(linkedClient?.profile_id).toBe(existingClient.userId)
    } finally {
      await existingClient.cleanup()
      await service.from('tenants').delete().eq('id', tenant.tenantId)
    }
  })

  test('new client can still complete email OTP access', async ({ page }) => {
    test.setTimeout(60_000)
    const service = requireServiceClient()
    const tenant = await createTenantFixture(service)
    const newClient = await createKnownAccountWithoutClientFixture(service)

    try {
      await openOtpStep(page, tenant.slug, newClient.email)

      const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
        type: 'magiclink',
        email: newClient.email,
      })
      await assertNoSupabaseError('generate new client email OTP', linkError)
      const otp = linkData.properties?.email_otp
      if (!otp) {
        throw new Error('generate new client email OTP: missing email_otp')
      }

      await fillOtp(page, otp)

      await expect(page.getByRole('heading', { name: 'Completa il tuo profilo' })).toBeVisible({
        timeout: 20_000,
      })

      const profileNameInput = page.locator('#profile-name')
      const profilePhoneInput = page.locator('#profile-phone')
      const completeAccessButton = page.getByRole('button', { name: 'Completa accesso' })

      await expect(profileNameInput).toBeEditable()
      await expect(profilePhoneInput).toBeEditable()
      await profileNameInput.fill('Nuovo Cliente')
      await profilePhoneInput.fill('+39 333 987 6543')
      await expect(completeAccessButton).toBeEnabled()

      await Promise.all([
        page.waitForURL(`**/tenant/app/${tenant.slug}/profilo`, { timeout: 20_000 }),
        completeAccessButton.click(),
      ])

      const { data: createdClient, error: createdClientError } = await service
        .from('clients')
        .select('profile_id, full_name, phone')
        .eq('tenant_id', tenant.tenantId)
        .eq('email', newClient.email)
        .maybeSingle()
      await assertNoSupabaseError('read new client after OTP access', createdClientError)
      expect(createdClient?.profile_id).toBe(newClient.userId)
      expect(createdClient?.full_name).toBe('Nuovo Cliente')
      expect(createdClient?.phone).toBe('+393339876543')
    } finally {
      await service.from('clients').delete().eq('tenant_id', tenant.tenantId).eq('email', newClient.email)
      await newClient.cleanup()
      await service.from('tenants').delete().eq('id', tenant.tenantId)
    }
  })
})
