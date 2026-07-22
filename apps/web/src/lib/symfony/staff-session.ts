import type { NextResponse } from 'next/server'

import { SYMFONY_STAFF_JWT_COOKIE } from './staff-client.ts'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
export const SYMFONY_STAFF_JWT_MAX_AGE = 60 * 60

function getSymfonyStaffJwtCookieDomain(): string | undefined {
  return process.env.NODE_ENV === 'production'
    ? `.${ROOT_DOMAIN}`
    : undefined
}

export function buildSymfonyStaffJwtCookieOptions(maxAge: number = SYMFONY_STAFF_JWT_MAX_AGE) {
  const domain = getSymfonyStaffJwtCookieDomain()

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
    ...(domain ? { domain } : {}),
  }
}

export function setSymfonyStaffJwtCookie(
  response: NextResponse,
  jwt: string,
  maxAge: number = SYMFONY_STAFF_JWT_MAX_AGE
) {
  response.cookies.set(SYMFONY_STAFF_JWT_COOKIE, jwt, buildSymfonyStaffJwtCookieOptions(maxAge))
}

export function clearSymfonyStaffJwtCookie(response: NextResponse) {
  response.cookies.set(SYMFONY_STAFF_JWT_COOKIE, '', buildSymfonyStaffJwtCookieOptions(0))
}

export function clearSymfonyStaffJwtCookieInStore(
  cookieStore: { set: (name: string, value: string, options?: Record<string, unknown>) => void }
) {
  cookieStore.set(SYMFONY_STAFF_JWT_COOKIE, '', buildSymfonyStaffJwtCookieOptions(0))
}
