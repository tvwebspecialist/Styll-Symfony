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

export async function sendEmailVerificationOtp(
  email: string,
  deps: SendEmailVerificationOtpDeps = {}
): Promise<SendEmailVerificationResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const db = deps.db ?? createAdminClient()
  const now = deps.now?.() ?? new Date()
  const sendEmail = deps.sendEmail ?? sendVerificationCodeEmail

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

  const { data: latestToken, error: latestTokenErr } = await db
    .from('email_verification_tokens')
    .select('id, code, expires_at, used, last_sent_at')
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

    const emailResult = await sendEmail({
      email: normalizedEmail,
      code: latestToken.code,
    })
    if (!emailResult.success) {
      return {
        success: false,
        error: "Errore nell'invio dell'email. Riprova.",
        statusCode: 500,
      }
    }

    const { error: refreshTokenErr } = await db
      .from('email_verification_tokens')
      .update({ last_sent_at: now.toISOString() })
      .eq('id', latestToken.id)

    if (refreshTokenErr) {
      console.error('[sendEmailVerificationOTP] token refresh error:', refreshTokenErr.message)
    }

    return { success: true, statusCode: 200 }
  }

  await db
    .from('email_verification_tokens')
    .update({ used: true })
    .eq('email', normalizedEmail)
    .eq('used', false)

  const code = generateOtpCode()
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_CODE_TTL_MS)

  const { data: insertedToken, error: insertErr } = await db
    .from('email_verification_tokens')
    .insert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt.toISOString(),
      last_sent_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[sendEmailVerificationOTP] insert error:', insertErr.message)
    return { success: false, error: 'Errore interno. Riprova.', statusCode: 500 }
  }

  const emailResult = await sendEmail({ email: normalizedEmail, code })
  if (!emailResult.success) {
    if (insertedToken?.id) {
      const { error: rollbackErr } = await db
        .from('email_verification_tokens')
        .update({ used: true })
        .eq('id', insertedToken.id)

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
