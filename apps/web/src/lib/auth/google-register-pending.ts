import type { NextResponse } from 'next/server'

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it')
  .trim()
  .replace(/^\./, '')

export const GOOGLE_REGISTER_PENDING_COOKIE = 'styll_google_register_pending'
export const GOOGLE_REGISTER_PENDING_MAX_AGE = 60 * 30

function getCookieDomain(): string | undefined {
  return process.env.NODE_ENV === 'production'
    ? `.${ROOT_DOMAIN}`
    : undefined
}

function buildPendingCookieOptions(maxAge: number) {
  const domain = getCookieDomain()

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
    ...(domain ? { domain } : {}),
  }
}

export function setGoogleRegisterPendingCookie(
  response: NextResponse,
  pendingToken: string,
  maxAge: number = GOOGLE_REGISTER_PENDING_MAX_AGE,
) {
  response.cookies.set(
    GOOGLE_REGISTER_PENDING_COOKIE,
    pendingToken,
    buildPendingCookieOptions(maxAge),
  )
}

export function clearGoogleRegisterPendingCookie(response: NextResponse) {
  response.cookies.set(
    GOOGLE_REGISTER_PENDING_COOKIE,
    '',
    buildPendingCookieOptions(0),
  )
}

export interface GoogleRegisterPendingPreview {
  email: string | null
  fullName: string | null
}

export function decodeGoogleRegisterPendingPreview(
  pendingToken: string | null | undefined,
): GoogleRegisterPendingPreview | null {
  const token = pendingToken?.trim()
  if (!token) {
    return null
  }

  const payloadSegment = token.split('.', 1)[0]
  if (!payloadSegment) {
    return null
  }

  try {
    const padded = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = padded + '='.repeat((4 - (padded.length % 4)) % 4)
    const decoded = Buffer.from(normalized, 'base64').toString('utf8')
    const payload = JSON.parse(decoded) as Record<string, unknown>

    const readString = (key: string): string | null => {
      const value = payload[key]
      return typeof value === 'string' && value.trim() ? value.trim() : null
    }

    return {
      email: readString('email'),
      fullName: readString('full_name'),
    }
  } catch {
    return null
  }
}
