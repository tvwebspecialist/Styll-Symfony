-- =============================================================
-- 20260430000001_team_invitations.sql
-- Team invitation system for multi-tenant staff onboarding.
-- Allows owners/managers to invite new team members via email.
-- =============================================================

-- ─── 1. Create team_invitations table ──────────────────────

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  token text not null unique,
  role text not null default 'staff',
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  constraint team_invitations_valid_role check (role in ('owner', 'manager', 'staff', 'receptionist'))
);

-- Partial unique index: only one pending invitation per tenant+email
create unique index if not exists team_invitations_tenant_email_pending_idx
  on public.team_invitations (tenant_id, email)
  where status = 'pending';

-- Add index for fast lookup by token and tenant
create index if not exists idx_team_invitations_token on public.team_invitations(token);
create index if not exists idx_team_invitations_tenant_email on public.team_invitations(tenant_id, email, status);
create index if not exists idx_team_invitations_expires_at on public.team_invitations(expires_at) where status = 'pending';

-- ─── 2. Row Level Security ──────────────────────────────────

alter table public.team_invitations enable row level security;

-- Only owners/managers of the tenant can view invitations
drop policy if exists "Team invitations viewable by tenant staff" on public.team_invitations;
create policy "Team invitations viewable by tenant staff"
  on public.team_invitations for select
  using (
    exists (
      select 1 from public.staff_members sm
      where sm.tenant_id = team_invitations.tenant_id
        and sm.profile_id = auth.uid()
        and sm.role in ('owner', 'manager')
        and sm.is_active = true
        and sm.deleted_at is null
    )
  );

-- Only owners/managers can create invitations
drop policy if exists "Team invitations insertable by tenant owners/managers" on public.team_invitations;
create policy "Team invitations insertable by tenant owners/managers"
  on public.team_invitations for insert
  with check (
    exists (
      select 1 from public.staff_members sm
      where sm.tenant_id = team_invitations.tenant_id
        and sm.profile_id = auth.uid()
        and sm.role in ('owner', 'manager')
        and sm.is_active = true
        and sm.deleted_at is null
    )
    and created_by = auth.uid()
  );

-- Only owners/managers can update their own tenant's invitations
drop policy if exists "Team invitations updatable by tenant owners/managers" on public.team_invitations;
create policy "Team invitations updatable by tenant owners/managers"
  on public.team_invitations for update
  using (
    exists (
      select 1 from public.staff_members sm
      where sm.tenant_id = team_invitations.tenant_id
        and sm.profile_id = auth.uid()
        and sm.role in ('owner', 'manager')
        and sm.is_active = true
        and sm.deleted_at is null
    )
  );

-- ─── 3. Helper functions ────────────────────────────────────

-- Generate a random token for invitations
create or replace function public.generate_invitation_token()
returns text as $$
declare
  token text;
  token_exists boolean;
begin
  loop
    token := encode(gen_random_bytes(32), 'hex');
    
    select exists(
      select 1 from public.team_invitations where team_invitations.token = token
    ) into token_exists;
    
    exit when not token_exists;
  end loop;
  
  return token;
end;
$$ language plpgsql;

-- Get invitation details by token (visible to anyone to verify email)
create or replace function public.get_invitation_by_token(p_token text)
returns table (
  id uuid,
  tenant_id uuid,
  tenant_name text,
  email text,
  role text,
  status text,
  expires_at timestamptz,
  is_expired boolean
) as $$
begin
  return query
  select
    ti.id,
    ti.tenant_id,
    t.business_name,
    ti.email,
    ti.role,
    ti.status,
    ti.expires_at,
    now() > ti.expires_at as is_expired
  from public.team_invitations ti
  join public.tenants t on t.id = ti.tenant_id
  where ti.token = p_token;
end;
$$ language plpgsql;
