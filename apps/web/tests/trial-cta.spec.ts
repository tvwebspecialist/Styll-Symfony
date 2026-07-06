import { expect, test } from 'playwright/test'

test.describe('trial CTA from marketing', () => {
  test('anonymous user lands on register with trial intent and never on login', async ({ page }) => {
    await page.goto('/')

    const trialLinks = page.locator('a').filter({
      hasText: /Prova gratis|Prova Styll gratis|Prova gratis 14 giorni/,
    })

    const hrefs = await trialLinks.evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute('href') ?? '')
    )

    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      const url = new URL(href, 'http://localhost:3000')
      expect(url.pathname).toBe('/register')
      expect(url.searchParams.get('intent')).toBe('trial')
    }

    await page.getByRole('link', { name: 'Prova gratis 14 giorni' }).click()

    await expect(page).toHaveURL(/\/register\?intent=trial$/)
    expect(page.url()).not.toContain('/login')
    await expect(page.getByRole('heading', { name: 'Crea il tuo negozio digitale.' })).toBeVisible()
  })
})
