-- Keep the service-role appointment flows working: inserts/updates on
-- appointments fire tg_appt_recompute_analytics(), which invokes the
-- SECURITY DEFINER helper recompute_client_analytics(uuid).

do $$
begin
  if to_regprocedure('public.recompute_client_analytics(uuid)') is not null then
    execute 'grant execute on function public.recompute_client_analytics(uuid) to service_role';
  end if;
end;
$$;
