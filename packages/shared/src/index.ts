// Shared constants and utilities
export const APP_NAME = 'Styll'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://styll.app'

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  STARTER: 'starter',
  GROWTH: 'growth',
  PRO: 'pro',
} as const

// Tenant slug validation
export const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,50}$/
