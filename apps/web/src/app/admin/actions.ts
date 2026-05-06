'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { IMPERSONATE_COOKIE } from '@/lib/tenant-context'

export interface ActionResult {
  success: boolean
  error?: string
}

async function requireSuperadmin(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessione non valida.' }
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_superadmin) return { error: 'Permessi insufficienti.' }
  return { id: user.id }
}

function bumpAdmin() {
  revalidatePath('/admin', 'layout')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
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
  const payload: Record<string, unknown> = {}
  if (input.business_name !== undefined) payload.business_name = input.business_name
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.timezone !== undefined) payload.timezone = input.timezone
  if (input.status !== undefined) payload.status = input.status
  if (input.primary_color !== undefined) payload.primary_color = input.primary_color
  if (input.secondary_color !== undefined) payload.secondary_color = input.secondary_color
  if (input.logo_url !== undefined) payload.logo_url = input.logo_url
  if (input.font_family !== undefined) payload.font_family = input.font_family
  if (input.settings !== undefined) payload.settings = input.settings ?? {}
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
// PROFILES (USERS)
// =====================================================

export async function updateProfile(
  id: string,
  input: { full_name?: string | null; is_superadmin?: boolean }
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const payload: Record<string, unknown> = {}
  if (input.full_name !== undefined) payload.full_name = input.full_name
  if (input.is_superadmin !== undefined) payload.is_superadmin = input.is_superadmin
  const { error } = await db.from('profiles').update(payload).eq('id', id)
  if (error) return { success: false, error: error.message }
  bumpAdmin()
  return { success: true }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  if (auth.id === id) return { success: false, error: 'Non puoi eliminare te stesso.' }
  const db = createAdminClient()
  const { error } = await db.auth.admin.deleteUser(id)
  if (error) return { success: false, error: error.message }
  bumpAdmin()
  return { success: true }
}

// =====================================================
// SERVICES
// =====================================================

export interface ServiceInput {
  name: string
  description?: string | null
  price: number
  duration_minutes: number
  category?: string | null
  display_order?: number
  is_active?: boolean
}

export async function createService(
  tenantId: string,
  input: ServiceInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('services').insert({
    tenant_id: tenantId,
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    duration_minutes: input.duration_minutes,
    category: input.category ?? null,
    display_order: input.display_order ?? 0,
    is_active: input.is_active ?? true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
}

export async function updateService(
  tenantId: string,
  id: string,
  input: Partial<ServiceInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('services').update(input).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
}

export async function reorderServices(
  tenantId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db
      .from('services')
      .update({ display_order: i })
      .eq('id', orderedIds[i])
      .eq('tenant_id', tenantId)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
}

export async function deleteService(tenantId: string, id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('services').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/services`)
  return { success: true }
}

// =====================================================
// LOCATIONS
// =====================================================

export interface LocationInput {
  name: string
  address?: string | null
  city?: string | null
  zip_code?: string | null
  phone?: string | null
  email?: string | null
  is_active?: boolean
}

export async function createLocation(
  tenantId: string,
  input: LocationInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('locations').insert({
    tenant_id: tenantId,
    name: input.name,
    address: input.address ?? null,
    city: input.city ?? null,
    zip_code: input.zip_code ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    is_active: input.is_active ?? true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/locations`)
  return { success: true }
}

export async function updateLocation(
  tenantId: string,
  id: string,
  input: Partial<LocationInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('locations').update(input).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/locations`)
  return { success: true }
}

export async function deleteLocation(tenantId: string, id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('locations').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/locations`)
  return { success: true }
}

// =====================================================
// STAFF MEMBERS
// =====================================================

export interface StaffInput {
  profile_id: string
  role: string
  bio?: string | null
  photo_url?: string | null
  is_active?: boolean
}

export async function createStaff(tenantId: string, input: StaffInput): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('staff_members').insert({
    tenant_id: tenantId,
    profile_id: input.profile_id,
    role: input.role,
    bio: input.bio ?? null,
    photo_url: input.photo_url ?? null,
    is_active: input.is_active ?? true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/staff`)
  return { success: true }
}

export async function updateStaff(
  tenantId: string,
  id: string,
  input: Partial<StaffInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db
    .from('staff_members')
    .update(input)
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/staff`)
  return { success: true }
}

export async function deleteStaff(tenantId: string, id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db
    .from('staff_members')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/staff`)
  return { success: true }
}

// =====================================================
// WORKING HOURS
// =====================================================

export interface DaySlot {
  day_of_week: number
  is_open: boolean
  start_time: string
  end_time: string
}

export async function setWorkingHours(
  tenantId: string,
  staffId: string,
  days: DaySlot[]
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error: delErr } = await db
    .from('working_hours')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('staff_id', staffId)
  if (delErr) return { success: false, error: delErr.message }

  const rows = days
    .filter((d) => d.is_open)
    .map((d) => ({
      tenant_id: tenantId,
      staff_id: staffId,
      day_of_week: d.day_of_week,
      start_time: d.start_time,
      end_time: d.end_time,
    }))
  if (rows.length > 0) {
    const { error } = await db.from('working_hours').insert(rows)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(`/admin/tenants/${tenantId}/working-hours`)
  return { success: true }
}

// =====================================================
// SUBSCRIPTION PLANS
// =====================================================

export interface SubscriptionPlanInput {
  name: string
  slug: string
  price_monthly: number
  max_locations?: number | null
  max_staff?: number | null
  feature_flags?: Record<string, unknown>
  is_active?: boolean
}

export async function createSubscriptionPlan(
  input: SubscriptionPlanInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('subscription_plans').insert({
    name: input.name,
    slug: input.slug,
    price_monthly: input.price_monthly,
    max_locations: input.max_locations ?? null,
    max_staff: input.max_staff ?? null,
    feature_flags: (input.feature_flags ?? {}) as never,
    is_active: input.is_active ?? true,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/subscription-plans')
  return { success: true }
}

export async function updateSubscriptionPlan(
  id: string,
  input: Partial<SubscriptionPlanInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const payload: Record<string, unknown> = { ...input }
  if (input.feature_flags !== undefined) payload.feature_flags = input.feature_flags ?? {}
  const { error } = await db.from('subscription_plans').update(payload).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/subscription-plans')
  return { success: true }
}

export async function deleteSubscriptionPlan(id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('subscription_plans').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/subscription-plans')
  return { success: true }
}

// =====================================================
// AUDIT LOG
// =====================================================

export interface AuditEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  tenant_id: string | null
  details: Record<string, unknown>
  created_at: string
}

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
      details,
    })
  } catch {
    // best-effort
  }
}

export async function getAuditLog(params: {
  tenantId?: string
  limit?: number
}): Promise<{ success: boolean; data?: AuditEntry[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  let q = db
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 100)
  if (params.tenantId) q = q.eq('tenant_id', params.tenantId)
  const { data, error } = await q
  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []) as AuditEntry[] }
}

// =====================================================
// USER MANAGEMENT (invite / reset / impersonate)
// =====================================================

export async function inviteUser(input: {
  email: string
  fullName?: string | null
  isSuperadmin?: boolean
  tenantId?: string
  role?: string
}): Promise<ActionResult & { userId?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const { data: invited, error } = await db.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName ?? null },
  })
  if (error) return { success: false, error: error.message }
  const userId = invited?.user?.id
  if (!userId) return { success: false, error: 'Utente non creato.' }

  await db
    .from('profiles')
    .upsert({
      id: userId,
      email: input.email,
      full_name: input.fullName ?? null,
      is_superadmin: input.isSuperadmin ?? false,
    })

  if (input.tenantId) {
    await db.from('staff_members').insert({
      tenant_id: input.tenantId,
      profile_id: userId,
      role: input.role ?? 'staff',
      is_active: true,
    })
  }

  await logAdminAction(auth.id, 'user.invited', 'user', userId, input.tenantId ?? null, {
    email: input.email,
    is_superadmin: input.isSuperadmin ?? false,
  })

  revalidatePath('/admin/users')
  return { success: true, userId }
}

export async function resetUserPassword(
  userId: string
): Promise<ActionResult & { tempPassword?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const tempPassword = `Styll-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`
  const { error } = await db.auth.admin.updateUserById(userId, { password: tempPassword })
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'user.password_reset', 'user', userId)
  return { success: true, tempPassword }
}

export async function impersonateUser(
  userId: string
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const { data: membership } = await db
    .from('staff_members')
    .select('tenant_id, tenant:tenants(id, business_name)')
    .eq('profile_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const tenantId = membership?.tenant_id as string | undefined
  if (!tenantId) {
    return {
      success: false,
      error: "L'utente non ha un tenant attivo da impersonare.",
    }
  }

  const tenantRel = (membership?.tenant ?? null) as
    | { id: string; business_name: string }
    | { id: string; business_name: string }[]
    | null
  const tenant = Array.isArray(tenantRel) ? tenantRel[0] : tenantRel

  const cookieDomain =
    process.env.NODE_ENV === 'production'
      ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'}`
      : undefined

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATE_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 4,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

  await logAdminAction(auth.id, 'user.impersonated', 'user', userId, tenantId, {
    business_name: tenant?.business_name ?? null,
  })
  return { success: true }
}

export async function getUserTenants(
  userId: string
): Promise<{
  success: boolean
  data?: Array<{
    staff_id: string
    role: string
    is_active: boolean
    tenant: { id: string; business_name: string; slug: string }
  }>
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('staff_members')
    .select('id, role, is_active, tenant:tenants(id, business_name, slug)')
    .eq('profile_id', userId)
  if (error) return { success: false, error: error.message }
  return {
    success: true,
    data: (data ?? []).map(
      (r: {
        id: string
        role: string
        is_active: boolean
        tenant: { id: string; business_name: string; slug: string }[] | { id: string; business_name: string; slug: string } | null
      }) => {
        const t = Array.isArray(r.tenant) ? r.tenant[0] : r.tenant
        return {
          staff_id: r.id,
          role: r.role,
          is_active: r.is_active,
          tenant: t ?? { id: '', business_name: '—', slug: '' },
        }
      }
    ),
  }
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
        plan_id: input.plan_id,
        status: input.status ?? 'active',
        starts_at: input.starts_at ?? null,
        ends_at: input.ends_at ?? null,
      })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('tenant_subscriptions').insert({
      tenant_id: tenantId,
      plan_id: input.plan_id,
      status: input.status ?? 'active',
      starts_at: input.starts_at ?? new Date().toISOString(),
      ends_at: input.ends_at ?? null,
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
// ADMIN STATS
// =====================================================

export interface AdminStats {
  total_tenants: number
  active_tenants: number
  suspended_tenants: number
  total_users: number
  new_signups_7d: number
  new_signups_30d: number
  total_services: number
  total_plans: number
  mrr: number
  tenants_without_services: number
  tenants_without_hours: number
  tenants_without_locations: number
  growth_by_month: { month: string; count: number }[]
  signups_by_month: { month: string; count: number }[]
  recent_events: Array<{
    id: string
    action: string
    entity_type: string
    created_at: string
    details: Record<string, unknown>
  }>
}

export async function getAdminStats(): Promise<{
  success: boolean
  data?: AdminStats
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const d365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [
    tenants,
    activeTenants,
    suspendedTenants,
    users,
    newUsers7,
    newUsers30,
    services,
    plans,
    subs,
    tenantList,
    auditEvents,
  ] = await Promise.all([
    db.from('tenants').select('id, created_at, status'),
    db.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d7),
    db.from('profiles').select('id, created_at').gte('created_at', d365),
    db.from('services').select('*', { count: 'exact', head: true }),
    db.from('subscription_plans').select('*', { count: 'exact', head: true }),
    db
      .from('tenant_subscriptions')
      .select('plan_id, status, plan:subscription_plans(price_monthly)')
      .eq('status', 'active'),
    db
      .from('tenants')
      .select('id, services:services(count), working_hours:working_hours(count), locations:locations(count)'),
    db
      .from('admin_audit_log')
      .select('id, action, entity_type, created_at, details')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const tenantsArr = (tenants.data ?? []) as Array<{
    id: string
    created_at: string
    status: string
  }>

  const newSignups7Count = newUsers7?.count ?? 0
  const allRecentUsers = (newUsers30.data ?? []) as Array<{ created_at: string }>

  const months: { key: string; label: string }[] = []
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    months.push({
      key,
      label: dt.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
    })
  }
  const tenantsByMonth = new Map<string, number>()
  for (const t of tenantsArr) {
    const dt = new Date(t.created_at)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    tenantsByMonth.set(key, (tenantsByMonth.get(key) ?? 0) + 1)
  }
  const usersByMonth = new Map<string, number>()
  for (const u of allRecentUsers) {
    const dt = new Date(u.created_at)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    usersByMonth.set(key, (usersByMonth.get(key) ?? 0) + 1)
  }

  const growth: { month: string; count: number }[] = []
  let cumulative = 0
  const baseline = tenantsArr.filter((t) => new Date(t.created_at) < new Date(months[0].key + '-01')).length
  cumulative = baseline
  for (const m of months) {
    cumulative += tenantsByMonth.get(m.key) ?? 0
    growth.push({ month: m.label, count: cumulative })
  }

  const signups: { month: string; count: number }[] = months.map((m) => ({
    month: m.label,
    count: usersByMonth.get(m.key) ?? 0,
  }))

  let mrr = 0
  for (const s of (subs.data ?? []) as Array<{
    plan?: { price_monthly?: number } | null
  }>) {
    mrr += Number(s.plan?.price_monthly ?? 0)
  }

  const tenantList2 = (tenantList.data ?? []) as Array<{
    id: string
    services: { count: number }[]
    working_hours: { count: number }[]
    locations: { count: number }[]
  }>
  const noServices = tenantList2.filter((t) => (t.services?.[0]?.count ?? 0) === 0).length
  const noHours = tenantList2.filter((t) => (t.working_hours?.[0]?.count ?? 0) === 0).length
  const noLocations = tenantList2.filter((t) => (t.locations?.[0]?.count ?? 0) === 0).length

  return {
    success: true,
    data: {
      total_tenants: tenantsArr.length,
      active_tenants: activeTenants.count ?? 0,
      suspended_tenants: suspendedTenants.count ?? 0,
      total_users: users.count ?? 0,
      new_signups_7d: newSignups7Count,
      new_signups_30d: allRecentUsers.filter(
        (u) => new Date(u.created_at).getTime() >= new Date(d30).getTime()
      ).length,
      total_services: services.count ?? 0,
      total_plans: plans.count ?? 0,
      mrr,
      tenants_without_services: noServices,
      tenants_without_hours: noHours,
      tenants_without_locations: noLocations,
      growth_by_month: growth,
      signups_by_month: signups,
      recent_events:
        ((auditEvents.data ?? []) as AdminStats['recent_events']).map((e) => ({
          ...e,
          details: (e.details ?? {}) as Record<string, unknown>,
        })),
    },
  }
}

// =====================================================
// ADMIN SETTINGS
// =====================================================

export async function getAdminSettings(
  keys: string[]
): Promise<{
  success: boolean
  data?: Record<string, Record<string, unknown>>
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('admin_settings')
    .select('key, value')
    .in('key', keys)
  if (error) return { success: false, error: error.message }
  const map: Record<string, Record<string, unknown>> = {}
  for (const r of (data ?? []) as Array<{ key: string; value: Record<string, unknown> }>) {
    map[r.key] = r.value
  }
  return { success: true, data: map }
}

export async function setAdminSetting(
  key: string,
  value: Record<string, unknown>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: auth.id })
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'settings.updated', 'settings', key, null, { value })
  revalidatePath('/admin/settings')
  return { success: true }
}

// =====================================================
// EMAIL TEMPLATES
// =====================================================

export interface EmailTemplate {
  id: string
  slug: string
  name: string
  subject: string
  body: string
  variables: string[]
  is_active: boolean
}

export async function listEmailTemplates(): Promise<{
  success: boolean
  data?: EmailTemplate[]
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('email_templates')
    .select('*')
    .order('slug')
  if (error) return { success: false, error: error.message }
  return {
    success: true,
    data: ((data ?? []) as Array<EmailTemplate & { variables: unknown }>).map((r) => ({
      ...r,
      variables: Array.isArray(r.variables) ? (r.variables as string[]) : [],
    })),
  }
}

export async function updateEmailTemplate(
  id: string,
  input: { name?: string; subject?: string; body?: string; is_active?: boolean }
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db
    .from('email_templates')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'email_template.updated', 'email_template', id)
  revalidatePath('/admin/settings')
  return { success: true }
}

// =====================================================
// GLOBAL SEARCH
// =====================================================

export async function adminGlobalSearch(query: string): Promise<{
  success: boolean
  data?: {
    tenants: Array<{ id: string; business_name: string; slug: string }>
    users: Array<{ id: string; full_name: string | null; email: string | null }>
    services: Array<{ id: string; name: string; tenant_id: string; tenant_name: string }>
  }
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!query.trim())
    return { success: true, data: { tenants: [], users: [], services: [] } }
  const db = createAdminClient()
  const q = `%${query}%`

  const [t, u, s] = await Promise.all([
    db
      .from('tenants')
      .select('id, business_name, slug')
      .or(`business_name.ilike.${q},slug.ilike.${q}`)
      .limit(8),
    db
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.${q},email.ilike.${q}`)
      .limit(8),
    db
      .from('services')
      .select('id, name, tenant_id, tenant:tenants(business_name)')
      .ilike('name', q)
      .limit(8),
  ])

  return {
    success: true,
    data: {
      tenants: (t.data ?? []) as never,
      users: (u.data ?? []) as never,
      services: ((s.data ?? []) as unknown as Array<{
        id: string
        name: string
        tenant_id: string
        tenant: { business_name: string } | { business_name: string }[] | null
      }>).map((r) => {
        const tn = Array.isArray(r.tenant) ? r.tenant[0] : r.tenant
        return {
          id: r.id,
          name: r.name,
          tenant_id: r.tenant_id,
          tenant_name: tn?.business_name ?? '',
        }
      }),
    },
  }
}

// =====================================================
// TENANT READ-ONLY HELPERS (clients/appointments/owner)
// =====================================================

export interface TenantClientRow {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export async function listTenantClients(
  tenantId: string
): Promise<{ success: boolean; data?: TenantClientRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          order: (
            c: string,
            opts: { ascending: boolean }
          ) => {
            limit: (n: number) => Promise<{ data: TenantClientRow[] | null; error: { message: string } | null }>
          }
        }
      }
    }
  }
  const { data, error } = await db
    .from('clients')
    .select('id, full_name, phone, email, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

export interface TenantAppointmentRow {
  id: string
  starts_at: string
  status: string
  client_name: string | null
}

export async function listTenantAppointments(
  tenantId: string
): Promise<{ success: boolean; data?: TenantAppointmentRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          order: (
            c: string,
            opts: { ascending: boolean }
          ) => {
            limit: (n: number) => Promise<{
              data:
                | Array<{
                    id: string
                    starts_at: string
                    status: string
                    client: { full_name: string | null } | { full_name: string | null }[] | null
                  }>
                | null
              error: { message: string } | null
            }>
          }
        }
      }
    }
  }
  const { data, error } = await db
    .from('appointments')
    .select('id, starts_at, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .order('starts_at', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  const rows: TenantAppointmentRow[] = (data ?? []).map((r) => {
    const c = Array.isArray(r.client) ? r.client[0] : r.client
    return {
      id: r.id,
      starts_at: r.starts_at,
      status: r.status,
      client_name: c?.full_name ?? null,
    }
  })
  return { success: true, data: rows }
}

export async function getTenantOwner(
  tenantId: string
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: { profile_id: string } | null
                error: { message: string } | null
              }>
            }
          }
        }
      }
    }
  }
  const { data, error } = await db
    .from('staff_members')
    .select('profile_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!data?.profile_id) return { success: false, error: 'Nessun owner trovato per questo tenant.' }
  return { success: true, profileId: data.profile_id }
}

// =====================================================
// PLAN STATS / TENANTS-ON-PLAN
// =====================================================

export interface PlanWithStats {
  id: string
  name: string
  slug: string
  price_monthly: number
  max_locations: number | null
  max_staff: number | null
  feature_flags: Record<string, unknown>
  is_active: boolean
  active_tenants_count: number
}

export async function getPlansWithStats(): Promise<{
  success: boolean
  data?: { plans: PlanWithStats[]; mrr: number; active_tenants_total: number }
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const [plansRes, subsRes] = await Promise.all([
    db
      .from('subscription_plans')
      .select('id, name, slug, price_monthly, max_locations, max_staff, feature_flags, is_active')
      .order('price_monthly', { ascending: true }),
    db.from('tenant_subscriptions').select('plan_id, status').eq('status', 'active'),
  ])

  if (plansRes.error) return { success: false, error: plansRes.error.message }
  if (subsRes.error) return { success: false, error: subsRes.error.message }

  const counts = new Map<string, number>()
  for (const s of (subsRes.data ?? []) as Array<{ plan_id: string }>) {
    counts.set(s.plan_id, (counts.get(s.plan_id) ?? 0) + 1)
  }

  const plans: PlanWithStats[] = (
    (plansRes.data ?? []) as Array<{
      id: string
      name: string
      slug: string
      price_monthly: number
      max_locations: number | null
      max_staff: number | null
      feature_flags: unknown
      is_active: boolean
    }>
  ).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price_monthly: Number(p.price_monthly),
    max_locations: p.max_locations,
    max_staff: p.max_staff,
    feature_flags: (p.feature_flags as Record<string, unknown>) ?? {},
    is_active: p.is_active,
    active_tenants_count: counts.get(p.id) ?? 0,
  }))

  const mrr = plans.reduce((sum, p) => sum + p.price_monthly * p.active_tenants_count, 0)
  const active_tenants_total = plans.reduce((s, p) => s + p.active_tenants_count, 0)

  return { success: true, data: { plans, mrr, active_tenants_total } }
}

export interface TenantOnPlan {
  id: string
  business_name: string
  status: string
  starts_at: string | null
}

export async function listTenantsOnPlan(planId: string): Promise<{
  success: boolean
  data?: TenantOnPlan[]
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('tenant_subscriptions')
    .select('current_period_start, status, tenant:tenants(id, business_name, status)')
    .eq('plan_id', planId)
    .eq('status', 'active')

  if (error) return { success: false, error: error.message }

  const rows = (
    (data ?? []) as unknown as Array<{
      current_period_start: string | null
      tenant:
        | { id: string; business_name: string; status: string }
        | { id: string; business_name: string; status: string }[]
        | null
    }>
  )
    .map((r) => {
      const t = Array.isArray(r.tenant) ? r.tenant[0] : r.tenant
      if (!t) return null
      return {
        id: t.id,
        business_name: t.business_name,
        status: t.status,
        starts_at: r.current_period_start,
      }
    })
    .filter((x): x is TenantOnPlan => x !== null)

  return { success: true, data: rows }
}

// =====================================================
// TENANT CLIENTS (admin CRUD + seed)
// =====================================================

export interface TenantClientInput {
  full_name: string
  email?: string | null
  phone?: string | null
}

export async function createTenantClient(
  tenantId: string,
  input: TenantClientInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!input.full_name?.trim()) return { success: false, error: 'Nome obbligatorio.' }
  const db = createAdminClient()
  const { error } = await db.from('clients').insert({
    tenant_id: tenantId,
    full_name: input.full_name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    marketing_consent: true,
    preferred_contact_channel: 'whatsapp',
    tags: '["active"]',
  })
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.created', 'client', null, tenantId, {
    name: input.full_name,
  })
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true }
}

export async function deleteTenantClient(
  tenantId: string,
  clientId: string
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { error } = await db.from('clients').delete().eq('id', clientId).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.deleted', 'client', clientId, tenantId)
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true }
}

const DEMO_FIRST_NAMES = [
  'Marco', 'Giulia', 'Andrea', 'Sara', 'Luca', 'Chiara', 'Davide', 'Elena',
  'Matteo', 'Francesca', 'Alessandro', 'Valentina', 'Simone', 'Laura',
  'Diego', 'Marta', 'Riccardo', 'Serena', 'Paolo', 'Roberta',
]
const DEMO_LAST_NAMES = [
  'Rossi', 'Bianchi', 'Russo', 'Ferrari', 'Esposito', 'Romano', 'Colombo',
  'Ricci', 'Marino', 'Bruno', 'Conti', 'De Luca', 'Costa', 'Greco', 'Galli',
  'Moretti', 'Fontana', 'Barbieri', 'Mancini', 'Pellegrini',
]
const DEMO_DOMAINS = ['email.it', 'gmail.com', 'libero.it', 'outlook.it']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPhone(): string {
  const n = 1000000 + Math.floor(Math.random() * 8999999)
  return `+39 3${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 10)} ${n}`
}

export async function seedDemoClients(
  tenantId: string,
  count: number = 10
): Promise<ActionResult & { inserted?: number }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const rows = Array.from({ length: Math.min(Math.max(count, 1), 50) }, () => {
    const first = pick(DEMO_FIRST_NAMES)
    const last = pick(DEMO_LAST_NAMES)
    const slug = `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, '')}`
    const suffix = Math.floor(Math.random() * 1000)
    return {
      tenant_id: tenantId,
      full_name: `${first} ${last}`,
      email: `${slug}${suffix}@${pick(DEMO_DOMAINS)}`,
      phone: randomPhone(),
      marketing_consent: true,
      preferred_contact_channel: 'whatsapp',
      tags: '["active"]',
    }
  })
  const { error, data } = await db.from('clients').insert(rows).select('id')
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.seeded', 'client', null, tenantId, {
    count: data?.length ?? rows.length,
  })
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true, inserted: data?.length ?? rows.length }
}

// =====================================================
// TENANT CLIENT — UPDATE
// =====================================================

export interface TenantClientUpdateInput {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  tags?: string[] | null
  marketing_consent?: boolean | null
}

export async function updateTenantClient(
  tenantId: string,
  clientId: string,
  input: TenantClientUpdateInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const patch: Record<string, unknown> = {}
  if (input.full_name !== undefined) patch.full_name = input.full_name?.trim() || null
  if (input.email !== undefined) patch.email = input.email?.trim() || null
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null
  if (input.tags !== undefined) {
    patch.tags = input.tags ? JSON.stringify(input.tags) : null
  }
  if (input.marketing_consent !== undefined) patch.marketing_consent = !!input.marketing_consent
  const { error } = await db
    .from('clients')
    .update(patch)
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.updated', 'client', clientId, tenantId, {
    fields: Object.keys(patch),
  })
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true }
}

// =====================================================
// TENANT CLIENT — DETAILED READ (with tags + consent)
// =====================================================

export interface TenantClientDetailedRow {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  tags: string[]
  marketing_consent: boolean
  profile_id: string | null
  avatar_url: string | null
  created_at: string
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t))
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map((t) => String(t)) : []
    } catch {
      return []
    }
  }
  return []
}

export async function listTenantClientsDetailed(
  tenantId: string
): Promise<{ success: boolean; data?: TenantClientDetailedRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('clients')
    .select('id, full_name, phone, email, tags, marketing_consent, profile_id, created_at, profile:profiles(avatar_url)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  const rows = (data ?? []).map((r) => {
    const x = r as unknown as {
      id: string
      full_name: string | null
      phone: string | null
      email: string | null
      tags: unknown
      marketing_consent: boolean | null
      profile_id: string | null
      created_at: string
      profile?: { avatar_url: string | null } | { avatar_url: string | null }[] | null
    }
    const prof = Array.isArray(x.profile) ? x.profile[0] : x.profile
    return {
      id: x.id,
      full_name: x.full_name,
      phone: x.phone,
      email: x.email,
      tags: parseTags(x.tags),
      marketing_consent: !!x.marketing_consent,
      profile_id: x.profile_id,
      avatar_url: prof?.avatar_url ?? null,
      created_at: x.created_at,
    }
  })
  return { success: true, data: rows }
}

// =====================================================
// TENANT APPOINTMENTS — DETAILED READ (admin)
// =====================================================

export interface TenantAppointmentDetailedRow {
  id: string
  start_time: string
  end_time: string
  status: string
  client_id: string
  client_name: string | null
  staff_id: string
  staff_name: string | null
  location_id: string
  service_names: string[]
  total_price: number
}

export async function listTenantAppointmentsDetailed(
  tenantId: string
): Promise<{ success: boolean; data?: TenantAppointmentDetailedRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('appointments')
    .select(
      'id, start_time, end_time, status, client_id, location_id, staff_id, client:clients(full_name), staff:staff_members(profile:profiles(full_name)), appointment_services(price_at_booking, services(name))'
    )
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  const rows = (data ?? []).map((raw) => {
    const r = raw as unknown as {
      id: string
      start_time: string
      end_time: string
      status: string
      client_id: string
      staff_id: string
      location_id: string
      client: { full_name: string | null } | { full_name: string | null }[] | null
      staff:
        | { profile: { full_name: string | null } | { full_name: string | null }[] | null }
        | { profile: { full_name: string | null } | { full_name: string | null }[] | null }[]
        | null
      appointment_services:
        | Array<{
            price_at_booking: number | null
            services: { name: string | null } | { name: string | null }[] | null
          }>
        | null
    }
    const client = Array.isArray(r.client) ? r.client[0] : r.client
    const staffOuter = Array.isArray(r.staff) ? r.staff[0] : r.staff
    const staffProfile = staffOuter
      ? Array.isArray(staffOuter.profile)
        ? staffOuter.profile[0]
        : staffOuter.profile
      : null
    const services = (r.appointment_services ?? []).map((as) => {
      const sv = Array.isArray(as.services) ? as.services[0] : as.services
      return { name: sv?.name ?? null, price: Number(as.price_at_booking ?? 0) }
    })
    return {
      id: r.id,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      client_id: r.client_id,
      client_name: client?.full_name ?? null,
      staff_id: r.staff_id,
      staff_name: staffProfile?.full_name ?? null,
      location_id: r.location_id,
      service_names: services.map((s) => s.name).filter((n): n is string => !!n),
      total_price: services.reduce((s, x) => s + x.price, 0),
    }
  })
  return { success: true, data: rows }
}

// =====================================================
// TENANT APPOINTMENT FORM HELPERS (clients/staff/services/locations)
// =====================================================

export interface AppointmentFormOptions {
  clients: Array<{ id: string; full_name: string | null; email: string | null }>
  staff: Array<{ id: string; name: string | null; role: string | null }>
  services: Array<{ id: string; name: string; price: number; duration_minutes: number }>
  locations: Array<{ id: string; name: string }>
}

export async function getAppointmentFormOptions(
  tenantId: string
): Promise<{ success: boolean; data?: AppointmentFormOptions; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const [clients, staff, services, locations] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true })
      .limit(500),
    db
      .from('staff_members')
      .select('id, role, profile:profiles(full_name)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(100),
    db
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(200),
    db.from('locations').select('id, name').eq('tenant_id', tenantId).limit(50),
  ])
  if (clients.error) return { success: false, error: clients.error.message }
  if (staff.error) return { success: false, error: staff.error.message }
  if (services.error) return { success: false, error: services.error.message }
  if (locations.error) return { success: false, error: locations.error.message }
  const staffRows = (staff.data ?? []).map((row) => {
    const r = row as {
      id: string
      role: string | null
      profile: { full_name: string | null } | { full_name: string | null }[] | null
    }
    const p = Array.isArray(r.profile) ? r.profile[0] : r.profile
    return { id: r.id, name: p?.full_name ?? null, role: r.role }
  })
  return {
    success: true,
    data: {
      clients: (clients.data ?? []) as Array<{
        id: string
        full_name: string | null
        email: string | null
      }>,
      staff: staffRows,
      services: (services.data ?? []).map((s) => {
        const r = s as {
          id: string
          name: string
          price: number
          duration_minutes: number
        }
        return {
          id: r.id,
          name: r.name,
          price: Number(r.price ?? 0),
          duration_minutes: Number(r.duration_minutes ?? 0),
        }
      }),
      locations: (locations.data ?? []) as Array<{ id: string; name: string }>,
    },
  }
}

// =============================================================
// IMAGE UPLOAD (admin only)
// =============================================================

const ALLOWED_BUCKETS = ['tenants', 'locations', 'avatars'] as const
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number]

export async function uploadAdminImage(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const file = formData.get('file')
  const bucket = String(formData.get('bucket') ?? '')
  const pathPrefix = String(formData.get('pathPrefix') ?? 'misc')

  if (!(file instanceof File)) return { success: false, error: 'File mancante.' }
  if (!ALLOWED_BUCKETS.includes(bucket as AllowedBucket)) {
    return { success: false, error: 'Bucket non valido.' }
  }
  if (file.size > 1024 * 1024) {
    return { success: false, error: 'File troppo grande (max 1 MB dopo compressione).' }
  }

  const db = createAdminClient()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const safePrefix = pathPrefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'misc'
  const path = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await db.storage
    .from(bucket)
    .upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: false })
  if (upErr) return { success: false, error: upErr.message }

  const { data: pub } = db.storage.from(bucket).getPublicUrl(path)
  return { success: true, url: pub.publicUrl }
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

  const cookieDomain =
    process.env.NODE_ENV === 'production'
      ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'}`
      : undefined

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATE_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 4, // 4h max
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

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

  const cookieDomain =
    process.env.NODE_ENV === 'production'
      ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'}`
      : undefined

  const cookieStore = await cookies()
  const previous = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null
  cookieStore.set(IMPERSONATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

  if (previous) {
    await logAdminAction(user.id, 'tenant.impersonation_stopped', 'tenant', previous, previous)
  }
  return { success: true }
}

// =====================================================
// SUBSCRIPTION PLANS (lite list for selectors)
// =====================================================

export interface PlanOption {
  id: string
  name: string
  price_monthly: number | null
}

export async function listPlanOptions(): Promise<PlanOption[]> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return []
  const db = createAdminClient()
  const { data } = await db
    .from('subscription_plans')
    .select('id, name, price_monthly')
    .order('price_monthly', { ascending: true, nullsFirst: true })
  return (data ?? []) as PlanOption[]
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

// =====================================================
// CLIENT IMPORT (concierge / migration)
// =====================================================

import type {
  ImportClientsInput,
  ImportClientsResult,
  ImportError,
} from '@/lib/actions/clienti'
import {
  normalizePhone,
  normalizeEmail,
  parseDateOfBirth,
  parseBooleanField,
  parseCsvTags,
} from '@/lib/utils/client-import-utils'

/**
 * Variant of importClients for superadmin concierge mode.
 * Operates on an explicit tenantId (skips getCurrentTenantId),
 * tags imported rows with 'concierge', and logs to admin_audit_log.
 */
export async function importClientsForTenant(
  tenantId: string,
  input: ImportClientsInput,
): Promise<ImportClientsResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) {
    return { success: false, error: auth.error, imported: 0, skipped: 0, errors: [] }
  }
  if (!tenantId) {
    return { success: false, error: 'Tenant ID mancante', imported: 0, skipped: 0, errors: [] }
  }
  if (!input.rows || input.rows.length === 0) {
    return { success: false, error: 'Nessuna riga', imported: 0, skipped: 0, errors: [] }
  }
  if (input.rows.length > 10_000) {
    return { success: false, error: 'Massimo 10.000 righe', imported: 0, skipped: 0, errors: [] }
  }
  const hasName = Object.values(input.mapping).includes('full_name')
  if (!hasName) {
    return { success: false, error: 'Mappa la colonna Nome', imported: 0, skipped: 0, errors: [] }
  }

  const db = createAdminClient()

  const { data: tenantRow } = await db
    .from('tenants')
    .select('id, business_name')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenantRow) {
    return { success: false, error: 'Tenant non trovato', imported: 0, skipped: 0, errors: [] }
  }

  const { data: existing } = await db
    .from('clients')
    .select('id, email, phone')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  const existingByEmail = new Map<string, string>()
  const existingByPhone = new Map<string, string>()
  ;(existing ?? []).forEach((c) => {
    if (c.email) existingByEmail.set(c.email.toLowerCase(), c.id)
    if (c.phone) { const norm = normalizePhone(c.phone); if (norm) existingByPhone.set(norm, c.id) }
  })

  const errors: ImportError[] = []
  const toInsert: Array<Record<string, unknown>> = []
  let skipped = 0

  const inv: Partial<Record<string, string>> = {}
  for (const [orig, styll] of Object.entries(input.mapping)) {
    if (styll !== 'ignore') inv[styll] = orig
  }

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i]
    const rowNum = i + 1

    const rawName = inv.full_name ? row[inv.full_name] ?? '' : ''
    const fullName = rawName.trim()
    if (!fullName) { errors.push({ rowIndex: rowNum, field: 'full_name', message: 'Nome mancante' }); continue }

    const rawEmail = inv.email ? row[inv.email] ?? '' : ''
    const email = rawEmail ? normalizeEmail(rawEmail) : null
    if (rawEmail && !email) errors.push({ rowIndex: rowNum, field: 'email', message: `Email non valida: ${rawEmail}` })

    const rawPhone = inv.phone ? row[inv.phone] ?? '' : ''
    const phone = rawPhone ? normalizePhone(rawPhone) : null
    if (rawPhone && !phone) errors.push({ rowIndex: rowNum, field: 'phone', message: `Telefono non valido: ${rawPhone}` })

    const dupId = (email && existingByEmail.get(email)) || (phone && existingByPhone.get(phone)) || null
    if (dupId) { skipped++; continue }

    const rawDob = inv.date_of_birth ? row[inv.date_of_birth] ?? '' : ''
    const dob = rawDob ? parseDateOfBirth(rawDob) : null

    const rawTags = inv.tags ? row[inv.tags] ?? '' : ''
    const tagsArr = parseCsvTags(rawTags)
    if (tagsArr.length === 0) tagsArr.push('imported')
    if (!tagsArr.includes('concierge')) tagsArr.push('concierge')

    const rawConsent = inv.marketing_consent ? row[inv.marketing_consent] ?? '' : ''
    const marketingConsent = rawConsent ? parseBooleanField(rawConsent) : false

    toInsert.push({
      tenant_id: tenantId,
      full_name: fullName,
      email,
      phone,
      date_of_birth: dob,
      marketing_consent: marketingConsent,
      preferred_contact_channel: 'whatsapp',
      tags: JSON.stringify(tagsArr),
    })
  }

  let imported = 0
  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500)
      const { error, count } = await db.from('clients').insert(chunk, { count: 'exact' })
      if (error) { errors.push({ rowIndex: 0, message: `Errore DB: ${error.message}` }); break }
      imported += count ?? chunk.length
    }
  }

  const status: 'completed' | 'partial' | 'failed' =
    imported === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'completed'

  const { data: jobRow } = await db
    .from('client_import_jobs')
    .insert({
      tenant_id: tenantId,
      initiated_by: auth.id,
      source: input.source,
      filename: input.filename ?? null,
      total_rows: input.rows.length,
      imported_count: imported,
      skipped_count: skipped,
      error_count: errors.length,
      errors: errors.slice(0, 100) as unknown as Record<string, unknown>[],
      status,
    })
    .select('id')
    .single()

  await logAdminAction(auth.id, 'client.import.concierge', 'tenant', tenantId, tenantId, {
    tenant_name: tenantRow.business_name,
    source: input.source,
    filename: input.filename ?? null,
    total: input.rows.length,
    imported,
    skipped,
    errors: errors.length,
  })

  revalidatePath(`/admin/tenants/${tenantId}/migration`)
  revalidatePath(`/admin/tenants/${tenantId}/clients`)

  return {
    success: imported > 0 || errors.length === 0,
    jobId: jobRow?.id,
    imported,
    skipped,
    errors,
  }
}

export interface ImportJobRow {
  id: string
  source: string | null
  filename: string | null
  total_rows: number
  imported_count: number
  skipped_count: number
  error_count: number
  status: string
  initiated_by: string | null
  initiator_email: string | null
  created_at: string
}

export async function listTenantImportJobs(
  tenantId: string,
): Promise<{ success: boolean; data?: ImportJobRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()
  const { data, error } = await db
    .from('client_import_jobs')
    .select('id, source, filename, total_rows, imported_count, skipped_count, error_count, status, initiated_by, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { success: false, error: error.message }

  const userIds = [...new Set((data ?? []).map((j) => j.initiated_by).filter((x): x is string => Boolean(x)))]
  const emailMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profs } = await db.from('profiles').select('id, email').in('id', userIds)
    ;(profs ?? []).forEach((p) => { if (p.email) emailMap.set(p.id, p.email) })
  }

  const rows: ImportJobRow[] = (data ?? []).map((j) => ({
    ...j,
    initiator_email: j.initiated_by ? (emailMap.get(j.initiated_by) ?? null) : null,
  }))

  return { success: true, data: rows }
}

export async function getImportJobErrors(
  tenantId: string,
  jobId: string,
): Promise<{ success: boolean; errors?: ImportError[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()
  const { data, error } = await db
    .from('client_import_jobs')
    .select('errors')
    .eq('tenant_id', tenantId)
    .eq('id', jobId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, errors: (data?.errors ?? []) as ImportError[] }
}
