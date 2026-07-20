-- =============================================================
-- F-15 follow-up: make site_events cleanup tolerant to the
-- currently deployed timestamp column shape.
-- =============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_site_events(
  p_retain_days INTEGER DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  cutoff timestamptz := now() - make_interval(days => p_retain_days);
  has_occurred_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_events'
      AND column_name = 'occurred_at'
  )
  INTO has_occurred_at;

  IF has_occurred_at THEN
    EXECUTE 'DELETE FROM public.site_events WHERE occurred_at < $1' USING cutoff;
  ELSE
    EXECUTE 'DELETE FROM public.site_events WHERE created_at < $1' USING cutoff;
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_site_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_site_events(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_site_events(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_site_events(integer) TO service_role;
