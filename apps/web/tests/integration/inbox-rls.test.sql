-- ============================================================
-- inbox-rls.test.sql
-- Real PostgreSQL RLS tests.
--
-- What these tests CAN prove (plain Postgres, no Supabase auth):
--   - Non-superuser with no staff_members match gets 0 rows
--   - The RLS policy structure blocks unauthenticated reads
--
-- What requires Supabase JWT environment (NOT tested here):
--   - User authenticated as tenant A cannot read tenant B
--     (needs SET LOCAL "request.jwt.claims" + Supabase JWT validation)
--   - Inactive staff (is_active=false) gets 0 rows
--   - Role-level checks inside requireTenantRole()
--
-- Application-level tenant isolation is tested in inbox-db.test.sql
-- (via tenant_id filter in service_role queries).
-- ============================================================

\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION test_assert(condition boolean, test_name text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT condition THEN RAISE EXCEPTION 'FAIL: %', test_name; END IF;
  RAISE NOTICE 'ok - %', test_name;
END; $$;

-- Create a non-superuser role that represents an anonymous browser session
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_anon_role') THEN
    CREATE ROLE test_anon_role NOLOGIN NOINHERIT NOSUPERUSER;
  END IF;
END; $$;

GRANT USAGE ON SCHEMA public TO test_anon_role;
GRANT SELECT ON public.inbox_conversations TO test_anon_role;
GRANT SELECT ON public.inbox_messages TO test_anon_role;
GRANT SELECT ON public.staff_members TO test_anon_role;

-- ─── RLS Test: no staff membership → 0 rows ─────────────────

DO $$
DECLARE
  conv_count integer;
  msg_count  integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RLS TESTS ===';

  -- auth.uid() is stubbed to return NULL → no staff_members match → RLS blocks
  SET LOCAL ROLE test_anon_role;

  SELECT count(*) INTO conv_count FROM public.inbox_conversations;
  SELECT count(*) INTO msg_count  FROM public.inbox_messages;

  RESET ROLE;

  PERFORM test_assert(conv_count = 0,
    'RLS: no auth.uid() match → inbox_conversations returns 0 rows');
  PERFORM test_assert(msg_count = 0,
    'RLS: no auth.uid() match → inbox_messages returns 0 rows');
END; $$;

-- ─── RLS Test: service_role sees all (application path) ─────

DO $$
DECLARE
  conv_count integer;
BEGIN
  -- As superuser (simulates service_role bypass), all rows visible
  SELECT count(*) INTO conv_count FROM public.inbox_conversations;

  PERFORM test_assert(conv_count > 0,
    'RLS: service_role/superuser → inbox_conversations visible (bypass)');
END; $$;

-- ─── RLS Test: inactive staff (deleted_at set) ───────────────
-- Requires auth.uid() to return a real UUID to be fully testable.
-- Documented as NOT fully testable without Supabase JWT.
DO $$
BEGIN
  RAISE NOTICE 'SKIP (partial): inactive staff RLS — requires Supabase JWT env (auth.uid() returns real UUID)';
  RAISE NOTICE 'SKIP (partial): tenant A / tenant B cross-tenant RLS — requires SET LOCAL request.jwt.claims';
END; $$;

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RLS TESTS COMPLETE ===';
  RAISE NOTICE 'NOTE: Application-level isolation (service_role + tenant_id filter) is';
  RAISE NOTICE '      the primary security layer tested in inbox-db.test.sql.';
  RAISE NOTICE '      RLS is a defence-in-depth layer, fully verifiable only with Supabase JWT.';
END; $$;
