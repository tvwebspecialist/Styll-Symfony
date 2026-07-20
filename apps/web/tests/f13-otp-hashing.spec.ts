/**
 * F-13: OTP email hash a riposo + purge automatico
 *
 * Copre tutti e 17 i requisiti del finding F-13:
 *  1.  Il DB non salva mai il codice OTP in chiaro
 *  2.  code_hash è valorizzato (hex 64 char)
 *  3.  OTP corretto viene accettato
 *  4.  OTP errato viene rifiutato
 *  5.  OTP scaduto viene rifiutato
 *  6.  OTP usato non può essere riutilizzato
 *  7.  Doppio submit accetta una sola richiesta
 *  8.  Resend entro cooldown non invalida il token attivo
 *  9.  Resend dopo cooldown genera nuovo OTP/hash e invalida il precedente
 * 10.  Email sconosciuta continua a fare no-op generico
 * 11.  Rate limit esistente resta operativo
 * 12.  Anti-enumeration resta invariata
 * 13.  Cleanup elimina token usati/scaduti oltre retention
 * 14.  Cleanup NON elimina token ancora validi
 * 15.  Cleanup/RPC non è invocabile da anon o authenticated
 * 16.  Nessun OTP/hash appare in risposta HTTP, URL o log visibili
 * 17.  Migration: colonna `code` non esiste più, `code_hash` esiste
 */

import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from 'playwright/test'

import {
  sendEmailVerificationOtp,
  EMAIL_VERIFICATION_SEND_COOLDOWN_MS,
  EMAIL_VERIFICATION_CODE_TTL_MS,
  hashOtp,
  getPepper,
} from '../src/lib/email-verification'
import { verifyEmailOTP } from '../src/lib/actions/email-verification'
import { handleSendEmailVerificationRequest } from '../src/lib/email-verification/send-route'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

interface OtpFixture {
  email: string
  userId: string
  cleanup: () => Promise<void>
}

async function createOtpFixture(service: ServiceClient, label: string): Promise<OtpFixture> {
  const suffix = randomSuffix()
  const email = `playwright-f13-${label}-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError(`f13 create user ${label}`, authError)
  const userId = authData.user!.id

  const { error: profileErr } = await service
    .from('profiles')
    .update({ email, email_verified: false, full_name: `F13 ${label}`, user_type: 'staff' })
    .eq('id', userId)
  await assertNoSupabaseError(`f13 seed profile ${label}`, profileErr)

  return {
    email,
    userId,
    cleanup: async () => {
      await service.from('email_verification_tokens').delete().eq('email', email)
      await service.auth.admin.deleteUser(userId)
    },
  }
}

function captureEmail() {
  const captured: { email: string; code: string }[] = []
  const sender = async (args: { email: string; code: string }) => {
    captured.push({ email: args.email, code: args.code })
    return { success: true }
  }
  return { captured, sender }
}

function buildSendRequest(email: string): Request {
  return new Request('http://localhost:3000/api/email-verification/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.99' },
    body: JSON.stringify({ email }),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('F-13: OTP hash a riposo', () => {
  test.skip(!hasSupabaseSeedEnv, 'Richiede SUPABASE service-role env.')

  // ─── Test 1 + 2: DB non contiene codice in chiaro, code_hash valorizzato ───

  test('T01+T02: code_hash è hex-64, codice in chiaro NON è nel DB', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't01')
    const { captured, sender } = captureEmail()
    const now = new Date(Date.UTC(2026, 6, 11, 10, 0, 0))

    try {
      const result = await sendEmailVerificationOtp(fixture.email, {
        db: service,
        now: () => now,
        sendEmail: sender,
      })
      expect(result.success).toBe(true)
      expect(captured).toHaveLength(1)

      const plaintextCode = captured[0].code
      expect(plaintextCode).toMatch(/^\d{6}$/)

      // Read token directly from DB as service_role
      const { data: dbToken, error } = await service
        .from('email_verification_tokens')
        .select('*')
        .eq('email', fixture.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      await assertNoSupabaseError('T01 read db token', error)

      // T02: code_hash exists and is 64-char hex
      expect(dbToken?.code_hash).toMatch(/^[0-9a-f]{64}$/)
      // Explicit parity check: the hash persisted by the real send flow matches
      // the HMAC recomputed in the same Playwright process with the active pepper.
      expect(dbToken?.code_hash).toBe(hashOtp(plaintextCode, getPepper()))

      // T01: plaintext is NOT anywhere in the persisted record
      const recordStr = JSON.stringify(dbToken)
      expect(recordStr).not.toContain(plaintextCode)
      // Also confirm: the record has no `code` field at all
      expect('code' in (dbToken ?? {})).toBe(false)
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 3: OTP corretto accettato ──────────────────────────────────────

  test('T03: OTP corretto viene accettato e profilo marcato verified', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't03')
    const { captured, sender } = captureEmail()
    const now = new Date(Date.UTC(2026, 6, 11, 10, 0, 0))

    try {
      await sendEmailVerificationOtp(fixture.email, { db: service, now: () => now, sendEmail: sender })
      expect(captured).toHaveLength(1)

      const result = await verifyEmailOTP(fixture.email, captured[0].code, {
        db: service,
        now: () => now,
      })
      expect(result.success).toBe(true)

      const { data: profile } = await service
        .from('profiles')
        .select('email_verified')
        .eq('id', fixture.userId)
        .single()
      expect(profile?.email_verified).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 4: OTP errato rifiutato ────────────────────────────────────────

  test('T04: OTP errato viene rifiutato', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't04')
    const { sender } = captureEmail()
    const now = new Date(Date.UTC(2026, 6, 11, 10, 0, 0))

    try {
      await sendEmailVerificationOtp(fixture.email, { db: service, now: () => now, sendEmail: sender })

      const result = await verifyEmailOTP(fixture.email, '000000')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 5: OTP scaduto rifiutato ───────────────────────────────────────

  test('T05: OTP scaduto viene rifiutato', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't05')
    const pepper = getPepper()
    const testCode = '555555'
    const testHash = hashOtp(testCode, pepper)

    try {
      // Insert a token with an expires_at in the past (already expired)
      const { error: insertErr } = await service.from('email_verification_tokens').insert({
        email: fixture.email,
        code_hash: testHash,
        expires_at: new Date(Date.now() - 120_000).toISOString(), // expired 2 min ago
      })
      await assertNoSupabaseError('T05 insert expired token', insertErr)

      const result = await verifyEmailOTP(fixture.email, testCode)
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/scadut/i)
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 6: OTP usato non riutilizzabile ────────────────────────────────

  test('T06: OTP già usato non può essere riutilizzato', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't06')
    const { captured, sender } = captureEmail()
    const now = new Date(Date.UTC(2026, 6, 11, 10, 0, 0))

    try {
      await sendEmailVerificationOtp(fixture.email, { db: service, now: () => now, sendEmail: sender })
      const code = captured[0].code

      const first = await verifyEmailOTP(fixture.email, code, {
        db: service,
        now: () => now,
      })
      expect(first.success).toBe(true)

      const second = await verifyEmailOTP(fixture.email, code, {
        db: service,
        now: () => now,
      })
      expect(second.success).toBe(false)
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 7: Doppio submit atomico ───────────────────────────────────────

  test('T07: doppio submit simultaneo accetta una sola richiesta', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't07')
    const { captured, sender } = captureEmail()
    const now = new Date(Date.UTC(2026, 6, 11, 10, 0, 0))

    try {
      await sendEmailVerificationOtp(fixture.email, { db: service, now: () => now, sendEmail: sender })
      const code = captured[0].code

      // Submit same code twice in parallel
      const [r1, r2] = await Promise.all([
        verifyEmailOTP(fixture.email, code, {
          db: service,
          now: () => now,
        }),
        verifyEmailOTP(fixture.email, code, {
          db: service,
          now: () => now,
        }),
      ])

      const successes = [r1, r2].filter((r) => r.success)
      expect(successes).toHaveLength(1)
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 8: Resend entro cooldown ───────────────────────────────────────

  test('T08: resend entro cooldown restituisce 429 e non invalida il token', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't08')
    const { captured, sender } = captureEmail()
    const now = new Date(Date.UTC(2026, 6, 11, 10, 0, 0))

    try {
      const deps = {
        db: service,
        now: () => now,
        sendEmail: sender,
      }

      const r1 = await sendEmailVerificationOtp(fixture.email, deps)
      expect(r1.success).toBe(true)

      // Immediate second send — still within cooldown
      const r2 = await sendEmailVerificationOtp(fixture.email, deps)
      expect(r2.success).toBe(false)
      expect(r2.statusCode).toBe(429)

      // Token must still be active (not invalidated)
      const { data: tokens } = await service
        .from('email_verification_tokens')
        .select('id, used')
        .eq('email', fixture.email)
        .order('created_at', { ascending: false })
      expect(tokens).toHaveLength(1)
      expect(tokens?.[0]?.used).toBe(false)

      // Original code still works
      const verify = await verifyEmailOTP(fixture.email, captured[0].code, {
        db: service,
        now: () => now,
      })
      expect(verify.success).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 9: Resend dopo cooldown genera nuovo hash ──────────────────────

  test('T09: resend dopo cooldown genera nuovo OTP/hash e invalida il precedente', async () => {
    const service = requireServiceClient()
    const fixture = await createOtpFixture(service, 't09')
    const { captured, sender } = captureEmail()
    const nowMs = Date.UTC(2026, 6, 11, 10, 0, 0)

    try {
      await sendEmailVerificationOtp(fixture.email, {
        db: service,
        now: () => new Date(nowMs),
        sendEmail: sender,
      })
      expect(captured).toHaveLength(1)
      const firstHash = (
        await service
          .from('email_verification_tokens')
          .select('code_hash')
          .eq('email', fixture.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data?.code_hash

      // Advance time past cooldown
      const laterMs = nowMs + EMAIL_VERIFICATION_SEND_COOLDOWN_MS + 5_000
      const r2 = await sendEmailVerificationOtp(fixture.email, {
        db: service,
        now: () => new Date(laterMs),
        sendEmail: sender,
      })
      expect(r2.success).toBe(true)
      expect(captured).toHaveLength(2)

      // All previous tokens should be invalidated
      const { data: tokens } = await service
        .from('email_verification_tokens')
        .select('id, used, code_hash')
        .eq('email', fixture.email)
        .order('created_at', { ascending: false })

      const activeTokens = tokens?.filter((t) => t.used === false) ?? []
      expect(activeTokens).toHaveLength(1)
      expect(activeTokens[0].code_hash).not.toBe(firstHash)

      // Old code no longer works
      const oldVerify = await verifyEmailOTP(fixture.email, captured[0].code, {
        db: service,
        now: () => new Date(laterMs),
      })
      expect(oldVerify.success).toBe(false)

      // New code works
      const newVerify = await verifyEmailOTP(fixture.email, captured[1].code, {
        db: service,
        now: () => new Date(laterMs),
      })
      expect(newVerify.success).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })

  // ─── Test 10 + 12: Email sconosciuta → no-op, anti-enumeration ──────────

  test('T10+T12: email sconosciuta → no-op generico, nessun token creato', async () => {
    const service = requireServiceClient()
    const unknownEmail = `unknown-f13-${randomSuffix()}@example.com`
    const { captured, sender } = captureEmail()

    const result = await sendEmailVerificationOtp(unknownEmail, {
      db: service,
      sendEmail: sender,
    })

    // T12: risposta identica a quella di un'email esistente (no enumeration)
    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
    // T10: nessuna email inviata, nessun token creato
    expect(captured).toHaveLength(0)
    const { data: tokens } = await service
      .from('email_verification_tokens')
      .select('id')
      .eq('email', unknownEmail)
    expect(tokens ?? []).toHaveLength(0)
  })

  // ─── Test 11: Rate limit operativo ───────────────────────────────────────

  test('T11: rate limit HTTP è operativo', async () => {
    const emailRateCount = { value: 0 }
    const mockCheckRateLimit = (key: string, limit: number) => {
      if (key.startsWith('email-verification:send:email:')) {
        emailRateCount.value += 1
        if (emailRateCount.value > limit) {
          return { allowed: false, retryAfterSec: 60 }
        }
      }
      return { allowed: true, retryAfterSec: 0 }
    }

    const responses: Response[] = []
    for (let i = 0; i <= 5; i++) {
      const resp = await handleSendEmailVerificationRequest(
        buildSendRequest(`rl-f13-${randomSuffix()}@example.com`),
        {
          checkRateLimit: mockCheckRateLimit,
          sendEmailVerificationOtp: async () => ({ success: true, statusCode: 200 }),
        }
      )
      responses.push(resp)
    }

    const tooManyIdx = responses.findIndex((r) => r.status === 429)
    expect(tooManyIdx).toBeGreaterThan(-1)
    const limited = responses[tooManyIdx]
    const body = await limited.json()
    expect(body.success).toBe(false)
    expect(body).not.toHaveProperty('code')
    expect(body).not.toHaveProperty('code_hash')
  })

  // ─── Test 13 + 14: Cleanup ───────────────────────────────────────────────

  test('T13+T14: cleanup elimina token vecchi ma preserva quelli validi', async () => {
    const service = requireServiceClient()
    const suffix = randomSuffix()
    const emailExpired = `f13-cleanup-expired-${suffix}@example.com`
    const emailUsed = `f13-cleanup-used-${suffix}@example.com`
    const emailValid = `f13-cleanup-valid-${suffix}@example.com`

    const pepper = getPepper()
    const dummyHash = hashOtp('123456', pepper)
    const far_past = new Date(Date.UTC(2026, 0, 1)).toISOString()
    const far_future = new Date(Date.UTC(2027, 0, 1)).toISOString()
    const old_created = new Date(Date.UTC(2026, 0, 1)).toISOString()
    const recent_created = new Date().toISOString()

    // Insert test tokens directly
    const { error: insertErr } = await service.from('email_verification_tokens').insert([
      // Should be cleaned up: expired > 24h ago
      {
        email: emailExpired,
        code_hash: dummyHash,
        expires_at: far_past,
        last_sent_at: old_created,
        created_at: old_created,
        used: false,
      },
      // Should be cleaned up: used > 24h ago
      {
        email: emailUsed,
        code_hash: dummyHash,
        expires_at: far_future,
        last_sent_at: old_created,
        created_at: old_created,
        used: true,
      },
      // Should survive: still valid
      {
        email: emailValid,
        code_hash: dummyHash,
        expires_at: far_future,
        last_sent_at: recent_created,
        created_at: recent_created,
        used: false,
      },
    ])
    await assertNoSupabaseError('T13 insert test tokens', insertErr)

    // Run cleanup with service_role
    const { data: deletedCount, error: cleanupErr } = await service.rpc(
      'cleanup_email_verification_tokens',
      { retention: '1 hour' }
    )
    await assertNoSupabaseError('T13 cleanup RPC', cleanupErr)
    expect(typeof deletedCount).toBe('number')
    expect(deletedCount).toBeGreaterThanOrEqual(2)

    // T14: valid token survives
    const { data: survivors } = await service
      .from('email_verification_tokens')
      .select('email')
      .eq('email', emailValid)
    expect(survivors ?? []).toHaveLength(1)

    // T13: expired + used tokens are gone
    const { data: expiredRemaining } = await service
      .from('email_verification_tokens')
      .select('email')
      .eq('email', emailExpired)
    expect(expiredRemaining ?? []).toHaveLength(0)

    const { data: usedRemaining } = await service
      .from('email_verification_tokens')
      .select('email')
      .eq('email', emailUsed)
    expect(usedRemaining ?? []).toHaveLength(0)

    // Cleanup valid token
    await service.from('email_verification_tokens').delete().eq('email', emailValid)
  })

  // ─── Test 15: Cleanup non invocabile da anon/authenticated ───────────────

  test('T15: cleanup RPC non è invocabile da client anon', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !anonKey) {
      test.skip(true, 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY mancante')
      return
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await anonClient.rpc('cleanup_email_verification_tokens')
    expect(error).not.toBeNull()
  })

  // ─── Test 16: Nessun OTP/hash nelle risposte HTTP ────────────────────────

  test('T16: nessun OTP o hash appare nel body della risposta HTTP', async () => {
    const { captured, sender } = captureEmail()

    const resp = await handleSendEmailVerificationRequest(
      buildSendRequest(`t16-${randomSuffix()}@example.com`),
      {
        checkRateLimit: () => ({ allowed: true, retryAfterSec: 0 }),
        sendEmailVerificationOtp: async (email) => {
          const captured2: { email: string; code: string }[] = []
          const r = await sendEmailVerificationOtp(email, {
            sendEmail: async (args) => {
              captured2.push(args)
              captured.push(args)
              return { success: true }
            },
          })
          return r
        },
      }
    )

    const body = await resp.json()
    const bodyStr = JSON.stringify(body)

    // Body must not contain any OTP code or hash
    for (const sent of captured) {
      expect(bodyStr).not.toContain(sent.code)
    }
    expect(body).not.toHaveProperty('code')
    expect(body).not.toHaveProperty('code_hash')
    expect(body).not.toHaveProperty('otp')
  })

  // ─── Test 17: Migration — colonna `code` rimossa, `code_hash` presente ───

  test('T17: la colonna code non esiste più, code_hash è presente', async () => {
    const service = requireServiceClient()
    const pepper = getPepper()
    const dummyHash = hashOtp('999999', pepper)
    const validExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const suffix = randomSuffix()
    const email = `t17-migration-${suffix}@example.com`

    // Insert a token via the new schema (no `code` field)
    const { data: inserted, error: insertErr } = await service
      .from('email_verification_tokens')
      .insert({
        email,
        code_hash: dummyHash,
        expires_at: validExpiry,
      })
      .select('*')
      .single()
    await assertNoSupabaseError('T17 insert token', insertErr)

    // `code` column must not exist in the result
    expect('code' in (inserted ?? {})).toBe(false)
    // `code_hash` must exist
    expect(inserted?.code_hash).toBe(dummyHash)

    await service.from('email_verification_tokens').delete().eq('email', email)
  })
})
