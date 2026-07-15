import { expect, test } from 'playwright/test'
import {
  B2B_REGISTER_CONTEXT_COOKIE,
  B2B_REGISTER_LEGAL_PROOF_COOKIE,
  EMAIL_PASSWORD_REGISTER_SOURCE,
  GOOGLE_OAUTH_REGISTER_SOURCE,
  buildRootOAuthCallbackPath,
  getB2bRegisterCookieOptions,
  getCurrentB2bTermsAcceptanceDocument,
} from '../src/lib/legal/b2b-register-acceptance-shared'
import {
  canAccessB2bGoogleLoginWithoutNewAcceptance,
  consumePendingB2bTermsAcceptanceProof,
  createPendingB2bTermsAcceptanceProof,
  finalizeGoogleRegisterTermsAcceptance,
} from '../src/lib/legal/b2b-register-acceptance'
import { randomEmail } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

type LegalAcceptanceEvent = {
  accepted_at: string
  accepted_by: string
  document_type: 'B2B_TERMS'
  document_version: string
  id: string
  privacy_notice_version: string
  source: typeof EMAIL_PASSWORD_REGISTER_SOURCE | typeof GOOGLE_OAUTH_REGISTER_SOURCE
  tenant_id: string | null
  user_id: string
}

interface OnboardingTokenFixture {
  cleanup: () => Promise<void>
  token: string
}

interface AuthUserFixture {
  cleanup: () => Promise<void>
  createdAt: string
  email: string
  userId: string
}

async function createOnboardingTokenFixture(prefix: string): Promise<OnboardingTokenFixture> {
  const service = requireServiceClient()
  const token = `${prefix}-${Date.now()}`.slice(0, 32)
  const { data, error } = await (service as any)
    .from('onboarding_tokens')
    .insert({
      active: true,
      barbiere_email: null,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      token,
    })
    .select('id')
    .single()

  await assertNoSupabaseError('create onboarding token fixture', error)

  return {
    token,
    cleanup: async () => {
      if (data?.id) {
        await (service as any).from('onboarding_tokens').delete().eq('id', data.id)
      }
    },
  }
}

async function createAuthUser(email: string): Promise<AuthUserFixture> {
  const service = requireServiceClient()
  const { data, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'Testpass123!',
    user_metadata: { full_name: `Playwright ${email}` },
  })

  await assertNoSupabaseError('create auth user fixture', error)

  const userId = data.user?.id ?? null
  const createdAt = data.user?.created_at ?? null
  if (!userId || !createdAt) {
    throw new Error('create auth user fixture: missing user id or created_at')
  }

  return {
    createdAt,
    email,
    userId,
    cleanup: async () => {
      await service.auth.admin.deleteUser(userId)
    },
  }
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const service = requireServiceClient()
  const { data, error } = await service
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  await assertNoSupabaseError('read profile by email', error)
  return data?.id ?? null
}

async function listLegalAcceptanceEvents(
  service: ServiceClient,
  userId: string,
): Promise<LegalAcceptanceEvent[]> {
  const { data, error } = await (service as any)
    .from('legal_acceptance_events')
    .select('id, user_id, tenant_id, document_type, document_version, privacy_notice_version, accepted_at, accepted_by, source')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: true })
    .order('created_at', { ascending: true })

  await assertNoSupabaseError('list legal acceptance events', error)
  return (data ?? []) as LegalAcceptanceEvent[]
}

test.describe.serial('B2B register legal acceptance', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for B2B legal acceptance fixtures.')

  test('register page gates both email/password submit and Google start behind the terms checkbox', async ({ page }) => {
    const onboarding = await createOnboardingTokenFixture('pw-gate')
    const email = randomEmail('pw-register-gate')

    try {
      await page.goto(`/register?token=${onboarding.token}`)

      const googleButton = page.getByRole('button', { name: 'Continua con Google' })
      const submitButton = page.getByRole('button', { name: 'Crea account' })
      const termsCheckbox = page.getByRole('checkbox')

      await expect(googleButton).toBeDisabled()
      await expect(termsCheckbox).not.toBeChecked()

      await page.getByLabel('Nome completo').fill('Playwright Gate')
      await page.getByLabel('Email').fill(email)
      await page.locator('#password').fill('Testpass123!')
      await page.locator('#password2').fill('Testpass123!')
      await submitButton.click()

      await expect(page.getByText('Devi accettare i Termini di Servizio per continuare')).toBeVisible()
      await expect.poll(() => getUserIdByEmail(email), { timeout: 5_000 }).toBeNull()

      await termsCheckbox.check()
      await expect(googleButton).toBeEnabled()
    } finally {
      await onboarding.cleanup()
    }
  })

  test('email/password signup persists a versioned server-side proof and duplicate retries stay idempotent', async ({ page }) => {
    test.setTimeout(120_000)
    const service = requireServiceClient()
    const onboarding = await createOnboardingTokenFixture('pw-email')
    const email = randomEmail('pw-email-terms')
    let userId: string | null = null

    try {
      await page.goto(`/register?token=${onboarding.token}`)
      await page.getByLabel('Nome completo').fill('Playwright Email Terms')
      await page.getByLabel('Email').fill(email)
      await page.locator('#password').fill('Testpass123!')
      await page.locator('#password2').fill('Testpass123!')
      await page.getByRole('checkbox').check()
      await page.getByRole('button', { name: 'Crea account' }).click()

      await expect.poll(() => getUserIdByEmail(email), { timeout: 30_000 }).not.toBeNull()
      userId = await getUserIdByEmail(email)
      expect(userId).not.toBeNull()
      if (!userId) {
        throw new Error('missing user id after email/password registration')
      }

      const currentDoc = getCurrentB2bTermsAcceptanceDocument()
      await expect
        .poll(async () => {
          const events = await listLegalAcceptanceEvents(service, userId!)
          return events.length
        }, {
          timeout: 15_000,
        })
        .toBe(1)

      const firstEvents = await listLegalAcceptanceEvents(service, userId)
      expect(firstEvents[0]).toMatchObject({
        accepted_by: userId,
        document_type: 'B2B_TERMS',
        document_version: currentDoc.documentVersion,
        privacy_notice_version: currentDoc.privacyNoticeVersion,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
        tenant_id: null,
        user_id: userId,
      })

      const duplicateProof = await createPendingB2bTermsAcceptanceProof({
        acceptedByEmail: email,
        db: service as any,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
      })

      await consumePendingB2bTermsAcceptanceProof({
        db: service as any,
        rawToken: duplicateProof.rawToken,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
        userEmail: email,
        userId,
      })

      const eventsAfterRetry = await listLegalAcceptanceEvents(service, userId)
      expect(eventsAfterRetry).toHaveLength(1)
      expect(eventsAfterRetry[0].id).toBe(firstEvents[0].id)
    } finally {
      if (userId) {
        await service.auth.admin.deleteUser(userId)
      }
      await onboarding.cleanup()
    }
  })

  test('email/password register proof is enforced server-side when the source flag is present', async () => {
    const service = requireServiceClient()
    const email = randomEmail('pw-email-proof-missing')

    const { data, error } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      password: 'Testpass123!',
      user_metadata: {
        full_name: 'Playwright Missing Proof',
        legal_acceptance_source: EMAIL_PASSWORD_REGISTER_SOURCE,
      },
    })

    expect(data.user ?? null).toBeNull()
    expect(error).toBeTruthy()
    expect((error as { status?: number } | null)?.status).toBe(500)
    await expect.poll(() => getUserIdByEmail(email), { timeout: 5_000 }).toBeNull()
  })

  test('email/password prepare route keeps the raw proof token in httpOnly cookies instead of the JSON body', async ({
    request,
  }) => {
    const onboarding = await createOnboardingTokenFixture('pw-email-cookie')

    try {
      const response = await request.post('/api/auth/register/legal-acceptance', {
        data: {
          email: randomEmail('pw-email-cookie'),
          onboardingToken: onboarding.token,
          source: EMAIL_PASSWORD_REGISTER_SOURCE,
        },
      })

      expect(response.ok()).toBe(true)
      const payload = (await response.json()) as Record<string, unknown>
      expect(payload.success).toBe(true)
      expect(payload.proofToken ?? null).toBeNull()

      const setCookie = response.headers()['set-cookie'] ?? ''
      expect(setCookie).toContain(`${B2B_REGISTER_LEGAL_PROOF_COOKIE}=`)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie.toLowerCase()).toContain('samesite=lax')
      expect(setCookie).toContain('Max-Age=600')
      expect(setCookie).not.toContain('Domain=.localhost:3000')
    } finally {
      await onboarding.cleanup()
    }
  })

  test('Google register proof cookie is httpOnly, same-site, and the callback URL carries no legal payload', async ({ request }) => {
    const onboarding = await createOnboardingTokenFixture('pw-google-cookie')

    try {
      const response = await request.post('/api/auth/register/legal-acceptance', {
        data: {
          onboardingToken: onboarding.token,
          source: GOOGLE_OAUTH_REGISTER_SOURCE,
        },
      })

      expect(response.ok()).toBe(true)
      const setCookie = response.headers()['set-cookie'] ?? ''
      expect(setCookie).toContain(`${B2B_REGISTER_LEGAL_PROOF_COOKIE}=`)
      expect(setCookie).toContain(`${B2B_REGISTER_CONTEXT_COOKIE}=`)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie.toLowerCase()).toContain('samesite=lax')
      expect(setCookie).toContain('Max-Age=600')
      expect(setCookie).not.toContain('Domain=.localhost:3000')

      const callbackPath = buildRootOAuthCallbackPath({ flow: 'register', intent: 'trial' })
      const callbackUrl = new URL(callbackPath, 'http://styll.local')
      expect(callbackUrl.searchParams.get('oauth_flow')).toBe('register')
      expect(callbackUrl.searchParams.get('intent')).toBe('trial')
      expect(callbackUrl.searchParams.has('proofToken')).toBe(false)
      expect(callbackUrl.search).not.toContain(getCurrentB2bTermsAcceptanceDocument().documentVersion)
      expect(callbackUrl.search).not.toContain(getCurrentB2bTermsAcceptanceDocument().privacyNoticeVersion)

      expect(getB2bRegisterCookieOptions({ secure: true })).toMatchObject({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
      })
    } finally {
      await onboarding.cleanup()
    }
  })

  test('Google callback acceptance blocks fresh users without a valid proof, consumes valid proofs once, and skips existing users', async () => {
    const service = requireServiceClient()
    const blockedUser = await createAuthUser(randomEmail('pw-google-block'))
    const acceptedUser = await createAuthUser(randomEmail('pw-google-accept'))
    const existingUser = await createAuthUser(randomEmail('pw-google-existing'))

    try {
      const blockedResult = await finalizeGoogleRegisterTermsAcceptance({
        db: service as any,
        userCreatedAt: blockedUser.createdAt,
        userEmail: blockedUser.email,
        userId: blockedUser.userId,
      })
      expect(blockedResult.status).toBe('blocked_new_user')

      const proof = await createPendingB2bTermsAcceptanceProof({
        contextToken: 'oauth-register-context',
        db: service as any,
        source: GOOGLE_OAUTH_REGISTER_SOURCE,
      })

      const acceptedResult = await finalizeGoogleRegisterTermsAcceptance({
        contextToken: 'oauth-register-context',
        db: service as any,
        proofToken: proof.rawToken,
        userCreatedAt: acceptedUser.createdAt,
        userEmail: acceptedUser.email,
        userId: acceptedUser.userId,
      })
      expect(acceptedResult.status).toBe('accepted')

      const acceptedEvents = await listLegalAcceptanceEvents(service, acceptedUser.userId)
      expect(acceptedEvents).toHaveLength(1)
      expect(acceptedEvents[0].source).toBe(GOOGLE_OAUTH_REGISTER_SOURCE)

      await expect(
        consumePendingB2bTermsAcceptanceProof({
          contextToken: 'oauth-register-context',
          db: service as any,
          rawToken: proof.rawToken,
          source: GOOGLE_OAUTH_REGISTER_SOURCE,
          userEmail: acceptedUser.email,
          userId: acceptedUser.userId,
        }),
      ).rejects.toThrow(/already used|missing|expired/i)

      const { error: existingProfileError } = await service
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', existingUser.userId)
      await assertNoSupabaseError('mark existing Google user as onboarded', existingProfileError)

      const existingResult = await finalizeGoogleRegisterTermsAcceptance({
        db: service as any,
        userCreatedAt: existingUser.createdAt,
        userEmail: existingUser.email,
        userId: existingUser.userId,
      })
      expect(existingResult.status).toBe('allowed_existing_user')
    } finally {
      await blockedUser.cleanup()
      await acceptedUser.cleanup()
      await existingUser.cleanup()
    }
  })

  test('Google login without a registration proof is reserved to users with prior terms acceptance or existing business presence', async () => {
    const service = requireServiceClient()
    const freshUser = await createAuthUser(randomEmail('pw-google-login-fresh'))
    const acceptedTermsUser = await createAuthUser(randomEmail('pw-google-login-accepted'))
    const existingUser = await createAuthUser(randomEmail('pw-google-login-existing'))

    try {
      expect(
        await canAccessB2bGoogleLoginWithoutNewAcceptance({
          db: service as any,
          userId: freshUser.userId,
        }),
      ).toBe(false)

      const acceptedTermsProof = await createPendingB2bTermsAcceptanceProof({
        acceptedByEmail: acceptedTermsUser.email,
        db: service as any,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
      })

      await consumePendingB2bTermsAcceptanceProof({
        db: service as any,
        rawToken: acceptedTermsProof.rawToken,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
        userEmail: acceptedTermsUser.email,
        userId: acceptedTermsUser.userId,
      })

      expect(
        await canAccessB2bGoogleLoginWithoutNewAcceptance({
          db: service as any,
          userId: acceptedTermsUser.userId,
        }),
      ).toBe(true)

      const { error: existingProfileError } = await service
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', existingUser.userId)
      await assertNoSupabaseError('mark existing Google-login user as onboarded', existingProfileError)

      expect(
        await canAccessB2bGoogleLoginWithoutNewAcceptance({
          db: service as any,
          userId: existingUser.userId,
        }),
      ).toBe(true)
    } finally {
      await freshUser.cleanup()
      await acceptedTermsUser.cleanup()
      await existingUser.cleanup()
    }
  })

  test('acceptance proofs enforce email/context binding, expiry, and preserve older versions when a new version is accepted', async () => {
    const service = requireServiceClient()
    const user = await createAuthUser(randomEmail('pw-legal-version'))

    try {
      const wrongEmailProof = await createPendingB2bTermsAcceptanceProof({
        acceptedByEmail: 'first@example.com',
        db: service as any,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
      })

      await expect(
        consumePendingB2bTermsAcceptanceProof({
          db: service as any,
          rawToken: wrongEmailProof.rawToken,
          source: EMAIL_PASSWORD_REGISTER_SOURCE,
          userEmail: 'second@example.com',
          userId: user.userId,
        }),
      ).rejects.toThrow(/does not match/i)

      const expiredProof = await createPendingB2bTermsAcceptanceProof({
        acceptedAt: new Date(Date.now() - 120_000),
        db: service as any,
        source: GOOGLE_OAUTH_REGISTER_SOURCE,
        ttlSeconds: 30,
      })

      await expect(
        consumePendingB2bTermsAcceptanceProof({
          contextToken: null,
          db: service as any,
          rawToken: expiredProof.rawToken,
          source: GOOGLE_OAUTH_REGISTER_SOURCE,
          userEmail: user.email,
          userId: user.userId,
        }),
      ).rejects.toThrow(/expired|missing/i)

      const firstAcceptance = await createPendingB2bTermsAcceptanceProof({
        acceptedByEmail: user.email,
        db: service as any,
        documentVersion: '1.3-test',
        privacyNoticeVersion: '1.5-test',
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
      })
      await consumePendingB2bTermsAcceptanceProof({
        db: service as any,
        rawToken: firstAcceptance.rawToken,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
        userEmail: user.email,
        userId: user.userId,
      })

      const firstEvents = await listLegalAcceptanceEvents(service, user.userId)
      expect(firstEvents).toHaveLength(1)
      expect(firstEvents[0].document_version).toBe('1.3-test')
      const firstAcceptedAt = firstEvents[0].accepted_at

      const secondAcceptance = await createPendingB2bTermsAcceptanceProof({
        acceptedByEmail: user.email,
        db: service as any,
        documentVersion: '1.4-test',
        privacyNoticeVersion: '1.6-test',
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
      })
      await consumePendingB2bTermsAcceptanceProof({
        db: service as any,
        rawToken: secondAcceptance.rawToken,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
        userEmail: user.email,
        userId: user.userId,
      })

      const versionedEvents = await listLegalAcceptanceEvents(service, user.userId)
      expect(versionedEvents).toHaveLength(2)
      expect(versionedEvents.map((event) => event.document_version)).toEqual(['1.3-test', '1.4-test'])
      expect(versionedEvents[0].accepted_at).toBe(firstAcceptedAt)
      expect(versionedEvents[0].privacy_notice_version).toBe('1.5-test')
      expect(versionedEvents[1].privacy_notice_version).toBe('1.6-test')
    } finally {
      await user.cleanup()
    }
  })
})
