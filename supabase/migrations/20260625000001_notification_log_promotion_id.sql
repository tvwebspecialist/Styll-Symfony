-- Add promotion_id to notification_log for push idempotency on promotion publishes.
-- No unique constraint needed — idempotency is enforced at query level before insert.

ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notification_log_promotion
  ON notification_log(promotion_id)
  WHERE promotion_id IS NOT NULL;
