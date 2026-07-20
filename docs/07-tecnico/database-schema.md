> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri  
> **Stack:** PostgreSQL 16 + Doctrine ORM 3  
> _Documento aggiornato: luglio 2026. Versione Supabase archiviata in `docs/_archivio-supabase/database-schema-supabase.md`_

---

# Architettura Database — Styll

## Sezione 0 — TL;DR strategia versionamento

**Risposta diretta:** il dominio si progetta una volta sola. Le tabelle si creano quando servono. Le colonne future-proof esistono già in v1 come campi nullable/default, così v2 non deve mai fare ALTER TABLE su tabelle v1.

| Livello | Strategia |
|---|---|
| Modello dominio | Finale da subito: entità, relazioni e invarianti si disegnano una volta |
| Schema fisico | Incrementale additivo: v1 crea solo le tabelle necessarie oggi |
| Colonne future-proof | Presenti già in v1 come nullable/default, anche se inerti in UX |
| Isolamento multi-tenant | Doctrine TenantFilter (applicativo) invece di RLS PostgreSQL |

---

## Decisioni architetturali principali

### DA-1 — Multi-tenant isolation: TenantFilter vs RLS

**Versione Supabase (archiviata):** Row Level Security PostgreSQL con `auth.uid()` e `get_my_tenant_id()`.

**Versione Symfony:** Doctrine SQL Filter globale — aggiunge `WHERE tenant_id = ?` a ogni SELECT generato da Doctrine. Fail-closed: se nessun `tenant_id` è impostato nel JWT, il filter ritorna `1 = 0` (zero righe).

```php
// src/Doctrine/TenantFilter.php
class TenantFilter extends SQLFilter {
    public function addFilterConstraint(ClassMetadata $meta, string $alias): string {
        // Escluse: User, Profile, Tenant, SubscriptionPlan (no tenant_id)
        // No JWT → '1 = 0' (fail-closed)
        // Standard → 'alias.tenant_id = uuid'
    }
}
```

Verificato: 12/12 test PHPUnit (vedi `symfony-app/MIGRATION-LOG.md`, FASE 2).

### DA-2 — UUID come primary key

`symfony/uid` genera UUID v4 in PHP. Tipo `uuid` in PostgreSQL. Impossibile da enumerare.

```php
#[ORM\Id, ORM\Column(type: 'uuid')]
private Uuid $id;

#[ORM\PrePersist]
public function onPrePersist(): void {
    if (!isset($this->id)) $this->id = Uuid::v4();
}
```

### DA-3 — Prezzi snapshot

`appointment_services.price_at_booking` e `appointment_products.price_at_sale` fotografano il prezzo al momento della vendita. Tipo `DECIMAL(10,2)` mappato come `string` in PHP (evita float precision).

### DA-4 — Soft delete

`clients`, `appointments`, `staff_members` usano `deleted_at TIMESTAMPTZ`. Pattern a 3 stati per staff: `is_active` (active/suspended), `deleted_at` (deleted).

### DA-5 — Optimistic locking su appointments

```php
#[ORM\Version, ORM\Column(type: 'integer')]
private int $version;
```

Doctrine gestisce automaticamente `version++` e lancia `OptimisticLockException` su conflitto.

### DA-6 — Exclusion constraint su appointments

```sql
-- 08_calendar.sql
CONSTRAINT appointments_no_overlap
EXCLUDE USING gist (
    staff_member_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL)
```

Richiede estensione `btree_gist` (abilitata in `01_extensions.sql`).

### DA-7 — Unique partial index su loyalty_transactions

Previene doppio accredito per lo stesso appuntamento:

```sql
CREATE UNIQUE INDEX loyalty_transactions_no_double_earn
  ON loyalty_transactions(appointment_id)
  WHERE type = 'earn' AND appointment_id IS NOT NULL;
```

### DA-8 — Strategia migrazioni

Lo schema viene creato da Docker init scripts (ordine FK garantito). Per modifiche successive si usa `DoctrineMigrationsBundle`:

```bash
php bin/console doctrine:migrations:diff   # genera migration dal diff
php bin/console doctrine:migrations:migrate # applica
```

### DA-9 — Immutabilità loyalty_configs

```php
class LoyaltyConfig {
    private ?\DateTimeImmutable $endedAt = null; // null = config attiva
    // partial unique index garantisce un solo record attivo per tenant
}
```

---

## Schema per area funzionale

### Area 1 — Business

| Tabella | Entità Doctrine | Note |
|---------|----------------|------|
| `subscription_plans` | `SubscriptionPlan` | Piani globali, no tenant_id |
| `tenants` | `Tenant` | Root del tenant; no tenant_id (è il tenant) |
| `locations` | `Location` | N location per tenant |
| `tenant_subscriptions` | (da creare) | Piano attivo per tenant |

### Area 2 — Utenti e Staff

| Tabella | Entità Doctrine | Note |
|---------|----------------|------|
| `users` | `User` | Sostituisce `auth.users` Supabase; JWT issuer |
| `profiles` | `Profile` | 1:1 con User (stesso UUID PK) |
| `staff_members` | `StaffMember` | Link User → Tenant; soft delete a 3 stati |
| `staff_locations` | (da creare) | N:M StaffMember ↔ Location |

### Area 3 — Catalogo

| Tabella | Entità Doctrine | Note |
|---------|----------------|------|
| `service_categories` | (da creare) | Categorie servizi per tenant |
| `services` | `Service` | Servizi offerti per tenant |
| `staff_services` | (da creare) | Quali staff erogano quali servizi |
| `products` | `Product` | Prodotti per tenant |
| `product_inventory` | (da creare) | Giacenza per prodotto+location |
| `client_product_wishlist` | (da creare) | Wishlist cliente |

### Area 4 — Calendar (PILOTA — entità implementate)

| Tabella | Entità Doctrine | Note |
|---------|----------------|------|
| `working_hours` | `WorkingHour` | Orari ricorrenti staff |
| `working_hour_overrides` | `WorkingHourOverride` | Eccezioni (ferie, eventi) |
| `appointments` | `Appointment` | Con exclusion constraint + version OL |
| `appointment_services` | `AppointmentService` | `price_at_booking` snapshot |
| `appointment_products` | `AppointmentProduct` | `price_at_sale` snapshot |
| `payments` | `Payment` | Con campi refund strutturati |

### Area 5 — CRM (PILOTA — entità implementate)

| Tabella | Entità Doctrine | Note |
|---------|----------------|------|
| `clients` | `Client` | UNIQUE(tenant_id, phone); soft delete; referral self-ref |
| `client_notes` | `ClientNote` | Note private staff; tenant-filtered |
| `client_consents` | (da creare) | GDPR granulare |
| `client_analytics` | (da creare) | Derivato, calcolabile via query |

### Area 6 — Loyalty

| Tabella | Entità Doctrine | Da implementare |
|---------|----------------|----------------|
| `loyalty_configs` | da creare | Partial unique idx per config attiva |
| `rewards` | da creare | |
| `client_loyalty` | da creare | |
| `loyalty_transactions` | da creare | Partial unique idx no-double-earn |
| `reward_redemptions` | da creare | |
| `tier_configs` | da creare | |
| `badges` | da creare | |
| `client_badges` | da creare | |

---

## DDL eseguibile

Il DDL pulito (senza `auth.uid()`, senza RLS policy, senza `pg_cron`) si trova in:

```
symfony-app/docker/postgres/init/
├── 01_extensions.sql     pgcrypto, btree_gist
├── 02_helpers.sql        trigger set_updated_at()
├── 03_auth.sql           users, profiles
├── 04_business.sql       subscription_plans, tenants, locations, tenant_subscriptions
├── 05_staff.sql          staff_members, staff_locations
├── 06_catalog.sql        service_categories → client_product_wishlist
├── 07_crm.sql            clients → client_analytics
├── 08_calendar.sql       working_hours → payments
└── 09_loyalty.sql        loyalty_configs → client_badges
```

RLS archiviate in `supabase/migrations-rls-legacy.sql` (solo riferimento storico).

---

## Confronto RLS → TenantFilter

| Aspetto | RLS Supabase | TenantFilter Symfony |
|---------|-------------|---------------------|
| Dove vive | PostgreSQL (database) | PHP applicativo |
| Attivazione | Automatica per ogni connessione | `TenantFilterSubscriber` post-JWT |
| Fail-closed | Sì (nessuna policy = accesso negato) | Sì (`1 = 0` se no tenant_id) |
| Testabilità | pgTAP o supabase local | PHPUnit (12/12 ✅) |
| Debugging | `EXPLAIN ANALYZE` + logging SQL | Symfony Profiler + query log |
| Performance | Nel query planner PostgreSQL | In PHP pre-query generation |
| Entità escluse | Tabelle senza policy | EXCLUDED_ENTITIES const |

---

## Checklist prima del go-live

- [ ] `doctrine:schema:validate` — mapping OK
- [ ] Test isolamento tenant: tenant A non vede dati tenant B
- [ ] Test fail-closed: request senza JWT → 0 righe
- [ ] Exclusion constraint test: appuntamenti sovrapposti bloccati a DB
- [ ] Optimistic locking test: doppia modifica appointment → 409
- [ ] `pg_dump` backup e restore testato
- [ ] VPS EU: data residency confermata (Hetzner Frankfurt)
- [ ] Keypair JWT generato e ruotabile
- [ ] Rate limiting su `/api/auth` e `/api/otp`

---

## Regola d'oro — Tenant consistency su FK cross-tabella

Ogni tabella operativa con `tenant_id` deve verificare che tutte le FK puntino a record dello stesso tenant. Doctrine non può farlo automaticamente con i Doctrine Filter — serve validazione a livello di service layer o trigger PostgreSQL di fallback.

Pattern consigliato:

```php
// In AppointmentService (service layer)
if (!$client->getTenant()->getId()->equals($staffMember->getTenant()->getId())) {
    throw new TenantConsistencyException('...');
}
```

---

## Versionamento schema (v1 → v2 → v3)

| Versione | Tabelle | Feature |
|---------|---------|---------|
| v1 (MVP) | 39 | Booking, CRM, Loyalty, Catalogo, Pagamenti |
| v2 (Growth) | +9 = 48 | Marketing automation, WhatsApp inbox, Referral |
| v3 (AI) | +3 = 51 | Predizione no-show, smart suggestions, receptionist AI |

Regola: v2/v3 aggiungono tabelle. Nessuna tabella v1 viene modificata strutturalmente.
