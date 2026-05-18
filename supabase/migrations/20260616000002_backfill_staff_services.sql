-- ============================================================
-- Migration: Backfill staff_services for existing tenants
-- ============================================================
-- Problem: the owner onboarding creates staff_members, locations,
-- working_hours and services, but never populates staff_services.
-- This means getAvailableStaff() always returns empty because
-- no staff member matches all selected services.
--
-- Fix: for every active staff member that has ZERO entries in
-- staff_services, link them to ALL active services of their
-- tenant. This matches the "solo barber / owner does everything"
-- use case that is the norm for MVP tenants.
--
-- Safe to re-run (ON CONFLICT DO NOTHING + idempotent WHERE clause).
-- ============================================================

INSERT INTO public.staff_services (tenant_id, staff_id, service_id)
SELECT
  sm.tenant_id,
  sm.id        AS staff_id,
  s.id         AS service_id
FROM public.staff_members sm
JOIN public.services s
  ON s.tenant_id = sm.tenant_id
  AND s.is_active = true
  AND s.deleted_at IS NULL
WHERE sm.is_active    = true
  AND sm.deleted_at   IS NULL
  -- only for staff with no service assignments at all
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff_services ss
    WHERE ss.staff_id = sm.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Verification
-- ============================================================
-- SELECT
--   t.slug,
--   sm.id         AS staff_id,
--   p.full_name,
--   COUNT(ss.service_id) AS services_linked
-- FROM public.staff_members sm
-- JOIN public.tenants  t ON t.id = sm.tenant_id
-- JOIN public.profiles p ON p.id = sm.profile_id
-- LEFT JOIN public.staff_services ss ON ss.staff_id = sm.id
-- WHERE sm.is_active = true AND sm.deleted_at IS NULL
-- GROUP BY t.slug, sm.id, p.full_name
-- ORDER BY t.slug;
-- ============================================================
