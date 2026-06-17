import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let _instance: SupabaseClient<Database> | null = null

export function createPwaClient() {
  if (!_instance) {
    _instance = createClient<Database>(
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
      {
        auth: {
          flowType: 'pkce',
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
