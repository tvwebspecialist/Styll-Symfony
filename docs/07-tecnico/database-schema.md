> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `database-architetture.md`

---

---

## Sezione 0 — TL;DR strategia versionamento

**Risposta diretta alla domanda strategica:** *Il dominio si progetta una volta sola e non si tocca più. Le tabelle si creano quando servono. Le colonne future-proof esistono già in v1 come campi nullable/default, così v2 non deve MAI fare ALTER TABLE su tabelle v1.*

| Livello | Strategia |
|---|---|
| Modello dominio | Finale da subito: entità, relazioni e invarianti si disegnano una volta |
| Schema fisico | Incrementale additivo: v1 crea solo le tabelle necessarie oggi |
| Colonne future-proof | Presenti già in v1 come nullable/default, anche se inerti in UX |
| Indici e RLS | Attivati/estesi con la feature, mantenendo compatibilità retroattiva |

**Esempi concreti di colonne future-proof già in v1:**
- `clients.referred_by` esiste nullable in v1 → in v2 si attiva la UI referral
- `client_loyalty.tier_grace_expires_at` esiste inerte in v1 → in v2 si attiva il tier system completo
- `appointments.booking_source` include già `'whatsapp'` nel CHECK → in v3 si attiva la prenotazione WhatsApp in UI

> 🆕 **Perché NON creare tutte le 51 tabelle in v1**
> - **RLS debt:** più tabelle inutilizzate = più policy da scrivere, testare e mantenere
> - **Test surface:** aumenta la superficie di regressioni e leakage multi-tenant
> - **Backup costs:** snapshot/restore più costosi e più lenti senza valore operativo immediato
> - **Rischio requisiti cambiati:** le feature future cambiano, quindi tabelle premature invecchiano male

---

## Analisi critica — Punti di forza e criticità

### ✅ Punti di forza

- Versionamento additivo MVP→Growth→AI con migrazioni non distruttive
- Multi-tenancy nativa con helper RLS `get_my_tenant_id()`
- Separazione CRM/Auth robusta con `clients.profile_id` nullable
- Prezzi snapshot (`price_at_booking`, `price_at_sale`) per storico immutabile
- Exclusion constraint PostgreSQL contro sovrapposizioni appuntamenti
- Outbox + idempotency + webhook inbox per resilienza eventi esterni
- `loyalty_configs` immutabile con versioning storico tracciabile
- GDPR coperto con `client_consents`, `deleted_by` e `audit_log`
- Retention policy e partitioning pianificati in anticipo

### ⚠️ Criticità e miglioramenti integrati

| # | Criticità | Gravità | Miglioramento |
|---|---|---|---|
| 1 | `get_my_tenant_id()` ritorna un solo UUID → futuro multi-tenant staff limitato | 🟡 Media | Aggiunto `get_my_tenant_ids()` e raccomandazione RLS con `ANY(...)` |
| 2 | `client_loyalty.current_tier` basato su CHECK hardcoded | 🟡 Media | Bootstrap v1 mantenuto + introduzione `tier_slug` nullable per migrazione v2 |
| 3 | `appointments` senza controllo concorrenza ottimistico | 🟢 Bassa | Aggiunta colonna `version` con strategia optimistic locking |
| 4 | Rischio doppio earn loyalty su stesso appuntamento | 🟡 Media | Unique partial index in v1 su `loyalty_transactions(appointment_id)` dove `type='earn'` |
| 5 | `payments` senza campi refund strutturati | 🟡 Media | Campi refund aggiunti già in v1 come inerti |
| 6 | Convenzione `updated_at` non formalizzata | 🟢 Bassa | Sezione dedicata con trigger standard `set_updated_at()` |
| 7 | Mancanza di tenant-consistency su FK cross-tabella | 🟠 Alta | Nuova Decisione 14 + regola d'oro su FK composte/trigger di fallback |
| 8 | Costo messaggi lasciato solo in metadata JSONB | 🟢 Bassa | `messages_log.cost_cents` promosso a colonna dedicata + indice KPI |
| 9 | Nessun campo data residency esplicito su tenant | 🟢 Bassa | `tenants.data_region` aggiunto in v1 come future-proof |
| 10 | Audit incompleto per forensics operativo | 🟡 Media | Aggiunti `audit_log.actor_ip` e `audit_log.user_agent` |
| 11 | Checklist trigger senza regola tenant-consistency esplicita | 🟠 Alta | Aggiunta voce `check_tenant_consistency` su tabelle critiche |
| 12 | Strategia versionamento poco visibile in apertura | 🟡 Media | Strategia promossa a Sezione 0 con TL;DR operativo |

---

## 🗄️ Architettura Database — Decisioni definitive

> Questa sezione contiene TUTTE le decisioni architetturali del database.
> È la referenza definitiva: il prossimo step è solo scrivere le tabelle SQL.
> Ogni scelta è motivata e non va ridiscussa salvo nuovi requisiti.

> ⚠️ Revisione: v2 — 14 decisioni, 11 aree, 39 tabelle v1, 48 tabelle v2, ~51 tabelle v3. Vedi sezione «Riepilogo cambiamenti rispetto alla versione precedente» alla fine.

---

### Strategia di versionamento del database (v1 → v2 → v3)

**Domanda:** *devo creare da subito il database finale o anche il database ha le sue fasi?*

**Risposta breve:** il dominio è finale da subito, lo schema fisico cresce per fasi additive.

| Livello | Versionato? | Strategia |
|---|---|---|
| Schema concettuale (entità, relazioni, domini) | **No, finale da subito** | Il modello di dominio è stabile, si disegna una volta |
| Schema fisico (CREATE TABLE) | **Sì, incrementale** | Solo tabelle che servono ora; le altre sono migrations additive |
| Colonne "future-proof" nullable/JSONB | **Sì, da subito in v1** | Es. `tier_grace_expires_at`, `referred_by`, `loyalty_config_version` esistono già inerti |
| RLS e indici | **Incrementale** | Aggiunti con la feature via `CREATE INDEX CONCURRENTLY` |

**Regola d'oro:** *Le tabelle v2/v3 si AGGIUNGONO sopra lo schema v1. Nessuna tabella v1 viene modificata strutturalmente. Tutte le colonne che serviranno dopo esistono già in v1 con default sensati.*

Esempio pratico (Luca, Marco): Marco parte con v1 e usa booking/CRM/loyalty base. Quando attiva v2, non riscrive nulla: aggiunge tabelle marketing/queue/integrations. Quando attiva v3, aggiunge AI (`no_show_predictions`, `ai_suggestions`) senza toccare i dati storici di Luca.

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

### Le 14 decisioni architetturali fondamentali

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


⚠️ booking_source deve essere un enum, non una stringa libera: Senza vincolo, possono finire valori come 'pwa', 'PWA', 'Pwa', 'webapp' — rendendo le analytics inutili. Implementare come:

SQL
booking_source TEXT NOT NULL DEFAULT 'pwa'
  CHECK (booking_source IN (
    'pwa', 'dashboard_owner', 'dashboard_manager', 
    'dashboard_staff', 'dashboard_receptionist', 
    'walk_in', 'phone', 'whatsapp'
  ))


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

**✏️ Refund fields inerti già in v1:** `refunded_amount`, `refunded_at`, `refund_reason`, `stripe_refund_id` vengono creati subito per evitare ALTER TABLE in v2 quando arriva Stripe.

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

✏️ **Nota multi-tenant per staff (implementazione additiva):**
`get_my_tenant_id()` resta utile come helper di comodità (ritorna il primo tenant disponibile), ma le policy RLS dovrebbero preferire una funzione array-based per essere pronte al caso staff multi-tenant.

```sql
CREATE OR REPLACE FUNCTION get_my_tenant_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(tenant_id), ARRAY[]::UUID[])
  FROM staff_members
  WHERE profile_id = auth.uid()
  AND deleted_at IS NULL
  AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS d'esempio
CREATE POLICY "Staff sees own tenants" ON appointments
  FOR SELECT USING (tenant_id = ANY(get_my_tenant_ids()));
```

**Regola pratica:** `get_my_tenant_id()` resta disponibile per query semplici; nelle RLS preferire `ANY(get_my_tenant_ids())`.

**Indici minimi da creare:** Vedi la sezione "Piano di indicizzazione" più avanti nel documento.

---

#### 🆕 Decisione 13 — Messaging outbox pattern e idempotenza

**Decisione:** Separiamo nettamente scheduling/invio da storico, e rendiamo idempotenti tutte le scritture esterne.

**Pilastri:**
1. `messaging_outbox` = coda operativa (`pending/processing/sent/failed/cancelled`)
2. `messages_log` = storico post-invio (audit e costi)
3. Worker `pg_cron` ogni minuto: legge outbox `pending` con `scheduled_for <= now()` e processa in batch
4. `idempotency_keys` per API critiche (`booking`, `payment`, `redeem`)
5. `webhook_events_inbox` con `UNIQUE(provider, external_id)` per bloccare duplicati provider

**Perché è fondamentale:**
- Se Luca preme due volte "Prenota" con rete mobile lenta, la seconda richiesta non deve creare duplicati
- Se il provider webhook invia 3 volte lo stesso evento delivery, va processato una sola volta
- Se il reminder delle 24h non parte al primo tentativo, il worker deve poter fare retry tracciato

**Pattern operativo:**
- API/cron inseriscono in `messaging_outbox` (mai invio diretto)
- Worker prende i pending in ordine temporale
- Invia (sms/whatsapp/email/push)
- Scrive esito in `messages_log` e aggiorna outbox

Questo rende il sistema osservabile (queue depth, retry, latenza) e robusto a errori transienti esterni.

---

#### 🆕 Decisione 14 — Tenant consistency cross-FK

**Decisione:** Ogni foreign key che attraversa più tabelle tenant-scoped deve garantire coerenza sullo stesso `tenant_id`.

Esempio operativo: `appointments.staff_id.tenant_id = appointments.client_id.tenant_id = appointments.tenant_id`.

**Strategia combinata:**
1. **Preferita:** chiavi composte con `tenant_id` su tutte le FK cross-tenant
```sql
-- Invece di: FOREIGN KEY (staff_id) REFERENCES staff_members(id)
-- Fare: FOREIGN KEY (tenant_id, staff_id) REFERENCES staff_members(tenant_id, id)
```
2. **Fallback:** trigger `BEFORE INSERT/UPDATE` (`check_tenant_consistency`) quando introdurre FK composte è troppo invasivo su schema già esistente.

**Perché è critica:** impedisce collegamenti invalidi tra tenant diversi (es. dati di Marco legati per errore a dati di Andrea) anche in presenza di bug applicativi.

---

### Le 11 aree funzionali del database

Il database è organizzato in 11 macro-aree, dalle fondamenta verso le funzionalità più alte.

---

#### AREA 1 — Business e Abbonamenti (le fondamenta)

**Scopo:** I barbershop registrati, le loro sedi, i piani disponibili, lo stato dell'abbonamento.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `tenants` | Il business (barbershop) | No (è la root) | `id`, `business_name`, `slug` (subdomain), `timezone` (es. 'Europe/Rome', obbligatorio), `logo_url`, `primary_color`, `secondary_color`, `font_family`, `feature_flag_overrides` (JSONB), `settings` (JSONB — config generali: cancellation policy, no-show policy, ecc.), `status` (active/suspended), `data_region` (TEXT NOT NULL DEFAULT 'eu-west-1'), `created_at`, `updated_at` |
| `locations` | Sedi fisiche del tenant | Sì | `id`, `tenant_id`, `name`, `address`, `city`, `zip_code`, `phone`, `email`, `latitude` (DECIMAL, nullable), `longitude` (DECIMAL, nullable), `timezone` (nullable, override del tenant), `is_active`, `created_at`, `updated_at` |
| `subscription_plans` | I 3 tier | No (globale) | `id`, `name`, `slug`, `price_monthly`, `max_staff`, `max_locations`, `max_messages_month`, `feature_flags` (JSONB), `is_active`, `created_at` |
| `tenant_subscriptions` | Collegamento tenant → piano | Sì | `id`, `tenant_id`, `plan_id`, `status`, `trial_ends_at`, `current_period_start`, `current_period_end`, `stripe_subscription_id` (nullable, per v2), `stripe_customer_id` (nullable), `created_at`, `updated_at` |

🆕 **Colonna future-proof `tenants.data_region`:**
In v1 è inerte e defaulta a `'eu-west-1'`. In v3 abilita strategie di data residency/internazionalizzazione senza `ALTER TABLE` distruttivi (vedi `docs/08-strategia/internazionalizzazione.md`).

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
| `appointments` | L'appuntamento | Sì | `id`, `tenant_id`, `client_id`, `staff_id`, `location_id`, `start_time` (TIMESTAMPTZ), `end_time` (TIMESTAMPTZ), `status` ('pending'/'confirmed'/'completed'/'cancelled'/'no_show'), `booking_source`, `booked_by` (nullable), `notes`, `created_by` → `profiles.id` (nullable, chi ha materialmente creato il record), `version` (INT NOT NULL DEFAULT 1), `deleted_at`, `deleted_by` (UUID, nullable), `created_at`, `updated_at` |
| `appointment_services` | Servizi nell'appuntamento con prezzo snapshot | Sì | `id`, `tenant_id`, `appointment_id`, `service_id`, `price_at_booking` (DECIMAL), `created_at` |
| `appointment_products` | Prodotti venduti con prezzo e quantità snapshot | Sì | `id`, `tenant_id`, `appointment_id`, `product_id`, `quantity`, `price_at_sale` (DECIMAL), `created_at` |
| 🆕 `payments` | Pagamento effettivo dell'appuntamento | Sì | `id`, `tenant_id`, `appointment_id` → `appointments.id` (nullable — un pagamento potrebbe essere un acconto senza appuntamento specifico), `client_id` → `clients.id`, `amount` (DECIMAL(10,2)), `tip_amount` (DECIMAL(10,2) DEFAULT 0), `payment_method` ('cash'/'card_terminal'/'stripe_online'/'bank_transfer'/'other'), `status` ('pending'/'completed'/'refunded'/'partial_refund'/'failed'), `stripe_payment_id` (VARCHAR, nullable — per v2), `refunded_amount` (NUMERIC(10,2) NOT NULL DEFAULT 0), `refunded_at` (TIMESTAMPTZ, nullable), `refund_reason` (TEXT, nullable), `stripe_refund_id` (TEXT, nullable), `notes` (TEXT, nullable), `paid_at` (TIMESTAMPTZ), `created_by` → `profiles.id` (nullable, chi ha registrato il pagamento), `created_at` |

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

✏️ **Optimistic locking su `appointments`:**
- `version INT NOT NULL DEFAULT 1` per gestire modifiche concorrenti (es. due receptionist sullo stesso appuntamento)
- Trigger `BEFORE UPDATE` incrementa `version`
- L'app aggiorna con guardia: `UPDATE ... WHERE id = ? AND version = ?`

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
| `client_loyalty` | Stato loyalty del cliente | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `total_points`, `available_points`, `current_streak`, `longest_streak`, `current_tier` (default 'bronze'), `tier_slug` (TEXT, nullable), `tier_points_this_year`, `tier_year` (INTEGER), `tier_grace_expires_at` (TIMESTAMPTZ, nullable), `last_visit_date`, `created_at`, `updated_at` |
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

🆕 **Prevenzione doppio accredito earn già in v1:**
```sql
CREATE UNIQUE INDEX idx_loyalty_transactions_one_earn_per_appt
ON loyalty_transactions (appointment_id)
WHERE type = 'earn' AND appointment_id IS NOT NULL;
```
Questo impedisce race condition che accreditano due volte i punti per lo stesso appuntamento completato.

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
| `messages_log` | Log messaggi inviati | Sì | `id`, `tenant_id`, `client_id` → `clients.id`, `template_id` → `message_templates.id` (nullable), `channel` ('sms'/'whatsapp'/'email'/'push'), `type`, `recipient` (telefono o email), `body_sent` (testo effettivo inviato), `status` ('queued'/'sent'/'delivered'/'failed'/'bounced'), `cost` (DECIMAL, nullable), `cost_cents` (BIGINT NOT NULL DEFAULT 0), `external_id` (ID del provider es. MessageBird), `sent_at`, `created_at` |
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

✏️ **`messages_log.cost_cents` come colonna esplicita:**
Il costo resta disponibile anche in `metadata` per compatibilità, ma il campo dedicato `cost_cents` abilita query billing/KPI veloci (`SUM`, filtri per periodo, ranking tenant) senza parsing JSONB.

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
| `audit_log` | Log operazioni sensibili | Sì | `id`, `tenant_id`, `actor_id` → `profiles.id` (chi ha fatto l'azione), `action` ('create'/'update'/'delete'/'status_change'), `entity_type` (es. 'appointment', 'client', 'service', 'payment'), `entity_id` (UUID dell'entità modificata), `changes` (JSONB — old/new values), `actor_ip` (INET, nullable), `user_agent` (TEXT, nullable), `created_at` |

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
  "new": { "status": "cancelled", "price": 15.00 },
  "reason": "Cliente assente"
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

#### AREA 11 — Infrastruttura operativa

**Scopo:** Tabelle infrastrutturali cross-feature necessarie per push, outbox, idempotenza API, webhook e stato onboarding tenant.

| Tabella | Scopo | `tenant_id`? | Colonne principali |
|---------|-------|-------------|-------------------|
| `push_subscriptions` | Device registrati per Web Push (PWA cliente + staff) | Nullable (admin può avere subscription globale) | `id`, `tenant_id` (nullable), `profile_id` → `profiles.id`, `endpoint` (UNIQUE), `p256dh_key`, `auth_key`, `user_agent`, `device_label`, `last_used_at`, `created_at` |
| `messaging_outbox` | Coda messaggi programmati (reminder, win-back) | Sì | `id`, `tenant_id`, `client_id`, `appointment_id`, `template_id`, `channel`, `scheduled_for`, `payload` (JSONB), `status`, `attempts`, `last_attempt_at`, `last_error`, `messages_log_id`, `idempotency_key` (UNIQUE), `created_at` |
| `idempotency_keys` | Protezione richieste duplicate su endpoint critici | Sì | `id`, `tenant_id`, `scope`, `key`, `response_hash`, `response_body` (JSONB), `status_code`, `created_at`, `expires_at` |
| `tenant_usage_counters` | Metering atomico quote piano (`max_messages_month`) | Sì (PK composta) | `tenant_id`, `period_month`, `metric`, `count`, `cost_cents`, `updated_at` |
| `webhook_events_inbox` | Inbox eventi webhook idempotenti provider esterni | Nullable (derivato da payload) | `id`, `provider`, `external_id`, `event_type`, `tenant_id` (nullable), `payload` (JSONB), `signature`, `status`, `processed_at`, `error`, `received_at` |
| `tenant_onboarding_state` | Stato wizard onboarding 1:1 con tenant | Sì (PK=FK) | `tenant_id` (PK/FK), `current_step`, `completed_steps` (TEXT[]), `data` (JSONB), `completed_at`, `updated_at` |

**Relazioni:**
```
push_subscriptions ──→ profiles ──→ tenants (opzionale via staff/client)
messaging_outbox ──→ tenants + clients + appointments + message_templates
messaging_outbox ──→ messages_log (quando inviato)
idempotency_keys ──→ tenants
tenant_usage_counters ──→ tenants
webhook_events_inbox ──→ tenants (derivato da payload/event binding)
tenant_onboarding_state ──→ tenants (1:1)
```

**Chi vede cosa:**
Queste tabelle sono prevalentemente **interne al sistema** o per **Admin piattaforma**. I ruoli operativi (staff/receptionist/cliente) non hanno accesso diretto in lettura/scrittura.

| Ruolo | `push_subscriptions` | `messaging_outbox` | `idempotency_keys` | `tenant_usage_counters` | `webhook_events_inbox` | `tenant_onboarding_state` |
|-------|----------------------|--------------------|--------------------|-------------------------|------------------------|---------------------------|
| Sistema (Edge/cron/worker) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin piattaforma | ✅ (debug) | ✅ (monitoring) | ✅ (debug) | ✅ (metering) | ✅ (operativo) | ✅ (supporto onboarding) |
| Titolare/manager/staff/receptionist | ❌ diretto | ❌ diretto | ❌ | ❌ diretto | ❌ | ❌ diretto |
| Cliente | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**SQL di riferimento (v1 infrastrutturale):**

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES tenants(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  device_label TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE messaging_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),
  appointment_id UUID REFERENCES appointments(id),
  template_id UUID REFERENCES message_templates(id),
  channel TEXT NOT NULL CHECK (channel IN ('sms','whatsapp','email','push')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  messages_log_id UUID REFERENCES messages_log(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messaging_outbox_pending_scheduled
  ON messaging_outbox (scheduled_for)
  WHERE status = 'pending';
```

```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  scope TEXT NOT NULL CHECK (scope IN ('booking','payment','redeem')),
  key TEXT NOT NULL,
  response_hash TEXT,
  response_body JSONB,
  status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  UNIQUE (tenant_id, scope, key)
);
```

```sql
CREATE TABLE tenant_usage_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period_month DATE NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('sms_sent','whatsapp_sent','email_sent','push_sent','bookings_created','storage_bytes')),
  count BIGINT NOT NULL DEFAULT 0,
  cost_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, period_month, metric)
);
```

```sql
CREATE TABLE webhook_events_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('messagebird','infobip','stripe','twilio')),
  external_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  payload JSONB NOT NULL,
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed','skipped')),
  processed_at TIMESTAMPTZ,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, external_id)
);
```

```sql
CREATE TABLE tenant_onboarding_state (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  current_step TEXT NOT NULL,
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Mappa relazioni tra le 11 aree (✏️ aggiornata con AREA 11 infrastrutturale)

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
      └──────────┬──────────┘    └────────────────────┘
                 │
                 ▼
      ┌─────────────────────────────────────────────────┐
      │ AREA 11: INFRASTRUTTURA OPERATIVA (🆕)         │
      │ push, outbox, idempotency, webhook, onboarding │
      └─────────────────────────────────────────────────┘
```

Collegamenti chiave aggiuntivi con AREA 11:
- AREA 7 (Messaggistica) **scrive sempre** su `messaging_outbox` e poi su `messages_log`
- AREA 1 (Business) alimenta i limiti piano tramite `tenant_usage_counters`
- Webhook provider esterni passano da `webhook_events_inbox` prima di aggiornare dati operativi

---

### Riepilogo tabelle per fase (✏️ aggiornato)

**v1 (MVP) — 39 tabelle** *(40 se si anticipa `data_export_requests` per compliance)*:

| Area | Tabelle |
|------|---------|
| 1. Business | `tenants`, `locations`, `subscription_plans`, `tenant_subscriptions` |
| 2. Utenti | `profiles`, `staff_members`, `staff_locations` |
| 3. Catalogo | `services`, `staff_services`, `products`, `product_inventory` |
| 4. Appuntamenti | `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products`, `payments` |
| 5. CRM | `clients`, `client_notes`, `client_consents` |
| 6. Loyalty | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions` |
| 7. Messaggi e Notifiche | `message_templates`, `messages_log`, `staff_notifications` |
| 8. Analytics | `client_analytics` |
| 9. Recensioni | `review_requests` |
| 10. Admin | `admin_users`, `tenant_activity_log`, `audit_log` |
| 11. Infrastruttura operativa (🆕) | `push_subscriptions`, `messaging_outbox`, `idempotency_keys`, `tenant_usage_counters`, `webhook_events_inbox`, `tenant_onboarding_state` |

**v2 (Growth) — +9 tabelle totali rispetto a v1:**

| Area | Tabelle aggiunte |
|------|-----------------|
| 3. Catalogo | `inventory_movements` |
| 6. Gamification | `tier_configs`, `badges`, `client_badges`, `challenges` |
| 7/11. Growth operativo (🆕) | `marketing_campaigns`, `campaign_recipients`, `walk_in_queue`, `tenant_integrations` |

**v3 (AI) — +2 (o +3 con compliance posticipata):**
- `no_show_predictions`
- `ai_suggestions`
- (`data_export_requests` se non anticipata in v1)

**Totale pianificato:** v1 = **39**, v2 = **48**, v3 = **~51**.

**Tabelle senza `tenant_id` (globali):**
- `subscription_plans` — i piani sono uguali per tutti
- `admin_users` — gli admin non appartengono a nessun barbiere
- `profiles` — collegata a `auth.users`, non a un tenant specifico
- `auth.users` — gestita da Supabase, non la creiamo noi

**Nota:** `push_subscriptions` e `webhook_events_inbox` possono avere `tenant_id` nullable in casi specifici (scope admin/provider), quindi NON sono globali.

### 🆕 Tabelle aggiuntive v2 — SQL di riferimento

```sql
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('win_back','birthday','promo','reactivation','custom')),
  template_id UUID REFERENCES message_templates(id),
  audience_filter JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  stats JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  messages_log_id UUID REFERENCES messages_log(id),
  status TEXT NOT NULL,
  converted_appointment_id UUID REFERENCES appointments(id),
  UNIQUE (campaign_id, client_id)
);
```

```sql
CREATE TABLE walk_in_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  client_id UUID REFERENCES clients(id),
  phone TEXT,
  display_name TEXT,
  requested_service_id UUID REFERENCES services(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_ready_at TIMESTAMPTZ,
  called_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','called','served','left','expired')),
  position INTEGER
);
```

```sql
CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar','instagram','stripe','meta_whatsapp')),
  access_token_encrypted BYTEA,
  refresh_token_encrypted BYTEA,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  external_account_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_tenant_integrations_active
  ON tenant_integrations (tenant_id, provider)
  WHERE disconnected_at IS NULL;
```

### 🆕 Tabelle aggiuntive v3 (AI) — SQL di riferimento

```sql
CREATE TABLE no_show_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  risk_score NUMERIC(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_bucket TEXT NOT NULL CHECK (risk_bucket IN ('low','medium','high')),
  factors JSONB NOT NULL DEFAULT '{}',
  deposit_required BOOLEAN NOT NULL DEFAULT false,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actual_outcome TEXT
);
```

```sql
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  suggestion_type TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  suggestion_text TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  feedback TEXT CHECK (feedback IN ('helpful','not_helpful','applied')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 🆕 Bonus compliance — `data_export_requests` (GDPR art. 17/20)

Questa tabella può essere anticipata in v1 per compliance o posticipata in v3.

```sql
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('export','delete','rectify')),
  status TEXT NOT NULL,
  file_url TEXT,
  completed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);
```

### Workflow tipi TypeScript

> I tipi TypeScript di tutte le tabelle sono auto-generati da Supabase con il comando `npx supabase gen types typescript --project-id [id] > styll/src/types/database.ts`. Questo garantisce coerenza end-to-end tra schema del database e codice applicativo: ogni modifica allo schema si riflette immediatamente come errore di tipo nell'editor se il codice usa campi obsoleti o tipi errati.

⚠️ Dopo le nuove migrazioni (estensione schema con 11 nuove tabelle documentate in questa revisione), **non aggiornare a mano le interfacce**: rigenerare sempre il file tipi con il comando sopra.

---

### 🆕 Miglioramenti alle tabelle esistenti (additivi, retro-compatibili)

1. **Full-text search su `clients`**
   - Nuova colonna materializzata: `search_vector tsvector GENERATED ALWAYS AS (...) STORED`
   - Peso A: `full_name` (config `italian`), Peso B: `phone` (`simple`), Peso C: `email` (`simple`)
   - Indice: `CREATE INDEX ... USING GIN(search_vector)`

2. **GIN index su JSONB filtrabili**
   - `tenants.feature_flag_overrides`
   - `subscription_plans.feature_flags`
   - `messages_log.metadata`

3. **Partitioning pianificato (decisione presa ora, rollout dopo)**
   - `messages_log` by RANGE su `created_at` trimestrale
   - `audit_log` by RANGE su `created_at` trimestrale
   - Migrazione futura additive, senza impatti sul dominio

4. **Indici aggiuntivi su `audit_log`**
   - `(entity_type, entity_id, created_at DESC)`
   - `(tenant_id, actor_id, created_at DESC)`

5. **Standardizzazione tipi NUMERIC**
   - Prezzi: `NUMERIC(10,2)`
   - Costi messaggi: `NUMERIC(12,4)` (es. €0.0248)
   - VIP Score: `NUMERIC(5,2)`
   - Risk AI: `NUMERIC(3,2)`
   - Coordinate: `NUMERIC(10,7)`

6. **CHECK su `client_loyalty.current_tier`**
   - In v1 il CHECK hardcoded resta bootstrap: `CHECK (current_tier IN ('Bronze','Silver','Gold','Platinum'))`
   - 🆕 In v1 aggiungiamo anche `tier_slug TEXT NULL` accanto a `current_tier`
   - In v2, con `tier_configs`, migrazione consigliata: `current_tier_slug TEXT` + FK soft (validazione applicativa) verso `tier_configs(tier_slug)`

7. **`booking_rate_limit` (opzionale)**
   - Valutazione: per MVP è preferibile riusare `idempotency_keys` + regole applicative per anti-spam
   - Se il volume guest booking cresce: mini-tabella dedicata (`phone`, `ip`, `first_seen_at`, `count`)

---

### Regole architetturali — Le 15 regole d'oro (✏️ aggiornate)

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
| 11 | **I pagamenti sono separati dagli appuntamenti** | `completed` ≠ `pagato`. Il revenue reale viene dalla tabella `payments` |
| 12 | **Indici espliciti su ogni colonna filtrata** | PostgreSQL non crea indici sulle FK. Senza indici, RLS + tenant_id = full table scan |
| 🆕 13 | **Idempotenza su ogni scrittura esterna** | Booking API, webhook, pagamenti e redeem passano per `idempotency_keys` o `webhook_events_inbox` |
| 🆕 14 | **SMS/push/email SEMPRE via `messaging_outbox`** | Mai invio diretto: retry, scheduling e audit coerente |
| 🆕 15 | **Tenant-consistency su FK cross-tenant** | Nessun dato di Marco può collegarsi a dati di Andrea via FK mal validate |

---

### 🆕 Convenzione `updated_at`

- Tutte le tabelle mutabili devono avere `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Trigger generico standard:
```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Applicato a: tenants, locations, tenant_subscriptions, staff_members, services,
-- products, product_inventory, clients, appointments, client_loyalty, loyalty_configs,
-- rewards, message_templates, tenant_integrations, etc.
```
- Tabelle append-only che **non** usano `updated_at`: `loyalty_transactions`, `messages_log`, `audit_log`, `reward_redemptions`, `appointment_services`, `appointment_products`, `webhook_events_inbox`

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
| `messages_log` | `(tenant_id, sent_at, cost_cents)` | B-tree composto | Query billing/KPI per periodo con aggregazioni veloci su costo |
| `staff_members` | `(tenant_id, profile_id) WHERE deleted_at IS NULL` | Partial B-tree | Usato da `get_my_tenant_id()`/`get_my_tenant_ids()` — chiamate in OGNI RLS policy |
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
| `push_subscriptions` | `(profile_id)` | B-tree | Lookup device per utente autenticato (cliente/staff) |
| `push_subscriptions` | `(tenant_id)` | B-tree | Invio broadcast operativo per tenant |
| `messaging_outbox` | `(scheduled_for) WHERE status='pending'` | Partial B-tree | Worker minuto per minuto: pesca solo i pending in scadenza |
| `messaging_outbox` | `(tenant_id, status)` | B-tree composto | Monitoring coda e retry per tenant |
| `idempotency_keys` | `(expires_at)` | B-tree | Cleanup orario chiavi scadute |
| `webhook_events_inbox` | `(received_at) WHERE status='received'` | Partial B-tree | Worker webhook prende solo eventi non processati |
| `clients` | `search_vector` | GIN | Ricerca full-text veloce per nome/telefono/email |
| `tenants` | `feature_flag_overrides` | GIN (JSONB) | Filtri admin/operativi su override funzionalità |
| `subscription_plans` | `feature_flags` | GIN (JSONB) | Query piani per capability senza full scan JSONB |
| `messages_log` | `metadata` | GIN (JSONB) | Filtri tecnici su provider/status metadata |
| `audit_log` | `(entity_type, entity_id, created_at DESC)` | B-tree composto | Traccia cronologica completa per entità |
| `audit_log` | `(tenant_id, actor_id, created_at DESC)` | B-tree composto | Audit per operatore (chi ha fatto cosa) |

**Quando creare gli indici:** Insieme alle tabelle, nella stessa migrazione SQL. Non dopo. Un indice aggiunto a posteriori su una tabella con dati richiede un lock esclusivo (su Supabase con `CREATE INDEX CONCURRENTLY` si evita il downtime, ma è meglio farlo subito).

**Nota sulle performance:** Con i volumi previsti per v1 (~1.000 tenant × 200 clienti = 200K righe in `clients`), questi indici sono più che sufficienti. Il partitioning fisico viene comunque deciso ora (piano trimestrale su `messages_log` e `audit_log`) ma attivato in rollout successivo quando i volumi lo richiedono.

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
| `push_subscriptions` | Indefinita (con cleanup inattivi) | Cleanup se `last_used_at < now() - 6 months` | Evita endpoint push obsoleti e bounce inutili |
| `messaging_outbox` | 90 giorni post invio | Elimina record `sent/failed/cancelled` oltre finestra operativa | La coda storica lunga vive in `messages_log` e analytics |
| `idempotency_keys` | 24 ore | Cleanup automatico via `expires_at` | Finestra sufficiente per retry client/rete mobile |
| `webhook_events_inbox` | 90 giorni dopo `processed_at` | Cleanup periodico processati | Conserva troubleshooting recente, evita crescita infinita |
| `tenant_usage_counters` | Indefinita | Mai cancellare | Aggregati leggeri utili per billing e trend |
| `no_show_predictions` | 24 mesi | Archivia o elimina oltre soglia | Utile per tuning modelli, poi valore decresce |
| `ai_suggestions` | 24 mesi | Archivia o elimina oltre soglia | Storico suggerimenti/follow-up utile medio termine |

**Chi gestisce la pulizia:** Un cron job settimanale (non notturno — la pulizia è meno urgente della riconciliazione):
1. Controlla `messages_log WHERE sent_at < NOW() - INTERVAL '24 months'` → elimina
2. Controlla `staff_notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '6 months'` → elimina
3. Controlla `audit_log WHERE created_at < NOW() - INTERVAL '36 months'` → esporta come JSON in Supabase Storage → elimina dal database
4. Controlla `push_subscriptions WHERE last_used_at < NOW() - INTERVAL '6 months'` → elimina endpoint inattivi
5. Controlla `webhook_events_inbox WHERE status IN ('processed','skipped') AND processed_at < NOW() - INTERVAL '90 days'` → elimina

**Nota v1:** In v1 NON implementiamo la pulizia automatica. I volumi sono troppo bassi per giustificarlo. La retention policy viene documentata ora per non dimenticarla quando i volumi cresceranno.

---

### 🆕 Rischi architetturali e mitigazioni

| # | Rischio | Impatto | Probabilità | Mitigazione |
|---|---------|---------|-------------|-------------|
| 1 | **RLS policy mal configurata** → un tenant vede i dati di un altro | 🔴 Critico | Media (errore umano in fase di sviluppo) | Test automatici per ogni policy RLS: per ogni tabella, verificare che un utente del tenant A non possa leggere/scrivere dati del tenant B. Suite di test obbligatoria prima del deploy |
| 2 | **Cron notturno fallisce** → metriche analytics sbagliate | 🟡 Medio | Media | Il cron scrive un log di esecuzione con `started_at`, `completed_at`, `tenants_processed`, `errors`. Se il cron non gira per 2 notti consecutive, notifica all'admin. Le metriche trigger restano comunque ragionevolmente corrette |
| 3 | **Race condition su loyalty points** → punti duplicati | 🟡 Medio | Bassa | Mitigato già in v1 con indice parziale `UNIQUE` su `loyalty_transactions(appointment_id)` quando `type='earn'`, più riconciliazione notturna |
| 4 | **Exclusion constraint performance** su `appointments` con molte righe | 🟡 Medio | Bassa (sotto 1M righe) | L'exclusion constraint usa un indice GiST che è efficiente. Diventa lento solo sopra i 5M di righe. Monitorare con `pg_stat_user_indexes` |
| 5 | **JSONB `settings` su `tenants` diventa troppo grande** | 🟢 Basso | Bassa | Le impostazioni sono poche (<20 chiavi). Se crescono oltre 50, migrare a una tabella `tenant_settings` chiave-valore. Per ora JSONB è perfetto |
| 6 | **`messages_log` cresce troppo** → tabella più grande del database | 🟡 Medio | Alta (dopo 2+ anni) | La retention policy a 24 mesi mitiga. Se serve prima, partitioning per mese su `sent_at`. Supabase supporta il partitioning nativo di PostgreSQL |
| 7 | **Staff member eliminato** → appuntamenti orfani | 🟢 Basso | Bassa | Il soft delete (`deleted_at`) previene questo. Gli appuntamenti futuri dello staff rimosso devono essere riassegnati — l'applicazione deve gestire questo nel flusso di rimozione staff |
| 8 | **Cambio template loyalty** → confusione nei punti | 🟢 Basso | Bassa | Il versioning con `loyalty_config_version` su ogni transazione rende tracciabile quale formula ha generato ogni punto. La riconciliazione notturna verifica la coerenza |
| 9 | **Outbox worker fallisce** → reminder non inviati | 🔴 Alto | Media | Monitoring: `messaging_outbox WHERE status='pending' AND scheduled_for < now() - interval '5 minutes'`. Se > 0, alert immediato + retry controllato |
| 10 | **Webhook duplicati non rilevati** → corruzione dati | 🔴 Alto | Bassa | `UNIQUE(provider, external_id)` su inbox + validazione firma provider obbligatoria su ogni evento |
| 11 | **Token OAuth scaduti** su `tenant_integrations` | 🟡 Medio | Media | Cron ogni 15 min: controlla `token_expires_at < now() + interval '1 hour'` e avvia refresh preventivo |

---

### 🆕 Checklist pre-implementazione SQL

Prima di scrivere le migrazioni SQL, verificare:

- [ ] **Estensioni PostgreSQL abilitate su Supabase:**
  - `btree_gist` — per l'exclusion constraint sugli appuntamenti
  - `pgcrypto` — per `gen_random_uuid()` (già abilitata di default su Supabase)

- [ ] **Funzioni `get_my_tenant_id()` e `get_my_tenant_ids()`** create PRIMA di qualsiasi RLS policy

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
  34. `push_subscriptions` (dipende da `profiles` + `tenants`)
  35. `messaging_outbox` (dipende da `tenants` + `clients` + `appointments` + `message_templates`)
  36. `idempotency_keys` (dipende da `tenants`)
  37. `tenant_usage_counters` (dipende da `tenants`)
  38. `webhook_events_inbox` (dipende opzionalmente da `tenants`)
  39. `tenant_onboarding_state` (dipende da `tenants`, 1:1)
  40. `data_export_requests` (opzionale v1 compliance; dipende da `tenants` + `clients`)

- [ ] **RLS abilitate su OGNI tabella** (anche quelle globali come `subscription_plans` — con policy `SELECT` per tutti)

- [ ] **Indici creati nella stessa migrazione** delle tabelle (vedi Piano di indicizzazione)

- [ ] **Trigger creati dopo le tabelle:**
  - Trigger su `appointments` → aggiorna `client_analytics`
  - Trigger su `appointment_products` → aggiorna `product_inventory` (decrementa giacenza)
  - Trigger su `product_inventory` → crea `staff_notification` se `quantity < low_stock_threshold`
  - Trigger su `profiles` → creazione automatica del profilo dopo `auth.users` insert (Supabase Auth hook)
  - Trigger su `messages_log` → incrementa `tenant_usage_counters` (`sms_sent`, `whatsapp_sent`, `email_sent`, `push_sent`)
  - Trigger su `appointments` INSERT → incrementa `tenant_usage_counters(bookings_created)`
  - 🆕 Trigger `check_tenant_consistency` su tabelle con FK multiple tenant-scoped (`appointments`, `loyalty_transactions`, `reward_redemptions`, `campaign_recipients`, `messaging_outbox`)

- [ ] **Cron jobs da configurare (Supabase pg_cron):**
  - Ogni minuto: worker outbox (`messaging_outbox` pending in scadenza)
  - Ogni ora: cleanup `idempotency_keys WHERE expires_at < now()`
  - Settimanale: cleanup `webhook_events_inbox` processati > 30 giorni
  - Notturno: riconciliazione `client_analytics` + aggiornamento churn/VIP Score
  - Notturno: check reset annuale tier loyalty (`tier_year`, `tier_grace_expires_at`)
  - Settimanale (v2+): pulizia dati secondo retention policy

---

### 🆕 Riepilogo cambiamenti rispetto alla versione precedente del documento

| Cosa | Prima | Dopo | Perché |
|------|-------|------|--------|
| Decisioni architetturali | 13 | **14** | Aggiunta Decisione 14 (Tenant consistency cross-FK) |
| Tabelle v1 | 33 | **39** | Aggiunte 6 tabelle infrastrutturali v1 in AREA 11 (più `data_export_requests` opzionale per compliance) |
| Tabelle v2 cumulative | 38 | **48** | v2 cresce con 4 tabelle nuove additive (`marketing_campaigns`, `campaign_recipients`, `walk_in_queue`, `tenant_integrations`) |
| Regole d'oro | 14 | **15** | Aggiunta regola tenant-consistency |
| `client_analytics` | 8 metriche | **12 metriche** | Aggiunti `no_show_count`, `cancellation_count`, `referral_count`, `average_spend_per_visit` |
| `clients` | No referral tracking | **`referred_by`** self-reference | Il VIP Score menzionava "referral" ma non c'era struttura per tracciarlo |
| `loyalty_configs` | Campo `version` con update in-place | **Modello immutabile** con `started_at`/`ended_at` | Storico completo delle configurazioni, ricostruibile nel tempo |
| `loyalty_transactions` | No versione config | **`loyalty_config_version`** | Traccia quale formula ha generato ogni punto |
| Soft delete | Solo `deleted_at` | **`deleted_at` + `deleted_by`** | GDPR: sapere CHI ha cancellato, non solo QUANDO |
| GDPR consensi | Boolean impliciti | **Tabella `client_consents`** dedicata | Audit trail obbligatorio per legge con timestamp e IP |
| Performance RLS | Non documentata | **Funzione `get_my_tenant_id()`** + piano indici | Senza questo, ogni query fa un full table scan |
| Sezioni nuove | — | **Strategia versionamento DB, AREA 11, Miglioramenti tabelle esistenti, SQL nuove tabelle v2/v3** | Allineamento completo MVP→Growth→AI senza perdere retro-compatibilità |
| Sezione 0 | — | **TL;DR strategia versionamento promossa in apertura** | Risposta esplicita alla domanda strategica più frequente |
| Sezione analisi critica | — | **Nuova** | Documentazione trasparente di punti di forza e criticità note |
| `appointments.version` | — | **Aggiunto** | Optimistic locking per modifiche concorrenti |
| `payments` refund fields | — | **Aggiunti inerti v1** | Pronti per Stripe v2 senza ALTER TABLE |
| `loyalty_transactions` unique earn | v2 | **v1** | Prevenzione doppi accrediti già da MVP |
| `audit_log.actor_ip/user_agent` | — | **Aggiunti** | GDPR + forensics |
| `messages_log.cost_cents` | in metadata | **Colonna dedicata** | Query billing performanti |
| `tenants.data_region` | — | **Aggiunto inerte** | Internazionalizzazione v3-ready |
| `get_my_tenant_ids()` | Solo singolo | **Anche array** | Multi-tenant staff ready |
| Convenzione `updated_at` | Implicita | **Formalizzata** con trigger `moddatetime` | Consistenza temporale standard |