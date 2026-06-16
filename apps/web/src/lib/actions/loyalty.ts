'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { sendTemplatedEmail } from '@/lib/email'
import { sendPushToSubscriptions, getSubscriptionsForProfile } from '@/lib/push/send-notification'
import { getAutomationEnabled } from '@/lib/actions/marketing-automations'
import { getNotificationChannel } from '@/lib/notifications-channel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientLoyaltyState {
  id: string
  total_points: number
  available_points: number
  current_streak: number
  longest_streak: number
  last_visit_date: string | null
  current_tier: string
  tier_points_this_year: number
  tier_year: number
  tier_grace_expires_at: string | null
}

// ─── Tier calculation ─────────────────────────────────────────────────────────

const STATIC_TIERS = [
  { name: 'bronze', min: 0 },
  { name: 'silver', min: 2500 },
  { name: 'gold', min: 5000 },
  { name: 'diamond', min: 10000 },
]

function computeStaticTier(totalPoints: number): string {
  let tier = 'bronze'
  for (const t of STATIC_TIERS) {
    if (totalPoints >= t.min) tier = t.name
  }
  return tier
}

// ─── Badge check ─────────────────────────────────────────────────────────────
// Checks all active badges for a client and inserts unlocked ones.
// Silently skips if badge already unlocked (unique constraint).

export async function checkAndUnlockBadges(
  clientId: string,
  tenantId: string,
  loyaltyState: ClientLoyaltyState,
  totalVisits: number,
  monthsSinceFirstVisit: number,
): Promise<void> {
  const db = createAdminClient()

  const { data: badges } = await db
    .from('badges')
    .select('id, condition_type, condition_value')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (!badges?.length) return

  const { data: alreadyUnlocked } = await db
    .from('client_badges')
    .select('badge_id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)

  const unlockedSet = new Set((alreadyUnlocked ?? []).map((b) => b.badge_id))

  const toUnlock: { tenant_id: string; client_id: string; badge_id: string }[] = []

  for (const badge of badges) {
    if (unlockedSet.has(badge.id)) continue

    let conditionMet = false
    switch (badge.condition_type) {
      case 'visits_count':
        conditionMet = totalVisits >= badge.condition_value
        break
      case 'streak_count':
        conditionMet = loyaltyState.current_streak >= badge.condition_value
        break
      case 'points_total':
        conditionMet = loyaltyState.total_points >= badge.condition_value
        break
      case 'months_since_first_visit':
        conditionMet = monthsSinceFirstVisit >= badge.condition_value
        break
      // 'manual' badges are only assigned by the barber — skip automatic check
    }

    if (conditionMet) {
      toUnlock.push({ tenant_id: tenantId, client_id: clientId, badge_id: badge.id })
    }
  }

  if (toUnlock.length > 0) {
    // ON CONFLICT DO NOTHING — unique index prevents doubles
    await db.from('client_badges').upsert(toUnlock, { onConflict: 'tenant_id,client_id,badge_id', ignoreDuplicates: true })
  }
}

// ─── Tier check ───────────────────────────────────────────────────────────────
// Reads tier_configs for the tenant; falls back to static thresholds.
// Respects tier_grace_expires_at (don't degrade tier during grace period).

export async function checkAndUpdateTier(
  clientId: string,
  tenantId: string,
  loyaltyState: ClientLoyaltyState,
): Promise<void> {
  const db = createAdminClient()

  // Load tenant tier thresholds
  const { data: tiers } = await db
    .from('tier_configs')
    .select('tier_name, min_points')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })

  const tierList = (tiers ?? []).length > 0
    ? (tiers as { tier_name: string; min_points: number }[])
    : STATIC_TIERS.map((t) => ({ tier_name: t.name, min_points: t.min }))

  const totalPoints = loyaltyState.total_points

  // Find highest tier whose min_points ≤ total_points
  let computedTier = tierList[0].tier_name
  for (const t of tierList) {
    if (totalPoints >= t.min_points) computedTier = t.tier_name
  }

  if (computedTier === loyaltyState.current_tier) return

  // Respect grace period: don't downgrade if grace is still active
  const graceActive =
    loyaltyState.tier_grace_expires_at &&
    new Date(loyaltyState.tier_grace_expires_at) > new Date()

  if (graceActive) {
    // Within grace period — only upgrade, never degrade
    const currentIdx = tierList.findIndex((t) => t.tier_name === loyaltyState.current_tier)
    const computedIdx = tierList.findIndex((t) => t.tier_name === computedTier)
    if (computedIdx <= currentIdx) return // no upgrade, stay put
  }

  await db
    .from('client_loyalty')
    .update({ current_tier: computedTier })
    .eq('id', loyaltyState.id)
}

// ─── Assign points on appointment completion ─────────────────────────────────
// Called from updateAppointmentStatus when status transitions to 'completed'.

export async function assignPointsOnCompletion(
  appointmentId: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient()

  // Guard: check if points already assigned for this appointment
  const { data: existing } = await db
    .from('loyalty_transactions')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('type', 'earn')
    .maybeSingle()

  if (existing) return { success: true } // already assigned — idempotent

  // Load appointment + services + products
  const { data: appt } = await db
    .from('appointments')
    .select('id, client_id, staff_id, start_time')
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!appt?.client_id) return { success: true } // no client linked

  // Load active loyalty config
  const { data: config } = await db
    .from('loyalty_configs')
    .select('template, points_per_visit, points_per_euro, streak_threshold_days, version, is_active')
    .eq('tenant_id', tenantId)
    .is('ended_at', null)
    .maybeSingle()

  if (!config?.is_active) return { success: true } // loyalty disabled

  // Load appointment services (for euro-based calculation)
  const { data: apptServices } = await db
    .from('appointment_services')
    .select('service_id, price_at_booking')
    .eq('appointment_id', appointmentId)
    .eq('tenant_id', tenantId)

  const { data: apptProducts } = await db
    .from('appointment_products')
    .select('price_at_sale, quantity')
    .eq('appointment_id', appointmentId)
    .eq('tenant_id', tenantId)

  const totalEuro =
    (apptServices ?? []).reduce((s, x) => s + Number(x.price_at_booking ?? 0), 0) +
    (apptProducts ?? []).reduce((s, x) => s + Number(x.price_at_sale ?? 0) * Number(x.quantity ?? 1), 0)

  // Calculate points based on template
  let pointsEarned = 0
  switch (config.template) {
    case 'classic':
      pointsEarned = config.points_per_visit ?? 100
      break
    case 'streak_master':
      pointsEarned = Math.round(totalEuro * (config.points_per_euro ?? 10))
      break
    case 'vip_club':
      // For vip_club: use points_per_euro as default (service-specific config TBD)
      pointsEarned = Math.round(totalEuro * (config.points_per_euro ?? 10))
      break
  }

  if (pointsEarned <= 0) return { success: true }

  // Load current loyalty state (or create a new row)
  let { data: loyaltyRow } = await db
    .from('client_loyalty')
    .select('id, total_points, available_points, current_streak, longest_streak, last_visit_date, current_tier, tier_points_this_year, tier_year, tier_grace_expires_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', appt.client_id)
    .maybeSingle()

  const now = new Date()
  const currentYear = now.getFullYear()

  if (!loyaltyRow) {
    // Create loyalty record for this client
    const { data: newRow } = await db
      .from('client_loyalty')
      .insert({
        tenant_id: tenantId,
        client_id: appt.client_id,
        total_points: 0,
        available_points: 0,
        current_streak: 0,
        longest_streak: 0,
        current_tier: 'bronze',
        tier_points_this_year: 0,
        tier_year: currentYear,
        last_visit_date: null,
      })
      .select()
      .single()
    loyaltyRow = newRow
  }

  if (!loyaltyRow) return { success: false, error: 'Impossibile creare il record loyalty' }

  // Streak calculation
  const streakThreshold = (config.streak_threshold_days ?? 45) * 24 * 60 * 60 * 1000
  const lastVisit = loyaltyRow.last_visit_date ? new Date(loyaltyRow.last_visit_date) : null
  const daysSinceLast = lastVisit ? now.getTime() - lastVisit.getTime() : Infinity

  const newStreak = daysSinceLast <= streakThreshold
    ? (loyaltyRow.current_streak ?? 0) + 1
    : 1

  const newLongest = Math.max(loyaltyRow.longest_streak ?? 0, newStreak)

  // Count total visits for badge checks
  const { count: visitCount } = await db
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('client_id', appt.client_id)
    .eq('status', 'completed')

  // Months since first visit (for badge check)
  const { data: firstAppt } = await db
    .from('appointments')
    .select('start_time')
    .eq('tenant_id', tenantId)
    .eq('client_id', appt.client_id)
    .eq('status', 'completed')
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle()

  const monthsSinceFirst = firstAppt
    ? Math.floor((now.getTime() - new Date(firstAppt.start_time).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0

  const newTotal = (loyaltyRow.total_points ?? 0) + pointsEarned
  const newAvailable = (loyaltyRow.available_points ?? 0) + pointsEarned
  const newTierPoints = ((loyaltyRow.tier_year ?? 0) === currentYear
    ? (loyaltyRow.tier_points_this_year ?? 0)
    : 0) + pointsEarned

  // Insert loyalty transaction (unique index prevents double-assign)
  const { error: txError } = await db.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: appt.client_id,
    type: 'earn',
    points: pointsEarned,
    description: `Visita completata`,
    appointment_id: appointmentId,
    staff_id: appt.staff_id ?? null,
    loyalty_config_version: config.version ?? 1,
  })

  if (txError) {
    // If unique constraint hit, points were already assigned
    if (txError.code === '23505') return { success: true }
    return { success: false, error: txError.message }
  }

  // Update client_loyalty
  const updatedState: ClientLoyaltyState = {
    ...loyaltyRow,
    total_points: newTotal,
    available_points: newAvailable,
    current_streak: newStreak,
    longest_streak: newLongest,
    last_visit_date: now.toISOString(),
  }

  await db
    .from('client_loyalty')
    .update({
      total_points: newTotal,
      available_points: newAvailable,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_visit_date: now.toISOString(),
      tier_points_this_year: newTierPoints,
      tier_year: currentYear,
    })
    .eq('id', loyaltyRow.id)

  // Check badges and tier
  await Promise.all([
    checkAndUnlockBadges(appt.client_id, tenantId, updatedState, visitCount ?? 0, monthsSinceFirst),
    checkAndUpdateTier(appt.client_id, tenantId, updatedState),
  ])

  sendLoyaltyNotifications({
    tenantId,
    clientId:     appt.client_id,
    pointsEarned,
    newTotal,
    oldTotal:     loyaltyRow.total_points ?? 0,
    newStreak,
    oldStreak:    loyaltyRow.current_streak ?? 0,
  }).catch((err) => {
    console.error('[loyalty] sendLoyaltyNotifications error:', err)
  })

  return { success: true }
}

// ─── Manual point assignment ──────────────────────────────────────────────────

export async function addManualPoints(input: {
  clientId: string
  points: number
  note: string
}): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }
  if (!input.note.trim()) return { success: false, error: 'La nota è obbligatoria' }
  if (input.points <= 0) return { success: false, error: 'I punti devono essere positivi' }

  const db = createAdminClient()

  // Insert transaction
  const { error: txError } = await db.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: input.clientId,
    type: 'bonus',
    points: input.points,
    description: input.note.trim(),
  })

  if (txError) return { success: false, error: txError.message }

  // Upsert loyalty row
  const { data: existing } = await db
    .from('client_loyalty')
    .select('id, total_points, available_points, current_streak, longest_streak, last_visit_date, current_tier, tier_points_this_year, tier_year, tier_grace_expires_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', input.clientId)
    .maybeSingle()

  const currentYear = new Date().getFullYear()

  if (!existing) {
    await db.from('client_loyalty').insert({
      tenant_id: tenantId,
      client_id: input.clientId,
      total_points: input.points,
      available_points: input.points,
      current_streak: 0,
      longest_streak: 0,
      current_tier: 'bronze',
      tier_points_this_year: input.points,
      tier_year: currentYear,
    })
  } else {
    const newTotal = (existing.total_points ?? 0) + input.points
    const newAvailable = (existing.available_points ?? 0) + input.points
    const newTierPoints = ((existing.tier_year ?? 0) === currentYear
      ? (existing.tier_points_this_year ?? 0)
      : 0) + input.points

    const updatedState: ClientLoyaltyState = {
      ...existing,
      total_points: newTotal,
      available_points: newAvailable,
    }

    await db
      .from('client_loyalty')
      .update({ total_points: newTotal, available_points: newAvailable, tier_points_this_year: newTierPoints, tier_year: currentYear })
      .eq('id', existing.id)

    await checkAndUpdateTier(input.clientId, tenantId, updatedState)
  }

  revalidatePath('/tenant/dashboard', 'layout')
  return { success: true }
}

// ─── Request reward redemption (client-side: creates pending redemption) ─────
// The client requests a redemption — the barber confirms from the dashboard.

export async function requestRewardRedemption(input: {
  clientId: string
  tenantId: string
  rewardId: string
}): Promise<{ success: boolean; error?: string; redemptionId?: string }> {
  const db = createAdminClient()

  const { data: reward } = await db
    .from('rewards')
    .select('id, name, points_cost, is_active')
    .eq('id', input.rewardId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (!reward?.is_active) return { success: false, error: 'Reward non disponibile' }

  const { data: loyalty } = await db
    .from('client_loyalty')
    .select('id, available_points')
    .eq('tenant_id', input.tenantId)
    .eq('client_id', input.clientId)
    .maybeSingle()

  if (!loyalty) return { success: false, error: 'Programma fedeltà non trovato' }
  if ((loyalty.available_points ?? 0) < reward.points_cost) {
    return { success: false, error: 'Punti insufficienti' }
  }

  // Create pending redemption (confirmed_at = null means pending)
  const { data: redemption, error } = await db
    .from('reward_redemptions')
    .insert({
      tenant_id: input.tenantId,
      client_id: input.clientId,
      reward_id: input.rewardId,
      points_spent: reward.points_cost,
      confirmed_at: null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  return { success: true, redemptionId: redemption.id }
}

// ─── Confirm reward redemption (barber-side) ─────────────────────────────────

export async function confirmRewardRedemption(
  redemptionId: string,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()

  const { data: redemption } = await db
    .from('reward_redemptions')
    .select('id, client_id, points_spent, confirmed_at, rewards(name)')
    .eq('id', redemptionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!redemption) return { success: false, error: 'Riscatto non trovato' }
  if (redemption.confirmed_at) return { success: true } // already confirmed

  // Deduct points
  const { data: loyalty } = await db
    .from('client_loyalty')
    .select('id, available_points')
    .eq('tenant_id', tenantId)
    .eq('client_id', redemption.client_id)
    .maybeSingle()

  if (!loyalty) return { success: false, error: 'Dati loyalty non trovati' }

  const newAvailable = (loyalty.available_points ?? 0) - redemption.points_spent
  if (newAvailable < 0) return { success: false, error: 'Punti insufficienti' }

  // Insert redeem transaction
  const rewardName = (redemption.rewards as unknown as { name: string } | null)?.name ?? 'Reward'

  await db.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: redemption.client_id,
    type: 'redeem',
    points: -redemption.points_spent,
    description: `Riscatto: ${rewardName}`,
  })

  // Update available points
  await db
    .from('client_loyalty')
    .update({ available_points: newAvailable })
    .eq('id', loyalty.id)

  // Mark redemption confirmed
  await db
    .from('reward_redemptions')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', redemptionId)

  revalidatePath('/tenant/dashboard', 'layout')
  return { success: true }
}

// ─── Get top clients by loyalty points ───────────────────────────────────────

export async function getTopLoyaltyClients(limit = 10): Promise<
  Array<{
    clientId: string
    fullName: string
    totalPoints: number
    currentStreak: number
    currentTier: string
  }>
> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return []

  const db = createAdminClient()

  const { data } = await db
    .from('client_loyalty')
    .select('client_id, total_points, current_streak, current_tier, clients(full_name)')
    .eq('tenant_id', tenantId)
    .order('total_points', { ascending: false })
    .limit(limit)

  type Row = { client_id: string; total_points: number; current_streak: number; current_tier: string; clients: { full_name: string } | null }

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    clientId: r.client_id,
    fullName: r.clients?.full_name ?? '—',
    totalPoints: r.total_points ?? 0,
    currentStreak: r.current_streak ?? 0,
    currentTier: r.current_tier ?? 'bronze',
  }))
}

// ─── Barber-side: create + immediately confirm a redemption ──────────────────

export async function barberRedeemForClient(input: {
  clientId: string
  rewardId: string
}): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()

  const { data: reward } = await db
    .from('rewards')
    .select('id, name, points_cost, is_active')
    .eq('id', input.rewardId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!reward?.is_active) return { success: false, error: 'Reward non disponibile' }

  const { data: loyalty } = await db
    .from('client_loyalty')
    .select('id, available_points')
    .eq('tenant_id', tenantId)
    .eq('client_id', input.clientId)
    .maybeSingle()

  if (!loyalty) return { success: false, error: 'Dati loyalty non trovati' }
  if ((loyalty.available_points ?? 0) < reward.points_cost) {
    return { success: false, error: 'Punti insufficienti' }
  }

  const now = new Date().toISOString()

  const { error: rErr } = await db.from('reward_redemptions').insert({
    tenant_id: tenantId,
    client_id: input.clientId,
    reward_id: input.rewardId,
    points_spent: reward.points_cost,
    confirmed_at: now,
  })
  if (rErr) return { success: false, error: rErr.message }

  await db.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: input.clientId,
    type: 'redeem',
    points: -reward.points_cost,
    description: `Riscatto: ${reward.name}`,
  })

  await db
    .from('client_loyalty')
    .update({ available_points: (loyalty.available_points ?? 0) - reward.points_cost })
    .eq('id', loyalty.id)

  revalidatePath('/tenant/dashboard', 'layout')
  return { success: true }
}

// ─── Pending redemptions for a client ────────────────────────────────────────

export async function getPendingRedemptions(clientId: string): Promise<
  Array<{ id: string; rewardName: string; pointsSpent: number; createdAt: string }>
> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return []

  const db = createAdminClient()
  const { data } = await db
    .from('reward_redemptions')
    .select('id, points_spent, created_at, rewards(name)')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .is('confirmed_at', null)
    .order('created_at', { ascending: false })

  type Row = { id: string; points_spent: number; created_at: string; rewards: { name: string } | null }

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    rewardName: r.rewards?.name ?? '—',
    pointsSpent: r.points_spent,
    createdAt: r.created_at,
  }))
}

// ─── Loyalty notifications (fire-and-forget) ─────────────────────────────────

async function sendLoyaltyNotifications(params: {
  tenantId:     string
  clientId:     string
  pointsEarned: number
  newTotal:     number
  oldTotal:     number
  newStreak:    number
  oldStreak:    number
}): Promise<void> {
  const { tenantId, clientId, pointsEarned, newTotal, oldTotal, newStreak, oldStreak } = params
  const db = createAdminClient()

  const [
    { data: client },
    { data: tenant },
    pointsEnabled,
    streakEnabled,
    rewardEnabled,
  ] = await Promise.all([
    db.from('clients').select('email, full_name, profile_id, marketing_consent').eq('id', clientId).maybeSingle(),
    db.from('tenants').select('business_name, primary_color').eq('id', tenantId).maybeSingle(),
    getAutomationEnabled(tenantId, 'loyalty_points'),
    getAutomationEnabled(tenantId, 'loyalty_streak'),
    getAutomationEnabled(tenantId, 'loyalty_reward'),
  ])

  if (!client?.marketing_consent) return

  const clientName   = client.full_name ?? 'Cliente'
  const clientEmail  = client.email ?? null
  const profileId    = client.profile_id ?? null
  const businessName = tenant?.business_name ?? 'il tuo salone'
  const primaryColor = tenant?.primary_color ?? '#111111'
  const tenantMeta   = { business_name: businessName, primary_color: primaryColor }

  // One channel determination — reused across all 3 loyalty events
  const channel = !profileId
    ? (clientEmail ? 'email' : 'none')
    : await getNotificationChannel(profileId, tenantId).catch(
        () => (clientEmail ? 'email' : 'none') as 'push' | 'email' | 'none'
      )

  // Load subs once — only if push channel
  const subs = channel === 'push' && profileId
    ? await getSubscriptionsForProfile(tenantId, profileId)
    : []

  const hasPush = subs.length > 0

  // ── Punti guadagnati ─────────────────────────────────────────────────────
  if (pointsEnabled) {
    if (channel === 'push' && hasPush) {
      sendPushToSubscriptions(subs, {
        title: `+${pointsEarned} punti guadagnati!`,
        body:  `Totale: ${newTotal} punti · ${businessName}`,
        tag:   `loyalty-points-${clientId}`,
      }).catch(() => {})
    } else if (channel === 'email' && clientEmail) {
      await sendTemplatedEmail({
        to:           clientEmail,
        templateSlug: 'loyalty_points',
        variables:    { client_name: clientName, business_name: businessName, points: String(pointsEarned), total_points: String(newTotal) },
        tenant:       tenantMeta,
      })
    }
  }

  // ── Streak (solo se cambiata e >= 3) ─────────────────────────────────────
  if (streakEnabled && newStreak >= 3 && newStreak !== oldStreak) {
    if (channel === 'push' && hasPush) {
      sendPushToSubscriptions(subs, {
        title: `Streak di ${newStreak} visite 🔥`,
        body:  `Stai andando alla grande da ${businessName}!`,
        tag:   `loyalty-streak-${clientId}`,
      }).catch(() => {})
    } else if (channel === 'email' && clientEmail) {
      await sendTemplatedEmail({
        to:           clientEmail,
        templateSlug: 'loyalty_streak',
        variables:    { client_name: clientName, business_name: businessName, streak: String(newStreak) },
        tenant:       tenantMeta,
      })
    }
  }

  // ── Reward sbloccato (soglia più alta appena superata) ────────────────────
  if (rewardEnabled) {
    const { data: rewards } = await db
      .from('rewards')
      .select('name, points_cost')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .gt('points_cost', oldTotal)
      .lte('points_cost', newTotal)
      .order('points_cost', { ascending: false })
      .limit(1)

    const unlockedReward = (rewards ?? [])[0] as { name: string; points_cost: number } | undefined

    if (unlockedReward) {
      if (channel === 'push' && hasPush) {
        sendPushToSubscriptions(subs, {
          title: 'Premio sbloccato! 🎉',
          body:  `Hai sbloccato: ${unlockedReward.name} da ${businessName}`,
          tag:   `loyalty-reward-${clientId}`,
        }).catch(() => {})
      } else if (channel === 'email' && clientEmail) {
        await sendTemplatedEmail({
          to:           clientEmail,
          templateSlug: 'loyalty_reward',
          variables:    { client_name: clientName, business_name: businessName, reward_name: unlockedReward.name },
          tenant:       tenantMeta,
        })
      }
    }
  }
}
