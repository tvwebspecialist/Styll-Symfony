-- ─── AREA 6: Loyalty & Gamification ──────────────────────────────────────────

-- Loyalty config (immutable versioning: change = new row, close old with ended_at)
CREATE TABLE IF NOT EXISTS loyalty_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  template              TEXT NOT NULL DEFAULT 'classic'
                          CHECK (template IN ('classic','streak_master','vip_club')),
  points_per_visit      INTEGER DEFAULT 100,
  points_per_euro       INTEGER,
  streak_threshold_days INTEGER NOT NULL DEFAULT 45,
  version               INTEGER NOT NULL DEFAULT 1,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active loyalty config per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_configs_active
  ON loyalty_configs(tenant_id)
  WHERE ended_at IS NULL;

CREATE TRIGGER trg_loyalty_configs_updated_at BEFORE UPDATE ON loyalty_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Rewards catalog (max 6 per tenant — enforced at application level)
CREATE TABLE IF NOT EXISTS rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  points_cost   INTEGER NOT NULL CHECK (points_cost > 0),
  reward_type   TEXT NOT NULL
                  CHECK (reward_type IN ('product','service','discount','custom')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_rewards_updated_at BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Client loyalty state
CREATE TABLE IF NOT EXISTS client_loyalty (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_points         INTEGER NOT NULL DEFAULT 0,
  available_points     INTEGER NOT NULL DEFAULT 0,
  current_streak       INTEGER NOT NULL DEFAULT 0,
  longest_streak       INTEGER NOT NULL DEFAULT 0,
  current_tier         TEXT NOT NULL DEFAULT 'bronze',
  tier_slug            TEXT,
  tier_points_this_year INTEGER NOT NULL DEFAULT 0,
  tier_year            INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  tier_grace_expires_at TIMESTAMPTZ,
  last_visit_date      DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id)
);

CREATE TRIGGER trg_client_loyalty_updated_at BEFORE UPDATE ON client_loyalty
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit trail for every point movement
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL
                          CHECK (type IN ('earn','redeem','bonus','import','expire','adjustment')),
  points                INTEGER NOT NULL,
  description           TEXT,
  appointment_id        UUID REFERENCES appointments(id),
  staff_id              UUID REFERENCES staff_members(id),
  loyalty_config_version INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent double earn for same appointment
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_one_earn_per_appt
  ON loyalty_transactions(appointment_id)
  WHERE type = 'earn' AND appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loyalty_trans_client
  ON loyalty_transactions(tenant_id, client_id, created_at DESC);

-- Reward redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id),
  reward_id    UUID NOT NULL REFERENCES rewards(id),
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  confirmed_by UUID REFERENCES staff_members(id),
  confirmed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_client
  ON reward_redemptions(tenant_id, client_id, created_at DESC);

-- Gamification v2: tier configs, badges
CREATE TABLE IF NOT EXISTS tier_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tier_name     TEXT NOT NULL,
  min_points    INTEGER NOT NULL DEFAULT 0,
  benefits      JSONB NOT NULL DEFAULT '{}',
  visual_style  JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  condition_type  TEXT,
  condition_value INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, badge_id)
);
