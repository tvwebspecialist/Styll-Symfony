'use server'

import { revalidatePath } from 'next/cache'

import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'

import type { ActionResult } from './actions'

function actionError(error: unknown): string {
  if (error instanceof SymfonyAdminApiError) {
    if (error.details.body) {
      try {
        const parsed = JSON.parse(error.details.body) as { error?: string }
        if (parsed.error) return parsed.error
      } catch {}
    }
  }

  return error instanceof Error ? error.message : 'Errore sconosciuto.'
}

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
  try {
    await fetchSymfonyAdminJson('/api/admin/plans', {
      method: 'POST',
      body: input,
    })
    revalidatePath('/admin/subscription-plans')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateSubscriptionPlan(
  id: string,
  input: Partial<SubscriptionPlanInput>
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/plans/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    })
    revalidatePath('/admin/subscription-plans')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteSubscriptionPlan(id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    revalidatePath('/admin/subscription-plans')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

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
  try {
    const data = await fetchSymfonyAdminJson<{
      plans: PlanWithStats[]
      mrr: number
      active_tenants_total: number
    }>('/api/admin/plans')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
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
  try {
    const data = await fetchSymfonyAdminJson<TenantOnPlan[]>(
      `/api/admin/plans/${encodeURIComponent(planId)}/tenants`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export interface PlanOption {
  id: string
  name: string
  price_monthly: number | null
}

export async function listPlanOptions(): Promise<PlanOption[]> {
  try {
    return await fetchSymfonyAdminJson<PlanOption[]>('/api/admin/plans/options')
  } catch {
    return []
  }
}
