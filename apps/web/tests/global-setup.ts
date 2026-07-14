import { createClient } from '@supabase/supabase-js'

const WARM_UP_TIMEOUT_MS = 10 * 60 * 1000
const POLL_INTERVAL_MS = 5_000
const SCHEMA_CACHE_PHRASE = 'schema cache'

export default async function globalSetup(): Promise<void> {
  const supabaseUrl =
    process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey =
    process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceKey) {
    return
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const deadline = Date.now() + WARM_UP_TIMEOUT_MS
  let attempt = 0

  // Poll INSERT+DELETE instead of SELECT: PostgREST allows SELECT during partial
  // schema cache initialization, but INSERT requires the full schema to be loaded.
  // Confirming a write succeeds means all test fixtures can run without cache errors.
  while (Date.now() < deadline) {
    attempt++
    try {
      const warmupSlug = `gs-warmup-${Date.now()}`
      const { data, error } = await client
        .from('tenants')
        .insert({
          business_name: '__globalSetup warmup',
          primary_color: '#111111',
          settings: {},
          slug: warmupSlug,
          status: 'active',
          timezone: 'Europe/Rome',
        })
        .select('id')
        .single()

      if (!error && data?.id) {
        await client.from('tenants').delete().eq('id', data.id)
        console.log(`[global-setup] Supabase write ready (attempt ${attempt})`)
        return
      }

      if (error) {
        const isSchemaCache = error.message.toLowerCase().includes(SCHEMA_CACHE_PHRASE)
        if (!isSchemaCache) {
          // Non-schema-cache error (e.g. auth, constraint): schema IS accessible.
          // Log and proceed rather than retrying indefinitely.
          console.warn(
            `[global-setup] Non-schema-cache error — proceeding (attempt ${attempt}): ${error.message}`,
          )
          return
        }
        console.log(
          `[global-setup] Schema cache not ready (attempt ${attempt}): ${error.message}`,
        )
      }
    } catch (err) {
      console.log(
        `[global-setup] Waiting for Supabase (attempt ${attempt}): ${String(err)}`,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(
    `[global-setup] Supabase not ready after ${WARM_UP_TIMEOUT_MS / 1000}s`,
  )
}
