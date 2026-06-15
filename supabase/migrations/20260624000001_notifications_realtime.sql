-- ============================================================
-- Migration: Supabase Realtime for notifications table
-- ============================================================
-- What this migration does
-- ------------------------
-- 1. Sets REPLICA IDENTITY FULL so UPDATE events carry the full old row
--    (required to detect is_read false→true transitions in the browser hook).
-- 2. Adds a SELECT policy so staff members can read notifications for their
--    tenant — required for postgres_changes events to be broadcast to the
--    authenticated browser client.
-- 3. Adds the notifications table to the supabase_realtime publication.
-- ============================================================

-- 1. Full replica identity — UPDATE events will include the complete old row.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Enable RLS (idempotent — safe if already enabled).
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy: staff members can read notifications for their tenant.
--    Wrapped in a DO block to be idempotent (no CREATE POLICY IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND policyname = 'notifications_select_staff'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY notifications_select_staff
        ON public.notifications
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.staff_members sm
            WHERE sm.profile_id = auth.uid()
              AND sm.tenant_id  = notifications.tenant_id
              AND sm.is_active  = true
              AND sm.deleted_at IS NULL
          )
        )
    $policy$;
  END IF;
END;
$$;

-- 4. Add to the Supabase Realtime publication (idempotent guard).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END;
$$;

-- ============================================================
-- Verification queries (run manually to confirm)
-- ============================================================
-- Check REPLICA IDENTITY:
--   SELECT relreplident FROM pg_class WHERE relname = 'notifications';
--   -- 'f' = FULL ✓
--
-- Check policies:
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';
--
-- Check publication:
--   SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- ============================================================
