import type { Database } from './database'

export type LoyaltyConfig = Database['public']['Tables']['loyalty_configs']['Row']
export type Reward = Database['public']['Tables']['rewards']['Row']
export type ClientLoyalty = Database['public']['Tables']['client_loyalty']['Row']
export type LoyaltyTransaction = Database['public']['Tables']['loyalty_transactions']['Row']
export type RewardRedemption = Database['public']['Tables']['reward_redemptions']['Row']

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type LoyaltyTemplate = 'classic' | 'streak_master' | 'vip_club'
export type TransactionType = 'earn' | 'redeem' | 'bonus' | 'import' | 'expire' | 'adjustment'

export interface TierThreshold {
  tier: LoyaltyTier
  minPoints: number
  label: string
  emoji: string
  color: string
}

export const TIER_THRESHOLDS: TierThreshold[] = [
  { tier: 'bronze', minPoints: 0, label: 'Bronzo', emoji: '🥉', color: '#CD7F32' },
  { tier: 'silver', minPoints: 500, label: 'Argento', emoji: '🥈', color: '#C0C0C0' },
  { tier: 'gold', minPoints: 2000, label: 'Oro', emoji: '🥇', color: '#FFD700' },
  { tier: 'platinum', minPoints: 5000, label: 'Platino', emoji: '💎', color: '#E5E4E2' },
]

export interface LoyaltyProgress {
  currentTier: TierThreshold
  nextTier: TierThreshold | null
  pointsToNextTier: number | null
  progressPercent: number
}
