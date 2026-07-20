-- =============================================================
-- 20260710093000_marketing_unsubscribe_tokens.sql
-- Secure opaque tokens for marketing unsubscribe without login.
-- =============================================================

create table if not exists public.marketing_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_unsubscribe_tokens_lookup
  on public.marketing_unsubscribe_tokens (tenant_id, token_hash);

create index if not exists idx_marketing_unsubscribe_tokens_expires_at
  on public.marketing_unsubscribe_tokens (expires_at);

alter table public.marketing_unsubscribe_tokens enable row level security;

comment on table public.marketing_unsubscribe_tokens is
  'Opaque hashed tokens used to revoke marketing consent from client-facing promotional emails.';

comment on column public.marketing_unsubscribe_tokens.expires_at is
  'Token validity deadline. Tokens are issued with a 30-day lifetime and cleaned up after expiry.';

create or replace function public.cleanup_expired_marketing_unsubscribe_tokens()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.marketing_unsubscribe_tokens
  where expires_at < now();
end;
$$;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;

  begin
    perform cron.unschedule('cleanup_expired_marketing_unsubscribe_tokens');
  exception when others then
    null;
  end;

  perform cron.schedule(
    'cleanup_expired_marketing_unsubscribe_tokens',
    '15 3 * * *',
    $cron$select public.cleanup_expired_marketing_unsubscribe_tokens()$cron$
  );
end;
$$;
