import { sendVerificationCodeEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

export type SendEmailVerificationResult = {
  success: boolean
  error?: string
}

function generateOtpCode(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0] % 900000))
}

export async function sendEmailVerificationOtp(
  email: string,
): Promise<SendEmailVerificationResult> {
  const db = createAdminClient()
  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

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
