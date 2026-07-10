import { expect, test } from 'playwright/test'

test.describe('public B2B legal package', () => {
  test('terms page is not placeholder and references the DPA', async ({ page }) => {
    const response = await page.goto('/termini')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Termini di Servizio per i barbieri' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/placeholder temporaneo/i)
    await expect(page.locator('body')).not.toContainText(/documento in fase di revisione legale/i)
    await expect(page.locator('body')).toContainText('Accordo sul Trattamento dei Dati')
    await expect(page.locator('body')).toContainText('Responsabile del trattamento')
  })

  test('privacy B2B contains titolare, finalità, diritti, reclamo Garante, sub-responsabili', async ({ page }) => {
    const response = await page.goto('/privacy')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Privacy Policy per i barbieri' })).toBeVisible()
    await expect(page.locator('body')).toContainText('Titolare del trattamento')
    await expect(page.locator('body')).toContainText('Finalità e basi giuridiche')
    await expect(page.locator('body')).toContainText('I tuoi diritti e reclamo al Garante')
    await expect(page.locator('body')).toContainText('Garante per la protezione dei dati personali')
    await expect(page.locator('body')).toContainText('Sub-responsabili')
  })

  test('sub-processor page lists active providers used by the codebase', async ({ page }) => {
    const response = await page.goto('/sub-processor')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Sub-responsabili del trattamento' })).toBeVisible()
    for (const provider of ['Supabase Inc.', 'Vercel Inc.', 'Resend Inc.', 'Functional Software Inc. (Sentry)', 'PostHog Inc.', 'Anthropic PBC']) {
      await expect(page.locator('body')).toContainText(provider)
    }
  })

  test('public B2B legal pages are non-empty and return 200', async ({ page }) => {
    const pages = [
      { path: '/termini', heading: 'Termini di Servizio per i barbieri' },
      { path: '/privacy', heading: 'Privacy Policy per i barbieri' },
      { path: '/cookie', heading: 'Cookie Policy' },
      { path: '/sub-processor', heading: 'Sub-responsabili del trattamento' },
    ]

    for (const legalPage of pages) {
      const response = await page.goto(legalPage.path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: legalPage.heading })).toBeVisible()
      const bodyText = (await page.locator('body').textContent()) ?? ''
      expect(bodyText.trim().length).toBeGreaterThan(400)
    }
  })
})
