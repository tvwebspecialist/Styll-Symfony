import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import {
  ADMIN_SHADOW_COOKIE,
  clearAdminShadowCookieOnResponse,
  getValidatedAdminShadowContext,
} from '@/lib/admin-shadow-cookie'
import { createAdminClient } from '@/lib/supabase/admin'
import { applySecurityHeaders, type CspOptions } from '@/lib/security/csp'

// ─── Subdomain routing ────────────────────────────────────────────────────────

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
const SKIP_SUBDOMAINS = new Set(['www', 'admin'])

type TenantType = 'landing' | 'app' | 'dashboard'
type PublicTenantSurface = 'landing' | 'app'

function parseTenant(subdomain: string): { type: TenantType; slug: string } | null {
  if (subdomain.endsWith('-dashboard')) {
    const slug = subdomain.slice(0, -'-dashboard'.length)
    if (!slug) return null
    return { type: 'dashboard', slug }
  }
  if (subdomain.endsWith('-app')) {
    const slug = subdomain.slice(0, -'-app'.length)
    if (!slug) return null
    return { type: 'app', slug }
  }
  return { type: 'landing', slug: subdomain }
}

function getSubdomain(host: string): string | null {
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    return host.slice(0, -(ROOT_DOMAIN.length + 1))
  }
  if (host.endsWith('.localhost:3000')) {
    return host.slice(0, -'.localhost:3000'.length)
  }
  return null
}

function resolveTenantRewrite(request: NextRequest): URL | null {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // Non riscrivere le route API — sono globali, non tenant-specific
  if (pathname.startsWith('/api/')) return null

  const subdomain = getSubdomain(host)

  if (subdomain && !SKIP_SUBDOMAINS.has(subdomain)) {
    const parsed = parseTenant(subdomain)
    if (parsed) {
      const url = request.nextUrl.clone()
      url.pathname = `/tenant/${parsed.type}/${parsed.slug}${pathname}`
      return url
    }
  }

  // Dev localhost query-param fallback
  if (process.env.NODE_ENV === 'development' && host === 'localhost:3000') {
    const tenantSlug = request.nextUrl.searchParams.get('_tenant_slug')
    const tenantType = request.nextUrl.searchParams.get('_tenant_type') as TenantType | null
    if (tenantSlug && tenantType && ['landing', 'app', 'dashboard'].includes(tenantType)) {
      const url = request.nextUrl.clone()
      url.pathname = `/tenant/${tenantType}/${tenantSlug}${pathname}`
      url.searchParams.delete('_tenant_slug')
      url.searchParams.delete('_tenant_type')
      return url
    }
  }

  return null
}

function getPublicTenantSurface(pathname: string): PublicTenantSurface | null {
  const match = pathname.match(/^\/tenant\/(landing|app)\/[^/]+/)
  return (match?.[1] as PublicTenantSurface | undefined) ?? null
}

// ─── Auth guard (original proxy logic) ───────────────────────────────────────

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const AUTH_PAGES = ['/login', '/register']
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function proxy(request: NextRequest) {
  // Resolve tenant rewrite before running auth guards
  const tenantRewriteUrl = resolveTenantRewrite(request)

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
  let shouldClearShadowCookie = false

  if (!isPwaRoute) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(
            cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
          ) {
            const cookieDomain =
              process.env.NODE_ENV === 'production' ? `.${ROOT_DOMAIN}` : undefined
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              })
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const shadowCookieValue = request.cookies.get(ADMIN_SHADOW_COOKIE)?.value ?? null

    if (shadowCookieValue) {
      if (!user) {
        shouldClearShadowCookie = true
      } else {
        const db = createAdminClient()
        const shadowCtx = await getValidatedAdminShadowContext(db, user.id, shadowCookieValue)
        shouldClearShadowCookie = !shadowCtx.tenantId
      }
    }

    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
    const isAdmin = pathname.startsWith('/admin')
    const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX)
    const isAuthPage =
      AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
      pathname !== LEGACY_COMPLETE

    // Helper: attach CSP to redirect responses so the header is consistent
    // across the whole proxy surface (browsers don't enforce CSP on 30x bodies,
    // but this keeps audits and curl checks tidy).
    const redirectTo = (url: URL) => {
      const redirectResponse = applySecurityHeaders(NextResponse.redirect(url), securityOptions)
      if (shouldClearShadowCookie) {
        clearAdminShadowCookieOnResponse(redirectResponse)
      }
      return redirectResponse
    }

    // Rotte protette: richiedono auth
    if (isProtected && !user) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN!
      const proto = rootDomain.includes('localhost') ? 'http' : 'https'
      const loginUrl = new URL(`${proto}://${rootDomain}/login`)
      loginUrl.searchParams.set('redirectTo', pathname)
      return redirectTo(loginUrl)
    }

    // /admin/*: richiede superadmin
    if (isAdmin && user) {
      const db = createAdminClient()
      const { data: adminProfile } = await db
        .from('profiles')
        .select('is_superadmin')
        .eq('id', user.id)
        .maybeSingle()
      if (!(adminProfile as { is_superadmin?: boolean } | null)?.is_superadmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return redirectTo(url)
      }
    }

    // /onboarding/*: richiede auth
    if (isOnboarding && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return redirectTo(url)
    }

    // Legacy /register/complete → /onboarding/step-1
    if (pathname === LEGACY_COMPLETE) {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/onboarding/step-1' : '/login'
      return redirectTo(url)
    }

    // Utente loggato: gating onboarding
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      const completed = !!profile?.onboarding_completed

      // Do NOT block /dashboard based solely on onboarding_completed — that flag
      // can be null for tenants created before the flag existed. dashboard/layout.tsx
      // is the authoritative gate: it checks staff_members and redirects correctly.

      // If the user is on an onboarding step, check whether they already have an
      // active tenant. Both `completed=true` (normal case) and `completed=false` with
      // existing staff_members (flag missing or stale) should be redirected away so
      // existing tenants never see the wizard again.
      if (isOnboarding && pathname !== ONBOARDING_COMPLETE && !isSubdomainRequest) {
        const db = createAdminClient()
        const { data: staffRows } = await db
          .from('staff_members')
          .select('tenant_id')
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(2)
        if (staffRows && staffRows.length > 0) {
          if (staffRows.length > 1) {
            // Multi-tenant: delegate to dashboard/layout.tsx which routes to /select-tenant
            const multiUrl = request.nextUrl.clone()
            multiUrl.pathname = '/dashboard'
            return redirectTo(multiUrl)
          }
          const { data: tenantRow } = await db
            .from('tenants')
            .select('slug')
            .eq('id', staffRows[0].tenant_id)
            .maybeSingle()
          if (tenantRow?.slug) {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.hostname = `${tenantRow.slug}-dashboard.${rootDomain}`
            redirectUrl.pathname = '/'
            redirectUrl.port = ''
            return redirectTo(redirectUrl)
          }
          const fallbackUrl = request.nextUrl.clone()
          fallbackUrl.pathname = '/dashboard'
          return redirectTo(fallbackUrl)
        }
      }

      if (isAuthPage && !isSubdomainRequest) {
        if (completed) {
          const db = createAdminClient()
          const { data: staffRows } = await db
            .from('staff_members')
            .select('tenant_id')
            .eq('profile_id', user.id)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(2)
          if (staffRows && staffRows.length > 1) {
            // Multi-tenant: delegate to dashboard/layout.tsx which routes to /select-tenant
            const multiUrl = request.nextUrl.clone()
            multiUrl.pathname = '/dashboard'
            return redirectTo(multiUrl)
          }
          if (staffRows && staffRows.length === 1) {
            const { data: tenantRow } = await db
              .from('tenants')
              .select('slug')
              .eq('id', staffRows[0].tenant_id)
              .maybeSingle()
            if (tenantRow?.slug) {
              const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
              const redirectUrl = request.nextUrl.clone()
              redirectUrl.hostname = `${tenantRow.slug}-dashboard.${rootDomain}`
              redirectUrl.pathname = '/'
              redirectUrl.port = ''
              return redirectTo(redirectUrl)
            }
          }
          const fallbackUrl = request.nextUrl.clone()
          fallbackUrl.pathname = '/dashboard'
          return redirectTo(fallbackUrl)
        } else {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding/step-1'
          return redirectTo(url)
        }
      }
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
    if (shouldClearShadowCookie) {
      clearAdminShadowCookieOnResponse(rewriteResponse)
    }
    return rewriteResponse
  }

  if (shouldClearShadowCookie) {
    clearAdminShadowCookieOnResponse(response)
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|gif|webp)$).*)',
  ],
}
