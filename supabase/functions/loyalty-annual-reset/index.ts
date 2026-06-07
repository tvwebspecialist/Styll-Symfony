import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ──────────────────────────────────────────────────────────────
// loyalty-annual-reset — Supabase Edge Function
//
// Runs on 1 January each year (schedule via pg_cron or Supabase
// Scheduled Functions: "0 3 1 1 *" — 03:00 UTC on 1 Jan).
//
// What it does:
//   For every client_loyalty row where tier_year < current_year:
//   1. Resets tier_points_this_year = 0
//   2. Sets tier_grace_expires_at = 1 March of current year
//   3. Sets tier_year = current_year
//
//   The actual tier is NOT changed here — it will be recalculated
//   automatically when the next loyalty_transaction is processed,
//   because checkAndUpdateTier() reads the grace period and only
//   downgrades after tier_grace_expires_at has passed.
//
// Trigger manually with:
//   curl -X POST https://<project>.supabase.co/functions/v1/loyalty-annual-reset \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
// ──────────────────────────────────────────────────────────────

serve(async (req) => {
  // Only allow POST (cron will POST too)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  const now = new Date()
  const currentYear = now.getFullYear()

  // March 1 of current year (grace period expiry)
  const gracePeriodEnd = new Date(currentYear, 2, 1, 0, 0, 0, 0).toISOString()

  // Find all rows that haven't been reset for this year yet
  const { data: rows, error: fetchErr } = await db
    .from('client_loyalty')
    .select('id, tier_year')
    .lt('tier_year', currentYear)

  if (fetchErr) {
    console.error('[loyalty-annual-reset] fetch error:', fetchErr.message)
    return new Response(JSON.stringify({ success: false, error: fetchErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!rows || rows.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: 'Nothing to reset', updated: 0 }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }

  const ids = rows.map((r: { id: string }) => r.id)

  // Reset in batches of 500 to avoid timeouts
  const BATCH = 500
  let totalUpdated = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const { error: updateErr, count } = await db
      .from('client_loyalty')
      .update({
        tier_points_this_year: 0,
        tier_year: currentYear,
        tier_grace_expires_at: gracePeriodEnd,
      })
      .in('id', batch)
      .select('id', { count: 'exact', head: true })

    if (updateErr) {
      console.error('[loyalty-annual-reset] update error:', updateErr.message)
      // Continue with remaining batches rather than aborting
    } else {
      totalUpdated += count ?? 0
    }
  }

  console.log(`[loyalty-annual-reset] Reset complete. Updated: ${totalUpdated} rows. Grace expires: ${gracePeriodEnd}`)

  return new Response(
    JSON.stringify({
      success: true,
      updated: totalUpdated,
      tierYear: currentYear,
      graceExpires: gracePeriodEnd,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
