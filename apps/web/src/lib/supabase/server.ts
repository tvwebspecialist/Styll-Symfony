import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it').trim().replace(/^\./, '')
const COOKIE_DOMAIN = IS_PRODUCTION ? `.${ROOT_DOMAIN}` : undefined
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const PKCE_COOKIE_MAX_AGE = 60 * 10

type SupabaseCookieOptions = Record<string, unknown> & {
  maxAge?: number
}

const BASE_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: IS_PRODUCTION,
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
}

function isPkceCodeVerifierCookie(name: string) {
  return name.includes('code-verifier')
}

function resolveCookieMaxAge(name: string, value: string, options?: SupabaseCookieOptions) {
  if (value === '' || options?.maxAge === 0) return 0
  if (isPkceCodeVerifierCookie(name)) {
    return Math.max(typeof options?.maxAge === 'number' ? options.maxAge : 0, PKCE_COOKIE_MAX_AGE)
  }
  return SESSION_COOKIE_MAX_AGE
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    // trim() evita whitespace/newline accidentali dalla env
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
    {
      // createServerClient applies cookieOptions to every auth cookie.
      // Keep the PKCE verifier explicitly readable on /auth/callback while
      // preserving long-lived session cookies in the custom setAll below.
      cookieOptions: {
        ...BASE_COOKIE_OPTIONS,
        maxAge: PKCE_COOKIE_MAX_AGE,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: SupabaseCookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...BASE_COOKIE_OPTIONS,
                maxAge: resolveCookieMaxAge(name, value, options),
              })
            )
          } catch {
            // called from Server Component
          }
        },
      },
    }
  )
}
