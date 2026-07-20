'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import {
  clearAdminShadowCookie,
  parseAdminShadowCookieValue,
  setAdminShadowCookie,
} from '@/lib/admin-shadow-cookie'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { IMPERSONATE_COOKIE } from '@/lib/tenant-context'
import type { Json, TablesUpdate } from '@/types'

import { bumpAdmin, requireSuperadmin, type ActionResult } from './actions'

async function logAdminAction(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  tenantId: string | null = null,
  details: Record<string, unknown> = {}
) {
  try {
    const db = createAdminClient()
    await db.from('admin_audit_log').insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      tenant_id: tenantId,
      details: details as unknown as Json,
    })
  } catch {
    // best-effort
  }
}

// =====================================================
// TENANTS
// =====================================================

export interface TenantInput {
  business_name: string
  slug: string
  timezone?: string
  status?: string
  primary_color?: string | null
  secondary_color?: string | null
  logo_url?: string | null
  font_family?: string | null
  settings?: Record<string, unknown> | null
}

export async function createTenant(input: TenantInput): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('tenants').insert({
    business_name: input.business_name,
    slug: input.slug,
    timezone: input.timezone || 'Europe/Rome',
    status: input.status || 'active',
    primary_color: input.primary_color ?? null,
    secondary_color: input.secondary_color ?? null,
    logo_url: input.logo_url ?? null,
    font_family: input.font_family ?? null,
    settings: (input.settings ?? {}) as never,
  })
  if (error) return { success: false, error: error.message }
  bumpAdmin()
  return { success: true }
}

export async function updateTenant(id: string, input: Partial<TenantInput>): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const payload: TablesUpdate<'tenants'> = {}
  if (input.business_name !== undefined) payload.business_name = input.business_name
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.timezone !== undefined) payload.timezone = input.timezone
  if (input.status !== undefined) payload.status = input.status
  if (input.primary_color !== undefined) payload.primary_color = input.primary_color
  if (input.secondary_color !== undefined) payload.secondary_color = input.secondary_color
  if (input.logo_url !== undefined) payload.logo_url = input.logo_url
  if (input.font_family !== undefined) payload.font_family = input.font_family
  if (input.settings !== undefined) payload.settings = (input.settings ?? {}) as unknown as Json
  const { error } = await db.from('tenants').update(payload).eq('id', id)
  if (error) return { success: false, error: error.message }
  bumpAdmin()
  return { success: true }
}

export async function toggleTenantStatus(id: string, status: string): Promise<ActionResult> {
  return updateTenant(id, { status })
}

export async function deleteTenant(id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('tenants').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  bumpAdmin()
  return { success: true }
}

// =====================================================
// TENANT EXTENDED OPS
// =====================================================

export async function softDeleteTenant(id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('tenants').update({ status: 'suspended' }).eq('id', id)
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'tenant.suspended', 'tenant', id, id)
  revalidatePath('/admin/tenants')
  return { success: true }
}

export async function exportTenantData(
  id: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const [tenant, services, staff, locations, hours, clients, appointments, subscription] =
    await Promise.all([
      db.from('tenants').select('*').eq('id', id).maybeSingle(),
      db.from('services').select('*').eq('tenant_id', id),
      db.from('staff_members').select('*').eq('tenant_id', id),
      db.from('locations').select('*').eq('tenant_id', id),
      db.from('working_hours').select('*').eq('tenant_id', id),
      db.from('clients').select('*').eq('tenant_id', id),
      db.from('appointments').select('*').eq('tenant_id', id),
      db.from('tenant_subscriptions').select('*').eq('tenant_id', id),
    ])

  await logAdminAction(auth.id, 'tenant.exported', 'tenant', id, id)

  return {
    success: true,
    data: {
      exported_at: new Date().toISOString(),
      tenant: tenant.data,
      services: services.data ?? [],
      staff: staff.data ?? [],
      locations: locations.data ?? [],
      working_hours: hours.data ?? [],
      clients: clients.data ?? [],
      appointments: appointments.data ?? [],
      subscriptions: subscription.data ?? [],
    },
  }
}

export interface TenantSubscriptionInput {
  plan_id: string | null
  status?: string
  starts_at?: string | null
  ends_at?: string | null
}

export async function updateTenantSubscription(
  tenantId: string,
  input: TenantSubscriptionInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const { data: existing } = await db
    .from('tenant_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await db
      .from('tenant_subscriptions')
      .update({
        plan_id: input.plan_id ?? undefined,
        status: input.status ?? 'active',
        current_period_start: input.starts_at ?? undefined,
        current_period_end: input.ends_at ?? undefined,
      })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('tenant_subscriptions').insert({
      tenant_id: tenantId,
      plan_id: input.plan_id as string,
      status: input.status ?? 'active',
      current_period_start: input.starts_at ?? new Date().toISOString(),
      current_period_end: input.ends_at ?? undefined,
    })
    if (error) return { success: false, error: error.message }
  }

  await logAdminAction(auth.id, 'tenant.subscription_updated', 'tenant', tenantId, tenantId, {
    plan_id: input.plan_id,
  })
  revalidatePath(`/admin/tenants/${tenantId}`)
  return { success: true }
}

// =====================================================
// TENANT IMPERSONATION (SHADOW MODE)
// =====================================================

export async function startTenantImpersonation(
  tenantId: string,
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()
  const { data: t } = await db
    .from('tenants')
    .select('id, business_name')
    .eq('id', tenantId)
    .maybeSingle()
  if (!t) return { success: false, error: 'Tenant non trovato.' }

  const { count: activeStaff } = await db
    .from('staff_members')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if ((activeStaff ?? 0) === 0) {
    return {
      success: false,
      error: 'Tenant senza proprietario. Assegna prima un owner.',
    }
  }

  const cookieStore = await cookies()
  setAdminShadowCookie(cookieStore, tenantId, auth.id)

  await logAdminAction(auth.id, 'tenant.impersonation_started', 'tenant', tenantId, tenantId, {
    business_name: t.business_name,
  })
  return { success: true }
}

export async function stopTenantImpersonation(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione non valida.' }

  const cookieStore = await cookies()
  const previous = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null
  clearAdminShadowCookie(cookieStore)

  const previousTenantId = parseAdminShadowCookieValue(previous)?.tenantId ?? null
  if (previousTenantId) {
    await logAdminAction(
      user.id,
      'tenant.impersonation_stopped',
      'tenant',
      previousTenantId,
      previousTenantId,
    )
  }
  return { success: true }
}

// =====================================================
// GLOBAL OVERVIEW (revenue, appts, top tenants)
// =====================================================

export interface TopTenantRow {
  id: string
  business_name: string
  logo_url: string | null
  primary_color: string | null
  total_revenue: number
  appointments_30d: number
}

export interface AdminGlobalOverview {
  total_revenue: number
  active_tenants: number
  appointments_30d: number
  top_tenants: TopTenantRow[]
}

export async function getAdminGlobalOverview(): Promise<{
  success: boolean
  data?: AdminGlobalOverview
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [paymentsRes, activeRes, appts30Res, tenantsRes] = await Promise.all([
    db
      .from('payments')
      .select('tenant_id, amount, status')
      .in('status', ['paid', 'completed']),
    db.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db
      .from('appointments')
      .select('id, tenant_id, start_time')
      .gte('start_time', d30),
    db.from('tenants').select('id, business_name, logo_url, primary_color'),
  ])

  const payments = (paymentsRes.data ?? []) as Array<{
    tenant_id: string
    amount: number | null
  }>
  const apptsRows = (appts30Res.data ?? []) as Array<{ tenant_id: string }>
  const tenants = (tenantsRes.data ?? []) as Array<{
    id: string
    business_name: string
    logo_url: string | null
    primary_color: string | null
  }>

  const revenueByTenant = new Map<string, number>()
  let totalRevenue = 0
  for (const p of payments) {
    const amt = Number(p.amount ?? 0)
    totalRevenue += amt
    revenueByTenant.set(p.tenant_id, (revenueByTenant.get(p.tenant_id) ?? 0) + amt)
  }

  const apptsByTenant = new Map<string, number>()
  for (const a of apptsRows) {
    apptsByTenant.set(a.tenant_id, (apptsByTenant.get(a.tenant_id) ?? 0) + 1)
  }

  const tenantById = new Map(tenants.map((t) => [t.id, t]))
  const top: TopTenantRow[] = Array.from(revenueByTenant.entries())
    .map(([tenantId, rev]) => {
      const t = tenantById.get(tenantId)
      return {
        id: tenantId,
        business_name: t?.business_name ?? '—',
        logo_url: t?.logo_url ?? null,
        primary_color: t?.primary_color ?? null,
        total_revenue: rev,
        appointments_30d: apptsByTenant.get(tenantId) ?? 0,
      }
    })
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 5)

  return {
    success: true,
    data: {
      total_revenue: totalRevenue,
      active_tenants: activeRes.count ?? 0,
      appointments_30d: apptsRows.length,
      top_tenants: top,
    },
  }
}

// =====================================================
// ORPHAN TENANTS MAINTENANCE
// =====================================================

/**
 * Assigns the current superadmin as `owner` of the given tenant,
 * but ONLY if the tenant has no active staff members (orphan).
 */
export async function assignTenantOwnerToMe(
  tenantId: string,
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const { count: activeCount } = await db
    .from('staff_members')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if ((activeCount ?? 0) > 0) {
    return {
      success: false,
      error: 'Il tenant ha già almeno uno staff member attivo.',
    }
  }

  const { data: existing } = await db
    .from('staff_members')
    .select('id, is_active')
    .eq('tenant_id', tenantId)
    .eq('profile_id', auth.id)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await db
      .from('staff_members')
      .update({ role: 'owner', is_active: true })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('staff_members').insert({
      tenant_id: tenantId,
      profile_id: auth.id,
      role: 'owner',
      is_active: true,
    })
    if (error) return { success: false, error: error.message }
  }

  await logAdminAction(auth.id, 'tenant.owner_self_assigned', 'tenant', tenantId, tenantId)
  revalidatePath('/admin/tenants')
  revalidatePath(`/admin/tenants/${tenantId}`)
  return { success: true }
}

/**
 * Assigns an existing user (by email) as the `owner` of a tenant.
 *
 * Behavior:
 * - If the tenant is orphan (no active staff), simply attach the user as owner.
 * - If the tenant already has active owners, demote them to `manager` and
 *   promote the new user to owner. This is the "Cambia proprietario" flow.
 *
 * Returns a specific, user-facing error if the email is not registered.
 */
export async function assignTenantOwnerByEmail(
  tenantId: string,
  email: string,
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return { success: false, error: 'Email mancante.' }
  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('id, email')
    .eq('email', trimmed)
    .maybeSingle()
  if (!profile?.id) {
    return {
      success: false,
      error: 'Utente non trovato. Invitalo prima nella sezione Utenti.',
    }
  }

  // Detect existing active owners to know whether this is an assignment or a change.
  const { data: currentOwners } = await db
    .from('staff_members')
    .select('id, profile_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .eq('is_active', true)

  const previousOwners = (currentOwners ?? []) as Array<{
    id: string
    profile_id: string
  }>
  const isChange = previousOwners.some((o) => o.profile_id !== profile.id)

  // Demote any existing owner that is not the new one.
  for (const o of previousOwners) {
    if (o.profile_id === profile.id) continue
    const { error } = await db
      .from('staff_members')
      .update({ role: 'manager' })
      .eq('id', o.id)
    if (error) return { success: false, error: error.message }
  }

  // Upsert the new owner row.
  const { data: existing } = await db
    .from('staff_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await db
      .from('staff_members')
      .update({ role: 'owner', is_active: true })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('staff_members').insert({
      tenant_id: tenantId,
      profile_id: profile.id,
      role: 'owner',
      is_active: true,
    })
    if (error) return { success: false, error: error.message }
  }

  await logAdminAction(
    auth.id,
    isChange ? 'tenant.owner_changed' : 'tenant.owner_assigned_by_email',
    'tenant',
    tenantId,
    tenantId,
    { email: trimmed },
  )
  revalidatePath('/admin/tenants')
  revalidatePath(`/admin/tenants/${tenantId}`)
  return { success: true }
}

/**
 * Returns the current active owner of a tenant (full_name + email + avatar).
 */
export async function getTenantOwnerInfo(tenantId: string): Promise<{
  success: boolean
  data?: {
    profileId: string
    fullName: string | null
    email: string | null
    avatarUrl: string | null
  } | null
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('staff_members')
    .select('profile_id, profile:profiles(id, full_name, email, avatar_url)')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!data) return { success: true, data: null }
  const p = (Array.isArray(data.profile) ? data.profile[0] : data.profile) as
    | { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
    | null
  return {
    success: true,
    data: p
      ? {
          profileId: p.id,
          fullName: p.full_name,
          email: p.email,
          avatarUrl: p.avatar_url,
        }
      : null,
  }
}
