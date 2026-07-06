-- ============================================================
-- Migration: extend notifications_type_check for client notification types
-- ============================================================
-- Root cause: notifications_type_check only allowed staff-side types.
-- Every insert of booking_confirmed / reminder_* / promotion_published
-- silently failed with ERROR 23514, leaving the client notifications table
-- always empty despite notification_log confirming pushes were sent.
--
-- Fix: drop and recreate the constraint adding 5 client-side types.
-- ============================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    -- staff notification types (unchanged)
    'new_booking'::text,
    'cancellation'::text,
    'new_client'::text,
    'churn_alert'::text,
    'low_stock'::text,
    'loyalty_milestone'::text,
    'reschedule'::text,
    -- client notification types (added)
    'booking_confirmed'::text,
    'reminder_3d'::text,
    'reminder_1d'::text,
    'reminder_day'::text,
    'promotion_published'::text
  ]));
