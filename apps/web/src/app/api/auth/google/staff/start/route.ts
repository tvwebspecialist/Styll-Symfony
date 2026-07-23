import { NextResponse } from 'next/server'

import {
  GOOGLE_OAUTH_STATE_COOKIE,
  setGoogleOAuthStateCookie,
} from '@/lib/auth/google-oauth-state'
import { buildRootAppUrl } from '@/lib/auth/urls'
import { getSymfonyApiBaseUrl } from '@/lib/symfony/api-base-url'

interface StartPayload {
  mode?: unknown
  redirectTo?: unknown
  fullName?: unknown
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: StartPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  const mode = payload.mode === 'register' ? 'register' : 'login'
  const redirectTo = typeof payload.redirectTo === 'string' ? payload.redirectTo.trim() : ''
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : ''

  const callbackUrl = buildRootAppUrl('/api/auth/google/callback')

  let backendResponse: Response

  try {
    backendResponse = await fetch(`${getSymfonyApiBaseUrl()}/api/oauth/google/start`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context: mode === 'register' ? 'staff_register' : 'staff_login',
        redirect_uri: callbackUrl,
        redirect_to: redirectTo || undefined,
        full_name: fullName || undefined,
      }),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Symfony Google OAuth non raggiungibile.' }, { status: 503 })
  }

  const backendPayload = await backendResponse.json().catch(() => null) as
    | {
        authorizationUrl?: unknown
        stateToken?: unknown
        stateCookieMaxAge?: unknown
        error?: unknown
      }
    | null

  if (!backendResponse.ok) {
    const backendError = typeof backendPayload?.error === 'string'
      ? backendPayload.error
      : 'Impossibile avviare il login con Google.'

    return NextResponse.json({ error: backendError }, { status: backendResponse.status })
  }

  const authorizationUrl = typeof backendPayload?.authorizationUrl === 'string'
    ? backendPayload.authorizationUrl.trim()
    : ''
  const stateToken = typeof backendPayload?.stateToken === 'string'
    ? backendPayload.stateToken.trim()
    : ''
  const stateCookieMaxAge = typeof backendPayload?.stateCookieMaxAge === 'number'
    ? backendPayload.stateCookieMaxAge
    : 600

  if (!authorizationUrl || !stateToken) {
    return NextResponse.json(
      { error: 'Symfony Google OAuth non ha restituito uno stato valido.' },
      { status: 502 },
    )
  }

  const response = NextResponse.json({
    success: true,
    authorizationUrl,
  })

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  setGoogleOAuthStateCookie(response, stateToken, stateCookieMaxAge)

  return response
}
