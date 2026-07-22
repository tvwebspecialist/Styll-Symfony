import { expect, test } from 'playwright/test'

test.describe('register Google gating', () => {
  test('Google start unlocks with business name plus accepted terms while email/password keeps its own required fields', async ({
    page,
  }) => {
    let googleStartPayload: Record<string, unknown> | null = null
    let registerRequestCount = 0

    await page.route('**/api/auth/google/staff/start', async (route) => {
      googleStartPayload = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorizationUrl: '/dev-symfony-test',
          success: true,
        }),
      })
    })

    await page.route('**/api/auth/staff/register', async (route) => {
      registerRequestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/register')

    const businessNameInput = page.getByLabel('Nome attività')
    const googleButton = page.getByRole('button', { name: 'Continua con Google' })
    const submitButton = page.getByRole('button', { name: 'Crea account e accedi' })
    const termsCheckbox = page.getByRole('checkbox')

    await expect(googleButton).toBeDisabled()

    await businessNameInput.fill('Barber Test')
    await expect(googleButton).toBeDisabled()

    await termsCheckbox.check()
    await expect(googleButton).toBeEnabled()

    await submitButton.click()
    await expect.poll(() => registerRequestCount).toBe(0)
    await expect(page).toHaveURL(/\/register$/)

    await googleButton.click()
    await page.waitForURL('**/dev-symfony-test')

    expect(googleStartPayload).toMatchObject({
      acceptedTerms: true,
      businessName: 'Barber Test',
      businessType: 'barbiere',
      mode: 'register',
    })
    expect(googleStartPayload).not.toBeNull()
    expect(googleStartPayload?.['fullName']).toBeUndefined()
  })
})
