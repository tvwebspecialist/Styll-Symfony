import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from 'playwright/test'
import { PUBLIC_B2B_SUBPROCESSORS } from '../src/lib/legal/public-b2b'

test.describe('sub-processor inventory consistency', () => {
  test('active providers stay aligned across the public page, DPA, and ROPA', async ({ page }) => {
    const response = await page.goto('/sub-processor')
    expect(response?.status()).toBe(200)

    const publicPageBody = (await page.locator('body').textContent()) ?? ''
    const dpaPath = ['docs/legal/dpa-barbieri.md', '../../docs/legal/dpa-barbieri.md']
      .find((candidate) => existsSync(candidate))
    const ropaPath = ['docs/legal/ropa.md', '../../docs/legal/ropa.md']
      .find((candidate) => existsSync(candidate))

    expect(dpaPath).toBeTruthy()
    expect(ropaPath).toBeTruthy()

    const dpa = readFileSync(dpaPath as string, 'utf8')
    const ropa = readFileSync(ropaPath as string, 'utf8')

    for (const provider of PUBLIC_B2B_SUBPROCESSORS) {
      expect(publicPageBody).toContain(provider.name)
      expect(dpa).toContain(provider.name)
      expect(ropa).toContain(provider.name)
    }

    for (const phrase of [
      'Regione primaria EU (Irlanda); possibili sub-trattamenti extra-SEE dichiarati dal fornitore',
      'Condizionale (solo dopo consenso analytics)',
      'Sub-responsabile (AI provider)',
      'Condizionale (solo su richiesta esplicita)',
    ]) {
      expect(publicPageBody).toContain(phrase)
      expect(dpa).toContain(phrase)
      expect(ropa).toContain(phrase)
    }
  })
})
