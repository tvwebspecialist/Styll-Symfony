-- ============================================================
-- Migration: add 'campaign' to notifications_type_check
-- ============================================================
-- send-campaign.ts logs type='campaign' to notification_log.
-- Adding notifications.insert() there requires 'campaign' to be
-- a valid type in the check constraint.
-- ============================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    -- staff types
    'new_booking'::text,
    'cancellation'::text,
    'new_client'::text,
    'churn_alert'::text,
    'low_stock'::text,
    'loyalty_milestone'::text,
    'reschedule'::text,
    -- client types (push confirmation + reminders + promos)
    'booking_confirmed'::text,
    'reminder_3d'::text,
    'reminder_1d'::text,
    'reminder_day'::text,
    'promotion_published'::text,
    -- marketing campaigns
    'campaign'::text
  ]));
