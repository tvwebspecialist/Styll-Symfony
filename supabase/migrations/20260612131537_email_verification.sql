
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT         NOT NULL,
  code         TEXT         NOT NULL,
  expires_at   TIMESTAMPTZ  NOT NULL,
  used         BOOLEAN      NOT NULL DEFAULT FALSE,
  attempts     INTEGER      NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_email
  ON public.email_verification_tokens(email);

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET    email_verified = TRUE
WHERE  email_verified = FALSE;
;
