-- =============================================================
-- Backfill staff_locations for existing tenants
--
-- For every staff_member that has no location assignments,
-- link them to the first (main) location of their tenant.
-- =============================================================

INSERT INTO staff_locations (tenant_id, staff_id, location_id)
SELECT
  sm.tenant_id,
  sm.id as staff_id,
  (
    SELECT l.id
    FROM locations l
    WHERE l.tenant_id = sm.tenant_id
    ORDER BY l.created_at ASC
    LIMIT 1
  ) as location_id
FROM staff_members sm
WHERE
  sm.deleted_at IS NULL
  AND sm.is_active = true
  AND sm.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM staff_locations sl
    WHERE sl.staff_id = sm.id
  )
  AND EXISTS (
    SELECT 1 FROM locations l
    WHERE l.tenant_id = sm.tenant_id
    AND l.is_active = true
  )
ON CONFLICT DO NOTHING;
