import type { ClientAnalytics } from '../../types/clients'

interface VipScoreFactors {
  frequencyScore: number   // 30%
  spendScore: number       // 25%
  punctualityScore: number // 20%
  loyaltyScore: number     // 15%
  referralScore: number    // 10%
}

export const calculateVipScore = (
  analytics: ClientAnalytics,
  tenantAvgFrequency: number,
  tenantAvgSpend: number,
  firstVisitDate: string | null
): number => {
  const { 
    average_days_between_visits,
    total_spent_services,
    total_spent_products,
    total_visits,
    no_show_count,
    cancellation_count,
    referral_count
  } = analytics

  // 1. Frequency score (30%) — more frequent = higher score
  let frequencyScore = 50
  if (average_days_between_visits && tenantAvgFrequency > 0) {
    const ratio = tenantAvgFrequency / average_days_between_visits
    frequencyScore = Math.min(100, Math.max(0, Math.round(ratio * 50)))
  }

  // 2. Spend score (25%)
  let spendScore = 50
  const totalSpend = total_spent_services + total_spent_products
  if (tenantAvgSpend > 0) {
    const ratio = totalSpend / (tenantAvgSpend * Math.max(1, total_visits))
    spendScore = Math.min(100, Math.max(0, Math.round(ratio * 50)))
  }

  // 3. Punctuality score (20%) — 1 - (no_shows + cancellations) / total_visits
  let punctualityScore = 100
  if (total_visits > 0) {
    const badVisitRatio = (no_show_count + cancellation_count) / total_visits
    punctualityScore = Math.round((1 - badVisitRatio) * 100)
  }

  // 4. Loyalty tenure score (15%)
  let loyaltyScore = 0
  if (firstVisitDate) {
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(firstVisitDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    // 1 year = 100 points for loyalty
    loyaltyScore = Math.min(100, Math.round((daysSinceFirst / 365) * 100))
  }

  // 5. Referral score (10%)
  const referralScore = Math.min(100, referral_count * 20)

  const factors: VipScoreFactors = {
    frequencyScore,
    spendScore,
    punctualityScore,
    loyaltyScore,
    referralScore,
  }

  const vipScore = Math.round(
    factors.frequencyScore * 0.30 +
    factors.spendScore * 0.25 +
    factors.punctualityScore * 0.20 +
    factors.loyaltyScore * 0.15 +
    factors.referralScore * 0.10
  )

  return Math.min(100, Math.max(0, vipScore))
}

export const getVipScoreLabel = (score: number): string => {
  if (score >= 80) return 'VIP Top'
  if (score >= 60) return 'Fedele'
  if (score >= 40) return 'Regolare'
  if (score >= 20) return 'Occasionale'
  return 'Nuovo'
}

export const getVipScoreColor = (score: number): string => {
  if (score >= 80) return '#FFD700'
  if (score >= 60) return '#22C55E'
  if (score >= 40) return '#3B82F6'
  if (score >= 20) return '#6B7280'
  return '#9CA3AF'
}
