-- =============================================================
-- 20260427000001_portfolio.sql
-- Portfolio fotografico staff + estensioni profilo (bio, phone,
-- lingua, preferenze notifiche) + bucket storage "portfolio".
-- Idempotente.
-- =============================================================

-- ─── 1. Estensioni tabella profiles ───────────────────────────
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists language text default 'it';
alter table public.profiles add column if not exists timezone text default 'Europe/Rome';
alter table public.profiles add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

-- ─── 2. Tabella portfolio_photos ──────────────────────────────
create table if not exists public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  staff_id uuid references public.staff_members(id) on delete set null,
  photo_url text not null,
  service_tags text[] not null default '{}',
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_photos_tenant_idx
  on public.portfolio_photos (tenant_id, display_order);
create index if not exists portfolio_photos_staff_idx
  on public.portfolio_photos (staff_id);

alter table public.portfolio_photos enable row level security;

-- L'accesso per tenant si appoggia alla membership in staff_members
drop policy if exists "portfolio_tenant_read" on public.portfolio_photos;
create policy "portfolio_tenant_read" on public.portfolio_photos
  for select using (
    exists (
      select 1 from public.staff_members sm
      where sm.tenant_id = portfolio_photos.tenant_id
        and sm.profile_id = auth.uid()
        and sm.is_active = true
    )
  );

drop policy if exists "portfolio_tenant_write" on public.portfolio_photos;
create policy "portfolio_tenant_write" on public.portfolio_photos
  for all using (
    exists (
      select 1 from public.staff_members sm
      where sm.tenant_id = portfolio_photos.tenant_id
        and sm.profile_id = auth.uid()
        and sm.is_active = true
    )
  ) with check (
    exists (
      select 1 from public.staff_members sm
      where sm.tenant_id = portfolio_photos.tenant_id
        and sm.profile_id = auth.uid()
        and sm.is_active = true
    )
  );

-- ─── 3. Storage bucket portfolio ──────────────────────────────
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

drop policy if exists "portfolio_public_read" on storage.objects;
create policy "portfolio_public_read" on storage.objects
  for select using (bucket_id = 'portfolio');

drop policy if exists "portfolio_authenticated_insert" on storage.objects;
create policy "portfolio_authenticated_insert" on storage.objects
  for insert with check (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
  );

drop policy if exists "portfolio_authenticated_update" on storage.objects;
create policy "portfolio_authenticated_update" on storage.objects
  for update using (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
  );

drop policy if exists "portfolio_authenticated_delete" on storage.objects;
create policy "portfolio_authenticated_delete" on storage.objects
  for delete using (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
  );
