-- Historical/bootstrap SQL only.
-- Doctrine Migrations in symfony-app/migrations are the schema source of truth from the baseline onward.
-- Keep this file manually synchronized only while local fresh-volume bootstrap still depends on docker-entrypoint-initdb.d.

-- ─── AREA 1: Business & Subscriptions ────────────────────────────────────────

-- Subscription plans (global, no tenant_id)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  price_monthly NUMERIC(10,2) NOT NULL,
  max_staff     INTEGER,
  max_locations INTEGER,
  max_messages_month INTEGER,
  feature_flags JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants (barbershops)
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  timezone        TEXT NOT NULL DEFAULT 'Europe/Rome',
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#1A1A2E',
  secondary_color TEXT DEFAULT '#E94560',
  font_family     TEXT DEFAULT 'Inter',
  settings        JSONB NOT NULL DEFAULT '{}',
  feature_flag_overrides JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'trial')),
  data_region     TEXT NOT NULL DEFAULT 'eu-west-1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Physical locations
CREATE TABLE IF NOT EXISTS locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  zip_code    TEXT,
  phone       TEXT,
  email       TEXT,
  photo_url   TEXT,
  photos      JSONB NOT NULL DEFAULT '[]'::jsonb,
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  timezone    TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_public_tenant
  ON locations(tenant_id, created_at)
  WHERE is_active = true AND show_on_website = true;

CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tenant ↔ plan subscription
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id               UUID NOT NULL REFERENCES subscription_plans(id),
  status                TEXT NOT NULL DEFAULT 'trial'
                          CHECK (status IN ('trial','active','past_due','suspended','cancelled')),
  trial_ends_at         TIMESTAMPTZ,
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end    TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active subscription per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_subs_one_active
  ON tenant_subscriptions(tenant_id)
  WHERE status IN ('trial','active','past_due');

CREATE TRIGGER trg_tenant_subs_updated_at BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
