'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Tables, TablesInsert, TablesUpdate } from '@/types'

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
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone: normalizePhoneValue(phone) })

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

  const supabase = await createClient()
  const normalizedPhone = normalizePhoneValue(phone)
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
      marketing_consent: true,
      tags: [],
    }

    const { error: insertError } = await db.from('clients').insert(insertPayload)

    if (insertError) {
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
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  })
  if (error) return { success: false, error: mapEmailAuthError(error.message) }
  return { success: true }
}

export async function startGoogleOAuthPwa(params: {
  tenantSlug: string
  tenantId: string
  returnTo?: string
}): Promise<{ url: string } | { error: string }> {
  'use server'
  const supabase = await createClient()
  const callbackUrl = new URL('https://styll.it/auth/callback')
  callbackUrl.searchParams.set('next', 'pwa')
  callbackUrl.searchParams.set('tenantSlug', params.tenantSlug)
  callbackUrl.searchParams.set('tenantId', params.tenantId)
  if (params.returnTo) callbackUrl.searchParams.set('return_to', params.returnTo)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: { access_type: 'offline', prompt: 'consent' },
      skipBrowserRedirect: true,
    },
  })
  if (error || !data.url) return { error: error?.message ?? 'OAuth error' }
  return { url: data.url }
}

export async function checkEmailExists(email: string): Promise<{ isExisting: boolean }> {
  const db = createAdminClient()
  const { data } = await db
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  return { isExisting: !!data }
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  tenantId: string,
  profileData?: { fullName?: string; phone?: string },
): Promise<{ success: boolean; isNewClient: boolean; error?: string }> {
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

  const supabase = await createClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type: 'email',
  })

  if (error) {
    return { success: false, isNewClient: false, error: mapEmailAuthError(error.message) }
  }

  if (!data.user) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  const userId = data.user.id
  const now = new Date().toISOString()

  // Merge user_type + optional collected profile data in one update
  const profileUpdatePayload: TablesUpdate<'profiles'> = { user_type: 'client', updated_at: now }
  if (profileData?.fullName?.trim()) profileUpdatePayload.full_name = profileData.fullName.trim()
  if (profileData?.phone?.trim()) profileUpdatePayload.phone = normalizePhoneValue(profileData.phone.trim())

  const { error: profileUpdateError } = await db
    .from('profiles')
    .update(profileUpdatePayload)
    .eq('id', userId)

  if (profileUpdateError) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  // Find existing client record: first by profile_id, then by email (unlinked)
  const [byProfileRes, byEmailRes] = await Promise.all([
    db
      .from('clients')
      .select('id, profile_id')
      .eq('tenant_id', tenantId)
      .eq('profile_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    db
      .from('clients')
      .select('id, profile_id')
      .eq('tenant_id', tenantId)
      .eq('email', normalizedEmail)
      .is('profile_id', null)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  if (byProfileRes.error) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  if (byProfileRes.data) {
    return { success: true, isNewClient: false }
  }

  if (byEmailRes.error) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  if (byEmailRes.data) {
    const linkPayload: TablesUpdate<'clients'> = { profile_id: userId, updated_at: now }
    if (profileData?.fullName?.trim()) linkPayload.full_name = profileData.fullName.trim()
    if (profileData?.phone?.trim()) linkPayload.phone = normalizePhoneValue(profileData.phone.trim())

    const { error: linkError } = await db
      .from('clients')
      .update(linkPayload)
      .eq('id', byEmailRes.data.id)
      .eq('tenant_id', tenantId)

    if (linkError) {
      return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
    }

    return { success: true, isNewClient: false }
  }

  // No existing client — fetch profile full_name as fallback and insert
  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  const { error: insertError } = await db.from('clients').insert({
    tenant_id: tenantId,
    profile_id: userId,
    full_name:
      profileData?.fullName?.trim() ||
      (profile?.full_name as string | null | undefined)?.trim() ||
      'Cliente',
    phone: profileData?.phone?.trim() ? normalizePhoneValue(profileData.phone.trim()) : undefined,
    email: normalizedEmail,
    created_at: now,
    updated_at: now,
    marketing_consent: true,
    tags: [],
  })

  if (insertError) {
    return { success: false, isNewClient: false, error: 'Qualcosa è andato storto. Riprova.' }
  }

  return { success: true, isNewClient: true }
}

export async function setupPwaGoogleClient(
  tenantId: string,
): Promise<{ success: boolean; isNewClient: boolean }> {
  const db = createAdminClient()

  const { data: tenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .eq('status', 'active')
    .maybeSingle()
  if (!tenant) return { success: false, isNewClient: false }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, isNewClient: false }

  const userId = user.id
  const now = new Date().toISOString()
  const normalizedEmail = user.email?.toLowerCase() ?? ''

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

  const { error: insertError } = await db.from('clients').insert({
    tenant_id: tenantId,
    profile_id: userId,
    full_name:
      (profile?.full_name as string | null | undefined)?.trim() ||
      (user.user_metadata?.full_name as string | undefined) ||
      'Cliente',
    email: normalizedEmail,
    phone: null as string | null,
    created_at: now,
    updated_at: now,
    marketing_consent: true,
    tags: [],
  })

  if (insertError) {
    console.error('[setupPwaGoogleClient] insert failed:', insertError.message, insertError.details)
    return { success: false, isNewClient: false }
  }

  return { success: true, isNewClient: true }
}
