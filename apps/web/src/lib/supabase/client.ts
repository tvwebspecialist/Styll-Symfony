import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Evaluated inside the factory so it's always client-side, never during SSR.
  // Set NEXT_PUBLIC_COOKIE_DOMAIN=.styll.it (or your root domain) in .env.local.
  const cookieDomain =
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_COOKIE_DOMAIN
      ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN
      : undefined

  return createBrowserClient(
    // trim() evita whitespace/newline accidentali dalla env
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
    {
      cookieOptions: cookieDomain
        ? { domain: cookieDomain, sameSite: 'lax', secure: true }
        : { sameSite: 'lax', secure: true },
    }
  )
}
