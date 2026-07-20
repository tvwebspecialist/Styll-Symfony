import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  handleLoyaltyAnnualResetRequest,
  type LoyaltyAnnualResetDb,
} from './handler.ts'

// ──────────────────────────────────────────────────────────────
// loyalty-annual-reset — Supabase Edge Function
//
// Runs on 1 January each year (schedule via pg_cron or Supabase
// Scheduled Functions: "0 3 1 1 *" — 03:00 UTC on 1 Jan).
//
// Auth model:
//   - verify_jwt = false in supabase/config.toml
//   - caller MUST provide the shared server-side secret
//     via `Authorization: Bearer $LOYALTY_RESET_SECRET`
//     or `x-loyalty-reset-secret: $LOYALTY_RESET_SECRET`
//   - user JWTs (anon/authenticated/staff/client/owner) are never sufficient
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
//     -H "Authorization: Bearer $LOYALTY_RESET_SECRET"
// ──────────────────────────────────────────────────────────────

serve((req) =>
  handleLoyaltyAnnualResetRequest(req, {
    env: {
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      loyaltyResetSecret: Deno.env.get('LOYALTY_RESET_SECRET'),
    },
    createAdminClient: (supabaseUrl, serviceRoleKey) =>
      createClient(supabaseUrl, serviceRoleKey) as unknown as LoyaltyAnnualResetDb,
  })
)
