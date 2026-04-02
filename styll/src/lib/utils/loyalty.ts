import type { LoyaltyTier, LoyaltyProgress } from '../../types/loyalty'
import { TIER_THRESHOLDS } from '../../types/loyalty'

export const getTierForPoints = (points: number): LoyaltyTier => {
  const tier = [...TIER_THRESHOLDS]
    .reverse()
    .find(t => points >= t.minPoints)
  return tier?.tier ?? 'bronze'
}

export const getLoyaltyProgress = (
  currentPoints: number,
  tierPointsThisYear: number
): LoyaltyProgress => {
  const currentTier = TIER_THRESHOLDS.find(t => t.tier === getTierForPoints(tierPointsThisYear)) ?? TIER_THRESHOLDS[0]
  const currentIndex = TIER_THRESHOLDS.findIndex(t => t.tier === currentTier.tier)
  const nextTier = currentIndex < TIER_THRESHOLDS.length - 1 ? TIER_THRESHOLDS[currentIndex + 1] : null
  
  let progressPercent = 100
  let pointsToNextTier: number | null = null
  
  if (nextTier) {
    const range = nextTier.minPoints - currentTier.minPoints
    const progress = tierPointsThisYear - currentTier.minPoints
    progressPercent = Math.min(100, Math.round((progress / range) * 100))
    pointsToNextTier = nextTier.minPoints - tierPointsThisYear
  }
  
  return {
    currentTier,
    nextTier,
    pointsToNextTier,
    progressPercent,
  }
}

export const calculatePointsForVisit = (
  template: string,
  pointsPerVisit: number,
  spentAmount: number,
  pointsPerEuro: number
): number => {
  if (template === 'classic') return pointsPerVisit
  if (template === 'streak_master') return Math.floor(spentAmount * pointsPerEuro)
  return pointsPerVisit
}

export const formatPoints = (points: number): string => {
  return new Intl.NumberFormat('it-IT').format(points)
}
