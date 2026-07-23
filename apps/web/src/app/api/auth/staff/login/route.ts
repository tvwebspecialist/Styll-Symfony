import { NextResponse } from 'next/server'

import { clearAdminShadowCookieOnResponse } from '@/lib/admin-shadow-cookie'
import { IMPERSONATE_STAFF_COOKIE } from '@/lib/tenant-context'
import { getSymfonyApiBaseUrl } from '@/lib/symfony/api-base-url'
import { fetchSymfonyStaffMe } from '@/lib/symfony/staff-client'
import { listSymfonyStaffMemberships } from '@/lib/symfony/staff-context'
import { setSymfonyStaffJwtCookie } from '@/lib/symfony/staff-session'

function clearStaffImpersonationCookie(response: NextResponse) {
  response.cookies.set(IMPERSONATE_STAFF_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  const rawEmail = typeof (payload as { email?: unknown })?.email === 'string'
    ? (payload as { email: string }).email
    : ''
  const rawPassword = typeof (payload as { password?: unknown })?.password === 'string'
    ? (payload as { password: string }).password
    : ''

  const email = rawEmail.trim().toLowerCase()
  const password = rawPassword

  if (!email || !password) {
    return NextResponse.json({ error: 'Inserisci email e password.' }, { status: 400 })
  }

  let loginResponse: Response

  try {
    loginResponse = await fetch(`${getSymfonyApiBaseUrl()}/api/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Symfony auth non raggiungibile.' }, { status: 503 })
  }

  if (!loginResponse.ok) {
    const status = loginResponse.status === 401 ? 401 : 502
    return NextResponse.json(
      {
        error: loginResponse.status === 401
          ? 'Email o password non corretti'
          : 'Login Symfony non disponibile.',
      },
      { status }
    )
  }

  const loginPayload = await loginResponse.json().catch(() => null) as { token?: unknown } | null
  const jwt = typeof loginPayload?.token === 'string' ? loginPayload.token.trim() : ''

  if (!jwt) {
    return NextResponse.json({ error: 'Symfony login non ha restituito un token valido.' }, { status: 502 })
  }

  let me
  try {
    me = await fetchSymfonyStaffMe({ jwt })
  } catch {
    return NextResponse.json({ error: 'JWT Symfony non valido dopo il login.' }, { status: 502 })
  }

  const response = NextResponse.json({
    success: true,
    currentTenantSlug: me.currentTenant?.tenant.slug ?? null,
    tenantCount: listSymfonyStaffMemberships(me).length,
  })

  setSymfonyStaffJwtCookie(response, jwt)
  clearAdminShadowCookieOnResponse(response)
  clearStaffImpersonationCookie(response)

  return response
}
