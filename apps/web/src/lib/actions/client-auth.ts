'use server'

import { headers } from 'next/headers'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { TablesInsert, TablesUpdate } from '@/types'

type AuthErrorType = 'already_exists' | 'generic'

type AuthResult<T = { success: true }> =
  | T
  | { success: false; error: string; type?: AuthErrorType }

const EMAIL_FROM = 'Styll <noreply@mail.styll.it>'
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const ERROR_MAP: Record<string, { message: string; type: AuthErrorType }> = {
  'User already registered': {
    message: 'Hai già un account con questa email. Accedi con la tua password.',
    type: 'already_exists',
  },
  'Invalid login credentials': {
    message: 'Email o password non corretti.',
    type: 'generic',
  },
  'Email not confirmed': {
    message: "Controlla la tua email per verificare l'account.",
    type: 'generic',
  },
  'Password should be at least 6 characters': {
    message: 'La password deve essere di almeno 8 caratteri.',
    type: 'generic',
  },
}

function normalizePhoneValue(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0039')) return `+39${digits.slice(4)}`
  if (digits.startsWith('39') && digits.length === 12) return `+${digits}`
  if (digits.length === 10 && !digits.startsWith('39')) return `+39${digits}`
  return `+${digits}`
}

export async function normalizePhone(raw: string): Promise<string> {
  return normalizePhoneValue(raw)
}

function mapAuthError(message: string): { error: string; type: AuthErrorType } {
  const direct = ERROR_MAP[message]
  if (direct) {
    return { error: direct.message, type: direct.type }
  }

  const lowered = message.toLowerCase()
  if (lowered.includes('already') && lowered.includes('registered')) {
    return { error: ERROR_MAP['User already registered'].message, type: 'already_exists' }
  }
  if (lowered.includes('invalid login')) {
    return { error: ERROR_MAP['Invalid login credentials'].message, type: 'generic' }
  }
  if (lowered.includes('email not confirmed')) {
    return { error: ERROR_MAP['Email not confirmed'].message, type: 'generic' }
  }
  if (lowered.includes('password')) {
    return { error: ERROR_MAP['Password should be at least 6 characters'].message, type: 'generic' }
  }
  if (lowered.includes('rate') || lowered.includes('too many')) {
    return { error: 'Troppe richieste. Riprova tra qualche minuto.', type: 'generic' }
  }

  return { error: 'Qualcosa è andato storto. Riprova.', type: 'generic' }
}

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers()

  // origin is sent by browsers on Server Action POST requests.
  // Guard against the literal string "null" that browsers send when the
  // origin is opaque (e.g. file://, data: URIs, or stripped cross-origin).
  const origin = headerStore.get('origin')
  if (origin && origin !== 'null') return origin

  // x-forwarded-host is set by Vercel and nginx reverse-proxies so the
  // downstream app sees the original public hostname instead of the
  // internal one.  x-forwarded-proto carries the original scheme.
  const fwdHost = headerStore.get('x-forwarded-host')
  const fwdProto = headerStore.get('x-forwarded-proto')
  if (fwdHost) {
    const proto = fwdProto?.split(',')[0]?.trim() ?? 'https'
    return `${proto}://${fwdHost.split(',')[0]?.trim()}`
  }

  // Direct Next.js: host header is the hostname (Vercel also sets this to
  // the public hostname for edge/serverless functions).
  const host = headerStore.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  return host ? `${protocol}://${host}` : 'http://localhost:3000'
}

function buildCallbackUrl(baseUrl: string, tenantSlug: string, type: 'signup' | 'recovery'): string {
  const url = new URL(`/tenant/app/${tenantSlug}/auth/callback`, baseUrl)
  url.searchParams.set('type', type)
  return url.toString()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendClientConfirmationEmail(params: {
  email: string
  fullName: string
  confirmationLink: string
}): Promise<AuthResult<{ success: true }>> {
  if (!resend) {
    console.error('[registerClient] Resend not configured - RESEND_API_KEY is missing')
    return { success: false, error: 'Servizio email non configurato.', type: 'generic' }
  }

  const displayName = escapeHtml(params.fullName || params.email.split('@')[0] || 'Cliente')
  const confirmationLink = escapeHtml(params.confirmationLink)
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .card { background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #111; }
    .button { display: inline-block; background-color: #111; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .body-text { font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 24px; }
    .link-note { font-size: 12px; color: #999; margin-top: 16px; }
    .footer { font-size: 12px; color: #999; margin-top: 32px; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Styll</div>
      <p class="body-text">Ciao ${displayName},</p>
      <p class="body-text">conferma il tuo indirizzo email per completare la registrazione al portale clienti Styll.</p>
      <a href="${confirmationLink}" class="button">Conferma email</a>
      <p class="link-note">
        Oppure copia e incolla questo link nel tuo browser:<br>
        <code>${confirmationLink}</code>
      </p>
      <div class="footer">
        <p>© 2025 Styll. Tutti i diritti riservati.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `
  const text = `
Ciao ${params.fullName || params.email.split('@')[0] || 'Cliente'},

conferma il tuo indirizzo email per completare la registrazione al portale clienti Styll:

${params.confirmationLink}

© 2025 Styll
  `

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.email,
      subject: 'Conferma il tuo account Styll',
      html,
      text,
    })

    if (result.error) {
      console.error('[registerClient] Resend API error:', result.error)
      return { success: false, error: "Account creato, ma non siamo riusciti a inviare l'email di conferma.", type: 'generic' }
    }
  } catch (error) {
    console.error('[registerClient] Resend exception:', error)
    return { success: false, error: "Account creato, ma non siamo riusciti a inviare l'email di conferma.", type: 'generic' }
  }

  return { success: true }
}

function computeTier(totalPoints: number): string {
  if (totalPoints >= 1000) return 'Gold'
  if (totalPoints >= 500) return 'Silver'
  return 'Bronze'
}

async function upsertProfile(params: {
  profileId: string
  email: string
  phone: string
  fullName: string
}) {
  const db = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await db.from('profiles').upsert({
    id: params.profileId,
    email: params.email || null,
    phone: params.phone || null,
    full_name: params.fullName || null,
    user_type: 'client',
    updated_at: now,
  })

  if (error) {
    throw new Error('Unable to update client profile')
  }
}

export async function registerClient(params: {
  tenantId: string
  email: string
  password: string
  fullName: string
  phone: string
  tenantSlug: string
  marketingConsent?: boolean
}): Promise<AuthResult<{ success: true }>> {
  const email = params.email.trim().toLowerCase()
  const fullName = params.fullName.trim()
  const phone = normalizePhoneValue(params.phone)

  if (!email || !fullName || !phone || params.password.length < 8) {
    return { success: false, error: 'Controlla i dati inseriti e riprova.', type: 'generic' }
  }

  const pwaDomain = (process.env.NEXT_PUBLIC_PWA_BASE_DOMAIN ?? 'styll.it').trim()

  const metadata = {
    full_name: fullName,
    phone,
    tenant_id: params.tenantId,
    tenant_slug: params.tenantSlug,
    marketing_consent: Boolean(params.marketingConsent),
  }
  const redirectTo = `https://${params.tenantSlug}-app.${pwaDomain}/accesso`
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password: params.password,
    options: {
      data: metadata,
      redirectTo,
    },
  })

  if (error) {
    console.error('[registerClient] Supabase generateLink error:', error)
    const mapped = mapAuthError(error.message)
    return { success: false, error: mapped.error, type: mapped.type }
  }

  const confirmationLink = data.properties?.action_link
  if (!data.user || !confirmationLink) {
    console.error('[registerClient] Supabase generateLink returned no user or action link')
    return { success: false, error: "Non siamo riusciti a generare l'email di conferma.", type: 'generic' }
  }

  try {
    await upsertProfile({ profileId: data.user.id, email, phone, fullName })
  } catch {
    return { success: false, error: 'Account creato, ma profilo non aggiornato. Contatta il salone.', type: 'generic' }
  }

  const emailResult = await sendClientConfirmationEmail({ email, fullName, confirmationLink })
  if (!emailResult.success) {
    return emailResult
  }

  return { success: true }
}

export async function loginClient(params: {
  email: string
  password: string
  tenantId?: string
}): Promise<AuthResult<{ success: true }>> {
  const email = params.email.trim().toLowerCase()
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: params.password,
  })

  if (error) {
    const mapped = mapAuthError(error.message)
    return { success: false, error: mapped.error, type: mapped.type }
  }

  if (params.tenantId && data.user) {
    const metadata = data.user.user_metadata ?? {}
    try {
      await mergeClientProfile({
        tenantId: params.tenantId,
        profileId: data.user.id,
        email: data.user.email ?? email,
        phone: typeof metadata.phone === 'string' ? metadata.phone : '',
        fullName: typeof metadata.full_name === 'string' ? metadata.full_name : '',
        marketingConsent: Boolean(metadata.marketing_consent),
      })
    } catch {
      return { success: false, error: 'Accesso riuscito, ma profilo cliente non collegato.', type: 'generic' }
    }
  }

  return { success: true }
}

export async function requestPasswordReset(params: {
  email: string
  tenantSlug: string
}): Promise<AuthResult<{ success: true }>> {
  const supabase = await createServerClient()
  const baseUrl = await getBaseUrl()
  const { error } = await supabase.auth.resetPasswordForEmail(params.email.trim().toLowerCase(), {
    redirectTo: buildCallbackUrl(baseUrl, params.tenantSlug, 'recovery'),
  })

  if (error) {
    const mapped = mapAuthError(error.message)
    return { success: false, error: mapped.error, type: mapped.type }
  }

  return { success: true }
}

export async function resendVerificationEmail(params: {
  email: string
  tenantSlug: string
}): Promise<AuthResult<{ success: true }>> {
  const supabase = await createServerClient()
  const baseUrl = await getBaseUrl()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: params.email.trim().toLowerCase(),
    options: {
      emailRedirectTo: buildCallbackUrl(baseUrl, params.tenantSlug, 'signup'),
    },
  })

  if (error) {
    const mapped = mapAuthError(error.message)
    return { success: false, error: mapped.error, type: mapped.type }
  }

  return { success: true }
}

export async function logoutClient(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
}

export async function mergeClientProfile(params: {
  tenantId: string
  profileId: string
  email: string
  phone: string
  fullName: string
  marketingConsent?: boolean
}): Promise<void> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  const email = params.email.trim().toLowerCase()
  const phone = normalizePhoneValue(params.phone)
  const fullName = params.fullName.trim() || email.split('@')[0] || 'Cliente'

  await upsertProfile({
    profileId: params.profileId,
    email,
    phone,
    fullName,
  })

  const alreadyLinked = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('profile_id', params.profileId)
    .is('deleted_at', null)
    .maybeSingle()

  if (alreadyLinked.error) {
    throw new Error('Unable to find linked client')
  }

  if (alreadyLinked.data) return

  if (email) {
    const byEmail = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', params.tenantId)
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle()

    if (byEmail.error) {
      throw new Error('Unable to find client by email')
    }

    if (byEmail.data) {
      const updatePayload: TablesUpdate<'clients'> = {
        profile_id: params.profileId,
        updated_at: now,
      }
      if (phone) updatePayload.phone = phone
      if (fullName) updatePayload.full_name = fullName
      const { error } = await db.from('clients').update(updatePayload).eq('id', byEmail.data.id)
      if (error) {
        throw new Error('Unable to link client by email')
      }
      return
    }
  }

  if (phone) {
    const byPhone = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', params.tenantId)
      .eq('phone', phone)
      .is('deleted_at', null)
      .maybeSingle()

    if (byPhone.error) {
      throw new Error('Unable to find client by phone')
    }

    if (byPhone.data) {
      const { error } = await db
        .from('clients')
        .update({
          profile_id: params.profileId,
          email: email || null,
          full_name: fullName,
          updated_at: now,
        })
        .eq('id', byPhone.data.id)
      if (error) {
        throw new Error('Unable to link client by phone')
      }
      return
    }
  }

  if (!phone) {
    throw new Error('Missing phone for client profile merge')
  }

  const insertPayload: TablesInsert<'clients'> = {
    tenant_id: params.tenantId,
    profile_id: params.profileId,
    full_name: fullName,
    phone,
    email: email || null,
    marketing_consent: Boolean(params.marketingConsent),
    tags: [],
    created_at: now,
    updated_at: now,
  }

  const { error: insertError } = await db.from('clients').insert(insertPayload)
  if (insertError) {
    throw new Error('Unable to create client profile')
  }
}

export async function getMyClientRecord(tenantId: string): Promise<{
  id: string
  fullName: string
  email: string | null
  phone: string | null
  points: number
  streak: number
  tier: string
} | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const db = createAdminClient()
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return null

  const { data: loyalty } = await db
    .from('client_loyalty')
    .select('available_points, total_points, current_streak')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .maybeSingle()

  const totalPoints = loyalty?.total_points ?? 0

  return {
    id: client.id,
    fullName: client.full_name,
    email: client.email,
    phone: client.phone,
    points: loyalty?.available_points ?? 0,
    streak: loyalty?.current_streak ?? 0,
    tier: computeTier(totalPoints),
  }
}

export async function updateMyClientProfile(params: {
  tenantId: string
  fullName: string
  email: string
  phone: string
}): Promise<AuthResult<{ success: true }>> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Devi accedere per continuare.', type: 'generic' }
  }

  const fullName = params.fullName.trim()
  const email = params.email.trim().toLowerCase()
  const phone = normalizePhoneValue(params.phone)

  if (!fullName || !email || !phone) {
    return { success: false, error: 'Compila tutti i campi obbligatori.', type: 'generic' }
  }

  const db = createAdminClient()
  const now = new Date().toISOString()

  const [{ error: authError }, profileResult, clientResult] = await Promise.all([
    supabase.auth.updateUser({ email }),
    db
      .from('profiles')
      .update({ full_name: fullName, email, phone, updated_at: now })
      .eq('id', user.id),
    db
      .from('clients')
      .update({ full_name: fullName, email, phone, updated_at: now })
      .eq('tenant_id', params.tenantId)
      .eq('profile_id', user.id)
      .is('deleted_at', null),
  ])

  if (authError || profileResult.error || clientResult.error) {
    return { success: false, error: 'Non siamo riusciti ad aggiornare il profilo.', type: 'generic' }
  }

  return { success: true }
}

// ─── CONFIGURAZIONE SUPABASE ───────────────────────────────────────
// Nel dashboard Supabase → Authentication → URL Configuration:
//
// Site URL (production): https://styll.app
//
// Redirect URLs — devono contenere ESATTAMENTE questi pattern
// (il path completo con wildcard è necessario perché Supabase
//  fa il match su URL completa, non solo sul dominio):
//
//   http://localhost:3000/tenant/app/*/auth/callback   ← dev locale
//   https://*-app.styll.it/tenant/app/*/auth/callback ← produzione
//   https://*.ngrok-free.app/tenant/app/*/auth/callback ← ngrok dev
//
// Email clienti:
//   registerClient genera il link con admin.generateLink() usando
//   SUPABASE_SECRET_KEY e invia direttamente via Resend SDK da
//   Styll <noreply@mail.styll.it>, bypassando SMTP Supabase.
//
// Troubleshooting email non arriva:
//   1. Verifica RESEND_API_KEY, SUPABASE_SECRET_KEY e NEXT_PUBLIC_APP_URL
//   2. Resend Dashboard → Logs → verifica che il messaggio sia stato accodato
//   3. Dashboard Supabase → Authentication → Logs → verifica generateLink
//
// Nel proxy (apps/web/src/proxy.ts) il rewrite gestisce già
// che *-app.styll.it/tenant/app/[slug]/* arrivi correttamente.
// ──────────────────────────────────────────────────────────────────
