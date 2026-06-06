'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoyaltyTemplate = 'classic' | 'streak_master' | 'vip_club'

export interface LoyaltyConfig {
  id: string
  template: LoyaltyTemplate
  isActive: boolean
  pointsPerVisit: number
  pointsPerEuro: number
  streakThresholdDays: number
  version: number
}

export interface Reward {
  id: string
  name: string
  description: string | null
  pointsCost: number
  rewardType: 'product' | 'service' | 'discount' | 'custom'
  isActive: boolean
  displayOrder: number
}

export interface Badge {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  conditionType: string
  conditionValue: number
  isActive: boolean
  displayOrder: number
}

export interface TierBenefits {
  priority_booking: boolean
  bonus_points_pct: number
  permanent_discount_pct: number
  upgrade_service: boolean
  birthday_reward: boolean
}

export interface TierConfig {
  id: string
  tierName: 'bronze' | 'silver' | 'gold' | 'diamond'
  tierLabel: string
  minPoints: number
  benefits: TierBenefits
  visualStyle: { border_color: string; gradient: string }
  displayOrder: number
}

export interface LoyaltySettingsData {
  config: LoyaltyConfig | null
  rewards: Reward[]
  badges: Badge[]
  tiers: TierConfig[]
}

// ─── Fetch all loyalty settings for the active tenant ─────────────────────────

export async function getLoyaltySettings(): Promise<LoyaltySettingsData | null> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return null

  const db = createAdminClient()

  const [configRes, rewardsRes, badgesRes, tiersRes] = await Promise.all([
    db
      .from('loyalty_configs')
      .select('id, template, is_active, points_per_visit, points_per_euro, streak_threshold_days, version')
      .eq('tenant_id', tenantId)
      .is('ended_at', null)
      .maybeSingle(),
    db
      .from('rewards')
      .select('id, name, description, points_cost, reward_type, is_active, display_order')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true }),
    db
      .from('badges')
      .select('id, name, description, icon_url, condition_type, condition_value, is_active, display_order')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true }),
    db
      .from('tier_configs')
      .select('id, tier_name, tier_label, min_points, benefits, visual_style, display_order')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true }),
  ])

  type RawConfig = typeof configRes.data
  const raw = configRes.data as RawConfig

  return {
    config: raw
      ? {
          id: raw.id,
          template: raw.template as LoyaltyTemplate,
          isActive: raw.is_active,
          pointsPerVisit: raw.points_per_visit ?? 100,
          pointsPerEuro: raw.points_per_euro ?? 10,
          streakThresholdDays: raw.streak_threshold_days ?? 45,
          version: raw.version ?? 1,
        }
      : null,
    rewards: (rewardsRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      pointsCost: r.points_cost,
      rewardType: r.reward_type as Reward['rewardType'],
      isActive: r.is_active,
      displayOrder: r.display_order,
    })),
    badges: (badgesRes.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      iconUrl: b.icon_url,
      conditionType: b.condition_type,
      conditionValue: b.condition_value,
      isActive: b.is_active,
      displayOrder: b.display_order,
    })),
    tiers: (tiersRes.data ?? []).map((t) => ({
      id: t.id,
      tierName: t.tier_name as TierConfig['tierName'],
      tierLabel: t.tier_label,
      minPoints: t.min_points,
      benefits: (t.benefits ?? {}) as TierBenefits,
      visualStyle: (t.visual_style ?? {}) as TierConfig['visualStyle'],
      displayOrder: t.display_order,
    })),
  }
}

// ─── Save / activate loyalty config (creates new version if template changes) ─

export async function saveLoyaltyConfig(input: {
  template: LoyaltyTemplate
  isActive: boolean
  pointsPerVisit: number
  pointsPerEuro: number
  streakThresholdDays: number
}): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()

  const { data: existing } = await db
    .from('loyalty_configs')
    .select('id, template, version')
    .eq('tenant_id', tenantId)
    .is('ended_at', null)
    .maybeSingle()

  const templateChanged = existing && existing.template !== input.template
  const nextVersion = (existing?.version ?? 0) + (templateChanged ? 1 : 0)

  if (existing && templateChanged) {
    // Close the current active config
    await db
      .from('loyalty_configs')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', existing.id)
  }

  if (!existing || templateChanged) {
    // Create a new config row
    const { error } = await db.from('loyalty_configs').insert({
      tenant_id: tenantId,
      template: input.template,
      is_active: input.isActive,
      points_per_visit: input.pointsPerVisit,
      points_per_euro: input.pointsPerEuro,
      streak_threshold_days: input.streakThresholdDays,
      version: nextVersion || 1,
      started_at: new Date().toISOString(),
    })
    if (error) return { success: false, error: error.message }
  } else {
    // Update in-place (same template)
    const { error } = await db
      .from('loyalty_configs')
      .update({
        is_active: input.isActive,
        points_per_visit: input.pointsPerVisit,
        points_per_euro: input.pointsPerEuro,
        streak_threshold_days: input.streakThresholdDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/tenant/dashboard', 'layout')
  return { success: true }
}

// ─── Reward CRUD ─────────────────────────────────────────────────────────────

export async function upsertReward(input: {
  id?: string
  name: string
  description: string | null
  pointsCost: number
  rewardType: 'product' | 'service' | 'discount' | 'custom'
  isActive: boolean
}): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()

  // Count existing rewards (max 6)
  if (!input.id) {
    const { count } = await db
      .from('rewards')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    if ((count ?? 0) >= 6) {
      return { success: false, error: 'Limite massimo di 6 reward raggiunto.' }
    }
  }

  const payload = {
    tenant_id: tenantId,
    name: input.name,
    description: input.description,
    points_cost: input.pointsCost,
    reward_type: input.rewardType,
    is_active: input.isActive,
  }

  if (input.id) {
    const { error } = await db
      .from('rewards')
      .update(payload)
      .eq('id', input.id)
      .eq('tenant_id', tenantId)
    if (error) return { success: false, error: error.message }
  } else {
    const { count: currentCount } = await db
      .from('rewards')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    const { error } = await db.from('rewards').insert({
      ...payload,
      display_order: (currentCount ?? 0),
    })
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/tenant/dashboard', 'layout')
  return { success: true }
}

export async function deleteReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()
  const { error } = await db
    .from('rewards')
    .delete()
    .eq('id', rewardId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/tenant/dashboard', 'layout')
  return { success: true }
}

// ─── Toggle badge active/inactive ────────────────────────────────────────────

export async function toggleBadge(
  badgeId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()
  const { error } = await db
    .from('badges')
    .update({ is_active: isActive })
    .eq('id', badgeId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Update tier config ───────────────────────────────────────────────────────

export async function updateTierConfig(input: {
  id: string
  minPoints: number
  benefits: TierBenefits
}): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()
  const { error } = await db
    .from('tier_configs')
    .update({
      min_points: input.minPoints,
      benefits: input.benefits,
    })
    .eq('id', input.id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Seed default rewards for a new tenant ───────────────────────────────────
// Called automatically when a tenant activates loyalty for the first time.

export async function seedDefaultRewards(tenantId: string): Promise<void> {
  const db = createAdminClient()
  const { count } = await db
    .from('rewards')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if ((count ?? 0) > 0) return // already seeded

  const defaults = [
    { name: 'Prodotto gratis', description: 'Un prodotto a scelta del salone in regalo.', points_cost: 2000, reward_type: 'product', display_order: 0 },
    { name: 'Sconto 10%', description: '10% di sconto sulla prossima visita.', points_cost: 3750, reward_type: 'discount', display_order: 1 },
    { name: 'Servizio gratis', description: 'Un servizio a scelta completamente gratis.', points_cost: 5000, reward_type: 'service', display_order: 2 },
    { name: 'Taglio + Barba gratis', description: 'Taglio e barba completi in omaggio.', points_cost: 7500, reward_type: 'service', display_order: 3 },
  ]

  await db.from('rewards').insert(
    defaults.map((d) => ({ ...d, tenant_id: tenantId, is_active: false })),
  )
}
