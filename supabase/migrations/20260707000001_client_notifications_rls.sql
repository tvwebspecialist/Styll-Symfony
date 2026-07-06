-- ============================================================
-- Migration: RLS policies for clients on the `notifications` table
-- ============================================================
-- Context:
--   `notifications` is currently used for staff in-app notifications.
--   This migration adds two policies so authenticated PWA clients can:
--     1. SELECT their own notifications (profile_id = auth.uid())
--     2. UPDATE is_read on their own notifications
--
--   INSERT is performed exclusively via the admin client (service role),
--   which bypasses RLS — no INSERT policy is needed here.
--
--   Existing `notifications_select_staff` policy remains unchanged;
--   staff continue to see tenant-scoped notifications where profile_id IS NULL.
--   Client-specific rows (profile_id set) are excluded from staff queries
--   unless the staff member's own profile_id matches — acceptable overlap.
--
--   NULL semantics: profile_id IS NULL rows (staff broadcasts) are
--   invisible to clients because NULL != auth.uid() (NULL != anything).
--
-- Retention policy: notifications older than 6 months are excluded
-- at the application query layer (LIMIT 50, newest first) — no DB
-- cleanup trigger added here for simplicity. A future cron can prune.
-- ============================================================

-- Idempotent: RLS was already enabled by 20260624000001_notifications_realtime.sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: authenticated clients can read their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND policyname = 'notifications_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY notifications_select_own
        ON public.notifications
        FOR SELECT
        USING (auth.uid() = profile_id)
    $policy$;
  END IF;
END;
$$;

-- Policy 2: authenticated clients can mark their own notifications as read
-- Application code only updates the `is_read` column; the policy enforces
-- row ownership but does not restrict column access (handled app-side).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND policyname = 'notifications_update_own_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY notifications_update_own_read
        ON public.notifications
        FOR UPDATE
        USING (auth.uid() = profile_id)
        WITH CHECK (auth.uid() = profile_id)
    $policy$;
  END IF;
END;
$$;

-- ============================================================
-- Verification queries (run manually to confirm)
-- ============================================================
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';
-- Expected: notifications_select_staff (staff), notifications_select_own (client),
--           notifications_update_own_read (client)
-- ============================================================
