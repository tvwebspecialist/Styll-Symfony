import { expect, test } from 'playwright/test'
import { buildTenantAppPath } from './helpers/e2e-env'
import { createTenantFixture, hasSupabaseSeedEnv } from './helpers/supabase-admin'

test.describe('offline tenant-aware CTA', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant fixtures.')

  test('offline page retry CTA stays on the current tenant app root', async ({ page }) => {
    const fixture = await createTenantFixture('offline-cta')

    try {
      await page.goto(buildTenantAppPath(fixture.slug, '/offline'))

      await expect(page.getByRole('heading', { name: 'Sei offline' })).toBeVisible()

      const retryLink = page.getByRole('link', { name: 'Riprova' })
      await expect(retryLink).toBeVisible()
      await expect(retryLink).toHaveAttribute('href', buildTenantAppPath(fixture.slug))
    } finally {
      await fixture.cleanup()
    }
  })
})
