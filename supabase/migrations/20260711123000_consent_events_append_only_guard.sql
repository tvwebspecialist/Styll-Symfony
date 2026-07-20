-- =============================================================
-- F-05 follow-up: guard consent_events against direct mutation
-- while still allowing FK cascade cleanup from parent rows.
-- =============================================================

CREATE OR REPLACE FUNCTION public.guard_consent_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'consent_events is append-only and cannot be updated';
  END IF;

  IF TG_OP = 'DELETE' AND pg_trigger_depth() = 1 THEN
    RAISE EXCEPTION 'consent_events is append-only and cannot be deleted directly';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_consent_events_append_only ON public.consent_events;

CREATE TRIGGER trg_guard_consent_events_append_only
  BEFORE UPDATE OR DELETE ON public.consent_events
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_consent_events_append_only();
