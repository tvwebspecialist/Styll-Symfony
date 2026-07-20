import { expect, test } from 'playwright/test'
import { buildTenantAppPath } from './helpers/e2e-env'
import { createTenantFixture, hasSupabaseSeedEnv, randomSuffix } from './helpers/supabase-admin'

test.describe('unknown tenant safety', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant fixtures.')

  test('unknown tenant page returns 404 without leaking other tenant data', async ({ page }) => {
    const fixture = await createTenantFixture('no-leak')
    const unknownSlug = `unknown-tenant-${randomSuffix()}`

    try {
      const response = await page.goto(buildTenantAppPath(unknownSlug))

      expect(response?.status()).toBe(404)
      await expect(page.getByText('Pagina non trovata.')).toBeVisible()
      await expect(page.getByText(fixture.businessName)).toHaveCount(0)
      await expect(page.getByText('Prenotazione confermata!')).toHaveCount(0)
      await expect(page.getByText('Dettagli non disponibili')).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })

  test('unknown tenant terms page returns 404 without leaking other tenant data', async ({ page }) => {
    const fixture = await createTenantFixture('no-leak-terms')
    const unknownSlug = `unknown-tenant-${randomSuffix()}`

    try {
      const response = await page.goto(buildTenantAppPath(unknownSlug, '/termini'))

      expect(response?.status()).toBe(404)
      await expect(page.getByText('Pagina non trovata.')).toBeVisible()
      await expect(page.getByText(fixture.businessName)).toHaveCount(0)
      await expect(page.getByText("Termini e condizioni per l'uso dell'app di")).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })
})
