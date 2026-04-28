-- Admin v2: audit log + global settings + email templates

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  tenant_id uuid references public.tenants(id) on delete cascade,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_tenant_idx on public.admin_audit_log (tenant_id);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity_type, entity_id);

alter table public.admin_audit_log enable row level security;

create policy "superadmins read audit log"
  on public.admin_audit_log for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  );

-- Global key/value admin settings (feature flags, maintenance mode, etc)
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.admin_settings enable row level security;

create policy "superadmins manage settings"
  on public.admin_settings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  );

-- Email templates
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subject text not null,
  body text not null,
  variables jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.email_templates enable row level security;

create policy "superadmins manage email templates"
  on public.email_templates for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_superadmin = true
    )
  );

-- Seed default templates (idempotent)
insert into public.email_templates (slug, name, subject, body, variables) values
  ('welcome', 'Benvenuto', 'Benvenuto su Styll, {{full_name}}!', 'Ciao {{full_name}},\n\nGrazie per esserti registrato su Styll.', '["full_name"]'::jsonb),
  ('reminder', 'Promemoria appuntamento', 'Promemoria: appuntamento il {{date}}', 'Ciao {{client_name}},\n\nTi ricordiamo l''appuntamento del {{date}} alle {{time}} con {{staff_name}}.', '["client_name","date","time","staff_name"]'::jsonb),
  ('win_back', 'Ti aspettiamo', 'Ti manchiamo, {{client_name}}?', 'Ciao {{client_name}},\n\nÈ da un po'' che non ti vediamo. Torna a trovarci!', '["client_name"]'::jsonb)
on conflict (slug) do nothing;

-- Seed default settings (idempotent)
insert into public.admin_settings (key, value) values
  ('feature_flags', '{"gamification": false, "win_back": false, "ai_coach": false}'::jsonb),
  ('maintenance', '{"enabled": false, "message": ""}'::jsonb),
  ('default_branding', '{"primary_color": "#000000", "secondary_color": "#ffffff", "logo_url": null}'::jsonb),
  ('security', '{"enforce_2fa_superadmin": false, "session_timeout_minutes": 60}'::jsonb)
on conflict (key) do nothing;
