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

// ─── Auth guard (original proxy logic) ───────────────────────────────────────

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const AUTH_PAGES = ['/login', '/register']
const ONBOARDING_PREFIX = '/onboarding'
const ONBOARDING_COMPLETE = '/onboarding/complete'
const LEGACY_COMPLETE = '/register/complete'

export async function proxy(request: NextRequest) {
  // Resolve tenant rewrite before running auth guards
  const tenantRewriteUrl = resolveTenantRewrite(request)

  // On subdomain requests, skip auth-page redirects to avoid redirect loops.
  // Auth is enforced by the tenant layout itself.
  const isSubdomainRequest = tenantRewriteUrl !== null

  const { pathname } = request.nextUrl

  // PWA client routes manage their own auth client-side.
  // Server-side redirects from middleware exit iOS standalone mode, so we skip
  // ALL auth logic for PWA routes — including getUser() (avoids latency + 302s).
  const isPwaRoute = pathname.startsWith('/tenant/app/')
    || tenantRewriteUrl?.pathname.startsWith('/tenant/app/') === true

  const response = NextResponse.next({ request })

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

    // Rotte protette: richiedono auth
    if (isProtected && !user) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN!
      const proto = rootDomain.includes('localhost') ? 'http' : 'https'
      const loginUrl = new URL(`${proto}://${rootDomain}/login`)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
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
        return NextResponse.redirect(url)
      }
    }

    // /onboarding/*: richiede auth
    if (isOnboarding && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Legacy /register/complete → /onboarding/step-1
    if (pathname === LEGACY_COMPLETE) {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/onboarding/step-1' : '/login'
      return NextResponse.redirect(url)
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
        return NextResponse.redirect(url)
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
            return NextResponse.redirect(redirectUrl)
          }
        }
        const fallbackUrl = request.nextUrl.clone()
        fallbackUrl.pathname = '/dashboard'
        return NextResponse.redirect(fallbackUrl)
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
              return NextResponse.redirect(redirectUrl)
            }
          }
          const fallbackUrl = request.nextUrl.clone()
          fallbackUrl.pathname = '/dashboard'
          return NextResponse.redirect(fallbackUrl)
        } else {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding/step-1'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  // Apply subdomain rewrite, carrying over Supabase session cookies
  if (tenantRewriteUrl) {
    const rewriteResponse = NextResponse.rewrite(tenantRewriteUrl)
    response.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    // Allow public tenant surfaces to be embedded in dashboard previews.
    if (
      tenantRewriteUrl.pathname.startsWith('/tenant/landing/')
      || tenantRewriteUrl.pathname.startsWith('/tenant/app/')
    ) {
      rewriteResponse.headers.set(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://*.styll.it http://localhost:3000"
      )
    }
    return rewriteResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|gif|webp)$).*)',
  ],
}
