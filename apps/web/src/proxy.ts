import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { createAdminClient } from '@/lib/supabase/admin'

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const AUTH_PAGES = ['/login', '/register']
const ONBOARDING_PREFIX = '/onboarding'
const LEGACY_COMPLETE = '/register/complete'

export async function proxy(request: NextRequest) {
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

    if (completed && isOnboarding) {
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

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
