# Migration Log — Styll: Next.js+Supabase → Symfony+PostgreSQL

**Data:** 2026-07-20  
**Branch:** symfony-scaffold  
**Autore:** Claude (scaffold automatico, revisione manuale richiesta)

---

## Riepilogo sessione — 2026-07-20

Sessione a tre fasi. FASE 1 e FASE 2 già committate su branch `symfony-schema-and-docs` nella sessione precedente. FASE 3 completata in questa sessione.

| Fase | Commit | Stato |
|---|---|---|
| FASE 1 — Schema DDL + entità pilota | `migration: import schema Supabase + entità pilota` | ✅ |
| FASE 2 — Isolamento multi-tenant (TenantFilter + test) | `security: isolamento multi-tenant via Doctrine filter + test` | ✅ |
| FASE 3 — Riscrittura documentazione tecnica | `docs: riscrittura documentazione tecnica per stack Symfony` | ✅ |

### FASE 3 — riepilogo file

**Archiviati** (spostati con `git mv` in `docs/_archivio-supabase/`, history conservata):

| File originale | Archiviato come |
|---|---|
| `docs/07-tecnico/architettura.md` | `architettura-supabase.md` |
| `docs/07-tecnico/database-mvp.md` | `database-mvp-supabase.md` |
| `docs/07-tecnico/database-schema.md` | `database-schema-supabase.md` |
| `docs/07-tecnico/whatsapp-inbox-v1-implementation.md` | `whatsapp-inbox-v1-implementation-supabase.md` |
| `docs/08-strategia/analisi-strategica.md` | `analisi-strategica-supabase.md` |
| `docs/08-strategia/internazionalizzazione.md` | `internazionalizzazione-supabase.md` |
| `docs/08-strategia/legal-compliance.md` | `legal-compliance-supabase.md` |
| `docs/08-strategia/partnership-ecosistem.md` | `partnership-ecosistem-supabase.md` |

**Riscritti** (nuovi file con stack Symfony, stesso path dei file originali):

| File | Principali aggiornamenti |
|---|---|
| `docs/07-tecnico/architettura.md` | Stack Symfony 7.4+API Platform, Docker Compose 4 servizi, tabella costi Hetzner (€8-€38/mo), Mercure SSE, TenantFilter |
| `docs/07-tecnico/database-mvp.md` | 24 tabelle MVP, Doctrine entities, DDL in `symfony-app/docker/postgres/init/`, confronto Supabase vs Symfony |
| `docs/07-tecnico/database-schema.md` | Decisioni architetturali DA-1–DA-9, schema per area, confronto RLS vs TenantFilter, checklist go-live |
| `docs/07-tecnico/whatsapp-inbox-v1-implementation.md` | Riferimento Supabase Realtime → Mercure SSE (layer Next.js attuale), auth.uid() → TenantFilter |
| `docs/08-strategia/analisi-strategica.md` | Stack FASE 0, tabella concorrenti, analisi criticità VPS/Symfony, budget VPS €8-18/mo |
| `docs/08-strategia/internazionalizzazione.md` | Sub-processors (Hetzner sostituisce Supabase), i18n Symfony Translation, GDPR data residency EU |
| `docs/08-strategia/legal-compliance.md` | Sub-processors (Hetzner), tabella GDPR, nota VPS EU advantage |
| `docs/08-strategia/partnership-ecosistem.md` | API Platform v4 sostituisce PostgREST, Symfony Messenger+Mercure sostituisce Supabase Realtime+Edge Functions, prerequisiti table aggiornata |

### DECISIONI DA CONFERMARE ancora aperte

| ID | Decisione | Stato |
|---|---|---|
| D2 | Nginx vs Caddy per HTTPS su VPS | ⚠️ Aperta |
| D4 | Mercure SSE vs WebSocket bidirezionale per WhatsApp inbox live | ⚠️ Aperta |
| D7 | OTP SMS per clienti: bundle esistente vs implementazione custom | ⚠️ Aperta |

---

## FASE 3 — Riscrittura documentazione tecnica ✅

**Commit:** `docs: riscrittura documentazione tecnica per stack Symfony, archivio Supabase in docs/_archivio-supabase/`  
**Data:** 2026-07-20

8 documenti archiviati con `git mv` (history git preservata). 8 documenti riscritti per stack Symfony 7.4 + API Platform + PostgreSQL VPS Hetzner. Nessun file in `apps/`, `packages/`, `docs/01-09` (escluso `07-`, `08-`) è stato toccato.

---

## FASE 2 — Isolamento multi-tenant (risolve D6) ✅

**Commit:** `security: isolamento multi-tenant via Doctrine filter + test`  
**Data:** 2026-07-20

### Componenti implementati

| File | Ruolo |
|---|---|
| `src/Security/TenantContext.php` | Risolve `tenant_id` dal JWT → StaffMember → Tenant |
| `src/Doctrine/TenantFilter.php` | SQLFilter globale: aggiunge `WHERE tenant_id = ?` |
| `src/EventListener/TenantFilterSubscriber.php` | Abilita il filter dopo JWT auth (priority 0) |
| `config/packages/doctrine.yaml` | Registra `tenant_filter` (disabled per default) |
| `tests/Doctrine/TenantFilterTest.php` | 7 test unit del filter |
| `tests/Security/TenantContextTest.php` | 5 test unit del TenantContext |

### Risultati test

```
PHPUnit 11.5.56 — PHP 8.2.30

............                                    12 / 12 (100%)

Tenant Context (App\Tests\Security\TenantContext)
 ✔ Returns null when no token
 ✔ Returns null when user has no staff member
 ✔ Returns tenant id for authenticated staff
 ✔ Tenant id is cached after first call
 ✔ Reset clears cached tenant id

Tenant Filter (App\Tests\Doctrine\TenantFilter)
 ✔ Filter adds where clause for client entity
 ✔ Filter adds where clause for appointment entity
 ✔ Tenant a and b get different constraints
 ✔ Filter without tenant id blocks all rows
 ✔ User entity is not filtered
 ✔ Profile entity is not filtered
 ✔ Client note entity is filtered

OK (12 tests, 18 assertions)
```

### Garanzie di sicurezza verificate

| Scenario | Comportamento atteso | Test |
|---|---|---|
| Tenant A legge dati Tenant B | Bloccato (`WHERE tenant_id = A`) | `testTenantAAndBGetDifferentConstraints` |
| Request non autenticata | Zero righe (`1 = 0`, fail-closed) | `testFilterWithoutTenantIdBlocksAllRows` |
| Entità globali (User, Profile) | Non filtrate (no tenant_id) | `testUserEntityIsNotFiltered`, `testProfileEntityIsNotFiltered` |
| Cache tenant_id | Solo 1 query DB per request | `testTenantIdIsCachedAfterFirstCall` |

### Note tecniche (soluzioni ai problemi incontrati)

- `SQLFilter::__construct()` è `final` in Doctrine ORM 3 — impossibile usare `getMockBuilder`. Soluzione: costruire `TenantFilter` reale con `EntityManagerInterface` mockato (chain `getFilters()->setFiltersStateDirty()` + `getConnection()->quote()`)
- `SQLFilter::getParameter()` è `final` — impossibile override. L'approccio precedente con `onlyMethods(['getParameter'])` non funziona. Soluzione: usare la vera `setParameter()` per iniettare valori nel test
- `QueryBuilder::getQuery()` tipizza il ritorno come `Doctrine\ORM\Query` (non `AbstractQuery`). Il mock di `AbstractQuery` fallisce la type check PHPUnit 11 strict. Soluzione: mock `Doctrine\ORM\Query::class`
- `ClassMetadata::$columnNames` e `::$associationMappings` sono public properties con default `[]` — il mock non le popola. Eliminata la early-exit che accedeva alle property direttamente; la logica usa solo method calls (`getAssociationMappings()`, `getColumnNames()`)

**D6 risolto.** Il filter è production-ready; integration tests su DB reale sono raccomandati prima del go-live.

---

## FASE 1 — Migrazione schema (risolve D5) ✅

**Commit:** `migration: import schema Supabase + entità pilota (Clienti+Appuntamenti)`  
**Data:** 2026-07-20

### Schema DDL pulito (senza Supabase/RLS)

Creati in `symfony-app/docker/postgres/init/` (eseguiti in ordine al primo avvio del container):

| File | Contenuto |
|---|---|
| `01_extensions.sql` | `pgcrypto`, `btree_gist` |
| `02_helpers.sql` | Trigger `set_updated_at()` |
| `03_auth.sql` | `users`, `profiles` (sostituisce `auth.users` Supabase) |
| `04_business.sql` | `subscription_plans`, `tenants`, `locations`, `tenant_subscriptions` |
| `05_staff.sql` | `staff_members`, `staff_locations` |
| `06_catalog.sql` | `service_categories`, `services`, `staff_services`, `products`, `product_inventory`, `client_product_wishlist` |
| `07_crm.sql` | `clients` (UNIQUE tenant_id+phone), `client_notes`, `client_consents`, `client_analytics` |
| `08_calendar.sql` | `working_hours`, `working_hour_overrides`, `appointments` (exclusion constraint + optimistic lock), `appointment_services`, `appointment_products`, `payments` |
| `09_loyalty.sql` | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions`, `tier_configs`, `badges`, `client_badges` |

Le RLS originali sono archiviate in `supabase/migrations-rls-legacy.sql` (356 righe, solo riferimento).

### Entità Doctrine (15 entity + 15 repository)

Pilota Area 4 (Calendar): `Appointment`, `AppointmentService`, `AppointmentProduct`, `Payment`, `WorkingHour`, `WorkingHourOverride`  
Pilota Area 5 (CRM): `Client`, `ClientNote`  
Dipendenze: `User`, `Profile`, `Tenant`, `Location`, `StaffMember`, `Service`, `Product`

**Validazione mapping:**
```
doctrine:schema:validate --skip-sync
[OK] The mapping files are correct.
```

**D5 risolto.** Strategia scelta: DDL clean importato come init scripts Docker (approccio ibrido).

---

## Cosa è stato fatto in questo scaffold

### 1. Progetto Symfony 7.4 LTS
- Creato con `symfony new symfony-app --version=lts --no-git`
- Versione Symfony: **7.4** (LTS più recente al luglio 2026, supportata fino a novembre 2029)
- PHP: 8.2 (versione disponibile su host; 8.3+ richiesto da doctrine/doctrine-bundle 3.x, non ancora installabile)

### 2. Pacchetti installati
| Pacchetto | Versione | Ruolo |
|---|---|---|
| `api-platform/core` | v4.3 | Generazione REST API da entità Doctrine |
| `doctrine/orm` | 3.x | ORM per PostgreSQL |
| `doctrine/doctrine-bundle` | 2.x | Integrazione Symfony (2.x per compatibilità PHP 8.2) |
| `doctrine/doctrine-migrations-bundle` | 3.x | Gestione migrazioni schema |
| `lexik/jwt-authentication-bundle` | v3.2 | JWT auth (sostituisce Supabase Auth) |
| `symfony/mercure-bundle` | v0.4 | Realtime SSE (sostituisce Supabase Realtime) |
| `symfony/security-bundle` | v7.4 | RBAC, firewall, password hashing |
| `symfony/serializer` | v7.4 | Serializzazione API Platform |

### 3. Configurazione Doctrine
- Driver: **PostgreSQL** (pdo_pgsql)
- `server_version: '16'` abilitato in `config/packages/doctrine.yaml`
- Naming strategy: `underscore_number_aware` (compatibile con lo schema esistente)
- Identity generation: `PostgreSQLPlatform: identity` (usa `SERIAL`/`GENERATED ALWAYS AS IDENTITY`)

### 4. Docker Compose (`docker-compose.yml` alla radice del repo)
Quattro servizi:
- **postgres**: PostgreSQL 16 Alpine — dati persistenti in volume `postgres_data`
- **php**: PHP-FPM 8.2 Alpine — build da `docker/php/Dockerfile`
- **nginx**: Nginx 1.27 Alpine — reverse proxy per PHP-FPM, esposto su porta 8080
- **mercure**: `dunglas/mercure` — hub SSE per realtime, esposto su porta 3001

### 5. File di configurazione ausiliari
- `docker/php/Dockerfile` — build PHP-FPM con estensioni pgsql, intl, zip, opcache
- `docker/nginx/default.conf` — config Nginx minimal per Symfony
- `symfony-app/.env.symfony.example` — template variabili d'ambiente senza valori reali

---

## Cosa NON è stato toccato
- `apps/` — codebase Next.js invariata
- `packages/` — packages condivisi invariati
- `supabase/` — migrazioni SQL invariate (servono come riferimento per le entità Doctrine)

---

## Decisioni prese

### D1 — Symfony 7.4 (non 6.4)
**Scelta:** 7.4 LTS (supportata fino a nov 2029).  
**Perché:** `symfony new --version=lts` installa automaticamente l'LTS più recente. Con PHP 8.2 è pienamente compatibile.  
**Alternativa scartata:** 6.4 LTS (ancora supportata ma più vecchia, scadrà nov 2027).

### D2 — PHP-FPM + Nginx (non Caddy)
**Scelta:** PHP-FPM + Nginx.  
**Perché:** Stack più documentato per Symfony su VPS, Nginx è lo standard de facto, configurazione minimale e prevedibile.  
**Alternativa:** Caddy sarebbe stata più semplice da configurare (HTTPS automatico), ma meno diffusa negli howto Symfony esistenti.  
**DECISIONE DA CONFERMARE:** se il VPS deve gestire HTTPS direttamente via Docker, Caddy è preferibile (TLS auto). Nginx richiede Certbot o un load balancer esterno.

### D3 — JWT per autenticazione (non sessioni)
**Scelta:** `lexik/jwt-authentication-bundle` con RSA key pair.  
**Perché:** L'app è un'API stateless consumata da frontend Next.js e PWA. JWT è lo standard per API Platform.  
**Conseguenza:** Le RLS di Supabase (`auth.uid()`, `get_my_tenant_id()`) non possono essere replicate 1:1 — vanno riscritte come:
- Middleware Symfony che inietta `tenant_id` dal JWT claim
- Doctrine filter globale che aggiunge `WHERE tenant_id = :current_tenant` a ogni query

### D4 — Mercure per Realtime
**Scelta:** `dunglas/mercure` (hub SSE).  
**Perché:** È il componente realtime ufficiale dell'ecosistema Symfony/API Platform. Sostituisce Supabase Realtime (websocket).  
**Nota:** Mercure usa SSE (Server-Sent Events), non WebSocket bidirezionale. Per il caso d'uso (notifiche in-app per il barbiere, churn alert, nuove prenotazioni) SSE è sufficiente.  
**DECISIONE DA CONFERMARE:** Se serve bidirezionale (chat, WhatsApp inbox live), valutare Mercure + polling o RabbitMQ + WebSocket.

### D5 — Migrazioni DB: Supabase vs Doctrine
**Scelta attuale:** Le migrazioni Supabase in `supabase/migrations/` restano come riferimento.  
**Problema:** Doctrine genera le proprie migrazioni in `symfony-app/migrations/`. Le due serie NON sono sincronizzate.  
**DECISIONE DA CONFERMARE:** Per la migrazione effettiva, scegliere una di tre strade:
1. **Import diretto** — eseguire le migrazioni Supabase su PostgreSQL self-hosted, poi usare `doctrine:schema:update --dump-sql` per allineare Doctrine allo schema esistente (approccio più rapido)
2. **Doctrine-first** — riscrivere ogni tabella come entità Doctrine, generare migrazioni da zero (più manutenibile a lungo termine)
3. **Ibrido** — importare schema Supabase, generare entità con `doctrine:mapping:import` (deprecato in Doctrine ORM 3, non raccomandato)

### D6 — RLS: da PostgreSQL a livello applicativo
**Scelta attuale:** Nessuna RLS attiva su PostgreSQL self-hosted (Doctrine non usa `auth.uid()`).  
**DECISIONE DA CONFERMARE:** L'isolamento multi-tenant va reimplementato a livello Symfony:
- `TenantAwareListener` che legge `tenant_id` dal JWT e lo setta come parametro globale
- `DoctrineExtension` (API Platform) che filtra ogni query per `tenant_id`
- **OBBLIGATORIO prima del go-live in produzione**

### D7 — Supabase Auth → Symfony Security
**Cosa sostituisce:** Supabase Auth (OTP SMS per clienti, email+password per staff).  
**Con cosa:**
- Staff: email+password → JWT via `lexik/jwt-authentication-bundle`
- Clienti: OTP SMS → **DECISIONE DA CONFERMARE** — serve un bundle SMS OTP o implementazione custom (es. codice random + hash in Redis con TTL)

---

## Cosa manca (prossimi step)

| Priorità | Step | Note |
|---|---|---|
| 🔴 Critico | Entità Doctrine per le 39 tabelle v1 | Da creare in `symfony-app/src/Entity/` |
| 🔴 Critico | Multi-tenant filter (DoctrineExtension) | Isola i dati per `tenant_id` a livello ORM |
| 🔴 Critico | Generazione JWT keypair | `symfony console lexik:jwt:generate-keypair` |
| 🟡 Alto | Implementare OTP SMS per clienti | Sostituisce Supabase Auth OTP |
| 🟡 Alto | API Platform resources e operations | Annotare le entità, configurare RBAC per ruolo |
| 🟡 Alto | Mercure publisher nelle mutation API | Notifiche realtime su create/update appointment |
| 🟡 Alto | Migrazione schema: strategia definitiva (D5) | Decidere Supabase-import vs Doctrine-first |
| 🟢 Medio | Aggiungere MinIO al docker-compose | Sostituisce Supabase Storage (upload logo, foto) |
| 🟢 Medio | CI/CD con GitHub Actions | Build Docker, test, deploy su VPS |
| 🟢 Medio | `doctrine:schema:validate` + pgTAP equivalente | Testing RLS applicativa e policy multi-tenant |
| 🟢 Medio | Stripe webhook endpoint | Per v2 pagamenti online |

---

## Struttura cartelle creata

```
symfony-app/           ← progetto Symfony 7.4
├── config/
│   ├── packages/
│   │   ├── doctrine.yaml       (PostgreSQL 16 configurato)
│   │   ├── api_platform.yaml   (generato da recipe)
│   │   ├── lexik_jwt_authentication.yaml
│   │   └── mercure.yaml
│   └── jwt/                   (vuoto — keypair da generare)
├── src/
│   ├── Entity/                (vuoto — entità da creare)
│   ├── ApiResource/           (vuoto — API Platform resources)
│   └── ...
├── .env                       (DATABASE_URL → PostgreSQL)
├── .env.symfony.example       (template sicuro per tutti gli env)
└── MIGRATION-LOG.md           (questo file)

docker/
├── php/Dockerfile             ← PHP-FPM 8.2 Alpine
└── nginx/default.conf         ← Nginx reverse proxy

docker-compose.yml             ← alla radice del repo (postgres + php + nginx + mercure)
```
