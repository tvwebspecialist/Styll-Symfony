import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    // trim() evita whitespace/newline accidentali dalla env
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.SUPABASE_SECRET_KEY ?? '').trim()
  )
}
