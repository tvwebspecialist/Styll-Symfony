import { createHash, randomBytes } from 'crypto'

export const BOOKING_CONFIRMATION_TOKEN_TTL_MS = 30 * 60 * 1000

export function createBookingConfirmationToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashBookingConfirmationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildBookingConfirmationTokenExpiresAt(now: number = Date.now()): string {
  return new Date(now + BOOKING_CONFIRMATION_TOKEN_TTL_MS).toISOString()
}

export function isBookingConfirmationTokenExpired(
  expiresAt: string | null,
  now: number = Date.now()
): boolean {
  if (!expiresAt) {
    return true
  }

  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) {
    return true
  }

  return expiry.getTime() <= now
}
