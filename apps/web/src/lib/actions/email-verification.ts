'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailVerificationOtp } from '@/lib/email-verification'
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
  return sendEmailVerificationOtp(email)
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
    const updates: TablesUpdate<'email_verification_tokens'> = { attempts: newAttempts }
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
