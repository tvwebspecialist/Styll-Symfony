// Staff roles
export const STAFF_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
  RECEPTIONIST: 'receptionist',
} as const

export type StaffRoleValue = typeof STAFF_ROLES[keyof typeof STAFF_ROLES]

// Roles with management permissions
export const MANAGER_ROLES = [STAFF_ROLES.OWNER, STAFF_ROLES.MANAGER] as const

// Appointment statuses
export const APPOINTMENT_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  PENDING: 'pending',
} as const

// Marketing segmentation thresholds
export const MARKETING = {
  WINBACK_MULTIPLIER: 3,
  LOST_THRESHOLD_DAYS: 50,
  TOP_CLIENT_VISITS: 10,
} as const

// Dashboard hour bounds
export const DASHBOARD_HOURS = {
  SLOT_START: 8,
  SLOT_END: 19,
  RANGE_START: 9,
  RANGE_END: 18,
} as const

// Default timezone fallback
export const DEFAULT_TIMEZONE = 'Europe/Rome'
