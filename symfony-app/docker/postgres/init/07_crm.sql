-- Historical/bootstrap SQL only.
-- Doctrine Migrations in symfony-app/migrations are the schema source of truth from the baseline onward.
-- Keep this file manually synchronized only while local fresh-volume bootstrap still depends on docker-entrypoint-initdb.d.

-- ─── AREA 5: Clients & CRM ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id                UUID REFERENCES profiles(id),   -- NULL if client has no app account
  full_name                 TEXT NOT NULL,
  phone                     TEXT NOT NULL,
  email                     TEXT,
  date_of_birth             DATE,
  preferred_contact_channel TEXT DEFAULT 'sms'
                              CHECK (preferred_contact_channel IN ('push','whatsapp','sms','email')),
  marketing_consent         BOOLEAN NOT NULL DEFAULT false,
  avatar_url                TEXT,
  tags                      JSONB NOT NULL DEFAULT '[]',
  referred_by               UUID REFERENCES clients(id),
  churn_opted_out           BOOLEAN NOT NULL DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  deleted_by                UUID REFERENCES profiles(id),
  created_by                UUID REFERENCES profiles(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_profile ON clients(tenant_id, profile_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(tenant_id, phone)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add FK from wishlist to clients (deferred from 06_catalog.sql)
ALTER TABLE client_product_wishlist
  ADD CONSTRAINT fk_wishlist_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Private staff notes (never visible to clients)
CREATE TABLE IF NOT EXISTS client_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff_members(id),
  note_text   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_client
  ON client_notes(tenant_id, client_id, created_at DESC);

-- GDPR consent events (granular per consent_type)
CREATE TABLE IF NOT EXISTS client_consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL
                 CHECK (consent_type IN ('marketing_sms','marketing_whatsapp','marketing_email','marketing_push','data_processing')),
  granted      BOOLEAN NOT NULL,
  granted_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consents_client ON client_consents(tenant_id, client_id);

-- Client analytics (pre-computed metrics)
CREATE TABLE IF NOT EXISTS client_analytics (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id                   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_visits                INTEGER NOT NULL DEFAULT 0,
  total_spent_services        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent_products        NUMERIC(12,2) NOT NULL DEFAULT 0,
  average_spend_per_visit     NUMERIC(10,2),
  last_visit_date             DATE,
  days_since_last_visit       INTEGER,
  average_days_between_visits NUMERIC(8,2),
  churn_status                TEXT NOT NULL DEFAULT 'green'
                                CHECK (churn_status IN ('green','yellow','red')),
  vip_score                   INTEGER NOT NULL DEFAULT 0 CHECK (vip_score BETWEEN 0 AND 100),
  no_show_count               INTEGER NOT NULL DEFAULT 0,
  cancellation_count          INTEGER NOT NULL DEFAULT 0,
  referral_count              INTEGER NOT NULL DEFAULT 0,
  last_reconciled_at          TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id)
);

CREATE TRIGGER trg_client_analytics_updated_at BEFORE UPDATE ON client_analytics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
