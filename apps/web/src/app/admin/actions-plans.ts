'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import type { TablesUpdate } from '@/types'

import { bumpAdmin, requireSuperadmin, type ActionResult } from './actions'

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
  const { feature_flags, ...rest } = input
  const payload: TablesUpdate<'subscription_plans'> = {
    ...rest,
    ...(feature_flags !== undefined ? { feature_flags: feature_flags as unknown as import('@/types').Json } : {}),
  }
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
