-- Add location_id to working_hours so each shift can be tied to a specific sede.
-- Add unique constraint on (staff_id, day_of_week) so upserts are possible.

ALTER TABLE public.working_hours
  ADD COLUMN IF NOT EXISTS location_id uuid
    REFERENCES public.locations(id) ON DELETE SET NULL;

-- Guard against existing duplicates before adding the constraint
DELETE FROM public.working_hours w1
WHERE w1.ctid <> (
  SELECT w2.ctid
  FROM public.working_hours w2
  WHERE w2.staff_id    = w1.staff_id
    AND w2.day_of_week = w1.day_of_week
  ORDER BY w2.created_at ASC
  LIMIT 1
);

ALTER TABLE public.working_hours
  DROP CONSTRAINT IF EXISTS working_hours_staff_day_unique;

ALTER TABLE public.working_hours
  ADD CONSTRAINT working_hours_staff_day_unique UNIQUE (staff_id, day_of_week);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
