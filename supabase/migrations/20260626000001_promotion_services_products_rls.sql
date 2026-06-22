-- ============================================================
-- Migration: retroactive promotion_services + promotion_products
-- ============================================================
-- These tables were created manually in the Supabase dashboard
-- before this migration existed. IF NOT EXISTS makes every
-- statement safe to run on a DB where they already exist.
-- ============================================================

-- ── promotion_services ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotion_services (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES public.tenants(id)    ON DELETE CASCADE,
  promotion_id   uuid          NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  service_id     uuid          NOT NULL REFERENCES public.services(id)   ON DELETE CASCADE,
  discount_type  text          NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promotion_services_promotion_id_idx ON public.promotion_services (promotion_id);
CREATE INDEX IF NOT EXISTS promotion_services_service_id_idx   ON public.promotion_services (service_id);
CREATE INDEX IF NOT EXISTS promotion_services_tenant_id_idx    ON public.promotion_services (tenant_id);

-- ── promotion_products ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotion_products (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES public.tenants(id)    ON DELETE CASCADE,
  promotion_id   uuid          NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id     uuid          NOT NULL REFERENCES public.products(id)   ON DELETE CASCADE,
  discount_type  text          NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promotion_products_promotion_id_idx ON public.promotion_products (promotion_id);
CREATE INDEX IF NOT EXISTS promotion_products_product_id_idx   ON public.promotion_products (product_id);
CREATE INDEX IF NOT EXISTS promotion_products_tenant_id_idx    ON public.promotion_products (tenant_id);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.promotion_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;

-- Bridge tables, no PII — same pattern as staff_services/staff_locations
-- in 20260616000001_public_pwa_rls.sql
DO $$ BEGIN
  CREATE POLICY "public_read_promotion_services"
    ON public.promotion_services FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_promotion_products"
    ON public.promotion_products FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
