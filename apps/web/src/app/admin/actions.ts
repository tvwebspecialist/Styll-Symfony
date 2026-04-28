'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
): Promise<ActionResult & { url?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data: u } = await db.auth.admin.getUserById(userId)
  const email = u?.user?.email
  if (!email) return { success: false, error: 'Utente senza email.' }
  const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) return { success: false, error: error.message }
  const url = data?.properties?.action_link
  if (!url) return { success: false, error: 'Link non generato.' }
  await logAdminAction(auth.id, 'user.impersonated', 'user', userId)
  return { success: true, url }
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
