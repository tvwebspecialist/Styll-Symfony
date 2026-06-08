-- ─── Push Notifications Infrastructure ──────────────────────────────────────
-- Tabella: push_subscriptions
--   Un record per ogni coppia (cliente, dispositivo).
--   endpoint è univoco a livello globale (un endpoint = un browser/dispositivo).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_profile ON push_subscriptions(profile_id);
CREATE INDEX idx_push_subscriptions_tenant  ON push_subscriptions(tenant_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Il service role (admin client) ha accesso completo (usato dal server)
CREATE POLICY "service_role_all" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabella: notification_log
--   Log idempotente di ogni notifica inviata.
--   Previene duplicati nel cron (es. se il cron gira due volte nello stesso slot).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  type           TEXT NOT NULL,  -- 'booking_confirmed' | 'reminder_3d' | 'reminder_1d' | 'reminder_day'
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unicità: un solo invio per (appointment, tipo)
  CONSTRAINT notification_log_unique UNIQUE (appointment_id, type)
);

CREATE INDEX idx_notification_log_profile    ON notification_log(profile_id);
CREATE INDEX idx_notification_log_tenant     ON notification_log(tenant_id);
CREATE INDEX idx_notification_log_sent_at    ON notification_log(sent_at);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON notification_log
  FOR ALL USING (true) WITH CHECK (true);
