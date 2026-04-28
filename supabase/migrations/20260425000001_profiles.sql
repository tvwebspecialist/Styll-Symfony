-- =============================================================
-- 20260425000001_profiles.sql
-- Profili utente (collegati a auth.users) + RLS + trigger di
-- creazione automatica al sign-up. Idempotente: lavora sia su
-- DB vuoti che su quelli con una versione precedente di profiles.
-- =============================================================

-- ─── 1. Tabella profiles ─────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  work_mode text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aggiunta delle colonne nuove per chi ha già una versione legacy
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists work_mode text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Vincolo sui valori ammessi per work_mode
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_work_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_work_mode_check
      check (work_mode is null or work_mode in ('solo', 'team'));
  end if;
end $$;

-- ─── 2. Trigger updated_at ───────────────────────────────────
create or replace function public.handle_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.handle_profile_updated_at();

-- ─── 3. Row Level Security ───────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── 4. Trigger: auto-create profile on new auth user ────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, user_type)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    'staff'
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
