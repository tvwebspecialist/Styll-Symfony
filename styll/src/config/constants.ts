// User roles
export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
  RECEPTIONIST: 'receptionist',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export const USER_TYPES = {
  STAFF: 'staff',
  CLIENT: 'client',
  ADMIN: 'admin',
} as const

export type UserType = typeof USER_TYPES[keyof typeof USER_TYPES]

// Appointment statuses
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS]

// Booking sources
export const BOOKING_SOURCE = {
  PWA: 'pwa',
  DASHBOARD_STAFF: 'dashboard_staff',
  DASHBOARD_RECEPTIONIST: 'dashboard_receptionist',
  DASHBOARD_OWNER: 'dashboard_owner',
  WALK_IN: 'walk_in',
} as const

// Subscription states
export const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const

// Loyalty tiers
export const LOYALTY_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
} as const

export type LoyaltyTier = typeof LOYALTY_TIERS[keyof typeof LOYALTY_TIERS]

// Churn statuses
export const CHURN_STATUS = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
} as const

export type ChurnStatus = typeof CHURN_STATUS[keyof typeof CHURN_STATUS]

// Loyalty transaction types
export const LOYALTY_TRANSACTION_TYPE = {
  EARN: 'earn',
  REDEEM: 'redeem',
  BONUS: 'bonus',
  IMPORT: 'import',
  EXPIRE: 'expire',
  ADJUSTMENT: 'adjustment',
} as const

// Loyalty templates
export const LOYALTY_TEMPLATES = {
  CLASSIC: 'classic',
  STREAK_MASTER: 'streak_master',
  VIP_CLUB: 'vip_club',
} as const

// Payment methods
export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD_TERMINAL: 'card_terminal',
  STRIPE_ONLINE: 'stripe_online',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
} as const

// Reward types
export const REWARD_TYPE = {
  PRODUCT: 'product',
  SERVICE: 'service',
  DISCOUNT: 'discount',
  CUSTOM: 'custom',
} as const

// Message channels
export const MESSAGE_CHANNEL = {
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  PUSH: 'push',
} as const

// Days of the week
export const DAYS_OF_WEEK = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
] as const

// Subscription plan slugs
export const PLAN_SLUGS = {
  STARTER: 'starter',
  GROWTH: 'growth',
  PRO: 'pro',
} as const

// Default feature flags per plan
export const DEFAULT_FEATURE_FLAGS = {
  starter: {
    bookings: true,
    loyalty_basic: true,
    churn_detector: true,
    gamification: false,
    qr_walkin: false,
    win_back_auto: false,
    ai_coach: false,
    multi_location: false,
  },
  growth: {
    bookings: true,
    loyalty_basic: true,
    churn_detector: true,
    gamification: true,
    qr_walkin: true,
    win_back_auto: true,
    ai_coach: false,
    multi_location: false,
  },
  pro: {
    bookings: true,
    loyalty_basic: true,
    churn_detector: true,
    gamification: true,
    qr_walkin: true,
    win_back_auto: true,
    ai_coach: true,
    multi_location: true,
  },
}

// Tier emoji and labels
export const TIER_INFO = {
  bronze: { emoji: '🥉', label: 'Bronzo', color: '#CD7F32' },
  silver: { emoji: '🥈', label: 'Argento', color: '#C0C0C0' },
  gold: { emoji: '🥇', label: 'Oro', color: '#FFD700' },
  platinum: { emoji: '💎', label: 'Platino', color: '#E5E4E2' },
} as const

// Churn indicator info
export const CHURN_INFO = {
  green: { emoji: '🟢', label: 'Regolare', color: '#22C55E' },
  yellow: { emoji: '🟡', label: 'A rischio', color: '#EAB308' },
  red: { emoji: '🔴', label: 'In fuga', color: '#EF4444' },
} as const
