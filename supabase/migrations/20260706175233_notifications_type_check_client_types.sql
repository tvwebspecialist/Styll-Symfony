
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'new_booking'::text,
    'cancellation'::text,
    'new_client'::text,
    'churn_alert'::text,
    'low_stock'::text,
    'loyalty_milestone'::text,
    'reschedule'::text,
    'booking_confirmed'::text,
    'reminder_3d'::text,
    'reminder_1d'::text,
    'reminder_day'::text,
    'promotion_published'::text
  ]));
;
