import { expect, test } from 'playwright/test'

function buildPendingToken(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.test-signature`
}

test.describe('register two-step flow', () => {
  test('email/password path validates step 1 locally, then submits all fields only on step 2', async ({ page }) => {
    let registerPayload: Record<string, unknown> | null = null
    let registerRequestCount = 0

    await page.route('**/api/auth/staff/register', async (route) => {
      registerRequestCount += 1
      registerPayload = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/register')

    await expect(page.getByLabel('Nome attività')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Continua con Google' })).toBeEnabled()

    await page.getByRole('button', { name: 'Continua', exact: true }).click()
    await expect(page.getByLabel('Nome attività')).toHaveCount(0)
    await expect.poll(() => registerRequestCount).toBe(0)

    await page.getByLabel('Nome completo').fill('Marco Rossi')
    await page.getByLabel('Email').fill('marco.rossi@example.test')
    await page.locator('#password').fill('Testpass123!')
    await page.locator('#password2').fill('Testpass123!')
    await page.getByRole('button', { name: 'Continua', exact: true }).click()

    await expect(page.getByLabel('Nome attività')).toBeVisible()
    await expect(page.locator('#password')).toHaveCount(0)

    await page.getByRole('button', { name: 'Crea il mio negozio' }).click()
    await expect.poll(() => registerRequestCount).toBe(0)

    await page.getByLabel('Nome attività').fill('Barber Test')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Crea il mio negozio' }).click()

    await expect.poll(() => registerRequestCount).toBe(1)
    expect(registerPayload).toMatchObject({
      fullName: 'Marco Rossi',
      email: 'marco.rossi@example.test',
      password: 'Testpass123!',
      businessName: 'Barber Test',
      businessType: 'barbiere',
      acceptedTerms: true,
    })
  })

  test('Google path stays available on step 1 and lands on shared activity step before final submit', async ({
    page,
    context,
  }) => {
    let googleStartPayload: Record<string, unknown> | null = null
    let finalizePayload: Record<string, unknown> | null = null
    let finalizeRequestCount = 0

    await page.route('**/api/auth/google/staff/start', async (route) => {
      googleStartPayload = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorizationUrl: '/register?step=activity&provider=google',
          success: true,
        }),
      })
    })

    await page.route('**/api/auth/google/staff/register/finalize', async (route) => {
      finalizeRequestCount += 1
      finalizePayload = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await context.addCookies([{
      name: 'styll_google_register_pending',
      value: buildPendingToken({
        email: 'google.owner@example.test',
        full_name: 'Marco Google',
        issued_at: Math.floor(Date.now() / 1000),
      }),
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
    }])

    await page.goto('/register')

    await expect(page.getByLabel('Nome attività')).toHaveCount(0)
    const googleButton = page.getByRole('button', { name: 'Continua con Google' })
    await expect(googleButton).toBeEnabled()

    await googleButton.click()
    await page.waitForURL('**/register?step=activity&provider=google')

    await expect(page.getByText('Continua con Google')).toBeVisible()
    await expect(page.getByText('google.owner@example.test')).toBeVisible()
    await expect(page.getByLabel('Nome completo')).toHaveCount(0)
    await expect(page.getByLabel('Email')).toHaveCount(0)
    await expect(page.locator('#password')).toHaveCount(0)
    await expect(page.getByLabel('Nome attività')).toBeVisible()

    await page.getByRole('button', { name: 'Crea il mio negozio' }).click()
    await expect.poll(() => finalizeRequestCount).toBe(0)

    await page.getByLabel('Nome attività').fill('Google Barber Shop')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Crea il mio negozio' }).click()

    expect(googleStartPayload).toMatchObject({
      mode: 'register',
    })
    await expect.poll(() => finalizeRequestCount).toBe(1)
    expect(finalizePayload).toMatchObject({
      businessName: 'Google Barber Shop',
      businessType: 'barbiere',
      acceptedTerms: true,
    })
  })
})
