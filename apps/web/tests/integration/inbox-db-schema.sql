-- ============================================================
-- inbox-db-schema.sql
-- Minimal schema stubs for integration tests.
-- Applied to styll_inbox_test BEFORE the migration.
--
-- Run as: psql -h /tmp -p 5432 -d styll_inbox_test -f inbox-db-schema.sql
-- ============================================================

\set ON_ERROR_STOP on

-- Supabase requires auth.uid() in RLS policies. Stub it as NULL for tests.
-- RLS is not tested here — tested separately via supabase JS client.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

-- ─── Minimal stub tables (FK targets only) ────────────────────
-- These are intentionally minimal — only columns needed by the
-- migration's FK references and RLS policies.

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'Test Tenant'
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'staff',
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz
);
