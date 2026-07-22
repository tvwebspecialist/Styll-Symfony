import { NextRequest, NextResponse } from 'next/server'

import { clearAdminShadowCookieOnResponse } from '@/lib/admin-shadow-cookie'
import {
  GOOGLE_REGISTER_PENDING_COOKIE,
  clearGoogleRegisterPendingCookie,
} from '@/lib/auth/google-register-pending'
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  const businessName = typeof (payload as { businessName?: unknown })?.businessName === 'string'
    ? (payload as { businessName: string }).businessName.trim()
    : ''
  const businessType = typeof (payload as { businessType?: unknown })?.businessType === 'string'
    ? (payload as { businessType: string }).businessType.trim()
    : ''
  const acceptedTerms = (payload as { acceptedTerms?: unknown })?.acceptedTerms === true

  if (businessName.length < 2) {
    return NextResponse.json(
      { error: 'Inserisci il nome della tua attività.' },
      { status: 400 },
    )
  }

  if (!acceptedTerms) {
    return NextResponse.json(
      { error: 'Devi accettare i Termini di Servizio per continuare.' },
      { status: 400 },
    )
  }

  const pendingToken = request.cookies.get(GOOGLE_REGISTER_PENDING_COOKIE)?.value?.trim() ?? ''

  if (!pendingToken) {
    const response = NextResponse.json(
      { error: 'Registrazione Google scaduta. Riprova.' },
      { status: 400 },
    )
    clearGoogleRegisterPendingCookie(response)
    return response
  }

  let finalizeResponse: Response

  try {
    finalizeResponse = await fetch(`${getSymfonyApiBaseUrl()}/api/register/google/finalize`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pending_token: pendingToken,
        business_name: businessName,
        business_type: businessType || undefined,
        accepted_terms: acceptedTerms,
      }),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json(
      { error: 'Symfony Google register non raggiungibile.' },
      { status: 503 },
    )
  }

  if (!finalizeResponse.ok) {
    const backendPayload = await finalizeResponse.json().catch(() => null) as { error?: unknown } | null
    const backendError = typeof backendPayload?.error === 'string'
      ? backendPayload.error
      : 'Registrazione Google non riuscita.'

    const response = NextResponse.json(
      { error: backendError },
      { status: finalizeResponse.status === 400 ? 400 : 502 },
    )

    if (finalizeResponse.status === 400 && /scadut|non valida/i.test(backendError)) {
      clearGoogleRegisterPendingCookie(response)
    }

    return response
  }

  const finalizePayload = await finalizeResponse.json().catch(() => null) as { token?: unknown } | null
  const jwt = typeof finalizePayload?.token === 'string' ? finalizePayload.token.trim() : ''

  if (!jwt) {
    return NextResponse.json(
      { error: 'Symfony Google register non ha restituito un token valido.' },
      { status: 502 },
    )
  }

  let me
  try {
    me = await fetchSymfonyStaffMe({ jwt })
  } catch {
    return NextResponse.json(
      { error: 'JWT Symfony non valido dopo la registrazione Google.' },
      { status: 502 },
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
  clearGoogleRegisterPendingCookie(response)

  return response
}
