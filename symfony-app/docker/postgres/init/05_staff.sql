-- Historical/bootstrap SQL only.
-- Doctrine Migrations in symfony-app/migrations are the schema source of truth from the baseline onward.
-- Keep this file manually synchronized only while local fresh-volume bootstrap still depends on docker-entrypoint-initdb.d.

-- ─── AREA 2: Staff & Users ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id),
  role        TEXT NOT NULL DEFAULT 'staff'
                CHECK (role IN ('owner','manager','staff','receptionist')),
  bio         TEXT,
  photo_url   TEXT,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID REFERENCES profiles(id),
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_members_lookup
  ON staff_members(tenant_id, profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_public_tenant ON staff_members(tenant_id, created_at)
  WHERE deleted_at IS NULL AND is_active = true AND show_on_website = true;

CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Staff ↔ Location bridge (N:N)
CREATE TABLE IF NOT EXISTS staff_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE (staff_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_tenant ON staff_locations(tenant_id);
