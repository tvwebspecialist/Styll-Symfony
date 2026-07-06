import { expect, test } from 'playwright/test'
import { buildTenantAppPath, randomEmail } from './helpers/e2e-env'
import { createTenantFixture, hasSupabaseSeedEnv } from './helpers/supabase-admin'

test.describe('register legal notice', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant fixtures.')

  test('signup shows privacy and terms links before submitting profile data', async ({ page }) => {
    const fixture = await createTenantFixture('register-notice')

    try {
      await page.goto(buildTenantAppPath(fixture.slug, '/accesso'))
      await page.getByLabel('La tua email').fill(randomEmail('playwright-register'))
      await page.getByRole('button', { name: 'Continua', exact: true }).click()

      await expect(page.getByRole('heading', { name: 'Come ti chiami?' })).toBeVisible()
      const privacyLink = page.getByRole('link', { name: 'Privacy Policy' })
      const termsLink = page.getByRole('link', { name: 'Termini e condizioni' })

      await expect(privacyLink).toBeVisible()
      await expect(termsLink).toBeVisible()

      const privacyHref = await privacyLink.getAttribute('href')
      const termsHref = await termsLink.getAttribute('href')

      expect(new URL(privacyHref!, 'http://localhost').pathname).toBe(buildTenantAppPath(fixture.slug, '/privacy'))
      expect(new URL(termsHref!, 'http://localhost').pathname).toBe('/termini')

      await page.goto(privacyHref!)
      await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()

      await page.goto(termsHref!)
      await expect(page.getByRole('heading', { name: 'Termini di Servizio per i barbieri' })).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })
})
