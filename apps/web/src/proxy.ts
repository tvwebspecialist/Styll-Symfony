import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { createAdminClient } from '@/lib/supabase/admin'

// ─── Subdomain routing ────────────────────────────────────────────────────────

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
const SKIP_SUBDOMAINS = new Set(['www', 'admin'])

type TenantType = 'landing' | 'app' | 'dashboard'

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

// ─── CSP (nonce-based) ────────────────────────────────────────────────────────

/**
 * Build the Content-Security-Policy header for this request.
 *
 * - `script-src` uses a per-request nonce + 'strict-dynamic'. Origin entries
 *   remain as a CSP2 fallback for older browsers that ignore 'strict-dynamic'.
 * - `style-src` keeps 'unsafe-inline': tenant brand colors and many components
 *   inject inline <style> blocks; nonce'ing every site would be a large refactor.
 * - `'unsafe-eval'` is dev-only — React uses eval to rebuild server stacks.
 * - `frame-ancestors` opens up only on public tenant surfaces (landing/app) so
 *   the dashboard can embed live previews; everywhere else stays `'none'`.
 *
 * The nonce is also exposed via `x-nonce` so Server Components can read it via
 * `headers()` and apply it to their own inline <script> tags (see
 * apps/web/src/app/tenant/app/[slug]/layout.tsx).
 */
function buildCspHeader(nonce: string, allowEmbedding: boolean): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://accounts.google.com https://va.vercel-scripts.com",
    "img-src 'self' https://*.supabase.co data: blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self' https://accounts.google.com",
    allowEmbedding
      ? "frame-ancestors 'self' https://*.styll.it http://localhost:3000"
      : "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; ')
}

// ─── Auth guard (original proxy logic) ───────────────────────────────────────

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const AUTH_PAGES = ['/login', '/register']
const ONBOARDING_PREFIX = '/onboarding'
const ONBOARDING_COMPLETE = '/onboarding/complete'
const LEGACY_COMPLETE = '/register/complete'

export async function proxy(request: NextRequest) {
  // ── CSP nonce ──────────────────────────────────────────────────────────────
  // Fresh per-request, base64-encoded so it's a valid CSP token. Computed up
  // front because every downstream branch (next/redirect/rewrite) must emit
  // the same CSP and Next.js needs the nonce in the request headers before
  // SSR begins so it can inject it onto framework scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Resolve tenant rewrite before running auth guards
  const tenantRewriteUrl = resolveTenantRewrite(request)

  // Public tenant surfaces (landing + PWA app) must be embeddable in dashboard
  // previews — anything else stays locked down with `frame-ancestors 'none'`.
  const isEmbeddableTenantSurface =
    tenantRewriteUrl?.pathname.startsWith('/tenant/landing/') === true
    || tenantRewriteUrl?.pathname.startsWith('/tenant/app/') === true

  const cspHeader = buildCspHeader(nonce, isEmbeddableTenantSurface)

  // Inject nonce + CSP into the request headers so Next.js can extract the
  // nonce during SSR and propagate it to framework scripts + <Script> tags.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  // On subdomain requests, skip auth-page redirects to avoid redirect loops.
  // Auth is enforced by the tenant layout itself.
  const isSubdomainRequest = tenantRewriteUrl !== null

  const { pathname } = request.nextUrl

  // PWA client routes manage their own auth client-side.
  // Server-side redirects from middleware exit iOS standalone mode, so we skip
  // ALL auth logic for PWA routes — including getUser() (avoids latency + 302s).
  const isPwaRoute = pathname.startsWith('/tenant/app/')
    || tenantRewriteUrl?.pathname.startsWith('/tenant/app/') === true

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', cspHeader)

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
      const r = NextResponse.redirect(url)
      r.headers.set('Content-Security-Policy', cspHeader)
      return r
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

      if (!completed && isProtected && !isAdmin && !isSubdomainRequest) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding/step-1'
        return redirectTo(url)
      }

      if (completed && isOnboarding && pathname !== ONBOARDING_COMPLETE && !isSubdomainRequest) {
        const db = createAdminClient()
        const { data: staffRow } = await db
          .from('staff_members')
          .select('tenant_id')
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (staffRow?.tenant_id) {
          const { data: tenantRow } = await db
            .from('tenants')
            .select('slug')
            .eq('id', staffRow.tenant_id)
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
      }

      if (isAuthPage && !isSubdomainRequest) {
        if (completed) {
          const db = createAdminClient()
          const { data: staffRow } = await db
            .from('staff_members')
            .select('tenant_id')
            .eq('profile_id', user.id)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
          if (staffRow?.tenant_id) {
            const { data: tenantRow } = await db
              .from('tenants')
              .select('slug')
              .eq('id', staffRow.tenant_id)
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
    // Pass `requestHeaders` so Next.js can extract the nonce when rendering
    // the rewritten route (otherwise framework scripts wouldn't get nonced).
    const rewriteResponse = NextResponse.rewrite(tenantRewriteUrl, {
      request: { headers: requestHeaders },
    })
    response.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    // Single CSP header — includes the embedding-friendly frame-ancestors for
    // /tenant/landing/* and /tenant/app/* (decided up front via `isEmbeddableTenantSurface`).
    rewriteResponse.headers.set('Content-Security-Policy', cspHeader)
    return rewriteResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|gif|webp)$).*)',
  ],
}
