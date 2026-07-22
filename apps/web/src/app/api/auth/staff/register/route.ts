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

  const email = typeof (payload as { email?: unknown })?.email === 'string'
    ? (payload as { email: string }).email.trim().toLowerCase()
    : ''
  const password = typeof (payload as { password?: unknown })?.password === 'string'
    ? (payload as { password: string }).password
    : ''
  const fullName = typeof (payload as { fullName?: unknown })?.fullName === 'string'
    ? (payload as { fullName: string }).fullName.trim()
    : ''
  const businessName = typeof (payload as { businessName?: unknown })?.businessName === 'string'
    ? (payload as { businessName: string }).businessName.trim()
    : ''
  const businessType = typeof (payload as { businessType?: unknown })?.businessType === 'string'
    ? (payload as { businessType: string }).businessType.trim()
    : ''

  if (!email || !password || !businessName) {
    return NextResponse.json(
      { error: 'Inserisci email, password e nome attività.' },
      { status: 400 }
    )
  }

  let registerResponse: Response

  try {
    registerResponse = await fetch(`${getSymfonyApiBaseUrl()}/api/register`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName || undefined,
        business_name: businessName,
        business_type: businessType || undefined,
      }),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Symfony register non raggiungibile.' }, { status: 503 })
  }

  if (!registerResponse.ok) {
    const backendPayload = await registerResponse.json().catch(() => null) as { error?: unknown } | null
    const backendError = typeof backendPayload?.error === 'string' ? backendPayload.error : null

    if (registerResponse.status === 400 || registerResponse.status === 409) {
      return NextResponse.json(
        { error: backendError ?? 'Registrazione non valida.' },
        { status: registerResponse.status }
      )
    }

    return NextResponse.json(
      { error: backendError ?? 'Registrazione Symfony non disponibile.' },
      { status: 502 }
    )
  }

  const registerPayload = await registerResponse.json().catch(() => null) as { token?: unknown } | null
  const jwt = typeof registerPayload?.token === 'string' ? registerPayload.token.trim() : ''

  if (!jwt) {
    return NextResponse.json(
      { error: 'Symfony register non ha restituito un token valido.' },
      { status: 502 }
    )
  }

  let me
  try {
    me = await fetchSymfonyStaffMe({ jwt })
  } catch {
    return NextResponse.json(
      { error: 'JWT Symfony non valido dopo la registrazione.' },
      { status: 502 }
    )
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
