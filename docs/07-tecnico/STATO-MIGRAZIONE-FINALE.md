# STATO MIGRAZIONE FINALE — Supabase → Symfony
> Audit eseguito: 2026-07-23  
> Completamento complessivo stimato: **~25–30%**  
> Questo documento sostituisce `frontend-backend-integration-map.md` (obsoleto).

---

## Sommario esecutivo

Il sistema è oggi in uno stato **ibrido stabile**:

| Area | Stato |
|------|-------|
| Auth staff | ✅ 100% Symfony JWT |
| Admin analytics + media upload | ✅ 100% Symfony |
| Public landing (read-only) | ✅ 100% Symfony (API Platform) |
| Rate limiting / sicurezza endpoint | ✅ Symfony |
| **Tutto il resto (94% della logica operativa)** | ❌ Supabase |

---

## Inventario completo: `apps/web/src/lib/actions/`

35 file totali — 2 Symfony (5.7%), 33 Supabase (94.3%).

| File | Dominio | Supabase | Symfony | Stato |
|------|---------|----------|---------|-------|
| `appointments.ts` | Admin appointments | — | ✅ | 100% Symfony |
| `platform-notifiche.ts` | Admin notifications | — | ✅ | 100% Symfony |
| `calendario.ts` | Calendario core | ✅ | — | 100% Supabase |
| `clienti.ts` | CRM | ✅ | — | 100% Supabase |
| `loyalty.ts` | Loyalty operativa | ✅ | — | 100% Supabase |
| `loyalty-settings.ts` | Loyalty config | ✅ | — | 100% Supabase |
| `notifiche.ts` | Notifiche staff | ✅ | — | 100% Supabase |
| `inbox.ts` | WhatsApp inbox AI | ✅ | — | 100% Supabase |
| `pwa-auth.ts` | PWA client auth | ✅ | — | 100% Supabase |
| `client-auth.ts` | Client legacy auth | ✅ | — | 100% Supabase |
| `client-notifications.ts` | Notifiche PWA cliente | ✅ | — | 100% Supabase |
| `create-booking.ts` | Creazione appuntamento | ✅ | — | 100% Supabase |
| `booking-slots.ts` | Slot disponibilità | ✅ | — | 100% Supabase |
| `booking-public.ts` | Dati pubblici booking | ✅ | — | 100% Supabase |
| `public-booking.ts` | Dati pubblici tenant | ✅ | — | 100% Supabase |
| `catalogo.ts` | Prodotti/servizi | ✅ | — | 100% Supabase |
| `offers.ts` | Promozioni | ✅ | — | 100% Supabase |
| `marketing.ts` | Marketing automations | ✅ | — | 100% Supabase |
| `marketing-automations.ts` | Marketing rules | ✅ | — | 100% Supabase |
| `send-campaign.ts` | Invio campagne | ✅ | — | 100% Supabase |
| `team.ts` | Staff management | ✅ | — | 100% Supabase |
| `profilo.ts` | Profilo staff | ✅ | — | 100% Supabase |
| `impostazioni.ts` | Impostazioni tenant | ✅ | — | 100% Supabase |
| `pwa-client-actions.ts` | PWA profilo cliente | ✅ | — | 100% Supabase |
| `pwa-home.ts` | PWA home | ✅ | — | 100% Supabase |
| `app-settings.ts` | Landing page branding | ✅ | — | 100% Supabase |
| `dashboard-home.ts` | Dashboard home stats | ✅ | — | 100% Supabase |
| `dashboard-search.ts` | Ricerca dashboard | ✅ | — | 100% Supabase |
| `vendite.ts` | Report vendite | ✅ | — | 100% Supabase |
| `wishlist.ts` | Wishlist prodotti PWA | ✅ | — | 100% Supabase |
| `upsell-action.ts` | Post-booking upsell | ✅ | — | 100% Supabase |
| `invitations.ts` | Inviti team | ✅ | — | 100% Supabase |
| `onboarding-data.ts` | Onboarding support | ✅ | — | 100% Supabase |
| `platform-leads.ts` | Platform leads CRM | ✅ | — | 100% Supabase |
| `email-verification.ts` | Verifica email | ✅ | — | 100% Supabase |

---

## Area per area

### 1. Calendario / Booking

**Stato: ~5% Symfony (solo delete/status admin)**

Cosa usa ancora Supabase:
- `calendario.ts` — query appuntamenti dashboard staff, lookup slot, details
- `booking-slots.ts` — calcolo disponibilità con working hours override
- `create-booking.ts` — creazione transazionale + decremento inventario
- `booking-public.ts` / `public-booking.ts` — dati pubblici per PWA booking flow

Cosa manca in Symfony:
- `GET /api/tenants/{id}/appointments` (filtrata per tenant, date range)
- `GET /api/tenants/{id}/availability/slots`
- `POST /api/tenants/{id}/appointments` (con transazione)
- `PATCH /api/tenants/{id}/appointments/{id}` (staff)
- Working hours override read/write
- Decremento inventario transazionale su booking
- Notification trigger su nuovo appuntamento

**Lavoro stimato: ALTO (2–3 settimane)**  
Schema/migration mancanti: NO

---

### 2. CRM

**Stato: 0% Symfony**

Cosa usa ancora Supabase:
- `clienti.ts` — CRUD clienti, note private, import bulk, analytics
- `dashboard-search.ts` — ricerca clienti/appuntamenti
- `dashboard-home.ts` — statistiche home

Cosa manca in Symfony:
- `GET/POST/PATCH/DELETE /api/tenants/{id}/clients`
- `POST /api/tenants/{id}/clients/bulk-create`
- `POST /api/tenants/{id}/clients/import-commit`
- Client notes CRUD (`ClientNote` entity presente, nessun endpoint)
- Client analytics aggregation
- Search full-text

**Lavoro stimato: MEDIO-ALTO (2 settimane)**  
Schema/migration mancanti: NO

---

### 3. Loyalty operativa

**Stato: 0% Symfony**

Cosa usa ancora Supabase:
- `loyalty.ts` — assegnazione punti, redemption, badge unlock, tier calculation
- `loyalty-settings.ts` — config loyalty, premi, tier config

Cosa manca in Symfony:
- `GET /api/tenants/{id}/loyalty-config`
- `PATCH /api/tenants/{id}/loyalty-config`
- `POST /api/tenants/{id}/loyalty/points/assign` (transazione post-appuntamento)
- `POST /api/tenants/{id}/rewards/redeem`
- `GET /api/tenants/{id}/clients/{clientId}/loyalty`
- Badge unlock automation
- Tier calculation + promotion
- Points history / audit trail

**Lavoro stimato: ALTO (2–3 settimane)**  
Schema/migration mancanti: NO  
Entity Doctrine presenti (Badge, Tier, ClientLoyalty): sì — ma business logic in-memory, nessuna persistenza Symfony

---

### 4. Vendita prodotti in appuntamento / Inventario

**Stato: 0% Symfony**

Cosa usa ancora Supabase:
- `create-booking.ts` — decremento inventario atomico su booking
- `calendario.ts` — lookup prodotti per appuntamento
- `catalogo.ts` — CRUD prodotti, categorie, inventario

Cosa manca in Symfony:
- `GET/POST/PATCH/DELETE /api/tenants/{id}/products`
- `GET/PATCH /api/tenants/{id}/product-inventory`
- `POST /api/tenants/{id}/product-inventory/decrement` (atomico)
- `GET/POST/PATCH/DELETE /api/tenants/{id}/services`
- Service category CRUD
- Inventory movement audit trail

**Lavoro stimato: MEDIO (1.5 settimane)**  
Schema/migration mancanti: NO (entity presente; tabella `inventory_movements` non ancora usata)

---

### 5. Notifiche

**Stato: ~10% Symfony (solo read admin)**

Canali realmente attivi: **NESSUNO**

Cosa usa ancora Supabase:
- `notifiche.ts` — query notifiche staff
- `client-notifications.ts` — query notifiche PWA cliente
- `send-campaign.ts` — invio campagne + logging
- `calendario.ts` → `sendPushToSubscriptions()` — push su completion appuntamento

Cosa manca in Symfony:
- `POST /api/tenants/{id}/notifications/send` (internal)
- `GET /api/tenants/{id}/notifications` (list staff)
- `PATCH /api/tenants/{id}/notifications/{id}/mark-read`
- Push subscription management (Web Push API)
- Email template rendering
- Reminder appuntamento automatico
- Win-back automation

Stato canali:
- **Push:** schema presente (`push_subscriptions`), nessun sending logic Symfony
- **Email:** legacy Supabase trigger, nessun templating Symfony
- **SMS:** no credenziali Twilio — bloccato
- **WhatsApp:** solo AI inbox, non per reminder

**Lavoro stimato: ALTO (2–3 settimane)**  
Schema/migration mancanti: NO  
Dipendenze: richiede Appointment CRUD prima

---

### 6. WhatsApp / SMS Messaging (Inbox AI)

**Stato: 0% Symfony — ESPLICITAMENTE FUORI SCOPE**

> Nota da `MIGRATION-LOG.md`: "NON toccare MAI il blocco inbox AI / WhatsApp" — regola attiva in tutte le sessioni.

Cosa usa ancora Supabase:
- `inbox.ts` — conversazioni, messaggi, AI runs, webhook events
- `apps/web/src/app/api/webhooks/meta-whatsapp/` — ricezione messaggi Meta
- `apps/web/src/lib/messaging/` — state management, query inbox

Schema mancante in Symfony:
- `inbox_conversations`
- `inbox_messages`
- `inbox_ai_runs`
- `webhook_events_inbox`
- `inbox_assignments`

Cosa manca in Symfony:
- Webhook handler Meta WhatsApp
- AI runtime porting (Next.js cron → Symfony worker)
- Message state machine
- Provider token management (Meta)

**Lavoro stimato: MOLTO ALTO (4–6 settimane)**  
Schema/migration mancanti: SÌ — 5+ tabelle critiche assenti  
**Raccomandazione: trattare come progetto separato dopo che il resto è migrato**

---

### 7. Recensioni

**Stato: 0% Symfony — feature non implementata**

Nessun file action esistente per recensioni.  
Trigger implicito: possibile post-appointment da `calendario.ts` ma non implementato.

Cosa manca:
- Tabella `reviews` (non presente nello schema Symfony)
- `POST /api/tenants/{id}/reviews/request` (trigger automatico)
- `POST/GET /api/tenants/{id}/reviews`
- Eventuale integrazione Google Reviews API

**Lavoro stimato: BASSO (3–5 giorni) solo se schema viene creato**  
Schema/migration mancanti: SÌ — tabella `reviews` assente

---

### 8. Realtime / Mercure

**Stato: 0% connesso a funzionalità — infrastruttura presente**

Cosa usa ancora Supabase Realtime:
- `useRealtimeAppointments.ts` — listener appuntamenti per calendario live
- `calendario-utils.ts` — subscription Supabase Realtime
- `NotificationCountContext.tsx` — notifiche in tempo reale
- `notification-bell.tsx` (admin) — `platform_notifications` Realtime

Mercure in Symfony:
- Bundle `mercure-bundle` installato e configurato
- **Non pubblica su nessun evento** (zero topic publisher implementato)

Cosa manca:
- Publisher Mercure su `POST/PATCH/DELETE /api/tenants/{id}/appointments`
- Publisher Mercure su `POST /api/tenants/{id}/notifications`
- JWT authorization per topic scoping tenant
- Client subscription management

**Lavoro stimato: MEDIO (1–2 settimane) — dipende da Appointment CRUD**  
Schema/migration mancanti: NO (è infrastruttura, non dati)

---

### 9. PWA Cliente — Auth

**Stato: ~70% Symfony (email OTP + Google OAuth done; SMS OTP bloccato)**

Cosa usa ancora Supabase:
- `pwa-auth.ts` — OTP via Supabase per SMS, provisioning cliente legacy
- `client-auth.ts` — email/password legacy

Endpoint Symfony già presenti:
- `POST /api/pwa/otp/send` ✅ (email OTP)
- `POST /api/pwa/otp/verify` ✅ (JWT ROLE_PWA_CLIENT)
- `PATCH /api/pwa/client/profile` ✅
- Google OAuth client flow ✅

Cosa manca:
- SMS OTP: `POST /api/pwa/otp/sms/send` — bloccato da credenziali Twilio assenti
- Migrazione `pwa-auth.ts` per smettere di chiamare Supabase direttamente

**Lavoro stimato: BASSO (3–4 giorni) — dipende da Twilio**  
Schema/migration mancanti: NO

---

### 10. Altre aree

| Area | File | Stato | Stima | Note |
|------|------|-------|-------|------|
| Promozioni | `offers.ts` | 0% Symfony | MEDIO (1 sett.) | Entity presente, solo GetCollection endpoint |
| Team / Staff | `team.ts` | 0% Symfony | MEDIO (1 sett.) | AdminTenantContentController stub |
| Impostazioni tenant | `impostazioni.ts` | 0% Symfony | MEDIO (1 sett.) | Branding, working hours — controller stub |
| Marketing automations | `marketing.ts`, `marketing-automations.ts` | 0% Symfony | ALTO (2 sett.) | Logica regole complessa, nessun endpoint |
| Report vendite | `vendite.ts` | 0% Symfony | MEDIO (1 sett.) | RPC query Supabase — richiede aggregazione Doctrine |
| Admin leads | `platform-leads.ts` | 0% Symfony | BASSO (3 gg.) | Entity presente |
| Inviti team | `invitations.ts` | 0% Symfony | BASSO (3 gg.) | Entity InvitationToken presente |
| Onboarding | `onboarding-data.ts` | 0% Symfony | BASSO (2 gg.) | Dati default, quasi solo seed |
| Verifica email | `email-verification.ts` | ~80% Symfony | BASSO (1 gg.) | OTP email Symfony, piccola chiamata Supabase residua |

---

## Endpoint Symfony esistenti

### Auth staff / PWA

| Endpoint | Metodo | Stato |
|----------|--------|-------|
| `/api/login` | POST | ✅ |
| `/api/me` | GET | ✅ |
| `/api/me/password` | POST | ✅ |
| `/api/register` | POST | ✅ |
| `/api/password-reset/request` | POST | ✅ |
| `/api/password-reset/confirm` | POST | ✅ |
| `/api/oauth/google/start` | POST | ✅ |
| `/api/oauth/google/complete` | POST | ✅ |
| `/api/register/google/finalize` | POST | ✅ |
| `/api/pwa/otp/send` | POST | ✅ (email only) |
| `/api/pwa/otp/verify` | POST | ✅ |
| `/api/pwa/client/profile` | PATCH | ✅ |

### Admin — Dati tenant

| Endpoint | Metodo | Stato |
|----------|--------|-------|
| `/api/admin/tenants/{id}/clients` | GET/POST | ✅ |
| `/api/admin/tenants/{id}/clients/bulk-create` | POST | ✅ |
| `/api/admin/tenants/{id}/appointments` | GET/POST | ✅ |
| `/api/admin/tenants/{id}/appointments/{id}/status` | PATCH | ✅ |
| `/api/admin/tenants/{id}/appointments/{id}` | DELETE | ✅ |
| `/api/admin/tenants/{id}/appointments/options` | GET | ✅ |
| `/api/admin/tenants/{id}/appointments/seed` | POST | ✅ |
| `/api/admin/tenants/{id}/client-imports/commit` | POST | ✅ |
| `/api/admin/tenants/{id}/client-import-jobs` | GET | ✅ |

### Admin — Analytics + Upload

| Endpoint | Metodo | Stato |
|----------|--------|-------|
| `/api/admin/analytics` | GET | ✅ |
| `/api/admin/tenants/{id}/analytics` | GET | ✅ |
| `/api/admin/uploads/image` | POST | ✅ |

### Public / Landing (API Platform — read-only)

| Risorsa | Stato |
|---------|-------|
| `/api/public/tenants/{slug}` | ✅ |
| `/api/public/tenants/{slug}/locations` | ✅ |
| `/api/public/tenants/{slug}/services` | ✅ |
| `/api/public/tenants/{slug}/staff-members` | ✅ |
| `/api/public/tenants/{slug}/products` | ✅ |
| `/api/public/tenants/{slug}/promotions` | ✅ (GetCollection) |
| `/api/public/tenants/{slug}/gallery-photos` | ✅ |
| `/api/public/tenants/{slug}/portfolio-photos` | ✅ |

### Sistema

| Endpoint | Stato |
|----------|-------|
| `/api/symfony/backups` | ✅ |
| `/api/symfony/backups/{id}/verify` | ✅ |

### Controller stub (non implementati)

- `AdminTenantContentController` — services, locations, staff, products, working-hours

---

## Proxy routes Next.js → Symfony

| Path Next.js | Endpoint Symfony |
|-------------|-----------------|
| `/api/auth/staff/login` | `POST /api/login` + `GET /api/me` |
| `/api/auth/staff/logout` | (pulisce cookie) |
| `/api/auth/staff/register` | `POST /api/register` |
| `/api/auth/google/staff/start` | `POST /api/oauth/google/start` |
| `/api/auth/google/pwa/start` | `POST /api/oauth/google/start` |
| `/api/auth/google/callback` | `POST /api/oauth/google/complete` |
| `/api/admin/uploads/image` | `POST /api/admin/uploads/image` |
| `/api/admin/analytics` | `GET /api/admin/analytics` |
| `/api/admin/tenants/{id}/analytics` | `GET /api/admin/tenants/{id}/analytics` |
| `/api/symfony/backups` | `GET /api/symfony/backups` |
| `/api/symfony/backups/{id}/verify` | `GET /api/symfony/backups/{id}/verify` |

Non esiste un proxy layer generico — i client Next.js chiamano Symfony direttamente via `fetchSymfonyAdminJson` con JWT header.

---

## Gap espliciti documentati

| Gap | Stato | Note |
|-----|-------|------|
| SMS OTP | ❌ Bloccato | Credenziali Twilio assenti |
| Inventory movements audit | ❌ Logic assente | Tabella non ancora creata |
| Client analytics | ❌ Schema assente | Aggregation da fare |
| Realtime Mercure | ⚠️ Bundle presente, 0 publisher | Infrastruttura pronta, non connessa |
| Reviews | ❌ Schema assente | Feature non iniziata |
| Marketing automations | ❌ 0% | Logica regole complessa |
| Badge/Tier business logic | ⚠️ Entity presenti, no persistence | In-memory only |
| Admin audit log | ⚠️ Schema presente, sparse calls | Molte azioni non loggate |
| WhatsApp inbox schema | ❌ 5+ tabelle mancanti | Fuori scope esplicito |

---

## Ordine di priorità consigliato per chiudere la migrazione

### Fase IMMEDIATA — 1 settimana

**1. SMS OTP per PWA cliente**
- Sblocca `pwa-auth.ts` → 100% Symfony
- Email OTP e Google OAuth già presenti; solo SMS mancante
- Richiede: credenziali Twilio
- Impatto: completa auth stack

---

### Fase 1 — 2–3 settimane

**2. CRM clienti (CRUD completo)**
- `clienti.ts` → Symfony
- Radice della logica business: tutto dipende dal client lookup
- Endpoint: `GET/POST/PATCH/DELETE /api/tenants/{id}/clients` + notes

**3. Calendario GET (read-only)**
- `calendario.ts` read part → Symfony
- Dashboard usata quotidianamente; read-only è step sicuro
- Endpoint: `GET /api/tenants/{id}/appointments?date_range=...`

**4. Loyalty read-only**
- `loyalty.ts` list/detail → Symfony
- Sblocca anche `pwa-home.ts` (punti cliente PWA)
- Endpoint: `GET /api/tenants/{id}/clients/{id}/loyalty`

---

### Fase 2 — 3–4 settimane

**5. Appointment CRUD completo**
- `create-booking.ts` + `calendario.ts` mutazioni → Symfony
- Nucleo della piattaforma; sblocca loyalty write e notifiche
- Include: decremento inventario, transazioni, soft-delete
- Dipendenze: CRM clienti (Fase 1)

**6. Catalogo (servizi / prodotti)**
- `catalogo.ts` → Symfony
- Blocca booking flow completo se assente
- Include: `AdminTenantContentController` stub → reale

**7. Notifiche + Mercure publisher**
- `send-campaign.ts` → Symfony
- Mercure topic publish su appointment/notification events
- Dipendenze: Appointment CRUD

---

### Fase 3 — 3–5 settimane

**8. Loyalty write (assegnazione + redemption)**
- `loyalty.ts` mutazioni → Symfony
- Trigger: post-appointment completion
- Dipendenze: Appointment CRUD

**9. PWA cliente data layer**
- `pwa-client-actions.ts`, `pwa-home.ts` → Symfony
- Endpoint: `/api/pwa/client/{id}/appointments`, loyalty, prodotti
- Dipendenze: Auth (✅), Appointment read, Loyalty read

**10. Promozioni + Impostazioni + Team**
- Feature di configurazione, non critiche MVP
- `offers.ts`, `impostazioni.ts`, `team.ts` → Symfony

---

### Fase 4 — Progetto separato

**11. WhatsApp Inbox AI**
- Schema mancante (5+ tabelle)
- Porting AI runtime completo
- Stimato: 4–6 settimane di sessione dedicata
- **Non iniziare finché il resto non è migrato**

**12. Marketing automations**
- Logica regole complessa, dipende da notification system
- Stimato: 2 settimane

---

## Verifiche disponibilità test Symfony (2026-07-23)

- Suite test Symfony: **131/131 ✅** (1130+ assertions)
- Auth staff: login → cookie → dashboard: **✅ verificato**
- PWA auth: email OTP + Google OAuth: **✅ verificato**
- Admin analytics endpoint: **✅ verificato**
- Admin image upload: **✅ verificato**

---

*Prossimo aggiornamento consigliato: dopo completamento Fase 1 (CRM + Calendario GET).*
