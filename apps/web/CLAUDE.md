@AGENTS.md
# CLAUDE.md — Styll Project Context

> Questo file viene letto automaticamente da Claude Code ad ogni sessione.
> Contiene tutto il contesto necessario per lavorare correttamente sul progetto.

---

## Progetto

**Styll** — Piattaforma SaaS multi-tenant di retention per barbieri.
Non è un marketplace. È un sistema brandizzato white-label che aiuta i barbieri
a gestire clienti, appuntamenti e fidelizzazione.

**Filosofia core:** Il brand del barbiere è protagonista. Styll lavora in silenzio.

---

## Stack Tecnologico

| Layer | Tecnologia 
|-------|-----------|
| Framework | Next.js 14+ (App Router), TypeScript strict |
| Backend / Auth / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| UI | Tailwind CSS + shadcn/ui |
| Font | Outfit |
| App cliente | PWA (Progressive Web App) |
| Architettura | Multi-tenant SaaS |

---

## Architettura Multi-Tenant

- Ogni barbiere è un **tenant** con il proprio `tenant_id` (UUID)
- **Tutte le tabelle** (tranne le globali) hanno la colonna `tenant_id`
- **RLS (Row Level Security)** è attivo su ogni tabella — mai bypassarlo
- Ogni tenant ha un subdomain: `slug.styll.app` (v1) → dominio custom (v2)
- Il CSS del tenant (colori, font, logo) è caricato da `tenants.primary_color`, `secondary_color`, `font_family`, `logo_url`

**Tabelle GLOBALI (senza tenant_id):**
- `profiles` — profilo di ogni utente autenticato (staff + clienti)
- `subscription_plans` — i 3 tier disponibili (Starter, Growth, Pro)
- `admin_audit_log` — log azioni admin (ha tenant_id opzionale ma non è di proprietà di un tenant)
- `admin_settings` — configurazioni piattaforma
- `email_templates` — template email globali

---

## Ruoli Utente

| Ruolo | Dove | Cosa può fare |
|-------|------|--------------|
| `superadmin` | `profiles.is_superadmin = true` | Tutto — gestione piattaforma, shadow mode |
| `owner` | `staff_members.role = 'owner'` | Tutto nel suo tenant |
| `manager` | `staff_members.role = 'manager'` | Come owner meno billing |
| `staff` | `staff_members.role = 'staff'` | Solo suo calendario e clienti assegnati |
| `receptionist` | `staff_members.role = 'receptionist'` | Tutti i calendari in sola lettura, gestisce walk-in |

Il ruolo admin/superadmin è su `profiles.is_superadmin`.
Il ruolo nel tenant è su `staff_members.role`.
Un utente può essere staff in più tenant (tramite più righe in `staff_members`).

---

## Shadow Mode (Admin → Impersonificazione Tenant)

L'admin può entrare in "shadow mode" su un tenant per vedere la dashboard come la vede il barbiere.

**Implementazione:**
- Cookie `shadow_tenant_id` (httpOnly) — contiene il `tenant_id` impersonato
- Cookie `shadow_tenant_name` — per mostrare il nome nel banner
- La sessione Supabase dell'admin rimane invariata
- Tutte le query nella dashboard barbiere devono leggere il `tenant_id` dal cookie shadow se presente, NON da `auth.getUser()`
- Banner warning visibile in ogni pagina durante lo shadow mode

**⚠️ Bug noto:** Se non gestito correttamente, le pagine che chiamano `supabase.auth.getUser()` o leggono il profilo mostrano i dati dell'admin invece del barbiere impersonato.

---

## Convenzioni di Codice

- **TypeScript strict** — no `any`, sempre tipi espliciti
- **Supabase client:** usare sempre il client server-side nelle Server Components, client-side solo nei Client Components
- **Tenant isolation:** ogni query deve filtrare per `tenant_id` — non fidarsi mai del solo RLS per la logica applicativa
- **Soft delete:** `clients` e `appointments` usano `deleted_at` (mai `DELETE` diretto)
- **Prezzi snapshot:** `appointment_services.price_at_booking` e `appointment_products.price_at_sale` non devono mai aggiornarsi dopo la creazione
- **Note barbiere:** `client_notes` sono SEMPRE private, mai esposte nella PWA cliente
- **Nomi colonne:** usare i nomi esatti dello schema — non inventare alias

---

## Database — Schema Completo

> Vedi anche: `docs/database.md` per la documentazione estesa con relazioni e note.

### Area 1 — Platform & Tenants

#### `tenants`
Il cuore del sistema. Un record per ogni barbiere/salone.
```
id, business_name, slug (unique), timezone, logo_url,
primary_color, secondary_color, font_family, settings (jsonb),
status ('active'|'suspended'|'trial'), created_at, updated_at
```

#### `subscription_plans` ⬛ GLOBALE
I 3 tier disponibili. Non ha tenant_id.
```
id, name, slug (unique), price_monthly, max_staff, max_locations,
feature_flags (jsonb), is_active, created_at
```

#### `tenant_subscriptions`
Abbonamento attivo di un tenant.
```
id, tenant_id → tenants, plan_id → subscription_plans,
status ('trial'|'active'|'past_due'|'cancelled'),
trial_ends_at, current_period_start, current_period_end,
created_at, updated_at
```

---

### Area 2 — Auth & Staff

#### `profiles` ⬛ GLOBALE
Profilo esteso di ogni utente autenticato. `id` corrisponde a `auth.users.id`.
```
id → auth.users, user_type ('staff'|'client'|'admin'),
full_name, phone, avatar_url, email,
work_mode ('solo'|'team'), onboarding_completed,
is_superadmin (bool), bio, language, timezone,
notification_preferences (jsonb), created_at, updated_at
```

#### `staff_members`
Collega un profilo utente a un tenant con un ruolo specifico.
Un utente può essere staff in più tenant (più righe).
```
id, tenant_id → tenants, profile_id → profiles,
role ('owner'|'manager'|'staff'|'receptionist'),
bio, photo_url, is_active, deleted_at, created_at, updated_at
```

#### `staff_locations`
Ponte N:N — quale staff lavora in quale sede.
```
id, tenant_id, staff_id → staff_members, location_id → locations
```

---

### Area 3 — Sedi

#### `locations`
Sedi fisiche del tenant. Un tenant può avere più sedi (da Tier 2).
```
id, tenant_id → tenants, name, address, city, zip_code,
phone, email, latitude, longitude, photo_url,
is_active, created_at, updated_at
```

---

### Area 4 — Catalogo

#### `services`
Servizi offerti dal tenant (Taglio, Barba, ecc.).
```
id, tenant_id → tenants, name, description, price, duration_minutes,
category, display_order, is_active, created_at, updated_at
```

#### `staff_services`
Ponte N:N — quali servizi offre ogni membro dello staff.
```
id, tenant_id, staff_id → staff_members, service_id → services
```

#### `products`
Prodotti fisici vendibili (cera, olio barba, ecc.).
```
id, tenant_id → tenants, name, brand, price_sell, price_cost,
sku, photo_url, category, is_active,
show_on_site (bool — visibile nella PWA cliente),
is_new (bool — badge "nuovo"),
display_order, created_at, updated_at
```

#### `client_product_wishlist`
Wishlist prodotti del cliente nella PWA.
```
id, tenant_id, client_id → clients, product_id → products, created_at
```

#### `product_inventory`
Giacenza per prodotto PER SEDE. Un record per ogni combo prodotto+sede.
```
id, tenant_id, product_id → products, location_id → locations,
quantity (≥0), low_stock_threshold, updated_at
```

---

### Area 5 — Appuntamenti

#### `appointments`
L'appuntamento. Record centrale del sistema operativo.
```
id, tenant_id → tenants,
client_id → clients,
staff_id → staff_members,
location_id → locations,
start_time (timestamptz), end_time (timestamptz),
status ('pending'|'confirmed'|'completed'|'cancelled'|'no_show'),
booking_source ('pwa'|'dashboard_owner'|'dashboard_manager'|
                'dashboard_staff'|'dashboard_receptionist'|
                'walk_in'|'phone'),
booked_by → profiles (nullable),
notes, deleted_at, created_at, updated_at
```

#### `appointment_services`
Servizi inclusi nell'appuntamento. Il prezzo è uno snapshot al momento della prenotazione.
```
id, tenant_id, appointment_id → appointments,
service_id → services, price_at_booking (snapshot!), created_at
```

#### `appointment_products`
Prodotti venduti/usati durante l'appuntamento. Prezzo snapshot.
```
id, tenant_id, appointment_id → appointments,
product_id → products, quantity, price_at_sale (snapshot!), created_at
```

---

### Area 6 — Clienti & CRM

#### `clients`
Il cliente nel CRM del barbiere. `profile_id` è nullable — un cliente può esistere
nel CRM senza avere un account Supabase (es. Roberto che non usa la PWA).
```
id, tenant_id → tenants,
profile_id → profiles (nullable — assente se cliente senza account),
full_name, phone, email,
date_of_birth, preferred_contact_channel ('push'|'whatsapp'|'sms'|'email'),
marketing_consent, tags (jsonb array),
deleted_at (soft delete), created_at, updated_at
```

#### `client_notes`
Note private del barbiere sul cliente. MAI visibili nella PWA cliente (GDPR).
```
id, tenant_id, client_id → clients,
staff_id → staff_members, note_text, created_at
```

---

### Area 7 — Loyalty & Gamification

#### `loyalty_configs`
Configurazione loyalty attiva del tenant. Versioned per storico.
```
id, tenant_id → tenants,
template ('classic'|'streak_master'|'vip_club'),
points_per_visit (nullable — usato in template 'classic'),
points_per_euro (nullable — usato in template 'streak_master'/'vip_club'),
streak_threshold_days (default 45),
version, started_at, ended_at (nullable = config attiva),
created_at, updated_at
```

#### `client_loyalty`
Stato loyalty aggregato per cliente.
```
id, tenant_id, client_id → clients,
total_points (punti totali guadagnati lifetime),
available_points (punti spendibili ora),
current_streak, longest_streak,
last_visit_date, created_at, updated_at
```

#### `loyalty_transactions`
Log immutabile di ogni movimento punti.
```
id, tenant_id, client_id → clients,
type ('earn'|'redeem'|'bonus'|'import'|'adjustment'),
points (positivo = guadagno, negativo = riscatto),
description, appointment_id → appointments (nullable),
staff_id → staff_members (nullable), created_at
```

#### `rewards`
Catalogo premi riscattabili (max 6 per tenant).
```
id, tenant_id → tenants, name, description,
points_cost, reward_type ('product'|'service'|'discount'|'custom'),
display_order, is_active, created_at, updated_at
```

#### `reward_redemptions`
Riscatti effettuati da clienti.
```
id, tenant_id, client_id → clients, reward_id → rewards,
points_spent, confirmed_by → staff_members (nullable),
confirmed_at (nullable = non ancora confermato), created_at
```

---

### Area 8 — Pagamenti

#### `payments`
Tracking pagamenti (v1 offline, v2 con gateway).
```
id, tenant_id → tenants,
appointment_id → appointments (nullable — può essere pagamento autonomo),
client_id → clients,
amount, tip_amount,
payment_method ('cash'|'card_terminal'|'stripe_online'|'bank_transfer'|'other'),
status ('pending'|'completed'|'refunded'|'failed'),
notes, paid_at, created_at
```

---

### Area 9 — Portfolio & Media

#### `portfolio_photos`
Foto del lavoro del barbiere (before/after, look book).
```
id, tenant_id → tenants,
staff_id → staff_members (nullable),
photo_url, service_tags (text[]),
is_visible, display_order, created_at
```

---

### Area 10 — Admin & Platform

#### `admin_audit_log` ⬛ GLOBALE
Log immutabile di ogni azione critica dell'admin.
```
id, actor_id → auth.users (nullable),
action (testo dell'azione, es. 'shadow_mode_start'),
entity_type (es. 'tenant', 'staff_member'),
entity_id (UUID come stringa, nullable),
tenant_id → tenants (nullable),
details (jsonb con contesto aggiuntivo), created_at
```

#### `admin_settings` ⬛ GLOBALE
Configurazioni globali della piattaforma (key-value).
```
key (PK), value (jsonb), updated_at, updated_by → auth.users
```

#### `email_templates` ⬛ GLOBALE
Template email della piattaforma.
```
id, slug (unique), name, subject, body,
variables (jsonb), is_active, created_at, updated_at
```

---

## Regole Architetturali Fondamentali

1. **Ogni tabella ha `tenant_id`** — eccetto le 5 globali (profiles, subscription_plans, admin_audit_log, admin_settings, email_templates)
2. **RLS obbligatorio** su ogni tabella — mai esporre dati senza policy
3. **Soft delete** su `clients` (deleted_at) e `appointments` (deleted_at) — mai hard delete
4. **UUID** come primary key ovunque — no integer autoincrementale
5. **Prezzo snapshot** in `appointment_services.price_at_booking` e `appointment_products.price_at_sale` — immutabile dopo la creazione
6. **Note barbiere private** — `client_notes` mai esposta alla PWA cliente
7. **Giacenza per sede** — `product_inventory` ha sia `product_id` che `location_id`
8. **CRM = fonte di verità** per la loyalty — funziona con e senza PWA installata
9. **`clients.profile_id` è nullable** — un cliente può esistere senza account Supabase

---

## Roadmap Feature

| Versione | Feature principali |
|---------|-------------------|
| **v1 MVP** | Prenotazioni, CRM, Loyalty base (classico), Silent Churn Detector, PWA brandizzata, Admin panel |
| **v2 Growth** | Gamification completa (streak, badge, livelli), Win-back automatico, QR walk-in, Multi-staff |
| **v3 AI** | AI Business Coach, No-show prediction, Prezzi dinamici, Prenotazione da WhatsApp |

---

## File e Cartelle Importanti

```
/app
  /admin          → pannello superadmin
  /dashboard      → pannello barbiere (multi-tenant)
  /[slug]         → PWA cliente (per ogni tenant)
/components
  /ui             → componenti shadcn/ui
  /admin          → componenti specifici admin
  /dashboard      → componenti specifici dashboard barbieri
/lib
  /supabase       → client Supabase (server + client)
  /hooks          → custom hooks React
/types            → tipi TypeScript generati da Supabase
/docs             → documentazione progetto (tesi)
```

---

## Onboarding Gating — Invariante Architetturale

**Fonte di verità: `staff_members` attivo**, non `profiles.onboarding_completed` (il flag può essere null per tenant storici o dopo onboarding parziale).

Tre punti devono restare in sync:

1. **`proxy.ts`** — su `/onboarding/*`: se l'utente ha righe attive in `staff_members`, redirect alla dashboard. Se >1 riga, usa `/dashboard` (non il subdomain diretto) — `dashboard/layout.tsx` gestisce il routing a `/select-tenant`. Stessa logica sul path `/login`/`/register` per utenti già loggati.
2. **`(auth)/onboarding/layout.tsx`** — firewall SSR: stessa logica staff_members → `/dashboard`. Controlla anche `is_superadmin` → `/admin` (superadmin non ha staff_members ma non deve vedere il wizard barbiere).
3. **`auth/callback/route.ts`** — post-login OAuth: controlla `onboarding_completed`, fallback su `staff_members`. Se trova tenant attivo, fa self-heal (`UPDATE profiles SET onboarding_completed = true`) prima del redirect.

Nessun redirect circolare possibile: `dashboard/layout.tsx` gestisce 0 tenant → `/onboarding`, mai il contrario.

---

## Problemi Noti / TODO

- [ ] **Shadow Mode bug:** quando in shadow mode, le pagine che chiamano `auth.getUser()` mostrano il profilo dell'admin invece del barbiere impersonato. Fix: usare context override basato sul cookie `shadow_tenant_id`
- [ ] Estetica admin da allineare allo stile della dashboard barbieri (font Outfit, rounded-2xl, shadow system)
- [ ] Audit log da completare per tutte le azioni critiche admin