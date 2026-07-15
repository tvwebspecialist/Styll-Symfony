-- =============================================================
-- 20260715002000_b2b_terms_acceptance_alias_fix.sql
-- Disambiguate RETURNS TABLE output names inside
-- consume_pending_legal_acceptance.
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

  SELECT pending.*
  INTO v_pending
  FROM public.legal_acceptance_pending AS pending
  WHERE pending.token_hash = v_token_hash
    AND pending.source = p_source
    AND pending.consumed_at IS NULL
    AND pending.expires_at > now()
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

  UPDATE public.legal_acceptance_pending AS pending
  SET consumed_at = now(),
      consumed_by_user_id = p_user_id
  WHERE pending.id = v_pending.id
    AND pending.consumed_at IS NULL;

  SELECT acceptance.*
  INTO v_existing
  FROM public.legal_acceptance_events AS acceptance
  WHERE acceptance.user_id = p_user_id
    AND acceptance.document_type = v_pending.document_type
    AND acceptance.document_version = v_pending.document_version
  ORDER BY acceptance.created_at DESC, acceptance.id DESC
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
