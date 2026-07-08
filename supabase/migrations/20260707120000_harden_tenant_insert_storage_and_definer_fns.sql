-- ============================================================
-- 20260707120000_harden_tenant_insert_storage_and_definer_fns.sql
--
-- Security hardening batch (audit 2026-07-07):
--   #1  Remove the permissive tenants INSERT policy (WITH CHECK true)
--   #2  Remove broad "list all objects" SELECT policies on public buckets
--   #7  Revoke anon/authenticated EXECUTE on SECURITY DEFINER trigger fns
--   #8  Pin search_path on functions flagged as mutable
--
-- All changes are fail-safe: tenant creation and storage object access keep
-- working via the service role / public object URLs.
-- ============================================================

-- ─── #1  tenants INSERT open to anon/authenticated ────────────
-- The policy allowed ANY caller (roles = public, incl. anon which holds the
-- INSERT grant) to insert arbitrary tenant rows via POST /rest/v1/tenants,
-- each firing fn_platform_notif_tenant_created. Onboarding creates tenants
-- through the admin client (service role), which bypasses RLS, so no
-- INSERT policy is needed for regular roles.
DROP POLICY IF EXISTS "tenants_insert_owner" ON public.tenants;

-- ─── #2  Public buckets: drop broad object-listing SELECT policies ──
-- Public buckets serve objects via /storage/v1/object/public/... WITHOUT a
-- SELECT policy on storage.objects. These `USING (bucket_id = '...')`
-- policies only enable /object/list, i.e. enumerating every tenant's files
-- (cross-tenant media listing). The single in-app .list() call
-- (profilo.ts -> avatars) runs with the service role and is unaffected.
DROP POLICY IF EXISTS "avatars_public_read"          ON storage.objects;
DROP POLICY IF EXISTS "locations_public_read"        ON storage.objects;
DROP POLICY IF EXISTS "Immagini prodotti pubbliche"  ON storage.objects;
DROP POLICY IF EXISTS "public read gfxl4g_0"         ON storage.objects;
DROP POLICY IF EXISTS "tenants_public_read"          ON storage.objects;
-- Legacy orphan policy for the (no longer existing) 'Promotions' bucket.
DROP POLICY IF EXISTS "public read 1desggg_0"        ON storage.objects;

-- ─── #7  Revoke EXECUTE on SECURITY DEFINER trigger functions ──────
-- These are trigger functions, not meant to be called as RPCs. They remain
-- reachable via /rest/v1/rpc/<name> by anon/authenticated. Triggers keep
-- firing regardless of these grants (they run as the table owner).
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fn_platform_notif_tenant_created() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fn_platform_notif_tenant_status()  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fn_platform_notif_user_registered() FROM anon, authenticated, public;

-- ─── #8  Pin search_path on functions with a mutable search_path ───
-- Prevents search_path hijacking against SECURITY DEFINER / trigger fns.
-- `public` matches the existing hardened convention and does not break the
-- unqualified table references in these bodies.
ALTER FUNCTION public.handle_tier_configs_updated_at()      SET search_path = public;
ALTER FUNCTION public.set_updated_at()                      SET search_path = public;
ALTER FUNCTION public.decrement_inventory()                 SET search_path = public;
ALTER FUNCTION public.generate_invitation_token()           SET search_path = public;
ALTER FUNCTION public.get_invitation_by_token(p_token text) SET search_path = public;
ALTER FUNCTION public.handle_profile_updated_at()           SET search_path = public;
ALTER FUNCTION public.tg_appt_recompute_analytics()         SET search_path = public;
