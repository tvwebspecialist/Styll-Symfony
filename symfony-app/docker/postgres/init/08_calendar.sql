-- ─── AREA 4: Calendar & Appointments ─────────────────────────────────────────

-- Recurring weekly schedule per staff member
CREATE TABLE IF NOT EXISTS working_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sunday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_working_hours_lookup
  ON working_hours(tenant_id, staff_id, day_of_week);

-- Exceptions for specific dates (holidays, special hours)
CREATE TABLE IF NOT EXISTS working_hour_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  is_closed   BOOLEAN NOT NULL DEFAULT false,
  start_time  TIME,
  end_time    TIME,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overrides_lookup
  ON working_hour_overrides(tenant_id, staff_id, date);

-- Appointment (booking)
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  staff_id        UUID NOT NULL REFERENCES staff_members(id),
  location_id     UUID NOT NULL REFERENCES locations(id),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  booking_source  TEXT NOT NULL DEFAULT 'pwa'
                    CHECK (booking_source IN ('pwa','dashboard_owner','dashboard_manager',
                                              'dashboard_staff','dashboard_receptionist',
                                              'walk_in','phone','whatsapp')),
  booked_by       UUID REFERENCES profiles(id),
  created_by      UUID REFERENCES profiles(id),
  notes           TEXT,
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','paid','refunded')),
  booking_confirmation_token TEXT UNIQUE,
  version         INTEGER NOT NULL DEFAULT 1,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

-- Exclusion constraint: no overlapping appointments for same staff
ALTER TABLE appointments
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status NOT IN ('cancelled','no_show') AND deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_appts_staff_time
  ON appointments(tenant_id, staff_id, start_time)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appts_client
  ON appointments(tenant_id, client_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appts_status
  ON appointments(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Optimistic locking: increment version on every update
CREATE OR REPLACE FUNCTION increment_appointment_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appts_version
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION increment_appointment_version();

CREATE TRIGGER trg_appts_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Services within an appointment (price snapshot)
CREATE TABLE IF NOT EXISTS appointment_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id   UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id       UUID NOT NULL REFERENCES services(id),
  price_at_booking NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_services ON appointment_services(appointment_id);

-- Products sold during appointment (price + qty snapshot)
CREATE TABLE IF NOT EXISTS appointment_products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id),
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_sale  NUMERIC(10,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_products ON appointment_products(appointment_id);

-- Trigger: decrement inventory when product sold
CREATE OR REPLACE FUNCTION decrement_inventory()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_inventory pi
  SET quantity = quantity - NEW.quantity
  FROM appointments a
  WHERE pi.product_id = NEW.product_id
    AND a.id = NEW.appointment_id
    AND pi.location_id = a.location_id
    AND pi.tenant_id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_inventory
  AFTER INSERT ON appointment_products
  FOR EACH ROW EXECUTE FUNCTION decrement_inventory();

-- Actual payment record (separate from appointment)
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id),
  client_id       UUID NOT NULL REFERENCES clients(id),
  amount          NUMERIC(10,2) NOT NULL,
  tip_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL
                    CHECK (payment_method IN ('cash','card_terminal','stripe_online','bank_transfer','other')),
  status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('pending','completed','refunded','partial_refund','failed')),
  stripe_payment_id TEXT,
  refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  refunded_at     TIMESTAMPTZ,
  refund_reason   TEXT,
  stripe_refund_id TEXT,
  notes           TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_appt ON payments(tenant_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(tenant_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(tenant_id, client_id);
