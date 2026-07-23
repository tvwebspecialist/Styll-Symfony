import type { NextResponse } from 'next/server'

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it')
  .trim()
  .replace(/^\./, '')

export const GOOGLE_OAUTH_STATE_COOKIE = 'styll_google_oauth_state'

function getCookieDomain(): string | undefined {
  return process.env.NODE_ENV === 'production'
    ? `.${ROOT_DOMAIN}`
    : undefined
}

function buildStateCookieOptions(maxAge: number) {
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

export function setGoogleOAuthStateCookie(
  response: NextResponse,
  stateToken: string,
  maxAge: number,
) {
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    stateToken,
    buildStateCookieOptions(maxAge),
  )
}

export function clearGoogleOAuthStateCookie(response: NextResponse) {
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    '',
    buildStateCookieOptions(0),
  )
}

export interface GoogleOAuthStatePreview {
  context: string | null
  redirectTo: string | null
  returnTo: string | null
  tenantSlug: string | null
}

export function decodeGoogleOAuthStatePreview(
  stateToken: string | null | undefined,
): GoogleOAuthStatePreview | null {
  const token = stateToken?.trim()
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
      context: readString('context'),
      redirectTo: readString('redirect_to'),
      returnTo: readString('return_to'),
      tenantSlug: readString('tenant_slug'),
    }
  } catch {
    return null
  }
}
