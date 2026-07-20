import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Resolve the cookie `domain` so the Supabase session cookie is shared across
 * the root domain and every `*-dashboard` / `*-app` subdomain.
 *
 * Without an explicit `domain` the browser writes a **host-only** cookie bound
 * to the exact hostname (e.g. `styll.it`). Safari iOS then refuses to send it
 * to `slug-dashboard.styll.it`, so the post-login redirect to a tenant
 * subdomain lands without a session (silent bounce back to login/select-tenant).
 *
 * Mirrors the server-side logic in `supabase/server.ts`, which derives the
 * cookie domain from `NEXT_PUBLIC_ROOT_DOMAIN`. Set `NEXT_PUBLIC_COOKIE_DOMAIN`
 * (e.g. `.styll.it`) to override the derivation explicitly.
 */
function getCookieDomain(): string | undefined {
  // The browser client only runs client-side; bail out during SSR.
  if (typeof window === 'undefined') return undefined

  const host = window.location.hostname

  // Local dev: cookies on localhost/127.0.0.1 cannot use a dotted domain.
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '127.0.0.1'
  ) {
    return undefined
  }

  // Explicit override always wins.
  if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
    return process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  }

  // Keep parity with server.ts, which keys cookies off NEXT_PUBLIC_ROOT_DOMAIN.
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '').trim().replace(/^\./, '')
  if (rootDomain && (host === rootDomain || host.endsWith(`.${rootDomain}`))) {
    return `.${rootDomain}`
  }

  // Last-resort fallback: derive the shared parent domain from the current host
  // so the session is shared across subdomains (e.g. `.styll.it`).
  const parts = host.split('.')
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`
  }

  return undefined
}

function shouldUseSecureCookies(): boolean {
  if (typeof window === 'undefined') return true

  const host = window.location.hostname
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '127.0.0.1'
  ) {
    return false
  }

  return window.location.protocol === 'https:'
}

export function createClient() {
  // Evaluated inside the factory so it's always client-side, never during SSR.
  const cookieDomain = getCookieDomain()
  const secure = shouldUseSecureCookies()

  return createBrowserClient<Database>(
    // trim() evita whitespace/newline accidentali dalla env
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
    {
      cookieOptions: cookieDomain
        ? { domain: cookieDomain, sameSite: 'lax', secure }
        : { sameSite: 'lax', secure },
    }
  )
}
