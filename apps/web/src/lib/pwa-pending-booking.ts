export const PENDING_BOOKING_KEY = 'styll-pending-booking'
const TTL_MS = 30 * 60 * 1000

export interface PendingBooking {
  slug: string
  tenantId: string
  locationId: string
  staffId: string
  serviceIds: string[]
  date: string
  time: string
  fullName: string
  phone: string
  email: string
  savedAt: number
  pendingAuth: boolean
}

export function savePendingBooking(booking: Omit<PendingBooking, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({ ...booking, savedAt: Date.now() }))
}

export function getPendingBooking(): PendingBooking | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PENDING_BOOKING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingBooking
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(PENDING_BOOKING_KEY)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(PENDING_BOOKING_KEY)
    return null
  }
}

export function clearPendingBooking(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_BOOKING_KEY)
}
