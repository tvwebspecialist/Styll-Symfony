# Database Schema MVP — Styll (Symfony + PostgreSQL 16)

> **Versione:** MVP 1.0 — stack Symfony (luglio 2026)  
> **Scope:** schema eseguibile per il prototipo funzionante della tesi  
> **Stack:** PostgreSQL 16 self-hosted + Doctrine ORM 3 + API Platform v4  
> _Versione Supabase archiviata in `docs/_archivio-supabase/database-mvp-supabase.md`_

---

## 1. Perché questo file esiste

Lo schema di produzione (39 tabelle v1) è stato progettato come architettura enterprise-grade. Per il prototipo di tesi, questo documento definisce lo **schema minimo sufficiente** a:

1. Far funzionare tutti i flussi principali (booking, CRM, loyalty, inventario)
2. Popolare una demo con dati realistici per le 4 personas (Marco, Sara, Luca, Roberto)
3. Essere implementato in ~2 settimane di sprint invece di 6-8
4. Presentare alla commissione una demo cliccabile completa

**Principio guida:** tutto ciò che è nel prototipo è nell'MVP; tutto ciò che è infrastruttura di produzione resta come "progettato, non implementato".

---

## 2. Cosa è dentro e cosa è fuori

### 2.1 — Le 24 tabelle dell'MVP

| Area | Tabelle MVP |
|------|-------------|
| 1. Business | `tenants`, `locations`, `subscription_plans`, `tenant_subscriptions` |
| 2. Utenti e Staff | `profiles`, `staff_members`, `staff_locations` |
| 3. Catalogo | `services`, `staff_services`, `products`, `product_inventory` |
| 4. Appuntamenti | `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products`, `payments` |
| 5. CRM | `clients`, `client_notes` |
| 6. Loyalty | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions` |

**Totale: 24 tabelle.** Corrispondono alle 15 entità Doctrine già implementate + loyalty (da aggiungere).

### 2.2 — Cosa è escluso dall'MVP e perché

| Tabella/Area | Perché non è nell'MVP | Come gestita nel prototipo |
|--------------|----------------------|---------------------------|
| `client_consents` | GDPR in tesi citato come architettura | Campo `marketing_consent` boolean su `clients` |
| `client_analytics` | Dati derivati | VIEW SQL o query dirette |
| `message_templates`, `messages_log` | Messaggistica reale richiede provider a pagamento | Mocked nell'UI |
| `review_requests` | Feature periferica | Citata in roadmap |
| `admin_users`, `audit_log` | Dashboard admin è architettura, non implementata | Citata concettualmente |
| AREA 11 intera (outbox, idempotency, webhook inbox) | Pattern enterprise, non necessari nel prototipo | Chiamate dirette nel codice |

---

## 3. Regole architetturali mantenute dall'MVP

1. **Multi-tenancy nativa.** Ogni tabella operativa ha `tenant_id`. Isolamento via `TenantFilter` Doctrine (sostituisce RLS).
2. **UUID come primary key.** `symfony/uid` → `Uuid::v4()`, type `uuid` in PostgreSQL.
3. **Prezzi snapshot.** `appointment_services.price_at_booking` e `appointment_products.price_at_sale`.
4. **Soft delete** su `clients`, `appointments`, `staff_members` con `deleted_at TIMESTAMPTZ`.
5. **CRM come fonte di verità per loyalty.** `clients.user_id` è nullable (Roberto esiste nel CRM senza app).
6. **Cliente cross-tenant.** Un `users` (Luca) può avere N record `clients` (uno per barbiere).
7. **Exclusion constraint su `appointments`** per impedire sovrapposizioni a livello database (`btree_gist`).
8. **Unique partial index su `loyalty_transactions`** per evitare doppio accredito.
9. **`loyalty_configs` immutabile** con `started_at`/`ended_at` per storico versioni.
10. **`working_hours` + `working_hour_overrides`** separate per orari ricorrenti + eccezioni.

---

## 4. Dove si trova il DDL

Il DDL eseguibile (equivalente all'SQL Supabase) si trova in `symfony-app/docker/postgres/init/`:

| File | Tabelle |
|------|---------|
| `01_extensions.sql` | pgcrypto, btree_gist |
| `02_helpers.sql` | trigger `set_updated_at()` |
| `03_auth.sql` | `users`, `profiles` |
| `04_business.sql` | `subscription_plans`, `tenants`, `locations`, `tenant_subscriptions` |
| `05_staff.sql` | `staff_members`, `staff_locations` |
| `06_catalog.sql` | `service_categories`, `services`, `staff_services`, `products`, `product_inventory`, `client_product_wishlist` |
| `07_crm.sql` | `clients`, `client_notes`, `client_consents`, `client_analytics` |
| `08_calendar.sql` | `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products`, `payments` |
| `09_loyalty.sql` | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions`, `tier_configs`, `badges`, `client_badges` |

Eseguiti automaticamente da Docker al primo avvio del container postgres.

---

## 5. Entità Doctrine implementate

### Area 4 — Calendar (pilota)

```php
// Appointment.php — principali campi
class Appointment {
    private Uuid $id;
    private Tenant $tenant;
    private Client $client;
    private StaffMember $staffMember;
    private Location $location;
    private \DateTimeImmutable $startsAt;
    private \DateTimeImmutable $endsAt;
    private string $status; // 'pending'|'confirmed'|'completed'|'cancelled'|'no_show'
    private int $version;   // ottimistic locking
    private ?\DateTimeImmutable $deletedAt;
}
```

### Area 5 — CRM (pilota)

```php
// Client.php — principali campi
class Client {
    private Uuid $id;
    private Tenant $tenant;
    private ?User $user;        // nullable: Roberto esiste senza account
    private string $fullName;
    private string $phone;      // UNIQUE(tenant_id, phone)
    private ?\DateTimeImmutable $deletedAt;
    private ?self $referredBy;  // self-reference
    private bool $churnOptedOut = false;
}
```

### Entità da aggiungere per completare il perimetro loyalty (v1)

```
LoyaltyConfig, ClientLoyalty, LoyaltyTransaction, Reward, RewardRedemption, TierConfig, Badge, ClientBadge
```

---

## 6. Multi-tenant isolation (sostituisce RLS)

```php
// TenantFilter — aggiunge WHERE tenant_id = ? a ogni SELECT
class TenantFilter extends SQLFilter {
    public function addFilterConstraint(ClassMetadata $meta, string $alias): string {
        // Entità senza tenant_id (User, Profile, Tenant, SubscriptionPlan) → ''
        // Nessun tenant_id nel JWT → '1 = 0' (fail-closed)
        // Standard → 'alias.tenant_id = uuid'
    }
}
```

Verificato: 12/12 test PHPUnit passano (vedi `MIGRATION-LOG.md`, FASE 2).

---

## 7. Come avviare il database MVP

```bash
# Prima volta — crea tabelle dagli init scripts
docker compose up -d postgres

# Verifica schema Doctrine vs DB
cd symfony-app && php bin/console doctrine:schema:validate

# Genera keypair JWT
php bin/console lexik:jwt:generate-keypair

# Avvia tutti i servizi
docker compose up -d
```

---

## 8. Seed data per la demo

Il seed con le 4 personas (Marco barber, Sara staff, Luca cliente con PWA, Roberto cliente walk-in) va creato come `symfony-app/src/DataFixtures/AppFixtures.php` con `doctrine/data-fixtures`.

**DECISIONE DA CONFERMARE:** usare `DoctrineMigrationsBundle` per le fixture o il bundle `hautelook/alice-bundle` per fixture leggibili (formato YAML).

---

## 9. Differenze principali rispetto alla versione Supabase

| Aspetto | Supabase (archiviato) | Symfony + PostgreSQL |
|---------|----------------------|---------------------|
| Multi-tenancy | RLS `auth.uid()` + `get_my_tenant_id()` | Doctrine TenantFilter + TenantContext |
| Autenticazione | Supabase Auth (GoTrue) | `lexik/jwt-authentication-bundle` |
| UUID generazione | `gen_random_uuid()` (PostgreSQL) | `Uuid::v4()` (PHP, symfony/uid) |
| Schema versioning | Supabase migrations CLI | Doctrine MigrationsBundle |
| Realtime | Supabase Realtime WebSocket | Mercure SSE |
| OTP clienti | Supabase Auth OTP | **DECISIONE DA CONFERMARE** (custom Redis) |
| Query API | PostgREST auto-generated | API Platform v4 (Doctrine-driven) |
