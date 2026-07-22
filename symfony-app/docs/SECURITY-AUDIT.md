# Security Audit — 2026-07-22

**Repository:** `Styll-Symfony`  
**Branch:** `feat/symfony-admin-migration`  
**Scope:** Fase D richiesta in sessione notturna, solo verifica e report

## Metodo

Verifiche eseguite realmente:

- audit codice Symfony su `TenantFilter`, entity Doctrine, `PublicTenantResourceProvider`, `security.yaml`, `services.yaml`, `CorsSubscriber`, `BackupController`, `BackupVerifyService`
- scansione pattern segreti nel repo con `rg`, escludendo `node_modules`, `vendor`, `.git` e file example
- query diretta alla tabella `backup_run` sul Postgres locale
- `docker compose exec -T php composer audit`
- `pnpm audit --prod`
- lettura di `docker-compose.yml`, `.env.prod.example`, `composer.json`

## Executive Summary

### Conferme positive

- Il `TenantFilter` copre il perimetro tenant-scoped rilevato nel codice: **46 entity** con `tenant_id`.
- Le uniche entity con `tenant_id` escluse esplicitamente dal filtro sono `AdminAuditLog` e `PlatformNotification`; la scelta appare intenzionale per il contesto admin globale ed e coerente con il test `AdminGlobalTenantFilterIntegrationTest`.
- Le resource `/api/public/...` usano `PublicTenantResourceProvider`, che:
  - risolve sempre un tenant attivo per `slug`
  - abilita/parametrizza il `tenant_filter` sul tenant risolto
  - applica vincoli di visibilita aggiuntivi (`showOnWebsite`, `showOnSite`, `isActive`, `deletedAt IS NULL`, ecc.)
- Le serializer groups `public:read` non espongono note interne, billing, `price_cost`, SKU, email staff private o dati auth.
- `composer audit` e pulito: **nessuna advisory PHP** nota.
- `CORS_ALLOW_ORIGIN` in `.env.prod.example` e a lista esplicita, non wildcard.
- Le porte esposte in `docker-compose.yml` sono tutte bindate a `127.0.0.1` (`5432`, `8080`, `3001`).
- La scansione segreti non ha trovato secret runtime committati nel repo; solo password di fixture di test in:
  - `symfony-app/tests/Functional/RegisterEndpointTest.php`
  - `symfony-app/tests/Functional/CreateStaffUserCommandTest.php`

### Gap / rischi principali

1. **Backup non verificabile operativamente nel compose locale**
   - `backup_run` risulta vuota: **0 righe**
   - nel container PHP risultano `EMPTY`:
     - `BACKUP_B2_KEY_ID`
     - `BACKUP_B2_APPLICATION_KEY`
     - `BACKUP_B2_BUCKET`
     - `BACKUP_REPORT_TOKEN`
     - `ADMIN_API_TOKEN`
   - conseguenza:
     - nessun backup recente dimostrabile
     - impossibile eseguire una restore-verification reale via `BackupVerifyService`

2. **Rate limiting auth incompleto**
   - in `symfony-app/config/packages/security.yaml` non e configurato `login_throttling`
   - `symfony/rate-limiter` non compare in `symfony-app/composer.json`
   - `PasswordResetService::requestReset()` non applica throttling/rate limit per IP o email oltre al comportamento anti-enumerazione
   - `PwaClientEmailOtpService` ha mitigazioni applicative parziali:
     - resend cooldown: `60s`
     - lockout dopo `5` tentativi
     - lockout duration: `15` minuti
   - manca comunque un rate limit centralizzato per:
     - `/api/login`
     - `/api/password-reset/request`
     - `/api/pwa/otp/send`
     - `/api/pwa/otp/verify`

3. **Dipendenze frontend con vulnerabilita note**
   - `pnpm audit --prod` riporta **33 vulnerabilita**
   - severita:
     - `7 high`
     - `22 moderate`
     - `4 low`
   - package rilevanti nei path segnalati:
     - `sharp`
     - `brace-expansion`
     - `fast-uri`
     - `hono`
     - `js-yaml`
     - `body-parser`
     - `dompurify`
   - una parte significativa dei path passa da `@sentry/nextjs`, `next`, `shadcn`, `@modelcontextprotocol/sdk`, `posthog-js`

4. **Rotte backup pubbliche per firewall, protette solo da token statici**
   - `security.yaml` dichiara `PUBLIC_ACCESS` per:
     - `^/api/internal/backups`
     - `^/api/admin/backups`
   - il controllo auth reale e demandato a `BackupController` via header statici:
     - `X-Backup-Token`
     - `X-Admin-Token`
   - nel compose locale i token sono vuoti, quindi il controller fallisce in chiusura
   - resta comunque un punto sensibile: in ambienti reali la sicurezza dipende interamente dalla gestione corretta di quei token

## Dettaglio per area

### D1. Isolamento multi-tenant

Evidenze:

- `TenantFilter` e fail-closed: se il filtro e abilitato senza `tenant_id`, ritorna `1 = 0`
- entity tenant-scoped rilevate: **46**
- entity escluse esplicitamente:
  - `User`
  - `Profile`
  - `Tenant`
  - `SubscriptionPlan`
  - `AdminAuditLog`
  - `AdminSetting`
  - `EmailTemplate`
  - `PlatformNotification`
  - `PlatformLead`
- entity con `tenant_id` ma escluse dal filtro:
  - `AdminAuditLog`
  - `PlatformNotification`

Valutazione:

- non ho trovato entity tenant-scoped ordinarie mancanti dal filtro
- le due esclusioni con `tenant_id` appaiono volute per use case admin/platform
- il test `AdminGlobalTenantFilterIntegrationTest` conferma esplicitamente il comportamento globale per `AdminAuditLog`, `AdminSetting`, `EmailTemplate`

### D1. Endpoint pubblici `/api/public/...`

Resource pubbliche verificate:

- `Tenant`
- `Location`
- `ServiceCategory`
- `Service`
- `StaffMember`
- `Product`
- `GalleryPhoto`
- `PortfolioPhoto`
- `WebsitePhoto`
- `Promotion`
- `PromotionService`
- `PromotionProduct`

Campi pubblici sensibili verificati:

- `Tenant` espone contatti business intenzionali:
  - `contactPhone`
  - `contactEmail`
  - `socialLinks`
- `Location` espone contatti/location marketing intenzionali:
  - `phone`
  - `email`
  - `address`
- `StaffMember` non espone email o telefono del profilo
- `Product` non espone `price_cost` o `sku`
- nessuna resource pubblica espone:
  - note interne
  - billing
  - consensi/privacy requests
  - token
  - email private dei profili

Valutazione:

- non ho rilevato leak evidenti di campi sensibili nel namespace `/api/public`
- la presenza di telefoni/email e coerente con il contesto public storefront, non con dati privati staff/client

### D2. Segreti nel codice

Esito:

- nessun secret runtime plausibilmente attivo trovato nel repo con il pattern usato
- soli match rilevati:
  - password di test in file PHPUnit

Valutazione:

- nessuna evidenza di credenziali reali committate nel codice sorgente auditato

### D3. Backup

Esito:

- query `backup_run`: **0 record**
- nessun ultimo run recente verificabile
- impossibile testare leggibilita di un dump esistente per assenza di run e assenza credenziali B2 nel compose locale

Valutazione:

- gap operativo reale: il sistema esiste a livello codice, ma non e dimostrabile funzionante in questo ambiente

### D4. Audit dipendenze

PHP:

- `composer audit`: nessuna advisory

Frontend:

- `pnpm audit --prod`: `33` vulnerabilita (`7 high`, `22 moderate`, `4 low`)
- priorita piu evidente:
  - aggiornamento catena `next`/`sharp`
  - aggiornamento transitive `fast-uri`
  - aggiornamento catena `hono`
  - aggiornamento transitive `brace-expansion`

### D5. Configurazione di sicurezza

Conferme:

- `^/api/*` richiede `IS_AUTHENTICATED_FULLY` come default finale
- eccezioni pubbliche sono dichiarate esplicitamente in `access_control`
- `CORS_ALLOW_ORIGIN` in produzione e allowlist esplicita
- `CorsSubscriber` confronta l'origin con match esatto, non usa wildcard o reflection indiscriminata
- tutte le porte nel `docker-compose.yml` root sono bindate a `127.0.0.1`

Nota:

- le eccezioni backup sono intenzionali ma sensibili, perche dipendono da static token e non da JWT/sessione

### D6. Rate limiting / brute force

Stato reale:

- **login**: nessun `login_throttling` configurato
- **password reset request**: nessun rate limiter dedicato
- **OTP send**: nessun rate limiter Symfony; solo cooldown applicativo nel servizio OTP
- **OTP verify**: lockout applicativo esiste, ma non c'e rate limiting/IP throttling centralizzato

Valutazione:

- gap di sicurezza **alto** per login e reset password
- gap **medio-alto** per OTP, mitigato solo in parte dal lockout del token

## Priorita raccomandate

### Alta

1. Implementare rate limiting su `/api/login`, `/api/password-reset/request`, `/api/pwa/otp/send`, `/api/pwa/otp/verify`
2. Rendere verificabile il sistema backup:
   - produrre almeno un `backup_run`
   - configurare i token backup
   - configurare credenziali B2
   - provare una restore verification reale
3. Affrontare le vulnerabilita frontend `high`

### Media

1. Riesaminare se `AdminAuditLog` e `PlatformNotification` debbano restare globali o richiedere filtri aggiuntivi a livello controller/use case
2. Ridurre l'uso di token statici sulle route backup o documentarne rotazione e scoping operativo

### Bassa

1. Formalizzare nel repo una checklist di audit periodico per dipendenze e backup

## Conclusione

Non ho trovato evidenze di rottura dell'isolamento tenant nel modello Doctrine o leak evidenti nel namespace pubblico `/api/public`. I gap piu concreti emersi sono operativi e di hardening: backup non dimostrato, rate limiting assente sui principali endpoint auth, e vulnerabilita frontend note nelle dipendenze npm.
