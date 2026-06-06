'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId, resolveActiveProfile } from '@/lib/tenant-context'

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

const SHADOW_BLOCKED_ERROR = 'Azione non disponibile in modalità shadow'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  return { supabase, user }
}

/**
 * Best-effort audit log entry. Never throws — auditing must not block flows.
 */
async function logShadowAction(
  actorId: string,
  action: string,
  tenantId: string | null,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const db = createAdminClient()
    await db.from('admin_audit_log').insert({
      actor_id: actorId,
      action,
      entity_type: 'profile',
      entity_id: null,
      tenant_id: tenantId,
      details,
    })
  } catch {
    /* swallow */
  }
}

/**
 * Resolve the profile id targeted by a profile action, taking shadow mode into
 * account. Returns null when there is no authenticated user.
 */
async function resolveTargetProfile(): Promise<{
  profileId: string
  realUserId: string
  isShadow: boolean
  tenantId: string | null
} | null> {
  const ctx = await resolveActiveProfile()
  if (!ctx) return null
  return {
    profileId: ctx.profileId,
    realUserId: ctx.realUserId,
    isShadow: ctx.isShadow,
    tenantId: ctx.tenantId,
  }
}

async function getStaffContext(profileId: string) {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { staffId: null, tenantId: null }
  const db = createAdminClient()
  const { data } = await db
    .from('staff_members')
    .select('id')
    .eq('profile_id', profileId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return { staffId: data?.id ?? null, tenantId }
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
  _userId: string,
  data: {
    fullName?: string
    phone?: string | null
    bio?: string | null
    language?: string
    timezone?: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }

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
      .eq('id', ctx.profileId)
    if (error) return { ok: false, error: error.message }

    if (ctx.isShadow) {
      await logShadowAction(ctx.realUserId, 'shadow.profile.update', ctx.tenantId, {
        target_profile_id: ctx.profileId,
        changed_fields: Object.keys(data),
      })
    }
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
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    if (ctx.isShadow) {
      await logShadowAction(
        ctx.realUserId,
        'shadow.profile.update_password_blocked',
        ctx.tenantId,
        { target_profile_id: ctx.profileId },
      )
      return { ok: false, error: SHADOW_BLOCKED_ERROR }
    }

    const { supabase, user } = await requireUser()
    if (!user.email) return { ok: false, error: 'Email mancante' }
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
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'File mancante' }

    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: 'Formato non supportato (usa PNG, JPG, WebP o GIF)' }
    if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'File troppo grande (max 2MB)' }

    const db = createAdminClient()
    const extByType: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
    const ext = extByType[file.type] ?? 'jpg'
    const path = `${ctx.profileId}/avatar-${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await db.storage
      .from('avatars')
      .upload(path, buf, { contentType: file.type, upsert: true })
    if (upErr) return { ok: false, error: upErr.message }
    const { data: pub } = db.storage.from('avatars').getPublicUrl(path)
    const url = pub.publicUrl
    await db.from('profiles').update({ avatar_url: url }).eq('id', ctx.profileId)

    if (ctx.isShadow) {
      await logShadowAction(ctx.realUserId, 'shadow.profile.upload_avatar', ctx.tenantId, {
        target_profile_id: ctx.profileId,
      })
    }
    return { ok: true, url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function getPortfolio(): Promise<PortfolioPhoto[]> {
  const ctx = await resolveTargetProfile()
  if (!ctx) return []
  const { tenantId } = await getStaffContext(ctx.profileId)
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
  const ctx = await resolveTargetProfile()
  if (!ctx) return []
  const { tenantId } = await getStaffContext(ctx.profileId)
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
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    const { tenantId, staffId } = await getStaffContext(ctx.profileId)
    if (!tenantId) return { ok: false, error: 'Tenant non trovato' }
    const file = formData.get('file')
    const tags = (formData.get('tags') as string | null) ?? ''
    const visible = (formData.get('visible') as string | null) === 'true'
    if (!(file instanceof File)) return { ok: false, error: 'File mancante' }

    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: 'Formato non supportato (usa PNG, JPG o WebP)' }
    if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'File troppo grande (max 5MB)' }

    const db = createAdminClient()
    const extByType: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
    const ext = extByType[file.type] ?? 'jpg'
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
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    const { tenantId } = await getStaffContext(ctx.profileId)
    if (!tenantId) return { ok: false, error: 'Tenant non trovato' }
    const db = createAdminClient()
    const { data: photo } = await db
      .from('portfolio_photos')
      .select('id, photo_url, tenant_id')
      .eq('id', photoId)
      .maybeSingle()
    if (!photo || photo.tenant_id !== tenantId) return { ok: false, error: 'Non trovato' }
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
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    const { tenantId } = await getStaffContext(ctx.profileId)
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
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    const db = createAdminClient()
    const { error } = await db
      .from('profiles')
      .update({ notification_preferences: prefs })
      .eq('id', ctx.profileId)
    if (error) return { ok: false, error: error.message }

    if (ctx.isShadow) {
      await logShadowAction(
        ctx.realUserId,
        'shadow.profile.update_notification_prefs',
        ctx.tenantId,
        { target_profile_id: ctx.profileId },
      )
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function exportUserData(): Promise<
  { ok: true; data: string } | { ok: false; error: string }
> {
  try {
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    const db = createAdminClient()

    const profileResp = await db.from('profiles').select('*').eq('id', ctx.profileId).maybeSingle()

    // Appointments where the user appears as a client. The link goes
    // appointments.client_id → clients.id → clients.profile_id, so we filter
    // through an inner join in a single query rather than two round-trips.
    const appointmentsResp = await db
      .from('appointments')
      .select('*, clients!inner(id, profile_id)')
      .eq('clients.profile_id', ctx.profileId)
      .limit(500)

    const portfolioQuery = ctx.tenantId
      ? db.from('portfolio_photos').select('*').eq('tenant_id', ctx.tenantId).limit(500)
      : db.from('portfolio_photos').select('*').limit(0)
    const portfolioResp = await portfolioQuery

    const payload = {
      profile: profileResp.data,
      appointments: appointmentsResp.data ?? [],
      portfolio: portfolioResp.data ?? [],
      exportedAt: new Date().toISOString(),
    }

    if (ctx.isShadow) {
      await logShadowAction(ctx.realUserId, 'shadow.profile.export_data', ctx.tenantId, {
        target_profile_id: ctx.profileId,
      })
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
  const ctx = await resolveTargetProfile()
  if (!ctx) return []
  if (ctx.isShadow) {
    await logShadowAction(
      ctx.realUserId,
      'shadow.profile.list_sessions_blocked',
      ctx.tenantId,
      { target_profile_id: ctx.profileId },
    )
    return []
  }
  return [
    {
      id: 'current',
      device: 'Browser corrente',
      location: '—',
      lastActive: new Date().toISOString(),
      current: true,
    },
  ]
}

export async function terminateSession(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    if (ctx.isShadow) {
      await logShadowAction(
        ctx.realUserId,
        'shadow.profile.terminate_session_blocked',
        ctx.tenantId,
        { target_profile_id: ctx.profileId },
      )
      return { ok: false, error: SHADOW_BLOCKED_ERROR }
    }
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
    const ctx = await resolveTargetProfile()
    if (!ctx) return { ok: false, error: 'Non autenticato' }
    if (ctx.isShadow) {
      await logShadowAction(
        ctx.realUserId,
        'shadow.profile.delete_account_blocked',
        ctx.tenantId,
        { target_profile_id: ctx.profileId },
      )
      return { ok: false, error: SHADOW_BLOCKED_ERROR }
    }

    const { user } = await requireUser()
    if (confirmation !== user.email) {
      return { ok: false, error: "Inserisci la tua email per confermare l'eliminazione" }
    }
    const db = createAdminClient()
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
