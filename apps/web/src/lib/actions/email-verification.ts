'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendVerificationCodeEmail } from '@/lib/email'

function generateOtpCode(): string {
  // Cryptographically secure 6-digit code
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0] % 900000))
}

// ─── Send (or re-send) a verification code ───────────────────────────────────

export async function sendEmailVerificationOTP(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient()
  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  // Invalidate any previous unused tokens for this address
  await db
    .from('email_verification_tokens')
    .update({ used: true })
    .eq('email', email)
    .eq('used', false)

  const { error: insertErr } = await db.from('email_verification_tokens').insert({
    email,
    code,
    expires_at: expiresAt.toISOString(),
    last_sent_at: new Date().toISOString(),
  })

  if (insertErr) {
    console.error('[sendEmailVerificationOTP] insert error:', insertErr.message)
    return { success: false, error: 'Errore interno. Riprova.' }
  }

  const emailResult = await sendVerificationCodeEmail({ email, code })
  if (!emailResult.success) {
    return { success: false, error: "Errore nell'invio dell'email. Riprova." }
  }

  return { success: true }
}

// ─── Resend with 60-second server-side rate limit ────────────────────────────

export async function resendEmailOTP(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient()

  const { data: latest } = await db
    .from('email_verification_tokens')
    .select('last_sent_at, used')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest && !latest.used) {
    const secondsSince = (Date.now() - new Date(latest.last_sent_at).getTime()) / 1000
    if (secondsSince < 60) {
      const remaining = Math.ceil(60 - secondsSince)
      return {
        success: false,
        error: `Puoi richiedere un nuovo codice tra ${remaining} secondi.`,
      }
    }
  }

  return sendEmailVerificationOTP(email)
}

// ─── Validate the code the user entered ──────────────────────────────────────

export async function verifyEmailOTP(
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient()
  const now = new Date()

  const { data: token } = await db
    .from('email_verification_tokens')
    .select('*')
    .eq('email', email)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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

  // Code check
  if (token.code !== code.trim()) {
    const newAttempts = (token.attempts as number) + 1
    const updates: Record<string, unknown> = { attempts: newAttempts }
    if (newAttempts >= 5) {
      updates.locked_until = new Date(now.getTime() + 5 * 60_000).toISOString()
    }
    await db.from('email_verification_tokens').update(updates).eq('id', token.id)

    if (newAttempts >= 5) {
      return { success: false, error: 'Troppi tentativi. Riprova tra 5 minuti.' }
    }
    const remaining = 5 - newAttempts
    return {
      success: false,
      error: `Codice non corretto. ${remaining} tentativ${remaining === 1 ? 'o' : 'i'} rimanent${remaining === 1 ? 'e' : 'i'}.`,
    }
  }

  // ✅ Valid — mark token as used
  await db.from('email_verification_tokens').update({ used: true }).eq('id', token.id)

  // Mark profile as verified (look up user by email in profiles table)
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (profile?.id) {
    await db.from('profiles').update({ email_verified: true }).eq('id', profile.id)
  }

  return { success: true }
}
