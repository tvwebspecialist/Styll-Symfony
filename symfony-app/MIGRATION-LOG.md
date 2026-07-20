# Migration Log — Styll: Next.js+Supabase → Symfony+PostgreSQL

**Data:** 2026-07-20  
**Branch:** symfony-scaffold  
**Autore:** Claude (scaffold automatico, revisione manuale richiesta)

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
