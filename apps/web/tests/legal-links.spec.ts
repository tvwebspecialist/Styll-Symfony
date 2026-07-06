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
      await page.getByRole('link', { name: 'Scopri di più' }).click()

      await expect(page).toHaveURL(/\/cookie$/)
      await expect(page.getByRole('heading', { name: 'Cookie Policy' })).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })
})
