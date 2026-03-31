
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
| **Exclusion constraint** | Vincolo PostgreSQL che impedisce che due righe si sovrappongano (es. due appuntamenti allo stesso orario per lo stesso barbiere) |
| **Partial unique index** | Indice UNIQUE che si applica solo alle righe che soddisfano una condizione (es. "un solo abbonamento attivo per tenant") |
| 🆕 **Indice (Index)** | Struttura che velocizza le ricerche nel database. Come l'indice di un libro: invece di leggere tutto, vai diretto alla pagina giusta |
| 🆕 **Partitioning** | Dividere una tabella enorme in "pezzi" più piccoli per periodo (es. per trimestre). Le query cercano solo nel pezzo giusto |
| 🆕 **Retention policy** | Regola che dice per quanto tempo conservare certi dati prima di archiviarli o eliminarli |

---

### Le 12 decisioni architetturali fondamentali

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

**Vincolo di unicità abbonamento attivo:**
Un tenant può avere UN SOLO abbonamento in stato operativo alla volta. Implementato con partial unique index:
```sql
CREATE UNIQUE INDEX idx_tenant_subscriptions_one_active
ON tenant_subscriptions (tenant_id)
WHERE status IN ('trial', 'active', 'past_due');
```
Questo impedisce che un bug o una race condition nel flusso admin/Stripe crei due abbonamenti attivi contemporaneamente. Gli abbonamenti `suspended` e `cancelled` restano come storico.

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

#### Decisione 6 — Slot temporali e prevenzione sovrapposizioni

**Decisione:** Calcolati runtime via Edge Function. Mai tabella pre-generata. Sovrapposizioni impedite a livello di database.

**Flusso:**
1. Luca sceglie "Taglio + Barba" (45 min) nella PWA
2. Edge Function prende gli orari di lavoro di Marco per quel giorno
3. Controlla eccezioni (ferie, chiusure)
4. Prende gli appuntamenti già confermati
5. Sottrae gli appuntamenti dagli orari → mostra i buchi ≥ 45 min

**Perché no tabella slot:** 1 barbiere = ~6.000 righe/anno di slot. 1.000 barbieri = 6 milioni di righe, 95% vuote. Calcolarli al volo: pochi millisecondi, sempre aggiornati, zero spreco.

**Prevenzione sovrapposizioni (race condition):**
Se Luca e Anna prenotano lo stesso slot nello stesso istante, il database deve impedirlo. Implementato con exclusion constraint PostgreSQL:

```sql
-- Richiede l'estensione btree_gist (già disponibile su Supabase)
ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_appointments
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL);
```

**Come funziona:**
- Se Marco ha un appuntamento 10:00-10:45, nessun altro appuntamento può sovrapporsi per Marco in quel range
- Gli appuntamenti cancellati o no-show non bloccano lo slot
- Funziona a livello di database → impossibile da aggirare, anche con race condition nell'applicazione
- L'Edge Function calcola gli slot disponibili, il constraint è la **rete di sicurezza** finale

---

#### Decisione 7 — Analytics e metriche clienti

**Decisione:** Tabella reale `client_analytics` + trigger su appointment completato/modificato + cron job notturno con riconciliazione completa.

**Cosa viene pre-calcolato:**

| Metrica | Aggiornamento primario | Riconciliazione |
|---------|----------------------|-----------------|
| Visite totali | Trigger (dopo ogni cambio status appointment) | Cron notturno (ricalcolo completo) |
| Spesa totale servizi | Trigger | Cron notturno (ricalcolo completo) |
| Spesa totale prodotti | Trigger | Cron notturno (ricalcolo completo) |
| Data ultima visita | Trigger | Cron notturno (ricalcolo completo) |
| Frequenza media (giorni) | Cron notturno | — |
| Giorni dall'ultima visita | Cron notturno | — |
| Semaforo churn 🟢🟡🔴 | Cron notturno | — |
| VIP Score | Cron notturno | — |

**Semaforo churn — logica:**

| Semaforo | Condizione | Significato |
|----------|-----------|-------------|
| 🟢 Verde | Ultima visita ≤ frequenza media | Tutto regolare |
| 🟡 Giallo | Ultima visita tra 1x e 1.5x frequenza media | A rischio |
| 🔴 Rosso | Ultima visita > 1.5x frequenza media | Sta sparendo |

**Esempio:** Roberto viene ogni 28 giorni → giorno 25: 🟢 → giorno 35: 🟡 → giorno 45: 🔴

**Perché tabella reale e non calcolato runtime:** Con 200 clienti, calcolare tutto al volo ad ogni apertura della dashboard significherebbe analizzare migliaia di appuntamenti. Con le metriche pre-calcolate, la dashboard legge numeri già pronti → istantaneo.

**Strategia di riconciliazione (safety net):**
Il trigger è veloce ma fragile: se un appuntamento viene segnato come `completed` e poi corretto in `no_show`, o se un appuntamento viene soft-deleted, il trigger potrebbe lasciare dati inconsistenti. Per questo:

1. **Il trigger scatta su OGNI cambio di status** (non solo su `completed`) e ricalcola le metriche per quel cliente
2. **Il cron notturno ricalcola TUTTO** per ogni cliente: conta gli appuntamenti `completed` reali, somma i prezzi reali, ricalcola la frequenza. Se trova discrepanze col trigger, sovrascrive
3. Questo significa che nel peggiore dei casi, un dato sbagliato vive massimo fino alla notte successiva

**✏️ Relazione tra i 3 contatori punti in `client_loyalty` (chiarimento):**
Il cron notturno di riconciliazione deve mantenere coerenti anche i contatori punti:
- `total_points` = somma di tutti i `loyalty_transactions.points` dove `type = 'earn'` o `type = 'bonus'` o `type = 'import'`
- `available_points` = `total_points` - somma dei punti riscattati (`type = 'redeem'`) - somma dei punti scaduti (`type = 'expire'`)
- `tier_points_this_year` = somma dei `loyalty_transactions.points` dove `type IN ('earn', 'bonus')` e `created_at` nell'anno corrente (`tier_year`)

Se il cron trova discrepanze tra i contatori materializzati e il calcolo reale dalle transazioni, sovrascrive.

---

#### Decisione 8 — Cancellazione dati

**Decisione:** `deleted_at` per persone/eventi, `is_active` per catalogo/configurazioni.

| Tipo dato | Meccanismo | Tabelle | Motivo |
|-----------|-----------|---------|--------|
| Persone/eventi | `deleted_at TIMESTAMPTZ` (nullable) | `clients`, `appointments`, `staff_members` | Lo storico (appuntamenti, revenue, loyalty) non si perde mai |
| Catalogo/config | `is_active BOOLEAN DEFAULT true` | `services`, `products`, `rewards`, `locations` | Il barbiere potrebbe riattivarlo. Lo storico è protetto dagli snapshot |

**Regola:** `deleted_at` per cose che "spariscono". `is_active` per cose che si "accendono e spengono".

**✏️ `deleted_by` accanto a `deleted_at`:**
Per GDPR e audit trail, serve sapere non solo QUANDO un dato è stato cancellato, ma anche CHI l'ha cancellato. Tutte le tabelle con `deleted_at` hanno anche `deleted_by UUID REFERENCES profiles(id)` (nullable). Il trigger che scrive nell'`audit_log` può così registrare l'autore della cancellazione.

**Chiarimento su `staff_members` — `is_active` vs `deleted_at`:**
`staff_members` ha ENTRAMBI i campi, con significati diversi:

| Stato | `is_active` | `deleted_at` | Significato | Esempio |
|-------|-------------|-------------|-------------|---------|
| Operativo | `true` | `NULL` | Lavora normalmente | Anna è attiva |
| Sospeso | `false` | `NULL` | Temporaneamente non operativo, potrebbe tornare | Anna è in maternità |
| Rimosso | `false` | `2025-03-15` | Ha lasciato il team definitivamente | Paolo si è licenziato |

- **Sospeso (`is_active = false`, `deleted_at = NULL`):** non compare nel calendario, non riceve nuovi appuntamenti, ma il suo storico resta visibile. Può essere riattivato con un click
- **Rimosso (`deleted_at = timestamp`):** sparisce da tutto. Lo storico appuntamenti/revenue resta grazie allo snapshot. Non riattivabile senza intervento admin
- **Regola:** se c'è `deleted_at`, `is_active` è sempre `false`. L'applicazione deve impostare entrambi

---

#### Decisione 9 — Gestione fuso orario

**Decisione:** Ogni tenant ha un campo `timezone` obbligatorio. Tutti gli orari sono salvati e confrontati rispettando il fuso orario del tenant.

**Come funziona:**
- `tenants.timezone` (es. `'Europe/Rome'`) — impostato al setup, modificabile dal titolare
- `working_hours` usa `TIME` (senza timezone) → rappresenta l'orario LOCALE del barbiere (es. "9:00" = 9:00 a Roma)
- `appointments` usa `TIMESTAMPTZ` → PostgreSQL salva in UTC, la conversione avviene in fase di query/display
- L'Edge Function per il calcolo degli slot converte `working_hours` (TIME locale) → `TIMESTAMPTZ` usando il timezone del tenant

**Perché serve:**
- Il cambio ora legale (CET ↔ CEST) può creare buchi o sovrapposizioni se non gestito
- Gli slot delle 9:00 locali diventano 8:00 UTC in inverno e 7:00 UTC in estate
- Senza il timezone esplicito, i reminder arriverebbero all'ora sbagliata

**Dove vive il dato:**
- `tenants.timezone` — il timezone principale del business
- Se un tenant ha più sedi in fusi orari diversi (raro per barbieri italiani, ma possibile in futuro), il timezone può essere sovrascritto a livello di `locations.timezone` (nullable, default = quello del tenant)

---

#### Decisione 10 — Gestione tier loyalty — Reset annuale

**Decisione:** Reset annuale dei punti tier con 2 mesi di grazia.

**Come funziona:**
- A fine anno i punti tier (`tier_points_this_year`) si resettano a 0
- Il tier raggiunto resta attivo per 2 mesi (periodo di grazia)
- In quei 2 mesi, se il cliente ricomincia ad accumulare punti, mantiene il tier
- Se dopo 2 mesi non ha abbastanza punti per quel tier, scende al tier corretto

**Campi necessari in `client_loyalty`:**

| Campo | Tipo | Scopo |
|-------|------|-------|
| `tier_points_this_year` | INTEGER | Punti accumulati nell'anno corrente (per calcolo tier) |
| `tier_year` | INTEGER | Anno di riferimento (es. 2025) |
| `tier_grace_expires_at` | TIMESTAMPTZ (nullable) | Scadenza del periodo di grazia. NULL se non in grazia |

**Esempio:**

| Mese | Punti anno | Tier attivo | Nota |
|------|-----------|-------------|------|
| Gen-Dic Anno 1 | 5.500 | 🥇 Oro | Raggiunto Oro |
| 1 Gen Anno 2 | 0 (reset) | 🥇 Oro | Periodo di grazia (2 mesi), `tier_grace_expires_at = 1 Mar` |
| Febbraio Anno 2 | 450 | 🥇 Oro | Ancora in grazia |
| 1 Marzo Anno 2 | 900 | 🥉 Bronzo | Grazia scaduta → scende al tier corretto |
| Giu Anno 2 | 2.800 | 🥈 Argento | Risale appena raggiunge la soglia |

**Chi gestisce il reset:** Il cron notturno controlla ogni notte:
1. Se `tier_year < anno_corrente` → resetta `tier_points_this_year = 0`, imposta `tier_grace_expires_at = +2 mesi`
2. Se `tier_grace_expires_at < oggi` → ricalcola il tier in base ai punti reali, azzera la grazia

**Perché nel documento database:** Questa logica impatta direttamente le colonne di `client_loyalty` e il comportamento del cron notturno. Deve essere documentata qui, non solo nel documento di progetto generale.

---

#### 🆕 Decisione 11 — Pagamenti e transazioni

**Decisione:** Tabella `payments` separata dagli appuntamenti. Anche in v1 (pagamento offline), il barbiere deve registrare l'avvenuto pagamento.

**Perché serve:**
- Un appuntamento `completed` non significa necessariamente `pagato`. Luca potrebbe aver dimenticato il portafoglio e pagare la volta dopo
- I KPI di revenue (`total_revenue_this_month`) senza una fonte di verità per i pagamenti sono inaffidabili — sommano i prezzi snapshot degli appuntamenti completati, che è un'approssimazione
- Quando arriva Stripe in v2, serve una tabella dove agganciare il `payment_intent_id`
- Le mance (`tip_amount`) sono revenue reale che senza tabella pagamenti non si tracciano
- L'audit log deve poter registrare i pagamenti come entità separata

**Come funziona:**
- v1: il barbiere conferma l'appuntamento e registra il pagamento (un tap: "Pagato in contanti" / "Pagato con carta")
- v2: Stripe crea il pagamento automaticamente via webhook. Il pagamento online viene registrato con `stripe_payment_id`

**Flusso v1:**
1. Luca fa il taglio → il barbiere preme "Completa" sull'appuntamento
2. Compare un piccolo form: "Come ha pagato?" → Contanti / Carta / Altro
3. Il sistema crea il record in `payments` con l'importo totale (servizi + prodotti)
4. Il `payment_status` sull'appuntamento si aggiorna a `'paid'`

**Flusso v2 (Stripe):**
1. Luca paga online al momento della prenotazione → Stripe crea un `payment_intent`
2. Il webhook Supabase riceve la conferma → crea il record in `payments` con `stripe_payment_id`
3. Se il pagamento fallisce → `status: 'failed'`, l'appuntamento resta `'unpaid'`

**Nota:** `payments` NON sostituisce `appointment_services` e `appointment_products`. Queste tabelle tracciano COSA è stato venduto (con prezzo snapshot). `payments` traccia SE e COME è stato pagato. Sono dati complementari.

---

#### 🆕 Decisione 12 — Strategia di indicizzazione e performance RLS

**Decisione:** Indici espliciti su tutte le colonne usate come filtro nelle query frequenti e nelle RLS policy. Funzione helper per performance RLS.

**Perché serve:**
- PostgreSQL NON crea automaticamente indici sulle foreign key (a differenza di altri database)
- Con RLS attive su ogni tabella, ogni query passa per il filtro `tenant_id`. Senza indice, PostgreSQL fa un full table scan
- Con 1.000 barbieri × 200 clienti ciascuno = 200.000 righe in `clients`. Senza indice su `tenant_id`, ogni lettura è lenta
- La dashboard del barbiere apre `appointments` filtrati per `staff_id` + `start_time` + `tenant_id` ad ogni caricamento. Senza indice composto, è una query costosa

**Funzione helper per RLS (performance):**
Le RLS policy usano `auth.uid()` per verificare chi è l'utente. Per sapere il `tenant_id` dell'utente, serve un lookup su `staff_members`. Se ogni RLS policy fa questa subquery, è costoso.

Soluzione: funzione helper cacheable per sessione:
```sql
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM staff_members
  WHERE profile_id = auth.uid()
  AND deleted_at IS NULL
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Esempio di RLS policy che la usa
CREATE POLICY "Staff sees own tenant" ON appointments
  FOR SELECT USING (tenant_id = get_my_tenant_id());
```

`STABLE` dice a PostgreSQL che la funzione restituisce lo stesso risultato per tutta la transazione → può cachearne il risultato invece di rieseguire la subquery per ogni riga.

**⚠️ Nota multi-tenant per staff:** Se in futuro uno staff lavorasse per più tenant (raro per barbieri, ma il nostro schema lo permette), `LIMIT 1` non basterebbe. In quel caso si userebbe il `tenant_id` come custom claim nel JWT di Supabase (configurabile via Supabase Auth hooks).

**Indici minimi da creare:** Vedi la sezione "Piano di indicizzazione" più avanti nel documento.

---

### Le 10 aree funzionali del database

Il database è organizzato in 10 macro-aree, dalle fondamenta verso le funzionalità più alte.

---

#### AREA 1 — Business e Abbonamenti (le fondamenta)

**Scopo:** I barbershop registrati, le loro sedi, i piani disponibili, lo stato dell'abbonamento.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `tenants` | Il business (barbershop) | No (è la root) | `id`, `business_name`, `slug` (subdomain), `timezone` (es. 'Europe/Rome', obbligatorio), `logo_url`, `primary_color`, `secondary_color`, `font_family`, `feature_flag_overrides` (JSONB), `settings` (JSONB — config generali: cancellation policy, no-show policy, ecc.), `status` (active/suspended), `created_at`, `updated_at` |
| `locations` | Sedi fisiche del tenant | Sì | `id`, `tenant_id`, `name`, `address`, `city`, `zip_code`, `phone`, `email`, `latitude` (DECIMAL, nullable), `longitude` (DECIMAL, nullable), `timezone` (nullable, override del tenant), `is_active`, `created_at`, `updated_at` |
| `subscription_plans` | I 3 tier | No (globale) | `id`, `name`, `slug`, `price_monthly`, `max_staff`, `max_locations`, `max_messages_month`, `feature_flags` (JSONB), `is_active`, `created_at` |
| `tenant_subscriptions` | Collegamento tenant → piano | Sì | `id`, `tenant_id`, `plan_id`, `status`, `trial_ends_at`, `current_period_start`, `current_period_end`, `stripe_subscription_id` (nullable, per v2), `stripe_customer_id` (nullable), `created_at`, `updated_at` |

**✏️ Chiarimento su `tenants.settings` (JSONB):**
Il campo `settings` raccoglie configurazioni operative del tenant che non meritano colonne dedicate perché sono poche, raramente lette in batch, e variabili per tenant:
```json
{
  "cancellation_window_hours": 2,
  "no_show_policy": {
    "max_no_shows_before_flag": 3,
    "require_deposit_after_flag": false
  },
  "auto_confirm_bookings": true,
  "booking_advance_days": 30,
  "google_review_url": "https://g.page/r/..."
}
```

**Relazioni:**
```
subscription_plans ←── tenant_subscriptions ──→ tenants
(1 piano serve N barbieri)     (ogni barbiere ha 1 abbonamento attivo)

tenants ←── locations (1 tenant ha N sedi)
```

**Vincoli:**
- `UNIQUE(tenant_subscriptions.tenant_id) WHERE status IN ('trial', 'active', 'past_due')` — un solo abbonamento operativo per tenant
- `UNIQUE(tenants.slug)` — subdomain unico

**Chi vede cosa:**
| Ruolo | `tenants` | `locations` | `subscription_plans` | `tenant_subscriptions` |
|-------|-----------|------------|---------------------|----------------------|
| Admin | ✅ Tutti | ✅ Tutte | ✅ | ✅ Tutti |
| Titolare | ✅ Solo il suo | ✅ Le sue | ✅ | ✅ Solo il suo |
| Manager | ✅ Solo il suo | ✅ Le sue | ✅ | ❌ |
| Staff | ✅ Solo il suo (dati base) | ✅ Le sue sedi | ❌ | ❌ |
| Receptionist | ✅ Solo il suo (dati base) | ✅ Le sue sedi | ❌ | ❌ |
| Cliente | ✅ Solo branding (nome, colori, logo) | ✅ Indirizzo e orari | ❌ | ❌ |

---

#### AREA 2 — Utenti e Staff

**Scopo:** Identità di tutti gli utenti e ruoli dello staff dentro ogni barbershop.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `profiles` | Profilo esteso di ogni `auth.users` | No (collegata a `auth.users`) | `id` (= `auth.users.id`), `user_type` ('staff'/'client'/'admin'), `full_name`, `phone`, `avatar_url`, `created_at`, `updated_at` |
| `staff_members` | Staff di un tenant con ruolo | Sì | `id`, `tenant_id`, `profile_id` → `profiles.id`, `role` ('owner'/'manager'/'staff'/'receptionist'), `bio`, `photo_url`, `notification_preferences` (JSONB), `is_active` (BOOLEAN, per sospensione temporanea), `deleted_at` (TIMESTAMPTZ, per rimozione definitiva), `deleted_by` (UUID, nullable), `created_by` → `profiles.id` (nullable), `created_at`, `updated_at` |
| `staff_locations` | Ponte N:N: staff ↔ sedi | Sì | `id`, `tenant_id`, `staff_id` → `staff_members.id`, `location_id` → `locations.id` |

**✏️ `notification_preferences` su `staff_members`:**
Il barbiere può scegliere come ricevere gli avvisi. Ogni tipo di notifica ha i suoi canali:
```json
{
  "new_booking": ["in_app", "push"],
  "cancellation": ["in_app", "push"],
  "churn_alert": ["in_app"],
  "low_stock": ["in_app"],
  "review_received": ["in_app"]
}
```
I canali possibili sono: `in_app` (sempre attivo, non disattivabile), `push` (opzionale). In v2 si aggiungerà `whatsapp` e `sms`.

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

**`is_active` vs `deleted_at` su `staff_members`:**
Vedi Decisione 8 per la spiegazione dettagliata dei 3 stati (operativo, sospeso, rimosso).

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
| `services` | Menu servizi | Sì | `id`, `tenant_id`, `name`, `description`, `price`, `duration_minutes`, `category`, `display_order`, `is_active`, `created_by` → `profiles.id` (nullable), `created_at`, `updated_at` |
| `staff_services` | Ponte N:N: staff ↔ servizi | Sì | `id`, `tenant_id`, `staff_id` → `staff_members.id`, `service_id` → `services.id` |
| `products` | Catalogo prodotti | Sì | `id`, `tenant_id`, `name`, `brand`, `price_sell`, `price_cost`, `sku` (opzionale), `photo_url`, `category`, `is_active`, `created_by` → `profiles.id` (nullable), `created_at`, `updated_at` |
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

**Scopo:** Orari di lavoro, eccezioni, tutti gli appuntamenti con servizi e prodotti collegati, e i pagamenti.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `working_hours` | Orari settimanali ricorrenti per staff | Sì | `id`, `tenant_id`, `staff_id`, `day_of_week` (0-6), `start_time` (TIME), `end_time` (TIME), `created_at` |
| `working_hour_overrides` | Eccezioni per data specifica | Sì | `id`, `tenant_id`, `staff_id`, `date` (DATE), `is_closed` (BOOLEAN), `start_time` (TIME, nullable), `end_time` (TIME, nullable), `reason`, `created_at` |
| `appointments` | L'appuntamento | Sì | `id`, `tenant_id`, `client_id`, `staff_id`, `location_id`, `start_time` (TIMESTAMPTZ), `end_time` (TIMESTAMPTZ), `status` ('pending'/'confirmed'/'completed'/'cancelled'/'no_show'), `booking_source`, `booked_by` (nullable), `notes`, `created_by` → `profiles.id` (nullable, chi ha materialmente creato il record), `deleted_at`, `deleted_by` (UUID, nullable), `created_at`, `updated_at` |
| `appointment_services` | Servizi nell'appuntamento con prezzo snapshot | Sì | `id`, `tenant_id`, `appointment_id`, `service_id`, `price_at_booking` (DECIMAL), `created_at` |
| `appointment_products` | Prodotti venduti con prezzo e quantità snapshot | Sì | `id`, `tenant_id`, `appointment_id`, `product_id`, `quantity`, `price_at_sale` (DECIMAL), `created_at` |
| 🆕 `payments` | Pagamento effettivo dell'appuntamento | Sì | `id`, `tenant_id`, `appointment_id` → `appointments.id` (nullable — un pagamento potrebbe essere un acconto senza appuntamento specifico), `client_id` → `clients.id`, `amount` (DECIMAL(10,2)), `tip_amount` (DECIMAL(10,2) DEFAULT 0), `payment_method` ('cash'/'card_terminal'/'stripe_online'/'bank_transfer'/'other'), `status` ('pending'/'completed'/'refunded'/'partial_refund'/'failed'), `stripe_payment_id` (VARCHAR, nullable — per v2), `notes` (TEXT, nullable), `paid_at` (TIMESTAMPTZ), `created_by` → `profiles.id` (nullable, chi ha registrato il pagamento), `created_at` |

**Relazioni:**
```
working_hours ──→ staff_members (orari ricorrenti)
working_hour_overrides ──→ staff_members (eccezioni per data)

appointments ──→ clients + staff_members + locations
    ├── appointment_services ──→ services (con prezzo fotografato)
    ├── appointment_products ──→ products (con prezzo e quantità fotografati)
    └── payments ──→ clients (pagamento effettivo)
```

**Perché `working_hours` e `working_hour_overrides` sono separate:**
- `working_hours` = orari RICORRENTI (ogni lunedì 9-13, 15-19). Pattern settimanale
- `working_hour_overrides` = ECCEZIONI per una data specifica (25 dicembre: chiuso)
- Query slot: "prendi gli orari del giorno della settimana → applica l'override se esiste per quella data"

**Perché slot multipli per giorno in `working_hours`:**
Marco lavora 9-13 e 15-19 il lunedì → 2 righe per lo stesso giorno. Questo modella la pausa pranzo senza campi extra.

**Prezzo snapshot:** Quando Luca prenota Taglio a €15, quel prezzo va in `appointment_services.price_at_booking`. Se domani Marco alza a €18, lo storico di Luca mostra ancora €15.

**Prevenzione sovrapposizioni:** Exclusion constraint su `appointments` — vedi Decisione 6.

**`booked_by` vs `created_by`:**
- `booked_by` = chi è il "proprietario logico" della prenotazione (il cliente o lo staff per conto del quale si prenota). Usato per contatti e responsabilità
- `created_by` = chi ha materialmente creato il record nel sistema. Usato per audit trail (es. "Anna la receptionist ha creato 15 appuntamenti oggi")

**🆕 Perché `payments` è separata da `appointments`:**
- Un appuntamento può essere completato ma non ancora pagato (es. "paga la prossima volta")
- Un pagamento può coprire più appuntamenti in futuro (prepagato/pacchetti in v2)
- Le mance (`tip_amount`) sono informazioni del pagamento, non dell'appuntamento
- Quando arriva Stripe, il `stripe_payment_id` è un dato del pagamento, non dell'appuntamento
- Il revenue REALE si calcola da `payments` (quanto è stato effettivamente incassato), non dagli snapshot dei servizi (quanto AVREBBE DOVUTO essere incassato)

**Chi vede cosa:**
| Ruolo | `working_hours` | `appointments` | `appointment_services/products` | 🆕 `payments` |
|-------|----------------|----------------|-------------------------------|--------------|
| Titolare | ✅ CRUD tutti | ✅ CRUD tutti | ✅ CRUD tutti | ✅ CRUD tutti |
| Manager | ✅ CRUD tutti | ✅ CRUD tutti | ✅ CRUD tutti | ✅ CRUD tutti |
| Staff | ✅ CRUD i suoi | ✅ Solo i suoi | ✅ Solo i suoi | ✅ Crea (registra pagamento) + Lettura i suoi |
| Receptionist | ✅ Lettura tutti | ✅ Crea per tutti, legge tutti | ✅ Lettura | ✅ Crea (registra pagamento) + Lettura |
| Cliente | ❌ | ✅ Solo i suoi (lettura + crea) | ✅ Lettura i suoi | ❌ |

---

#### AREA 5 — Clienti e CRM

**Scopo:** Il cuore del CRM. Ogni cliente con dati, preferenze, note private separate, e consensi GDPR granulari.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `clients` | Il cliente nel CRM | Sì | `id`, `tenant_id`, `profile_id` (nullable) → `profiles.id`, `full_name`, `phone`, `email`, `date_of_birth`, `preferred_contact_channel` ('push'/'whatsapp'/'sms'/'email'), `tags` (JSONB, es. `["VIP", "nuovo"]`), `referred_by` → `clients.id` (nullable — chi l'ha portato), `created_by` → `profiles.id` (nullable, chi ha aggiunto il cliente), `deleted_at`, `deleted_by` (UUID, nullable), `created_at`, `updated_at` |
| `client_notes` | Note private del barbiere | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `staff_id` → `staff_members.id` (chi ha scritto), `note_text`, `created_at` |
| 🆕 `client_consents` | Consensi GDPR granulari con timestamp | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `consent_type` ('marketing_sms'/'marketing_whatsapp'/'marketing_email'/'marketing_push'/'data_processing'), `granted` (BOOLEAN), `granted_at` (TIMESTAMPTZ, nullable), `revoked_at` (TIMESTAMPTZ, nullable), `ip_address` (INET, nullable), `created_at` |

**Relazioni:**
```
clients ──→ tenants
clients ──→ profiles (nullable: Roberto non ha l'app)
clients ──→ clients (self-reference: referred_by, nullable)
clients ←── client_notes (N note per cliente, con autore e data)
clients ←── client_consents (N consensi per cliente, con timestamp)
```

**Perché `client_notes` è separata:**
- Le note ("vuole il 3 ai lati", "allergico al lattice") sono dati sensibili GDPR
- Il cliente NON deve MAI vederle, neanche con l'app
- Tabella separata → RLS semplice: "solo staff del tenant può leggere/scrivere"
- Un cliente ha MOLTE note nel tempo (una per visita) → non è un singolo campo di testo

**🆕 Perché `client_consents` è separata da `clients`:**
- Il GDPR richiede di dimostrare **quando** e **come** il consenso è stato dato o revocato. Un semplice boolean su `clients` non basta
- Ogni tipo di comunicazione (SMS marketing, WhatsApp, email, push) ha un consenso separato
- Lo storico dei consensi è fondamentale: "Roberto ha dato il consenso SMS il 15 marzo 2025 alle 10:32, IP 93.42.xxx.xxx"
- Se Roberto revoca il consenso WhatsApp ma mantiene quello SMS, serve una riga per ciascuno
- L'audit trail dei consensi è obbligatorio per legge — un campo boolean che si sovrascrive non lo fornisce

**🆕 Perché `referred_by` su `clients`:**
- Il VIP Score nel documento menziona "referral" come fattore, ma senza una struttura per tracciarlo non si può calcolare
- `referred_by` è un self-reference nullable: se Luca ha portato Roberto, `roberto.referred_by = luca.id`
- Questo permette: "Quanti clienti ha portato Luca?" → query semplice su `clients WHERE referred_by = luca.id`
- In v2, i referral possono generare punti bonus automatici per chi ha portato il nuovo cliente

**Vincoli:**
- `UNIQUE(tenant_id, phone)` — stesso telefono unico per barbiere
- `profile_id` nullable — il collegamento all'account avviene quando/se il cliente fa login

**Chi vede cosa:**
| Ruolo | `clients` (dati) | `client_notes` | 🆕 `client_consents` |
|-------|------------------|----------------|---------------------|
| Titolare | ✅ CRUD tutti | ✅ CRUD | ✅ Lettura + gestione |
| Manager | ✅ CRUD tutti | ✅ CRUD | ✅ Lettura |
| Staff | ✅ I suoi clienti (assegnati/serviti) | ✅ CRUD (le sue note) | ❌ |
| Receptionist | ✅ Lettura tutti + crea nuovi | ❌ | ❌ |
| Cliente (PWA) | ✅ Solo il suo profilo (lettura + modifica dati base) | ❌ **MAI** | ✅ Gestione i suoi (opt-in/opt-out) |

---

#### AREA 6 — Loyalty e Gamification

**Scopo:** Sistema a 4 layer. v1 = solo punti (Classico). v2 = streak + badge + tier + sfide.

**Tabelle v1:**

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `loyalty_configs` | Config loyalty del tenant | Sì | `id`, `tenant_id`, `is_active` (BOOLEAN), `template` ('classic'/'streak_master'/'vip_club'), `points_per_visit` (per Classico), `points_per_euro` (per Streak Master), `streak_threshold_days` (default 45), `version` (INTEGER, default 1), `started_at` (TIMESTAMPTZ DEFAULT now()), `ended_at` (TIMESTAMPTZ, nullable — NULL = config attiva), `created_at`, `updated_at` |
| `rewards` | Catalogo ricompense (max 6) | Sì | `id`, `tenant_id`, `name`, `description`, `points_cost`, `reward_type` ('product'/'service'/'discount'/'custom'), `display_order`, `is_active`, `created_by` → `profiles.id` (nullable), `created_at`, `updated_at` |
| `client_loyalty` | Stato loyalty del cliente | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `total_points`, `available_points`, `current_streak`, `longest_streak`, `current_tier` (default 'bronze'), `tier_points_this_year`, `tier_year` (INTEGER), `tier_grace_expires_at` (TIMESTAMPTZ, nullable), `last_visit_date`, `created_at`, `updated_at` |
| `loyalty_transactions` | Log ogni operazione punti | Sì | `id`, `tenant_id`, `client_id`, `type` ('earn'/'redeem'/'bonus'/'import'/'expire'/'adjustment'), `points` (positivo o negativo), `description`, `appointment_id` (nullable), `staff_id` (nullable, chi ha assegnato), `loyalty_config_version` (INTEGER, nullable — la version della config al momento della transazione), `created_at` |
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
loyalty_configs ──→ tenants (1:1 attiva — ogni barbiere ha 1 config loyalty con ended_at IS NULL)
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

**✏️ Gestione cambio template loyalty (versioning con storico):**
`loyalty_configs` usa un modello immutabile: ogni cambio di template crea una nuova riga, la vecchia viene chiusa con `ended_at`. La riga attiva è quella con `ended_at IS NULL`.

Vincolo:
```sql
CREATE UNIQUE INDEX idx_loyalty_configs_active
ON loyalty_configs(tenant_id)
WHERE ended_at IS NULL;
```

Quando il barbiere cambia template (es. da Classico a Streak Master):
1. Il sistema imposta `ended_at = now()` sulla config corrente
2. Crea una nuova riga con `version = vecchia_version + 1`, `started_at = now()`, `ended_at = NULL`
3. I punti esistenti restano invariati (non si azzerano)
4. Le `loyalty_transactions` hanno il campo `loyalty_config_version` che traccia con quale formula sono stati calcolati i punti
5. Lo storico rimane coerente: le transazioni vecchie hanno la versione vecchia, le nuove hanno la versione nuova

**Perché questo approccio:** Se il barbiere cambia da Classico a Streak Master e poi torna a Classico, lo storico delle config è completo. Si può ricostruire "quale formula era attiva il 15 marzo?".

**Reset annuale dei tier:** Vedi Decisione 10.

**Chi vede cosa:**
| Ruolo | `loyalty_configs` | `rewards` | `client_loyalty` | `transactions` | `redemptions` |
|-------|------------------|-----------|-----------------|----------------|---------------|
| Titolare | ✅ CRUD | ✅ CRUD | ✅ Lettura tutti | ✅ Lettura | ✅ Lettura + conferma |
| Manager | ✅ Lettura | ✅ Lettura | ✅ Lettura tutti | ✅ Lettura | ✅ Conferma |
| Staff | ❌ | ✅ Lettura | ✅ Lettura (i suoi clienti) | ✅ Crea (assegna punti) | ✅ Conferma |
| Receptionist | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cliente (PWA) | ❌ | ✅ Lettura (attivi) | ✅ Solo il suo | ✅ Solo i suoi | ✅ Solo i suoi |

---

#### AREA 7 — Messaggistica e Notifiche

**Scopo:** Template messaggi, registro di tutto ciò che viene inviato, e notifiche in-app per il barbiere.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `message_templates` | Modelli con segnaposto | Sì | `id`, `tenant_id`, `name`, `type` ('reminder'/'confirmation'/'win_back'/'review_request'/'loyalty_update'/'custom'), `channel` ('sms'/'whatsapp'/'email'/'push'), `subject` (per email), `body` (con placeholder: `{client_name}`, `{appointment_date}`, `{staff_name}`...), `is_active`, `created_at`, `updated_at` |
| `messages_log` | Log messaggi inviati | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `template_id` → `message_templates.id` (nullable), `channel` ('sms'/'whatsapp'/'email'/'push'), `type`, `recipient` (telefono o email), `body_sent` (testo effettivo inviato), `status` ('queued'/'sent'/'delivered'/'failed'/'bounced'), `cost` (DECIMAL, nullable), `external_id` (ID del provider es. MessageBird), `sent_at`, `created_at` |
| `staff_notifications` | Notifiche in-app per lo staff | Sì | `id`, `tenant_id`, `staff_id` → `staff_members.id` (nullable, NULL = visibile a tutto lo staff), `type` ('churn_alert'/'low_stock'/'new_booking'/'cancellation'/'review_received'/'system'), `title`, `body`, `data` (JSONB, nullable — contesto: client_id, appointment_id, product_id...), `is_read` (BOOLEAN DEFAULT false), `read_at` (TIMESTAMPTZ, nullable), `created_at` |

**Relazioni:**
```
message_templates ──→ tenants
messages_log ──→ tenants + clients + message_templates (opzionale)
staff_notifications ──→ tenants + staff_members (opzionale)
```

**Perché `message_templates` e `messages_log` sono separate:**
- Template = definizione ("Ciao {client_name}, domani alle {appointment_time}...")
- Log = evento ("Inviato a Roberto via SMS alle 18:00, delivered, €0.045")
- Un template viene usato migliaia di volte → 1:N

**Il `body_sent` nel log:** Salviamo il testo effettivo inviato (con i placeholder già risolti) perché se il template cambia in futuro, lo storico dei messaggi inviati resta intatto.

**Perché `staff_notifications` è una tabella dedicata:**
Le notifiche in-app del barbiere (churn alert, scorta bassa, nuova prenotazione) NON sono messaggi al cliente. Sono avvisi interni per la dashboard. Servono:
- Stato letta/non letta per il badge di notifica
- Filtro per tipo (vedi solo i churn alert, vedi solo le nuove prenotazioni)
- `staff_id` nullable: se NULL, la notifica è visibile a tutto lo staff del tenant (es. "Scorta bassa: Matt Clay")
- `data` JSONB per il contesto: cliccando la notifica si apre il cliente/appuntamento/prodotto giusto

**Chi vede cosa:**
| Ruolo | `message_templates` | `messages_log` | `staff_notifications` |
|-------|--------------------|--------------  |----------------------|
| Titolare | ✅ CRUD | ✅ Lettura tutti | ✅ Tutte le sue + quelle globali (staff_id NULL) |
| Manager | ✅ CRUD | ✅ Lettura tutti | ✅ Tutte le sue + quelle globali |
| Staff | ❌ | ✅ Lettura (i suoi clienti) | ✅ Solo le sue + quelle globali
| Receptionist | ❌ | ❌ | ✅ Solo le sue + quelle globali |
| Cliente | ❌ | ❌ | ❌ |

---

#### AREA 8 — Analytics e Churn Detection

**Scopo:** Metriche pre-calcolate per ogni cliente. Aggiornate automaticamente.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `client_analytics` | Metriche calcolate | Sì | `id`, `tenant_id`, `client_id` → `clients.id` (UNIQUE 1:1), `total_visits`, `total_spent_services` (DECIMAL), `total_spent_products` (DECIMAL), `average_spend_per_visit` (DECIMAL), `last_visit_date` (DATE), `days_since_last_visit` (INTEGER), `average_days_between_visits` (DECIMAL), `churn_status` ('green'/'yellow'/'red'), `vip_score` (INTEGER, 0-100), `no_show_count` (INTEGER DEFAULT 0), `cancellation_count` (INTEGER DEFAULT 0), `referral_count` (INTEGER DEFAULT 0), `last_reconciled_at` (TIMESTAMPTZ), `created_at`, `updated_at` |

**Relazione:**
```
client_analytics ──→ clients (1:1)
```

**✏️ Campi aggiunti rispetto alla versione originale:**
- `no_show_count` — conta i no-show del cliente. Serve per il no-show prediction di v3 e per il reliability score. Senza questo campo, per sapere quanti no-show ha fatto Roberto devi fare un `COUNT(*)` su appointments ogni volta
- `cancellation_count` — stessa logica: cancellazioni last-minute frequenti indicano un cliente inaffidabile
- `referral_count` — quanti clienti ha portato (conta i `clients WHERE referred_by = questo_client_id`). Serve per il VIP Score che include "referral" come fattore
- `average_spend_per_visit` — calcolato come `(total_spent_services + total_spent_products) / total_visits`. Evita la divisione al volo ad ogni apertura del profilo

**Quando si aggiorna:**
- **Trigger** (dopo ogni cambio status su appointment): `total_visits`, `total_spent_*`, `last_visit_date`, `days_since_last_visit`, `no_show_count`, `cancellation_count`, `average_spend_per_visit`
- **Cron notturno** (ogni notte — riconciliazione completa): TUTTE le metriche vengono ricalcolate da zero contando gli appuntamenti `completed` reali. `last_reconciled_at` viene aggiornato

Vedi Decisione 7 per la strategia di riconciliazione dettagliata.

**✏️ Formula VIP Score (per il cron notturno):**
Il VIP Score è un punteggio composito 0-100 che sintetizza il valore di un cliente. Formula pesata:

| Fattore | Peso | Come si calcola |
|---------|------|-----------------|
| Frequenza | 30% | `average_days_between_visits` normalizzato (più frequente = punteggio più alto) |
| Spesa totale | 25% | `total_spent_services + total_spent_products` normalizzato vs media del tenant |
| Puntualità | 20% | `1 - (no_show_count + cancellation_count) / total_visits` × 100 |
| Fedeltà (tenure) | 15% | Giorni dalla prima visita, normalizzato |
| Referral | 10% | `referral_count` normalizzato |

La normalizzazione è per-tenant: il "migliore" del tenant = 100, la media = 50. Questo evita che un barbiere con clienti ricchi abbia tutti VIP score alti e uno con clienti studenti abbia tutti bassi.

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
| `review_requests` | Richiesta inviata | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `appointment_id` → `appointments.id` (nullable), `google_review_url`, `status` ('sent'/'clicked'/'completed'), `sent_at`, `clicked_at` (nullable), `created_at` |

**Relazione:**
```
review_requests ──→ clients + appointments (opzionale)
```

**Perché serve:** Per non inviare la richiesta 2 volte per la stessa visita. Per analytics: "quante recensioni richieste? quante completate?".

**Rate limiting:**
- Vincolo `UNIQUE(tenant_id, appointment_id) WHERE appointment_id IS NOT NULL` — massimo 1 richiesta per visita
- Regola applicativa (Edge Function): massimo 1 richiesta ogni 14 giorni per lo stesso cliente, anche se ha fatto più visite. La Edge Function controlla l'ultimo `sent_at` per quel `client_id` prima di inviare

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

**Scopo:** Gestione admin. L'admin monitora la salute della piattaforma, NON i dati operativi dei singoli barbieri. Include audit log per operazioni sensibili.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `admin_users` | Admin piattaforma | No (globale) | `id`, `profile_id` → `profiles.id`, `role` ('superadmin'/'support'), `created_at` |
| `tenant_activity_log` | Metriche aggregate per tenant | Sì (ma visibile solo ad admin) | `id`, `tenant_id`, `last_login_at`, `appointments_this_month`, `active_clients_count`, `total_revenue_this_month`, `recorded_at` (TIMESTAMPTZ), `created_at` |
| `audit_log` | Log operazioni sensibili | Sì | `id`, `tenant_id`, `actor_id` → `profiles.id` (chi ha fatto l'azione), `action` ('create'/'update'/'delete'/'status_change'), `entity_type` (es. 'appointment', 'client', 'service', 'payment'), `entity_id` (UUID dell'entità modificata), `changes` (JSONB — old/new values), `ip_address` (INET, nullable), `created_at` |

**Relazioni:**
```
admin_users ──→ profiles
tenant_activity_log ──→ tenants
audit_log ──→ tenants + profiles
```

**Cosa l'admin vede vs NON vede:**
| ✅ Vede | ❌ NON vede |
|---------|------------|
| Quanti barbieri sono attivi | Gli appuntamenti dei singoli clienti |
| Quale piano ha ogni barbiere | Le note private dei barbieri |
| Ultimo accesso | I dettagli dei servizi/prodotti |
| Numero clienti e appuntamenti | I nomi o i dati dei clienti |
| Revenue aggregato | Dettagli delle transazioni |

**Perché `audit_log`:**
- GDPR richiede di sapere chi ha modificato/cancellato dati personali
- Dispute commerciali: "Chi ha cambiato il prezzo del servizio? Quando?"
- Debugging: "Perché l'appuntamento di Luca risulta cancellato?"
- Il titolare può vedere l'audit log del suo tenant. L'admin può vedere tutti
- NON si logga ogni lettura (troppo costoso), solo le scritture/modifiche/cancellazioni

**✏️ Struttura del campo `changes` in `audit_log`:**
```json
{
  "old": { "status": "confirmed", "price": 15.00 },
  "new": { "status": "cancelled", "price": 15.00 }
}
```
Solo i campi modificati vengono salvati, non l'intero record. Questo mantiene il JSONB leggero.

**Chi vede cosa:**
| Ruolo | `admin_users` | `tenant_activity_log` | `audit_log` |
|-------|-------------|----------------------|-------------|
| Admin | ✅ | ✅ Tutti | ✅ Tutti |
| Titolare | ❌ | ❌ | ✅ Solo il suo tenant |
| Manager | ❌ | ❌ | ✅ Solo il suo tenant (lettura) |
| Staff | ❌ | ❌ | ❌ |
| Receptionist | ❌ | ❌ | ❌ |
| Cliente | ❌ | ❌ | ❌ |

---

### Mappa relazioni tra le 10 aree (✏️ aggiornata con payments e consents)

```
┌──────────────────────────────────────────────────────────────┐
│                AREA 10: ADMIN PIATTAFORMA                    │
│   Monitora la salute di tutti i barbieri + audit log         │
└──────────────────────┬───────────────────────────────────────┘
                       │ monitora
┌──────────────────────▼───────────────────────────────────────┐
│              AREA 1: BUSINESS E ABBONAMENTI                  │
│     Chi sono i barbieri, che piano hanno, dove sono (sedi)   │
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
                 │  + PAGAMENTI (🆕)        │
                 │  (no sovrapposizioni)    │
                 └────────────┬─────────────┘
                              │
                 ┌────────────▼─────────────┐
                 │  AREA 5: CLIENTI / CRM   │
                 │  Chi sono i clienti      │
                 │  + CONSENSI GDPR (🆕)    │
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
     │  + NOTIFICHE IN-APP │    │                    │
     └─────────────────────┘    └────────────────────┘
```

---

### Riepilogo tabelle per fase (✏️ aggiornato)

**v1 (MVP) — 35 tabelle:**

| Area | Tabelle |
|------|---------|
| 1. Business | `tenants`, `locations`, `subscription_plans`, `tenant_subscriptions` |
| 2. Utenti | `profiles`, `staff_members`, `staff_locations` |
| 3. Catalogo | `services`, `staff_services`, `products`, `product_inventory` |
| 4. Appuntamenti | `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products`, 🆕 `payments` |
| 5. CRM | `clients`, `client_notes`, 🆕 `client_consents` |
| 6. Loyalty | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions` |
| 7. Messaggi e Notifiche | `message_templates`, `messages_log`, `staff_notifications` |
| 8. Analytics | `client_analytics` |
| 9. Recensioni | `review_requests` |
| 10. Admin | `admin_users`, `tenant_activity_log`, `audit_log` |

**v2 (Growth) — +5 tabelle:**

| Area | Tabelle aggiunte |
|------|-----------------|
| 3. Catalogo | `inventory_movements` |
| 6. Gamification | `tier_configs`, `badges`, `client_badges`, `challenges` |

**Totale: 40 tabelle** (35 v1 + 5 v2)

**Tabelle senza `tenant_id` (globali):**
- `subscription_plans` — i piani sono uguali per tutti
- `admin_users` — gli admin non appartengono a nessun barbiere
- `profiles` — collegata a `auth.users`, non a un tenant specifico
- `auth.users` — gestita da Supabase, non la creiamo noi

**Tutte le altre 36 tabelle hanno `tenant_id`.**

---

### Regole architetturali — Le 12 regole d'oro (✏️ aggiornate)

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
| 9 | **Ogni tenant ha un timezone esplicito** | Gli orari sono corretti anche con il cambio ora legale |
| 10 | **Le operazioni sensibili sono loggate** | Audit log per GDPR, dispute e debugging |
| 🆕 11 | **I pagamenti sono separati dagli appuntamenti** | `completed` ≠ `pagato`. Il revenue reale viene dalla tabella `payments` |
| 🆕 12 | **Indici espliciti su ogni colonna filtrata** | PostgreSQL non crea indici sulle FK. Senza indici, RLS + tenant_id = full table scan |

---

### 🆕 Piano di indicizzazione

**Principio:** Ogni colonna usata in una `WHERE` clause frequente, in una RLS policy, o in un `JOIN` deve avere un indice. PostgreSQL NON crea automaticamente indici sulle foreign key.

**Indici critici per v1:**

| Tabella | Indice | Tipo | Motivazione |
|---------|--------|------|-------------|
| `appointments` | `(tenant_id, staff_id, start_time)` | B-tree composto | La query più frequente: "mostra gli appuntamenti di Marco per oggi/settimana". Copre sia la RLS (tenant_id) sia il filtro operativo (staff_id + data) |
| `appointments` | `(tenant_id, client_id)` | B-tree composto | "Storico appuntamenti di Luca" — usato nel profilo CRM del cliente |
| `appointments` | `(tenant_id, status) WHERE deleted_at IS NULL` | Partial B-tree | Filtro per appuntamenti attivi per status. Gli appuntamenti soft-deleted sono esclusi |
| `clients` | `(tenant_id, phone)` | B-tree composto (è già UNIQUE) | Lookup per telefono al login OTP e merge profilo |
| `clients` | `(tenant_id, profile_id)` | B-tree composto | Collegamento profilo → record CRM quando il cliente fa login |
| `client_analytics` | `(tenant_id, churn_status)` | B-tree composto | "Mostra i clienti a rischio churn" — filtro per semaforo |
| `client_analytics` | `(tenant_id, client_id)` | B-tree composto (UNIQUE) | Lookup 1:1 client → analytics |
| `client_loyalty` | `(tenant_id, client_id)` | B-tree composto (UNIQUE) | Lookup 1:1 client → loyalty |
| `loyalty_transactions` | `(tenant_id, client_id, created_at)` | B-tree composto | "Storico punti di Luca, ordinato per data" |
| `messages_log` | `(tenant_id, client_id, sent_at)` | B-tree composto | "Ultimo messaggio inviato a Roberto" per rate limiting win-back |
| `staff_members` | `(tenant_id, profile_id) WHERE deleted_at IS NULL` | Partial B-tree | Usato dalla funzione `get_my_tenant_id()` — chiamata in OGNI RLS policy |
| `staff_notifications` | `(tenant_id, staff_id, is_read)` | B-tree composto | Badge notifiche non lette nella dashboard |
| `payments` | `(tenant_id, appointment_id)` | B-tree composto | Collegamento appuntamento → pagamento |
| `payments` | `(tenant_id, paid_at)` | B-tree composto | KPI revenue per periodo |
| `audit_log` | `(tenant_id, entity_type, entity_id)` | B-tree composto | "Chi ha modificato questo appuntamento?" |
| `audit_log` | `(tenant_id, created_at)` | B-tree composto | Audit log cronologico per tenant |
| `review_requests` | `(tenant_id, client_id, sent_at)` | B-tree composto | Rate limiting: "ultimo invio a questo cliente" |
| `working_hours` | `(tenant_id, staff_id, day_of_week)` | B-tree composto | Calcolo slot: "orari di Marco per lunedì" |
| `working_hour_overrides` | `(tenant_id, staff_id, date)` | B-tree composto | Calcolo slot: "Marco ha un override per il 25/12?" |
| `product_inventory` | `(tenant_id, product_id, location_id)` | B-tree composto (UNIQUE) | Lookup giacenza per prodotto per sede |
| `client_consents` | `(tenant_id, client_id, consent_type)` | B-tree composto | "Roberto ha il consenso SMS marketing?" |

**Quando creare gli indici:** Insieme alle tabelle, nella stessa migrazione SQL. Non dopo. Un indice aggiunto a posteriori su una tabella con dati richiede un lock esclusivo (su Supabase con `CREATE INDEX CONCURRENTLY` si evita il downtime, ma è meglio farlo subito).

**Nota sulle performance:** Con i volumi previsti per v1 (~1.000 tenant × 200 clienti = 200K righe in `clients`), questi indici sono più che sufficienti. Il partitioning (divisione tabelle per periodo) NON serve in v1. Diventa utile solo quando `appointments` o `messages_log` superano i 10M di righe (~5.000+ tenant attivi).

---

### 🆕 Retention policy — Quanto tempo conserviamo i dati

**Principio:** Non tutto deve restare per sempre. Alcuni dati operativi perdono valore nel tempo e occupano spazio inutilmente. Ma i dati GDPR-protetti e quelli che servono allo storico del business devono restare.

| Tabella | Retention | Azione dopo scadenza | Motivazione |
|---------|-----------|---------------------|-------------|
| `appointments` | **Indefinita** | Mai cancellare | Lo storico appuntamenti è il cuore del CRM e delle metriche |
| `clients` | **Indefinita** (soft delete) | `deleted_at` su richiesta GDPR | Il cliente può chiedere la cancellazione (diritto all'oblio) |
| `loyalty_transactions` | **Indefinita** | Mai cancellare | Audit trail completo, serve per riconciliazione |
| `messages_log` | **24 mesi** | Archivia o elimina righe > 24 mesi | Il body del messaggio non serve dopo 2 anni. I conteggi restano in `tenant_activity_log` |
| `staff_notifications` | **6 mesi** | Elimina notifiche > 6 mesi e `is_read = true` | Le notifiche lette vecchie non servono più |
| `audit_log` | **36 mesi** | Archivia in cold storage (Supabase Storage come JSON) | GDPR richiede conservazione ragionevole, 3 anni è lo standard |
| `tenant_activity_log` | **Indefinita** | Mai cancellare | Metriche aggregate leggere, utili per trend storici |
| `review_requests` | **12 mesi** | Archivia o elimina | Serve solo per rate limiting e analytics recenti |
| `client_consents` | **Indefinita** | Mai cancellare | GDPR: la prova del consenso deve restare per sempre |

**Chi gestisce la pulizia:** Un cron job settimanale (non notturno — la pulizia è meno urgente della riconciliazione):
1. Controlla `messages_log WHERE sent_at < NOW() - INTERVAL '24 months'` → elimina
2. Controlla `staff_notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '6 months'` → elimina
3. Controlla `audit_log WHERE created_at < NOW() - INTERVAL '36 months'` → esporta come JSON in Supabase Storage → elimina dal database

**Nota v1:** In v1 NON implementiamo la pulizia automatica. I volumi sono troppo bassi per giustificarlo. La retention policy viene documentata ora per non dimenticarla quando i volumi cresceranno.

---

### 🆕 Rischi architetturali e mitigazioni

| # | Rischio | Impatto | Probabilità | Mitigazione |
|---|---------|---------|-------------|-------------|
| 1 | **RLS policy mal configurata** → un tenant vede i dati di un altro | 🔴 Critico | Media (errore umano in fase di sviluppo) | Test automatici per ogni policy RLS: per ogni tabella, verificare che un utente del tenant A non possa leggere/scrivere dati del tenant B. Suite di test obbligatoria prima del deploy |
| 2 | **Cron notturno fallisce** → metriche analytics sbagliate | 🟡 Medio | Media | Il cron scrive un log di esecuzione con `started_at`, `completed_at`, `tenants_processed`, `errors`. Se il cron non gira per 2 notti consecutive, notifica all'admin. Le metriche trigger restano comunque ragionevolmente corrette |
| 3 | **Race condition su loyalty points** → punti duplicati | 🟡 Medio | Bassa | La riconciliazione notturna corregge. In v2, aggiungere un vincolo `UNIQUE(appointment_id, type)` su `loyalty_transactions` per impedire doppi earn dallo stesso appuntamento |
| 4 | **Exclusion constraint performance** su `appointments` con molte righe | 🟡 Medio | Bassa (sotto 1M righe) | L'exclusion constraint usa un indice GiST che è efficiente. Diventa lento solo sopra i 5M di righe. Monitorare con `pg_stat_user_indexes` |
| 5 | **JSONB `settings` su `tenants` diventa troppo grande** | 🟢 Basso | Bassa | Le impostazioni sono poche (<20 chiavi). Se crescono oltre 50, migrare a una tabella `tenant_settings` chiave-valore. Per ora JSONB è perfetto |
| 6 | **`messages_log` cresce troppo** → tabella più grande del database | 🟡 Medio | Alta (dopo 2+ anni) | La retention policy a 24 mesi mitiga. Se serve prima, partitioning per mese su `sent_at`. Supabase supporta il partitioning nativo di PostgreSQL |
| 7 | **Staff member eliminato** → appuntamenti orfani | 🟢 Basso | Bassa | Il soft delete (`deleted_at`) previene questo. Gli appuntamenti futuri dello staff rimosso devono essere riassegnati — l'applicazione deve gestire questo nel flusso di rimozione staff |
| 8 | **Cambio template loyalty** → confusione nei punti | 🟢 Basso | Bassa | Il versioning con `loyalty_config_version` su ogni transazione rende tracciabile quale formula ha generato ogni punto. La riconciliazione notturna verifica la coerenza |

---

### 🆕 Checklist pre-implementazione SQL

Prima di scrivere le migrazioni SQL, verificare:

- [ ] **Estensioni PostgreSQL abilitate su Supabase:**
  - `btree_gist` — per l'exclusion constraint sugli appuntamenti
  - `pgcrypto` — per `gen_random_uuid()` (già abilitata di default su Supabase)

- [ ] **Funzione `get_my_tenant_id()`** creata PRIMA di qualsiasi RLS policy

- [ ] **Ordine di creazione tabelle** (rispettare le dipendenze FK):
  1. `subscription_plans` (nessuna dipendenza)
  2. `tenants` (nessuna dipendenza)
  3. `locations` (dipende da `tenants`)
  4. `tenant_subscriptions` (dipende da `tenants` + `subscription_plans`)
  5. `profiles` (dipende da `auth.users`)
  6. `admin_users` (dipende da `profiles`)
  7. `staff_members` (dipende da `tenants` + `profiles`)
  8. `staff_locations` (dipende da `staff_members` + `locations`)
  9. `services` (dipende da `tenants`)
  10. `staff_services` (dipende da `staff_members` + `services`)
  11. `products` (dipende da `tenants`)
  12. `product_inventory` (dipende da `products` + `locations`)
  13. `clients` (dipende da `tenants` + `profiles`)
  14. `client_notes` (dipende da `clients` + `staff_members`)
  15. `client_consents` (dipende da `clients`)
  16. `working_hours` (dipende da `staff_members`)
  17. `working_hour_overrides` (dipende da `staff_members`)
  18. `appointments` (dipende da `clients` + `staff_members` + `locations`)
  19. `appointment_services` (dipende da `appointments` + `services`)
  20. `appointment_products` (dipende da `appointments` + `products`)
  21. `payments` (dipende da `appointments` + `clients`)
  22. `loyalty_configs` (dipende da `tenants`)
  23. `rewards` (dipende da `tenants`)
  24. `client_loyalty` (dipende da `clients`)
  25. `loyalty_transactions` (dipende da `clients` + `appointments`)
  26. `reward_redemptions` (dipende da `clients` + `rewards` + `staff_members`)
  27. `client_analytics` (dipende da `clients`)
  28. `message_templates` (dipende da `tenants`)
  29. `messages_log` (dipende da `clients` + `message_templates`)
  30. `staff_notifications` (dipende da `staff_members`)
  31. `review_requests` (dipende da `clients` + `appointments`)
  32. `tenant_activity_log` (dipende da `tenants`)
  33. `audit_log` (dipende da `tenants` + `profiles`)

- [ ] **RLS abilitate su OGNI tabella** (anche quelle globali come `subscription_plans` — con policy `SELECT` per tutti)

- [ ] **Indici creati nella stessa migrazione** delle tabelle (vedi Piano di indicizzazione)

- [ ] **Trigger creati dopo le tabelle:**
  - Trigger su `appointments` → aggiorna `client_analytics`
  - Trigger su `appointment_products` → aggiorna `product_inventory` (decrementa giacenza)
  - Trigger su `product_inventory` → crea `staff_notification` se `quantity < low_stock_threshold`
  - Trigger su `profiles` → creazione automatica del profilo dopo `auth.users` insert (Supabase Auth hook)

- [ ] **Cron jobs da configurare (Supabase pg_cron):**
  - Notturno: riconciliazione `client_analytics` + aggiornamento churn/VIP Score
  - Notturno: check reset annuale tier loyalty (`tier_year`, `tier_grace_expires_at`)
  - Settimanale (v2+): pulizia dati secondo retention policy

---

### 🆕 Riepilogo cambiamenti rispetto alla versione precedente del documento

| Cosa | Prima | Dopo | Perché |
|------|-------|------|--------|
| Decisioni architetturali | 10 | **12** | Aggiunte Decisione 11 (Pagamenti) e Decisione 12 (Indicizzazione + Performance RLS) |
| Tabelle v1 | 32 | **35** | Aggiunte `payments`, `client_consents`, e conteggio corretto |
| Tabelle totali (v1+v2) | 37 | **40** | Conseguenza delle 3 nuove tabelle v1 |
| Regole d'oro | 10 | **12** | Aggiunte regole su pagamenti separati e indici espliciti |
| `client_analytics` | 8 metriche | **12 metriche** | Aggiunti `no_show_count`, `cancellation_count`, `referral_count`, `average_spend_per_visit` |
| `clients` | No referral tracking | **`referred_by`** self-reference | Il VIP Score menzionava "referral" ma non c'era struttura per tracciarlo |
| `loyalty_configs` | Campo `version` con update in-place | **Modello immutabile** con `started_at`/`ended_at` | Storico completo delle configurazioni, ricostruibile nel tempo |
| `loyalty_transactions` | No versione config | **`loyalty_config_version`** | Traccia quale formula ha generato ogni punto |
| Soft delete | Solo `deleted_at` | **`deleted_at` + `deleted_by`** | GDPR: sapere CHI ha cancellato, non solo QUANDO |
| GDPR consensi | Boolean impliciti | **Tabella `client_consents`** dedicata | Audit trail obbligatorio per legge con timestamp e IP |
| Performance RLS | Non documentata | **Funzione `get_my_tenant_id()`** + piano indici | Senza questo, ogni query fa un full table scan |
| Sezioni nuove | — | **Piano indicizzazione, Retention policy, Rischi, Checklist** | Documentazione operativa necessaria prima di scrivere SQL |

