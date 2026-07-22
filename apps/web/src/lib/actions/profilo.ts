'use server'

import { cookies } from 'next/headers'

import { clearAdminShadowCookie } from '@/lib/admin-shadow-cookie'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildPortfolioStoragePath,
  createPortfolioSignedUrl,
  extractPortfolioStoragePath,
  PORTFOLIO_BUCKET,
} from '@/lib/portfolio-storage'
import { getSymfonyApiBaseUrl } from '@/lib/symfony/api-base-url'
import { buildSymfonyStaffMeHeaders } from '@/lib/symfony/staff-client'
import { getOptionalSymfonyStaffMe, readSymfonyStaffJwt } from '@/lib/symfony/staff-context'
import { clearSymfonyStaffJwtCookieInStore } from '@/lib/symfony/staff-session'
import { getActiveTenantId, IMPERSONATE_STAFF_COOKIE, resolveActiveProfile } from '@/lib/tenant-context'
import type { Json, TablesUpdate } from '@/types'

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

async function requireSymfonyStaffSessionJwt(): Promise<string> {
  const me = await getOptionalSymfonyStaffMe()
  if (!me) {
    throw new Error('Non autenticato')
  }

  const cookieStore = await cookies()
  const jwt = readSymfonyStaffJwt(cookieStore)
  if (!jwt) {
    throw new Error('Sessione staff non disponibile')
  }

  return jwt
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
      details: details as unknown as Json,
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

    const jwt = await requireSymfonyStaffSessionJwt()
    const response = await fetch(`${getSymfonyApiBaseUrl()}/api/me/password`, {
      method: 'POST',
      headers: {
        ...buildSymfonyStaffMeHeaders(jwt),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null
      return {
        ok: false,
        error: payload?.error ?? 'Impossibile aggiornare la password.',
      }
    }

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
  const photos = await Promise.all(
    (data ?? []).map(async (photo) => {
      const signedUrl = await createPortfolioSignedUrl(db, photo.photo_url)
      if (!signedUrl) return null
      return {
        id: photo.id,
        photoUrl: signedUrl,
        serviceTags: photo.service_tags ?? [],
        isVisible: photo.is_visible,
        displayOrder: photo.display_order,
        createdAt: photo.created_at,
      } satisfies PortfolioPhoto
    })
  )

  return photos.filter((photo): photo is PortfolioPhoto => photo !== null)
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
    const path = buildPortfolioStoragePath(tenantId, ext)
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await db.storage
      .from(PORTFOLIO_BUCKET)
      .upload(path, buf, { contentType: file.type, upsert: false })
    if (upErr) return { ok: false, error: upErr.message }
    const signedUrl = await createPortfolioSignedUrl(db, path)
    if (!signedUrl) return { ok: false, error: "Impossibile generare l'anteprima della foto." }

    const tagsArr = tags.split(',').map((t) => t.trim()).filter(Boolean)
    const { data, error } = await db
      .from('portfolio_photos')
      .insert({
        tenant_id: tenantId,
        staff_id: staffId,
        photo_url: path,
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
        photoUrl: signedUrl,
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
    const storagePath = extractPortfolioStoragePath(photo.photo_url)
    if (storagePath) {
      await db.storage.from(PORTFOLIO_BUCKET).remove([storagePath])
    }
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

    const cookieStore = await cookies()
    clearAdminShadowCookie(cookieStore)
    clearSymfonyStaffJwtCookieInStore(cookieStore)
    cookieStore.set(IMPERSONATE_STAFF_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })

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

    const me = await getOptionalSymfonyStaffMe()
    if (!me) return { ok: false, error: 'Non autenticato' }
    if (confirmation !== me.user.email) {
      return { ok: false, error: "Inserisci la tua email per confermare l'eliminazione" }
    }
    const db = createAdminClient()

    // Collect all client IDs linked to this profile (across all tenants)
    const { data: clientRows } = await db
      .from('clients')
      .select('id')
      .eq('profile_id', me.user.id)

    const clientIds = (clientRows ?? []).map((r) => r.id)

    if (clientIds.length > 0) {
      await Promise.all([
        db.from('client_notes').delete().in('client_id', clientIds),
        db.from('client_loyalty').delete().in('client_id', clientIds),
        db.from('client_analytics').delete().in('client_id', clientIds),
        db.from('client_badges').delete().in('client_id', clientIds),
      ])
    }

    await db.from('push_subscriptions').delete().eq('profile_id', me.user.id)

    const { data: avatarFiles } = await db.storage.from('avatars').list(me.user.id)
    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f) => `${me.user.id}/${f.name}`)
      await db.storage.from('avatars').remove(paths)
    }

    // appointments e loyalty_transactions conservati per
    // possibili obblighi fiscali (Art. 2220 c.c.).
    // Il collegamento CRM viene rimosso tramite soft-delete
    // del profilo cliente.
    const { error } = await db
      .from('profiles')
      .update({
        full_name: null,
        phone: null,
        bio: null,
        avatar_url: null,
        notification_preferences: {},
      })
      .eq('id', me.user.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}
