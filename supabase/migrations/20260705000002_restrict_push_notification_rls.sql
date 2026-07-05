-- ============================================================
-- 20260705000002_restrict_push_notification_rls.sql
-- Restrict push_subscriptions and notification_log to service_role only.
--
-- The application already reads/writes these tables exclusively through
-- server-side routes/actions using the admin client. Broad FOR ALL policies
-- therefore expose unnecessary attack surface to anon/authenticated clients.
-- ============================================================

DROP POLICY IF EXISTS "service_role_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service_role_all" ON public.notification_log;

CREATE POLICY "push_subscriptions_service_role_all"
  ON public.push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "notification_log_service_role_all"
  ON public.notification_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
