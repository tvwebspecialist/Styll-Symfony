-- ─── service_categories ──────────────────────────────────────────────────────
-- Standalone category registry so categories can exist independently of
-- services (and carry a name + color even before any service is assigned).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_categories (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

-- Row-level security
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_categories_tenant_access"
    ON public.service_categories
    FOR ALL
    USING (
      tenant_id IN (
        SELECT sm.tenant_id
        FROM public.staff_members sm
        WHERE sm.profile_id = auth.uid()
          AND sm.is_active = true
          AND sm.deleted_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin/service-role can always bypass RLS
DO $$ BEGIN
  CREATE POLICY "service_categories_admin_access"
    ON public.service_categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
