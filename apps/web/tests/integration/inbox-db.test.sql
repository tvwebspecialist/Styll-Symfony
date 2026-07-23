-- ============================================================
-- inbox-db.test.sql
-- Real PostgreSQL integration tests for inbox trigger, tenant
-- isolation, and webhook deduplication.
--
-- Run against local Postgres (NOT Supabase remote):
--   psql -h /tmp -p 5432 -d styll_inbox_test -f inbox-db.test.sql
--
-- The test database must already exist (created by setup script).
-- ============================================================

\set ON_ERROR_STOP on

-- ─── Helpers ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION test_assert(
  condition boolean,
  test_name text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION 'FAIL: %', test_name;
  END IF;
  RAISE NOTICE 'ok - %', test_name;
END;
$$;

-- ─── Fixtures ────────────────────────────────────────────────

-- Two tenants for isolation tests
INSERT INTO public.tenants (id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Conversations for each tenant
INSERT INTO public.inbox_conversations (
  id, tenant_id, channel, provider, conversation_key,
  provider_phone_number_id, external_contact_id
) VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',  -- tenant A
  'whatsapp', 'meta_whatsapp',
  'key_tenant_a_1', '111', 'ext_a_1'
), (
  'cccccccc-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000002',  -- tenant B
  'whatsapp', 'meta_whatsapp',
  'key_tenant_b_1', '222', 'ext_b_1'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- SECTION 1: TRIGGER handle_inbox_message_insert
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  conv_id uuid := 'cccccccc-0000-0000-0000-000000000001';
  conv record;
  msg_ts timestamptz := now();
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TRIGGER TESTS ===';

  -- ── A. inbound/customer: unread increments, preview set, last_message_at set ──
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    conv_id, 'meta_whatsapp',
    'inbound', 'customer', 'Ciao, avete posto domani?', msg_ts
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = conv_id;
  PERFORM test_assert(conv.unread_count = 1,
    'A: inbound/customer → unread_count = 1');
  PERFORM test_assert(conv.last_message_preview = 'Ciao, avete posto domani?',
    'A: inbound/customer → last_message_preview set');
  PERFORM test_assert(conv.last_message_at = msg_ts,
    'A: inbound/customer → last_message_at = created_at');

  -- ── B. outbound/human: unread does NOT increment ──────────
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    conv_id, 'meta_whatsapp',
    'outbound', 'human', 'Sì, disponibili alle 15', now()
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = conv_id;
  PERFORM test_assert(conv.unread_count = 1,
    'B: outbound/human → unread_count unchanged (still 1)');
  PERFORM test_assert(conv.last_message_preview = 'Sì, disponibili alle 15',
    'B: outbound/human → preview updated to latest message');

  -- ── C. system message: unread does NOT increment ──────────
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    conv_id, 'meta_whatsapp',
    'system', 'system', 'Conversazione aperta', now()
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = conv_id;
  PERFORM test_assert(conv.unread_count = 1,
    'C: system message → unread_count unchanged (still 1)');

  -- ── D. body_text NULL → preview = '[media]' ───────────────
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    conv_id, 'meta_whatsapp',
    'inbound', 'customer', NULL, now()
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = conv_id;
  PERFORM test_assert(conv.last_message_preview = '[media]',
    'D: NULL body_text → preview = [media]');
  PERFORM test_assert(conv.unread_count = 2,
    'D: NULL body inbound/customer still increments unread');

  -- ── D2. body_text whitespace-only → preview = '[media]' ───
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    conv_id, 'meta_whatsapp',
    'inbound', 'customer', '   ', now()
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = conv_id;
  PERFORM test_assert(conv.last_message_preview = '[media]',
    'D2: whitespace body_text → preview = [media]');

  -- ── E. body_text > 240 chars → preview truncated at 240 ───
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind,
    body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    conv_id, 'meta_whatsapp',
    'inbound', 'customer',
    repeat('x', 300), now()
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = conv_id;
  PERFORM test_assert(length(conv.last_message_preview) = 240,
    'E: body_text > 240 chars → preview truncated to exactly 240');

END;
$$;

-- ── F. two distinct inbound messages → unread_count = +2 ────
-- (fresh conversation to get a clean unread baseline)

DO $$
DECLARE
  fresh_conv_id uuid := 'cccccccc-0000-0000-0000-000000000003';
  conv record;
BEGIN
  INSERT INTO public.inbox_conversations (
    id, tenant_id, channel, provider, conversation_key,
    provider_phone_number_id, external_contact_id
  ) VALUES (
    fresh_conv_id,
    'aaaaaaaa-0000-0000-0000-000000000001',
    'whatsapp', 'meta_whatsapp',
    'key_f_test', '111', 'ext_f'
  );

  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text
  ) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', fresh_conv_id,
     'meta_whatsapp', 'inbound', 'customer', 'msg 1'),
    ('aaaaaaaa-0000-0000-0000-000000000001', fresh_conv_id,
     'meta_whatsapp', 'inbound', 'customer', 'msg 2');

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = fresh_conv_id;
  PERFORM test_assert(conv.unread_count = 2,
    'F: two inbound messages → unread_count = 2');
  PERFORM test_assert(conv.last_message_preview = 'msg 2',
    'F: last_message_preview = last inserted message');
END;
$$;

-- ── G. duplicate meta_message_id → one row, one unread ───────

DO $$
DECLARE
  dup_conv_id uuid := 'cccccccc-0000-0000-0000-000000000004';
  dup_msg_id text := 'wamid.dedup_test_001';
  conv record;
  msg_count integer;
  dup_error text;
BEGIN
  INSERT INTO public.inbox_conversations (
    id, tenant_id, channel, provider, conversation_key,
    provider_phone_number_id, external_contact_id
  ) VALUES (
    dup_conv_id,
    'aaaaaaaa-0000-0000-0000-000000000001',
    'whatsapp', 'meta_whatsapp',
    'key_g_dedup', '111', 'ext_g'
  );

  -- First insert: succeeds
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, meta_message_id
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    dup_conv_id, 'meta_whatsapp',
    'inbound', 'customer', 'Duplicated message', dup_msg_id
  );

  -- Second insert with same meta_message_id: must fail with 23505
  BEGIN
    INSERT INTO public.inbox_messages (
      tenant_id, conversation_id, provider,
      direction, author_kind, body_text, meta_message_id
    ) VALUES (
      'aaaaaaaa-0000-0000-0000-000000000001',
      dup_conv_id, 'meta_whatsapp',
      'inbound', 'customer', 'Duplicated message', dup_msg_id
    );
    dup_error := 'no error thrown';
  EXCEPTION WHEN unique_violation THEN
    dup_error := SQLERRM;
    -- SQLERRSTATE = '23505'
  END;

  SELECT count(*) INTO msg_count
    FROM public.inbox_messages
   WHERE meta_message_id = dup_msg_id;

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = dup_conv_id;

  PERFORM test_assert(dup_error LIKE '%duplicate key%' OR dup_error LIKE '%unique%',
    'G: duplicate meta_message_id → unique_violation raised');
  PERFORM test_assert(msg_count = 1,
    'G: duplicate meta_message_id → only 1 row in inbox_messages');
  PERFORM test_assert(conv.unread_count = 1,
    'G: duplicate rejected → unread_count = 1 (trigger not fired twice)');
END;
$$;

-- ── H. resolved conversation → reopened to 'new' on inbound ─

DO $$
DECLARE
  reopen_conv_id uuid := 'cccccccc-0000-0000-0000-000000000005';
  conv record;
BEGIN
  INSERT INTO public.inbox_conversations (
    id, tenant_id, channel, provider, conversation_key,
    provider_phone_number_id, external_contact_id, status
  ) VALUES (
    reopen_conv_id,
    'aaaaaaaa-0000-0000-0000-000000000001',
    'whatsapp', 'meta_whatsapp',
    'key_h_reopen', '111', 'ext_h',
    'resolved'  -- pre-existing resolved state
  );

  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    reopen_conv_id, 'meta_whatsapp',
    'inbound', 'customer', 'Sono tornato!'
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = reopen_conv_id;
  PERFORM test_assert(conv.status = 'new',
    'H: inbound on resolved conv → status reopened to new');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SECTION 2: TENANT ISOLATION (mirrors queryInboxMessages logic)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  -- Tenant B conversation is cccccccc-0000-0000-0000-000000000002
  conv_b_id uuid := 'cccccccc-0000-0000-0000-000000000002';
  tenant_a  uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  tenant_b  uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  msg_count_a integer;
  msg_count_b integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TENANT ISOLATION TESTS ===';

  -- Insert a message into tenant B's conversation
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text
  ) VALUES (
    tenant_b,
    conv_b_id, 'meta_whatsapp',
    'inbound', 'customer', 'Messaggio tenant B'
  );

  -- Query with tenant A's ID + tenant B's conversation_id → 0 rows (IDOR prevention)
  SELECT count(*) INTO msg_count_a
    FROM public.inbox_messages
   WHERE tenant_id = tenant_a          -- tenant A
     AND conversation_id = conv_b_id;  -- but conversation belongs to tenant B

  -- Query with correct tenant B's ID → 1 row
  SELECT count(*) INTO msg_count_b
    FROM public.inbox_messages
   WHERE tenant_id = tenant_b
     AND conversation_id = conv_b_id;

  PERFORM test_assert(msg_count_a = 0,
    'ISOLATION: tenant_id=A + conversation_id=B → 0 rows (IDOR blocked)');
  PERFORM test_assert(msg_count_b = 1,
    'ISOLATION: tenant_id=B + conversation_id=B → 1 row (correct)');
END;
$$;

-- Tenant isolation for conversations list
DO $$
DECLARE
  tenant_a  uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  tenant_b  uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  conv_count_a integer;
  conv_count_b integer;
BEGIN
  SELECT count(*) INTO conv_count_a
    FROM public.inbox_conversations WHERE tenant_id = tenant_a;
  SELECT count(*) INTO conv_count_b
    FROM public.inbox_conversations WHERE tenant_id = tenant_b;

  PERFORM test_assert(conv_count_a >= 1,
    'ISOLATION: tenant A sees own conversations');
  PERFORM test_assert(conv_count_b = 1,
    'ISOLATION: tenant B sees only its own conversations');
  PERFORM test_assert(
    NOT EXISTS (
      SELECT 1 FROM public.inbox_conversations
       WHERE tenant_id = tenant_a
         AND id = 'cccccccc-0000-0000-0000-000000000002'
    ),
    'ISOLATION: tenant A query cannot see tenant B conversation');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SECTION 3: WEBHOOK DEDUPLICATION (webhook_events_inbox)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  dup_error text;
  event_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== WEBHOOK DEDUPLICATION TESTS ===';

  -- First delivery: succeeds
  INSERT INTO public.webhook_events_inbox (
    provider, external_id, event_type, payload
  ) VALUES (
    'meta_whatsapp', 'wh_event_001', 'messages', '{"test": 1}'::jsonb
  );

  -- Second delivery of same external_id: must raise 23505
  BEGIN
    INSERT INTO public.webhook_events_inbox (
      provider, external_id, event_type, payload
    ) VALUES (
      'meta_whatsapp', 'wh_event_001', 'messages', '{"test": 2}'::jsonb
    );
    dup_error := 'no error';
  EXCEPTION WHEN unique_violation THEN
    dup_error := 'unique_violation';
  END;

  SELECT count(*) INTO event_count
    FROM public.webhook_events_inbox
   WHERE provider = 'meta_whatsapp' AND external_id = 'wh_event_001';

  PERFORM test_assert(dup_error = 'unique_violation',
    'WEBHOOK DEDUP: second delivery → unique_violation (23505)');
  PERFORM test_assert(event_count = 1,
    'WEBHOOK DEDUP: only 1 row inserted for duplicate external_id');

  -- Different provider, same external_id: allowed
  INSERT INTO public.webhook_events_inbox (
    provider, external_id, event_type, payload
  ) VALUES (
    'stripe', 'wh_event_001', 'payment_intent', '{}'::jsonb
  );

  PERFORM test_assert(true,
    'WEBHOOK DEDUP: same external_id different provider → allowed');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SECTION 4: INBOUND AI RUN IDEMPOTENCY
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  ai_msg_id uuid := 'dddddddd-0000-0000-0000-000000000001';
  dup_error text;
  run_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== INBOUND AI RUN IDEMPOTENCY TESTS ===';

  INSERT INTO public.inbox_messages (
    id, tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    ai_msg_id,
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000001',
    'meta_whatsapp',
    'inbound',
    'customer',
    'Quanto costa il taglio?',
    now()
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inbox_ai_runs (
    tenant_id, conversation_id, message_id,
    provider_id, prompt_id, prompt_version,
    model, mode, status
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000001',
    ai_msg_id,
    'deterministic_fake_draft_v1',
    'whatsapp_inbox_draft_only',
    '2026-07-20.v4',
    'deterministic_fake_draft_v1',
    'draft_only',
    'queued'
  );

  BEGIN
    INSERT INTO public.inbox_ai_runs (
      tenant_id, conversation_id, message_id,
      provider_id, prompt_id, prompt_version,
      model, mode, status
    ) VALUES (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      ai_msg_id,
      'deterministic_fake_draft_v1',
      'whatsapp_inbox_draft_only',
      '2026-07-20.v4',
      'deterministic_fake_draft_v1',
      'draft_only',
      'queued'
    );
    dup_error := 'no error';
  EXCEPTION WHEN unique_violation THEN
    dup_error := 'unique_violation';
  END;

  SELECT count(*) INTO run_count
    FROM public.inbox_ai_runs
   WHERE message_id = ai_msg_id
     AND mode = 'draft_only';

  PERFORM test_assert(dup_error = 'unique_violation',
    'INBOUND AI IDEMPOTENCY: duplicate run for same inbound message -> unique_violation');
  PERFORM test_assert(run_count = 1,
    'INBOUND AI IDEMPOTENCY: only one draft_only run exists for the same inbound message');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SECTION 5: CONSTRAINT COVERAGE
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  ck_error text;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CONSTRAINT TESTS ===';

  -- unread_count cannot go below 0 directly (constraint check >= 0)
  BEGIN
    UPDATE public.inbox_conversations
       SET unread_count = -1
     WHERE id = 'cccccccc-0000-0000-0000-000000000001';
    ck_error := 'no error';
  EXCEPTION WHEN check_violation THEN
    ck_error := 'check_violation';
  END;
  PERFORM test_assert(ck_error = 'check_violation',
    'CONSTRAINT: unread_count cannot be set to -1 directly');

  -- conversation_key must be unique
  BEGIN
    INSERT INTO public.inbox_conversations (
      tenant_id, channel, provider, conversation_key,
      provider_phone_number_id, external_contact_id
    ) VALUES (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'whatsapp', 'meta_whatsapp',
      'key_tenant_a_1',  -- already exists
      '111', 'ext_dup'
    );
    ck_error := 'no error';
  EXCEPTION WHEN unique_violation THEN
    ck_error := 'unique_violation';
  END;
  PERFORM test_assert(ck_error = 'unique_violation',
    'CONSTRAINT: conversation_key is globally unique');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SECTION 6: service_window_expires_at
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  sw_conv_id uuid := 'cccccccc-0000-0000-0000-000000000006';
  msg_ts timestamptz := now();
  conv record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SERVICE WINDOW TESTS ===';

  INSERT INTO public.inbox_conversations (
    id, tenant_id, channel, provider, conversation_key,
    provider_phone_number_id, external_contact_id
  ) VALUES (
    sw_conv_id,
    'aaaaaaaa-0000-0000-0000-000000000001',
    'whatsapp', 'meta_whatsapp',
    'key_sw_test', '111', 'ext_sw'
  );

  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    sw_conv_id, 'meta_whatsapp',
    'inbound', 'customer', 'Quando aprite?', msg_ts
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = sw_conv_id;
  PERFORM test_assert(
    conv.service_window_expires_at = msg_ts + interval '24 hours',
    'SW: inbound/customer → service_window_expires_at = created_at + 24h');

  -- Outbound message must NOT update service window
  INSERT INTO public.inbox_messages (
    tenant_id, conversation_id, provider,
    direction, author_kind, body_text, created_at
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    sw_conv_id, 'meta_whatsapp',
    'outbound', 'human', 'Apriamo alle 9', now() + interval '5 minutes'
  );

  SELECT * INTO conv FROM public.inbox_conversations WHERE id = sw_conv_id;
  PERFORM test_assert(
    conv.service_window_expires_at = msg_ts + interval '24 hours',
    'SW: outbound message does NOT change service_window_expires_at');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ALL TESTS PASSED ===';
END; $$;
