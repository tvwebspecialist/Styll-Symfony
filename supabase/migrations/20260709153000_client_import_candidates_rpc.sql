-- =============================================================
-- SS-09: bound CSV import duplicate lookup to relevant email/phone
-- candidates instead of reading every client in the tenant.
-- =============================================================

CREATE OR REPLACE FUNCTION public.normalize_import_phone(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH cleaned AS (
    SELECT regexp_replace(btrim(COALESCE(raw, '')), '[\s\-\.\(\)]', '', 'g') AS value
  )
  SELECT CASE
    WHEN value = '' THEN NULL
    WHEN value ~ '^\+\d{8,15}$' THEN value
    WHEN value ~ '^00\d{8,15}$' THEN '+' || substring(value FROM 3)
    WHEN value ~ '^\d{9,11}$' THEN '+39' || regexp_replace(value, '^39', '')
    ELSE NULL
  END
  FROM cleaned;
$$;

CREATE INDEX IF NOT EXISTS clients_import_email_lookup_idx
  ON public.clients (tenant_id, lower(btrim(email)))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS clients_import_phone_lookup_idx
  ON public.clients (tenant_id, public.normalize_import_phone(phone))
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_client_import_candidates(
  p_tenant_id uuid,
  p_emails text[] DEFAULT ARRAY[]::text[],
  p_phones text[] DEFAULT ARRAY[]::text[]
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  date_of_birth date,
  marketing_consent boolean,
  tags jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.full_name,
    c.email,
    c.phone,
    c.date_of_birth,
    c.marketing_consent,
    c.tags
  FROM public.clients AS c
  WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
    AND (
      (
        COALESCE(array_length(p_emails, 1), 0) > 0
        AND lower(btrim(COALESCE(c.email, ''))) = ANY (p_emails)
      )
      OR
      (
        COALESCE(array_length(p_phones, 1), 0) > 0
        AND public.normalize_import_phone(c.phone) = ANY (p_phones)
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_client_import_candidates(uuid, text[], text[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_import_candidates(uuid, text[], text[])
  TO service_role;
