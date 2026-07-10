-- =============================================================
-- 20260711000001_otp_hash_f13.sql
-- F-13: Hash OTP email a riposo + purge automatico
--
-- Strategia:
--   1. Elimina tutti i token esistenti (plaintext, non recuperabili dopo DROP)
--   2. Aggiunge colonna code_hash (HMAC-SHA-256 con pepper server-side)
--   3. Rimuove la colonna code in chiaro
--   4. Aggiunge funzione cleanup + cron giornaliero
--   5. Aggiunge RPC atomico create_email_verification_otp
-- =============================================================

-- ─── 1. Elimina token legacy in chiaro ────────────────────────────────────────
-- I token esistenti hanno il codice in chiaro nella colonna `code`.
-- Non possono essere validati dopo la rimozione della colonna.
-- Gli utenti in fase di verifica devono richiedere un nuovo OTP.
DELETE FROM public.email_verification_tokens;

-- ─── 2. Aggiunge code_hash ────────────────────────────────────────────────────
-- La tabella è ora vuota quindi NOT NULL è applicabile direttamente.
ALTER TABLE public.email_verification_tokens
  ADD COLUMN code_hash TEXT NOT NULL DEFAULT 'MIGRATION-PLACEHOLDER';

-- Rimuove il default: ogni nuovo record deve fornire code_hash esplicitamente.
ALTER TABLE public.email_verification_tokens
  ALTER COLUMN code_hash DROP DEFAULT;

-- ─── 3. Rimuove la colonna plaintext ──────────────────────────────────────────
ALTER TABLE public.email_verification_tokens
  DROP COLUMN code;

-- ─── 4. Indice per cleanup efficiente ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_evt_expires_at
  ON public.email_verification_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_evt_used_created
  ON public.email_verification_tokens(used, created_at);

-- ─── 5. Funzione cleanup ──────────────────────────────────────────────────────
-- Elimina:
--   - token usati da più di `retention`
--   - token scaduti da più di `retention`
-- Invocabile solo da service_role (REVOKE da public/anon/authenticated).
CREATE OR REPLACE FUNCTION public.cleanup_email_verification_tokens(
  retention interval DEFAULT '24 hours'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.email_verification_tokens
  WHERE (used = true    AND created_at  < now() - retention)
     OR (expires_at     < now() - retention);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_email_verification_tokens(interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_email_verification_tokens(interval) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_email_verification_tokens(interval) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_email_verification_tokens(interval) TO service_role;

-- ─── 6. RPC atomico per creare un nuovo token ────────────────────────────────
-- Invalidazione del token precedente + inserimento del nuovo in una singola
-- transazione SQL, eliminando la race condition check-then-update.
CREATE OR REPLACE FUNCTION public.create_email_verification_otp(
  p_email      text,
  p_code_hash  text,
  p_expires_at timestamptz,
  p_now        timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Invalida atomicamente tutti i token attivi per questa email
  UPDATE public.email_verification_tokens
  SET    used = true
  WHERE  email = p_email
    AND  used  = false;

  -- Inserisce il nuovo token
  INSERT INTO public.email_verification_tokens
    (email, code_hash, expires_at, last_sent_at, created_at)
  VALUES
    (p_email, p_code_hash, p_expires_at, p_now, p_now)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_email_verification_otp(text, text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_email_verification_otp(text, text, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.create_email_verification_otp(text, text, timestamptz, timestamptz) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.create_email_verification_otp(text, text, timestamptz, timestamptz) TO service_role;

-- ─── 7. Cron giornaliero (pg_cron) ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM cron.unschedule('cleanup_email_verification_tokens');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'cleanup_email_verification_tokens',
    '20 3 * * *',
    $cron$SELECT public.cleanup_email_verification_tokens()$cron$
  );
END;
$$;
