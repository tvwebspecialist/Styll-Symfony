-- =============================================================
-- F-15 follow-up: remove legacy zero-arg marketing unsubscribe
-- cleanup function to avoid ambiguous resolution.
-- =============================================================

DROP FUNCTION IF EXISTS public.cleanup_expired_marketing_unsubscribe_tokens();

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
    'marketing_unsubscribe_tokens_deleted', public.cleanup_expired_marketing_unsubscribe_tokens('0 hours'::interval),
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
