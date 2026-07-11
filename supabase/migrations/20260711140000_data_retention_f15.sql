-- =============================================================
-- F-15: data retention matrix -> operational cleanup jobs
-- =============================================================

-- ─── Existing cleanups hardened / normalized ───────────────────────────────────

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
BEGIN
  DELETE FROM public.site_events
  WHERE occurred_at < now() - make_interval(days => p_retain_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_site_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_site_events(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_site_events(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_site_events(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_expired_marketing_unsubscribe_tokens(
  retention interval DEFAULT '0 hours'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.marketing_unsubscribe_tokens
  WHERE expires_at < now() - retention;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_marketing_unsubscribe_tokens(interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_marketing_unsubscribe_tokens(interval) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_marketing_unsubscribe_tokens(interval) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_marketing_unsubscribe_tokens(interval) TO service_role;

-- ─── New cleanup helpers ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_old_site_sessions(
  p_retain_days INTEGER DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.site_sessions
  WHERE last_seen_at < now() - make_interval(days => p_retain_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_client_import_jobs(
  p_retain_days INTEGER DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.client_import_jobs
  WHERE created_at < now() - make_interval(days => p_retain_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_notification_log(
  p_retain_days INTEGER DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notification_log
  WHERE sent_at < now() - make_interval(days => p_retain_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(
  p_retain_days INTEGER DEFAULT 180
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - make_interval(days => p_retain_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_platform_notifications(
  p_retain_days INTEGER DEFAULT 180
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.platform_notifications
  WHERE created_at < now() - make_interval(days => p_retain_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_team_invitations(
  p_retain_days INTEGER DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  UPDATE public.team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  DELETE FROM public.team_invitations
  WHERE (
      status = 'accepted'
      AND COALESCE(accepted_at, created_at) < now() - make_interval(days => p_retain_days)
    )
    OR (
      status IN ('expired', 'cancelled')
      AND expires_at < now() - make_interval(days => p_retain_days)
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_onboarding_tokens(
  p_retain_days INTEGER DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  UPDATE public.onboarding_tokens
  SET active = false
  WHERE active = true
    AND expires_at < now();

  DELETE FROM public.onboarding_tokens
  WHERE COALESCE(used_at, expires_at) < now() - make_interval(days => p_retain_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_platform_leads_retention(
  p_non_converted_days INTEGER DEFAULT 365,
  p_converted_days INTEGER DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anonymized_count integer := 0;
  deleted_count integer := 0;
BEGIN
  UPDATE public.platform_leads
  SET
    email = 'deleted+' || id::text || '@example.invalid',
    phone = null,
    business_name = null,
    posthog_distinct_id = null,
    consent_marketing = false,
    consent_at = null,
    updated_at = now()
  WHERE status = 'converted'
    AND converted_tenant_id IS NOT NULL
    AND updated_at < now() - make_interval(days => p_converted_days)
    AND (
      email !~* '@example\.invalid$'
      OR phone IS NOT NULL
      OR business_name IS NOT NULL
      OR posthog_distinct_id IS NOT NULL
      OR consent_marketing IS DISTINCT FROM false
      OR consent_at IS NOT NULL
    );

  GET DIAGNOSTICS anonymized_count = ROW_COUNT;

  DELETE FROM public.platform_leads
  WHERE status <> 'converted'
    AND updated_at < now() - make_interval(days => p_non_converted_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN anonymized_count + deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_site_sessions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_site_sessions(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_site_sessions(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_site_sessions(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_client_import_jobs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_client_import_jobs(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_client_import_jobs(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_client_import_jobs(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_notification_log(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_notification_log(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_notification_log(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notification_log(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_notifications(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_notifications(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_notifications(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_platform_notifications(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_platform_notifications(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_platform_notifications(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_platform_notifications(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_team_invitations(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_team_invitations(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_team_invitations(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_team_invitations(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_onboarding_tokens(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_onboarding_tokens(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_onboarding_tokens(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_onboarding_tokens(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_platform_leads_retention(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_platform_leads_retention(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_platform_leads_retention(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_platform_leads_retention(integer, integer) TO service_role;

-- ─── Master retention job ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.run_data_retention_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  result := jsonb_build_object(
    'site_events_deleted', public.cleanup_old_site_events(90),
    'site_sessions_deleted', public.cleanup_old_site_sessions(90),
    'client_import_jobs_deleted', public.cleanup_old_client_import_jobs(90),
    'notification_log_deleted', public.cleanup_old_notification_log(90),
    'notifications_deleted', public.cleanup_old_notifications(180),
    'platform_notifications_deleted', public.cleanup_old_platform_notifications(180),
    'marketing_unsubscribe_tokens_deleted', public.cleanup_expired_marketing_unsubscribe_tokens(),
    'email_verification_tokens_deleted', public.cleanup_email_verification_tokens('24 hours'),
    'team_invitations_deleted', public.cleanup_expired_team_invitations(30),
    'onboarding_tokens_deleted', public.cleanup_old_onboarding_tokens(30),
    'platform_leads_affected', public.cleanup_platform_leads_retention(365, 30)
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.run_data_retention_cleanup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_data_retention_cleanup() FROM anon;
REVOKE ALL ON FUNCTION public.run_data_retention_cleanup() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.run_data_retention_cleanup() TO service_role;

-- ─── Single daily cron for retention governance ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM cron.unschedule('cleanup_old_site_events');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM cron.unschedule('cleanup_email_verification_tokens');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM cron.unschedule('cleanup_expired_marketing_unsubscribe_tokens');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM cron.unschedule('run_data_retention_cleanup');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'run_data_retention_cleanup',
    '10 4 * * *',
    $cron$SELECT public.run_data_retention_cleanup()$cron$
  );
END;
$$;
