-- Backfill: mark onboarding_completed = true for all profiles that already
-- have at least one active staff_members row.
-- These are tenants created before the flag existed or where a partial
-- onboarding run left the flag unset.
UPDATE profiles
SET onboarding_completed = true
WHERE (onboarding_completed IS NULL OR onboarding_completed = false)
  AND id IN (
    SELECT DISTINCT profile_id
    FROM staff_members
    WHERE is_active = true
      AND deleted_at IS NULL
  );
