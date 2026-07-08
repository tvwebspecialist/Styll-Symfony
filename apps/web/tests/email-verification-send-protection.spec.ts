import { randomBytes } from 'crypto'
import { expect, test } from 'playwright/test'
import {
  handleSendEmailVerificationRequest,
} from '../src/app/api/email-verification/send/route'
import {
  sendEmailVerificationOtp,
  EMAIL_VERIFICATION_SEND_COOLDOWN_MS,
} from '../src/lib/email-verification'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

interface VerificationProfileFixture {
  email: string
  userId: string
  cleanup: () => Promise<void>
}

function buildSendRequest(email: string, forwardedFor = '203.0.113.10'): Request {
  return new Request('http://localhost:3000/api/email-verification/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': forwardedFor,
    },
    body: JSON.stringify({ email }),
  })
}

function allowAllRateLimit() {
  return { allowed: true, retryAfterSec: 0 }
}

function createDeterministicRateLimiter(nowRef: { value: number }) {
  const buckets = new Map<string, { count: number; resetAt: number }>()

  return (key: string, limit: number, windowMs: number) => {
    const now = nowRef.value
    const bucket = buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, retryAfterSec: 0 }
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      }
    }

    bucket.count += 1
    return { allowed: true, retryAfterSec: 0 }
  }
}

async function createUnverifiedProfileFixture(
  service: ServiceClient,
  label: string
): Promise<VerificationProfileFixture> {
  const suffix = randomSuffix()
  const email = `playwright-email-verify-${label}-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError(`create ${label} auth user`, authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error(`create ${label} auth user: missing user id`)
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: false,
      full_name: `Playwright Email Verify ${label}`,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  return {
    email,
    userId,
    cleanup: async () => {
      await service.from('email_verification_tokens').delete().eq('email', email)
      await service.auth.admin.deleteUser(userId)
    },
  }
}

test.describe('email verification send protections', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for email verification fixtures.')

  test('registration-style first send passes and creates the first token', async () => {
    const service = requireServiceClient()
    const fixture = await createUnverifiedProfileFixture(service, 'first-send')
    const sentEmails: Array<{ email: string; code: string }> = []
    const nowRef = { value: Date.UTC(2026, 6, 8, 12, 0, 0) }

    try {
      const response = await handleSendEmailVerificationRequest(buildSendRequest(fixture.email), {
        checkRateLimit: allowAllRateLimit,
        sendEmailVerificationOtp: (email) =>
          sendEmailVerificationOtp(email, {
            db: service,
            now: () => new Date(nowRef.value),
            sendEmail: async ({ email: recipientEmail, code }) => {
              sentEmails.push({ email: recipientEmail, code })
              return { success: true }
            },
          }),
      })

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ success: true, error: undefined })
      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].email).toBe(fixture.email)

      const { data: token, error: tokenError } = await service
        .from('email_verification_tokens')
        .select('id, code, used, last_sent_at')
        .eq('email', fixture.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      await assertNoSupabaseError('read first email verification token', tokenError)
      expect(token?.used).toBe(false)
      expect(token?.code).toBe(sentEmails[0].code)
    } finally {
      await fixture.cleanup()
    }
  })

  test('immediate resend hits cooldown and does not invalidate the active token', async () => {
    const service = requireServiceClient()
    const fixture = await createUnverifiedProfileFixture(service, 'cooldown')
    const sentEmails: Array<{ email: string; code: string }> = []
    const nowRef = { value: Date.UTC(2026, 6, 8, 12, 5, 0) }

    try {
      const deps = {
        checkRateLimit: allowAllRateLimit,
        sendEmailVerificationOtp: (email: string) =>
          sendEmailVerificationOtp(email, {
            db: service,
            now: () => new Date(nowRef.value),
            sendEmail: async ({ email: recipientEmail, code }) => {
              sentEmails.push({ email: recipientEmail, code })
              return { success: true }
            },
          }),
      }

      const firstResponse = await handleSendEmailVerificationRequest(
        buildSendRequest(fixture.email),
        deps
      )
      expect(firstResponse.status).toBe(200)

      const { data: firstToken, error: firstTokenError } = await service
        .from('email_verification_tokens')
        .select('id, code, used')
        .eq('email', fixture.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      await assertNoSupabaseError('read first cooldown token', firstTokenError)
      expect(firstToken?.used).toBe(false)

      const secondResponse = await handleSendEmailVerificationRequest(
        buildSendRequest(fixture.email),
        deps
      )

      expect(secondResponse.status).toBe(429)
      expect(secondResponse.headers.get('Retry-After')).toBe(
        String(Math.ceil(EMAIL_VERIFICATION_SEND_COOLDOWN_MS / 1000))
      )
      await expect(secondResponse.json()).resolves.toMatchObject({
        success: false,
        error: expect.stringContaining('Puoi richiedere un nuovo codice tra'),
      })

      const { data: tokens, error: tokensError } = await service
        .from('email_verification_tokens')
        .select('id, code, used')
        .eq('email', fixture.email)
        .order('created_at', { ascending: false })
      await assertNoSupabaseError('read tokens after cooldown rejection', tokensError)

      expect(tokens ?? []).toHaveLength(1)
      expect(tokens?.[0]?.id).toBe(firstToken?.id)
      expect(tokens?.[0]?.used).toBe(false)
      expect(tokens?.[0]?.code).toBe(firstToken?.code)
      expect(sentEmails).toHaveLength(1)
    } finally {
      await fixture.cleanup()
    }
  })

  test('many spaced requests hit the server-side rate limit', async () => {
    const nowRef = { value: Date.UTC(2026, 6, 8, 12, 10, 0) }
    const rateLimit = createDeterministicRateLimiter(nowRef)
    let sendCalls = 0
    const email = 'rate-limit@example.com'

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await handleSendEmailVerificationRequest(buildSendRequest(email), {
        checkRateLimit: rateLimit,
        sendEmailVerificationOtp: async () => {
          sendCalls += 1
          return { success: true, statusCode: 200 }
        },
      })

      expect(response.status).toBe(200)
      nowRef.value += EMAIL_VERIFICATION_SEND_COOLDOWN_MS + 1_000
    }

    const limitedResponse = await handleSendEmailVerificationRequest(buildSendRequest(email), {
      checkRateLimit: rateLimit,
      sendEmailVerificationOtp: async () => {
        sendCalls += 1
        return { success: true, statusCode: 200 }
      },
    })

    expect(limitedResponse.status).toBe(429)
    expect(limitedResponse.headers.get('Retry-After')).not.toBeNull()
    await expect(limitedResponse.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('Troppe richieste'),
    })
    expect(sendCalls).toBe(5)
  })

  test('unknown emails no-op instead of acting as a spam relay', async () => {
    const service = requireServiceClient()
    const sentEmails: Array<{ email: string; code: string }> = []
    const unknownEmail = `unknown-${randomSuffix()}@example.com`

    const response = await handleSendEmailVerificationRequest(buildSendRequest(unknownEmail), {
      checkRateLimit: allowAllRateLimit,
      sendEmailVerificationOtp: (email) =>
        sendEmailVerificationOtp(email, {
          db: service,
          sendEmail: async ({ email: recipientEmail, code }) => {
            sentEmails.push({ email: recipientEmail, code })
            return { success: true }
          },
        }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, error: undefined })
    expect(sentEmails).toHaveLength(0)

    const { data: tokens, error: tokensError } = await service
      .from('email_verification_tokens')
      .select('id')
      .eq('email', unknownEmail)
    await assertNoSupabaseError('read tokens for unknown email', tokensError)
    expect(tokens ?? []).toHaveLength(0)
  })
})
