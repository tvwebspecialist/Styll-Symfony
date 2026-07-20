'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendEmailVerificationOtp,
  getPepper,
  hashOtp,
  normalizeVerificationCode,
  normalizeVerificationEmail,
  otpHashesEqual,
} from '@/lib/email-verification'
import { checkRateLimit } from '@/lib/rate-limit'
import type { TablesUpdate } from '@/types'

// ─── Send (or re-send) a verification code ───────────────────────────────────

export async function sendEmailVerificationOTP(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  return sendEmailVerificationOtp(email)
}

// ─── Resend with 60-second server-side rate limit ────────────────────────────

export async function resendEmailOTP(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const key = normalizeVerificationEmail(email)

  const cooldown = checkRateLimit(`resend-otp:cooldown:${key}`, 1, 60_000)
  if (!cooldown.allowed) {
    return { success: false, error: `Attendi ${cooldown.retryAfterSec}s prima di reinviare.` }
  }

  const quota = checkRateLimit(`resend-otp:quota:${key}`, 3, 60 * 60_000)
  if (!quota.allowed) {
    return { success: false, error: 'Limite raggiunto. Riprova tra un\'ora.' }
  }

  return sendEmailVerificationOtp(email)
}

interface VerifyEmailOtpDeps {
  db?: ReturnType<typeof createAdminClient>
  now?: () => Date
}

// ─── Validate the code the user entered ──────────────────────────────────────

export async function verifyEmailOTP(
  email: string,
  code: string,
  deps: VerifyEmailOtpDeps = {},
): Promise<{ success: boolean; error?: string }> {
  const db = deps.db ?? createAdminClient()
  const now = deps.now?.() ?? new Date()
  const normalizedEmail = normalizeVerificationEmail(email)
  const normalizedCode = normalizeVerificationCode(code)

  let pepper: string
  try {
    pepper = getPepper()
  } catch {
    console.error('[verifyEmailOTP] missing OTP pepper')
    return { success: false, error: 'Errore interno. Riprova.' }
  }

  const { data: token, error: tokenError } = await db
    .from('email_verification_tokens')
    .select('id, code_hash, expires_at, used, attempts, locked_until')
    .eq('email', normalizedEmail)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (tokenError) {
    console.error('[verifyEmailOTP] token lookup error:', tokenError.message)
    return { success: false, error: 'Errore interno. Riprova.' }
  }

  if (!token) {
    return { success: false, error: 'Codice non trovato. Richiedi un nuovo codice.' }
  }

  // Lockout check
  if (token.locked_until && new Date(token.locked_until) > now) {
    const minutes = Math.ceil(
      (new Date(token.locked_until).getTime() - now.getTime()) / 60_000,
    )
    return {
      success: false,
      error: `Troppi tentativi. Riprova tra ${minutes} minut${minutes === 1 ? 'o' : 'i'}.`,
    }
  }

  // Expiry check
  if (new Date(token.expires_at) < now) {
    return { success: false, error: 'Codice scaduto. Richiedi un nuovo codice.' }
  }

  // Timing-safe hash comparison — plaintext input is never logged or stored
  const inputHash = hashOtp(normalizedCode, pepper)
  if (!otpHashesEqual(token.code_hash, inputHash)) {
    const newAttempts = (token.attempts as number) + 1
    const updates: TablesUpdate<'email_verification_tokens'> = { attempts: newAttempts }
    if (newAttempts >= 5) {
      updates.locked_until = new Date(now.getTime() + 5 * 60_000).toISOString()
    }
    const { error: attemptError } = await db
      .from('email_verification_tokens')
      .update(updates)
      .eq('id', token.id)

    if (attemptError) {
      console.error('[verifyEmailOTP] attempts update error:', attemptError.message)
      return { success: false, error: 'Errore interno. Riprova.' }
    }

    if (newAttempts >= 5) {
      return { success: false, error: 'Troppi tentativi. Riprova tra 5 minuti.' }
    }
    const remaining = 5 - newAttempts
    return {
      success: false,
      error: `Codice non corretto. ${remaining} tentativ${remaining === 1 ? 'o' : 'i'} rimanent${remaining === 1 ? 'e' : 'i'}.`,
    }
  }

  // ✅ Valid — atomically mark token as used.
  // Conditional update (WHERE used = false) prevents double-use even under
  // concurrent requests: the second caller finds 0 rows and gets no data back.
  const { data: consumed, error: consumeError } = await db
    .from('email_verification_tokens')
    .update({ used: true })
    .eq('id', token.id)
    .eq('used', false)
    .select('id')
    .maybeSingle()

  if (consumeError) {
    console.error('[verifyEmailOTP] consume token error:', consumeError.message)
    return { success: false, error: 'Errore interno. Riprova.' }
  }

  if (!consumed) {
    return { success: false, error: 'Codice già utilizzato. Richiedi un nuovo codice.' }
  }

  // Mark profile as verified
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (profileError) {
    console.error('[verifyEmailOTP] profile lookup error:', profileError.message)
    return { success: false, error: 'Errore interno. Riprova.' }
  }

  if (profile?.id) {
    const { error: verifyProfileError } = await db
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', profile.id)

    if (verifyProfileError) {
      console.error('[verifyEmailOTP] profile verify update error:', verifyProfileError.message)
      return { success: false, error: 'Errore interno. Riprova.' }
    }
  }

  return { success: true }
}
