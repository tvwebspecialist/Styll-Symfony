-- ============================================================
-- 20260717093000_messaging_inbox_foundation.sql
-- Foundation per inbox conversazionale multi-tenant e transport
-- messaging. Obiettivo: partire con inbox umana e aggiungere AI/
-- WhatsApp senza rifare il dominio o duplicare i canali....
-- ============================================================

-- ─── Trigger helper updated_at ───────────────────────────────
create or replace function public.handle_messaging_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Integrazioni per-tenant ─────────────────────────────────
create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null
    check (provider in ('google_calendar', 'instagram', 'stripe', 'meta_whatsapp')),
  access_token_encrypted bytea,
  refresh_token_encrypted bytea,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  external_account_id text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_tenant_integrations_active
  on public.tenant_integrations (tenant_id, provider)
  where disconnected_at is null;

create index if not exists idx_tenant_integrations_external_account
  on public.tenant_integrations (provider, external_account_id)
  where disconnected_at is null and external_account_id is not null;

drop trigger if exists tenant_integrations_set_updated_at on public.tenant_integrations;
create trigger tenant_integrations_set_updated_at
  before update on public.tenant_integrations
  for each row execute function public.handle_messaging_updated_at();

alter table public.tenant_integrations enable row level security;

-- Nessuna policy browser-side: token e metadata provider restano server-only.

-- ─── Template di messaggistica ───────────────────────────────
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  type text not null
    check (type in (
      'reminder',
      'confirmation',
      'win_back',
      'review_request',
      'loyalty_update',
      'whatsapp_utility',
      'custom'
    )),
  channel text not null
    check (channel in ('whatsapp', 'sms', 'email', 'push')),
  locale text not null default 'it',
  provider_template_name text,
  provider_template_status text not null default 'draft'
    check (provider_template_status in ('draft', 'pending', 'approved', 'rejected', 'paused')),
  subject text,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_message_templates_provider_name
  on public.message_templates (tenant_id, channel, provider_template_name)
  where provider_template_name is not null;

create index if not exists idx_message_templates_tenant_channel
  on public.message_templates (tenant_id, channel, is_active);

drop trigger if exists message_templates_set_updated_at on public.message_templates;
create trigger message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.handle_messaging_updated_at();

alter table public.message_templates enable row level security;

drop policy if exists "message_templates_select_staff_same_tenant" on public.message_templates;
create policy "message_templates_select_staff_same_tenant"
  on public.message_templates
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = message_templates.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Conversazioni inbox ─────────────────────────────────────
create table if not exists public.inbox_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid references public.tenant_integrations(id) on delete set null,
  channel text not null check (channel in ('whatsapp')),
  provider text not null check (provider in ('meta_whatsapp')),
  conversation_key text not null unique,
  provider_phone_number_id text not null,
  external_contact_id text not null,
  contact_phone text,
  contact_display_name text,
  client_id uuid references public.clients(id) on delete set null,
  assigned_staff_id uuid references public.staff_members(id) on delete set null,
  status text not null default 'new'
    check (status in (
      'new',
      'ai_active',
      'ai_draft_only',
      'waiting_customer_input',
      'waiting_customer_confirmation',
      'waiting_staff_approval',
      'human_requested',
      'human_assigned',
      'human_active',
      'ai_paused',
      'resolved',
      'closed'
    )),
  ownership_mode text not null default 'hybrid'
    check (ownership_mode in ('ai', 'human', 'hybrid')),
  last_customer_message_at timestamptz,
  service_window_expires_at timestamptz,
  last_business_message_at timestamptz,
  last_template_message_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer not null default 0 check (unread_count >= 0),
  ai_paused_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inbox_conversations_tenant_last_message
  on public.inbox_conversations (tenant_id, last_message_at desc nulls last);

create index if not exists idx_inbox_conversations_assigned_status
  on public.inbox_conversations (tenant_id, status, assigned_staff_id);

create index if not exists idx_inbox_conversations_provider_contact
  on public.inbox_conversations (provider, provider_phone_number_id, external_contact_id);

drop trigger if exists inbox_conversations_set_updated_at on public.inbox_conversations;
create trigger inbox_conversations_set_updated_at
  before update on public.inbox_conversations
  for each row execute function public.handle_messaging_updated_at();

alter table public.inbox_conversations enable row level security;

drop policy if exists "inbox_conversations_select_staff_same_tenant" on public.inbox_conversations;
create policy "inbox_conversations_select_staff_same_tenant"
  on public.inbox_conversations
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = inbox_conversations.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Log messaggi cross-canale ───────────────────────────────
create table if not exists public.messages_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid references public.inbox_conversations(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  template_id uuid references public.message_templates(id) on delete set null,
  channel text not null
    check (channel in ('whatsapp', 'sms', 'email', 'push')),
  provider text not null
    check (provider in (
      'meta_whatsapp',
      'messagebird',
      'infobip',
      'twilio',
      'resend',
      'web_push',
      'system'
    )),
  direction text not null
    check (direction in ('inbound', 'outbound')),
  type text not null,
  recipient text,
  body_sent text,
  external_id text,
  status text not null
    check (status in ('queued', 'sent', 'delivered', 'read', 'received', 'failed', 'bounced')),
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_messages_log_provider_external_id
  on public.messages_log (provider, external_id)
  where external_id is not null;

create index if not exists idx_messages_log_tenant_sent_at
  on public.messages_log (tenant_id, sent_at desc nulls last);

create index if not exists idx_messages_log_tenant_client_sent_at
  on public.messages_log (tenant_id, client_id, sent_at desc nulls last);

alter table public.messages_log enable row level security;

drop policy if exists "messages_log_select_staff_same_tenant" on public.messages_log;
create policy "messages_log_select_staff_same_tenant"
  on public.messages_log
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = messages_log.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Outbox operativa ────────────────────────────────────────
create table if not exists public.messaging_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid references public.inbox_conversations(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  template_id uuid references public.message_templates(id) on delete set null,
  channel text not null
    check (channel in ('whatsapp', 'sms', 'email', 'push')),
  provider text not null
    check (provider in ('meta_whatsapp', 'messagebird', 'infobip', 'twilio', 'resend', 'web_push')),
  recipient text not null,
  scheduled_for timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  last_error text,
  messages_log_id uuid references public.messages_log(id) on delete set null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_messaging_outbox_pending_scheduled
  on public.messaging_outbox (scheduled_for)
  where status = 'pending';

create index if not exists idx_messaging_outbox_tenant_status
  on public.messaging_outbox (tenant_id, status, scheduled_for);

alter table public.messaging_outbox enable row level security;

-- Nessuna policy browser-side: la coda è processata solo da worker/server.

-- ─── Inbox webhook provider ───────────────────────────────────
create table if not exists public.webhook_events_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('meta_whatsapp', 'messagebird', 'infobip', 'stripe', 'twilio')),
  external_id text not null,
  event_type text not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  integration_id uuid references public.tenant_integrations(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  signature text,
  status text not null default 'received'
    check (status in ('received', 'processed', 'skipped', 'failed')),
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now(),
  constraint webhook_events_inbox_provider_external_unique unique (provider, external_id)
);

create index if not exists idx_webhook_events_inbox_received
  on public.webhook_events_inbox (received_at)
  where status = 'received';

create index if not exists idx_webhook_events_inbox_tenant
  on public.webhook_events_inbox (tenant_id, received_at desc);

alter table public.webhook_events_inbox enable row level security;

-- Nessuna policy browser-side: payload e firme restano server-only.

-- ─── Metering quote tenant ────────────────────────────────────
create table if not exists public.tenant_usage_counters (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_month date not null,
  metric text not null
    check (metric in (
      'sms_sent',
      'whatsapp_sent',
      'email_sent',
      'push_sent',
      'ai_requests',
      'ai_input_tokens',
      'ai_output_tokens'
    )),
  count bigint not null default 0 check (count >= 0),
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, period_month, metric)
);

create index if not exists idx_tenant_usage_counters_period_metric
  on public.tenant_usage_counters (period_month, metric);

alter table public.tenant_usage_counters enable row level security;

drop policy if exists "tenant_usage_counters_select_staff_same_tenant" on public.tenant_usage_counters;
create policy "tenant_usage_counters_select_staff_same_tenant"
  on public.tenant_usage_counters
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = tenant_usage_counters.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Messaggi inbox normalizzati ──────────────────────────────
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  provider text not null check (provider in ('meta_whatsapp')),
  direction text not null check (direction in ('inbound', 'outbound', 'system')),
  author_kind text not null check (author_kind in ('customer', 'assistant', 'human', 'system')),
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_staff_id uuid references public.staff_members(id) on delete set null,
  meta_message_id text,
  provider_event_id text,
  used_template boolean not null default false,
  body_text text,
  media jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  messages_log_id uuid references public.messages_log(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_inbox_messages_meta_message_id
  on public.inbox_messages (meta_message_id)
  where meta_message_id is not null;

create index if not exists idx_inbox_messages_conversation_created
  on public.inbox_messages (conversation_id, created_at asc);

alter table public.inbox_messages enable row level security;

drop policy if exists "inbox_messages_select_staff_same_tenant" on public.inbox_messages;
create policy "inbox_messages_select_staff_same_tenant"
  on public.inbox_messages
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = inbox_messages.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Assegnazioni operative ───────────────────────────────────
create table if not exists public.inbox_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  assigned_staff_id uuid references public.staff_members(id) on delete set null,
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  assignment_reason text,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_inbox_assignments_active_conversation
  on public.inbox_assignments (conversation_id)
  where released_at is null;

create index if not exists idx_inbox_assignments_staff_active
  on public.inbox_assignments (tenant_id, assigned_staff_id, created_at desc)
  where released_at is null;

alter table public.inbox_assignments enable row level security;

drop policy if exists "inbox_assignments_select_staff_same_tenant" on public.inbox_assignments;
create policy "inbox_assignments_select_staff_same_tenant"
  on public.inbox_assignments
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = inbox_assignments.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Conferme single-use per azioni AI ───────────────────────
create table if not exists public.inbox_pending_confirmations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  tool_name text not null
    check (tool_name in (
      'prepare_appointment',
      'confirm_appointment',
      'prepare_reschedule',
      'confirm_reschedule',
      'prepare_cancellation',
      'confirm_cancellation'
    )),
  canonical_payload_hash text not null,
  summary_shown_to_customer text not null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_inbox_pending_confirmations_active
  on public.inbox_pending_confirmations (conversation_id, expires_at)
  where consumed_at is null;

alter table public.inbox_pending_confirmations enable row level security;

drop policy if exists "inbox_pending_confirmations_select_staff_same_tenant" on public.inbox_pending_confirmations;
create policy "inbox_pending_confirmations_select_staff_same_tenant"
  on public.inbox_pending_confirmations
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = inbox_pending_confirmations.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Audit run AI ─────────────────────────────────────────────
create table if not exists public.inbox_ai_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  message_id uuid references public.inbox_messages(id) on delete set null,
  model text not null,
  mode text not null check (mode in ('draft_only', 'faq_auto', 'transaction_prepare')),
  status text not null check (status in ('started', 'completed', 'failed', 'blocked', 'skipped')),
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  final_policy_decision text
    check (final_policy_decision in ('allow', 'ask_customer', 'ask_staff', 'ask_owner', 'deny_ai')),
  handoff_reason text,
  input_context jsonb not null default '{}'::jsonb,
  output_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_inbox_ai_runs_conversation_created
  on public.inbox_ai_runs (conversation_id, created_at desc);

create index if not exists idx_inbox_ai_runs_tenant_status
  on public.inbox_ai_runs (tenant_id, status, created_at desc);

alter table public.inbox_ai_runs enable row level security;

drop policy if exists "inbox_ai_runs_select_staff_same_tenant" on public.inbox_ai_runs;
create policy "inbox_ai_runs_select_staff_same_tenant"
  on public.inbox_ai_runs
  for select
  using (
    exists (
      select 1
      from public.staff_members actor
      where actor.profile_id = auth.uid()
        and actor.tenant_id = inbox_ai_runs.tenant_id
        and actor.is_active = true
        and actor.deleted_at is null
    )
  );

-- ─── Trigger: conversation snapshot al nuovo messaggio ──────
create or replace function public.handle_inbox_message_insert()
returns trigger
language plpgsql
as $$
declare
  preview_text text;
begin
  preview_text := left(
    coalesce(nullif(btrim(new.body_text), ''), '[media]'),
    240
  );

  update public.inbox_conversations
     set last_message_at = new.created_at,
         last_message_preview = preview_text,
         last_customer_message_at = case
           when new.direction = 'inbound' and new.author_kind = 'customer'
             then new.created_at
           else last_customer_message_at
         end,
         service_window_expires_at = case
           when new.direction = 'inbound' and new.author_kind = 'customer'
             then new.created_at + interval '24 hours'
           else service_window_expires_at
         end,
         last_business_message_at = case
           when new.direction = 'outbound' and new.author_kind in ('assistant', 'human', 'system')
             then new.created_at
           else last_business_message_at
         end,
         last_template_message_at = case
           when new.direction = 'outbound' and new.used_template = true
             then new.created_at
           else last_template_message_at
         end,
         unread_count = case
           when new.direction = 'inbound' and new.author_kind = 'customer'
             then unread_count + 1
           else unread_count
         end,
         status = case
           when new.direction = 'inbound'
            and new.author_kind = 'customer'
            and status in ('resolved', 'closed')
             then 'new'
           else status
         end,
         updated_at = now()
   where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists inbox_messages_after_insert on public.inbox_messages;
create trigger inbox_messages_after_insert
  after insert on public.inbox_messages
  for each row execute function public.handle_inbox_message_insert();
