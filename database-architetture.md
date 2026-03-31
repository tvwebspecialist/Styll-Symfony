
---

## 🗄️ Architettura Database — Decisioni definitive

> Questa sezione contiene TUTTE le decisioni architetturali del database.
> È la referenza definitiva: il prossimo step è solo scrivere le tabelle SQL.
> Ogni scelta è motivata e non va ridiscussa salvo nuovi requisiti.

---

### Glossario — Termini tecnici in parole semplici

| Termine | Significato |
|---------|-------------|
| **Tabella** | Un foglio Excel con righe e colonne. Ogni tabella contiene un tipo di informazione (es. "clienti", "appuntamenti") |
| **Riga** | Un singolo record dentro una tabella (es. un singolo cliente) |
| **Colonna** | Un'informazione specifica (es. "nome", "telefono") |
| **Relazione** | Un collegamento tra due tabelle. Es. un appuntamento è collegato a un cliente e a un barbiere |
| **Tenant** | Un business (barbershop) registrato su Styll. Ogni tenant ha i suoi dati separati |
| **RLS (Row Level Security)** | Regole che decidono chi può vedere cosa. Marco vede solo i suoi clienti, non quelli di Andrea |
| **UUID** | Codice univoco generato automaticamente, impossibile da indovinare |
| **JSONB** | Campo flessibile per dati strutturati variabili (es. lista di opzioni, configurazioni) |
| **Soft delete** | Invece di cancellare, si marca con una data. Il dato resta ma non si vede più |
| **Snapshot (prezzo fotografato)** | Copia del prezzo al momento dell'evento. Se il barbiere cambia prezzo, lo storico non cambia |
| **Tabella ponte (N:N)** | Tabella che collega due tabelle con relazione molti-a-molti (es. uno staff offre molti servizi, un servizio è offerto da molti staff) |
| **Trigger** | Azione automatica del database che scatta quando succede qualcosa (es. "quando un appuntamento viene completato, aggiorna le metriche") |
| **Cron job** | Processo programmato che gira a intervalli regolari (es. ogni notte ricalcola il semaforo churn) |
| **Edge Function** | Codice che gira sul server Supabase, non nel browser. Usato per logica che deve essere sicura e centralizzata |

---

### Le 8 decisioni architetturali fondamentali

Ogni decisione è stata analizzata con alternative e motivazioni. Sono definitive.

---

#### Decisione 1 — Gestione abbonamenti (Billing)

**Decisione:** Tabella `tenant_subscriptions` separata dalla tabella `tenants`.

**Come funziona:**
- v1: l'admin attiva i barbieri manualmente. Quando il barbiere paga (fuori piattaforma), l'admin cambia lo stato
- v2: integrazione Stripe. Il sistema aggiorna lo stato automaticamente via webhook

**Stati dell'abbonamento:**
| Stato | Significato |
|-------|-------------|
| `trial` | Periodo di prova (es. 14 giorni) |
| `active` | Attivo e pagato |
| `past_due` | Pagamento in ritardo, accesso ancora attivo |
| `suspended` | Accesso sospeso, deve pagare |
| `cancelled` | Ha lasciato la piattaforma |

**Perché separata:** Le info billing cambiano spesso (rinnovi, scadenze, cambi piano). I dati del barbiere (nome, logo, colori) cambiano raramente. Separando, ogni parte fa il suo lavoro senza interferenze.

**Flusso v1:** Admin crea tenant → sistema crea abbonamento con `status: trial` e `trial_ends_at: +14 giorni` → barbiere paga fuori piattaforma → admin cambia status in `active`.

---

#### Decisione 2 — Feature flags (funzionalità attive/disattive)

**Decisione:** JSONB a 2 livelli con merge shallow.

**Livello 1 — Default dal piano:**

| Funzionalità | Starter | Growth | Pro |
|-------------|---------|--------|-----|
| Prenotazioni | ✅ | ✅ | ✅ |
| Loyalty base (punti) | ✅ | ✅ | ✅ |
| Churn detector | ✅ | ✅ | ✅ |
| Gamification completa | ❌ | ✅ | ✅ |
| QR Walk-in | ❌ | ✅ | ✅ |
| Win-back automatico | ❌ | ✅ | ✅ |
| AI Coach | ❌ | ❌ | ✅ |
| Multi-location | ❌ | ❌ | ✅ |

**Livello 2 — Override per singolo tenant:**
L'admin può sovrascrivere un flag per un barbiere specifico (es. "A Marco diamo la gamification gratis come promo").

**Logica di risoluzione:**
```javascript
function getFeatureFlags(plan, tenant) {
  return { ...plan.feature_flags, ...tenant.feature_flag_overrides };
}
// Le eccezioni del tenant vincono sempre sui default del piano
```

**Dove vivono i dati:**
- `subscription_plans.feature_flags` → default del piano (JSONB)
- `tenants.feature_flag_overrides` → eccezioni per barbiere (JSONB, default `{}`)

**Perché JSONB e non tabella separata:** I flag sono pochi (10-15), letti ad ogni page load, modificati raramente. Una tabella separata con una riga per flag è overengineering.

---

#### Decisione 3 — Autenticazione

**Decisione:** Unico `auth.users` di Supabase per tutti. Differenziazione via `profiles.user_type`.

| Tipo utente | Come fa login | `user_type` |
|-------------|---------------|-------------|
| Staff (barbiere, receptionist, manager, titolare) | Email + password | `'staff'` |
| Cliente | OTP telefono (codice SMS) | `'client'` |
| Admin piattaforma | Email + password | `'admin'` |

**Regole:**
- Admin e staff sono SEMPRE account separati. Mai lo stesso account per entrambi i ruoli
- `profiles` è 1:1 con `auth.users` — ogni utente autenticato ha un profilo
- Il `user_type` determina quali RLS policy si applicano

---

#### Decisione 4 — Cliente cross-tenant

**Decisione:** 1 `auth.users` + N `clients` (uno per tenant). `profile_id` nullable.

**Schema concettuale:**
```
Luca (auth.users, telefono +39 333...)
    │
    ├── clients (tenant: "Marco's Barber") → 450 punti, streak 3, Silver
    │
    └── clients (tenant: "Andrea's Barber") → 120 punti, streak 1, Bronze
```

**Regole:**
- Ogni barbiere ha il suo record `clients` per Luca, con loyalty separata
- Marco non sa nulla di cosa Luca fa da Andrea
- `clients.profile_id` è **nullable**: Roberto non ha l'app → `profile_id = NULL`, ma esiste nel CRM
- Vincolo `UNIQUE(tenant_id, phone)`: stesso telefono unico per tenant, ma può esistere in più tenant
- Se Roberto installa la PWA e fa login, il sistema collega il suo `auth.users` al record CRM esistente. Zero punti persi

---

#### Decisione 5 — Tracciamento prenotazioni

**Decisione:** Due campi separati in `appointments`: `booked_by` (chi) + `booking_source` (da dove).

| Campo | Cosa traccia | Esempio |
|-------|-------------|---------|
| `booked_by` | UUID del profilo che ha creato la prenotazione (nullable per guest) | Luca, Anna (receptionist), NULL (guest) |
| `booking_source` | Canale/strumento usato | `'pwa'`, `'dashboard_staff'`, `'dashboard_receptionist'`, `'dashboard_owner'`, `'walk_in'` |

**Perché entrambi:**
- `booked_by` → chi contattare se c'è un problema
- `booking_source` → analytics: "60% PWA, 25% dashboard, 15% walk-in"

---

#### Decisione 6 — Slot temporali

**Decisione:** Calcolati runtime via Edge Function. Mai tabella pre-generata.

**Flusso:**
1. Luca sceglie "Taglio + Barba" (45 min) nella PWA
2. Edge Function prende gli orari di lavoro di Marco per quel giorno
3. Controlla eccezioni (ferie, chiusure)
4. Prende gli appuntamenti già confermati
5. Sottrae gli appuntamenti dagli orari → mostra i buchi ≥ 45 min

**Perché no tabella slot:** 1 barbiere = ~6.000 righe/anno di slot. 1.000 barbieri = 6 milioni di righe, 95% vuote. Calcolarli al volo: pochi millisecondi, sempre aggiornati, zero spreco.

---

#### Decisione 7 — Analytics e metriche clienti

**Decisione:** Tabella reale `client_analytics` + trigger su appointment completato + cron job notturno.

**Cosa viene pre-calcolato:**

| Metrica | Aggiornamento |
|---------|--------------|
| Visite totali | Trigger (dopo ogni appuntamento completato) |
| Spesa totale servizi | Trigger |
| Spesa totale prodotti | Trigger |
| Data ultima visita | Trigger |
| Frequenza media (giorni) | Cron notturno |
| Giorni dall'ultima visita | Cron notturno |
| Semaforo churn 🟢🟡🔴 | Cron notturno |
| VIP Score | Cron notturno |

**Semaforo churn — logica:**

| Semaforo | Condizione | Significato |
|----------|-----------|-------------|
| 🟢 Verde | Ultima visita ≤ frequenza media | Tutto regolare |
| 🟡 Giallo | Ultima visita tra 1x e 1.5x frequenza media | A rischio |
| 🔴 Rosso | Ultima visita > 1.5x frequenza media | Sta sparendo |

**Esempio:** Roberto viene ogni 28 giorni → giorno 25: 🟢 → giorno 35: 🟡 → giorno 45: 🔴

**Perché tabella reale e non calcolato runtime:** Con 200 clienti, calcolare tutto al volo ad ogni apertura della dashboard significherebbe analizzare migliaia di appuntamenti. Con le metriche pre-calcolate, la dashboard legge numeri già pronti → istantaneo.

---

#### Decisione 8 — Cancellazione dati

**Decisione:** `deleted_at` per persone/eventi, `is_active` per catalogo/configurazioni.

| Tipo dato | Meccanismo | Tabelle | Motivo |
|-----------|-----------|---------|--------|
| Persone/eventi | `deleted_at TIMESTAMPTZ` (nullable) | `clients`, `appointments`, `staff_members` | Lo storico (appuntamenti, revenue, loyalty) non si perde mai |
| Catalogo/config | `is_active BOOLEAN DEFAULT true` | `services`, `products`, `rewards`, `locations` | Il barbiere potrebbe riattivarlo. Lo storico è protetto dagli snapshot |

**Regola:** `deleted_at` per cose che "spariscono". `is_active` per cose che si "accendono e spengono".

---

### Le 10 aree funzionali del database

Il database è organizzato in 10 macro-aree, dalle fondamenta verso le funzionalità più alte.

---

#### AREA 1 — Business e Abbonamenti (le fondamenta)

**Scopo:** I barbershop registrati, i piani disponibili, lo stato dell'abbonamento.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `tenants` | Il business (barbershop) | No (è la root) | `id`, `business_name`, `slug` (subdomain), `logo_url`, `primary_color`, `secondary_color`, `font_family`, `feature_flag_overrides` (JSONB), `status` (active/suspended), `created_at`, `updated_at` |
| `subscription_plans` | I 3 tier | No (globale) | `id`, `name`, `slug`, `price_monthly`, `max_staff`, `max_locations`, `max_messages_month`, `feature_flags` (JSONB), `is_active`, `created_at` |
| `tenant_subscriptions` | Collegamento tenant → piano | Sì | `id`, `tenant_id`, `plan_id`, `status`, `trial_ends_at`, `current_period_start`, `current_period_end`, `stripe_subscription_id` (nullable, per v2), `stripe_customer_id` (nullable), `created_at`, `updated_at` |

**Relazioni:**
```
subscription_plans ←── tenant_subscriptions ──→ tenants
(1 piano serve N barbieri)     (ogni barbiere ha 1 abbonamento attivo)
```

**Chi vede cosa:**
| Ruolo | `tenants` | `subscription_plans` | `tenant_subscriptions` |
|-------|-----------|---------------------|----------------------|
| Admin | ✅ Tutti | ✅ | ✅ Tutti |
| Titolare | ✅ Solo il suo | ✅ | ✅ Solo il suo |
| Manager | ✅ Solo il suo | ✅ | ❌ |
| Staff | ✅ Solo il suo (dati base) | ❌ | ❌ |
| Receptionist | ✅ Solo il suo (dati base) | ❌ | ❌ |
| Cliente | ✅ Solo branding (nome, colori, logo) | ❌ | ❌ |

---

#### AREA 2 — Utenti e Staff

**Scopo:** Identità di tutti gli utenti e ruoli dello staff dentro ogni barbershop.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `profiles` | Profilo esteso di ogni `auth.users` | No (collegata a `auth.users`) | `id` (= `auth.users.id`), `user_type` ('staff'/'client'/'admin'), `full_name`, `phone`, `avatar_url`, `created_at`, `updated_at` |
| `staff_members` | Staff di un tenant con ruolo | Sì | `id`, `tenant_id`, `profile_id` → `profiles.id`, `role` ('owner'/'manager'/'staff'/'receptionist'), `bio`, `photo_url`, `is_active`, `deleted_at`, `created_at`, `updated_at` |
| `staff_locations` | Ponte N:N: staff ↔ sedi | Sì | `id`, `tenant_id`, `staff_id` → `staff_members.id`, `location_id` → `locations.id` |

**Relazioni:**
```
auth.users ──→ profiles ──→ staff_members ──→ tenants
                                   │
                                   └── staff_locations ──→ locations
```

**Perché `profiles` è separata da `staff_members`:**
- `profiles` esiste per OGNI utente autenticato (staff, client, admin) — è 1:1 con `auth.users`
- `staff_members` esiste solo per chi LAVORA in un tenant — è il ruolo contestualizzato
- Le RLS su `profiles` sono semplici ("vedi il tuo profilo"), quelle su `staff_members` sono per-tenant

**Perché `staff_locations` è una tabella ponte:**
Anna lavora in 2 sedi, Giulia in 1. Relazione molti-a-molti → tabella ponte. Un array in `staff_members` impedirebbe JOIN e query efficienti.

**Chi vede cosa:**
| Ruolo | `profiles` | `staff_members` | `staff_locations` |
|-------|-----------|-----------------|-------------------|
| Admin | ✅ Tutti | ✅ Tutti | ✅ Tutti |
| Titolare | ✅ Staff del suo tenant | ✅ Tutto il suo tenant | ✅ Tutto il suo tenant |
| Manager | ✅ Staff del suo tenant | ✅ Tutto il suo tenant | ✅ Tutto il suo tenant |
| Staff | ✅ Solo il suo | ✅ Solo il suo record | ✅ Solo le sue sedi |
| Receptionist | ✅ Staff del suo tenant (lettura) | ✅ Lettura | ✅ Lettura |
| Cliente | ✅ Staff del barbiere (nome, foto, bio) | ✅ Lettura (nome, foto, servizi) | ❌ |

---

#### AREA 3 — Catalogo Servizi e Prodotti

**Scopo:** Cosa offre il barbiere (servizi con durata) e cosa vende (prodotti con giacenza).

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `services` | Menu servizi | Sì | `id`, `tenant_id`, `name`, `description`, `price`, `duration_minutes`, `category`, `display_order`, `is_active`, `created_at`, `updated_at` |
| `staff_services` | Ponte N:N: staff ↔ servizi | Sì | `id`, `tenant_id`, `staff_id` → `staff_members.id`, `service_id` → `services.id` |
| `products` | Catalogo prodotti | Sì | `id`, `tenant_id`, `name`, `brand`, `price_sell`, `price_cost`, `sku` (opzionale), `photo_url`, `category`, `is_active`, `created_at`, `updated_at` |
| `product_inventory` | Giacenza per prodotto per sede | Sì | `id`, `tenant_id`, `product_id` → `products.id`, `location_id` → `locations.id`, `quantity`, `low_stock_threshold`, `updated_at` |

**Relazioni:**
```
services ←── staff_services ──→ staff_members
(quali servizi offre ogni barbiere)

products ──→ product_inventory ──→ locations
(giacenza separata per sede)
```

**Perché servizi e prodotti sono in tabelle separate:**
- Servizio = tempo (ha `duration_minutes`, serve per calcolare slot liberi). Prodotto = bene fisico (ha `quantity`, `price_cost`, `sku`)
- Metterli insieme → metà colonne sempre NULL → God table → anti-pattern

**Perché `product_inventory` è separata da `products`:**
- La giacenza è per sede: Matt Clay può avere 12 pezzi a Roma Centro e 3 a Roma Nord
- `products` = catalogo (definito una volta). `product_inventory` = stato (cambia ad ogni vendita)
- Trigger su `product_inventory` per alert "scorta bassa" senza toccare il catalogo

**Chi vede cosa:**
| Ruolo | `services` | `staff_services` | `products` | `product_inventory` |
|-------|-----------|------------------|-----------|-------------------|
| Titolare | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| Manager | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| Staff | ✅ Lettura (i suoi) | ✅ Lettura | ✅ Lettura | ✅ Lettura |
| Receptionist | ✅ Lettura | ✅ Lettura | ❌ | ❌ |
| Cliente (PWA) | ✅ Lettura (solo attivi) | ✅ Lettura | ❌ | ❌ |

---

#### AREA 4 — Calendario e Appuntamenti

**Scopo:** Orari di lavoro, eccezioni, e tutti gli appuntamenti con servizi e prodotti collegati.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `working_hours` | Orari settimanali ricorrenti per staff | Sì | `id`, `tenant_id`, `staff_id`, `day_of_week` (0-6), `start_time` (TIME), `end_time` (TIME), `created_at` |
| `working_hour_overrides` | Eccezioni per data specifica | Sì | `id`, `tenant_id`, `staff_id`, `date` (DATE), `is_closed` (BOOLEAN), `start_time` (TIME, nullable), `end_time` (TIME, nullable), `reason`, `created_at` |
| `appointments` | L'appuntamento | Sì | `id`, `tenant_id`, `client_id`, `staff_id`, `location_id`, `start_time` (TIMESTAMPTZ), `end_time` (TIMESTAMPTZ), `status` ('pending'/'confirmed'/'completed'/'cancelled'/'no_show'), `booking_source`, `booked_by` (nullable), `payment_status` ('unpaid'/'paid'/'refunded'), `payment_method` ('cash'/'card'/'online'/'other'), `notes`, `deleted_at`, `created_at`, `updated_at` |
| `appointment_services` | Servizi nell'appuntamento con prezzo snapshot | Sì | `id`, `tenant_id`, `appointment_id`, `service_id`, `price_at_booking` (DECIMAL), `created_at` |
| `appointment_products` | Prodotti venduti con prezzo e quantità snapshot | Sì | `id`, `tenant_id`, `appointment_id`, `product_id`, `quantity`, `price_at_sale` (DECIMAL), `created_at` |

**Relazioni:**
```
working_hours ──→ staff_members (orari ricorrenti)
working_hour_overrides ──→ staff_members (eccezioni per data)

appointments ──→ clients + staff_members + locations
    ├── appointment_services ──→ services (con prezzo fotografato)
    └── appointment_products ──→ products (con prezzo e quantità fotografati)
```

**Perché `working_hours` e `working_hour_overrides` sono separate:**
- `working_hours` = orari RICORRENTI (ogni lunedì 9-13, 15-19). Pattern settimanale
- `working_hour_overrides` = ECCEZIONI per una data specifica (25 dicembre: chiuso)
- Query slot: "prendi gli orari del giorno della settimana → applica l'override se esiste per quella data"

**Perché slot multipli per giorno in `working_hours`:**
Marco lavora 9-13 e 15-19 il lunedì → 2 righe per lo stesso giorno. Questo modella la pausa pranzo senza campi extra.

**Prezzo snapshot:** Quando Luca prenota Taglio a €15, quel prezzo va in `appointment_services.price_at_booking`. Se domani Marco alza a €18, lo storico di Luca mostra ancora €15.

**Chi vede cosa:**
| Ruolo | `working_hours` | `appointments` | `appointment_services/products` |
|-------|----------------|----------------|-------------------------------|
| Titolare | ✅ CRUD tutti | ✅ CRUD tutti | ✅ CRUD tutti |
| Manager | ✅ CRUD tutti | ✅ CRUD tutti | ✅ CRUD tutti |
| Staff | ✅ CRUD i suoi | ✅ Solo i suoi | ✅ Solo i suoi |
| Receptionist | ✅ Lettura tutti | ✅ Crea per tutti, legge tutti | ✅ Lettura |
| Cliente | ❌ | ✅ Solo i suoi (lettura + crea) | ✅ Lettura i suoi |

---

#### AREA 5 — Clienti e CRM

**Scopo:** Il cuore del CRM. Ogni cliente con dati, preferenze e note private separate.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `clients` | Il cliente nel CRM | Sì | `id`, `tenant_id`, `profile_id` (nullable) → `profiles.id`, `full_name`, `phone`, `email`, `date_of_birth`, `preferred_contact_channel` ('push'/'whatsapp'/'sms'/'email'), `marketing_consent` (BOOLEAN), `data_consent` (BOOLEAN), `consent_date` (TIMESTAMPTZ), `tags` (JSONB, es. `["VIP", "nuovo"]`), `deleted_at`, `created_at`, `updated_at` |
| `client_notes` | Note private del barbiere | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `staff_id` → `staff_members.id` (chi ha scritto), `note_text`, `created_at` |

**Relazioni:**
```
clients ──→ tenants
clients ──→ profiles (nullable: Roberto non ha l'app)
clients ←── client_notes (N note per cliente, con autore e data)
```

**Perché `client_notes` è separata:**
- Le note ("vuole il 3 ai lati", "allergico al lattice") sono dati sensibili GDPR
- Il cliente NON deve MAI vederle, neanche con l'app
- Tabella separata → RLS semplice: "solo staff del tenant può leggere/scrivere"
- Un cliente ha MOLTE note nel tempo (una per visita) → non è un singolo campo di testo

**Vincoli:**
- `UNIQUE(tenant_id, phone)` — stesso telefono unico per barbiere
- `profile_id` nullable — il collegamento all'account avviene quando/se il cliente fa login

**Chi vede cosa:**
| Ruolo | `clients` (dati) | `client_notes` |
|-------|------------------|----------------|
| Titolare | ✅ CRUD tutti | ✅ CRUD |
| Manager | ✅ CRUD tutti | ✅ CRUD |
| Staff | ✅ I suoi clienti (assegnati/serviti) | ✅ CRUD (le sue note) |
| Receptionist | ✅ Lettura tutti + crea nuovi | ❌ |
| Cliente (PWA) | ✅ Solo il suo profilo (lettura + modifica dati base) | ❌ **MAI** |

---

#### AREA 6 — Loyalty e Gamification

**Scopo:** Sistema a 4 layer. v1 = solo punti (Classico). v2 = streak + badge + tier + sfide.

**Tabelle v1:**

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `loyalty_configs` | Config loyalty del tenant | Sì | `id`, `tenant_id`, `is_active` (BOOLEAN), `template` ('classic'/'streak_master'/'vip_club'), `points_per_visit` (per Classico), `points_per_euro` (per Streak Master), `streak_threshold_days` (default 45), `created_at`, `updated_at` |
| `rewards` | Catalogo ricompense (max 6) | Sì | `id`, `tenant_id`, `name`, `description`, `points_cost`, `reward_type` ('product'/'service'/'discount'/'custom'), `display_order`, `is_active`, `created_at`, `updated_at` |
| `client_loyalty` | Stato loyalty del cliente | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `total_points`, `available_points`, `current_streak`, `longest_streak`, `current_tier` (default 'bronze'), `tier_points_this_year`, `tier_year`, `last_visit_date`, `created_at`, `updated_at` |
| `loyalty_transactions` | Log ogni operazione punti | Sì | `id`, `tenant_id`, `client_id`, `type` ('earn'/'redeem'/'bonus'/'import'/'expire'/'adjustment'), `points` (positivo o negativo), `description`, `appointment_id` (nullable), `staff_id` (nullable, chi ha assegnato), `created_at` |
| `reward_redemptions` | Riscatti effettuati | Sì | `id`, `tenant_id`, `client_id`, `reward_id` → `rewards.id`, `points_spent`, `confirmed_by` → `staff_members.id`, `confirmed_at`, `created_at` |

**Tabelle v2 (da aggiungere in futuro, NON creare in v1):**

| Tabella | Scopo | Colonne principali |
|---------|-------|-------------------|
| `tier_configs` | Config 4 livelli per tenant | `id`, `tenant_id`, `tier_name`, `min_points`, `benefits` (JSONB, ogni beneficio ON/OFF), `visual_style` (JSONB, bordo/badge/animazione), `display_order` |
| `badges` | Catalogo badge del tenant | `id`, `tenant_id`, `name`, `description`, `icon_url`, `condition_type`, `condition_value`, `is_active` |
| `client_badges` | Badge sbloccati per cliente | `id`, `tenant_id`, `client_id`, `badge_id`, `unlocked_at` |
| `challenges` | Sfide temporanee | `id`, `tenant_id`, `name`, `description`, `goal_type`, `goal_value`, `reward_points`, `starts_at`, `ends_at`, `is_active` |

**Relazioni:**
```
loyalty_configs ──→ tenants (1:1, ogni barbiere ha 1 config loyalty)
rewards ──→ tenants (1:N, ogni barbiere ha max 6 rewards)
client_loyalty ──→ clients (1:1, ogni cliente ha 1 stato loyalty)
loyalty_transactions ──→ clients + appointments (log di ogni movimento)
reward_redemptions ──→ clients + rewards + staff_members (chi conferma il riscatto)
```

**Perché `total_points` e `available_points` sono separati in `client_loyalty`:**
- `total_points` = tutti i punti MAI guadagnati (solo cresce). Serve per tier e statistiche
- `available_points` = punti disponibili per riscatto (cresce e decresce). `total_points - punti_riscattati`
- Esempio: Luca ha guadagnato 5.000 punti totali, ne ha riscattati 3.000 → `total_points: 5000`, `available_points: 2000`

**Perché `loyalty_transactions` è fondamentale:**
Senza questa tabella, non puoi rispondere a: "Quando ha guadagnato questi punti? Per quale visita? Chi glieli ha assegnati manualmente?". È l'audit trail completo della loyalty. Ogni riga = un evento con data, tipo, punti, e contesto.

**Chi vede cosa:**
| Ruolo | `loyalty_configs` | `rewards` | `client_loyalty` | `transactions` | `redemptions` |
|-------|------------------|-----------|-----------------|----------------|---------------|
| Titolare | ✅ CRUD | ✅ CRUD | ✅ Lettura tutti | ✅ Lettura | ✅ Lettura + conferma |
| Manager | ✅ Lettura | ✅ Lettura | ✅ Lettura tutti | ✅ Lettura | ✅ Conferma |
| Staff | ❌ | ✅ Lettura | ✅ Lettura (i suoi clienti) | ✅ Crea (assegna punti) | ✅ Conferma |
| Receptionist | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cliente (PWA) | ❌ | ✅ Lettura (attivi) | ✅ Solo il suo | ✅ Solo i suoi | ✅ Solo i suoi |

---

#### AREA 7 — Messaggistica

**Scopo:** Template messaggi e registro di tutto ciò che viene inviato.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `message_templates` | Modelli con segnaposto | Sì | `id`, `tenant_id`, `name`, `type` ('reminder'/'confirmation'/'win_back'/'review_request'/'loyalty_update'/'custom'), `channel` ('sms'/'whatsapp'/'email'/'push'), `subject` (per email), `body` (con placeholder: `{client_name}`, `{appointment_date}`, `{staff_name}`...), `is_active`, `created_at`, `updated_at` |
| `messages_log` | Log messaggi inviati | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `template_id` → `message_templates.id` (nullable), `channel` ('sms'/'whatsapp'/'email'/'push'), `type`, `recipient` (telefono o email), `body_sent` (testo effettivo inviato), `status` ('queued'/'sent'/'delivered'/'failed'/'bounced'), `cost` (DECIMAL, nullable), `external_id` (ID del provider es. MessageBird), `sent_at`, `created_at` |

**Relazioni:**
```
message_templates ──→ tenants
messages_log ──→ tenants + clients + message_templates (opzionale)
```

**Perché separate:**
- Template = definizione ("Ciao {client_name}, domani alle {appointment_time}...")
- Log = evento ("Inviato a Roberto via SMS alle 18:00, delivered, €0.045")
- Un template viene usato migliaia di volte → 1:N

**Il `body_sent` nel log:** Salviamo il testo effettivo inviato (con i placeholder già risolti) perché se il template cambia in futuro, lo storico dei messaggi inviati resta intatto.

**Chi vede cosa:**
| Ruolo | `message_templates` | `messages_log` |
|-------|--------------------|--------------  |
| Titolare | ✅ CRUD | ✅ Lettura tutti |
| Manager | ✅ CRUD | ✅ Lettura tutti |
| Staff | ❌ | ✅ Lettura (i suoi clienti) |
| Receptionist | ❌ | ❌ |
| Cliente | ❌ | ❌ |

---

#### AREA 8 — Analytics e Churn Detection

**Scopo:** Metriche pre-calcolate per ogni cliente. Aggiornate automaticamente.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `client_analytics` | Metriche calcolate | Sì | `id`, `tenant_id`, `client_id` → `clients.id` (UNIQUE 1:1), `total_visits`, `total_spent_services` (DECIMAL), `total_spent_products` (DECIMAL), `average_visit_frequency_days`, `last_visit_date`, `days_since_last_visit`, `churn_status` ('green'/'yellow'/'red'), `vip_score` (INTEGER 0-100), `first_visit_date`, `updated_at` |

**Relazione:**
```
client_analytics ──→ clients (1:1)
```

**Quando si aggiorna:**
- **Trigger** (dopo appointment completato): `total_visits`, `total_spent_*`, `last_visit_date`, `days_since_last_visit`
- **Cron notturno** (ogni notte): `days_since_last_visit` (cambia ogni giorno anche senza nuovi appuntamenti), `churn_status`, `vip_score`, `average_visit_frequency_days`

**Chi vede cosa:**
| Ruolo | `client_analytics` |
|-------|--------------------|
| Titolare | ✅ Tutti i clienti |
| Manager | ✅ Tutti i clienti |
| Staff | ✅ I suoi clienti |
| Receptionist | ❌ |
| Cliente | ❌ **MAI** (il cliente non deve vedere il suo semaforo churn o VIP score) |

---

#### AREA 9 — Recensioni

**Scopo:** Tracciare le richieste di recensione inviate (v1 = link esterno Google Reviews).

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `review_requests` | Richiesta inviata | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `appointment_id` → `appointments.id` (nullable), `google_review_url`, `status` ('sent'/'clicked'/'completed'/'expired'), `sent_at`, `clicked_at`, `created_at` |

**Relazione:**
```
review_requests ──→ clients + appointments (opzionale)
```

**Perché serve:** Per non inviare la richiesta 2 volte per la stessa visita. Per analytics: "quante recensioni richieste? quante completate?".

**Chi vede cosa:**
| Ruolo | `review_requests` |
|-------|-------------------|
| Titolare | ✅ Lettura + invio |
| Manager | ✅ Lettura + invio |
| Staff | ✅ Lettura (i suoi clienti) |
| Receptionist | ❌ |
| Cliente | ❌ |

---

#### AREA 10 — Amministrazione Piattaforma

**Scopo:** Gestione admin. L'admin monitora la salute della piattaforma, NON i dati operativi dei singoli barbieri.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `admin_users` | Admin piattaforma | No (globale) | `id`, `profile_id` → `profiles.id`, `role` ('superadmin'/'support'), `created_at` |
| `tenant_activity_log` | Metriche aggregate per tenant | Sì (ma visibile solo ad admin) | `id`, `tenant_id`, `last_login_at`, `appointments_this_month`, `active_clients_count`, `total_revenue_this_month` (DECIMAL), `staff_count`, `updated_at` |

**Relazioni:**
```
admin_users ──→ profiles
tenant_activity_log ──→ tenants
```

**Cosa l'admin vede vs NON vede:**
| ✅ Vede | ❌ NON vede |
|---------|------------|
| Quanti barbieri sono attivi | Gli appuntamenti dei singoli clienti |
| Quale piano ha ogni barbiere | Le note private dei barbieri |
| Ultimo accesso | I dettagli dei servizi/prodotti |
| Numero clienti e appuntamenti | I nomi o i dati dei clienti |
| Revenue aggregato | Dettagli delle transazioni |

---

### Mappa relazioni tra le 10 aree

```
┌──────────────────────────────────────────────────────────────┐
│                AREA 10: ADMIN PIATTAFORMA                    │
│           Monitora la salute di tutti i barbieri             │
└──────────────────────┬───────────────────────────────────────┘
                       │ monitora
┌──────────────────────▼───────────────────────────────────────┐
│              AREA 1: BUSINESS E ABBONAMENTI                  │
│        Chi sono i barbieri, che piano hanno                   │
└────────┬────────────────────────────────────────────┬────────┘
         │                                            │
         ▼                                            ▼
┌─────────────────────┐                  ┌──────────────────────┐
│  AREA 2: UTENTI     │                  │  AREA 3: CATALOGO    │
│  Chi lavora qui     │◄── chi offre ──►│  Cosa offre/vende    │
│  e con quale ruolo  │    cosa          │                      │
└────────┬────────────┘                  └──────────┬───────────┘
         │                                          │
         │       ┌──────────────────────────┐       │
         └──────►│  AREA 4: APPUNTAMENTI    │◄──────┘
                 │  Quando, con chi, cosa   │
                 └────────────┬─────────────┘
                              │
                 ┌────────────▼─────────────┐
                 │  AREA 5: CLIENTI / CRM   │
                 │  Chi sono i clienti      │
                 └──┬─────────────┬─────────┘
                    │             │
         ┌──────────▼───┐  ┌─────▼──────────────┐
         │  AREA 6:     │  │  AREA 8:           │
         │  LOYALTY E   │  │  ANALYTICS E       │
         │  GAMIFICATION│  │  CHURN DETECTION   │
         └──────┬───────┘  └────────────────────┘
                │
     ┌──────────▼──────────┐    ┌────────────────────┐
     │  AREA 7:            │    │  AREA 9:           │
     │  MESSAGGISTICA      │    │  RECENSIONI        │
     └─────────────────────┘    └────────────────────┘
```

---

### Riepilogo tabelle per fase

**v1 (MVP) — 28 tabelle:**

| Area | Tabelle |
|------|---------|
| 1. Business | `tenants`, `subscription_plans`, `tenant_subscriptions` |
| 2. Utenti | `profiles`, `staff_members`, `staff_locations` |
| 3. Catalogo | `services`, `staff_services`, `products`, `product_inventory` |
| 4. Appuntamenti | `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products` |
| 5. CRM | `clients`, `client_notes` |
| 6. Loyalty | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions` |
| 7. Messaggi | `message_templates`, `messages_log` |
| 8. Analytics | `client_analytics` |
| 9. Recensioni | `review_requests` |
| 10. Admin | `admin_users`, `tenant_activity_log` |

**v2 (Growth) — +5 tabelle:**

| Area | Tabelle aggiunte |
|------|-----------------|
| 3. Catalogo | `inventory_movements` |
| 6. Gamification | `tier_configs`, `badges`, `client_badges`, `challenges` |

**Totale: 33 tabelle** (28 v1 + 5 v2)

**Tabelle senza `tenant_id` (globali):**
- `subscription_plans` — i piani sono uguali per tutti
- `admin_users` — gli admin non appartengono a nessun barbiere
- `profiles` — collegata a `auth.users`, non a un tenant specifico
- `auth.users` — gestita da Supabase, non la creiamo noi

**Tutte le altre 29 tabelle hanno `tenant_id`.**

---

### Regole architetturali — Le 8 regole d'oro

| # | Regola | Perché |
|---|--------|--------|
| 1 | **Ogni dato ha un `tenant_id`** (tranne globali) | Isolamento totale: Marco non vede mai i dati di Andrea |
| 2 | **RLS obbligatorie su ogni tabella** | Nessun dato accessibile senza regola esplicita |
| 3 | **Non si cancella mai davvero** | `deleted_at` per persone/eventi, `is_active` per catalogo |
| 4 | **I prezzi sono fotografati** (snapshot) | Lo storico non cambia se il barbiere aggiorna un prezzo |
| 5 | **Il CRM è la fonte unica di verità** | La loyalty funziona con e senza l'app del cliente |
| 6 | **Le note del barbiere sono SEMPRE private** | Tabella separata, il cliente non le vede MAI (GDPR) |
| 7 | **UUID come primary key ovunque** | Impossibile da indovinare, sicuro, senza collisioni |
| 8 | **Schema v1 pronto per v2** senza riscritture | Le tabelle v2 si aggiungono sopra, non si riscrive ciò che esiste |

---

### Indici consigliati (da creare con le tabelle)

Gli indici accelerano le query più frequenti. Ecco quelli necessari:

| Tabella | Colonne indicizzate | Perché |
|---------|--------------------|--------|
| `appointments` | `tenant_id, staff_id, start_time` | Query più frequente: "appuntamenti di Marco oggi/questa settimana" |
| `appointments` | `tenant_id, client_id` | "Storico appuntamenti di Luca" |
| `appointments` | `tenant_id, status` | "Tutti gli appuntamenti confermati" |
| `appointments` | `tenant_id, location_id, start_time` | "Appuntamenti di oggi a Roma Centro" |
| `clients` | `tenant_id, phone` | Ricerca cliente per telefono (+ vincolo UNIQUE) |
| `clients` | `tenant_id, deleted_at` | Filtrare i clienti non cancellati |
| `client_loyalty` | `tenant_id, client_id` | Stato loyalty di un cliente |
| `client_analytics` | `tenant_id, churn_status` | "Quanti clienti sono 🔴?" |
| `client_analytics` | `tenant_id, vip_score` | "Top 10 clienti VIP" |
| `loyalty_transactions` | `tenant_id, client_id, created_at` | "Storico punti di Luca, ordinato per data" |
| `messages_log` | `tenant_id, client_id` | "Tutti i messaggi inviati a Roberto" |
| `messages_log` | `tenant_id, sent_at` | "Messaggi inviati questo mese" |
| `working_hours` | `tenant_id, staff_id, day_of_week` | Calcolo slot disponibili |
| `working_hour_overrides` | `tenant_id, staff_id, date` | Eccezioni orario per data |
| `product_inventory` | `tenant_id, product_id, location_id` | Giacenza di un prodotto in una sede |
| `staff_members` | `tenant_id, role` | "Tutti i barbieri del mio tenant" |
| `review_requests` | `tenant_id, client_id, appointment_id` | Evitare richieste duplicate |
| `tenant_subscriptions` | `tenant_id, status` | "Il mio abbonamento è attivo?" |

---

### Prossimo step

Con questo documento, tutte le decisioni sono prese. Il prossimo step è:

1. **Scrivere lo SQL** — creare le tabelle area per area, partendo da Area 1 + Area 2
2. **Scrivere le RLS policy** — per ogni tabella, in base alla matrice "chi vede cosa"
3. **Scrivere i trigger** — per aggiornamento automatico `client_analytics`
4. **Scrivere il cron job** — per churn detection notturno
5. **Testare** — inserire dati di test e verificare che le policy funzionino

---