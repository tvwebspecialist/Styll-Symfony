-- =============================================================
-- 20260706184500_harden_security_definer_rpcs.sql
-- Harden SECURITY DEFINER functions that were callable from Supabase clients.
--
-- Classification:
-- - Authenticated helper RPCs kept callable:
--     * get_my_tenant_id()
--     * current_tenant_id()
--     * is_superadmin()
-- - Service-role only admin/maintenance RPCs:
--     * decrement_product_inventory(...)
--     * recompute_all_client_analytics()
--     * recalculate_client_analytics()        -- if present
-- - Internal-only (trigger/cron/helper) functions:
--     * recompute_client_analytics(uuid)
--     * reconcile_site_analytics_daily(...)
--     * cleanup_old_site_events(...)
--     * handle_new_user()
--     * handle_new_auth_user()                -- legacy, unattached in remote schema
--     * fn_platform_notif_*()                 -- trigger-only
-- =============================================================

create or replace function public.get_my_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.staff_members
  where profile_id = auth.uid()
    and is_active = true
    and deleted_at is null
  limit 1;
$$;

alter function public.current_tenant_id() set search_path = public;
alter function public.is_superadmin() set search_path = public;

do $$
begin
  -- Authenticated-safe helpers.
  execute 'revoke execute on function public.get_my_tenant_id() from public, anon, authenticated';
  execute 'grant execute on function public.get_my_tenant_id() to authenticated, service_role';

  execute 'revoke execute on function public.current_tenant_id() from public, anon, authenticated';
  execute 'grant execute on function public.current_tenant_id() to authenticated, service_role';

  execute 'revoke execute on function public.is_superadmin() from public, anon, authenticated';
  execute 'grant execute on function public.is_superadmin() to authenticated, service_role';

  -- Service-role only RPCs.
  if to_regprocedure('public.decrement_product_inventory(uuid,uuid,uuid,integer)') is not null then
    execute 'alter function public.decrement_product_inventory(uuid,uuid,uuid,integer) set search_path = public';
    execute 'revoke execute on function public.decrement_product_inventory(uuid,uuid,uuid,integer) from public, anon, authenticated';
    execute 'grant execute on function public.decrement_product_inventory(uuid,uuid,uuid,integer) to service_role';
  end if;

  if to_regprocedure('public.recompute_all_client_analytics()') is not null then
    execute 'alter function public.recompute_all_client_analytics() set search_path = public';
    execute 'revoke execute on function public.recompute_all_client_analytics() from public, anon, authenticated';
    execute 'grant execute on function public.recompute_all_client_analytics() to service_role';
  end if;

  if to_regprocedure('public.recalculate_client_analytics()') is not null then
    execute 'alter function public.recalculate_client_analytics() set search_path = public';
    execute 'revoke execute on function public.recalculate_client_analytics() from public, anon, authenticated';
    execute 'grant execute on function public.recalculate_client_analytics() to service_role';
  end if;

  -- Internal-only RPCs / trigger helpers: no client execute.
  if to_regprocedure('public.recompute_client_analytics(uuid)') is not null then
    execute 'alter function public.recompute_client_analytics(uuid) set search_path = public';
    execute 'revoke execute on function public.recompute_client_analytics(uuid) from public, anon, authenticated, service_role';
    execute 'grant execute on function public.recompute_client_analytics(uuid) to service_role';
  end if;

  if to_regprocedure('public.reconcile_site_analytics_daily(date)') is not null then
    execute 'alter function public.reconcile_site_analytics_daily(date) set search_path = public';
    execute 'revoke execute on function public.reconcile_site_analytics_daily(date) from public, anon, authenticated, service_role';
  end if;

  if to_regprocedure('public.cleanup_old_site_events()') is not null then
    execute 'alter function public.cleanup_old_site_events() set search_path = public';
    execute 'revoke execute on function public.cleanup_old_site_events() from public, anon, authenticated, service_role';
  end if;

  if to_regprocedure('public.cleanup_old_site_events(integer)') is not null then
    execute 'alter function public.cleanup_old_site_events(integer) set search_path = public';
    execute 'revoke execute on function public.cleanup_old_site_events(integer) from public, anon, authenticated, service_role';
  end if;

  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = public';
  end if;

  if to_regprocedure('public.handle_new_auth_user()') is not null then
    execute 'alter function public.handle_new_auth_user() set search_path = public';
    execute 'revoke execute on function public.handle_new_auth_user() from public, anon, authenticated, service_role';
  end if;

  if to_regprocedure('public.fn_platform_notif_tenant_created()') is not null then
    execute 'alter function public.fn_platform_notif_tenant_created() set search_path = public';
  end if;

  if to_regprocedure('public.fn_platform_notif_tenant_status()') is not null then
    execute 'alter function public.fn_platform_notif_tenant_status() set search_path = public';
  end if;

  if to_regprocedure('public.fn_platform_notif_user_registered()') is not null then
    execute 'alter function public.fn_platform_notif_user_registered() set search_path = public';
  end if;
end;
$$;
