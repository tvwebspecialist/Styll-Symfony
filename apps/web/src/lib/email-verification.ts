import { createHmac, timingSafeEqual } from 'crypto'
import { sendVerificationCodeEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

export type SendEmailVerificationResult = {
  success: boolean
  error?: string
  statusCode?: number
  retryAfterSec?: number
  skipped?: boolean
}

export const EMAIL_VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000
export const EMAIL_VERIFICATION_SEND_COOLDOWN_MS = 60 * 1000

type VerificationEmailSender = typeof sendVerificationCodeEmail

interface SendEmailVerificationOtpDeps {
  db?: ReturnType<typeof createAdminClient>
  now?: () => Date
  sendEmail?: VerificationEmailSender
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

export function getPepper(): string {
  const pepper = process.env.EMAIL_VERIFICATION_OTP_PEPPER
  if (!pepper) {
    throw new Error(
      '[OTP] EMAIL_VERIFICATION_OTP_PEPPER is not set. ' +
      'Set this env var before starting the server.'
    )
  }
  return pepper
}

export function normalizeVerificationEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeVerificationCode(code: string): string {
  return code.trim()
}

export function hashOtp(code: string, pepper: string): string {
  return createHmac('sha256', pepper).update(code).digest('hex')
}

export function otpHashesEqual(storedHash: string, inputHash: string): boolean {
  const a = Buffer.from(storedHash, 'hex')
  const b = Buffer.from(inputHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildCooldownError(retryAfterSec: number): SendEmailVerificationResult {
  return {
    success: false,
    statusCode: 429,
    retryAfterSec,
    error: `Puoi richiedere un nuovo codice tra ${retryAfterSec} secondi.`,
  }
}

function generateOtpCode(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0] % 900000))
}

// ─── Send / resend OTP ────────────────────────────────────────────────────────

export async function sendEmailVerificationOtp(
  email: string,
  deps: SendEmailVerificationOtpDeps = {}
): Promise<SendEmailVerificationResult> {
  const normalizedEmail = normalizeVerificationEmail(email)
  const db = deps.db ?? createAdminClient()
  const now = deps.now?.() ?? new Date()
  const sendEmail = deps.sendEmail ?? sendVerificationCodeEmail

  // Fail closed: pepper must exist before any OTP operation
  let pepper: string
  try {
    pepper = getPepper()
  } catch {
    console.error('[sendEmailVerificationOTP] missing OTP pepper — refusing to send')
    return { success: false, error: 'Errore interno. Riprova.', statusCode: 500 }
  }

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('id, email_verified')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (profileErr) {
    console.error('[sendEmailVerificationOTP] profile lookup error:', profileErr.message)
    return { success: false, error: 'Errore interno. Riprova.', statusCode: 500 }
  }

  if (!profile || profile.email_verified) {
    return { success: true, statusCode: 200, skipped: true }
  }

  // ─── Cooldown check ────────────────────────────────────────────────────────
  // Note: only `last_sent_at` and `expires_at` are read — the hash is never
  // retrieved here, so there is no path to recover or resend the old code.
  const { data: latestToken, error: latestTokenErr } = await db
    .from('email_verification_tokens')
    .select('id, expires_at, used, last_sent_at')
    .eq('email', normalizedEmail)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestTokenErr) {
    console.error('[sendEmailVerificationOTP] token lookup error:', latestTokenErr.message)
    return { success: false, error: 'Errore interno. Riprova.', statusCode: 500 }
  }

  const latestExpiryMs = latestToken?.expires_at
    ? new Date(latestToken.expires_at).getTime()
    : Number.NaN
  const hasActiveToken =
    !!latestToken &&
    latestToken.used === false &&
    Number.isFinite(latestExpiryMs) &&
    latestExpiryMs > now.getTime()

  if (hasActiveToken) {
    const lastSentMs = new Date(latestToken.last_sent_at).getTime()
    const elapsedMs = Number.isFinite(lastSentMs)
      ? now.getTime() - lastSentMs
      : EMAIL_VERIFICATION_SEND_COOLDOWN_MS

    if (elapsedMs < EMAIL_VERIFICATION_SEND_COOLDOWN_MS) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((EMAIL_VERIFICATION_SEND_COOLDOWN_MS - elapsedMs) / 1000)
      )
      return buildCooldownError(retryAfterSec)
    }
  }

  // ─── Generate new OTP ──────────────────────────────────────────────────────
  // Plaintext code exists only in memory and in the email body.
  // Only the HMAC-SHA-256 hash is persisted to the database.
  const code = generateOtpCode()
  const normalizedCode = normalizeVerificationCode(code)
  const codeHash = hashOtp(normalizedCode, pepper)
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_CODE_TTL_MS)

  // Atomic: invalidate previous unused tokens + insert new one in one transaction
  const { data: newTokenId, error: rpcErr } = await db.rpc('create_email_verification_otp', {
    p_email: normalizedEmail,
    p_code_hash: codeHash,
    p_expires_at: expiresAt.toISOString(),
    p_now: now.toISOString(),
  })

  if (rpcErr) {
    console.error('[sendEmailVerificationOTP] RPC error:', rpcErr.message)
    return { success: false, error: 'Errore interno. Riprova.', statusCode: 500 }
  }

  const emailResult = await sendEmail({ email: normalizedEmail, code: normalizedCode })
  if (!emailResult.success) {
    if (newTokenId) {
      const { error: rollbackErr } = await db
        .from('email_verification_tokens')
        .update({ used: true })
        .eq('id', newTokenId as string)

      if (rollbackErr) {
        console.error('[sendEmailVerificationOTP] rollback error:', rollbackErr.message)
      }
    }

    return {
      success: false,
      error: "Errore nell'invio dell'email. Riprova.",
      statusCode: 500,
    }
  }

  return { success: true, statusCode: 200 }
}

export function mapEmailVerificationSendError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('troppe richieste') || normalized.includes('riprova tra')) {
    return message
  }

  return 'Errore interno. Riprova.'
}
