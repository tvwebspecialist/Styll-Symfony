import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const COOKIE_DOMAIN =
  process.env.NODE_ENV === 'production'
    ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'}`
    : undefined

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    // trim() evita whitespace/newline accidentali dalla env
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
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
