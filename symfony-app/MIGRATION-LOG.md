# Migration Log — Styll: Next.js+Supabase → Symfony+PostgreSQL

**Data:** 2026-07-20  
**Branch:** symfony-scaffold  
**Autore:** Claude (scaffold automatico, revisione manuale richiesta)

---

## FASE 1 — Password reset staff via email — 2026-07-22

**Branch:** `feat/symfony-password-reset-and-pwa-auth`

### Obiettivo

Implementare il reset password staff via email lato Symfony (senza SMTP — token loggato), con frontend Next.js corrispondente.

### Backend Symfony

Nuovi file:

- `src/Entity/PasswordResetToken.php` — token hashed SHA-256, scadenza 1h, monouso
- `src/Repository/PasswordResetTokenRepository.php` — `findValidByHash`, `invalidatePendingForEmail`
- `migrations/Version20260722180000.php` — tabella `password_reset_tokens`
- `src/Service/PasswordResetService.php` — `requestReset` (no user enumeration), `confirmReset`
- `src/Service/PasswordResetConfirmResult.php` — value object esito conferma
- `src/Controller/PasswordResetRequestController.php` — `POST /api/password-reset/request`
- `src/Controller/PasswordResetConfirmController.php` — `POST /api/password-reset/confirm`

### Frontend Next.js

Nuovi file:

- `apps/web/src/app/(auth)/reset-password/page.tsx`
- `apps/web/src/components/auth/reset-password-form.tsx`
- `apps/web/src/app/api/auth/staff/password-reset/confirm/route.ts`

Modifiche:

- `apps/web/src/app/(auth)/register/actions.ts` — `requestPasswordReset` chiama Symfony invece di Supabase
- `apps/web/src/components/auth/login-form.tsx` — link "Password dimenticata?" ripristinato

### Verifiche reali

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox tests/Functional/PasswordResetEndpointTest.php
```

Risultato: **8/8 test verdi**, `Assertions: 35`.

---

## FASE 2 — Auth PWA cliente migrata a Symfony OTP email — 2026-07-22

**Branch:** `feat/symfony-password-reset-and-pwa-auth`

### Obiettivo

Portare il flusso OTP email cliente PWA da Supabase a Symfony, con provisioning User+Profile+Client in Symfony DB e JWT client emesso da Symfony.

### Backend Symfony

Nuovi file:

- `src/Service/PwaClientEmailOtpService.php` — `sendOtp`, `verifyOtp` con provisioning + JWT
- `src/Service/PwaClientOtpResult.php` — value object esito
- `src/Controller/PwaClientOtpSendController.php` — `POST /api/pwa/otp/send`
- `src/Controller/PwaClientOtpVerifyController.php` — `POST /api/pwa/otp/verify`
- `src/Controller/PwaClientProfileUpdateController.php` — `PATCH /api/pwa/client/profile`

Modifiche:

- `src/Repository/EmailVerificationTokenRepository.php` — aggiunti `findActiveSendToken`, `findForVerification`, `findActiveForEmail`, `invalidateAllForEmail`
- `config/packages/security.yaml` — `^/api/pwa` aperto con `PUBLIC_ACCESS`

Decisioni architetturali:

- `withoutTenantFilter()` pattern (stesso di `GoogleOAuthFlowService`) per bypassare il TenantFilter Doctrine nelle chiamate PUBLIC_ACCESS senza JWT
- JWT `ROLE_PWA_CLIENT` con claims `client_id`, `tenant_id`, `tenant_slug`, `email` — salvato come cookie httpOnly `styll_symfony_client_jwt` in Next.js
- `PATCH /api/pwa/client/profile` decodifica manualmente i claims JWT via `JWTTokenManagerInterface::decode($token)` per estrarre `client_id`

### Frontend Next.js

Modifiche:

- `apps/web/src/lib/actions/pwa-auth.ts`
  - `sendEmailOtp`: chiama Symfony `POST /api/pwa/otp/send` invece di Supabase
  - `verifyEmailOtp`: chiama Symfony `POST /api/pwa/otp/verify`, salva JWT in cookie httpOnly `styll_symfony_client_jwt`
  - `completeEmailOtpProfile`: chiama Symfony `PATCH /api/pwa/client/profile` con Bearer JWT dal cookie
- `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`
  - passa `tenantSlug` a `verifyEmailOtp`
  - rimosso `createClient()` / `createPwaClient()` / `setSession()` Supabase

### Verifiche reali

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox
```

Risultato: **112/112 test verdi**, `Assertions: 904`, `PHPUnit Deprecations: 3`.

### Gap residui documentati

- **Dati PWA**: il layer dati della PWA (clienti, appuntamenti, loyalty, wishlist) legge ancora Supabase; la sessione Symfony è usata solo per auth.
- **FASE 3 OTP SMS/Twilio**: non implementato — richiede credenziali Twilio non disponibili.

---

## FASE 3 — OTP SMS/Twilio: gap documentato, non implementato — 2026-07-22

**Branch:** `feat/symfony-password-reset-and-pwa-auth`

### Stato

Non implementato per assenza di credenziali Twilio.

### Cosa servirebbe

Backend Symfony:
- `POST /api/pwa/otp/sms/send` — invia OTP via Twilio SMS
- `POST /api/pwa/otp/sms/verify` — verifica OTP SMS, provisioning client, emette JWT `ROLE_PWA_CLIENT`

Frontend:
- `sendSmsOtp` / `verifySmsOtp` in `pwa-auth.ts` da aggiornare in modo analogo alla FASE 2 email OTP

Variabili d'ambiente necessarie:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

### Note

Il flusso concettuale è identico alla FASE 2 email OTP. Il codice Symfony sarebbe strutturalmente analogo a `PwaClientEmailOtpService`, con l'invio SMS sostituito all'invio (log) del codice OTP.

---

## Sessione admin full migration audit — 2026-07-22

**Branch:** `feat/symfony-admin-migration`

### Audit frontend admin eseguito prima di modifiche applicative

Perimetro auditato:

- `apps/web/src/app/admin/**`
- `apps/web/src/components/admin/**`

Pattern cercati realmente:

- `supabase.auth.getUser()`
- `createClient()`
- `createAdminClient()`
- `.from('...')`

### Stato reale trovato nel codice

#### 100% Symfony

- **Nessuna funzionalita dati admin e oggi 100% Symfony.**
- Il JWT staff Symfony viene gia usato per recuperare l'identita base (`getOptionalSymfonyStaffMe()`), ma nel perimetro admin non esiste ancora una lettura/scrittura end-to-end servita solo da Symfony.

#### Ibridi: auth/gating Symfony, dati ancora Supabase

- `apps/web/src/app/admin/actions.ts`
  - `requireSuperadmin()` parte da sessione staff Symfony, ma conferma `profiles.is_superadmin` via Supabase.
- `apps/web/src/app/admin/layout.tsx`
  - gate iniziale con `getOptionalSymfonyStaffMe()`, poi badge/count via Supabase (`profiles`, `tenants`, `platform_notifications`).
- `apps/web/src/app/admin/actions-tenants.ts`
  - CRUD tenant, shadow mode, subscription, export tenant data: autorizzazione Symfony, persistenza/lettura Supabase.
- `apps/web/src/app/admin/actions-users.ts`
  - update profilo, invite/reset/delete user, memberships tenant, impersonation: autorizzazione Symfony, persistenza Supabase/Auth Supabase admin.
- `apps/web/src/app/admin/actions-content.ts`
  - servizi, locations, staff, working hours, upload admin image: autorizzazione Symfony, dati Supabase.
- `apps/web/src/app/admin/actions-data.ts`
  - clienti, appuntamenti, import jobs, seed demo: autorizzazione Symfony, dati Supabase.
- `apps/web/src/app/admin/actions-plans.ts`
  - subscription plans e tenant subscriptions: autorizzazione Symfony, dati Supabase.
- `apps/web/src/app/admin/actions-system.ts`
  - audit log, dashboard stats, admin settings, email templates, global search: autorizzazione Symfony, dati Supabase.
- `apps/web/src/app/admin/actions-onboarding.ts`
  - onboarding tokens: autorizzazione Symfony, dati Supabase.
- `apps/web/src/app/admin/analytics/page.tsx`
  - gate con `requireSuperadmin()`, ma dipende da `actions-system.ts`, quindi di fatto ibrido.
- `apps/web/src/app/admin/tenants/[tenantId]/products/actions.ts`
  - prodotti e inventario: autorizzazione Symfony, dati Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/actions.ts`
  - tenant integrations WhatsApp: autorizzazione Symfony, dati Supabase.

#### 100% Supabase lato dati/admin delivery

- `apps/web/src/app/admin/tenants/page.tsx`
  - lista tenant, conteggi client/staff/subscription via query Supabase dirette.
- `apps/web/src/app/admin/users/page.tsx`
  - lista utenti/staff/tenant via query Supabase dirette.
- `apps/web/src/app/admin/tenants/[tenantId]/page.tsx`
  - overview tenant e subscription via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/layout.tsx`
  - shell tenant admin con conteggi servizi/staff/locations/clienti/appuntamenti via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/analytics/page.tsx`
  - tenant activity log, appointments, tenant lookup via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/services/page.tsx`
  - servizi via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/locations/page.tsx`
  - locations via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/staff/page.tsx`
  - staff members + profili disponibili via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/working-hours/page.tsx`
  - working hours + staff via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/products/page.tsx`
  - prodotti, locations, inventory via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/subscription/page.tsx`
  - plans e tenant subscriptions via Supabase.
- `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/page.tsx`
  - tenant integrations, inbox conversations/messages, webhook events via Supabase.
- `apps/web/src/components/admin/notification-bell.tsx`
  - unread/realtime `platform_notifications` via client Supabase browser-side.

#### UI-only / nessuna sorgente dati rilevata nell'audit

- componenti presentazionali in `apps/web/src/components/admin/*` tranne `notification-bell.tsx`
- client components in `apps/web/src/app/admin/**/**-client.tsx` che ricevono props dai page loader/actions
- pagine statiche come `apps/web/src/app/admin/help/page.tsx`

### Conclusione audit frontend

- La migrazione admin dichiarata come "gia portata su Symfony" nelle sessioni precedenti riguarda soprattutto:
  - sessione staff JWT Symfony
  - redirect/gating staff
  - primi wrapper `requireSuperadmin()`
- **La sorgente dati admin resta pero prevalentemente Supabase**:
  - query dirette server-side da `createAdminClient()`
  - scritture server actions su `.from(...)`
  - realtime browser-side da client Supabase

### Audit backend Symfony esistente per area admin

Evidenze reali trovate:

- Entita presenti:
  - `AdminAuditLog`
  - `AdminSetting`
  - `EmailTemplate`
  - `PlatformNotification`
  - `Tenant`
  - `StaffMember`
  - `Profile`
  - `User`
- Controller admin-specifici trovati:
  - solo `BackupController.php`
- Endpoint admin mancanti al momento dell'audit:
  - nessun endpoint Symfony dedicato per lista/dettaglio tenant admin
  - nessun endpoint Symfony dedicato per lista/dettaglio utenti staff admin
  - nessun endpoint Symfony dedicato per `admin_settings`
  - nessun endpoint Symfony dedicato per `admin_audit_log`
  - nessun endpoint Symfony dedicato per `platform_notifications`
  - nessun endpoint Symfony dedicato per `subscription_plans` / `tenant_subscriptions`

Questo significa che la migrazione completa della dashboard superadmin richiede prima la costruzione della superficie API/admin Symfony, non solo il refactor del frontend Next.

### Verifica strutturale DB Symfony root eseguita dopo il primo wiring API

Comandi reali eseguiti:

- `docker compose ps`
- `docker compose exec -T php php bin/console doctrine:query:sql "...information_schema..."`

Nota operativa verificata: i comandi `docker compose exec -T php ...` vanno lanciati dalla root repository, non da `symfony-app/`, altrimenti il compose locale non espone il service `php`.

#### Tabelle presenti nel DB usato oggi dal backend Symfony root

Verificato con `information_schema.columns` / `information_schema.tables`:

- presenti:
  - `services`
  - `locations`
  - `working_hours`
  - `products`
  - `product_inventory`
  - `clients`
  - `appointments`
  - `appointment_services`
  - `client_import_jobs`
  - `analytics_consent_events`
- assenti:
  - `site_analytics_daily`
  - `tenant_integrations`
  - `inbox_conversations`
  - `inbox_messages`
  - `webhook_events_inbox`
  - `consent_events`
- assente anche la routine SQL:
  - `apply_client_consent_events(...)`

#### Impatto reale sul piano di migrazione admin

- `services`, `locations`, `working_hours`, `products`, `clients`, `appointments`, `client_import_jobs` sono migrabili a endpoint Symfony sul DB root attuale.
- `analytics` admin e `whatsapp` admin **non sono migrabili al 100% sul backend Symfony root attuale** senza prima portare nel suo database/schema almeno:
  - `site_analytics_daily`
  - `tenant_integrations`
  - `inbox_conversations`
  - `inbox_messages`
  - `webhook_events_inbox`
- Anche `clients/import` richiede attenzione: il comportamento attuale usa `consent_events` + `apply_client_consent_events(...)`, che oggi **non esistono** nel DB Symfony root e quindi vanno prima migrati o reimplementati per non perdere audit consenso.

### Residuo reale dopo il baseline `feat(admin): add symfony admin api baseline`

Verifica ripetuta con:

- `rg -n "createAdminClient\\(|createClient\\(|\\.from\\('" apps/web/src/app/admin apps/web/src/components/admin apps/web/src/lib/admin`

Residuo ancora su Supabase al momento di questa nota:

- `apps/web/src/app/admin/actions-data.ts`
  - clienti tenant
  - appuntamenti tenant
  - import concierge clienti
  - storico `client_import_jobs`
- `apps/web/src/lib/actions/appointments.ts`
  - create/update/delete/seed appuntamenti usati da `appointments-client.tsx`
- `apps/web/src/app/admin/tenants/[tenantId]/analytics/page.tsx`
  - tenant analytics usa ancora `site_analytics_daily` + `appointments`
- `apps/web/src/lib/admin/site-analytics-queries.ts`
  - analytics cross-tenant usa ancora `site_analytics_daily` + `tenant_activity_log`
- `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/page.tsx`
  - dipende da `tenant_integrations`, `inbox_conversations`, `inbox_messages`, `webhook_events_inbox`
- `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/actions.ts`
  - binding WhatsApp ancora via Supabase
- `apps/web/src/app/admin/actions-content.ts`
  - resta un solo uso `createAdminClient()` per `uploadAdminImage()` su storage Supabase

Conclusione operativa aggiornata:

- `clients`, `appointments` e `client_import_jobs` restano **migrabili subito** se si copre anche il gap consenso (`consent_events` e relativa logica append-only).
- `analytics` non e solo un problema di endpoint: oggi il DB Symfony root **non contiene** `site_analytics_daily`, quindi la migrazione richiede prima portare schema e pipeline dati.
- `whatsapp` resta **fuori perimetro di modifica in questa sessione** anche per il vincolo esplicito "NON toccare MAI il blocco inbox AI WhatsApp"; di conseguenza questa parte non puo essere dichiarata migrata al 100% senza una sessione dedicata e autorizzata.

### Tranche successiva effettivamente migrata a Symfony — 2026-07-22

Backend Symfony aggiunto:

- `src/Service/AdminConsentWriter.php`
  - persistenza append-only di `consent_events`
  - aggiornamento snapshot `clients.marketing_consent` / `clients.churn_opted_out`
- `src/Controller/Admin/AdminTenantDataController.php`
  - `GET/POST/PATCH/DELETE /api/admin/tenants/{tenantId}/clients`
  - `POST /api/admin/tenants/{tenantId}/clients/bulk-create`
  - `GET/POST /api/admin/tenants/{tenantId}/appointments`
  - `GET /api/admin/tenants/{tenantId}/appointments/options`
  - `PATCH /api/admin/tenants/{tenantId}/appointments/{appointmentId}/status`
  - `DELETE /api/admin/tenants/{tenantId}/appointments/{appointmentId}`
  - `POST /api/admin/tenants/{tenantId}/appointments/seed`
  - `POST /api/admin/tenants/{tenantId}/client-imports/commit`
  - `GET /api/admin/tenants/{tenantId}/client-import-jobs`
  - `GET /api/admin/tenants/{tenantId}/client-import-jobs/{jobId}/errors`
- `migrations/Version20260722223000.php`
  - nuova tabella `consent_events`
  - trigger append-only `trg_guard_consent_events_append_only`

Frontend Next.js migrato in questa tranche:

- `apps/web/src/app/admin/actions-data.ts`
  - rimosso completamente `createAdminClient()` / `.from(...)`
  - clienti tenant, appuntamenti tenant e import concierge ora chiamano solo API Symfony
- `apps/web/src/lib/actions/appointments.ts`
  - create/update/delete/seed appuntamenti admin ora chiamano solo API Symfony

Verifica reale dell'audit dopo questo refactor:

- comando eseguito:
  - `rg -n "createAdminClient\\(|createClient\\(|\\.from\\('" apps/web/src/app/admin apps/web/src/components/admin apps/web/src/lib/admin`
- residuo rimasto:
  - `apps/web/src/lib/admin/site-analytics-queries.ts`
  - `apps/web/src/app/admin/tenants/[tenantId]/analytics/page.tsx`
  - `apps/web/src/app/admin/actions-content.ts` solo `uploadAdminImage()`
  - `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/page.tsx`
  - `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/actions.ts`

Interpretazione aggiornata:

- **migrato davvero in questa sessione**:
  - CRUD clienti tenant
  - audit consenso admin per clienti
  - CRUD/seed appuntamenti tenant
  - lookup opzioni appuntamenti
  - commit import concierge + storico job/errori
- **ancora non migrabile al 100% nel perimetro corrente**:
  - `analytics`
    - mancano ancora nel DB Symfony root `site_analytics_daily` e `tenant_activity_log`
  - `whatsapp`
    - richiede `tenant_integrations`, `inbox_conversations`, `inbox_messages`, `webhook_events_inbox`
    - inoltre e esplicitamente escluso dal vincolo sessione "NON toccare MAI il blocco inbox AI WhatsApp"
  - `uploadAdminImage()`
    - dipende ancora da storage Supabase (`tenants/locations/avatars`) e non da tabelle business

---

## Sessione Google OAuth Symfony per staff + PWA — 2026-07-22

**Branch:** `feat/symfony-google-oauth`

### Obiettivo della sessione

Portare il login/registrazione Google da Supabase a Symfony per due contesti distinti:

- **staff dashboard**: login/registrazione dal dominio root, poi redirect verso la dashboard tenant;
- **PWA cliente**: login Google dal contesto tenant pubblico, con collegamento del cliente al tenant corretto.

### Vecchio flusso Supabase trovato

File di riferimento letti:

- `apps/web/src/app/(auth)/register/actions.ts`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/app/tenant/app/[slug]/auth/callback/route.ts`
- `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`

Comportamento rilevato nel ramo Supabase:

- staff root: `supabase.auth.signInWithOAuth({ provider: 'google' })`
- query params usati: `access_type=offline`, `prompt=consent`
- callback staff/root: `buildRootAppUrl('/auth/callback')`
- il callback root distingueva `oauth_flow=login` vs `oauth_flow=register`
- nel ramo register root esisteva anche la prova legale B2B in cookie prima del redirect a Google
- PWA cliente: callback tenant-specifica su `/tenant/app/{slug}/auth/callback`
- il callback PWA faceva `exchangeCodeForSession(code)` su Supabase e poi `setupPwaGoogleClient(...)`

Questi dettagli restano utili come storico, ma il nuovo flusso locale implementato in questa sessione usa un **solo redirect URI Google** condiviso:

- `http://localhost:3000/api/auth/google/callback`

### Backend Symfony implementato

Dipendenza aggiunta:

- `league/oauth2-google`

Nuovi componenti principali:

- `src/Controller/GoogleOAuthStartController.php`
- `src/Controller/GoogleOAuthCompleteController.php`
- `src/Service/LeagueGoogleOAuthProvider.php`
- `src/Service/GoogleOAuthFlowService.php`
- `src/Service/GoogleOAuthStateSigner.php`
- `src/Service/PwaGoogleClientProvisioningService.php`

Flusso introdotto:

- `POST /api/oauth/google/start`
  - valida il contesto (`staff_login`, `staff_register`, `pwa`)
  - emette `authorizationUrl` Google + `stateToken` firmato
- `POST /api/oauth/google/complete`
  - valida `code`, `state`, `state_cookie`, `redirect_uri`
  - scambia il code con Google
  - recupera email/nome/avatar/id_token/access_token
  - **staff login**:
    - se l'utente staff esiste, emette subito JWT Symfony
  - **staff register**:
    - non crea ancora account o tenant
    - emette un `pendingToken` firmato con email/nome/avatar Google
  - `POST /api/register/google/finalize`
    - verifica il `pendingToken`
    - richiede `business_name` + accettazione termini
    - solo qui crea o promuove `User + Profile + Tenant + StaffMember(owner)` tramite `StaffRegistrationService`
    - emette il JWT Symfony finale
  - **PWA**:
    - crea o collega il cliente Symfony al tenant indicato nello `state`
    - restituisce `googleIdToken` + `googleAccessToken` per aprire la sessione Supabase lato Next

Decisione architetturale sul wizard register:

- per `email/password`, lo Step 1 tiene `full_name + email + password` solo in stato locale React;
- la chiamata reale a `POST /api/register` avviene solo allo Step 2, quando sono presenti anche `business_name` e `accepted_terms`;
- per Google, la callback non provisiona piu immediatamente: salva solo un `pendingToken` HttpOnly e fa atterrare l'utente sullo stesso Step 2 dell'altro percorso.

Trade-off valutato:

- creare subito l'account Symfony allo Step 1 avrebbe richiesto un utente staff incompleto e una seconda fase di provisioning tenant, con piu stati transitori da gestire;
- il `pendingToken` firmato evita stati parziali nel database, mantiene il provisioning finale interamente server-side e non richiede di fidarsi di dati Google reinviati dal browser.

Decisione tecnica importante:

- gli endpoint Google OAuth sono pubblici, quindi arrivano **prima** che `TenantContext` possa risolvere un tenant;
- per questo `GoogleOAuthFlowService` disabilita in modo mirato il `tenant_filter` Doctrine durante il provisioning/login Google, evitando il fail-closed sugli accessi server-side a `staff_members` e `clients`.

Nota modello dati:

- `clients.phone` e stato reso nullable anche in Doctrine/migration, per supportare il primo accesso Google cliente senza numero di telefono obbligatorio.

### Frontend Next.js implementato

Nuovi route handler:

- `apps/web/src/app/api/auth/google/staff/start/route.ts`
- `apps/web/src/app/api/auth/google/pwa/start/route.ts`
- `apps/web/src/app/api/auth/google/callback/route.ts`

Componenti aggiornati:

- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/components/auth/register-form.tsx`
- `apps/web/src/components/auth/google-button.tsx`
- `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`
- `apps/web/src/lib/actions/pwa-auth.ts`

Comportamento introdotto:

- **staff**
  - il bottone Google sul root login/register chiama il route handler Next
  - Next chiama Symfony `/api/oauth/google/start`
  - Next salva il cookie `styll_google_oauth_state`
  - la callback Next chiama Symfony `/api/oauth/google/complete`
  - in caso staff salva il cookie `styll_symfony_staff_jwt`
  - redirect finale su `/dashboard`, mantenendo il comportamento già usato dal login email/password

- **PWA**
  - il bottone Google in `EmailOtpForm.tsx` non usa più `supabase.auth.signInWithOAuth(...)`
  - chiama `/api/auth/google/pwa/start`
  - la callback Next riceve da Symfony `googleIdToken` + `googleAccessToken`
  - Next apre una sessione Supabase via `supabase.auth.signInWithIdToken({ provider: 'google', ... })`
  - poi esegue il bootstrap cliente esistente `setupPwaGoogleClientForResolvedUser(...)`
  - redirect finale sulla PWA tenant (`/tenant/app/{slug}/...` in locale)

Questa è una soluzione ponte: **staff auth è già Symfony-native**, mentre la **PWA cliente resta compatibile con la sessione Supabase esistente** finché la migrazione auth cliente non sarà completata.

### Config locale usata

Aggiornati solo file locali non tracciati:

- `symfony-app/.env.local`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- `apps/web/.env.local`
  - `SYMFONY_API_URL=http://localhost:8080`
  - `NEXT_PUBLIC_SYMFONY_API_URL=http://localhost:8080`

Le credenziali Google dell'utente **non sono state aggiunte a file tracciati da Git**.

### Verifiche reali eseguite senza browser Google

HTTP reale su Symfony locale:

- `POST http://localhost:8080/api/oauth/google/start` per `staff_login`
  - `200`
  - host authorization URL: `accounts.google.com`
  - `redirect_uri`: `http://localhost:3000/api/auth/google/callback`
- `POST http://localhost:8080/api/oauth/google/start` per `pwa`
  - `200`
  - stesso `redirect_uri`

HTTP reale su Next locale:

- `POST http://localhost:3000/api/auth/google/staff/start`
  - `200`
  - `Set-Cookie: styll_google_oauth_state=...`
  - authorization URL Google valida
- `POST http://localhost:3000/api/auth/google/pwa/start`
  - `200`
  - `Set-Cookie: styll_google_oauth_state=...`
  - authorization URL Google valida

Test automatici Symfony aggiunti:

- `tests/Functional/GoogleOAuthEndpointTest.php`
  - nuovo staff via Google
  - staff esistente via Google
  - nuovo cliente PWA collegato al tenant corretto

### Limiti residui / verifica manuale ancora necessaria

- il login Google reale nel browser **non è stato completato in questa sessione** perché richiede un account Google interattivo;
- il test manuale ancora da fare dall'utente è:
  - root staff: `http://localhost:3000/login` oppure `http://localhost:3000/register`
  - PWA cliente: pagina accesso tenant che monta `EmailOtpForm`
- redirect URI attualmente usato dal codice locale:
  - `http://localhost:3000/api/auth/google/callback`
- questo coincide con il redirect URI che l'utente ha già registrato in Google Cloud Console.

### Note di contesto extra

- `pnpm --filter web type-check` oggi fallisce ancora per errori **preesistenti** nell'area inbox AI/WhatsApp (`InboxConversazioni.tsx`, `anthropic-draft-provider.ts`, `inbox-draft-orchestrator-core.ts`, `inbox-draft-provider-selection.ts`, `inbox-memory-resolver.ts`); questi file non sono stati modificati per il flusso Google.

---

## Sessione self-service staff registration Symfony end-to-end — 2026-07-22

**Branch:** `feat/symfony-staff-registration`

### Obiettivo della sessione

Portare il flusso di registrazione staff owner da Supabase/onboarding a Symfony, mantenendo il modello auth corretto:

- login staff sul dominio root
- JWT Symfony salvato da Next.js
- tenant corrente risolto dopo login/registrazione tramite `GET /api/me`
- redirect finale verso dashboard tenant

### Correzione del modello auth/tenant verificata nel codice

Verifica mirata su:

- `apps/web/src/proxy.ts`
- `apps/web/src/app/(auth)/select-tenant/page.tsx`
- `apps/web/src/app/dashboard/layout.tsx`

Comportamento rilevato:

- lo staff effettua login/registrazione sul root app (`/login`, `/register`);
- la scelta del tenant non avviene al momento del login ma dopo, tramite memberships lette da `GET /api/me`;
- in produzione il redirect porta a `https://{slug}-dashboard.{ROOT_DOMAIN}`;
- in sviluppo locale il comportamento equivalente usa `/?_tenant_slug={slug}&_tenant_type=dashboard`, poi `proxy.ts` fa il rewrite della surface tenant.

### Backend Symfony implementato

Nuovi file principali:

- `src/Controller/RegisterController.php`
- `src/Service/StaffRegistrationService.php`
- `src/Service/StaffRegistrationInput.php`
- `src/Service/StaffRegistrationResult.php`
- `src/Exception/StaffRegistrationConflictException.php`
- `tests/Functional/RegisterEndpointTest.php`

Comportamento introdotto da `POST /api/register`:

- valida `email`, `password`, `business_name`, opzionalmente `full_name` e `business_type`;
- rifiuta email duplicate con `409`;
- genera uno slug tenant sicuro e univoco a partire da `business_name`, con suffisso numerico in caso di collisione;
- crea in una transazione:
  - `users`
  - `profiles`
  - `tenants`
  - `staff_members` con ruolo `owner`
  - `legal_acceptance_events` per l'accettazione B2B email/password
  - `locations` principale
  - preset servizi iniziali coerenti col `business_type`
  - bridge `staff_locations`
  - bridge `staff_services`
  - `working_hours` base Lun-Sab 09:00-19:00
- marca subito `profiles.onboarding_completed = true` e `work_mode = 'solo'`;
- restituisce un JWT Symfony immediatamente, senza richiedere login separato.

### Frontend Next.js implementato

Nuovi/aggiornati:

- `apps/web/src/app/api/auth/staff/register/route.ts`
- `apps/web/src/components/auth/register-form.tsx`
- `apps/web/src/components/auth/register-signup-options.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`

Comportamento introdotto:

- `/register` torna self-service e non e piu gated dal token onboarding per il ramo email/password;
- il form root raccoglie:
  - nome completo
  - nome attività
  - tipo attività
  - email
  - password
- il route handler Next chiama `POST /api/register` Symfony;
- valida il JWT ricevuto con `GET /api/me`;
- salva il cookie httpOnly `styll_symfony_staff_jwt`;
- pulisce eventuali cookie di impersonation/shadow;
- il client fa `router.push('/dashboard')`, lasciando al proxy/layout il redirect verso la dashboard tenant corretta.

### Verifiche runtime reali eseguite

Verifiche backend HTTP reali su Symfony locale:

- `POST http://127.0.0.1:8080/api/register`
  - `201 Created`
  - JWT valido restituito
  - `tenantSlug = owner-http-test-barber`
- `POST http://127.0.0.1:8080/api/login`
  - `200 OK` con le credenziali appena registrate
- `GET http://127.0.0.1:8080/api/me`
  - `200 OK`
  - `currentTenant.slug = owner-http-test-barber`
  - `currentRole = owner`

Verifiche frontend reali su Next locale:

- `POST http://127.0.0.1:3000/api/auth/staff/register`
  - `200 OK`
  - `Set-Cookie: styll_symfony_staff_jwt=...`
  - `currentTenantSlug = owner-frontend-test-barber`
- `GET http://127.0.0.1:3000/dashboard` con quel cookie
  - `307 Temporary Redirect`
  - `Location: /?_tenant_slug=owner-frontend-test-barber&_tenant_type=dashboard`
- `GET http://127.0.0.1:3000/?_tenant_slug=owner-frontend-test-barber&_tenant_type=dashboard`
  - `200 OK`

### Audit del vecchio Google OAuth Supabase trovato ma NON migrato in questa sessione

File principali trovati:

- `apps/web/src/components/auth/google-button.tsx`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/lib/legal/b2b-register-acceptance-shared.ts`
- `apps/web/src/app/(auth)/register/actions.ts`
- `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`
- `apps/web/src/app/tenant/app/[slug]/auth/callback/route.ts`

Configurazione rilevata:

- provider: `google` via `supabase.auth.signInWithOAuth(...)`
- query params usati: `access_type=offline`, `prompt=consent`
- nel root auth viene usato `skipBrowserRedirect: true` e redirect manuale lato browser
- callback root costruita con `buildRootOAuthCallbackPath(...)`, quindi:
  - login root: `http://localhost:3000/auth/callback?oauth_flow=login`
  - register root: `http://localhost:3000/auth/callback?oauth_flow=register`
- in produzione le stesse callback usano `NEXT_PUBLIC_APP_URL`, quindi il dominio root di Styll
- per la PWA client esiste un callback distinto tenant-scoped:
  - `http://localhost:3000/tenant/app/{slug}/auth/callback`
  - in produzione: `https://{slug}-app.{domain}/auth/callback`

Aspetti legali/di contesto trovati:

- il vecchio ramo `register + Google` richiede prima la preparazione della prova legale B2B tramite:
  - `styll_b2b_register_legal_proof`
  - `styll_b2b_register_context`
- il callback root consuma poi quella prova in `finalizeGoogleRegisterTermsAcceptance(...)`
- questo ramo non e stato portato su Symfony in questa sessione per assenza di credenziali Google reali e per evitare una migrazione auth parziale e non verificabile.

---

## Sessione staff frontend bridge audit + preparazione `/api/me` — 2026-07-22

**Branch:** `feat/symfony-staff-frontend-bridge`

### Obiettivo della sessione

Verificare se `apps/web` puo sostituire la risoluzione staff di sessione/tenant/ruolo oggi basata su Supabase con il nuovo endpoint Symfony `GET /api/me`, mantenendo il comportamento produzione invariato tramite feature flag.

### Audit statico del frontend staff corrente

Ricognizione mirata sui file richiesti:

- `apps/web/src/proxy.ts`
- `apps/web/src/lib/proxy-auth-guard.ts`
- `apps/web/src/lib/tenant-context.ts`
- `apps/web/src/lib/tenant-role-guard.ts`

Stato rilevato:

- `proxy.ts` costruisce un client `@supabase/ssr` e usa `supabase.auth.getUser()` nel middleware per protezione `dashboard/admin`, redirect login/onboarding, shadow cookie validation e risoluzione tenant dashboard.
- `proxy-auth-guard.ts` riconosce come sessione plausibile solo i cookie Supabase (`/^sb-.*-auth-token...$/`) e delega il controllo utente a `getUser()` fornito da `proxy.ts`.
- `tenant-context.ts` usa ripetutamente `supabase.auth.getUser()` come fonte identita per:
  - `getStaffImpersonationState()`
  - `getActiveTenantId()`
  - `getImpersonationState()`
  - `resolveActiveProfile()`
  - `resolveActiveProfileForTenant()`
- `tenant-role-guard.ts` usa `supabase.auth.getUser()` e poi verifica ruolo/tenant con query su `staff_members` + `profiles`.

Conclusione: nel frontend staff corrente la sorgente autorevole dell'identita applicativa resta la sessione Supabase. Non esiste ancora una sessione Symfony leggibile da Next.js che possa sostituirla in modo sicuro.

### Stato reale del backend auth Symfony

Evidenze dal codice Symfony:

- `config/packages/security.yaml` espone solo `POST /api/login` via `json_login`, provider `App\Entity\User`, campo credenziale `users.email/password`.
- `src/Controller/MeController.php` richiede JWT Bearer Lexik gia valido e risolve tenant membership server-side con `StaffTenantAccessResolver`.
- `StaffTenantAccessResolver` supporta la selezione tenant sicura via header `X-Tenant-Slug`, ma solo dopo autenticazione JWT Symfony riuscita.

Ricerca nel repository:

- non e stato trovato alcun endpoint o helper di scambio `Supabase session -> Symfony JWT`;
- non e stato trovato alcun punto del frontend che ottenga o persista un JWT Symfony staff;
- non e stato trovato alcun cookie/session primitive Symfony gia compatibile con `proxy.ts`.

### DECISIONE DA CONFERMARE — serve un endpoint di scambio/bridge tra sessione Supabase e JWT Symfony, oppure una migrazione diretta dell'auth staff, prima di poter completare questo collegamento

Motivo:

- senza un JWT Symfony reale non e possibile chiamare `GET /api/me`;
- inventare un bridge lato frontend o accettare token Supabase come se fossero JWT Symfony sarebbe una decisione di sicurezza errata;
- anche con `/api/me` disponibile, il middleware Next (`proxy.ts`) resta oggi agganciato a cookie/sessione Supabase e richiede un nuovo primitive di sessione prima di poter migrare davvero i redirect auth staff.

### Stato reale utenti staff Symfony locali

Verifiche eseguite sul database Docker locale (`docker compose exec -T postgres psql -U styll -d styll`):

- `users_count = 1`
- `profiles_count = 1`
- `staff_members_count = 1`

Utente staff locale trovato:

- `email = mario.rossi.test@barbiere-di-prova.local`
- `full_name = Mario Rossi`
- `tenant_slug = barbiere-di-prova`
- `role = owner`
- `password = unused` (letterale, non hash Symfony valido)

Verifica login reale:

- `POST http://127.0.0.1:8080/api/login` con `email = mario.rossi.test@barbiere-di-prova.local` e `password = unused` risponde `401`.

Conclusione:

- gli utenti staff Symfony esistono localmente;
- almeno nello stato locale attuale non hanno ancora password valide/utilizzabili per il login Symfony;
- l'unico login Symfony sicuramente funzionante oggi e quello delle fixture test (`tests/Support/TestTenantFixture.php`, password nota solo in ambiente test: `styll-test-password-only`).

### Implementato in `apps/web` per preparare il rollout futuro

Per non rompere la produzione e non introdurre bridge improvvisati, e stato preparato solo il layer futuro, off-by-default:

- `apps/web/src/lib/symfony/api-base-url.ts`
  - helper condiviso per risolvere la base URL Symfony.
- `apps/web/src/lib/symfony/staff-client.ts`
  - client tipizzato per `GET /api/me`;
  - supporto header `Authorization: Bearer ...`;
  - supporto `X-Tenant-Slug`;
  - error taxonomy esplicita (`unauthorized`, `forbidden`, `http_error`, `network_error`, `invalid_response`);
  - feature flag `NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT`.
- `apps/web/src/lib/symfony/staff-context.ts`
  - helper server-side che consuma un eventuale cookie `styll_symfony_staff_jwt` solo se il flag e attivo;
  - non genera, non scambia e non emette JWT: evita di simulare un bridge non confermato.
- `apps/web/.env.example`
  - documentato il nuovo flag `NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT=false`.
- `apps/web/tests/unit/symfony-staff-client.test.mjs`
  - test unitari per flag, header e mapping base del client `/api/me`.

### Limite intenzionale del batch

Il nuovo client frontend non e ancora collegato a `proxy.ts`, `tenant-context.ts` o `tenant-role-guard.ts`.

Questo e intenzionale:

- senza bridge o login staff Symfony reale, collegarlo davvero produrrebbe solo rami morti o regressioni;
- il rollout sicuro richiede prima una decisione esplicita su come Next.js ottiene un JWT Symfony staff;
- solo dopo quella decisione ha senso sostituire davvero i punti di risoluzione auth/tenant/ruolo nel frontend.

### Verifiche eseguite in questa sessione

Frontend mirato:

```bash
pnpm --filter web exec node --experimental-strip-types --test tests/unit/symfony-staff-client.test.mjs
```

Risultato: `4/4` test verdi sul nuovo client `/api/me`.

Suite Symfony completa richiesta dalla sessione:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox
```

Risultato: `81/81` test verdi, `Assertions: 666`, `PHPUnit Deprecations: 3`.

---

## Sessione auth staff full Symfony + cutover dashboard/admin — 2026-07-22

**Branch:** `feat/symfony-staff-frontend-bridge`

### Decisione applicata in questa sessione

Direzione confermata: niente bridge `Supabase -> Symfony`.

Da questo punto il login staff locale passa da:

- `POST /api/login` Symfony
- JWT Symfony salvato in cookie httpOnly `styll_symfony_staff_jwt`
- `GET /api/me` come sorgente autorevole di identita, tenant e ruolo staff per Next.js

Supabase Auth non viene piu usato nei flussi staff/dashboard/admin toccati in questa sessione.

### Backend Symfony completato

Nuovo provisioning staff reale:

- `src/Command/CreateStaffUserCommand.php`
  - comando `app:create-staff-user`
  - argomenti: `email password tenant-slug [role]`
  - crea `User + Profile + StaffMember`
  - password hashata con `UserPasswordHasherInterface`
- `tests/Functional/CreateStaffUserCommandTest.php`
  - copre creazione utente, hash password, login `/api/login`, lettura `/api/me`

Nuovo endpoint per aggiornare password staff autenticata:

- `src/Controller/UpdateMyPasswordController.php`
  - `POST /api/me/password`
  - richiede JWT valido
  - verifica password attuale
  - re-hasha la nuova password
- `tests/Functional/UpdateMyPasswordEndpointTest.php`
  - copre cambio password riuscito
  - copre rifiuto con password attuale errata

### Utente staff locale creato e usato nei test reali HTTP

Comando eseguito nel container locale:

```bash
docker compose exec -T php php bin/console app:create-staff-user owner@barbiere-di-prova.local 'Owner-Bridge-2026!' barbiere-di-prova owner --full-name 'Owner Barbiere di Prova'
```

Utente creato:

- email: `owner@barbiere-di-prova.local`
- tenant: `barbiere-di-prova`
- ruolo: `owner`

Problema runtime trovato e corretto:

- `POST /api/login` inizialmente falliva con `500`
- causa: permessi non corretti sulle chiavi JWT Lexik nel container PHP runtime
- fix applicato localmente: owner/group `www-data`, permessi `640` su `private.pem`, `644` su `public.pem`

Secondo problema runtime trovato e corretto:

- il nuovo route `POST /api/me/password` passava nei test ma rispondeva `404` via HTTP locale
- causa: cache `prod` del container non riallineata
- fix applicato: `docker compose exec -T php php bin/console cache:clear`
- dopo il clear, `debug:router` espone correttamente `POST /api/me/password`

### Verifiche HTTP reali backend

Con l'utente locale sopra:

- `POST http://127.0.0.1:8080/api/login`
  - risultato reale: `200`
  - restituisce JWT valido
- `GET http://127.0.0.1:8080/api/me` con Bearer JWT
  - risultato reale: `200`
  - restituisce `currentTenant.slug = barbiere-di-prova`
  - restituisce `currentRole = owner`
- `POST http://127.0.0.1:8080/api/me/password`
  - risultato reale dopo `cache:clear`: `200 {"success":true}`
  - login con password vecchia dopo update: `401`
  - login con password nuova dopo update: `200`
  - rollback alla password iniziale rieseguito via stesso endpoint: `200`
  - login finale con password iniziale ripristinata: `200`

### Frontend staff migrato a Symfony JWT

Sessione/cookie:

- `apps/web/src/lib/symfony/staff-session.ts`
  - helper cookie `styll_symfony_staff_jwt`
- `apps/web/src/lib/symfony/staff-client.ts`
  - contesto Symfony staff abilitato di default
- `apps/web/src/lib/symfony/staff-context.ts`
  - lettura JWT da cookie
  - `getOptionalSymfonyStaffMe()` e `getOptionalSymfonyStaffMeFromRequest()`
  - membership list da `/api/me`

Login/logout staff:

- `apps/web/src/app/api/auth/staff/login/route.ts`
  - chiama `POST /api/login`
  - valida il JWT con `GET /api/me`
  - salva `styll_symfony_staff_jwt`
- `apps/web/src/app/api/auth/staff/logout/route.ts`
  - cancella JWT staff e cookie shadow/impersonation
- `apps/web/src/components/auth/login-form.tsx`
  - non usa piu `supabase.auth.signInWithPassword`
  - chiama il route handler staff Symfony
  - link "Password dimenticata?" rimosso dal form finche non esiste un reset password Symfony equivalente
- `apps/web/src/app/(auth)/login/page.tsx`
  - login staff minimo lasciato solo email/password

Middleware e risoluzione identita staff:

- `apps/web/src/proxy.ts`
- `apps/web/src/lib/proxy-auth-guard.ts`
- `apps/web/src/lib/tenant-context.ts`
- `apps/web/src/lib/tenant-role-guard.ts`

Ora usano `GET /api/me` + JWT Symfony come sorgente di verita per:

- autenticazione staff middleware
- redirect dashboard
- tenant attivo
- ruolo staff
- shadow mode / impersonation validation

### Aree dashboard/admin portate su Symfony

Layout e pagine:

- `apps/web/src/app/dashboard/layout.tsx`
- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/(auth)/select-tenant/page.tsx`
- tenant dashboard pages principali (`page`, `clienti`, `calendario`, `team`, `profilo`, `marketing`, `catalogo`, `vendite`, `analytics`, `notifiche`)

Action/modules staff migrate da `supabase.auth.getUser()` a contesto Symfony:

- `apps/web/src/lib/actions/dashboard-home.ts`
- `apps/web/src/lib/actions/profilo.ts`
- `apps/web/src/lib/actions/team.ts`
- `apps/web/src/lib/actions/calendario.ts`
- `apps/web/src/lib/actions/appointments.ts`
- `apps/web/src/lib/actions/notifiche.ts`
- `apps/web/src/lib/actions/clienti.ts`
- `apps/web/src/app/dashboard/actions/staff-impersonation.ts`

Superadmin/admin locali migrati a `requireSuperadmin()` basato su Symfony:

- `apps/web/src/app/admin/actions.ts`
- `apps/web/src/app/admin/actions-tenants.ts`
- `apps/web/src/app/admin/tenants/[tenantId]/products/actions.ts`
- `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/actions.ts`

Fix funzionale aggiuntivo:

- `apps/web/src/app/tenant/dashboard/[slug]/notifiche/page.tsx`
  - non usa piu `getTenantBySlug(slug)` come dipendenza rigida
  - usa il tenant gia risolto dal contesto Symfony
  - elimina il `404` locale sulla pagina notifiche per utenti staff creati solo in Symfony

### Verifiche HTTP reali frontend

Login staff Next.js:

```bash
curl -i -sS -c /tmp/styll-symfony-auth-localhost.cookies -b /tmp/styll-symfony-auth-localhost.cookies \
  -X POST http://localhost:3000/api/auth/staff/login \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{"email":"owner@barbiere-di-prova.local","password":"Owner-Bridge-2026!"}'
```

Risultato reale:

- `HTTP/1.1 200 OK`
- `Set-Cookie: styll_symfony_staff_jwt=...; HttpOnly`
- body: `{"success":true,"currentTenantSlug":"barbiere-di-prova","tenantCount":1}`

Routing/render staff locale con lo stesso cookie:

- `/dashboard`
  - redirect corretto al tenant staff
- `/tenant/dashboard/barbiere-di-prova`
  - `200`
- `/tenant/dashboard/barbiere-di-prova/clienti`
  - `200`
- `/tenant/dashboard/barbiere-di-prova/notifiche`
  - `200`
- `/tenant/dashboard/barbiere-di-prova/team`
  - `200`
- `/tenant/dashboard/barbiere-di-prova/calendario`
  - `200`
- `/tenant/dashboard/barbiere-di-prova/profilo`
  - `200`
- `/admin`
  - `307` pulito per l'utente owner locale non-superadmin

Check contenuti/errori sui path sopra:

- nessun `NEXT_HTTP_ERROR_FALLBACK`
- nessun `ReferenceError`
- nessun `Forbidden`

### Ricognizione finale sui residui Supabase auth

Grep finale eseguito su:

- `apps/web/src/lib/actions`
- `apps/web/src/app/dashboard`
- `apps/web/src/app/tenant/dashboard`
- `apps/web/src/app/admin`
- `apps/web/src/components/dashboard`

Risultato:

- non restano piu riferimenti `supabase.auth.getUser()` nel perimetro staff/dashboard/admin migrato
- i riferimenti residui sono fuori da questo batch staff e riguardano:
  - PWA cliente (`pwa-home`, `pwa-auth`, `pwa-client-actions`)
  - auth cliente (`client-auth`)
  - notifiche cliente (`client-notifications`)
  - preferiti/wishlist cliente
  - creazione booking cliente
  - `platform-notifiche`
  - `invitations`

### Limiti e debito residuo esplicito

- non esiste ancora un flusso "forgot password via email" equivalente lato Symfony per lo staff
- e stato rimosso il link dal form login per evitare un percorso staff che punterebbe ancora a Supabase
- il cambio password autenticato dentro `Profilo > Privacy & Sicurezza` ora passa da Symfony
- `pnpm type-check` resta rosso solo per il blocco inbox AI WhatsApp fuori scope, non per i file della migrazione staff Symfony

### Verifiche eseguite in questa sessione

Frontend mirato:

```bash
pnpm --filter web exec node --experimental-strip-types --test tests/unit/symfony-staff-client.test.mjs src/lib/proxy-auth-guard.test.ts
```

Risultato reale: `12/12` test verdi.

Symfony mirato:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit tests/Functional/CreateStaffUserCommandTest.php tests/Functional/UpdateMyPasswordEndpointTest.php
```

Risultato reale: `3/3` test verdi, `38 assertions`.

Suite Symfony completa richiesta dalla sessione:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox
```

Risultato reale: `84/84` test verdi, `Assertions: 704`, `PHPUnit Deprecations: 3`.

---

## Sessione fix precisione timestamp PostgreSQL/Doctrine — 2026-07-21

**Branch:** `fix/doctrine-timestamp-precision`

### Bug

Letture Doctrine su righe scritte da PostgreSQL con `now()`/trigger `set_updated_at()` fallivano con:

```text
Doctrine\DBAL\Types\Exception\InvalidFormat:
Could not convert database value "... .123456+00" to Doctrine Type Doctrine\DBAL\Types\DateTimeTzImmutableType.
Expected format "Y-m-d H:i:sO"
```

### Causa

PostgreSQL `TIMESTAMPTZ` preserva microsecondi per valori generati da `now()`.
Doctrine DBAL 4/ORM 3, nel tipo standard `datetimetz_immutable`, prova a parsare solo il formato della piattaforma senza frazioni di secondo (`Y-m-d H:i:sO`). Il bug quindi non è legato a una singola tabella: qualunque entity con `datetimetz_immutable` può fallire quando il valore arriva dal database con microsecondi.

### Portata quantificata

Ricognizione su `symfony-app/docker/postgres/init/*.sql` e `symfony-app/migrations/*.php`:

- **19 tabelle con trigger `*_updated_at`:**
  - `appointments`
  - `client_analytics`
  - `client_loyalty`
  - `clients`
  - `email_templates`
  - `locations`
  - `loyalty_configs`
  - `message_templates`
  - `platform_leads`
  - `product_inventory`
  - `products`
  - `profiles`
  - `promotions`
  - `rewards`
  - `services`
  - `staff_members`
  - `tenant_subscriptions`
  - `tenants`
  - `users`
- **56 tabelle con almeno un timestamp `DEFAULT now()` / `DEFAULT NOW()` / `DEFAULT CURRENT_TIMESTAMP` o equivalente nei DDL/migration esistenti.**

Conclusione: il problema riguarda sia righe aggiornate da trigger sia righe create con default PostgreSQL, incluse tabelle senza trigger esplicito.

### Confronto opzioni

**Opzione A — normalizzare PostgreSQL a secondi (`date_trunc('second', now())`)**

- Pro: dati sempre compatibili col parser standard Doctrine.
- Contro: richiede modifiche diffuse a trigger, default storici e migration; perde precisione nativa e può degradare audit/event ordering futuro.

**Opzione B — custom type Doctrine per `datetimetz_immutable`**

- Pro: risolve tutte le entity in un punto solo, non richiede riscrittura dati, mantiene precisione PostgreSQL nativa e accetta dati già sporchi.
- Contro: introduce un tipo DBAL applicativo da mantenere.

### Decisione presa

Scelta **Opzione B**: nuovo `App\Doctrine\PostgresDateTimeTzImmutableType`, registrato in `config/packages/doctrine.yaml` come override globale di `datetimetz_immutable`.

Motivo: per un backend production-ready è più corretto accettare il formato valido prodotto da PostgreSQL invece di ridurre la precisione dello schema e normalizzare a mano ogni tabella presente/futura.

### Implementato

- `src/Doctrine/PostgresDateTimeTzImmutableType.php`
  - scrive valori PHP preservando microsecondi (`Y-m-d H:i:s.uO`);
  - legge prima col parser standard Doctrine;
  - in fallback usa `DateTimeImmutable` nativo, che accetta timestamp PostgreSQL con microsecondi e timezone.
- `config/packages/doctrine.yaml`
  - override globale `datetimetz_immutable: App\Doctrine\PostgresDateTimeTzImmutableType`.
- `tests/Integration/PostgresTimestampPrecisionIntegrationTest.php`
  - crea `Tenant`, `StaffMember`, `Client`;
  - aggiorna le righe via SQL per far scattare i trigger PostgreSQL;
  - svuota l'EntityManager e rilegge da Doctrine verificando che non fallisca l'hydration.

### Verifiche

Test mirato:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --colors=never tests/Integration/PostgresTimestampPrecisionIntegrationTest.php
```

Risultato: **OK** — 1 test, 12 assertion.

Verifica dati locali già esistenti (`barbiere-di-prova`) dopo cache clear Symfony:

```bash
curl http://localhost:8080/api/public/tenants/barbiere-di-prova
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/staff-members
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/locations
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/services
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/service-categories
```

Risultato: tutti **200**, senza normalizzare manualmente i dati esistenti.

---

## Sessione public API landing tenant — 2026-07-21

**Branch:** `feat/public-api-readonly`

## Sessione landing Symfony full migration — 2026-07-21

**Branch:** `feat/symfony-landing-full-migration`

### Obiettivo

Rendere la landing pubblica tenant completamente servita da Symfony, eliminando il fallback Supabase usato dal frontend per alcuni campi mancanti.

### Decisioni

- **DECISIONE PRESA — i campi landing del tenant restano in `tenants.settings` JSONB.**
  Non e stata introdotta una nuova tabella o nuove colonne dedicate su `tenants`: i campi `tagline`, `bio/description`, `hero_image_url`, `about.*`, `google_rating`, `google_reviews_count`, `team_description`, `locations_description`, `contact_phone`, `contact_email`, `social_links` sono configurazione editoriale, non richiedono query/filtering relazionale, e hanno gia un contenitore persistente coerente nello schema Symfony.
- **DECISIONE PRESA — aggiungere colonne solo dove mancava struttura reale.**
  Sono state aggiunte solo le colonne assenti necessarie a esprimere media/visibilita o metadata catalogo pubblici: `locations.photo_url`, `locations.photos`, `locations.show_on_website`, `staff_members.show_on_website`, `services.show_on_website`, `products.description`, `products.display_order`, `products.show_on_site`.
- **DECISIONE PRESA — `products.available` e derivato, non persistito.**
  Il flag pubblico viene calcolato da `product_inventory.quantity > 0` tramite relazione Doctrine `Product -> ProductInventory`.

### Implementato

- Migration Doctrine `Version20260721133000`:
  - `locations.photo_url`
  - `locations.photos` (`JSONB`)
  - `locations.show_on_website`
  - `staff_members.show_on_website`
  - `services.show_on_website`
  - `products.description`
  - `products.display_order`
  - `products.show_on_site`
  - indici pubblici tenant-scoped per locations, staff, services, products
- `Tenant` espone nei serializer group `public:read` i campi landing derivati da `settings`, senza esporre il JSON completo.
- `Location` espone `photoUrl` e `photos`; `StaffMember` espone `role`; `Product` espone `description` e `available`.
- `PublicTenantResourceProvider` filtra ora anche `show_on_website` / `show_on_site` per resources pubbliche e promozioni collegate.
- Bootstrap SQL `docker/postgres/init/*.sql` allineato al nuovo schema per fresh volumes locali.
- Fixture/test funzionali aggiornati per verificare:
  - esposizione dei nuovi campi pubblici;
  - esclusione record hidden;
  - disponibilita prodotto derivata da inventario.

### Implementato

- API Platform pubbliche read-only, senza JWT, sotto path tenant-scoped:
  - `GET /api/public/tenants/{slug}`
  - `GET /api/public/tenants/{slug}/tenant`
  - `GET /api/public/tenants/{slug}/locations`
  - `GET /api/public/tenants/{slug}/locations/{id}`
  - `GET /api/public/tenants/{slug}/service-categories`
  - `GET /api/public/tenants/{slug}/service-categories/{id}`
  - `GET /api/public/tenants/{slug}/services`
  - `GET /api/public/tenants/{slug}/services/{id}`
  - `GET /api/public/tenants/{slug}/staff-members`
  - `GET /api/public/tenants/{slug}/staff-members/{id}`
  - `GET /api/public/tenants/{slug}/products`
  - `GET /api/public/tenants/{slug}/products/{id}`
  - `GET /api/public/tenants/{slug}/gallery-photos`
  - `GET /api/public/tenants/{slug}/gallery-photos/{id}`
  - `GET /api/public/tenants/{slug}/portfolio-photos`
  - `GET /api/public/tenants/{slug}/portfolio-photos/{id}`
  - `GET /api/public/tenants/{slug}/website-photos`
  - `GET /api/public/tenants/{slug}/website-photos/{id}`
  - `GET /api/public/tenants/{slug}/promotions`
  - `GET /api/public/tenants/{slug}/promotions/{id}`
  - `GET /api/public/tenants/{slug}/promotion-services`
  - `GET /api/public/tenants/{slug}/promotion-services/{id}`
  - `GET /api/public/tenants/{slug}/promotion-products`
  - `GET /api/public/tenants/{slug}/promotion-products/{id}`
- Nuovo provider `App\State\PublicTenantResourceProvider`:
  - risolve tenant attivo da `{slug}`;
  - imposta esplicitamente `tenant_filter` anche senza JWT;
  - applica filtri pubblici (`isActive`, `deletedAt IS NULL`, `isVisible`, promozioni attive e `showOnLanding`);
  - restituisce 404 per item non appartenenti allo slug tenant richiesto.
- Nuovo serializer group `public:read`, separato dai gruppi interni già presenti.
- `config/packages/security.yaml`: `^/api/public` aperto con `PUBLIC_ACCESS`.
- `config/packages/api_platform.yaml`: abilitato anche `application/json`, mantenendo `application/ld+json`.
- Test funzionale `PublicTenantResourcesEndpointTest` per:
  - accesso senza JWT;
  - scoping per slug;
  - blocco cross-tenant sugli item;
  - assenza di campi sensibili nei JSON pubblici.

### Decisioni

- **DECISIONE PRESA — tenant pubblico da slug nel path.** Le API pubbliche non accettano `tenant_id` dal client. Il tenant viene risolto da `{slug}` nel path e il provider applica il `TenantFilter` con l'id server-side del tenant attivo.
- **DECISIONE PRESA — nessuna collection globale tenant.** `Tenant` espone `GET /api/public/tenants/{slug}` e una collection scoped a singolo tenant (`/tenant`) per rispettare il requisito `GetCollection` senza aprire una lista pubblica di tenant.

### Nota storica

- La necessità di `products.show_on_site` è stata chiusa nella sessione `feat/symfony-landing-full-migration` del 2026-07-21, con migration Doctrine dedicata e filtro pubblico applicato anche ai prodotti/promozioni collegate.

### Verifiche

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --colors=never tests/Functional/PublicTenantResourcesEndpointTest.php
```

Risultato: **OK** — 35 test, 372 assertion. PHPUnit segnala 3 deprecation preesistenti/di suite.

```bash
docker compose exec -T php env APP_ENV=test php bin/console doctrine:schema:validate --skip-sync
```

Risultato: mapping Doctrine **OK**, sync DB saltato intenzionalmente.

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --colors=never
```

Risultato: **OK** — 72 test, 515 assertion. PHPUnit segnala 3 deprecation.

### Aggiornamento verifica Docker reale + fix JWT test runtime — 2026-07-21

Contesto: la prima soluzione provata per i test JWT usava keypair committata in `config/jwt/test/`, ma la verifica corretta nel container reale mostrava ancora il fallimento `An error occurred while trying to encode the JWT token`.

#### Causa reale

- Il `docker-compose.yml` della root monta `jwt_keys:/var/www/config/jwt`.
- Questo volume Docker sovrascrive il contenuto versionato sotto `config/jwt/` dentro il container `php`.
- Di conseguenza, una keypair test committata nel repository a quel path non viene realmente vista dal processo PHPUnit eseguito con `docker compose exec`.

#### Correzione applicata

- `config/packages/lexik_jwt_authentication.yaml`
  - in `when@test` le chiavi JWT sono state spostate da `config/jwt/test/*` a `var/jwt/test/*`
- `tests/bootstrap.php`
  - genera a runtime la keypair test in `var/jwt/test/`
  - usa lock file per evitare race tra processi
  - valida eventuali chiavi già presenti prima di riusarle
- `config/packages/api_platform.yaml` + `config/api_metadata/public_properties.yaml`
  - metadati YAML espliciti per far esporre ad API Platform i campi landing derivati (`Tenant.publicTagline`, `Location.photoUrl`, `Product.description`, ecc.) che il property name collection chain non stava includendo in modo affidabile

#### Verifica reale nel container

Comando eseguito:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox
```

Risultato in quella sessione: **75/75 verdi**, `Tests: 75, Assertions: 611, PHPUnit Deprecations: 3.`

#### Stato Git/GitHub

- branch pushata: `feat/symfony-landing-full-migration`
- PR aperta verso `main`: `#6` — `https://github.com/tvwebspecialist/Styll-Symfony/pull/6`
- non mergeata

---

## Sessione auth staff JWT + tenant context — 2026-07-21

**Branch:** `feat/symfony-staff-auth-context`

### Obiettivo

Implementare il primo contratto backend Symfony per la dashboard staff:

- endpoint autenticato `GET /api/me`
- profilo utente/profilo staff
- tenant corrente e ruolo corrente
- altri tenant accessibili per utenti multi-tenant
- prima forma di tenant selection server-side compatibile con il pattern frontend basato su slug

### Decisioni

- **DECISIONE PRESA — il tenant corrente puo essere richiesto solo via slug, mai via `tenant_id` client-side.**
  Il backend accetta solo segnali opzionali di slug (`X-Tenant-Slug`, `tenantSlug`, `_tenant_slug`) e li interseca sempre con le membership staff attive del chiamante.
- **DECISIONE PRESA — fallback conservativo alla prima membership attiva.**
  In assenza di slug esplicito, il tenant corrente lato Symfony resta la prima `staff_members` attiva ordinata per `created_at`, coerente col fallback gia presente oggi nel frontend.
- **DECISIONE DA CONFERMARE — parita completa con shadow mode/superadmin rinviata.**
  Il frontend Next oggi supporta `profiles.is_superadmin` e cookie di shadow impersonation; lo schema/entity Symfony corrente non espone ancora questo campo e non persiste una selezione tenant “attiva” indipendente dal request slug. Questo slice implementa il percorso staff standard, ma la parita completa con admin shadow mode richiede un passaggio dedicato di modello dati e contratto auth.

### Implementato

- Nuovo resolver `App\Security\StaffTenantAccessResolver`
  - legge le membership attive direttamente dal DB senza dipendere dal Doctrine `tenant_filter`
  - risolve il tenant corrente da slug richiesto oppure fallback
  - evita di fidarsi di `tenant_id` dal client
- Nuovi value object:
  - `App\Security\StaffTenantMembership`
  - `App\Security\ResolvedStaffAccess`
- `App\Security\TenantContext`
  - ora usa lo stesso resolver condiviso invece di una query ORM locale scollegata
  - il `tenant_filter` applicativo eredita quindi la stessa semantica di tenant selection usata da `/api/me`
- Nuovo controller `App\Controller\MeController`
  - `GET /api/me`
  - ritorna `user`, `profile`, `currentTenant`, `currentRole`, `otherTenants`
  - risponde `403` quando il client richiede esplicitamente uno slug fuori dalle membership attive
- Fixture/test support
  - `TestTenantFixture::seedMultiTenantStaffUser()`
  - `TestTenantFixture::addStaffMembership()`
- Test aggiunti/aggiornati
  - `tests/Functional/MeEndpointTest.php`
  - `tests/Functional/ClientsEndpointTest.php`
    - prova che la tenant selection via slug influenza davvero anche un endpoint tenant-filtered (`/api/clients`)
  - `tests/Security/TenantContextTest.php`
    - riallineato al nuovo resolver condiviso

### Verifica reale nel container

Comando eseguito:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox
```

Output finale:

```text
OK, but there were issues!
Tests: 81, Assertions: 666, PHPUnit Deprecations: 3.
```

Nota: i log `Method Not Allowed` sugli `OPTIONS /api/clients` e i `Not Found` trasformati in Error resource restano rumore di suite gia presente; la run Docker esce `0` ed e la verifica autoritativa del batch.

---

## FASE 2 — Growth extras: promotions — 2026-07-21

**Commit:** `feat(promotions): add promotion tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721120654` per:
  - `promotions`
  - `promotion_services`
  - `promotion_products`
- Entità Doctrine + repository:
  - `Promotion` / `PromotionRepository`
  - `PromotionService` / `PromotionServiceRepository`
  - `PromotionProduct` / `PromotionProductRepository`
- API Platform read-only `GetCollection` per consultazione dashboard, senza operazioni di scrittura finché non sono definiti Voter/permessi di ruolo.
- Test `PromotionTenantIsolationIntegrationTest` per verificare che `TenantFilter` isoli promozioni e righe ponte per tenant.

### Note di mapping

- La migration è nata da `doctrine:migrations:diff` e poi ridotta al solo gruppo logico, perché il diff Doctrine continua a vedere drift storico tra DDL bootstrap e mapping baseline.
- I vincoli `CHECK` Supabase su `discount_type` sono preservati nella migration.
- `promotions.updated_at` usa trigger PostgreSQL `set_updated_at()` e lifecycle callback Doctrine.

---

## FASE 2 — Growth extras: import/onboarding/auth tokens — 2026-07-21

**Commit:** `feat(import): add import and onboarding tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721120852` per:
  - `client_import_jobs`
  - `team_invitations`
  - `onboarding_tokens`
  - `email_verification_tokens`
- Entità Doctrine + repository:
  - `ClientImportJob` / `ClientImportJobRepository`
  - `TeamInvitation` / `TeamInvitationRepository`
  - `OnboardingToken` / `OnboardingTokenRepository`
  - `EmailVerificationToken` / `EmailVerificationTokenRepository`
- API Platform read-only `GetCollection` per `ClientImportJob` e `TeamInvitation`; token sensibili non sono inclusi nei gruppi serializer.
- Test `ImportAuthTenantIsolationIntegrationTest` per verificare isolamento tenant su `client_import_jobs` e `team_invitations`.

### Note di mapping

- `initiated_by` e `created_by` sono mappati a `Profile`, coerentemente con le altre entità Symfony che sostituiscono `auth.users` con `profiles`/`users`.
- `onboarding_tokens` ed `email_verification_tokens` non hanno `tenant_id` nella specifica e restano tabelle interne non esposte via API Platform.
- `client_import_jobs.merged_count` include la patch Supabase successiva `20260706000002_client_import_jobs_merge_count.sql`.

---

## FASE 2 — Growth extras: notifications/push — 2026-07-21

**Commit:** `feat(notifications): add notification tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721121015` per:
  - `notifications`
  - `notification_log`
  - `push_subscriptions`
- Entità Doctrine + repository:
  - `Notification` / `NotificationRepository`
  - `NotificationLog` / `NotificationLogRepository`
  - `PushSubscription` / `PushSubscriptionRepository`
- API Platform read-only `GetCollection` per `Notification`.
- Test `NotificationTenantIsolationIntegrationTest` per verificare isolamento tenant su notifiche, log invii e push subscription.

### Note di mapping

- `notifications` usa `profile_id` nullable e `meta` JSONB, coerente con le migrazioni Supabase operative più recenti e con il codice legacy che legge notifiche staff/client.
- `push_subscriptions` segue la specifica infrastrutturale archiviata con `tenant_id` nullable, `p256dh_key`, `auth_key`, `device_label`, `last_used_at`.
- `notification_log` include `promotion_id`, aggiunto dalla patch Supabase `20260625000001_notification_log_promotion_id.sql`.

---

## FASE 2 — Growth extras: messaging — 2026-07-21

**Commit:** `feat(messaging): add messaging tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721121146` per:
  - `message_templates`
  - `messages_log`
  - `messaging_outbox`
- Entità Doctrine + repository:
  - `MessageTemplate` / `MessageTemplateRepository`
  - `MessageLog` / `MessageLogRepository`
  - `MessagingOutbox` / `MessagingOutboxRepository`
- API Platform read-only `GetCollection` per `MessageTemplate` e `MessageLog`; `MessagingOutbox` resta interna/worker-side.
- Test `MessagingTenantIsolationIntegrationTest` per verificare isolamento tenant su template, log e outbox.

### Note di mapping

- Lo schema segue la specifica v1 archiviata in `docs/_archivio-supabase/database-schema-supabase.md`, non il sottosistema inbox WhatsApp AI v2/v3.
- `message_templates.updated_at` usa trigger PostgreSQL `set_updated_at()` e lifecycle callback Doctrine.
- `messaging_outbox` mantiene `payload` JSONB e `idempotency_key` univoca come coda operativa server-side.

---

## FASE 3 — Legal / Privacy / GDPR: privacy and consent proof — 2026-07-21

**Commit:** `feat(privacy): add GDPR privacy consent tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721123103` per:
  - `client_privacy_requests`
  - `marketing_unsubscribe_tokens`
  - `analytics_consent_events`
- Entità Doctrine + repository:
  - `ClientPrivacyRequest` / `ClientPrivacyRequestRepository`
  - `MarketingUnsubscribeToken` / `MarketingUnsubscribeTokenRepository`
  - `AnalyticsConsentEvent` / `AnalyticsConsentEventRepository`
- Nessuna entità del gruppo espone `ApiResource`: letture/scritture API GDPR richiedono una sessione dedicata di autorizzazione.
- Test `PrivacyConsentTenantIsolationIntegrationTest` per verificare isolamento tenant su `client_privacy_requests` e `marketing_unsubscribe_tokens`.

### Note di mapping

- I valori enum Supabase sono mappati come stringhe con `CHECK` constraint in migration, coerentemente con le convenzioni Symfony del progetto.
- `analytics_consent_events` mantiene `ip_address INET` e il trigger append-only `trg_guard_analytics_consent_events_append_only` della specifica Supabase.
- `client_privacy_requests` resta un audit trail append-only a livello di modello applicativo; la migrazione Supabase originale non definiva un trigger DB di immutabilità per questa tabella.

---

## FASE 3 — Legal / Privacy / GDPR: legal acceptance — 2026-07-21

**Commit:** `feat(legal): add legal acceptance tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721123319` per:
  - `legal_acceptance_events`
  - `legal_acceptance_pending`
- Entità Doctrine + repository:
  - `LegalAcceptanceEvent` / `LegalAcceptanceEventRepository`
  - `LegalAcceptancePending` / `LegalAcceptancePendingRepository`
- Nessuna entità del gruppo espone `ApiResource`: letture/scritture API legal richiedono una sessione dedicata di autorizzazione.
- Test `LegalAcceptanceTenantIsolationIntegrationTest` per verificare isolamento tenant su `legal_acceptance_events`.

### Note di mapping

- `legal_acceptance_events.tenant_id` resta nullable come nello schema Supabase: gli eventi possono nascere prima del backfill tenant e diventare tenant-scoped dopo.
- Il trigger `legal_acceptance_events_guard_immutability` replica la regola Supabase: righe immutabili salvo un solo backfill `tenant_id` da `NULL` a valore.
- `legal_acceptance_pending` è globale/interna e non ha `tenant_id`; contiene hash token one-shot e non viene esposta via API.

---

## FASE 4 — Admin/Platform: admin global — 2026-07-21

**Commit:** `feat(admin): add global admin tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721125231` per:
  - `admin_audit_log`
  - `admin_settings`
  - `email_templates`
- Entità Doctrine + repository:
  - `AdminAuditLog` / `AdminAuditLogRepository`
  - `AdminSetting` / `AdminSettingRepository`
  - `EmailTemplate` / `EmailTemplateRepository`
- Nessuna `ApiResource` per queste tabelle: audit/settings/template globali sono superfici admin sensibili.
- `TenantFilter::EXCLUDED_ENTITIES` aggiornato per le tre entità globali/admin.
- Test `AdminGlobalTenantFilterIntegrationTest` per verificare che queste tabelle non vengano filtrate dal tenant corrente.

### Note di mapping

- `admin_audit_log.tenant_id` resta nullable come da schema Supabase: è un log piattaforma con riferimento opzionale a tenant, non ownership tenant-scoped.
- `admin_settings` usa primary key testuale `key`.
- `email_templates` sono globali e includono seed idempotente dei template base nella migration.

---

## FASE 4 — Admin/Platform: platform notifications/leads/metering — 2026-07-21

**Commit:** `feat(platform): add platform notification and metering tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721125402` per:
  - `platform_notifications`
  - `platform_leads`
  - `tenant_usage_counters`
- Entità Doctrine + repository:
  - `PlatformNotification` / `PlatformNotificationRepository`
  - `PlatformLead` / `PlatformLeadRepository`
  - `TenantUsageCounter` / `TenantUsageCounterRepository`
- `TenantFilter::EXCLUDED_ENTITIES` aggiornato per `PlatformNotification` e `PlatformLead`; `TenantUsageCounter` resta tenant-scoped.
- Test `PlatformMeteringTenantFilterIntegrationTest`: platform notifications/leads non sono filtrate per tenant, tenant usage counters sì.

### Note di mapping

- `platform_notifications.tenant_id` è nullable e rappresenta contesto, non ownership tenant-scoped: la tabella è visibile solo a superadmin lato autorizzazione futura.
- I trigger Supabase automatici su `tenants`/`profiles` non sono stati portati: la versione Symfony corrente di `profiles` non ha una colonna `email`, mentre il trigger legacy `fn_platform_notif_user_registered()` la referenzia.
- `tenant_usage_counters` usa primary key composta `(tenant_id, period_month, metric)` e metriche della migrazione Supabase messaging foundation (`sms_sent`, `whatsapp_sent`, `email_sent`, `push_sent`, `ai_requests`, `ai_input_tokens`, `ai_output_tokens`).

---

## FASE 4 — Admin/Platform: tenant media — 2026-07-21

**Commit:** `feat(media): add tenant media tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721125554` per:
  - `gallery_photos`
  - `website_photos`
  - `portfolio_photos`
- Entità Doctrine + repository:
  - `GalleryPhoto` / `GalleryPhotoRepository`
  - `WebsitePhoto` / `WebsitePhotoRepository`
  - `PortfolioPhoto` / `PortfolioPhotoRepository`
- API Platform read-only `GetCollection` per le tre entità media, con gruppo serializer `media:read`.
- Test `MediaTenantIsolationIntegrationTest` per verificare isolamento tenant su tutte le tabelle media.

### Note di mapping

- `gallery_photos` e `portfolio_photos` seguono le migrazioni Supabase legacy.
- `website_photos` non ha un DDL Supabase archiviato trovato; è stato ricostruito dai tipi/schema legacy (`id`, `tenant_id`, `url`, `sort_order`, `created_at`) e mantenuto tenant-scoped.
- `portfolio_photos.service_tags` resta `TEXT[]` lato database; l'entità lo espone come stringa array-literal per evitare mapping custom DBAL.

---

## Sessione Doctrine entities Area 6 + Area 3 — 2026-07-20

Obiettivo: estendere le entità Doctrine mancanti per `symfony-app`, mantenendo il pattern esistente di mapping ORM e la compatibilità con `TenantFilter`.

### Vincoli operativi emersi nella sessione

- `git pull --ff-only` non eseguibile in questa sessione: `error: cannot open '.git/FETCH_HEAD': Operation not permitted`
- `git checkout -b symfony-entities-loyalty` non eseguibile in questa sessione: `.git` è montato in sola lettura e Git non può creare `refs/heads/...lock`
- Di conseguenza i commit richiesti non sono materialmente eseguibili dall'ambiente corrente, anche se i file applicativi sono stati aggiornati

### DECISIONE DA CONFERMARE — conteggio totale tabelle

Nel contesto utente il totale dichiarato è **39 tabelle**, ma il DDL presente in `symfony-app/docker/postgres/init/*.sql` contiene attualmente **32** `CREATE TABLE IF NOT EXISTS`.

Scelta operativa presa il **20 luglio 2026**: usare il DDL reale nel repository come fonte di verità, coerentemente con `AGENTS.md`.

Tabelle rilevate dal DDL corrente:

- Area 1: `subscription_plans`, `tenants`, `locations`, `tenant_subscriptions`
- Area 2: `staff_members`, `staff_locations`
- Area 3: `service_categories`, `services`, `staff_services`, `products`, `product_inventory`, `client_product_wishlist`
- Area 5: `clients`, `client_notes`, `client_consents`, `client_analytics`
- Area 4: `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products`, `payments`
- Area 6: `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions`, `tier_configs`, `badges`, `client_badges`
- Area auth/shared: `users`, `profiles`

### FASE 1 — Area 6: Loyalty & Gamification

**Commit previsto:** `feat: entità Doctrine Area 6 - Loyalty & Gamification`  
**Stato commit:** non eseguibile nell'ambiente corrente (`.git` read-only)

#### Implementato

Entità Doctrine aggiunte:

- `src/Entity/LoyaltyConfig.php`
- `src/Entity/Reward.php`
- `src/Entity/ClientLoyalty.php`
- `src/Entity/LoyaltyTransaction.php`
- `src/Entity/RewardRedemption.php`
- `src/Entity/TierConfig.php`
- `src/Entity/Badge.php`
- `src/Entity/ClientBadge.php`

Repository aggiunti:

- `src/Repository/LoyaltyConfigRepository.php`
- `src/Repository/RewardRepository.php`
- `src/Repository/ClientLoyaltyRepository.php`
- `src/Repository/LoyaltyTransactionRepository.php`
- `src/Repository/RewardRedemptionRepository.php`
- `src/Repository/TierConfigRepository.php`
- `src/Repository/BadgeRepository.php`
- `src/Repository/ClientBadgeRepository.php`

Test di integrazione aggiunto:

- `tests/Integration/LoyaltyTenantIsolationIntegrationTest.php`

#### Scelte di mapping

- Tutte le tabelle tenant-scoped usano lo stesso pattern già presente nelle entità di Area 4/5:
  relazione `ManyToOne` verso `Tenant` con join column esplicita `tenant_id`, così `TenantFilter` continua a intercettarle senza modifiche infrastrutturali.
- Le tabelle con `updated_at` e trigger SQL (`loyalty_configs`, `rewards`, `client_loyalty`) usano anche `#[ORM\HasLifecycleCallbacks]` con `onPreUpdate()` coerente al pattern corrente.
- `reward_redemptions.confirmed_by` è stato mappato verso `StaffMember`, coerentemente con il DDL.

#### Verifica Area 6

Comando eseguito il **20 luglio 2026**:

```bash
cd symfony-app && php bin/console doctrine:schema:validate --skip-sync
```

Risultato:

```text
Mapping
-------

 [OK] The mapping files are correct.

Database
--------

 [SKIPPED] The database was not checked for synchronicity.
```

Test mirato eseguito:

```bash
cd symfony-app && ./bin/phpunit tests/Integration/LoyaltyTenantIsolationIntegrationTest.php
```

Risultato: **non eseguibile fino in fondo nell'ambiente corrente** perché la connessione PostgreSQL test verso `127.0.0.1:5432` viene bloccata dal sandbox:

```text
SQLSTATE[08006] [7] connection to server at "127.0.0.1", port 5432 failed: Operation not permitted
```

### FASE 2 — Completamento Area 3: Catalogo

**Commit previsto:** `feat: completa entità Doctrine Area 3 - Catalogo`  
**Stato commit:** non eseguibile nell'ambiente corrente (`.git` read-only)

#### Implementato

Entità Doctrine aggiunte:

- `src/Entity/ServiceCategory.php`
- `src/Entity/StaffService.php`
- `src/Entity/ProductInventory.php`
- `src/Entity/ClientProductWishlist.php`

Repository aggiunti:

- `src/Repository/ServiceCategoryRepository.php`
- `src/Repository/StaffServiceRepository.php`
- `src/Repository/ProductInventoryRepository.php`
- `src/Repository/ClientProductWishlistRepository.php`

Ritocchi di allineamento allo schema esistente:

- `src/Entity/Service.php`
  - aggiunta relazione opzionale `category_id` → `ServiceCategory`
  - aggiunta relazione opzionale `created_by` → `Profile`
- `src/Entity/Product.php`
  - aggiunta relazione opzionale `created_by` → `Profile`

#### DECISIONE PRESA — doppio concetto di categoria su `services`

Il DDL di `services` contiene sia:

- `category_id` verso `service_categories`
- `category` testuale legacy

Scelta presa il **20 luglio 2026**: mantenere **entrambi** nel mapping Doctrine.

Motivo: il repository già esponeva la colonna testuale `category`; aggiungere anche la relazione `serviceCategory` preserva retrocompatibilità e riallinea l'entità al DDL reale senza rimuovere comportamento esistente.

#### Verifica Area 3

Comando eseguito il **20 luglio 2026**:

```bash
cd symfony-app && php bin/console doctrine:schema:validate --skip-sync
```

Risultato:

```text
Mapping
-------

 [OK] The mapping files are correct.

Database
--------

 [SKIPPED] The database was not checked for synchronicity.
```

Controllo sintattico locale eseguito sui file nuovi/modificati:

```bash
cd symfony-app && php -l <file>
```

Risultato: nessun errore di sintassi nei file aggiunti o aggiornati per Area 6 e Area 3.

### FASE 3 — Verifica finale

#### PHPUnit completo richiesto

Comando richiesto dall'istruzione:

```bash
cd symfony-app && docker compose exec php php bin/phpunit --testdox
```

Risultato il **20 luglio 2026**:

```text
permission denied while trying to connect to the docker API at unix:///Users/tommasovezzaro/.docker/run/docker.sock
```

Fallback locale eseguito:

```bash
cd symfony-app && ./bin/phpunit --testdox
```

Risultato:

- **19 test totali rilevati**
- **18 assertion eseguite**
- **7 errori**
- nessun fallimento logico del mapping Doctrine
- tutti gli errori derivano dal medesimo blocco infrastrutturale: impossibilità di aprire la connessione PostgreSQL di test su `127.0.0.1:5432`

Messaggio ricorrente:

```text
SQLSTATE[08006] [7] connection to server at "127.0.0.1", port 5432 failed: Operation not permitted
```

#### Conteggio aggiornato entità Doctrine ↔ tabelle DDL

Conteggio basato sul DDL reale presente il **20 luglio 2026** in `symfony-app/docker/postgres/init/*.sql`:

- **27 entità Doctrine mappate**
- **32 tabelle SQL rilevate**

Copertura attuale: **27 / 32**

Tabelle ancora senza entità Doctrine dedicata:

- `subscription_plans`
- `tenant_subscriptions`
- `staff_locations`
- `client_consents`
- `client_analytics`

Se il totale atteso di prodotto resta davvero **39**, questo va riallineato con il DDL del repository prima di usare il conteggio come KPI.

---

## Sessione end-to-end scheletro backend — 2026-07-20

Obiettivo: passare da componenti Symfony testati singolarmente a scheletro end-to-end verificato su PostgreSQL reale.

### FASE 1 — Ambiente test PostgreSQL reale + integrazione TenantFilter ⚠️

**Commit:** `test: integrazione TenantFilter su PostgreSQL reale`
**Data:** 2026-07-20

#### Implementato

| File | Modifica |
|---|---|
| `docker/postgres/init/00_create_test_database.sql` | Crea `${POSTGRES_DB}_test` al primo avvio del container e applica gli stessi DDL `01..09` anche al DB di test |
| `.env.test` | Configura Symfony test su PostgreSQL reale (`styll` con suffix Doctrine `_test`, quindi `styll_test`) |
| `src/EventListener/TenantFilterSubscriber.php` | Abilita sempre `tenant_filter` sulle request principali; se manca tenant_id il filtro resta senza parametro e `TenantFilter` ritorna `1 = 0` |
| `tests/Integration/TenantIsolationIntegrationTest.php` | Test reali su DB: 2 tenant, 2 set clienti/appuntamenti, token Symfony per tenant A/B, query Doctrine reali, caso senza autenticazione |

#### DECISIONE PRESA — DB test separato

**Scelta:** usare un database sibling `${POSTGRES_DB}_test` nello stesso container PostgreSQL e mantenere `dbname_suffix: _test` in Doctrine.
**Motivo:** isola i dati dei test dal database di sviluppo senza introdurre SQLite o un secondo container. Gli init script applicano lo stesso DDL pulito a entrambi i database al primo bootstrap.

#### DECISIONE PRESA — TenantFilter fail-closed anche senza autenticazione

**Scelta:** il subscriber abilita il filtro anche quando `TenantContext` non risolve un tenant.
**Motivo:** una query Doctrine eseguita in request senza tenant non deve mai degradare in fail-open. Con filtro abilitato e parametro assente, `TenantFilter` produce `1 = 0` e ritorna zero righe senza errore.

#### Risultati test

Comando eseguito contro PostgreSQL reale locale (`127.0.0.1:5432`, database `styll_test` preparato con gli stessi DDL):

```bash
cd symfony-app && DATABASE_URL='postgresql://tommasovezzaro@127.0.0.1:5432/styll?serverVersion=16&charset=utf8' ./bin/phpunit tests/Integration/TenantIsolationIntegrationTest.php tests/Doctrine/TenantFilterTest.php tests/Security/TenantContextTest.php
```

Output:

```text
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.2.30
Configuration: /Users/tommasovezzaro/Desktop/Styll-Symfony/symfony-app/phpunit.dist.xml

...............                                                   15 / 15 (100%)

Time: 00:00.935, Memory: 58.50 MB

OK (15 tests, 29 assertions)
```

#### Verifica Docker

La verifica richiesta con `docker-compose up -d postgres` **non è stata eseguibile in questa sessione** perché nell'ambiente CLI non sono disponibili né `docker-compose` né `docker`:

```text
/bin/bash: docker-compose: command not found
/bin/bash: docker: command not found
```

Il comportamento del database è stato comunque verificato su PostgreSQL reale locale caricando tutti i DDL in `styll_test`. Prima del deploy scheletro su VPS resta da rieseguire il bootstrap Docker/Compose su una macchina con Docker installato.

### FASE 2 — JWT keypair dev/test + fixture utente staff ✅

**Commit:** `auth: keypair JWT ambiente test + fixture utente`
**Data:** 2026-07-20

#### Implementato

| File / area | Modifica |
|---|---|
| `config/jwt/private.pem`, `config/jwt/public.pem` | Keypair generata con `php bin/console lexik:jwt:generate-keypair --overwrite --no-interaction`; file locali ignorati da Git |
| `.gitignore` | Già presente `/config/jwt/*.pem`, nessuna modifica necessaria |
| `tests/Support/TestTenantFixture.php` | Fixture test-only che crea due tenant, due staff user e due clienti per tenant; password nota solo per ambiente test: `styll-test-password-only` |

#### Verifica sicurezza chiavi

```bash
git log --all --full-history -- "**/jwt/*" --oneline
```

Risultato: nessun file sotto `config/jwt/` risulta committato nella history del branch.

```bash
git status --short --ignored -- symfony-app/config/jwt symfony-app/tests/Support/TestTenantFixture.php
```

Risultato rilevante:

```text
!! symfony-app/config/jwt/
```

La private key locale è stata lasciata fuori da Git e i permessi locali sono stati corretti a `600` per `private.pem` e `644` per `public.pem`.

#### Risultati verifica

```bash
cd symfony-app && php -l tests/Support/TestTenantFixture.php
```

```text
No syntax errors detected in tests/Support/TestTenantFixture.php
```

### FASE 3 — Primo endpoint end-to-end GET /api/clients ✅

**Commit:** `feat: primo endpoint end-to-end (GET /api/clients) con test funzionale multi-tenant`
**Data:** 2026-07-20

#### Implementato

| File | Modifica |
|---|---|
| `config/packages/security.yaml` | Aggiunto `json_login` su firewall `api` per emettere JWT reali da `/api/login` |
| `config/routes/security.yaml` | Aggiunta route `POST /api/login` come `check_path` del firewall |
| `src/Entity/Client.php` | Esposta collection API Platform `GET /api/clients` con gruppi serializer `client:read` |
| `src/Doctrine/TenantFilter.php` | Rimosso accesso deprecated ArrayAccess ai metadata Doctrine; compatibile con mapping object ORM 3 e array dei test unit |
| `config/services.yaml` | Registrata fixture test-only `App\Tests\Support\TestTenantFixture` in `when@test` |
| `tests/Functional/ClientsEndpointTest.php` | Test funzionale: login JWT vero, `GET /api/clients`, isolamento tenant A/B, 401 senza JWT |

#### DECISIONE PRESA — endpoint minimo

**Scelta:** esporre solo `GetCollection` su `Client` via API Platform e serializzare solo `id`, `fullName`, `phone`, `email`.
**Motivo:** è il minimo necessario per dimostrare auth JWT + TenantFilter + query Doctrine reale senza esporre mutazioni o relazioni tenant/staff non ancora hardenizzate.

#### Risultato test funzionale richiesto

Comando eseguito contro PostgreSQL reale locale (`styll_test`):

```bash
cd symfony-app && DATABASE_URL='postgresql://tommasovezzaro@127.0.0.1:5432/styll?serverVersion=16&charset=utf8' ./bin/phpunit tests/Functional/ClientsEndpointTest.php
```

Risultato finale dopo correzione della deprecazione Doctrine:

```text
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.2.30
Configuration: /Users/tommasovezzaro/Desktop/Styll-Symfony/symfony-app/phpunit.dist.xml

...                                                                 3 / 3 (100%)

OK (3 tests, 28 assertions)
```

Suite Symfony completa:

```bash
cd symfony-app && DATABASE_URL='postgresql://tommasovezzaro@127.0.0.1:5432/styll?serverVersion=16&charset=utf8' ./bin/phpunit
```

```text
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.2.30
Configuration: /Users/tommasovezzaro/Desktop/Styll-Symfony/symfony-app/phpunit.dist.xml

..................                                                18 / 18 (100%)

Time: 00:00.573, Memory: 40.50 MB

OK (18 tests, 57 assertions)
```

### FASE 4 — Template env produzione + checklist deploy ✅

**Commit:** `docs: template env produzione + checklist deploy`
**Data:** 2026-07-20

#### Implementato

| File | Modifica |
|---|---|
| `.env.prod.example` | Template produzione Symfony/Docker con soli placeholder `CHANGE_ME_*` per DB, JWT, Mercure, CORS, proxy e provider opzionali |
| `docs/DEPLOY-CHECKLIST.md` | Checklist comandi VPS per generare segreti reali, keypair JWT produzione, file env non committati, bootstrap Docker e check sicurezza |

#### DECISIONE PRESA — nessun segreto produzione generato localmente

**Scelta:** la sessione genera solo keypair dev/test locale ignorata da Git; tutti i segreti produzione sono documentati come comandi da eseguire sulla VPS.
**Motivo:** evita di creare o trasferire segreti reali fuori dal contesto di deploy e rende ripetibile la procedura sotto pressione.

#### Verifica

Nessun valore reale di produzione è stato scritto nei template. Tutti i campi sensibili usano placeholder espliciti `CHANGE_ME_*` o variabili shell generate al momento del deploy.

### Stato: pronto per primo deploy scheletro?

**SÌ — bootstrap Docker verificato il 2026-07-20.**

Bootstrap Docker `fresh` eseguito su macchina locale con Docker Desktop (macOS). Tutti i container avviati, tutti gli script `docker/postgres/init/00..09` eseguiti senza `ERROR` su `styll` e `styll_test`. Suite PHPUnit eseguita dentro il container `php`: **18/18 test passanti, 57 assertions**. Inclusi i test di integrazione TenantFilter su PostgreSQL reale (`TenantIsolationIntegration`) che in precedenza erano "non verificabili per mancanza di Docker".

Bug trovati e corretti durante il bootstrap:
- `docker/php/Dockerfile`: mancava `ENV APP_ENV=prod` prima di `composer install --no-dev`; la symfony-app `/.env` interna ha `APP_ENV=dev` come default, causando `ClassNotFoundError: MakerBundle` durante `cache:clear` nella build.
- `docker/php/Dockerfile`: fix committato su branch `symfony-schema-and-docs`.

Rischi/approvazioni prima del deploy reale:

| Area | Stato |
|---|---|
| Docker bootstrap fresh | ✅ Verificato 2026-07-20: `18/18 tests, 57 assertions` passanti su PostgreSQL reale |
| Segreti produzione | Da generare solo sulla VPS seguendo `docs/DEPLOY-CHECKLIST.md` |
| Dominio, DNS, TLS, reverse proxy | Richiedono scelta/approvazione umana prima del go-live |
| CORS browser finale | Placeholder documentato; va cablato/verificato quando il frontend chiamerà l'API cross-origin |

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

---

## FASE A — Site analytics admin migrata a Symfony — 2026-07-22

**Branch:** `feat/symfony-admin-migration`

### Obiettivo

Portare a Symfony le letture admin di site analytics, coprendo sia:

- analytics cross-tenant (`/admin/analytics`)
- analytics tenant-specific (`/admin/tenants/[tenantId]/analytics`)

senza usare piu query Supabase dirette nel frontend per questo perimetro.

### Audit e fonti usate

- `apps/web/src/lib/admin/site-analytics-queries.ts`
- `apps/web/src/app/admin/tenants/[tenantId]/analytics/page.tsx`
- `docs/_archivio-supabase/database-schema-supabase.md` per `tenant_activity_log`
- `supabase/migrations/20260704000001_site_analytics.sql`
- `supabase/migrations/20260704010000_site_analytics_app_surface.sql`
- `apps/web/DATABASE.md`

Nota importante emersa nell'audit:

- `docs/_archivio-supabase/database-schema-supabase.md` **non dettaglia** `site_analytics_daily`
- per `site_analytics_daily` la fonte autorevole usata e stata quindi il codice corrente + le migration Supabase + `apps/web/DATABASE.md`
- per `tenant_activity_log` la fonte autorevole e rimasta il documento archivio, coerente con il residuo gia annotato

### Backend Symfony

Nuovi file:

- `src/Entity/SiteAnalyticsDaily.php`
- `src/Entity/TenantActivityLog.php`
- `src/Repository/SiteAnalyticsDailyRepository.php`
- `src/Repository/TenantActivityLogRepository.php`
- `src/Service/AdminAnalyticsService.php`
- `src/Controller/Admin/AdminAnalyticsController.php`
- `migrations/Version20260722233000.php`
- `tests/Functional/AdminAnalyticsControllerTest.php`

Scelte implementative:

- `site_analytics_daily` e stata introdotta con chiave composta `(tenant_id, date, app_surface)` per restare aderente al modello frontend/documentale corrente
- `tenant_activity_log` e stata introdotta come tabella append-friendly con `recorded_at`
- le nuove Entity restano mappate con `tenant_id`, quindi compatibili con il `TenantFilter`
- gli endpoint admin usano comunque query repository/DBAL esplicite + `SuperadminAccessChecker`, cosi la lettura cross-tenant resta confinata all'API admin

Endpoint nuovi:

- `GET /api/admin/analytics?days=7|30|90`
- `GET /api/admin/tenants/{tenantId}/analytics?days=7|30|90`

Copertura funzionale backend:

- 403 per staff non superadmin
- aggregazione cross-tenant di sessioni, page views, booking completati, conversione media, mobile/desktop, insight text
- ultima attivita tenant da `tenant_activity_log`
- serie per superficie `website` e `pwa` sulla pagina tenant

### Frontend Next.js

Modifiche:

- `apps/web/src/lib/admin/site-analytics-queries.ts`
  - rimosse le query Supabase dirette
  - ora legge `GET /api/admin/analytics`
- `apps/web/src/app/admin/tenants/[tenantId]/analytics/page.tsx`
  - rimossa la lettura Supabase di `tenants`, `site_analytics_daily`, `tenant_activity_log`, `appointments`
  - ora legge `GET /api/admin/tenants/{tenantId}/analytics`

Nessun file del blocco inbox AI / WhatsApp escluso e stato toccato.

### Verifiche reali

Cache/migration obbligatorie eseguite realmente:

```bash
docker compose exec php php bin/console cache:clear
docker compose exec -T php env APP_ENV=test php bin/console cache:clear
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec -T php env APP_ENV=test php bin/console doctrine:migrations:migrate --no-interaction
```

Test mirato nuovo controller:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox tests/Functional/AdminAnalyticsControllerTest.php
```

Risultato reale:

- **3/3 test verdi**
- **42 assertions**

Suite completa obbligatoria:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --testdox
```

Risultato reale:

- **121/121 test verdi**
- **Assertions: 1030**
- **PHPUnit Deprecations: 3**

Curl mirati reali su ambiente locale `http://127.0.0.1:8080`:

1. Tenant analytics:

```json
{
  "tenant_name": "Barbiere di Prova",
  "tenant_slug": "barbiere-di-prova",
  "period": 30,
  "website_daily": [
    {
      "date": "2026-07-21",
      "app_surface": "website",
      "sessions": 18,
      "booking_completed": 3
    }
  ],
  "pwa_daily": [
    {
      "date": "2026-07-21",
      "app_surface": "pwa",
      "sessions": 7,
      "booking_completed": 1
    }
  ],
  "last_login_at": "2026-07-22T20:30:00+00:00",
  "appointments_in_period": 0
}
```

2. Platform analytics:

```json
{
  "summary": {
    "total_sessions": 25,
    "top_tenant": {
      "slug": "barbiere-di-prova",
      "sessions": 25
    }
  },
  "daily": [
    {
      "date": "2026-07-21",
      "sessions": 25,
      "booking_completed": 4
    }
  ],
  "period_days": 30
}
```

Check frontend mirato sui file toccati:

```bash
pnpm --filter web exec eslint src/lib/admin/site-analytics-queries.ts 'src/app/admin/tenants/[tenantId]/analytics/page.tsx'
```

Risultato reale: **passa senza output**.

### Note aperte fuori perimetro Fase A

- `pnpm type-check` globale resta rosso per errori **pre-esistenti e fuori scope** nel blocco inbox AI / WhatsApp e in altri file legacy admin non toccati in questa fase
- `pnpm lint` globale resta rosso per numerosi errori/warning **pre-esistenti** fuori dal delta Fase A
- questi problemi non sono stati corretti qui per rispettare il vincolo di scope e perche il worktree era gia sporco in quelle aree prima dell'intervento analytics
