-- Additive inbox AI runtime metadata for the first inbound receptionist slice.
-- Rollback strategy:
--   1. disable the inbound AI worker/trigger path;
--   2. drop the indexes added here;
--   3. drop the added columns if no longer needed;
--   4. restore the previous inbox_ai_runs status check without 'queued'.

alter table public.inbox_ai_runs
  add column if not exists provider_id text,
  add column if not exists prompt_id text,
  add column if not exists prompt_version text,
  add column if not exists intent text,
  add column if not exists confidence double precision
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  add column if not exists decision_kind text,
  add column if not exists reason_code text,
  add column if not exists deterministic_resolver text,
  add column if not exists used_authoritative_knowledge boolean not null default false,
  add column if not exists cited_source_summary jsonb not null default '[]'::jsonb,
  add column if not exists error_category text;

update public.inbox_ai_runs
   set provider_id = coalesce(provider_id, model),
       prompt_id = coalesce(prompt_id, input_context #>> '{prompt,id}'),
       prompt_version = coalesce(prompt_version, input_context #>> '{prompt,version}'),
       intent = coalesce(intent, input_context #>> '{response,intent}'),
       confidence = coalesce(
         confidence,
         nullif(input_context #>> '{response,confidence}', '')::double precision
       ),
       decision_kind = coalesce(decision_kind, input_context #>> '{response,decision,kind}'),
       reason_code = coalesce(reason_code, input_context #>> '{response,decision,reason_code}'),
       deterministic_resolver = coalesce(
         deterministic_resolver,
         input_context #>> '{response,authoritative_resolution,resolver}'
       )
 where provider_id is null
    or prompt_id is null
    or prompt_version is null
    or intent is null
    or confidence is null
    or decision_kind is null
    or reason_code is null
    or deterministic_resolver is null;

alter table public.inbox_ai_runs
  drop constraint if exists inbox_ai_runs_status_check;

alter table public.inbox_ai_runs
  add constraint inbox_ai_runs_status_check
  check (status in ('queued', 'started', 'completed', 'failed', 'blocked', 'skipped'));

create unique index if not exists idx_inbox_ai_runs_message_mode_unique
  on public.inbox_ai_runs (message_id, mode)
  where message_id is not null;

create index if not exists idx_inbox_ai_runs_queued_created
  on public.inbox_ai_runs (created_at)
  where status = 'queued';

create index if not exists idx_inbox_ai_runs_tenant_message
  on public.inbox_ai_runs (tenant_id, message_id)
  where message_id is not null;
