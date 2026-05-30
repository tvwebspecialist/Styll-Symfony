import { createClient } from '@supabase/supabase-js'

let _instance: ReturnType<typeof createClient> | null = null

export function createPwaClient() {
  if (!_instance) {
    _instance = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
      {
        auth: {
          persistSession: true,
          storageKey: 'styll-pwa-session',
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          autoRefreshToken: true,
        },
      }
    )
  }
  return _instance
}
