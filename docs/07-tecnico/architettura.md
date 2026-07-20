> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri  
> **Stack:** Symfony 7.4 + API Platform + PostgreSQL 16 self-hosted su VPS  
> _Documento aggiornato: luglio 2026. Versione Supabase archiviata in `docs/_archivio-supabase/architettura-supabase.md`_

---

# Tecnologia e Stack — Styll

## Stack Tecnologico

| Layer | Tecnologia | Ruolo |
|-------|-----------|-------|
| **Frontend** | Next.js 14+ con App Router, TypeScript | Routing multi-tenant, SSR/SSG, PWA |
| **Backend / API** | Symfony 7.4 LTS + API Platform v4 | REST API auto-generata da entità Doctrine |
| **Database** | PostgreSQL 16 (self-hosted) | Schema relazionale, 39 tabelle v1 |
| **ORM** | Doctrine ORM 3 | Mapping entità, migrazioni, query builder |
| **Autenticazione** | `lexik/jwt-authentication-bundle` v3.2 | JWT stateless per staff; OTP SMS per clienti |
| **Realtime** | Mercure (SSE) via `symfony/mercure-bundle` | Aggiornamenti calendario, notifiche in-app |
| **Hosting** | VPS Hetzner o Contabo (EU) | Docker Compose, 4-8 GB RAM |
| **Containerizzazione** | Docker Compose | postgres:16, php:8.2-fpm, nginx:1.27, mercure |
| **App cliente** | PWA (Progressive Web App) | Installabile da browser, no App Store |

---

## Architettura Multi-Tenant

Un'unica piattaforma centrale che ospita più barbieri contemporaneamente, mantenendo separati dati, impostazioni e identità visiva di ciascuno.

**Strategia di isolamento:** shared database + shared schema. L'isolamento è garantito a livello applicativo tramite:
- `TenantContext` — risolve `tenant_id` dal JWT → `StaffMember` → `Tenant` (con cache per-request)
- `TenantFilter` — Doctrine SQLFilter globale che aggiunge `WHERE tenant_id = ?` a ogni SELECT
- `TenantFilterSubscriber` — abilita il filter dopo la validazione JWT (priority 0)

Sostituisce le RLS policy PostgreSQL di Supabase (`auth.uid()`, `get_my_tenant_id()`), archiviate in `supabase/migrations-rls-legacy.sql`.

---

## Architettura branding per tenant

```php
// Config tenant in Doctrine Entity
class Tenant {
    private Uuid $id;
    private string $businessName;        // "Marco's Barber"
    private ?string $primaryColor;       // "#1A1A2E"
    private ?string $secondaryColor;     // "#E94560"
    private ?string $logoUrl;            // https://cdn.styll.app/tenants/marco/logo.png
    private ?string $customDomain;       // "prenotamarco.it" (v2)
    private string $subdomain;           // "marco.styll.app" (v1)
}
```

**v1 — Subdomain + CSS Variables:**
- Ogni barbiere ha: `nomeattivita.styll.app`
- Config tenant caricato via API Platform → CSS Variables nel frontend → colori, font, logo cambiano runtime
- Il cliente vede SOLO il brand del barbiere

**v2 — Custom domain:**
- Il barbiere usa il suo dominio: `prenotamarco.it`
- SSL via Let's Encrypt (Certbot o Caddy integrato)

---

## Infrastruttura Docker Compose

```yaml
# docker-compose.yml (alla radice del repo)
services:
  postgres:   # PostgreSQL 16 Alpine — dati su volume persistente
  php:        # PHP-FPM 8.2 Alpine — symfony-app/
  nginx:      # Nginx 1.27 Alpine — porta 8080
  mercure:    # dunglas/mercure — SSE realtime, porta 3001
```

Init scripts in `symfony-app/docker/postgres/init/`:
- `01_extensions.sql` — pgcrypto, btree_gist
- `02_helpers.sql` — trigger set_updated_at()
- `03_auth.sql` → `09_loyalty.sql` — schema completo in ordine FK

---

## Autenticazione

| Attore | Meccanismo | Note |
|--------|-----------|------|
| **Staff** (Marco, Sara) | Email + password → JWT RSA keypair | `lexik/jwt-authentication-bundle`, stateless |
| **Clienti** (Luca, Roberto) | OTP SMS → JWT | Codice random + Redis TTL; **DECISIONE DA CONFERMARE** |
| **Admin** | Separato — ruolo `ROLE_ADMIN` su User | No tenant filter |

Sostituisce Supabase Auth (GoTrue). I JWT sono validati dal firewall `api` in `security.yaml`.

---

## Realtime (SSE via Mercure)

Mercure sostituisce Supabase Realtime:

| Use case | Supabase | Symfony/Mercure |
|----------|---------|----------------|
| Aggiornamento calendario | Realtime WebSocket su `appointments` | Mercure SSE: `POST /.well-known/mercure` al save Appointment |
| Notifica nuovo appuntamento | Realtime subscription | SSE topic `appointment/{tenantId}` |
| Churn alert | Edge Function → push | Symfony Command/Messenger → Mercure publish |

Mercure usa SSE (Server-Sent Events), non WebSocket bidirezionale. Per il caso d'uso di Styll (notifiche in-app) SSE è sufficiente.

---

## Database schema gamification (Doctrine Entities)

```php
// LoyaltyConfig entity
class LoyaltyConfig {
    private Uuid $id;
    private Tenant $tenant;
    private int $pointsPerEuro = 10;
    private int $streakThresholdDays = 45;
    private \DateTimeImmutable $startedAt;
    private ?\DateTimeImmutable $endedAt = null; // null = config attiva
}

// ClientLoyalty entity
class ClientLoyalty {
    private Client $client;
    private int $totalPoints = 0;
    private int $currentStreak = 0;
    private int $longestStreak = 0;
    private string $tier = 'Bronze';
    private ?\DateTimeImmutable $lastVisitDate = null;
}
```

---

## Stima costi infrastruttura VPS (luglio 2026)

| Tier | VPS | Spec | Costo/mese | Tenant stimati |
|------|-----|------|-----------|----------------|
| Dev/Tesi | Hetzner CX22 | 2 vCPU, 4 GB RAM, 40 GB SSD | ~€8 | 1-10 (demo) |
| Beta | Hetzner CX32 | 4 vCPU, 8 GB RAM, 80 GB SSD | ~€18 | 10-200 |
| Produzione v1 | Hetzner CX42 | 8 vCPU, 16 GB RAM, 160 GB SSD | ~€38 | 200-1.000 |
| Scale-out | Hetzner CCX23 (dedicated) | 4 vCPU, 16 GB RAM | ~€60 | 1.000-5.000 |

Confronto con stack precedente:

| Voce | Supabase Pro | VPS self-hosted |
|------|-------------|----------------|
| Database + backend | $25/mese | incluso nel VPS |
| Limite storage | 8 GB (poi $0.125/GB) | disco VPS (espandibile) |
| Limite tenant | ~1K (Pro), ~5K (Team $599) | illimitato (RAM-bound) |
| Vendor lock-in | Alto (auth, realtime, edge fn) | Zero (PostgreSQL standard) |
| Backup | Automatico (Pro) | Manuale (pg_dump cron o Hetzner snapshot) |

---

## Prezzi API di comunicazione reali 2026 (Italia)

### WhatsApp Business API (Meta)

| Tipo messaggio | Costo per messaggio |
|---------------|-------------------|
| Marketing (template) | €0.0572 |
| Utility (reminder, conferma) | €0.0248 |
| Autenticazione | €0.0248–0.0313 |
| User-initiated (entro 24h) | **GRATIS** |

### SMS API (Italia)

| Provider | Costo per SMS |
|----------|--------------|
| **MessageBird** | ~€0.045 |
| **Infobip** | ~€0.04–0.05 (volume) |
| **Twilio** | ~€0.055 |

**Provider consigliati per Styll:** MessageBird o Infobip (API unificata WhatsApp + SMS).

**Calcolo costi per barbiere singolo (~120 clienti/mese):**
- Reminder 24h prima: 120 × €0.0248 = €2.98/mese
- Win-back (10 clienti/mese): 10 × €0.0572 = €0.57/mese
- Review request: 120 × €0.0248 = €2.98/mese
- **Totale: ~€6.50/mese** → ampiamente sostenibile

---

## Template social — Specifiche tecniche

**5 template statici auto-brandizzati:**
1. *"Prenota qui"* — con QR code alla PWA
2. *"La mia nuova app"* — per lancio
3. *"Promo inaugurale"* — sconto primo taglio
4. *"Post-taglio"* — "Come è andata? Lascia una recensione"
5. *"Reminder stagionale"* — "È ora di un taglio!"

**Specifiche tecniche:**
- Generati server-side con **Sharp/Canvas API** (Node.js) usando colori + logo + nome del barbiere
- Export come PNG per Instagram Stories (1080×1920) e post (1080×1080)
- Costo: zero (librerie open source)

---

## Google Business Profile API

- Gratuita (con limiti di quota)
- OAuth 2.0 → `locations.get` → nome, indirizzo, orari, telefono, foto, categorie
- Perfetta per auto-fill al signup

---

## Privacy e GDPR

- Le note del barbiere NON sono visibili al cliente nella PWA
- Il cliente vede: storico prenotazioni, punti loyalty, prossima visita
- Il cliente può aggiornare: telefono, email, preferenze orario
- Consenso esplicito al primo accesso, opt-out sempre disponibile
- Export dati cliente: sempre gratis
- GDPR: opt-in esplicito + opt-out in ogni messaggio
- Frequenza win-back: max 1 al mese per cliente
- Tabella `client_consents` con granularità per tipo consenso

---

## Cascata intelligente canali (v2)

Push → WhatsApp → SMS → Email

| Canale | Per chi | Quando |
|--------|---------|--------|
| **Push notification (PWA)** | Luca (ha la PWA) | Reminder 24h, conferma booking |
| **WhatsApp** | Luca + clienti con WhatsApp | Reminder, win-back, promozioni |
| **SMS** | Roberto (no WhatsApp business) | Reminder, win-back |
| **Email** | Tutti (fallback) | Conferma booking, receipt |

---

## Sicurezza

| Area | Implementazione |
|------|----------------|
| **Multi-tenant isolation** | Doctrine TenantFilter (fail-closed: `1=0` se no JWT) |
| **Autenticazione API** | JWT RS256 (asymmetric), stateless firewall |
| **Password hashing** | Symfony PasswordHasher (bcrypt/argon2) |
| **CORS** | `nelmio/cors-bundle` — origini esplicite whitelist |
| **SQL injection** | Doctrine parametrized queries (ORM default) |
| **XSS** | API Platform serializza JSON, nessun HTML rendering |
| **Rate limiting** | `symfony/rate-limiter` su endpoint auth e OTP |

---

## DevOps e CI/CD

| Area | Tool |
|------|------|
| Build | Docker Compose |
| Test backend | PHPUnit 11.5 (`php bin/phpunit`) |
| Test frontend | Jest + Playwright |
| Lint PHP | PHP-CS-Fixer + PHPStan livello 5 |
| Deploy | GitHub Actions → SSH → `docker compose pull && docker compose up -d` |
| Backup DB | `pg_dump` cron giornaliero → S3/MinIO o Hetzner Object Storage |
| Monitoring | Sentry (errori) + PostHog (analytics) |

---

## Scalabilità

| Fase | Architettura | Trigger |
|------|-------------|---------|
| v1 (0-1K tenant) | VPS singolo, Docker Compose, PostgreSQL read replica opzionale | Default |
| v2 (1K-10K tenant) | VPS multi-node, Nginx load balancer, PostgreSQL primario + replica | >500 tenant |
| v3 (10K+) | Kubernetes, PgBouncer connection pool, read/write split | >2K tenant |

La separazione frontend (Vercel/Cloudflare) / backend (VPS) è già nell'architettura corrente: Next.js chiama le API Symfony su `api.styll.app`.
