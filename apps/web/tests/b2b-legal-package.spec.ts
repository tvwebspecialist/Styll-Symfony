import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from 'playwright/test'

test.describe('public B2B legal package', () => {
  test('terms page is not placeholder, keeps legal identity unambiguous, and references the DPA', async ({ page }) => {
    const response = await page.goto('/termini')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Termini di Servizio per i barbieri' })).toBeVisible()
    await expect(page.locator('body')).toContainText('Aggiornati il 14 luglio 2026')
    await expect(page.locator('body')).toContainText('Versione 1.3')
    await expect(page.locator('body')).toContainText('Styll, nome commerciale del servizio fornito da Tommaso Vezzaro')
    await expect(page.locator('body')).toContainText('la parte contrattuale e il titolare del trattamento è Tommaso Vezzaro')
    await expect(page.locator('body')).not.toContainText('Il fornitore del servizio descritto in questa pagina è Styll')
    await expect(page.locator('body')).not.toContainText(/placeholder temporaneo/i)
    await expect(page.locator('body')).not.toContainText(/documento in fase di revisione legale/i)
    await expect(page.locator('body')).toContainText('Accordo sul Trattamento dei Dati')
    await expect(page.locator('body')).toContainText('Responsabile del trattamento')
  })

  test('privacy B2B contains titolare, finalità, diritti, reclamo Garante, sub-responsabili', async ({ page }) => {
    const response = await page.goto('/privacy')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Privacy Policy per i barbieri' })).toBeVisible()
    await expect(page.locator('body')).toContainText('Aggiornata il 14 luglio 2026')
    await expect(page.locator('body')).toContainText('Versione 1.5')
    await expect(page.locator('body')).toContainText(
      /è il titolare del trattamento per i dati relativi al sito pubblico, alla registrazione, agli account business, all.?onboarding, alle dashboard, alla fatturazione, all.?assistenza e alla sicurezza del servizio/,
    )
    await expect(page.locator('body')).toContainText('opera come Responsabile del trattamento')
    await expect(page.locator('body')).not.toContainText('Il titolare del trattamento per questa informativa è Styll')
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
    await expect(page.locator('body')).toContainText('Aggiornato il 15 luglio 2026')
    await expect(page.locator('body')).toContainText('Versione 1.4')
    await expect(page.locator('body')).toContainText("Tommaso Vezzaro, per l'erogazione del servizio Styll")
    for (const provider of ['Supabase Inc.', 'Vercel Inc.', 'Resend Inc.', 'Functional Software Inc. (Sentry)', 'PostHog Inc.', 'Anthropic PBC']) {
      await expect(page.locator('body')).toContainText(provider)
    }
  })

  test('public B2B legal pages are non-empty, versioned consistently, and cookie scope is not narrowed to existing customers', async ({
    page,
  }) => {
    const pages = [
      {
        path: '/termini',
        heading: 'Termini di Servizio per i barbieri',
        version: '1.3',
        updatedOn: '14 luglio 2026',
        requiredText: ['cliente business', 'prova gratuita', 'fatturazione', 'rinnovo', 'prezzo o listino applicabile'],
        forbiddenText: ['nelle superfici di onboarding, billing e offerta commerciale associate al tuo account'],
      },
      {
        path: '/privacy',
        heading: 'Privacy Policy per i barbieri',
        version: '1.5',
        updatedOn: '14 luglio 2026',
        requiredText: ['clienti business', 'Tommaso Vezzaro', 'registrazione B2B', 'workspace e le dashboard'],
      },
      {
        path: '/cookie',
        heading: 'Cookie Policy',
        version: '1.5',
        updatedOn: '14 luglio 2026',
        requiredText: ['visitatori', 'prospect', 'clienti business', 'Tommaso Vezzaro'],
        forbiddenText: ['clienti business che usano Styll', 'solo clienti business'],
      },
      {
        path: '/sub-processor',
        heading: 'Sub-responsabili del trattamento',
        version: '1.4',
        updatedOn: '15 luglio 2026',
        requiredText: ['clienti B2B', 'Tommaso Vezzaro'],
      },
    ]

    for (const legalPage of pages) {
      const response = await page.goto(legalPage.path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: legalPage.heading })).toBeVisible()
      const bodyText = (await page.locator('body').textContent()) ?? ''
      expect(bodyText.trim().length).toBeGreaterThan(400)
      expect(bodyText).toContain(legalPage.updatedOn)
      expect(bodyText).toContain(`Versione ${legalPage.version}`)
      expect(bodyText).not.toMatch(/pre-commerciale/i)
      expect(bodyText).not.toMatch(/in corso di finalizzazione/i)
      for (const text of legalPage.requiredText) {
        expect(bodyText).toContain(text)
      }
      for (const text of legalPage.forbiddenText ?? []) {
        expect(bodyText).not.toContain(text)
      }
    }
  })

  test('register signup surfaces keep affirmative terms assent while privacy remains notice-only', async () => {
    const registerFormPath = ['src/components/auth/register-form.tsx', 'apps/web/src/components/auth/register-form.tsx']
      .find((candidate) => existsSync(candidate))
    const registerOptionsPath = ['src/components/auth/register-signup-options.tsx', 'apps/web/src/components/auth/register-signup-options.tsx']
      .find((candidate) => existsSync(candidate))
    const googleButtonPath = ['src/components/auth/google-button.tsx', 'apps/web/src/components/auth/google-button.tsx']
      .find((candidate) => existsSync(candidate))
    const callbackRoutePath = ['src/app/auth/callback/route.ts', 'apps/web/src/app/auth/callback/route.ts']
      .find((candidate) => existsSync(candidate))
    const onboardingActionsPath = ['src/app/(auth)/onboarding/actions.ts', 'apps/web/src/app/(auth)/onboarding/actions.ts']
      .find((candidate) => existsSync(candidate))

    expect(registerFormPath).toBeTruthy()
    expect(registerOptionsPath).toBeTruthy()
    expect(googleButtonPath).toBeTruthy()
    expect(callbackRoutePath).toBeTruthy()
    expect(onboardingActionsPath).toBeTruthy()

    const registerFormSource = readFileSync(registerFormPath as string, 'utf8')
    const registerOptionsSource = readFileSync(registerOptionsPath as string, 'utf8')
    const googleButtonSource = readFileSync(googleButtonPath as string, 'utf8')
    const callbackRouteSource = readFileSync(callbackRoutePath as string, 'utf8')
    const onboardingActionsSource = readFileSync(onboardingActionsPath as string, 'utf8')
    const normalizedRegisterFormSource = registerFormSource.replace(/\s+/g, ' ')
    const normalizedRegisterOptionsSource = registerOptionsSource.replace(/\s+/g, ' ')
    const normalizedGoogleButtonSource = googleButtonSource.replace(/\s+/g, ' ')
    const normalizedCallbackRouteSource = callbackRouteSource.replace(/\s+/g, ' ')
    const normalizedOnboardingActionsSource = onboardingActionsSource.replace(/\s+/g, ' ')

    expect(normalizedRegisterFormSource).toContain('const [uncontrolledAcceptedTerms, setUncontrolledAcceptedTerms] = useState(false)')
    expect(normalizedRegisterFormSource).toContain('const acceptedTerms = controlledAcceptedTerms ?? uncontrolledAcceptedTerms')
    expect(normalizedRegisterFormSource).toContain('type="checkbox"')
    expect(normalizedRegisterFormSource).toContain('checked={acceptedTerms}')
    expect(normalizedRegisterFormSource).toContain('Accetto i')
    expect(normalizedRegisterFormSource).toContain('Termini di Servizio')
    expect(normalizedRegisterFormSource).toContain('dichiaro di aver preso visione della')
    expect(normalizedRegisterFormSource).toContain('Privacy Policy')
    expect(normalizedRegisterFormSource).not.toContain('Privacy Policy e la accetto')
    expect(normalizedRegisterFormSource).not.toContain('defaultChecked')
    expect(normalizedRegisterFormSource).toContain(
      "le condizioni economiche applicabili ti vengono mostrate prima dell&apos;attivazione",
    )
    expect(normalizedRegisterFormSource).toContain('/api/auth/register/legal-acceptance/consume')
    expect(normalizedRegisterFormSource).not.toContain('legal_acceptance_proof:')
    expect(normalizedRegisterFormSource).not.toContain('legal_acceptance_source:')
    expect(normalizedRegisterOptionsSource).toContain('acceptedTerms={acceptedTerms}')
    expect(normalizedRegisterOptionsSource).toContain('oauthFlow="register"')
    expect(normalizedGoogleButtonSource).toContain('oauthFlow === ROOT_OAUTH_FLOW_REGISTER && !acceptedTerms')
    expect(normalizedGoogleButtonSource).toContain("source: GOOGLE_OAUTH_REGISTER_SOURCE")
    expect(normalizedCallbackRouteSource).toContain('canAccessB2bGoogleLoginWithoutNewAcceptance')
    expect(normalizedCallbackRouteSource).toContain('Per il primo accesso con Google devi usare il link di registrazione B2B')
    expect(normalizedOnboardingActionsSource).toContain('hasAnyB2bTermsAcceptanceForUser')
    expect(normalizedOnboardingActionsSource).toContain('Per completare l’onboarding devi registrarti accettando prima i Termini di Servizio.')
  })
})
