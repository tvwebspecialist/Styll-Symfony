# Database Schema MVP — Styll (Prototipo di tesi)

> **Versione:** MVP 1.0 — congelata
> **Scope:** schema eseguibile per il prototipo funzionante della tesi
> **Relazione con lo schema di produzione:** questo è un **sottoinsieme** dello schema completo documentato in `docs/07-tecnico/database-schema.md` (39 tabelle v1). L'MVP implementa solo le 24 tabelle core necessarie a dimostrare il prodotto. Le tabelle escluse non vengono cancellate: restano nel documento di produzione e vengono citate in tesi come "architettura di riferimento per il deployment reale".
> **Stack:** PostgreSQL 15+ via Supabase

---

## 1. Perché questo file esiste

Lo schema di produzione (39 tabelle v1, 48 v2, 51 v3) è stato progettato come architettura enterprise-grade, con pattern da sistema distribuito (outbox, idempotency, webhook inbox) e funzionalità di compliance avanzata (audit log, consensi granulari, data export). È un'ottima progettazione, ma **per il prototipo di una tesi universitaria è sovradimensionato**.

Questo documento definisce lo **schema minimo sufficiente** a:

1. Far funzionare tutti i flussi principali del prodotto nel prototipo (booking, CRM, loyalty, inventario)
2. Permettere di popolare una demo con dati realistici per le 4 personas (Marco, Sara, Luca, Roberto)
3. Essere implementato in circa 2 settimane di sprint di sviluppo invece di 6-8
4. Rendere possibile presentare alla commissione una demo cliccabile completa

**Principio guida:** *tutto ciò che è nel prototipo è nell'MVP; tutto ciò che è infrastruttura di produzione resta nel documento di architettura come "progettato, non implementato".*

---

## 2. Cosa è dentro e cosa è fuori

### 2.1 — Le 24 tabelle dell'MVP (raggruppate per area)

| Area | Tabelle MVP |
|------|-------------|
| 1. Business | `tenants`, `locations`, `subscription_plans`, `tenant_subscriptions` |
| 2. Utenti e Staff | `profiles`, `staff_members`, `staff_locations` |
| 3. Catalogo | `services`, `staff_services`, `products`, `product_inventory` |
| 4. Appuntamenti | `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products`, `payments` |
| 5. CRM | `clients`, `client_notes` |
| 6. Loyalty | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions` |

**Totale: 24 tabelle.** Sono le tabelle che raccontano il prodotto. Se ne togli una, il prototipo non dimostra più qualcosa.

### 2.2 — Cosa è stato escluso dall'MVP e perché

| Tabella/Area | Perché non è nell'MVP | Come viene gestita nel prototipo |
|--------------|----------------------|----------------------------------|
| `client_consents` | GDPR in tesi è citato come architettura, non implementato | Campo booleano singolo `marketing_consent` su `clients` + checkbox al signup |
| `client_analytics` | Dati derivati calcolabili on-the-fly | VIEW SQL o query dirette (`last_visit_at`, `days_since_last_visit`, ecc.) |
| `message_templates`, `messages_log`, `staff_notifications` | La messaggistica reale (SMS/WhatsApp) richiede provider a pagamento fuori scope | Mocked nell'UI: il prototipo mostra "SMS inviato ✓" senza invio reale |
| `review_requests` | Feature periferica rispetto al core | Citata in roadmap, non implementata |
| `admin_users`, `tenant_activity_log`, `audit_log` | La dashboard admin è citata in tesi (sezione 7.6) come architettura, non implementata | Nessuna implementazione. Menzionata concettualmente |
| AREA 11 intera: `push_subscriptions`, `messaging_outbox`, `idempotency_keys`, `tenant_usage_counters`, `webhook_events_inbox`, `tenant_onboarding_state` | Pattern enterprise per sistemi distribuiti in produzione. Non servono a un prototipo dove non ci sono webhook né provider esterni reali | Sostituiti da chiamate dirette nel codice |
| `data_export_requests` | GDPR art. 17/20 richiede capability di export, non una tabella. In tesi si cita come obbligo, non si implementa | Non implementata |

Il documento completo di produzione (`docs/07-tecnico/database-schema.md`) resta la **Appendice C della tesi** — dimostra la maturità progettuale. L'MVP dimostra la capacità di selezionare il subset giusto per il deliverable.

---

## 3. Regole architetturali mantenute dall'MVP

Anche riducendo a 24 tabelle, l'MVP mantiene le decisioni architetturali fondamentali dello schema di produzione:

1. **Multi-tenancy nativa.** Ogni tabella operativa ha `tenant_id`. RLS su ogni tabella.
2. **UUID come primary key.** Compatibile con Supabase, impossibile da enumerare.
3. **Prezzi snapshot.** `appointment_services.price_at_booking` e `appointment_products.price_at_sale` fotografano il prezzo al momento della vendita.
4. **Soft delete** su `clients`, `appointments`, `staff_members` con `deleted_at`.
5. **CRM come fonte di verità per la loyalty.** `clients.profile_id` è nullable: Roberto esiste nel CRM anche senza app.
6. **Cliente cross-tenant.** Un `auth.users` (Luca) può avere N record `clients` (uno per barbiere).
7. **Exclusion constraint su `appointments`** per impedire sovrapposizioni a livello database.
8. **Unique partial index su `loyalty_transactions`** per evitare doppio accredito.
9. **`loyalty_configs` immutabile** con `started_at`/`ended_at` per storico versioni.
10. **`working_hours` + `working_hour_overrides`** separate per orari ricorrenti + eccezioni.

Queste scelte non costano nulla in complessità ma rendono il prototipo **credibile come base di un sistema reale** — non "un database da esercizio universitario".

---

## 4. Schema SQL eseguibile

Tutto il codice che segue è direttamente eseguibile su un progetto Supabase nuovo. L'ordine di esecuzione rispetta le dipendenze FK.

### 4.1 — Estensioni necessarie

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusion constraint appuntamenti
```

### 4.2 — Helper function per RLS

```sql
-- Ritorna il tenant_id dello staff member autenticato (NULL se è cliente o admin)
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id
  FROM staff_members
  WHERE profile_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- Trigger standard per aggiornare updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

### 4.3 — AREA 1: Business e Abbonamenti

```sql
-- Piani commerciali (globale, nessun tenant_id)
CREATE TABLE subscription_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,           -- "Starter", "Growth", "Pro"
  slug        TEXT NOT NULL UNIQUE,    -- "starter", "growth", "pro"
  price_monthly NUMERIC(10,2) NOT NULL,
  max_staff     INTEGER,               -- NULL = illimitato
  max_locations INTEGER,
  feature_flags JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Il business (barbershop)
CREATE TABLE tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name  TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,  -- subdomain: marco.styll.app
  timezone       TEXT NOT NULL DEFAULT 'Europe/Rome',
  logo_url       TEXT,
  primary_color  TEXT DEFAULT '#1A1A2E',
  secondary_color TEXT DEFAULT '#E94560',
  font_family    TEXT DEFAULT 'Inter',
  settings       JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','trial')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sedi fisiche
CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  zip_code    TEXT,
  phone       TEXT,
  email       TEXT,
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Abbonamento del tenant al piano
CREATE TABLE tenant_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id      UUID NOT NULL REFERENCES subscription_plans(id),
  status       TEXT NOT NULL DEFAULT 'trial'
                 CHECK (status IN ('trial','active','past_due','cancelled')),
  trial_ends_at          TIMESTAMPTZ,
  current_period_start   TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un solo abbonamento operativo per tenant
CREATE UNIQUE INDEX idx_tenant_subs_one_active
  ON tenant_subscriptions(tenant_id)
  WHERE status IN ('trial','active','past_due');

CREATE TRIGGER trg_tenant_subs_updated_at BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 4.4 — AREA 2: Utenti e Staff

```sql
-- Profilo esteso di ogni auth.users (staff + clienti + admin)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type   TEXT NOT NULL CHECK (user_type IN ('staff','client','admin')),
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: creazione automatica del profilo al signup
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, user_type, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.phone
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Staff di un tenant con ruolo
CREATE TABLE staff_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(id),
  role         TEXT NOT NULL DEFAULT 'staff'
                 CHECK (role IN ('owner','manager','staff','receptionist')),
  bio          TEXT,
  photo_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, profile_id)
);

CREATE INDEX idx_staff_members_lookup
  ON staff_members(tenant_id, profile_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ponte N:N: staff ↔ sedi
CREATE TABLE staff_locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  location_id  UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE (staff_id, location_id)
);
```

---

### 4.5 — AREA 3: Catalogo (Servizi e Prodotti)

```sql
-- Servizi (tempo, durata)
CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  category        TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Quali servizi offre ogni staff member
CREATE TABLE staff_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE (staff_id, service_id)
);

-- Prodotti (bene fisico, giacenza)
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  brand       TEXT,
  price_sell  NUMERIC(10,2) NOT NULL,
  price_cost  NUMERIC(10,2),
  sku         TEXT,
  photo_url   TEXT,
  category    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Giacenza per prodotto per sede
CREATE TABLE product_inventory (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id          UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity             INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold  INTEGER NOT NULL DEFAULT 3,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, location_id)
);

CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON product_inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 4.6 — AREA 5: Clienti e CRM

```sql
-- Cliente nel CRM (può esistere senza account)
CREATE TABLE clients (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id                  UUID REFERENCES profiles(id), -- NULL se cliente senza app
  full_name                   TEXT NOT NULL,
  phone                       TEXT NOT NULL,
  email                       TEXT,
  date_of_birth               DATE,
  preferred_contact_channel   TEXT DEFAULT 'sms'
                                CHECK (preferred_contact_channel IN ('push','whatsapp','sms','email')),
  marketing_consent           BOOLEAN NOT NULL DEFAULT false, -- semplificazione MVP vs client_consents
  tags                        JSONB NOT NULL DEFAULT '[]',
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);

CREATE INDEX idx_clients_profile ON clients(tenant_id, profile_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Note private del barbiere (MAI visibili al cliente)
CREATE TABLE client_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff_members(id),
  note_text   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_client ON client_notes(tenant_id, client_id, created_at DESC);
```

---

### 4.7 — AREA 4: Calendario e Appuntamenti

```sql
-- Orari ricorrenti settimanali per staff
CREATE TABLE working_hours (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domenica, 6=sabato
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_working_hours_lookup
  ON working_hours(tenant_id, staff_id, day_of_week);

-- Eccezioni per data (ferie, chiusure, orari speciali)
CREATE TABLE working_hour_overrides (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  is_closed    BOOLEAN NOT NULL DEFAULT false,
  start_time   TIME,
  end_time     TIME,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_overrides_lookup
  ON working_hour_overrides(tenant_id, staff_id, date);

-- L'appuntamento
CREATE TABLE appointments (
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
                                              'walk_in','phone')),
  booked_by       UUID REFERENCES profiles(id),
  notes           TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

-- Exclusion constraint: nessuna sovrapposizione per lo stesso staff
ALTER TABLE appointments
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status NOT IN ('cancelled','no_show') AND deleted_at IS NULL);

CREATE INDEX idx_appts_staff_time
  ON appointments(tenant_id, staff_id, start_time);

CREATE INDEX idx_appts_client
  ON appointments(tenant_id, client_id);

CREATE INDEX idx_appts_status
  ON appointments(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_appts_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Servizi nell'appuntamento (con prezzo snapshot)
CREATE TABLE appointment_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id    UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id        UUID NOT NULL REFERENCES services(id),
  price_at_booking  NUMERIC(10,2) NOT NULL, -- snapshot del prezzo al momento del booking
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appt_services ON appointment_services(appointment_id);

-- Prodotti venduti durante l'appuntamento (con prezzo snapshot)
CREATE TABLE appointment_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_sale   NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appt_products ON appointment_products(appointment_id);

-- Trigger: decrementa la giacenza quando un prodotto è venduto
CREATE OR REPLACE FUNCTION decrement_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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

-- Pagamento effettivo
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id),
  client_id       UUID NOT NULL REFERENCES clients(id),
  amount          NUMERIC(10,2) NOT NULL,
  tip_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL
                    CHECK (payment_method IN ('cash','card_terminal','stripe_online','bank_transfer','other')),
  status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('pending','completed','refunded','failed')),
  notes           TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_appt ON payments(tenant_id, appointment_id);
CREATE INDEX idx_payments_date ON payments(tenant_id, paid_at);
```

---

### 4.8 — AREA 6: Loyalty

```sql
-- Config loyalty del tenant (immutabile: cambio = nuova riga con started_at/ended_at)
CREATE TABLE loyalty_configs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template                TEXT NOT NULL DEFAULT 'classic'
                            CHECK (template IN ('classic','streak_master','vip_club')),
  points_per_visit        INTEGER DEFAULT 100, -- per template 'classic'
  points_per_euro         INTEGER,             -- per template 'streak_master' (v2)
  streak_threshold_days   INTEGER NOT NULL DEFAULT 45,
  version                 INTEGER NOT NULL DEFAULT 1,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at                TIMESTAMPTZ,  -- NULL = config attiva
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo una config attiva per tenant
CREATE UNIQUE INDEX idx_loyalty_configs_active
  ON loyalty_configs(tenant_id)
  WHERE ended_at IS NULL;

CREATE TRIGGER trg_loyalty_configs_updated_at BEFORE UPDATE ON loyalty_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Catalogo ricompense (max 6 per tenant, regola applicativa)
CREATE TABLE rewards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  points_cost    INTEGER NOT NULL CHECK (points_cost > 0),
  reward_type    TEXT NOT NULL
                   CHECK (reward_type IN ('product','service','discount','custom')),
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_rewards_updated_at BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Stato loyalty del cliente
CREATE TABLE client_loyalty (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_points       INTEGER NOT NULL DEFAULT 0,     -- cumulativo storico
  available_points   INTEGER NOT NULL DEFAULT 0,     -- spendibili ora
  current_streak     INTEGER NOT NULL DEFAULT 0,     -- visite consecutive
  longest_streak     INTEGER NOT NULL DEFAULT 0,
  last_visit_date    DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id)
);

CREATE TRIGGER trg_client_loyalty_updated_at BEFORE UPDATE ON client_loyalty
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit trail di ogni movimento punti
CREATE TABLE loyalty_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type             TEXT NOT NULL
                     CHECK (type IN ('earn','redeem','bonus','import','adjustment')),
  points           INTEGER NOT NULL,  -- positivo o negativo
  description      TEXT,
  appointment_id   UUID REFERENCES appointments(id),
  staff_id         UUID REFERENCES staff_members(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evita doppio accredito per lo stesso appuntamento
CREATE UNIQUE INDEX idx_loyalty_one_earn_per_appt
  ON loyalty_transactions(appointment_id)
  WHERE type = 'earn' AND appointment_id IS NOT NULL;

CREATE INDEX idx_loyalty_trans_client
  ON loyalty_transactions(tenant_id, client_id, created_at DESC);

-- Riscatti ricompense
CREATE TABLE reward_redemptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id),
  reward_id      UUID NOT NULL REFERENCES rewards(id),
  points_spent   INTEGER NOT NULL CHECK (points_spent > 0),
  confirmed_by   UUID REFERENCES staff_members(id),
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_redemptions_client
  ON reward_redemptions(tenant_id, client_id, created_at DESC);
```

---

## 5. Row Level Security (RLS) — policy essenziali

Per il prototipo di tesi sono sufficienti le policy base. Ogni tabella deve avere RLS abilitata. Qui sotto le policy core; le restanti seguono lo stesso pattern.

### 5.1 — Abilitare RLS su tutte le tabelle

```sql
ALTER TABLE tenants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours          ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hour_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_loyalty         ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions     ENABLE ROW LEVEL SECURITY;
```

### 5.2 — Policy core (pattern per tutte le tabelle tenant-scoped)

```sql
-- subscription_plans: lettura pubblica (per mostrare i piani)
CREATE POLICY plans_select_all ON subscription_plans
  FOR SELECT USING (is_active = true);

-- tenants: staff vede il suo tenant, cliente vede il branding pubblico
CREATE POLICY tenants_select_own ON tenants
  FOR SELECT USING (id = get_my_tenant_id());

-- profiles: ognuno vede solo il proprio
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Pattern standard per tabelle tenant-scoped
-- (replicato su: locations, services, products, product_inventory,
--  clients, staff_members, staff_locations, staff_services,
--  working_hours, working_hour_overrides, appointments,
--  appointment_services, appointment_products, payments,
--  loyalty_configs, rewards, client_loyalty,
--  loyalty_transactions, reward_redemptions, client_notes)

CREATE POLICY services_tenant_access ON services
  FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY clients_tenant_access ON clients
  FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY appointments_tenant_access ON appointments
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- ... e così via per le altre tabelle tenant-scoped

-- Policy speciale: cliente autenticato vede SOLO i suoi appuntamenti
CREATE POLICY appointments_client_own ON appointments
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE profile_id = auth.uid()
    )
  );

-- client_notes: mai visibili al cliente (tabella ad accesso solo staff)
CREATE POLICY notes_staff_only ON client_notes
  FOR ALL USING (tenant_id = get_my_tenant_id());
```

> **Nota:** le RLS sopra sono semplificate per l'MVP. Lo schema di produzione in `database-schema.md` prevede policy granulari per ruolo (owner/manager/staff/receptionist) con differenziazione SELECT/INSERT/UPDATE/DELETE. Per il prototipo di tesi il pattern "tenant_id = get_my_tenant_id()" è sufficiente a dimostrare l'isolamento multi-tenant.

---

## 6. Seed data per la demo

Per popolare la demo con le 4 personas del progetto, il seed minimo è:

```sql
-- 1 tenant (Marco's Barber)
-- 1 location (Napoli centro)
-- 1 subscription plan (Starter attivo)
-- 3 staff members (Marco, Anna receptionist, Luigi barbiere)
-- 8 services (Taglio, Barba, Taglio+Barba, Shampoo, Colore, Contorno, Sopracciglia, Shave)
-- 5 products (Matt Clay, Olio Barba, Shampoo, Cera, Spray)
-- 20 clienti (mix di attivi, a rischio churn, nuovi)
-- 50 appuntamenti passati (ultimi 3 mesi)
-- 10 appuntamenti futuri
-- 1 loyalty_config (Classico, 100 punti/visita)
-- 4 rewards (2.000, 3.750, 5.000, 7.500 punti)
-- client_loyalty popolato per ognuno dei 20 clienti
```

Il file `seed.sql` andrà scritto come step successivo — l'obiettivo è avere un dataset che renda la demo visiva e convincente per la commissione.

---

## 7. Cosa NON è stato implementato e perché (per la tesi)

Questa sezione serve per la tesi, capitolo 7 (Implementazione tecnica). È importante dichiarare esplicitamente i limiti dello scope:

| Feature del prodotto | Tabella di riferimento | Stato nel prototipo | Motivazione |
|----------------------|------------------------|---------------------|-------------|
| Messaggistica reale (SMS/WhatsApp) | `messages_log`, `messaging_outbox` | Mocked — l'UI mostra "inviato" ma non invia | Richiede provider a pagamento e gestione compliance telefonica fuori scope per la tesi |
| Consensi GDPR granulari | `client_consents` | Sostituito da singolo flag `marketing_consent` | L'architettura completa è descritta in tesi; l'implementazione granulare è citata come produzione |
| Churn analytics precalcolate | `client_analytics` | Calcolati on-the-fly con query SQL | Evita la complessità di trigger + cron di riconciliazione notturna |
| Audit log operazioni sensibili | `audit_log` | Non implementato | Prototipo con pochi utenti di test — audit non necessario |
| Dashboard admin piattaforma | `admin_users`, `tenant_activity_log` | Non implementata | Cap. 7.6 della tesi la descrive come architettura, non come deliverable |
| Outbox pattern per messaggi asincroni | `messaging_outbox`, `idempotency_keys`, `webhook_events_inbox` | Non implementato | Pattern per sistemi in produzione con volumi reali. Non applicabile al prototipo |
| Review request tracking | `review_requests` | Non implementato | Feature periferica rispetto al core loyalty + booking |
| Push notifications | `push_subscriptions` | UI mostra banner, no push reale | Richiede certificati e backend VAPID fuori scope |
| Usage counters per billing | `tenant_usage_counters` | Non implementato | Il billing reale è fuori scope del prototipo |
| Wizard onboarding persistito | `tenant_onboarding_state` | Stato in localStorage del browser | Sufficiente per demo di una sessione |

**In tesi questo diventa un punto di forza, non un limite:** dimostra che sai distinguere tra architettura di produzione (progettata, 39 tabelle) e implementazione di prototipo (24 tabelle), e che la progettazione non è stata "buttata" per fretta ma consapevolmente ridotta per rispettare lo scope accademico.

---

## 8. Prossimi passi

1. Eseguire lo script SQL di questo documento su un nuovo progetto Supabase
2. Abilitare le estensioni `pgcrypto` e `btree_gist` dal dashboard Supabase
3. Scrivere `seed.sql` con i dati demo (punto 6)
4. Auto-generare i tipi TypeScript: `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
5. Implementare le Edge Functions di calcolo slot (vedi Decisione 6 nel documento di produzione)
6. Cablare frontend (Next.js + React) sulle tabelle create

---

## 9. Relazione con lo schema di produzione

| Documento | Scopo | Uso in tesi |
|-----------|-------|-------------|
| `docs/07-tecnico/database-schema.md` | Schema di produzione completo (39 tabelle v1, 48 v2, 51 v3). Architettura enterprise-grade. | **Appendice C della tesi.** Capitolo 7.3 ne descrive la struttura concettuale. Dimostra maturità progettuale. |
| `docs/07-tecnico/database-schema-mvp.md` (questo file) | Schema eseguibile del prototipo (24 tabelle). Implementa il core del prodotto. | **Base del prototipo funzionante** demo-to dalla commissione. Capitolo 7.4 descrive cosa è implementato e cosa no. |

I due documenti sono complementari: il primo descrive *dove il prodotto vuole arrivare*, il secondo descrive *cosa c'è oggi nel prototipo di tesi*. Questa separazione è un pattern standard nelle tesi di progettazione software ed è intellettualmente onesta.