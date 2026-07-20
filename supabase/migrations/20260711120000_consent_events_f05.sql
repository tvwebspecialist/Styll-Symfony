-- =============================================================
-- F-05: append-only GDPR consent audit trail
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_actor') THEN
    CREATE TYPE public.consent_actor AS ENUM (
      'CLIENT_PROFILE',
      'STAFF_MEMBER',
      'SUPERADMIN',
      'GUEST_SUBMISSION',
      'UNSUBSCRIBE_LINK',
      'LEGACY_MIGRATION',
      'SYSTEM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_channel') THEN
    CREATE TYPE public.consent_channel AS ENUM (
      'PWA',
      'EMAIL',
      'BACKOFFICE',
      'IMPORT',
      'SYSTEM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_purpose') THEN
    CREATE TYPE public.consent_purpose AS ENUM (
      'MARKETING_EMAIL',
      'MARKETING_PUSH',
      'CHURN_PROFILING'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_source') THEN
    CREATE TYPE public.consent_source AS ENUM (
      'PWA_EMAIL_OTP_BOOTSTRAP',
      'PWA_EMAIL_OTP_PROFILE',
      'PWA_PROFILE_PREFERENCES',
      'PHONE_OTP_BOOTSTRAP',
      'GOOGLE_AUTH_BOOTSTRAP',
      'EMAIL_PASSWORD_BOOTSTRAP',
      'GUEST_BOOKING',
      'STAFF_DASHBOARD',
      'SUPERADMIN_PANEL',
      'SUPERADMIN_SEED',
      'CLIENT_IMPORT',
      'EMAIL_UNSUBSCRIBE_LINK',
      'LEGACY_MIGRATION'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_state') THEN
    CREATE TYPE public.consent_state AS ENUM (
      'ALLOWED',
      'DISALLOWED',
      'UNKNOWN'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  purpose public.consent_purpose NOT NULL,
  channel public.consent_channel NOT NULL,
  status public.consent_state NOT NULL,
  previous_status public.consent_state NOT NULL,
  consent_text text NOT NULL,
  consent_text_version text NOT NULL,
  legal_basis text NOT NULL,
  source public.consent_source NOT NULL,
  changed_by public.consent_actor NOT NULL,
  changed_by_profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL,
  ip_address inet NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_events_consent_text_version_check CHECK (btrim(consent_text_version) <> ''),
  CONSTRAINT consent_events_consent_text_check CHECK (btrim(consent_text) <> ''),
  CONSTRAINT consent_events_legal_basis_check CHECK (btrim(legal_basis) <> '')
);

CREATE INDEX IF NOT EXISTS idx_consent_events_client_timeline
  ON public.consent_events (tenant_id, client_id, occurred_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_events_purpose_lookup
  ON public.consent_events (tenant_id, purpose, occurred_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_events_source_lookup
  ON public.consent_events (source, occurred_at DESC);

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.consent_events IS
  'Append-only audit trail of consent and objection state changes for tenant-scoped client processing purposes.';

COMMENT ON COLUMN public.consent_events.consent_text IS
  'Exact consent or objection copy snapshot used for the recorded event.';

COMMENT ON COLUMN public.consent_events.previous_status IS
  'State immediately before this event for the same client and purpose, or UNKNOWN when reconstructed from legacy state.';

CREATE OR REPLACE FUNCTION public.apply_client_consent_events(
  p_tenant_id uuid,
  p_client_id uuid,
  p_changed_by public.consent_actor,
  p_changed_by_profile_id uuid DEFAULT NULL,
  p_source public.consent_source DEFAULT 'LEGACY_MIGRATION',
  p_events jsonb DEFAULT '[]'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client public.clients%ROWTYPE;
  v_event jsonb;
  v_purpose public.consent_purpose;
  v_channel public.consent_channel;
  v_status public.consent_state;
  v_previous_status public.consent_state;
  v_occurred_at timestamptz;
  v_consent_text text;
  v_consent_text_version text;
  v_legal_basis text;
  v_metadata jsonb;
  v_inserted integer := 0;
  v_marketing_email_seen boolean := false;
  v_marketing_push_seen boolean := false;
  v_marketing_status public.consent_state := NULL;
  v_churn_seen boolean := false;
  v_churn_status public.consent_state := NULL;
  v_next_marketing boolean;
  v_next_churn_objected_at timestamptz;
BEGIN
  IF jsonb_typeof(COALESCE(p_events, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'p_events must be a JSON array';
  END IF;

  IF p_changed_by IN ('CLIENT_PROFILE', 'STAFF_MEMBER', 'SUPERADMIN') AND p_changed_by_profile_id IS NULL THEN
    RAISE EXCEPTION 'changed_by_profile_id is required for actor %', p_changed_by;
  END IF;

  SELECT *
  INTO v_client
  FROM public.clients
  WHERE id = p_client_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'client % not found for tenant %', p_client_id, p_tenant_id;
  END IF;

  v_next_marketing := COALESCE(v_client.marketing_consent, false);
  v_next_churn_objected_at := v_client.churn_profiling_objected_at;

  FOR v_event IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_events, '[]'::jsonb))
  LOOP
    v_purpose := (v_event->>'purpose')::public.consent_purpose;
    v_channel := (v_event->>'channel')::public.consent_channel;
    v_status := (v_event->>'status')::public.consent_state;
    v_consent_text := NULLIF(btrim(v_event->>'consent_text'), '');
    v_consent_text_version := NULLIF(btrim(v_event->>'consent_text_version'), '');
    v_legal_basis := NULLIF(btrim(v_event->>'legal_basis'), '');
    v_occurred_at := COALESCE((v_event->>'occurred_at')::timestamptz, now());
    v_metadata := COALESCE(v_event->'metadata', '{}'::jsonb);

    IF v_status = 'UNKNOWN' THEN
      RAISE EXCEPTION 'UNKNOWN is allowed only as previous_status, not as new event status';
    END IF;

    IF v_consent_text IS NULL OR v_consent_text_version IS NULL OR v_legal_basis IS NULL THEN
      RAISE EXCEPTION 'Consent event is missing consent_text, consent_text_version or legal_basis';
    END IF;

    SELECT ce.status
    INTO v_previous_status
    FROM public.consent_events AS ce
    WHERE ce.tenant_id = p_tenant_id
      AND ce.client_id = p_client_id
      AND ce.purpose = v_purpose
    ORDER BY ce.occurred_at DESC, ce.created_at DESC, ce.id DESC
    LIMIT 1;

    IF NOT FOUND THEN
      v_previous_status := 'UNKNOWN';
    END IF;

    IF v_purpose = 'MARKETING_EMAIL' THEN
      v_marketing_email_seen := true;
      IF v_marketing_status IS NULL THEN
        v_marketing_status := v_status;
      ELSIF v_marketing_status <> v_status THEN
        RAISE EXCEPTION 'MARKETING_EMAIL and MARKETING_PUSH must end in the same status';
      END IF;
    ELSIF v_purpose = 'MARKETING_PUSH' THEN
      v_marketing_push_seen := true;
      IF v_marketing_status IS NULL THEN
        v_marketing_status := v_status;
      ELSIF v_marketing_status <> v_status THEN
        RAISE EXCEPTION 'MARKETING_EMAIL and MARKETING_PUSH must end in the same status';
      END IF;
    ELSIF v_purpose = 'CHURN_PROFILING' THEN
      v_churn_seen := true;
      IF v_churn_status IS NULL THEN
        v_churn_status := v_status;
      ELSIF v_churn_status <> v_status THEN
        RAISE EXCEPTION 'CHURN_PROFILING can only receive one effective status per operation';
      END IF;
    END IF;

    INSERT INTO public.consent_events (
      tenant_id,
      client_id,
      purpose,
      channel,
      status,
      previous_status,
      consent_text,
      consent_text_version,
      legal_basis,
      source,
      changed_by,
      changed_by_profile_id,
      occurred_at,
      ip_address,
      user_agent,
      metadata
    )
    VALUES (
      p_tenant_id,
      p_client_id,
      v_purpose,
      v_channel,
      v_status,
      v_previous_status,
      v_consent_text,
      v_consent_text_version,
      v_legal_basis,
      p_source,
      p_changed_by,
      p_changed_by_profile_id,
      v_occurred_at,
      NULLIF(v_event->>'ip_address', '')::inet,
      NULLIF(v_event->>'user_agent', ''),
      v_metadata
    );

    v_inserted := v_inserted + 1;

    IF v_purpose IN ('MARKETING_EMAIL', 'MARKETING_PUSH') THEN
      v_next_marketing := (v_status = 'ALLOWED');
    ELSIF v_purpose = 'CHURN_PROFILING' THEN
      v_next_churn_objected_at := CASE
        WHEN v_status = 'DISALLOWED' THEN v_occurred_at
        ELSE NULL
      END;
    END IF;
  END LOOP;

  IF v_marketing_email_seen <> v_marketing_push_seen THEN
    RAISE EXCEPTION 'Marketing consent changes must include both MARKETING_EMAIL and MARKETING_PUSH';
  END IF;

  IF v_inserted > 0 THEN
    UPDATE public.clients
    SET
      marketing_consent = v_next_marketing,
      churn_profiling_objected_at = v_next_churn_objected_at,
      updated_at = now()
    WHERE id = p_client_id
      AND tenant_id = p_tenant_id;
  END IF;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_client_consent_events(
  uuid,
  uuid,
  public.consent_actor,
  uuid,
  public.consent_source,
  jsonb
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.apply_client_consent_events(
  uuid,
  uuid,
  public.consent_actor,
  uuid,
  public.consent_source,
  jsonb
) TO service_role;

CREATE OR REPLACE FUNCTION public.backfill_missing_client_consent_events(
  p_tenant_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  INSERT INTO public.consent_events (
    tenant_id,
    client_id,
    purpose,
    channel,
    status,
    previous_status,
    consent_text,
    consent_text_version,
    legal_basis,
    source,
    changed_by,
    changed_by_profile_id,
    occurred_at,
    ip_address,
    user_agent,
    metadata
  )
  SELECT
    c.tenant_id,
    c.id,
    evt.purpose,
    'SYSTEM'::public.consent_channel,
    evt.status,
    'UNKNOWN'::public.consent_state,
    'Stato del consenso migrato dai campi legacy senza prova storica completa dell''evento originario.',
    'legacy-migration-v1',
    evt.legal_basis,
    'LEGACY_MIGRATION'::public.consent_source,
    'LEGACY_MIGRATION'::public.consent_actor,
    NULL,
    now(),
    NULL,
    NULL,
    evt.metadata
  FROM public.clients AS c
  CROSS JOIN LATERAL (
    VALUES
      (
        'MARKETING_EMAIL'::public.consent_purpose,
        CASE WHEN COALESCE(c.marketing_consent, false) THEN 'ALLOWED'::public.consent_state ELSE 'DISALLOWED'::public.consent_state END,
        'Art. 6(1)(a) GDPR — consenso marketing',
        jsonb_build_object('legacy_field', 'marketing_consent', 'legacy_value', COALESCE(c.marketing_consent, false))
      ),
      (
        'MARKETING_PUSH'::public.consent_purpose,
        CASE WHEN COALESCE(c.marketing_consent, false) THEN 'ALLOWED'::public.consent_state ELSE 'DISALLOWED'::public.consent_state END,
        'Art. 6(1)(a) GDPR — consenso marketing',
        jsonb_build_object('legacy_field', 'marketing_consent', 'legacy_value', COALESCE(c.marketing_consent, false))
      ),
      (
        'CHURN_PROFILING'::public.consent_purpose,
        CASE WHEN c.churn_profiling_objected_at IS NULL THEN 'ALLOWED'::public.consent_state ELSE 'DISALLOWED'::public.consent_state END,
        'Art. 6(1)(f) GDPR — legittimo interesse con diritto di opposizione ex Art. 21 GDPR',
        jsonb_build_object('legacy_field', 'churn_profiling_objected_at', 'legacy_value', c.churn_profiling_objected_at)
      )
  ) AS evt(purpose, status, legal_basis, metadata)
  WHERE c.deleted_at IS NULL
    AND (p_tenant_id IS NULL OR c.tenant_id = p_tenant_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.consent_events AS ce
      WHERE ce.tenant_id = c.tenant_id
        AND ce.client_id = c.id
        AND ce.purpose = evt.purpose
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_missing_client_consent_events(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.backfill_missing_client_consent_events(uuid)
  TO service_role;

SELECT public.backfill_missing_client_consent_events();
