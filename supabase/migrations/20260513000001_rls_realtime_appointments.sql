-- ============================================================
-- Migration: RLS + Supabase Realtime for appointments table
-- ============================================================
-- Apply this migration in the Supabase SQL editor or with the CLI:
--   supabase db push
--
-- What this migration does
-- ------------------------
-- 1. Enables Row Level Security on `appointments` (if not already on).
-- 2. Adds SELECT policies so that staff members can read appointments
--    for their own tenant (required for Supabase Realtime to broadcast
--    postgres_changes events to authenticated users).
-- 3. Enables the `appointments` table for Supabase Realtime replication.
-- 4. Sets REPLICA IDENTITY FULL so DELETE events carry the full old row
--    (without this, payload.old only contains the primary key).
--
-- RLS design
-- ----------
--   Staff (owner / manager / staff / receptionist):
--     → can SELECT all appointments in their tenant
--   Clients with a Supabase account:
--     → can SELECT only their own appointments
--
-- Note: INSERT / UPDATE / DELETE mutations go through server actions
-- that use the service-role client (createAdminClient), so no write
-- policies are required for the realtime feature to work.  If you
-- later expose write operations to the browser, add them here.
-- ============================================================

-- 1. Enable RLS (safe to run even if already enabled)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 2. Full replica identity: DELETE events will contain the entire old row.
--    Without this, payload.old only has {id}, which is enough for deletion
--    but FULL is recommended for audit trails and future use.
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- 3. SELECT policy: staff members can read appointments for their tenant.
--    Checks `staff_members` for an active, non-deleted row linking the
--    authenticated user to the appointment's tenant.
CREATE POLICY "appointments_select_staff"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.profile_id  = auth.uid()
        AND sm.tenant_id   = appointments.tenant_id
        AND sm.is_active   = true
        AND sm.deleted_at  IS NULL
    )
  );

-- 4. SELECT policy: clients can read their own appointments only.
--    `clients.profile_id` is nullable — only clients who have linked
--    their Supabase account are covered by this policy.
CREATE POLICY "appointments_select_client"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.profile_id = auth.uid()
        AND c.id         = appointments.client_id
        AND c.deleted_at IS NULL
    )
  );

-- 5. Add the appointments table to the Supabase Realtime publication.
--    This is the trigger that enables postgres_changes events to flow
--    to connected WebSocket clients.
--
--    If `supabase_realtime` publication does not exist yet, Supabase
--    creates it automatically.  Adding a table that is already in the
--    publication is a no-op in PostgreSQL.
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- ============================================================
-- Verification queries (run manually to confirm everything works)
-- ============================================================
-- Check RLS is enabled:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'appointments';
--
-- Check policies:
--   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'appointments';
--
-- Check publication:
--   SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- ============================================================
