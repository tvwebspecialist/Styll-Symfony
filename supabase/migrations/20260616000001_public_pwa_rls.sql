-- ============================================================
-- Migration: Promotions table + RLS policies for public PWA
-- ============================================================
-- What this migration does:
--   1. Creates the `promotions` table (IF NOT EXISTS, safe to re-run)
--   2. Enables Row Level Security on all tables read by the PWA
--   3. Adds public SELECT policies for anonymous access
--
-- Context:
--   The Next.js Server Actions use createAdminClient() (service role),
--   which bypasses RLS entirely. These policies are still necessary for:
--     a) Future direct client-side Supabase queries (mobile apps, etc.)
--     b) The Supabase Edge Function (create-guest-booking) which uses
--        service role but good practice to have policies defined
--     c) Security hygiene: least-privilege access if service role is
--        ever scoped down
--
-- NOTE on existing appointments policies:
--   A previous migration (20260513000001_rls_realtime_appointments.sql)
--   already enables RLS on appointments and adds staff/client SELECT
--   policies. This migration adds a supplementary public SELECT policy
--   for the slot-availability calculation used by the booking flow.
-- ============================================================


-- ──────────────────────────────────────────────
-- 1. Promotions table
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  discount_type   text        NOT NULL DEFAULT 'none'
                                CHECK (discount_type IN ('percent', 'fixed', 'free_service', 'none')),
  discount_value  numeric(10, 2),
  service_id      uuid        REFERENCES public.services(id) ON DELETE SET NULL,
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_until     timestamptz,
  show_on_landing boolean     NOT NULL DEFAULT true,
  show_in_app     boolean     NOT NULL DEFAULT true,
  is_active       boolean     NOT NULL DEFAULT true,
  display_order   integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promotions_tenant_id_idx ON public.promotions (tenant_id);
CREATE INDEX IF NOT EXISTS promotions_active_idx    ON public.promotions (is_active, valid_until);


-- ──────────────────────────────────────────────
-- 2. Enable RLS (idempotent)
-- ──────────────────────────────────────────────

ALTER TABLE public.promotions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_locations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_hours          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_hour_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                ENABLE ROW LEVEL SECURITY;
-- appointments: already enabled by 20260513000001_rls_realtime_appointments.sql


-- ──────────────────────────────────────────────
-- 3. Public SELECT policies
-- Each wrapped in DO $$ ... EXCEPTION WHEN duplicate_object so the
-- migration is safe to run multiple times (idempotent).
-- ──────────────────────────────────────────────

-- TENANTS: read active tenants for slug lookup / branding
DO $$ BEGIN
  CREATE POLICY "public_read_active_tenants"
    ON public.tenants FOR SELECT
    USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SERVICES: active services for booking + landing display
DO $$ BEGIN
  CREATE POLICY "public_read_active_services"
    ON public.services FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LOCATIONS: active locations for booking
DO $$ BEGIN
  CREATE POLICY "public_read_active_locations"
    ON public.locations FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- STAFF_MEMBERS: active, non-deleted staff for booking (no sensitive fields exposed)
DO $$ BEGIN
  CREATE POLICY "public_read_active_staff"
    ON public.staff_members FOR SELECT
    USING (is_active = true AND deleted_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- STAFF_LOCATIONS: bridge table — fully public (no PII)
DO $$ BEGIN
  CREATE POLICY "public_read_staff_locations"
    ON public.staff_locations FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- STAFF_SERVICES: bridge table — fully public (no PII)
DO $$ BEGIN
  CREATE POLICY "public_read_staff_services"
    ON public.staff_services FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- WORKING_HOURS: needed for slot availability calculation
DO $$ BEGIN
  CREATE POLICY "public_read_working_hours"
    ON public.working_hours FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- WORKING_HOUR_OVERRIDES: needed for slot availability (closures, holidays)
DO $$ BEGIN
  CREATE POLICY "public_read_working_hour_overrides"
    ON public.working_hour_overrides FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- APPOINTMENTS: limited read for slot conflict detection
-- Only non-cancelled, non-deleted rows visible — no client PII accessible
-- (supplements the staff/client policies from the realtime migration)
DO $$ BEGIN
  CREATE POLICY "public_read_appointments_for_slots"
    ON public.appointments FOR SELECT
    USING (
      status NOT IN ('cancelled', 'no_show')
      AND deleted_at IS NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PROMOTIONS: active and non-expired promotions
DO $$ BEGIN
  CREATE POLICY "public_read_active_promotions"
    ON public.promotions FOR SELECT
    USING (
      is_active = true
      AND (valid_until IS NULL OR valid_until > now())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LOYALTY_CONFIGS: active configs (ended_at IS NULL) for loyalty teaser
DO $$ BEGIN
  CREATE POLICY "public_read_loyalty_configs"
    ON public.loyalty_configs FOR SELECT
    USING (ended_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- REWARDS: active rewards for loyalty teaser
DO $$ BEGIN
  CREATE POLICY "public_read_active_rewards"
    ON public.rewards FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- Verification queries (run manually after applying)
-- ============================================================
--
-- Check RLS enabled:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE tablename IN (
--     'promotions','services','locations','staff_members',
--     'staff_locations','staff_services','working_hours',
--     'working_hour_overrides','appointments','loyalty_configs',
--     'rewards','tenants'
--   )
--   ORDER BY tablename;
--
-- Check policies:
--   SELECT tablename, policyname, cmd
--   FROM pg_policies
--   WHERE policyname LIKE 'public_%'
--   ORDER BY tablename;
-- ============================================================
