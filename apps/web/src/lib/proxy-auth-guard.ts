import { NextResponse, type NextRequest } from 'next/server.js'

import type { CspOptions } from './security/csp'

const PUBLIC_AUTH_BOOTSTRAP_PAGES = ['/login', '/register', '/forgot-password', '/verifica-email']
const LOGIN_REDIRECT_AUTH_PAGES = ['/login', '/register']
const SUPABASE_AUTH_COOKIE_NAME = /^sb-.*-auth-token(?:-code-verifier)?(?:\.\d+)?$/i

function matchesPath(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function isProxyAuthPage(pathname: string): boolean {
  return LOGIN_REDIRECT_AUTH_PAGES.some((route) => matchesPath(pathname, route))
}

export function isPublicAuthBootstrapPath(pathname: string): boolean {
  return PUBLIC_AUTH_BOOTSTRAP_PAGES.some((route) => matchesPath(pathname, route))
}

export function hasPlausibleSupabaseSessionCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => SUPABASE_AUTH_COOKIE_NAME.test(name))
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie.name, cookie.value, cookie)
  }
}

export interface ProxyAuthUser {
  id: string
}

export interface ProxyAuthGuardInput {
  request: NextRequest
  response: NextResponse
  securityOptions: CspOptions
  rootDomain: string
  isSubdomainRequest: boolean
  isPwaRoute: boolean
  isProtected: boolean
  isAdmin: boolean
  isOnboarding: boolean
  isAuthPage: boolean
  isLegacyComplete: boolean
  onboardingCompletePath: string
  shadowCookieValue: string | null
}

export interface ProxyAuthGuardDependencies {
  applySecurityHeaders: (response: NextResponse, securityOptions: CspOptions) => NextResponse
  clearShadowCookie: (response: NextResponse) => void
  getUser: () => Promise<ProxyAuthUser | null>
  getValidatedShadowTenantId: (userId: string, shadowCookieValue: string) => Promise<string | null>
  getIsSuperadmin: (userId: string) => Promise<boolean>
  getOnboardingCompleted: (userId: string) => Promise<boolean>
  getActiveStaffTenantIds: (userId: string, limit: number) => Promise<string[]>
  getTenantSlug: (tenantId: string) => Promise<string | null>
}

export async function applyProxyAuthGuards(
  input: ProxyAuthGuardInput,
  deps: ProxyAuthGuardDependencies
): Promise<NextResponse | null> {
  if (input.isPwaRoute) {
    return null
  }

  const pathname = input.request.nextUrl.pathname
  const cookieNames = input.request.cookies.getAll().map((cookie) => cookie.name)
  const hasSupabaseCookie = hasPlausibleSupabaseSessionCookie(cookieNames)

  if (isPublicAuthBootstrapPath(pathname) && !input.isSubdomainRequest && !hasSupabaseCookie) {
    if (input.shadowCookieValue) {
      deps.clearShadowCookie(input.response)
    }
    return null
  }

  const user = await deps.getUser()

  let shouldClearShadowCookie = false
  if (input.shadowCookieValue) {
    if (!user) {
      shouldClearShadowCookie = true
    } else {
      const shadowTenantId = await deps.getValidatedShadowTenantId(user.id, input.shadowCookieValue)
      shouldClearShadowCookie = !shadowTenantId
    }
  }

  const applyPendingCookieCleanup = (response: NextResponse) => {
    if (shouldClearShadowCookie) {
      deps.clearShadowCookie(response)
    }
  }

  const redirectTo = (url: URL) => {
    const redirectResponse = deps.applySecurityHeaders(
      NextResponse.redirect(url),
      input.securityOptions
    )
    copyResponseCookies(input.response, redirectResponse)
    applyPendingCookieCleanup(redirectResponse)
    return redirectResponse
  }

  const buildTenantRedirect = async (userId: string) => {
    const tenantIds = await deps.getActiveStaffTenantIds(userId, 2)
    if (tenantIds.length === 0) {
      return null
    }

    if (tenantIds.length > 1) {
      const multiUrl = input.request.nextUrl.clone()
      multiUrl.pathname = '/dashboard'
      return redirectTo(multiUrl)
    }

    const tenantSlug = await deps.getTenantSlug(tenantIds[0])
    if (tenantSlug) {
      const redirectUrl = input.request.nextUrl.clone()
      redirectUrl.hostname = `${tenantSlug}-dashboard.${input.rootDomain}`
      redirectUrl.pathname = '/'
      redirectUrl.port = ''
      return redirectTo(redirectUrl)
    }

    const fallbackUrl = input.request.nextUrl.clone()
    fallbackUrl.pathname = '/dashboard'
    return redirectTo(fallbackUrl)
  }

  if (input.isProtected && !user) {
    const proto = input.rootDomain.includes('localhost') ? 'http' : 'https'
    const loginUrl = new URL(`${proto}://${input.rootDomain}/login`)
    loginUrl.searchParams.set('redirectTo', pathname)
    return redirectTo(loginUrl)
  }

  if (input.isAdmin && user) {
    const isSuperadmin = await deps.getIsSuperadmin(user.id)
    if (!isSuperadmin) {
      const url = input.request.nextUrl.clone()
      url.pathname = '/login'
      return redirectTo(url)
    }
  }

  if (input.isOnboarding && !user) {
    const url = input.request.nextUrl.clone()
    url.pathname = '/login'
    return redirectTo(url)
  }

  if (input.isLegacyComplete) {
    const url = input.request.nextUrl.clone()
    url.pathname = user ? '/onboarding/step-1' : '/login'
    return redirectTo(url)
  }

  if (user) {
    const completed = await deps.getOnboardingCompleted(user.id)

    if (
      input.isOnboarding
      && pathname !== input.onboardingCompletePath
      && !input.isSubdomainRequest
    ) {
      const onboardingRedirect = await buildTenantRedirect(user.id)
      if (onboardingRedirect) {
        return onboardingRedirect
      }
    }

    if (input.isAuthPage && !input.isSubdomainRequest) {
      if (completed) {
        const authRedirect = await buildTenantRedirect(user.id)
        if (authRedirect) {
          return authRedirect
        }

        const fallbackUrl = input.request.nextUrl.clone()
        fallbackUrl.pathname = '/dashboard'
        return redirectTo(fallbackUrl)
      }

      const onboardingUrl = input.request.nextUrl.clone()
      onboardingUrl.pathname = '/onboarding/step-1'
      return redirectTo(onboardingUrl)
    }
  }

  applyPendingCookieCleanup(input.response)
  return null
}
