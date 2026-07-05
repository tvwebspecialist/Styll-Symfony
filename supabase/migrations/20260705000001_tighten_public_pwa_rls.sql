-- ============================================================
-- 20260705000001_tighten_public_pwa_rls.sql
-- Remove broad public-read policies introduced for the PWA booking flow.
--
-- Public booking/landing data is currently served via tenant-scoped server
-- actions/routes using the admin client. Keeping anonymous table reads open
-- is therefore unnecessary and creates cross-tenant data leakage risk.
-- ============================================================

DROP POLICY IF EXISTS "public_read_active_tenants" ON public.tenants;
DROP POLICY IF EXISTS "public_read_active_services" ON public.services;
DROP POLICY IF EXISTS "public_read_active_locations" ON public.locations;
DROP POLICY IF EXISTS "public_read_active_staff" ON public.staff_members;
DROP POLICY IF EXISTS "public_read_staff_locations" ON public.staff_locations;
DROP POLICY IF EXISTS "public_read_staff_services" ON public.staff_services;
DROP POLICY IF EXISTS "public_read_working_hours" ON public.working_hours;
DROP POLICY IF EXISTS "public_read_working_hour_overrides" ON public.working_hour_overrides;
DROP POLICY IF EXISTS "public_read_appointments_for_slots" ON public.appointments;
DROP POLICY IF EXISTS "public_read_active_promotions" ON public.promotions;
DROP POLICY IF EXISTS "public_read_loyalty_configs" ON public.loyalty_configs;
DROP POLICY IF EXISTS "public_read_active_rewards" ON public.rewards;
DROP POLICY IF EXISTS "public_read_promotion_services" ON public.promotion_services;
DROP POLICY IF EXISTS "public_read_promotion_products" ON public.promotion_products;
