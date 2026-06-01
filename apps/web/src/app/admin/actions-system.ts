'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'

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
      details,
    })
  } catch {
    // best-effort
  }
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
