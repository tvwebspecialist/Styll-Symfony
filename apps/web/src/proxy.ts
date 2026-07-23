import { NextResponse, type NextRequest } from 'next/server'

import {
  ADMIN_SHADOW_COOKIE,
  clearAdminShadowCookieOnResponse,
  getValidatedAdminShadowContext,
} from '@/lib/admin-shadow-cookie'
import { applyProxyAuthGuards, isProxyAuthPage, type ProxyAuthUser } from '@/lib/proxy-auth-guard'
import { getPublicTenantSurface, resolveTenantRewrite } from '@/lib/proxy-routing'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getOptionalSymfonyStaffMeFromRequest,
  listSymfonyStaffMemberships,
} from '@/lib/symfony/staff-context'
import type { SymfonyStaffMeDto } from '@/lib/symfony/staff-client'
import { clearSymfonyStaffJwtCookie } from '@/lib/symfony/staff-session'
import { applySecurityHeaders, type CspOptions } from '@/lib/security/csp'

// ─── Subdomain routing ────────────────────────────────────────────────────────

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

// ─── Auth guard (original proxy logic) ───────────────────────────────────────

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const ONBOARDING_PREFIX = '/onboarding'
const ONBOARDING_COMPLETE = '/onboarding/complete'
const LEGACY_COMPLETE = '/register/complete'
const BOOKING_SUCCESS_PATH = /^\/tenant\/app\/([^/]+)\/prenota\/successo$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function buildBookingTokenFailureResponse(
  status: 404 | 410,
  slug: string,
  securityOptions: CspOptions
) {
  const title = 'Dettagli non disponibili'
  const message =
    status === 410
      ? 'Il link di conferma e` scaduto. Richiedi una nuova conferma al salone se ti serve recuperare il riepilogo.'
      : 'Questo link non e` valido oppure non contiene le informazioni necessarie per mostrare la prenotazione.'

  const response = new NextResponse(
    `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; color: #111827; }
      main { max-width: 32rem; margin: 0 auto; padding: 3rem 1rem; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 1.25rem; box-shadow: 0 2px 16px rgba(0,0,0,0.06); }
      h1 { margin: 0 0 .75rem; font-size: 1.75rem; }
      p { margin: 0; line-height: 1.6; color: #4b5563; }
      a { display: inline-flex; margin-top: 1rem; text-decoration: none; background: #111827; color: #fff; padding: .9rem 1.1rem; border-radius: .9rem; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/tenant/app/${slug}">Torna alla home</a>
      </div>
    </main>
  </body>
</html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
  return applySecurityHeaders(response, securityOptions)
}

function getRequestedDashboardSlug(pathname: string): string | null {
  const match = pathname.match(/^\/tenant\/dashboard\/([^/]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function proxy(request: NextRequest) {
  // Resolve tenant rewrite before running auth guards
  const tenantRewriteUrl = resolveTenantRewrite(request, ROOT_DOMAIN)

  // Public tenant surfaces (landing + PWA app) must be embeddable in dashboard
  // previews — anything else stays locked down with `frame-ancestors 'none'`.
  const rewrittenTenantSurface = tenantRewriteUrl?.pathname
    ? getPublicTenantSurface(tenantRewriteUrl.pathname)
    : null
  const directTenantSurface = getPublicTenantSurface(request.nextUrl.pathname)
  const isEmbeddableTenantSurface =
    rewrittenTenantSurface !== null || directTenantSurface !== null

  const securityOptions: CspOptions = {
    allowEmbedding: isEmbeddableTenantSurface,
    isDev: process.env.NODE_ENV === 'development',
    rootDomain: ROOT_DOMAIN,
  }

  // On subdomain requests, skip auth-page redirects to avoid redirect loops.
  // Auth is enforced by the tenant layout itself.
  const isSubdomainRequest = tenantRewriteUrl !== null

  const { pathname } = request.nextUrl

  // PWA client routes manage their own auth client-side.
  // Server-side redirects from middleware exit iOS standalone mode, so we skip
  // ALL auth logic for PWA routes — including getUser() (avoids latency + 302s).
  const isPwaRoute = pathname.startsWith('/tenant/app/')
    || tenantRewriteUrl?.pathname.startsWith('/tenant/app/') === true

  const successPathname = tenantRewriteUrl?.pathname ?? pathname
  const successMatch = successPathname.match(BOOKING_SUCCESS_PATH)
  if (successMatch) {
    const slug = successMatch[1]
    const appointmentId = request.nextUrl.searchParams.get('appointment')
    const token = request.nextUrl.searchParams.get('token')

    if (!appointmentId || !UUID_PATTERN.test(appointmentId) || !token) {
      return buildBookingTokenFailureResponse(404, slug, securityOptions)
    }

    const db = createAdminClient()
    const { data: tenant } = await db
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (!tenant?.id) {
      return buildBookingTokenFailureResponse(404, slug, securityOptions)
    }

    const tokenHash = await sha256Hex(token)
    const { data: appointment } = await db
      .from('appointments')
      .select('booking_confirmation_token_expires_at')
      .eq('id', appointmentId)
      .eq('tenant_id', tenant.id)
      .eq('booking_confirmation_token_hash', tokenHash)
      .is('deleted_at', null)
      .maybeSingle()

    if (!appointment) {
      return buildBookingTokenFailureResponse(404, slug, securityOptions)
    }

    const expiresAt = appointment.booking_confirmation_token_expires_at
    if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
      return buildBookingTokenFailureResponse(404, slug, securityOptions)
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      return buildBookingTokenFailureResponse(404, slug, securityOptions)
    }
  }

  const response = applySecurityHeaders(NextResponse.next({ request }), securityOptions)

  if (!isPwaRoute) {
    const shadowCookieValue = request.cookies.get(ADMIN_SHADOW_COOKIE)?.value ?? null
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
    const isAdmin = pathname.startsWith('/admin')
    const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX)
    const isAuthPage = isProxyAuthPage(pathname) && pathname !== LEGACY_COMPLETE

    let adminDb: ReturnType<typeof createAdminClient> | null = null
    let symfonyStaffMePromise: Promise<SymfonyStaffMeDto | null> | null = null

    const getAdminDb = () => {
      if (adminDb) return adminDb
      adminDb = createAdminClient()
      return adminDb
    }

    const getSymfonyStaffMe = async () => {
      if (symfonyStaffMePromise) {
        return symfonyStaffMePromise
      }

      const requestedTenantSlug = getRequestedDashboardSlug(tenantRewriteUrl?.pathname ?? pathname)

      symfonyStaffMePromise = getOptionalSymfonyStaffMeFromRequest(
        request,
        requestedTenantSlug,
      ).catch((error) => {
        clearSymfonyStaffJwtCookie(response)
        return Promise.reject(error)
      })

      return symfonyStaffMePromise
    }

    const guardResponse = await applyProxyAuthGuards(
      {
        request,
        response,
        securityOptions,
        rootDomain: ROOT_DOMAIN,
        isSubdomainRequest,
        isPwaRoute,
        isProtected,
        isAdmin,
        isOnboarding,
        isAuthPage,
        isLegacyComplete: pathname === LEGACY_COMPLETE,
        onboardingCompletePath: ONBOARDING_COMPLETE,
        shadowCookieValue,
      },
      {
        applySecurityHeaders,
        clearShadowCookie: clearAdminShadowCookieOnResponse,
        getUser: async (): Promise<ProxyAuthUser | null> => {
          const me = await getSymfonyStaffMe()
          return me ? { id: me.user.id } : null
        },
        getValidatedShadowTenantId: async (userId, rawShadowCookieValue) => {
          const shadowCtx = await getValidatedAdminShadowContext(
            getAdminDb(),
            userId,
            rawShadowCookieValue
          )
          return shadowCtx.tenantId
        },
        getIsSuperadmin: async (userId) => {
          const { data: adminProfile } = await getAdminDb()
            .from('profiles')
            .select('is_superadmin')
            .eq('id', userId)
            .maybeSingle()

          return !!(adminProfile as { is_superadmin?: boolean } | null)?.is_superadmin
        },
        getOnboardingCompleted: async (userId) => {
          const me = await getSymfonyStaffMe()
          return me?.user.id === userId ? me.profile.onboardingCompleted : false
        },
        getActiveStaffTenantIds: async (userId, limit) => {
          const me = await getSymfonyStaffMe()
          if (!me || me.user.id !== userId) {
            return []
          }

          return listSymfonyStaffMemberships(me)
            .slice(0, limit)
            .map((membership) => membership.tenant.id)
        },
        getTenantSlug: async (tenantId) => {
          const me = await getSymfonyStaffMe()
          const membership = listSymfonyStaffMemberships(me)
            .find((entry) => entry.tenant.id === tenantId)
          if (membership) {
            return membership.tenant.slug
          }

          const { data: tenantRow } = await getAdminDb()
            .from('tenants')
            .select('slug')
            .eq('id', tenantId)
            .maybeSingle()

          return tenantRow?.slug ?? null
        },
      }
    )

    if (guardResponse) {
      return guardResponse
    }
  }

  // Apply subdomain rewrite, carrying over Supabase session cookies
  if (tenantRewriteUrl) {
    const rewriteResponse = applySecurityHeaders(
      NextResponse.rewrite(tenantRewriteUrl),
      securityOptions
    )
    response.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return rewriteResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|gif|webp)$).*)',
  ],
}
