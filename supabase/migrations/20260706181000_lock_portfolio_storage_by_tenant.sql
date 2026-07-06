-- =============================================================
-- 20260706181000_lock_portfolio_storage_by_tenant.sql
-- Fix cross-tenant writes on the portfolio Storage bucket.
--
-- Strategy:
-- - Bucket becomes private; public reads happen only through server-generated
--   signed URLs for explicitly surfaced assets.
-- - Object paths are canonicalized under `tenants/{tenant_id}/...`.
-- - Authenticated staff may read/write only their own tenant path.
-- - Legacy public URLs stored in portfolio_photos are normalized to raw paths.
-- =============================================================

update storage.buckets
set public = false
where id = 'portfolio';

update public.portfolio_photos
set photo_url = regexp_replace(
  photo_url,
  '^https?://[^/]+/storage/v1/object/public/portfolio/',
  ''
)
where photo_url ~ '^https?://[^/]+/storage/v1/object/public/portfolio/';

drop policy if exists "portfolio_public_read" on storage.objects;
drop policy if exists "portfolio_authenticated_insert" on storage.objects;
drop policy if exists "portfolio_authenticated_update" on storage.objects;
drop policy if exists "portfolio_authenticated_delete" on storage.objects;
drop policy if exists "portfolio_tenant_read" on storage.objects;
drop policy if exists "portfolio_tenant_insert" on storage.objects;
drop policy if exists "portfolio_tenant_update" on storage.objects;
drop policy if exists "portfolio_tenant_delete" on storage.objects;

create policy "portfolio_tenant_read"
  on storage.objects
  for select
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = 'tenants'
    and exists (
      select 1
      from public.staff_members sm
      where sm.profile_id = auth.uid()
        and sm.tenant_id::text = (storage.foldername(name))[2]
        and sm.is_active = true
        and sm.deleted_at is null
    )
  );

create policy "portfolio_tenant_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'tenants'
    and exists (
      select 1
      from public.staff_members sm
      where sm.profile_id = auth.uid()
        and sm.tenant_id::text = (storage.foldername(name))[2]
        and sm.is_active = true
        and sm.deleted_at is null
    )
  );

create policy "portfolio_tenant_update"
  on storage.objects
  for update
  using (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'tenants'
    and exists (
      select 1
      from public.staff_members sm
      where sm.profile_id = auth.uid()
        and sm.tenant_id::text = (storage.foldername(name))[2]
        and sm.is_active = true
        and sm.deleted_at is null
    )
  )
  with check (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'tenants'
    and exists (
      select 1
      from public.staff_members sm
      where sm.profile_id = auth.uid()
        and sm.tenant_id::text = (storage.foldername(name))[2]
        and sm.is_active = true
        and sm.deleted_at is null
    )
  );

create policy "portfolio_tenant_delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'portfolio'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'tenants'
    and exists (
      select 1
      from public.staff_members sm
      where sm.profile_id = auth.uid()
        and sm.tenant_id::text = (storage.foldername(name))[2]
        and sm.is_active = true
        and sm.deleted_at is null
    )
  );
