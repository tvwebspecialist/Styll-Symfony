-- ─── Prevent duplicate staff_members rows ────────────────────────────────────
--
-- A race condition in acceptInvitation() (double-click on "Accetta invito")
-- could insert two rows for the same (profile_id, tenant_id) pair before either
-- pre-check query returned.  This migration:
--   1) Removes any existing duplicates (keeps the most-recently-created row).
--   2) Adds a partial unique index that prevents future duplicates for active
--      (non-deleted) members with a non-null profile_id.
--
-- Partial index rationale:
--   - Excludes soft-deleted rows (deleted_at IS NOT NULL) so a former member can
--     be re-invited after removal without hitting the constraint.
--   - Excludes NULL profile_id rows to avoid issues with staff created before a
--     profile is linked.

-- Step 1: Remove duplicates, keeping the most recently created row per pair.
DELETE FROM public.staff_members
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY profile_id, tenant_id
        ORDER BY created_at DESC NULLS LAST
      ) AS rn
    FROM public.staff_members
    WHERE deleted_at IS NULL
      AND profile_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Add the partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_profile_tenant_unique
  ON public.staff_members (profile_id, tenant_id)
  WHERE deleted_at IS NULL AND profile_id IS NOT NULL;
