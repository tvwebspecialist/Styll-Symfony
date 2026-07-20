create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  photo_url text not null,
  caption text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.gallery_photos enable row level security;

-- Staff del tenant può vedere e modificare le proprie foto
do $$ begin
  create policy "gallery_tenant_access" on public.gallery_photos
    using (
      tenant_id in (
        select tenant_id from public.staff_members
        where profile_id = auth.uid() and is_active = true and deleted_at is null
      )
    );
exception when duplicate_object then null; end $$;
