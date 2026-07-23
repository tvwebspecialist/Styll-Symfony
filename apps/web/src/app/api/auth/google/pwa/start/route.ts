import { NextResponse } from 'next/server'

import { setGoogleOAuthStateCookie } from '@/lib/auth/google-oauth-state'
import { buildRootAppUrl } from '@/lib/auth/urls'
import { getSymfonyApiBaseUrl } from '@/lib/symfony/api-base-url'

interface StartPayload {
  tenantSlug?: unknown
  returnTo?: unknown
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: StartPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  const tenantSlug = typeof payload.tenantSlug === 'string' ? payload.tenantSlug.trim() : ''
  const returnTo = typeof payload.returnTo === 'string' ? payload.returnTo.trim() : ''

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant non valido.' }, { status: 400 })
  }

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
        context: 'pwa',
        redirect_uri: callbackUrl,
        tenant_slug: tenantSlug,
        return_to: returnTo || undefined,
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
      : 'Impossibile avviare l’accesso con Google.'

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

  setGoogleOAuthStateCookie(response, stateToken, stateCookieMaxAge)

  return response
}
