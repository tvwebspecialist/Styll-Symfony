'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  applyClientConsentEvents,
  buildMarketingConsentEvents,
  extractConsentRequestContext,
  seedClientConsentState,
} from '@/lib/consent-events'
import { CONSENT_ACTOR, CONSENT_CHANNEL, CONSENT_SOURCE } from '@/lib/consent-copy'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import type { Tables, TablesInsert, TablesUpdate } from '@/types'

const RATE_LIMITED_MESSAGE = 'Troppe richieste. Riprova tra qualche minuto.'

/**
 * Best-effort caller IP from proxy headers. Used only as a secondary
 * rate-limit dimension, never for auth decisions.
 */
async function getRequestIp(): Promise<string> {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

async function getConsentRequestContext() {
  return extractConsentRequestContext(await headers())
}

/**
 * Throttles OTP send/verify. NOTE: checkRateLimit is in-memory per serverless
 * instance (see lib/rate-limit.ts), so this curbs — but does not globally
 * guarantee against — SMS-pumping / brute-force. Move to a shared store
 * (Redis/Upstash) for a hard guarantee.
 */
async function checkOtpRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const byId = checkRateLimit(`otp:${scope}:${identifier}`, limit, windowMs)
  if (!byId.allowed) return false
  const ip = await getRequestIp()
  // A single IP cycling many identifiers is capped separately and higher.
  const byIp = checkRateLimit(`otp:${scope}:ip:${ip}`, limit * 5, windowMs)
  return byIp.allowed
}

type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'avatar_url' | 'email' | 'phone'>
type ClientRow = Pick<
  Tables<'clients'>,
  'id' | 'profile_id' | 'full_name' | 'phone' | 'email' | 'date_of_birth' | 'preferred_contact_channel'
>

function normalizePhoneValue(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('0039')) {
    return `+39${digits.slice(4)}`
  }

  if (digits.startsWith('39') && digits.length === 12) {
    return `+${digits}`
  }

  return `+39${digits}`
}

export async function normalizePhone(phone: string): Promise<string> {
  return normalizePhoneValue(phone)
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid') && m.includes('otp')) return 'Codice non valido. Controlla il messaggio SMS.'
  if (m.includes('expired')) return 'Il codice è scaduto. Richiedi un nuovo codice.'
  if (m.includes('too many') || m.includes('rate limit')) return 'Troppe richieste. Riprova tra qualche minuto.'
  if (m.includes('phone')) return 'Numero di telefono non valido.'
  return 'Qualcosa è andato storto. Riprova.'
}

export async function sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  const normalizedPhone = normalizePhoneValue(phone)

  // Rate limit BEFORE hitting Supabase/SMS provider — this is the paid path.
  if (!(await checkOtpRateLimit('sms-send', normalizedPhone, 3, 15 * 60 * 1000))) {
    return { success: false, error: RATE_LIMITED_MESSAGE }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone })

  if (error) {
    return { success: false, error: mapAuthError(error.message) }
  }

  return { success: true }
}

export async function verifyOtp(
  phone: string,
  token: string,
  tenantId: string,
): Promise<{ success: boolean; isNewClient: boolean; error?: string }> {
  // Verify tenantId is a real active tenant before creating/linking any client record
  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (!tenant) {
    return { success: false, isNewClient: false, error: 'Salone non valido.' }
  }

  const normalizedPhone = normalizePhoneValue(phone)

  // Throttle code-guessing attempts (6-digit SMS token brute force).
  if (!(await checkOtpRateLimit('sms-verify', normalizedPhone, 6, 10 * 60 * 1000))) {
    return { success: false, isNewClient: false, error: RATE_LIMITED_MESSAGE }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token,
    type: 'sms',
  })

  if (error) {
    return { success: false, isNewClient: false, error: mapAuthError(error.message) }
  }

  if (!data.user) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  const userId = data.user.id
  const now = new Date().toISOString()

  const { error: profileUpdateError } = await db
    .from('profiles')
    .update({ user_type: 'client', updated_at: now })
    .eq('id', userId)
    .neq('user_type', 'client')

  if (profileUpdateError) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  const [profileRes, clientRes] = await Promise.all([
    db.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    db
      .from('clients')
      .select('id, profile_id')
      .eq('tenant_id', tenantId)
      .eq('phone', normalizedPhone)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  const profile = profileRes.data as Pick<Tables<'profiles'>, 'full_name'> | null
  const client = clientRes.data as Pick<Tables<'clients'>, 'id' | 'profile_id'> | null
  const clientError = clientRes.error

  if (clientError) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  let isNewClient = false

  if (client && !client.profile_id) {
    const { error: linkError } = await db
      .from('clients')
      .update({ profile_id: userId, updated_at: now })
      .eq('id', client.id)
      .eq('tenant_id', tenantId)

    if (linkError) {
      return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
    }
  }

  if (!client) {
    const insertPayload: TablesInsert<'clients'> = {
      tenant_id: tenantId,
      profile_id: userId,
      full_name: profile?.full_name?.trim() || 'Cliente',
      phone: normalizedPhone,
      created_at: now,
      updated_at: now,
      marketing_consent: false,
      tags: [],
    }

    const { data: insertedClient, error: insertError } = await db
      .from('clients')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError) {
      return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
    }

    if (!insertedClient?.id) {
      return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
    }

    try {
      const requestContext = await getConsentRequestContext()
      await seedClientConsentState(db, {
        tenantId,
        clientId: insertedClient.id,
        marketingAllowed: false,
        churnAllowed: true,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: userId,
        source: CONSENT_SOURCE.PHONE_OTP_BOOTSTRAP,
        occurredAt: now,
        ipAddress: requestContext.ipAddress ?? null,
        userAgent: requestContext.userAgent ?? null,
        metadata: {
          surface: 'phone_otp_signup',
        },
      })
    } catch {
      await db.from('clients').delete().eq('id', insertedClient.id).eq('tenant_id', tenantId)
      return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
    }

    isNewClient = true
  }

  return { success: true, isNewClient }
}

export type ClientProfile = {
  id: string
  clientId: string | null
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  email: string | null
  dateOfBirth?: string | null
  preferredContactChannel?: string | null
}

export async function getClientProfile(tenantId: string): Promise<ClientProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const db = createAdminClient()
  const [profileRes, clientRes] = await Promise.all([
    db
      .from('profiles')
      .select('full_name, avatar_url, email, phone')
      .eq('id', user.id)
      .maybeSingle(),
    db
      .from('clients')
      .select('id, full_name, phone, email, date_of_birth, preferred_contact_channel')
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  const profile = profileRes.data as ProfileRow | null
  const client = clientRes.data as ClientRow | null

  return {
    id: user.id,
    clientId: client?.id ?? null,
    fullName:
      profile?.full_name ??
      client?.full_name ??
      ((user.user_metadata?.full_name as string | undefined) ?? null),
    phone: profile?.phone ?? client?.phone ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    email: profile?.email ?? client?.email ?? user.email ?? null,
    dateOfBirth: client?.date_of_birth ?? null,
    preferredContactChannel: client?.preferred_contact_channel ?? null,
  }
}

export async function updateClientProfile(
  tenantId: string,
  data: {
    fullName?: string
    email?: string
    dateOfBirth?: string
    preferredContactChannel?: string
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Devi accedere per continuare.' }
  }

  if (data.fullName !== undefined && !data.fullName.trim()) {
    return { success: false, error: 'Il nome completo è obbligatorio.' }
  }

  const db = createAdminClient()
  const now = new Date().toISOString()

  const profileUpdates: TablesUpdate<'profiles'> = { updated_at: now }
  const clientUpdates: TablesUpdate<'clients'> = { updated_at: now }

  if (data.fullName !== undefined) {
    const fullName = data.fullName.trim()
    profileUpdates.full_name = fullName
    clientUpdates.full_name = fullName
  }

  if (data.email !== undefined) {
    const email = data.email.trim() || null
    profileUpdates.email = email
    clientUpdates.email = email
  }

  if (data.dateOfBirth !== undefined) {
    clientUpdates.date_of_birth = data.dateOfBirth || null
  }

  if (data.preferredContactChannel !== undefined) {
    clientUpdates.preferred_contact_channel = data.preferredContactChannel || null
  }

  const needsProfileUpdate = Object.keys(profileUpdates).length > 1
  const needsClientUpdate = Object.keys(clientUpdates).length > 1

  if (needsProfileUpdate) {
    const { error } = await db.from('profiles').update(profileUpdates).eq('id', user.id)
    if (error) {
      return { success: false, error: 'Qualcosa è andato storto. Riprova.' }
    }
  }

  if (needsClientUpdate) {
    const { error } = await db
      .from('clients')
      .update(clientUpdates)
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .is('deleted_at', null)

    if (error) {
      return { success: false, error: 'Qualcosa è andato storto. Riprova.' }
    }
  }

  return { success: true }
}

export async function logoutClient(): Promise<{ success: boolean }> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { success: true }
}

function mapEmailAuthError(message: string): string {
  const m = message.toLowerCase()
  // Supabase returns "Token has expired or is invalid" or "Otp has expired or is invalid"
  // for both wrong codes and expired codes — map both to a single clear message
  if (
    (m.includes('otp') || m.includes('token')) &&
    (m.includes('invalid') || m.includes('expired'))
  ) {
    return 'Codice non valido o scaduto. Richiedi un nuovo codice.'
  }
  if (m.includes('expired')) return 'Il codice è scaduto. Richiedi un nuovo codice.'
  if (m.includes('too many') || m.includes('rate limit')) return 'Troppe richieste. Riprova tra qualche minuto.'
  if (m.includes('email')) return 'Indirizzo email non valido.'
  return 'Qualcosa è andato storto. Riprova.'
}

export async function sendEmailOtp(email: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!(await checkOtpRateLimit('email-send', normalizedEmail, 4, 15 * 60 * 1000))) {
    return { success: false, error: RATE_LIMITED_MESSAGE }
  }

  const { getSymfonyApiBaseUrl } = await import('@/lib/symfony/api-base-url')
  const base = getSymfonyApiBaseUrl()

  try {
    const res = await fetch(`${base}/api/pwa/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null
      return { success: false, error: body?.error ?? 'Errore durante l\'invio del codice.' }
    }
  } catch {
    return { success: false, error: 'Impossibile raggiungere il server. Riprova.' }
  }

  return { success: true }
}

export async function completeEmailOtpProfile(
  _tenantId: string,
  profileData: { fullName: string; phone: string; marketingConsent?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const fullName = profileData.fullName.trim()
  const phone = profileData.phone.trim()

  if (!fullName) {
    return { success: false, error: 'Il nome è obbligatorio.' }
  }
  if (!phone) {
    return { success: false, error: 'Il numero di telefono è obbligatorio.' }
  }

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const jwt = cookieStore.get('styll_symfony_client_jwt')?.value

  if (!jwt) {
    return { success: false, error: 'Sessione non valida. Riprova.' }
  }

  const { getSymfonyApiBaseUrl } = await import('@/lib/symfony/api-base-url')
  const base = getSymfonyApiBaseUrl()

  let res: Response
  try {
    res = await fetch(`${base}/api/pwa/client/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ full_name: fullName, phone }),
    })
  } catch {
    return { success: false, error: 'Impossibile raggiungere il server. Riprova.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null
    return { success: false, error: body?.error ?? 'Qualcosa è andato storto. Riprova.' }
  }

  return { success: true }
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  tenantId: string,
  profileData?: { fullName?: string; phone?: string; marketingConsent?: boolean },
  tenantSlug?: string,
): Promise<{
  success: boolean
  isNewClient: boolean
  error?: string
  /** Symfony client JWT — set in httpOnly cookie by this action. */
  symfonyJwt?: string
}> {
  const normalizedEmail = email.trim().toLowerCase()
  const slug = tenantSlug?.trim() ?? ''

  if (!(await checkOtpRateLimit('email-verify', normalizedEmail, 6, 10 * 60 * 1000))) {
    return { success: false, isNewClient: false, error: RATE_LIMITED_MESSAGE }
  }

  if (!slug) {
    return { success: false, isNewClient: false, error: 'Tenant non specificato.' }
  }

  const { getSymfonyApiBaseUrl } = await import('@/lib/symfony/api-base-url')
  const base = getSymfonyApiBaseUrl()

  let res: Response
  try {
    res = await fetch(`${base}/api/pwa/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        code: token,
        tenant_slug: slug,
        full_name: profileData?.fullName ?? null,
        phone: profileData?.phone ?? null,
      }),
    })
  } catch {
    return { success: false, isNewClient: false, error: 'Impossibile raggiungere il server. Riprova.' }
  }

  const body = await res.json().catch(() => null) as {
    is_new_client?: boolean
    token?: string
    error?: string
  } | null

  if (!res.ok || !body?.token) {
    return {
      success: false,
      isNewClient: false,
      error: body?.error ?? 'Codice non valido o scaduto.',
    }
  }

  // Store Symfony client JWT as httpOnly cookie
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set('styll_symfony_client_jwt', body.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return {
    success: true,
    isNewClient: body.is_new_client ?? false,
    symfonyJwt: body.token,
  }
}

export async function setupPwaGoogleClientForResolvedUser(
  tenantId: string,
  authUser: {
    id: string
    email: string | null
    fullName?: string | null
  },
): Promise<{ success: boolean; isNewClient: boolean; error?: string }> {
  const db = createAdminClient()

  const { data: tenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .eq('status', 'active')
    .maybeSingle()
  if (!tenant) return { success: false, isNewClient: false, error: 'Salone non valido.' }

  const userId = authUser.id
  const now = new Date().toISOString()
  const normalizedEmail = authUser.email?.toLowerCase() ?? ''

  await db
    .from('profiles')
    .update({ user_type: 'client', updated_at: now })
    .eq('id', userId)
    .neq('user_type', 'client')

  const { data: byProfile } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (byProfile) return { success: true, isNewClient: false }

  if (normalizedEmail) {
    const { data: byEmail } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', normalizedEmail)
      .is('profile_id', null)
      .is('deleted_at', null)
      .maybeSingle()

    if (byEmail) {
      await db
        .from('clients')
        .update({ profile_id: userId, updated_at: now })
        .eq('id', byEmail.id)
        .eq('tenant_id', tenantId)
      return { success: true, isNewClient: false }
    }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  const { data: insertedClient, error: insertError } = await db
    .from('clients')
    .insert({
      tenant_id: tenantId,
      profile_id: userId,
      full_name:
        (profile?.full_name as string | null | undefined)?.trim() ||
        authUser.fullName?.trim() ||
        'Cliente',
      email: normalizedEmail,
      phone: null as string | null,
      created_at: now,
      updated_at: now,
      marketing_consent: false,
      tags: [],
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[setupPwaGoogleClient] insert failed:', insertError.message, insertError.details)
    return { success: false, isNewClient: false, error: 'Bootstrap cliente Google non riuscito.' }
  }

  if (!insertedClient?.id) {
    return { success: false, isNewClient: false, error: 'Bootstrap cliente Google non riuscito.' }
  }

  try {
    const requestContext = await getConsentRequestContext()
    await seedClientConsentState(db, {
      tenantId,
      clientId: insertedClient.id,
      marketingAllowed: false,
      churnAllowed: true,
      actor: CONSENT_ACTOR.CLIENT_PROFILE,
      actorProfileId: userId,
      source: CONSENT_SOURCE.GOOGLE_AUTH_BOOTSTRAP,
      occurredAt: now,
      ipAddress: requestContext.ipAddress ?? null,
      userAgent: requestContext.userAgent ?? null,
      metadata: {
        surface: 'google_auth_bootstrap',
      },
    })
  } catch {
    await db.from('clients').delete().eq('id', insertedClient.id).eq('tenant_id', tenantId)
    return { success: false, isNewClient: false, error: 'Bootstrap cliente Google non riuscito.' }
  }

  return { success: true, isNewClient: true }
}

export async function setupPwaGoogleClient(
  tenantId: string,
): Promise<{ success: boolean; isNewClient: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, isNewClient: false, error: 'Sessione non valida.' }
  }

  return setupPwaGoogleClientForResolvedUser(tenantId, {
    id: user.id,
    email: user.email ?? null,
    fullName: typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : null,
  })
}
