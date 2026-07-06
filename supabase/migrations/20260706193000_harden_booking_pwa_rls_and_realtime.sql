-- ============================================================
-- 20260706193000_harden_booking_pwa_rls_and_realtime.sql
-- Harden booking/PWA table RLS so browser queries and realtime subscriptions
-- are always tenant-scoped row-by-row, without relying on a single-tenant
-- helper such as get_my_tenant_id().
--
-- This migration intentionally removes direct browser write policies on
-- booking/PWA tables that are mutated through service-role server actions.
-- ============================================================

-- ─── appointments ─────────────────────────────────────────────
drop policy if exists "appointments_client_own" on public.appointments;
drop policy if exists "appointments_staff_own" on public.appointments;
drop policy if exists "appointments_tenant_access" on public.appointments;

create policy "appointments_select_staff_same_tenant"
  on public.appointments
  for select
  using (
    deleted_at is null
    and exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = appointments.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "appointments_select_client_self_same_tenant"
  on public.appointments
  for select
  using (
    deleted_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = appointments.client_id
        and c.tenant_id = appointments.tenant_id
        and c.profile_id = auth.uid()
        and c.deleted_at is null
    )
  );

-- ─── notifications (realtime-enabled) ────────────────────────
drop policy if exists "staff_read_own_tenant_notifications" on public.notifications;
drop policy if exists "staff_update_own_tenant_notifications" on public.notifications;

create policy "staff_read_own_tenant_notifications"
  on public.notifications
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = notifications.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
  );

create policy "staff_update_own_tenant_notifications"
  on public.notifications
  for update
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = notifications.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
  )
  with check (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = notifications.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
  );

-- ─── staff_members ────────────────────────────────────────────
drop policy if exists "staff_members_select" on public.staff_members;
drop policy if exists "staff_members_insert" on public.staff_members;
drop policy if exists "staff_members_update" on public.staff_members;
drop policy if exists "staff_members_delete" on public.staff_members;

create policy "staff_members_select_same_tenant"
  on public.staff_members
  for select
  using (
    staff_members.deleted_at is null
    and exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = staff_members.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── clients + loyalty family ────────────────────────────────
drop policy if exists "clients_tenant_access" on public.clients;
drop policy if exists "client_loyalty_tenant_access" on public.client_loyalty;
drop policy if exists "loyalty_transactions_tenant_access" on public.loyalty_transactions;
drop policy if exists "reward_redemptions_tenant_access" on public.reward_redemptions;

create policy "clients_select_staff_same_tenant"
  on public.clients
  for select
  using (
    clients.deleted_at is null
    and exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = clients.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "clients_select_self"
  on public.clients
  for select
  using (
    clients.deleted_at is null
    and clients.profile_id = auth.uid()
  );

create policy "client_loyalty_select_staff_same_tenant"
  on public.client_loyalty
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = client_loyalty.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "client_loyalty_select_client_self"
  on public.client_loyalty
  for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_loyalty.client_id
        and c.tenant_id = client_loyalty.tenant_id
        and c.profile_id = auth.uid()
        and c.deleted_at is null
    )
  );

create policy "loyalty_transactions_select_staff_same_tenant"
  on public.loyalty_transactions
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = loyalty_transactions.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "loyalty_transactions_select_client_self"
  on public.loyalty_transactions
  for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = loyalty_transactions.client_id
        and c.tenant_id = loyalty_transactions.tenant_id
        and c.profile_id = auth.uid()
        and c.deleted_at is null
    )
  );

create policy "reward_redemptions_select_staff_same_tenant"
  on public.reward_redemptions
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = reward_redemptions.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "reward_redemptions_select_client_self"
  on public.reward_redemptions
  for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = reward_redemptions.client_id
        and c.tenant_id = reward_redemptions.tenant_id
        and c.profile_id = auth.uid()
        and c.deleted_at is null
    )
  );

-- ─── booking / PWA support tables ─────────────────────────────
drop policy if exists "services_tenant_access" on public.services;
drop policy if exists "locations_tenant_access" on public.locations;
drop policy if exists "loyalty_configs_tenant_access" on public.loyalty_configs;
drop policy if exists "rewards_tenant_access" on public.rewards;
drop policy if exists "staff_locations_tenant_access" on public.staff_locations;
drop policy if exists "staff_services_tenant_access" on public.staff_services;
drop policy if exists "working_hours_tenant_access" on public.working_hours;
drop policy if exists "working_hour_overrides_tenant_access" on public.working_hour_overrides;
drop policy if exists "tenant_owner_write_promotions" on public.promotions;
drop policy if exists "tenant_staff_read_promotions" on public.promotions;

create policy "services_select_staff_same_tenant"
  on public.services
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = services.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "locations_select_staff_same_tenant"
  on public.locations
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = locations.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "loyalty_configs_select_staff_same_tenant"
  on public.loyalty_configs
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = loyalty_configs.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "rewards_select_staff_same_tenant"
  on public.rewards
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = rewards.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "promotions_select_staff_same_tenant"
  on public.promotions
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = promotions.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "staff_locations_select_staff_same_tenant"
  on public.staff_locations
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = staff_locations.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "staff_services_select_staff_same_tenant"
  on public.staff_services
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = staff_services.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "working_hours_select_staff_same_tenant"
  on public.working_hours
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = working_hours.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

create policy "working_hour_overrides_select_staff_same_tenant"
  on public.working_hour_overrides
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = working_hour_overrides.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );
