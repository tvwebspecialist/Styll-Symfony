-- =============================================================
-- 20260425000005_superadmin.sql
-- Adds is_superadmin flag on profiles + superadmin RLS bypass.
-- =============================================================

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

create index if not exists profiles_is_superadmin_idx
  on public.profiles (is_superadmin)
  where is_superadmin = true;

-- helper function used by RLS policies
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_superadmin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Allow superadmins to read every profile
drop policy if exists "Profiles superadmin read" on public.profiles;
create policy "Profiles superadmin read"
  on public.profiles for select
  using (public.is_superadmin());

drop policy if exists "Profiles superadmin update" on public.profiles;
create policy "Profiles superadmin update"
  on public.profiles for update
  using (public.is_superadmin())
  with check (public.is_superadmin());
