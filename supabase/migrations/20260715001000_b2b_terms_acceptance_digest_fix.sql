-- =============================================================
-- 20260715001000_b2b_terms_acceptance_digest_fix.sql
-- Fix runtime hashing resolution inside the B2B terms acceptance
-- flow and scrub one-time legal proof metadata after persistence.
-- =============================================================

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

  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_context_hash := CASE
    WHEN p_context_token IS NULL OR btrim(p_context_token) = '' THEN NULL
    ELSE encode(extensions.digest(p_context_token, 'sha256'), 'hex')
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

    UPDATE auth.users
    SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb)
      - 'legal_acceptance_proof'
      - 'legal_acceptance_source'
    WHERE id = new.id;
  ELSIF v_legal_acceptance_source IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported legal acceptance source on auth user creation: %', v_legal_acceptance_source;
  END IF;

  RETURN new;
END;
$$;
