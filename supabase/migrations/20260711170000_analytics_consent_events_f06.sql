-- =============================================================
-- F-06: server-side proof for analytics consent
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_consent_surface') THEN
    CREATE TYPE public.analytics_consent_surface AS ENUM (
      'PLATFORM',
      'TENANT_WEBSITE',
      'TENANT_PWA',
      'TENANT_DASHBOARD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_consent_source') THEN
    CREATE TYPE public.analytics_consent_source AS ENUM (
      'BANNER',
      'PREFERENCES_CENTER',
      'COOKIE_POLICY',
      'LOCAL_STORAGE_MIGRATION'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_consent_status') THEN
    CREATE TYPE public.analytics_consent_status AS ENUM (
      'accepted',
      'rejected'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.analytics_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text NOT NULL,
  host text NOT NULL,
  surface public.analytics_consent_surface NOT NULL,
  status public.analytics_consent_status NOT NULL,
  policy_version text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet NULL,
  user_agent text NULL,
  source public.analytics_consent_source NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_consent_events_policy_version_check CHECK (btrim(policy_version) <> ''),
  CONSTRAINT analytics_consent_events_host_check CHECK (btrim(host) <> '')
);

CREATE INDEX IF NOT EXISTS idx_analytics_consent_host_anon_timeline
  ON public.analytics_consent_events (host, anonymous_id, occurred_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_consent_surface_timeline
  ON public.analytics_consent_events (surface, occurred_at DESC);

ALTER TABLE public.analytics_consent_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.analytics_consent_events IS
  'Append-only server-side proof of analytics consent choices, scoped by host and anonymous browser identifier.';

CREATE OR REPLACE FUNCTION public.guard_analytics_consent_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'analytics_consent_events is append-only and cannot be updated';
  END IF;

  IF TG_OP = 'DELETE' AND pg_trigger_depth() = 1 THEN
    RAISE EXCEPTION 'analytics_consent_events is append-only and cannot be deleted directly';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_analytics_consent_events_append_only
  ON public.analytics_consent_events;

CREATE TRIGGER trg_guard_analytics_consent_events_append_only
  BEFORE UPDATE OR DELETE ON public.analytics_consent_events
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_analytics_consent_events_append_only();
