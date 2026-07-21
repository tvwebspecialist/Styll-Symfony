-- Historical/bootstrap SQL only.
-- Doctrine Migrations in symfony-app/migrations are the schema source of truth from the baseline onward.
-- Keep this file manually synchronized only while local fresh-volume bootstrap still depends on docker-entrypoint-initdb.d.

-- ─── Shared helper functions ─────────────────────────────────────────────────
-- Replaces Supabase auth.uid() / auth.jwt() pattern.
-- Tenant isolation is handled by Symfony TenantFilter (Doctrine level), NOT by PostgreSQL RLS.

-- Standard updated_at trigger (used by all tables)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
