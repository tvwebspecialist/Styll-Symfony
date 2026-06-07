-- Email OTP verification: token table + profile flag
-- ─────────────────────────────────────────────────────────────────────────────
-- email_verification_tokens stores short-lived 6-digit codes sent via Resend.
-- Only accessible via the service role (admin client) — no public RLS policies.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT         NOT NULL,
  code         TEXT         NOT NULL,           -- 6-digit numeric string
  expires_at   TIMESTAMPTZ  NOT NULL,
  used         BOOLEAN      NOT NULL DEFAULT FALSE,
  attempts     INTEGER      NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,                     -- set after 5 failed attempts
  last_sent_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_email
  ON public.email_verification_tokens(email);

-- No public RLS policies: only the service role key (admin client) can access
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Add email_verified flag to profiles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: all profiles created before this migration are considered verified
-- (they registered without the OTP requirement and are already using the app)
UPDATE public.profiles
SET    email_verified = TRUE
WHERE  email_verified = FALSE;
