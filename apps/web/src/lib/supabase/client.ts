import { createBrowserClient } from '@supabase/ssr'

const COOKIE_DOMAIN =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'}`
    : undefined

export function createClient() {
  return createBrowserClient(
    // trim() evita whitespace/newline accidentali dalla env
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
    {
      cookieOptions: COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : undefined,
    }
  )
}
