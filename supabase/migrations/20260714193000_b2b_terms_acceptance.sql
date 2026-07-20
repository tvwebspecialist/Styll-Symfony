-- =============================================================
-- 20260714193000_b2b_terms_acceptance.sql
-- Persist versioned B2B Terms acceptance proofs for root-domain
-- barber registrations (email/password and Google OAuth).
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'legal_document_type') THEN
    CREATE TYPE public.legal_document_type AS ENUM (
      'B2B_TERMS'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'legal_acceptance_source') THEN
    CREATE TYPE public.legal_acceptance_source AS ENUM (
      'EMAIL_PASSWORD_REGISTER',
      'GOOGLE_OAUTH_REGISTER'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.legal_acceptance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  document_type public.legal_document_type NOT NULL,
  document_version text NOT NULL,
  privacy_notice_version text NOT NULL,
  accepted_at timestamptz NOT NULL,
  accepted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source public.legal_acceptance_source NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_acceptance_events_document_version_check CHECK (btrim(document_version) <> ''),
  CONSTRAINT legal_acceptance_events_privacy_notice_version_check CHECK (btrim(privacy_notice_version) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_acceptance_events_user_document_version_idx
  ON public.legal_acceptance_events (user_id, document_type, document_version);

CREATE INDEX IF NOT EXISTS legal_acceptance_events_user_timeline_idx
  ON public.legal_acceptance_events (user_id, accepted_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS legal_acceptance_events_tenant_timeline_idx
  ON public.legal_acceptance_events (tenant_id, accepted_at DESC, created_at DESC);

ALTER TABLE public.legal_acceptance_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.legal_acceptance_events IS
  'Append-only audit trail of accepted B2B legal documents for root-domain barber registrations.';

COMMENT ON COLUMN public.legal_acceptance_events.privacy_notice_version IS
  'Version of the B2B privacy notice shown and acknowledged at the time of terms acceptance.';

CREATE TABLE IF NOT EXISTS public.legal_acceptance_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  context_token_hash text NULL,
  source public.legal_acceptance_source NOT NULL,
  document_type public.legal_document_type NOT NULL,
  document_version text NOT NULL,
  privacy_notice_version text NOT NULL,
  accepted_at timestamptz NOT NULL,
  accepted_by_email text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  consumed_by_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_acceptance_pending_token_hash_check CHECK (btrim(token_hash) <> ''),
  CONSTRAINT legal_acceptance_pending_document_version_check CHECK (btrim(document_version) <> ''),
  CONSTRAINT legal_acceptance_pending_privacy_notice_version_check CHECK (btrim(privacy_notice_version) <> ''),
  CONSTRAINT legal_acceptance_pending_expiration_check CHECK (expires_at > accepted_at)
);

CREATE INDEX IF NOT EXISTS legal_acceptance_pending_expires_at_idx
  ON public.legal_acceptance_pending (expires_at);

CREATE INDEX IF NOT EXISTS legal_acceptance_pending_source_idx
  ON public.legal_acceptance_pending (source, accepted_at DESC);

ALTER TABLE public.legal_acceptance_pending ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.legal_acceptance_pending IS
  'Single-use, short-lived proofs created before completing a root-domain B2B registration.';

CREATE OR REPLACE FUNCTION public.guard_legal_acceptance_events_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'legal_acceptance_events rows are immutable and cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF
      OLD.tenant_id IS NULL
      AND NEW.tenant_id IS NOT NULL
      AND NEW.user_id = OLD.user_id
      AND NEW.profile_id = OLD.profile_id
      AND NEW.document_type = OLD.document_type
      AND NEW.document_version = OLD.document_version
      AND NEW.privacy_notice_version = OLD.privacy_notice_version
      AND NEW.accepted_at = OLD.accepted_at
      AND NEW.accepted_by = OLD.accepted_by
      AND NEW.source = OLD.source
      AND NEW.metadata = OLD.metadata
      AND NEW.created_at = OLD.created_at
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'legal_acceptance_events rows are immutable except for a one-time tenant backfill';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_acceptance_events_guard_immutability ON public.legal_acceptance_events;
CREATE TRIGGER legal_acceptance_events_guard_immutability
  BEFORE UPDATE OR DELETE ON public.legal_acceptance_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_legal_acceptance_events_immutability();

CREATE OR REPLACE FUNCTION public.consume_pending_legal_acceptance(
  p_token text,
  p_user_id uuid,
  p_source public.legal_acceptance_source,
  p_user_email text DEFAULT NULL,
  p_context_token text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  tenant_id uuid,
  document_type public.legal_document_type,
  document_version text,
  privacy_notice_version text,
  accepted_at timestamptz,
  accepted_by uuid,
  source public.legal_acceptance_source,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending public.legal_acceptance_pending%ROWTYPE;
  v_existing public.legal_acceptance_events%ROWTYPE;
  v_context_hash text;
  v_token_hash text;
  v_user_email text;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RAISE EXCEPTION 'Missing legal acceptance proof';
  END IF;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  v_context_hash := CASE
    WHEN p_context_token IS NULL OR btrim(p_context_token) = '' THEN NULL
    ELSE encode(digest(p_context_token, 'sha256'), 'hex')
  END;
  v_user_email := NULLIF(lower(btrim(COALESCE(p_user_email, ''))), '');

  SELECT *
  INTO v_pending
  FROM public.legal_acceptance_pending
  WHERE token_hash = v_token_hash
    AND source = p_source
    AND consumed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal acceptance proof missing, expired or already used';
  END IF;

  IF v_pending.context_token_hash IS NOT NULL THEN
    IF v_context_hash IS NULL OR v_context_hash <> v_pending.context_token_hash THEN
      RAISE EXCEPTION 'Legal acceptance proof context mismatch';
    END IF;
  END IF;

  IF v_pending.accepted_by_email IS NOT NULL THEN
    IF v_user_email IS NULL OR v_user_email <> lower(v_pending.accepted_by_email) THEN
      RAISE EXCEPTION 'Legal acceptance proof does not match the registering email';
    END IF;
  END IF;

  INSERT INTO public.legal_acceptance_events (
    user_id,
    profile_id,
    tenant_id,
    document_type,
    document_version,
    privacy_notice_version,
    accepted_at,
    accepted_by,
    source,
    metadata
  )
  VALUES (
    p_user_id,
    p_user_id,
    NULL,
    v_pending.document_type,
    v_pending.document_version,
    v_pending.privacy_notice_version,
    v_pending.accepted_at,
    p_user_id,
    p_source,
    jsonb_strip_nulls(
      jsonb_build_object(
        'pending_id', v_pending.id,
        'pending_source', v_pending.source
      ) || COALESCE(v_pending.metadata, '{}'::jsonb)
    )
  )
  ON CONFLICT (user_id, document_type, document_version) DO NOTHING;

  UPDATE public.legal_acceptance_pending
  SET consumed_at = now(),
      consumed_by_user_id = p_user_id
  WHERE id = v_pending.id
    AND consumed_at IS NULL;

  SELECT *
  INTO v_existing
  FROM public.legal_acceptance_events
  WHERE user_id = p_user_id
    AND document_type = v_pending.document_type
    AND document_version = v_pending.document_version
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    v_existing.id,
    v_existing.user_id,
    v_existing.tenant_id,
    v_existing.document_type,
    v_existing.document_version,
    v_existing.privacy_notice_version,
    v_existing.accepted_at,
    v_existing.accepted_by,
    v_existing.source,
    v_existing.metadata,
    v_existing.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_pending_legal_acceptance(
  text,
  uuid,
  public.legal_acceptance_source,
  text,
  text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_pending_legal_acceptance(
  text,
  uuid,
  public.legal_acceptance_source,
  text,
  text
) FROM anon;
REVOKE ALL ON FUNCTION public.consume_pending_legal_acceptance(
  text,
  uuid,
  public.legal_acceptance_source,
  text,
  text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_pending_legal_acceptance(
  text,
  uuid,
  public.legal_acceptance_source,
  text,
  text
) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_acceptance_proof text;
  v_legal_acceptance_source text;
  v_user_type text;
BEGIN
  v_user_type := coalesce(
    CASE
      WHEN new.raw_user_meta_data ->> 'user_type' IN ('staff', 'client', 'admin')
      THEN new.raw_user_meta_data ->> 'user_type'
      ELSE NULL
    END,
    'client'
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url, user_type)
  VALUES (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    v_user_type
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = excluded.email,
    full_name  = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  v_legal_acceptance_source := nullif(btrim(new.raw_user_meta_data ->> 'legal_acceptance_source'), '');
  v_email_acceptance_proof := nullif(btrim(new.raw_user_meta_data ->> 'legal_acceptance_proof'), '');

  IF v_legal_acceptance_source = 'EMAIL_PASSWORD_REGISTER' THEN
    IF v_email_acceptance_proof IS NULL THEN
      RAISE EXCEPTION 'Missing legal acceptance proof for email/password registration';
    END IF;

    PERFORM public.consume_pending_legal_acceptance(
      v_email_acceptance_proof,
      new.id,
      'EMAIL_PASSWORD_REGISTER',
      new.email,
      NULL
    );
  ELSIF v_legal_acceptance_source IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported legal acceptance source on auth user creation: %', v_legal_acceptance_source;
  END IF;

  RETURN new;
END;
$$;
