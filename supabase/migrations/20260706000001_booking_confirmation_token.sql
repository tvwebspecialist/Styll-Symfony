-- ============================================================
-- 20260706000001_booking_confirmation_token.sql
-- Store booking confirmation tokens as hashes, never in clear text.
-- ============================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booking_confirmation_token_hash text,
  ADD COLUMN IF NOT EXISTS booking_confirmation_token_expires_at timestamptz;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  pgcrypto_schema text;
BEGIN
  SELECT nsp.nspname
  INTO pgcrypto_schema
  FROM pg_extension ext
  JOIN pg_namespace nsp ON nsp.oid = ext.extnamespace
  WHERE ext.extname = 'pgcrypto';

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'booking_confirmation_token'
  ) THEN
    EXECUTE format(
      'UPDATE public.appointments
       SET booking_confirmation_token_hash = encode(%1$I.digest(booking_confirmation_token, %2$L), %3$L)
       WHERE booking_confirmation_token IS NOT NULL
         AND booking_confirmation_token_hash IS NULL',
      pgcrypto_schema,
      'sha256',
      'hex'
    );

    EXECUTE 'ALTER TABLE public.appointments DROP COLUMN booking_confirmation_token';
  END IF;
END $$;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_booking_confirmation_token_hash_format_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_booking_confirmation_token_hash_format_check
  CHECK (
    booking_confirmation_token_hash IS NULL
    OR booking_confirmation_token_hash ~ '^[0-9a-f]{64}$'
  );

COMMENT ON COLUMN public.appointments.booking_confirmation_token_hash IS
  'SHA-256 hash of the public booking confirmation token.';

COMMENT ON COLUMN public.appointments.booking_confirmation_token_expires_at IS
  'UTC expiry timestamp for the public booking confirmation token.';
