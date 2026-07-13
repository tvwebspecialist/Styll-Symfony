import { expect, test } from 'playwright/test'
import { ANALYTICS_CONSENT_KEY } from '../src/lib/analytics-consent'
import { buildTenantAppPath } from './helpers/e2e-env'
import { createTenantFixture, hasSupabaseSeedEnv } from './helpers/supabase-admin'

test.describe('public legal links', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant fixtures.')

  test('cookie banner legal link works on public tenant surfaces', async ({ page }) => {
    const fixture = await createTenantFixture('legal-links')

    try {
      await page.addInitScript((storageKey) => {
        window.localStorage.removeItem(storageKey)
      }, ANALYTICS_CONSENT_KEY)

      await page.goto(buildTenantAppPath(fixture.slug))

      await expect(page.getByText('Usiamo i cookie')).toBeVisible()
      const detailsLink = page.getByRole('link', { name: 'Scopri di più' })
      await expect(detailsLink).toHaveAttribute('href', buildTenantAppPath(fixture.slug, '/cookie'))
      await Promise.all([
        page.waitForURL(new RegExp(`/tenant/app/${fixture.slug}/cookie$`)),
        detailsLink.click(),
      ])

      await expect(page.getByRole('heading', { name: 'Cookie Policy' })).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })

  test('tenant terms page renders B2C content for the current salon', async ({ page }) => {
    const fixture = await createTenantFixture('legal-terms')

    try {
      const response = await page.goto(buildTenantAppPath(fixture.slug, '/termini'))

      expect(response?.status()).toBe(200)
      await expect(
        page.getByRole('heading', {
          name: `Termini e condizioni per l'uso dell'app di ${fixture.businessName}`,
        })
      ).toBeVisible()
      await expect(page.locator('body')).toContainText(fixture.businessName)
      await expect(page.locator('body')).toContainText('I servizi prenotabili tramite questa app sono offerti direttamente')
      await expect(page.locator('body')).toContainText('Styll')
      await expect(page.locator('body')).not.toContainText('Termini di Servizio per i barbieri')
      await expect(page.locator('body')).not.toContainText('Condizioni B2B')
    } finally {
      await fixture.cleanup()
    }
  })
})
