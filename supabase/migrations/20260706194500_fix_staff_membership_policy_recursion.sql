-- ============================================================
-- 20260706194500_fix_staff_membership_policy_recursion.sql
-- Fix recursive tenant-membership checks introduced by row policies that read
-- public.staff_members from inside other public.staff_members-based policies.
-- ============================================================

create or replace function public.has_active_staff_membership(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.profile_id = auth.uid()
      and sm.tenant_id = p_tenant_id
      and sm.is_active = true
      and sm.deleted_at is null
  );
$$;

revoke execute on function public.has_active_staff_membership(uuid) from public, anon, authenticated;
grant execute on function public.has_active_staff_membership(uuid) to authenticated, service_role;

drop policy if exists "appointments_select_staff_same_tenant" on public.appointments;
create policy "appointments_select_staff_same_tenant"
  on public.appointments
  for select
  using (
    deleted_at is null
    and public.has_active_staff_membership(appointments.tenant_id)
  );

drop policy if exists "staff_read_own_tenant_notifications" on public.notifications;
create policy "staff_read_own_tenant_notifications"
  on public.notifications
  for select
  using (
    public.has_active_staff_membership(notifications.tenant_id)
    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
  );

drop policy if exists "staff_update_own_tenant_notifications" on public.notifications;
create policy "staff_update_own_tenant_notifications"
  on public.notifications
  for update
  using (
    public.has_active_staff_membership(notifications.tenant_id)
    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
  )
  with check (
    public.has_active_staff_membership(notifications.tenant_id)
    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
  );

drop policy if exists "staff_members_select_same_tenant" on public.staff_members;
create policy "staff_members_select_same_tenant"
  on public.staff_members
  for select
  using (
    staff_members.deleted_at is null
    and public.has_active_staff_membership(staff_members.tenant_id)
  );

drop policy if exists "clients_select_staff_same_tenant" on public.clients;
create policy "clients_select_staff_same_tenant"
  on public.clients
  for select
  using (
    clients.deleted_at is null
    and public.has_active_staff_membership(clients.tenant_id)
  );

drop policy if exists "client_loyalty_select_staff_same_tenant" on public.client_loyalty;
create policy "client_loyalty_select_staff_same_tenant"
  on public.client_loyalty
  for select
  using (public.has_active_staff_membership(client_loyalty.tenant_id));

drop policy if exists "loyalty_transactions_select_staff_same_tenant" on public.loyalty_transactions;
create policy "loyalty_transactions_select_staff_same_tenant"
  on public.loyalty_transactions
  for select
  using (public.has_active_staff_membership(loyalty_transactions.tenant_id));

drop policy if exists "reward_redemptions_select_staff_same_tenant" on public.reward_redemptions;
create policy "reward_redemptions_select_staff_same_tenant"
  on public.reward_redemptions
  for select
  using (public.has_active_staff_membership(reward_redemptions.tenant_id));

drop policy if exists "services_select_staff_same_tenant" on public.services;
create policy "services_select_staff_same_tenant"
  on public.services
  for select
  using (public.has_active_staff_membership(services.tenant_id));

drop policy if exists "locations_select_staff_same_tenant" on public.locations;
create policy "locations_select_staff_same_tenant"
  on public.locations
  for select
  using (public.has_active_staff_membership(locations.tenant_id));

drop policy if exists "loyalty_configs_select_staff_same_tenant" on public.loyalty_configs;
create policy "loyalty_configs_select_staff_same_tenant"
  on public.loyalty_configs
  for select
  using (public.has_active_staff_membership(loyalty_configs.tenant_id));

drop policy if exists "rewards_select_staff_same_tenant" on public.rewards;
create policy "rewards_select_staff_same_tenant"
  on public.rewards
  for select
  using (public.has_active_staff_membership(rewards.tenant_id));

drop policy if exists "promotions_select_staff_same_tenant" on public.promotions;
create policy "promotions_select_staff_same_tenant"
  on public.promotions
  for select
  using (public.has_active_staff_membership(promotions.tenant_id));

drop policy if exists "staff_locations_select_staff_same_tenant" on public.staff_locations;
create policy "staff_locations_select_staff_same_tenant"
  on public.staff_locations
  for select
  using (public.has_active_staff_membership(staff_locations.tenant_id));

drop policy if exists "staff_services_select_staff_same_tenant" on public.staff_services;
create policy "staff_services_select_staff_same_tenant"
  on public.staff_services
  for select
  using (public.has_active_staff_membership(staff_services.tenant_id));

drop policy if exists "working_hours_select_staff_same_tenant" on public.working_hours;
create policy "working_hours_select_staff_same_tenant"
  on public.working_hours
  for select
  using (public.has_active_staff_membership(working_hours.tenant_id));

drop policy if exists "working_hour_overrides_select_staff_same_tenant" on public.working_hour_overrides;
create policy "working_hour_overrides_select_staff_same_tenant"
  on public.working_hour_overrides
  for select
  using (public.has_active_staff_membership(working_hour_overrides.tenant_id));
