-- =============================================================
-- 20260706175500_protect_profiles_privileged_updates.sql
-- Block client-side self-escalation via public.profiles updates.
--
-- Strategy:
-- - Authenticated browser clients may update only harmless self-service fields.
-- - Privileged / server-managed fields stay writable only through service-role
--   flows (admin server actions, auth hooks, maintenance jobs).
-- - Future privilege-bearing columns added to profiles are blocked by default
--   unless explicitly whitelisted below.
-- =============================================================

create or replace function public.guard_profile_self_service_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  jwt_role text := auth.role();
  old_locked jsonb;
  new_locked jsonb;
begin
  -- Internal SQL, auth hooks, and service-role calls stay allowed. The only
  -- writes we want to constrain here are browser/authenticated JWT updates.
  if jwt_role is distinct from 'authenticated' and jwt_role is distinct from 'anon' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Direct client-side profile inserts are not allowed.'
      using errcode = '42501';
  end if;

  if auth.uid() is null then
    raise exception 'Direct client-side profile updates require an authenticated owner.'
      using errcode = '42501';
  end if;

  if old.id is distinct from auth.uid() or new.id is distinct from auth.uid() then
    raise exception 'Authenticated users may update only their own profile row.'
      using errcode = '42501';
  end if;

  -- Allowed self-service columns: harmless profile presentation/preferences only.
  old_locked := to_jsonb(old) - array[
    'full_name',
    'avatar_url',
    'phone',
    'bio',
    'language',
    'timezone',
    'notification_preferences',
    'work_mode',
    'updated_at'
  ];
  new_locked := to_jsonb(new) - array[
    'full_name',
    'avatar_url',
    'phone',
    'bio',
    'language',
    'timezone',
    'notification_preferences',
    'work_mode',
    'updated_at'
  ];

  if old_locked is distinct from new_locked then
    raise exception 'Authenticated users cannot change privileged profile fields.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_a_guard_self_service_mutation on public.profiles;
create trigger profiles_a_guard_self_service_mutation
  before insert or update on public.profiles
  for each row
  execute function public.guard_profile_self_service_mutation();

-- Admin updates already go through createAdminClient/service-role + requireSuperadmin.
-- Removing the direct authenticated superadmin UPDATE policy prevents browser-side
-- writes to privileged fields even for legitimate superadmins.
drop policy if exists "Profiles superadmin update" on public.profiles;
