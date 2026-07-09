import { expect, test } from 'playwright/test'
import { buildTenantAppPath, randomEmail } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  createTenantFixture,
  hasSupabaseSeedEnv,
  requireServiceClient,
} from './helpers/supabase-admin'

test.describe('register legal notice', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant fixtures.')

  test('signup and profile preferences use tenant-specific privacy and terms links', async ({ page }) => {
    const fixture = await createTenantFixture('register-notice')
    const service = requireServiceClient()
    const email = randomEmail('playwright-register')
    let userId: string | null = null

    try {
      const { data: authData, error: authError } = await service.auth.admin.createUser({
        email,
        password: 'Testpass123!',
        email_confirm: true,
        user_metadata: { user_type: 'client' },
      })
      await assertNoSupabaseError('create register-notice auth user', authError)
      userId = authData.user?.id ?? null
      if (!userId) {
        throw new Error('create register-notice auth user: missing user id')
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
      await assertNoSupabaseError('seed register-notice profile', profileError)

      await page.addInitScript(() => {
        window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
      })
      await page.goto(buildTenantAppPath(fixture.slug, '/accesso'))
      await page.getByLabel('La tua email').fill(email)
      await page.getByRole('button', { name: 'Continua', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Controlla la tua email' })).toBeVisible()
      await expect(page.getByText('Inserisci il codice a 6 cifre')).toBeVisible()

      const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })
      await assertNoSupabaseError('generate register-notice OTP', linkError)
      const otp = linkData.properties?.email_otp
      if (!otp) {
        throw new Error('generate register-notice OTP: missing email_otp')
      }

      for (let index = 0; index < otp.length; index += 1) {
        await page.getByLabel(`Cifra ${index + 1}`).fill(otp[index])
      }

      await expect(
        page.getByRole('heading', { name: 'Completa il tuo profilo' })
      ).toBeVisible({ timeout: 15_000 })
      const privacyLink = page.getByRole('link', { name: 'Privacy Policy' })
      const termsLink = page.getByRole('link', { name: 'Termini e condizioni' })

      await expect(privacyLink).toBeVisible()
      await expect(termsLink).toBeVisible()

      const privacyHref = await privacyLink.getAttribute('href')
      const termsHref = await termsLink.getAttribute('href')

      expect(new URL(privacyHref!, 'http://localhost').pathname).toBe(buildTenantAppPath(fixture.slug, '/privacy'))
      expect(new URL(termsHref!, 'http://localhost').pathname).toBe(buildTenantAppPath(fixture.slug, '/termini'))

      await page.getByLabel('Nome e cognome').fill(`Playwright ${email}`)
      await page.getByLabel('Numero di telefono').fill('+39 333 123 4567')
      await page.getByRole('button', { name: 'Completa accesso' }).click()

      await page.waitForURL(/\/profilo$/, { timeout: 15_000 })

      await page.goto(buildTenantAppPath(fixture.slug, '/profilo/preferenze'))

      const preferencesTermsLink = page.getByRole('link', { name: 'Termini e condizioni' })
      const preferencesPrivacyLink = page.getByRole('link', { name: 'Privacy policy' })

      await expect(preferencesTermsLink).toBeVisible()
      await expect(preferencesPrivacyLink).toBeVisible()
      await expect(preferencesTermsLink).toHaveAttribute('href', buildTenantAppPath(fixture.slug, '/termini'))
      await expect(preferencesPrivacyLink).toHaveAttribute('href', buildTenantAppPath(fixture.slug, '/privacy'))
    } finally {
      if (userId) {
        await service.auth.admin.deleteUser(userId)
      }
      await fixture.cleanup()
    }
  })
})
