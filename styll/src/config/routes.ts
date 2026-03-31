// Centralized route definitions
export const ROUTES = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },

  // Admin
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    TENANTS: '/admin/tenants',
    TENANT_DETAIL: (id: string) => `/admin/tenants/${id}`,
    ANALYTICS: '/admin/analytics',
  },

  // Barber Dashboard
  DASHBOARD: {
    ROOT: '/dashboard',
    HOME: '/dashboard/home',
    CALENDAR: '/dashboard/calendar',
    CLIENTS: '/dashboard/clients',
    CLIENT_DETAIL: (id: string) => `/dashboard/clients/${id}`,
    SERVICES: '/dashboard/services',
    PRODUCTS: '/dashboard/products',
    LOYALTY: '/dashboard/loyalty',
    MESSAGES: '/dashboard/messages',
    ANALYTICS: '/dashboard/analytics',
    STAFF: '/dashboard/staff',
    SETTINGS: '/dashboard/settings',
    PROMOTE: '/dashboard/promote',
  },

  // Client PWA (tenant-specific)
  CLIENT: {
    LANDING: (slug: string) => `/${slug}`,
    BOOKING: (slug: string) => `/${slug}/booking`,
    MY_BOOKINGS: (slug: string) => `/${slug}/bookings`,
    LOYALTY: (slug: string) => `/${slug}/loyalty`,
    PROFILE: (slug: string) => `/${slug}/profile`,
    REWARDS: (slug: string) => `/${slug}/rewards`,
  },
}
