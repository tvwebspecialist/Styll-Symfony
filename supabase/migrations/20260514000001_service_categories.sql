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

CREATE POLICY "service_categories_tenant_access"
  ON public.service_categories
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Admin/service-role can always bypass RLS
CREATE POLICY "service_categories_admin_access"
  ON public.service_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
