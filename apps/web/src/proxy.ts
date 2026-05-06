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

  const subdomain = getSubdomain(host)

  if (subdomain && !SKIP_SUBDOMAINS.has(subdomain)) {
    const parsed = parseTenant(subdomain)
    if (parsed) {
      const url = request.nextUrl.clone()
      url.pathname = `/_tenant/${parsed.type}/${parsed.slug}${pathname}`
      return url
    }
  }

  // Dev localhost query-param fallback
  if (process.env.NODE_ENV === 'development' && host === 'localhost:3000') {
    const tenantSlug = request.nextUrl.searchParams.get('_tenant_slug')
    const tenantType = request.nextUrl.searchParams.get('_tenant_type') as TenantType | null
    if (tenantSlug && tenantType && ['landing', 'app', 'dashboard'].includes(tenantType)) {
      const url = request.nextUrl.clone()
      url.pathname = `/_tenant/${tenantType}/${tenantSlug}${pathname}`
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

  const response = NextResponse.next({ request })

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAdmin = pathname.startsWith('/admin')
  const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX)
  const isAuthPage =
    AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    pathname !== LEGACY_COMPLETE

  // Rotte protette: richiedono auth
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
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

    if (!completed && isProtected && !isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/step-1'
      return NextResponse.redirect(url)
    }

    if (completed && isOnboarding && pathname !== ONBOARDING_COMPLETE) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = completed ? '/dashboard' : '/onboarding/step-1'
      return NextResponse.redirect(url)
    }
  }

  // Apply subdomain rewrite, carrying over Supabase session cookies
  if (tenantRewriteUrl) {
    const rewriteResponse = NextResponse.rewrite(tenantRewriteUrl)
    response.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return rewriteResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|auth/callback|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|gif|webp)$).*)',
  ],
}
