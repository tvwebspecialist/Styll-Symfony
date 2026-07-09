-- =============================================================
-- 20260709172000_tenant_dpa_acceptance.sql
-- Persist versioned DPA acceptance proof on tenants.
-- =============================================================

alter table public.tenants
  add column if not exists dpa_version text;

alter table public.tenants
  add column if not exists dpa_accepted_at timestamptz;

alter table public.tenants
  add column if not exists dpa_accepted_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_dpa_accepted_by_fkey'
  ) then
    alter table public.tenants
      add constraint tenants_dpa_accepted_by_fkey
      foreign key (dpa_accepted_by)
      references public.profiles(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_dpa_acceptance_complete_check'
  ) then
    alter table public.tenants
      add constraint tenants_dpa_acceptance_complete_check
      check (
        (
          dpa_version is null
          and dpa_accepted_at is null
          and dpa_accepted_by is null
        )
        or
        (
          dpa_version is not null
          and dpa_accepted_at is not null
          and dpa_accepted_by is not null
        )
      );
  end if;
end $$;

comment on column public.tenants.dpa_version is
  'Version of the Styll-barber DPA accepted for this tenant.';

comment on column public.tenants.dpa_accepted_at is
  'Timestamp when the Styll-barber DPA was accepted for this tenant.';

comment on column public.tenants.dpa_accepted_by is
  'Profile that accepted the Styll-barber DPA for this tenant.';
