import { NextResponse, type NextRequest } from 'next/server'

import { setupPwaGoogleClientForResolvedUser } from '@/lib/actions/pwa-auth'
import { clearAdminShadowCookieOnResponse } from '@/lib/admin-shadow-cookie'
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  clearGoogleOAuthStateCookie,
  decodeGoogleOAuthStatePreview,
} from '@/lib/auth/google-oauth-state'
import { buildRootAppUrl, buildTenantAppUrl, sanitizeAppRelativePath } from '@/lib/auth/urls'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchSymfonyStaffMe } from '@/lib/symfony/staff-client'
import { getSymfonyApiBaseUrl } from '@/lib/symfony/api-base-url'
import { setSymfonyStaffJwtCookie } from '@/lib/symfony/staff-session'
import { IMPERSONATE_STAFF_COOKIE } from '@/lib/tenant-context'

function clearStaffImpersonationCookie(response: NextResponse) {
  response.cookies.set(IMPERSONATE_STAFF_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

function redirectWithCleanup(url: string, clearState: boolean = true): NextResponse {
  const response = NextResponse.redirect(url)
  clearAdminShadowCookieOnResponse(response)
  if (clearState) {
    clearGoogleOAuthStateCookie(response)
  }
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function buildFailureRedirect(
  preview: ReturnType<typeof decodeGoogleOAuthStatePreview>,
  errorMessage: string,
): NextResponse {
  if (preview?.context === 'pwa' && preview.tenantSlug) {
    const accessUrl = new URL(buildTenantAppUrl(preview.tenantSlug, '/accesso'))
    accessUrl.searchParams.set('error', 'oauth_failed')
    return redirectWithCleanup(accessUrl.toString())
  }

  if (preview?.context === 'staff_register') {
    const registerUrl = new URL(buildRootAppUrl('/register'))
    registerUrl.searchParams.set('error', errorMessage)
    return redirectWithCleanup(registerUrl.toString())
  }

  const loginUrl = new URL(buildRootAppUrl('/login'))
  loginUrl.searchParams.set('error', errorMessage)
  if (preview?.redirectTo) {
    loginUrl.searchParams.set('redirectTo', preview.redirectTo)
  }
  return redirectWithCleanup(loginUrl.toString())
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')?.trim() ?? ''
  const state = url.searchParams.get('state')?.trim() ?? ''
  const oauthError = url.searchParams.get('error_description')?.trim()
    || url.searchParams.get('error')?.trim()
    || ''
  const stateCookie = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value?.trim() ?? ''
  const preview = decodeGoogleOAuthStatePreview(stateCookie || state)

  if (oauthError) {
    return buildFailureRedirect(preview, oauthError)
  }

  if (!code || !state || !stateCookie) {
    return buildFailureRedirect(preview, 'Flusso Google non valido o scaduto. Riprova.')
  }

  const callbackUrl = buildRootAppUrl('/api/auth/google/callback')

  let backendResponse: Response
  try {
    backendResponse = await fetch(`${getSymfonyApiBaseUrl()}/api/oauth/google/complete`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
        state_cookie: stateCookie,
        redirect_uri: callbackUrl,
      }),
      cache: 'no-store',
    })
  } catch {
    return buildFailureRedirect(preview, 'Symfony Google OAuth non raggiungibile.')
  }

  const backendPayload = await backendResponse.json().catch(() => null) as
    | {
        context?: unknown
        token?: unknown
        redirectTo?: unknown
        tenantSlug?: unknown
        returnTo?: unknown
        googleIdToken?: unknown
        googleAccessToken?: unknown
        error?: unknown
      }
    | null

  if (!backendResponse.ok) {
    const backendError = typeof backendPayload?.error === 'string'
      ? backendPayload.error
      : 'Accesso con Google non riuscito. Riprova.'

    return buildFailureRedirect(preview, backendError)
  }

  const context = typeof backendPayload?.context === 'string' ? backendPayload.context : ''

  if (context === 'staff') {
    const jwt = typeof backendPayload?.token === 'string' ? backendPayload.token.trim() : ''
    const redirectTo = typeof backendPayload?.redirectTo === 'string'
      ? backendPayload.redirectTo.trim()
      : '/dashboard'

    if (!jwt) {
      return buildFailureRedirect(preview, 'Google OAuth staff non ha restituito un token valido.')
    }

    try {
      await fetchSymfonyStaffMe({ jwt })
    } catch {
      return buildFailureRedirect(preview, 'JWT Symfony non valido dopo il login Google.')
    }

    const response = redirectWithCleanup(buildRootAppUrl(redirectTo))
    setSymfonyStaffJwtCookie(response, jwt)
    clearStaffImpersonationCookie(response)
    return response
  }

  if (context === 'pwa') {
    const tenantSlug = typeof backendPayload?.tenantSlug === 'string'
      ? backendPayload.tenantSlug.trim()
      : ''
    const returnTo = typeof backendPayload?.returnTo === 'string'
      ? backendPayload.returnTo.trim()
      : '/profilo'
    const googleIdToken = typeof backendPayload?.googleIdToken === 'string'
      ? backendPayload.googleIdToken.trim()
      : ''
    const googleAccessToken = typeof backendPayload?.googleAccessToken === 'string'
      ? backendPayload.googleAccessToken.trim()
      : ''

    if (!tenantSlug || !googleIdToken || !googleAccessToken) {
      return buildFailureRedirect(preview, 'Google OAuth PWA non ha restituito i dati necessari.')
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleIdToken,
      access_token: googleAccessToken,
    })

    if (error || !data.user) {
      return buildFailureRedirect(preview, 'Sessione PWA Google non disponibile. Riprova.')
    }

    const adminDb = createAdminClient()
    const { data: tenant } = await adminDb
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .eq('status', 'active')
      .maybeSingle()

    if (!tenant?.id) {
      return buildFailureRedirect(preview, 'Salone non valido o non disponibile.')
    }

    const bootstrap = await setupPwaGoogleClientForResolvedUser(tenant.id, {
      id: data.user.id,
      email: data.user.email ?? null,
      fullName: typeof data.user.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name
        : null,
    })

    if (!bootstrap.success) {
      await supabase.auth.signOut().catch(() => {})
      return buildFailureRedirect(preview, bootstrap.error ?? 'Bootstrap cliente Google non riuscito.')
    }

    const safePath = sanitizeAppRelativePath(returnTo, '/profilo')
    const destination = new URL(buildTenantAppUrl(tenantSlug, safePath))
    destination.searchParams.set('google_login', '1')

    return redirectWithCleanup(destination.toString())
  }

  return buildFailureRedirect(preview, 'Contesto Google OAuth non supportato.')
}
