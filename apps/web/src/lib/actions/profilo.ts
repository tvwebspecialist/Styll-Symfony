'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface ProfileData {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  phone: string | null
  bio: string | null
  language: string
  timezone: string
  notificationPreferences: Record<string, boolean>
}

export interface SubscriptionInfo {
  planName: string
  priceMonthly: number
  status: string
  renewalDate: string | null
  features: string[]
  isPro: boolean
}

export interface PortfolioPhoto {
  id: string
  photoUrl: string
  serviceTags: string[]
  isVisible: boolean
  displayOrder: number
  createdAt: string
}

export interface ServiceOption {
  id: string
  name: string
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  return { supabase, user }
}

async function getStaffContext(userId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('staff_members')
    .select('id, tenant_id')
    .eq('profile_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return { staffId: data?.id ?? null, tenantId: data?.tenant_id ?? null }
}

export async function getProfile(userId: string): Promise<ProfileData | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('profiles')
    .select('id, email, full_name, avatar_url, phone, bio, language, timezone, notification_preferences')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    phone: (data as { phone?: string | null }).phone ?? null,
    bio: (data as { bio?: string | null }).bio ?? null,
    language: (data as { language?: string | null }).language ?? 'it',
    timezone: (data as { timezone?: string | null }).timezone ?? 'Europe/Rome',
    notificationPreferences:
      ((data as { notification_preferences?: Record<string, boolean> }).notification_preferences) ?? {},
  }
}

export async function updateProfile(
  userId: string,
  data: {
    fullName?: string
    phone?: string | null
    bio?: string | null
    language?: string
    timezone?: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUser()
    if (user.id !== userId) return { ok: false, error: 'Non autorizzato' }
    const db = createAdminClient()
    const { error } = await db
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: data.phone,
        bio: data.bio,
        language: data.language,
        timezone: data.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireUser()
    if (!user.email) return { ok: false, error: 'Email mancante' }
    // Re-auth con password attuale
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInErr) return { ok: false, error: 'Password attuale non corretta' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function uploadAvatar(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { user } = await requireUser()
    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'File mancante' }
    const db = createAdminClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/avatar-${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await db.storage
      .from('avatars')
      .upload(path, buf, { contentType: file.type, upsert: true })
    if (upErr) return { ok: false, error: upErr.message }
    const { data: pub } = db.storage.from('avatars').getPublicUrl(path)
    const url = pub.publicUrl
    await db.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    return { ok: true, url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function getPortfolio(): Promise<PortfolioPhoto[]> {
  const { user } = await requireUser()
  const { tenantId } = await getStaffContext(user.id)
  if (!tenantId) return []
  const db = createAdminClient()
  const { data } = await db
    .from('portfolio_photos')
    .select('id, photo_url, service_tags, is_visible, display_order, created_at')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
  return (data ?? []).map((p) => ({
    id: p.id,
    photoUrl: p.photo_url,
    serviceTags: p.service_tags ?? [],
    isVisible: p.is_visible,
    displayOrder: p.display_order,
    createdAt: p.created_at,
  }))
}

export async function getServicesForTags(): Promise<ServiceOption[]> {
  const { user } = await requireUser()
  const { tenantId } = await getStaffContext(user.id)
  if (!tenantId) return []
  const db = createAdminClient()
  const { data } = await db
    .from('services')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  return (data ?? []).map((s) => ({ id: s.id, name: s.name }))
}

export async function addPortfolioPhoto(
  formData: FormData,
): Promise<{ ok: true; photo: PortfolioPhoto } | { ok: false; error: string }> {
  try {
    const { user } = await requireUser()
    const { tenantId, staffId } = await getStaffContext(user.id)
    if (!tenantId) return { ok: false, error: 'Tenant non trovato' }
    const file = formData.get('file')
    const tags = (formData.get('tags') as string | null) ?? ''
    const visible = (formData.get('visible') as string | null) === 'true'
    if (!(file instanceof File)) return { ok: false, error: 'File mancante' }

    const db = createAdminClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await db.storage
      .from('portfolio')
      .upload(path, buf, { contentType: file.type, upsert: false })
    if (upErr) return { ok: false, error: upErr.message }
    const { data: pub } = db.storage.from('portfolio').getPublicUrl(path)
    const url = pub.publicUrl

    const tagsArr = tags.split(',').map((t) => t.trim()).filter(Boolean)
    const { data, error } = await db
      .from('portfolio_photos')
      .insert({
        tenant_id: tenantId,
        staff_id: staffId,
        photo_url: url,
        service_tags: tagsArr,
        is_visible: visible,
      })
      .select('id, photo_url, service_tags, is_visible, display_order, created_at')
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? 'Errore' }
    return {
      ok: true,
      photo: {
        id: data.id,
        photoUrl: data.photo_url,
        serviceTags: data.service_tags ?? [],
        isVisible: data.is_visible,
        displayOrder: data.display_order,
        createdAt: data.created_at,
      },
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function deletePortfolioPhoto(
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUser()
    const { tenantId } = await getStaffContext(user.id)
    if (!tenantId) return { ok: false, error: 'Tenant non trovato' }
    const db = createAdminClient()
    const { data: photo } = await db
      .from('portfolio_photos')
      .select('id, photo_url, tenant_id')
      .eq('id', photoId)
      .maybeSingle()
    if (!photo || photo.tenant_id !== tenantId) return { ok: false, error: 'Non trovato' }
    // Estrai path da public URL: /storage/v1/object/public/portfolio/<path>
    const m = photo.photo_url.match(/\/portfolio\/(.+)$/)
    if (m) await db.storage.from('portfolio').remove([m[1]])
    await db.from('portfolio_photos').delete().eq('id', photoId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function togglePhotoVisibility(
  photoId: string,
  visible: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUser()
    const { tenantId } = await getStaffContext(user.id)
    if (!tenantId) return { ok: false, error: 'Tenant non trovato' }
    const db = createAdminClient()
    const { error } = await db
      .from('portfolio_photos')
      .update({ is_visible: visible })
      .eq('id', photoId)
      .eq('tenant_id', tenantId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  // Stub: nessuna tabella di subscription al momento. Ritorniamo lo Starter.
  return {
    planName: 'Starter',
    priceMonthly: 0,
    status: 'attivo',
    renewalDate: null,
    features: [
      'Fino a 20 foto nel portfolio',
      'Gestione appuntamenti illimitata',
      'Notifiche email',
      'Report mensile',
    ],
    isPro: false,
  }
}

export async function updateNotificationPreferences(
  prefs: Record<string, boolean>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUser()
    const db = createAdminClient()
    const { error } = await db
      .from('profiles')
      .update({ notification_preferences: prefs })
      .eq('id', user.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function exportUserData(): Promise<
  { ok: true; data: string } | { ok: false; error: string }
> {
  try {
    const { user } = await requireUser()
    const db = createAdminClient()
    const [profile, appointments, portfolio] = await Promise.all([
      db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      db.from('appointments').select('*').eq('client_profile_id', user.id).limit(500),
      db.from('portfolio_photos').select('*').limit(500),
    ])
    const payload = {
      profile: profile.data,
      appointments: appointments.data ?? [],
      portfolio: portfolio.data ?? [],
      exportedAt: new Date().toISOString(),
    }
    return { ok: true, data: JSON.stringify(payload, null, 2) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export interface ActiveSession {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

export async function getActiveSessions(): Promise<ActiveSession[]> {
  // Supabase non espone una API pubblica per le sessioni.
  // Ritorniamo solo la sessione corrente come placeholder.
  const { user } = await requireUser()
  return [
    {
      id: 'current',
      device: 'Browser corrente',
      location: '—',
      lastActive: new Date().toISOString(),
      current: true,
    },
  ].filter(() => Boolean(user))
}

export async function terminateSession(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireUser()
    await supabase.auth.signOut()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function deleteAccount(
  confirmation: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireUser()
    if (confirmation !== user.email) {
      return { ok: false, error: "Inserisci la tua email per confermare l'eliminazione" }
    }
    const db = createAdminClient()
    // Soft delete: marchiamo onboarding e svuotiamo i dati di base.
    const { error } = await db
      .from('profiles')
      .update({
        full_name: null,
        phone: null,
        bio: null,
        avatar_url: null,
        notification_preferences: {},
      })
      .eq('id', user.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}
