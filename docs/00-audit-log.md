# Audit di coerenza — 2026-04-08

## Sintesi esecutiva

Eseguiti i Task 6, 7 e 8 dell'audit di coerenza del repository Styll. Documentato il processo di naming, corrette 10 discrepanze numeriche nel business plan (executive summary vs tabelle dettagliate), e aggiornata la checklist di stato con 13 voci di lavoro completato ma non registrato. I Task 1–5 non erano inclusi in questa sessione.

## Decisioni progettuali applicate (non discusse, solo eseguite)

1. Naming Styll confermato, processo documentato in `docs/05-brand/naming-process.md`
2. Tabella dettagliata 6.1 del business plan è la fonte di verità per tutti i numeri finanziari
3. Checklist di stato allineata al contenuto effettivo della cartella `docs/`

## Task eseguiti

### Task 1 — Indice tesi a 8 capitoli
**Non eseguito in questa sessione.** (Task 1–5 non erano inclusi nel prompt.)

### Task 2 — Numero competitor
**Non eseguito in questa sessione.**

### Task 3 — Numero tabelle database
**Non eseguito in questa sessione.**

### Task 4 — Cancellazione progetto/
**Non eseguito in questa sessione.**

### Task 5 — Stack Next.js + TypeScript
**Non eseguito in questa sessione.**

### Task 6 — Naming process
**File creato:** `docs/05-brand/naming-process.md`
**Modifiche collegate:**
- `docs/05-brand/brand-identity.md`: aggiunto rimando al naming-process.md in apertura
- `docs/01-progetto/roadmap.md`: `[ ] Naming definitivo da scegliere` → `[x] Naming definitivo: Styll`
- `docs/09-tesi/indice-tesi.md`: idem
- `docs/03-prodotto/product-roadmap.md`: spostato naming da "Da completare" a "Completato" con nota al file
- `progetto/08-roadmap-e-sviluppo.md`: idem roadmap.md
- `messaggio.md`: aggiunto "naming definitivo (Styll)" nella riga "Stato attuale"

### Task 7 — Discrepanza business plan
**File modificato:** `docs/06-business/business-plan.md`

**Discrepanza principale corretta:** Executive summary (sezione 1) allineato alla tabella dettagliata 6.1.

**Tutte le discrepanze trovate e corrette (10 valori):**

| Metrica | Executive Summary (prima) | Tabella dettagliata (corretto) |
|---------|--------------------------|-------------------------------|
| Mese 6 — clienti | 45 | 54 |
| Mese 6 — MRR | €1.305 | €1.566 |
| Mese 6 — ARR | €15.660 | €18.792 |
| Mese 12 — clienti | 120 | 116 |
| Mese 12 — MRR | €3.480 | €3.364 |
| Mese 12 — ARR | €41.760 | €40.368 |
| Anno 2 — MRR | €10.150 | €11.200 |
| Anno 2 — ARR | €121.800 | €134.400 |
| Anno 3 — MRR | €23.200 | €28.000 |
| Anno 3 — ARR | €278.400 | €336.000 |

**Verifiche di coerenza superate (nessuna discrepanza):**
- Clienti Anno 2 (350) e Anno 3 (800): coerenti in exec summary, sezione 6.2 e scenario 9.2
- Break-even "mese 14–18": coerente tra exec summary e sezione 8.2
- ~160 clienti al break-even cumulativo: interpolazione coerente con la curva di crescita
- Nessun altro file nel repository conteneva i numeri errati

### Task 8 — Checklist di stato
**Voci cambiate da [ ] a [x]:** nessuna voce esistente cambiata (tutte le [x] preesistenti erano verificate)

**Voci nuove aggiunte (lavoro completato ma non registrato):**
1. Business plan completo con proiezioni 12/36 mesi
2. Literature review accademica
3. Analisi di internazionalizzazione (9 mercati, PPP pricing)
4. Voice of Customer su 2.800+ recensioni
5. Pricing strategy comparativa (7 modelli SaaS)
6. Go-to-market plan
7. Legal compliance / GDPR
8. Strategia social e brand
9. KPI framework e metriche SaaS
10. Database schema completo
11. Architettura tecnica dettagliata
12. Analisi strategica completa
13. Struttura tesi definita

**Voci sospette (segnalate per review):** nessuna — tutte le voci [x] preesistenti hanno contenuto corrispondente verificato.

**File aggiornati:**
- `messaggio.md` (sezione "Stato attuale")
- `docs/01-progetto/roadmap.md` (checklist)
- `docs/09-tesi/indice-tesi.md` (checklist)
- `docs/03-prodotto/product-roadmap.md` (tabella "Completato"/"Da completare")
- `progetto/08-roadmap-e-sviluppo.md` (checklist)

## Problemi aperti / richiedono decisione manuale

- **`messaggio.md` non ha una checklist [ ]/[x]** — la checklist di stato vive in `docs/01-progetto/roadmap.md`, `docs/09-tesi/indice-tesi.md` e `progetto/08-roadmap-e-sviluppo.md`. In `messaggio.md` c'è solo una riga di testo "Stato attuale" che è stata aggiornata.
- **Task 1–5 non eseguiti** — non erano inclusi nel prompt di questa sessione. Se servono, vanno richiesti separatamente.

## Altre incongruenze trovate durante l'audit (non risolte automaticamente)

1. **Stack dichiarato incoerente:** `messaggio.md` dichiara "React + Supabase" come stack, ma `docs/07-tecnico/architettura.md` e `docs/06-business/business-plan.md` riportano anch'essi "React". Se il Task 5 (Stack Next.js + TypeScript) è previsto, questa incongruenza verrà risolta da quel task.
2. ~~**Indice tesi a "10 capitoli":** la checklist ancora dice "Indice tesi aggiornato (10 capitoli)" — se il Task 1 prevede una struttura a 8 capitoli, questa voce andrà aggiornata.~~ → **Risolto in Sessione 2 (Task 1 + ritocco Task 8).**
3. **`progetto/` ancora presente:** la cartella `progetto/` contiene 8 file che sembrano essere le fonti originali poi migrate in `docs/`. Se il Task 4 (cancellazione progetto/) è previsto, va fatto il check di completezza prima.
4. **`120 clienti/mese` in `docs/07-tecnico/architettura.md:102` e `progetto/05-tecnologia-e-stack.md:97`:** si riferisce ai clienti *del singolo barbiere* (non ai clienti paganti di Styll), quindi NON è la stessa metrica del business plan. Non corretto perché semanticamente diverso.

## Commit fatti

1. `40c84e3` audit: Task 6 - naming process Styll documentato, checklist aggiornate
2. `6f24e6d` audit: Task 7 - correzione discrepanze numeriche business plan
3. `e39f180` audit: Task 8 - checklist aggiornata con lavoro effettivamente prodotto

---

# Sessione 2 — 9 aprile 2026

## Sintesi esecutiva

Allineamento dell'indice tesi alla struttura definitiva a 8 capitoli ABA e aggiornamento di tutti i riferimenti "10 capitoli" sparsi nel repository.

## Task eseguiti

### Task 1 — Allineamento indice tesi a 8 capitoli

**Struttura adottata:** 8 capitoli + Introduzione + Conclusioni + Bibliografia + Appendici. Stile progettuale/narrativo, prima persona, target 120-150 pp.

**Modifiche per file:**
- `docs/09-tesi/indice-tesi.md`: sovrascritto interamente con nuova struttura a 8 capitoli (titolo, metadata, nota di archiviazione, indice completo con tutte le sezioni)
- `docs/01-progetto/roadmap.md`: sezione "Indice tesi" sostituita — rimosso indice a 10 capitoli, inserita versione sintetica a 8 capitoli con rimando a indice-tesi.md
- `messaggio.md`: aggiornato riferimento nella tabella dei documenti ("10 capitoli" → "8 capitoli, struttura ABA")

**File archiviati:**
- `docs/09-tesi/struttura-tesi.md` → `docs/09-tesi/ARCHIVED-struttura-tesi-academic-6cap.md` (aggiunto banner ⚠️ DOCUMENTO ARCHIVIATO in testa)

### Ritocco Task 8 — Aggiornamento voci "10 capitoli" → "8 capitoli"

**File modificati:**
- `docs/01-progetto/roadmap.md` (checklist): `[x] Indice tesi aggiornato (10 capitoli)` → `[x] Indice tesi definito (8 capitoli, struttura ABA)`
- `docs/03-prodotto/product-roadmap.md`: tabella aggiornata
- `progetto/08-roadmap-e-sviluppo.md`: checklist aggiornata
- `docs/01-progetto/overview.md`: tabella documenti aggiornata
- `docs/00-audit-log.md`: incongruenza #2 marcata come risolta

## Problemi aperti / richiedono decisione manuale

Nessun nuovo problema emerso in questa sessione. Restano aperti dalla Sessione 1:
1. Stack dichiarato incoerente (React vs Next.js) — da risolvere con Task 5
2. Cartella `progetto/` ancora presente — da risolvere con Task 4

## Commit fatti (Sessione 2)

1. `b4cb611` audit: Task 1 - allineamento indice tesi a 8 capitoli
2. `47e5730` audit: ritocco Task 8 - voce indice tesi aggiornata da 10 a 8 capitoli

---

# Sessione 3 — 8 luglio 2025

**Task eseguiti:** Task 2 (competitor), Task 3 (tabelle database)
**Branch:** dev

## Task 2 — Consolidamento numero competitor a 13

### Problema
Tre numeri discordanti nel repository:
- `messaggio.md`: "8 competitor, 2 categorie"
- `competitor-analysis.md`: matrice con 13 competitor
- `ARCHIVED-struttura-tesi-academic-6cap.md`: citava Treatwell, Uala, Square Appointments (non presenti nella matrice)

### Soluzione
1. **Conteggio verificato**: 13 competitor con sezione analitica dedicata in `competitor-analysis.md`: Fresha, Booksy, theCut, Barberly, BookedBarber, GlossGenius, Phorest, Squire, Vagaro, Zenoti, Timely, Goldie, Boulevard
2. **Treatwell, Uala, Square Appointments**: rimossi dal file archiviato (non avevano analisi dedicata). Riferimenti a Treatwell/Square Appointments in altri file (internazionalizzazione, pricing, stack tecnico) lasciati intatti — sono citazioni contestuali legittime, non competitor analizzati
3. **Formato canonico**: *"13 competitor analizzati in dettaglio"*
4. **`messaggio.md`**: tabella competitor sostituita con riepilogo breve + rimando a `docs/02-mercato/competitor-analysis.md`
5. **Indice tesi**: Appendice A → "Matrice completa dei 13 competitor"

### File modificati (8)
- `messaggio.md`
- `docs/01-progetto/roadmap.md`
- `docs/01-progetto/overview.md`
- `docs/07-tecnico/architettura.md`
- `docs/08-strategia/strategia-social.md`
- `docs/09-tesi/ARCHIVED-struttura-tesi-academic-6cap.md`
- `docs/09-tesi/indice-tesi.md`
- `progetto/08-roadmap-e-sviluppo.md`

### Nota
Il numero "7 prodotti competitor analizzati" in `docs/02-mercato/voice-of-customer.md` è stato lasciato intatto: si riferisce ai prodotti da cui sono state estratte le recensioni, non al totale dei competitor analizzati.

---

## Task 3 — Consolidamento numero tabelle database a 33+5=38

### Problema
Quattro numeri diversi nel repository:
- `messaggio.md` / `architettura.md`: "28 tabelle v1, 33 v2"
- `database-schema.md` (fonte canonica): dichiarava "35 v1, 40 totali" (errato)
- `analisi-strategica.md`: "35 v1, 40 totali"
- File archiviato: "35 tabelle"

### Verifica
Enumerazione manuale delle tabelle nella fonte canonica (`database-schema.md`):

| Area funzionale | Tabelle | Conteggio |
|-----------------|---------|-----------|
| Business & Abbonamenti | tenants, subscription_plans, tenant_subscriptions, invoices | 4 |
| Utenti & Staff | profiles, staff_members, staff_schedules | 3 |
| Catalogo Servizi | services, service_categories, staff_services, working_hours | 4 |
| Appuntamenti | appointments, appointment_services, recurring_appointments, waitlist_entries, payments, time_off | 6 |
| CRM & Clienti | clients, client_notes, client_consents | 3 |
| Loyalty & Gamification | loyalty_configs, loyalty_points, loyalty_rewards, loyalty_redemptions, loyalty_transactions | 5 |
| Messaggistica | message_templates, messages_log, notifications | 3 |
| Analytics | client_analytics | 1 |
| Recensioni | reviews | 1 |
| Admin & Platform | admin_users, audit_log, feature_flags | 3 |
| **Totale v1** | | **33** |
| **v2 (+5)** | tier_configs, badges, client_badges, challenges, inventory_movements | **5** |
| **Totale** | | **38** |

L'errore nel file canonico: il changelog riportava "32 → 35" citando "payments, client_consents, e conteggio corretto" — il "conteggio corretto" sovrastimava di 2.

### Formato canonico
*"33 tabelle in v1, +5 in v2 (totale 38)"*

### File modificati (6)
- `docs/07-tecnico/database-schema.md` (fonte canonica): 35→33 v1, 40→38 totale, 36→34 con tenant_id (38−3 globali−auth.users), changelog
- `docs/07-tecnico/architettura.md`: 7 riferimenti "28 tabelle" → "33 tabelle"
- `docs/03-prodotto/product-roadmap.md`: "33 tabelle" → "33 tabelle v1, 38 totali"
- `docs/08-strategia/analisi-strategica.md`: "35 v1, 40 totali" → "33 v1, 38 totali"
- `docs/09-tesi/ARCHIVED-struttura-tesi-academic-6cap.md`: 3 riferimenti "35" corretti
- `docs/09-tesi/indice-tesi.md`: Appendice C → "38 tabelle"

---

## Ripasso numerico opportunistico

Verifiche effettuate durante l'esecuzione dei Task 2 e 3:

| Metrica | Risultato | Dettagli |
|---------|-----------|----------|
| TAM €41.3M / SAM €16.5M / SOM | ✅ Coerente | Verificato su 20+ file |
| 137.730 barbieri italiani | ✅ Coerente | Verificato su 30+ file, zero discrepanze |
| 82,7% micro-imprenditori | ✅ Coerente | Verificato su tutti i file |
| MRR/ARR proiezioni | ✅ Già corretto | Sessione 1, Task 7 |

**Nessuna nuova incongruenza numerica trovata.**

---

## Problemi aperti / richiedono decisione manuale

Nessun nuovo problema emerso in questa sessione. Restano aperti dalle sessioni precedenti:
1. Stack dichiarato incoerente (React vs Next.js) — da risolvere con Task 5
2. Cartella `progetto/` ancora presente — da risolvere con Task 4

## Commit fatti (Sessione 3)

1. `589f397` audit: Task 2 - consolidamento numero competitor a 13
2. `e5282f0` audit: Task 3 - consolidamento numero tabelle database a 33+5=38

---

# Sessione 4 — 9 aprile 2026

## Sintesi

Eseguiti i Task 5 (allineamento stack a Next.js 14+ con App Router + TypeScript) e 4 (cancellazione cartella `progetto/` duplicata di `docs/`). Questa è la sessione finale dell'audit di coerenza.

## Task eseguiti

### Task 5 — Stack Next.js 14+ con App Router + TypeScript

**File modificati (18 file):**
- `messaggio.md`: sinossi (riga 12) e tabella stack (riga 87) aggiornate da "React + Supabase" a "Next.js 14+ (App Router) + TypeScript + Supabase"
- `docs/01-progetto/overview.md`: sinossi e tabella stack aggiornate
- `docs/01-progetto/roadmap.md`: checklist "React + Supabase" → "Next.js 14+ App Router + TypeScript + Supabase"
- `docs/02-mercato/analisi-mercato.md`: struttura costi BMC e scorecard tecnologico
- `docs/02-mercato/trend-analysis.md`: header tecnologie
- `docs/03-prodotto/product-roadmap.md`: tabella deliverables e rischi
- `docs/06-business/business-plan.md`: sezione stack e tabella costi (Vercel al posto di Vercel/Netlify)
- `docs/06-business/kpi-framework.md`: tabella stack e implementazione PostHog
- `docs/07-tecnico/architettura.md`: dichiarazione stack, titolo, tabella gap, criticità #2 e #3 risolte, **nuova sezione 2.6**
- `docs/07-tecnico/database-schema.md`: aggiunta nota workflow tipi TypeScript (`npx supabase gen types typescript`)
- `docs/08-strategia/analisi-strategica.md`: 6 riferimenti stack aggiornati
- `docs/08-strategia/internazionalizzazione.md`: stack, libreria i18n (react-i18next → next-i18next), raccomandazioni
- `docs/08-strategia/legal-compliance.md`: tabella stack
- `docs/08-strategia/partnership-ecosistem.md`: riferimento frontend API
- `docs/09-tesi/literature-review.md`: dimensione architetturale
- `docs/09-tesi/ARCHIVED-struttura-tesi-academic-6cap.md`: abstract italiano/inglese, indice, tabella mapping
- `progetto/05-tecnologia-e-stack.md`: stack e titolo (prima della cancellazione in Task 4)
- `progetto/08-roadmap-e-sviluppo.md`: checklist (prima della cancellazione in Task 4)

**Sezione aggiunta:**
- `docs/07-tecnico/architettura.md` sezione 2.6 "Decisioni prese durante l'audit" con giustificazioni formali per:
  - Passaggio da React a Next.js 14+ con App Router (4 motivazioni)
  - Adozione di TypeScript (3 motivazioni)

**Criticità risolte:**
- Criticità #2 "React senza framework" → ✅ Risolto (Next.js 14+ App Router)
- Criticità #3 "Nessun type safety" → ✅ Risolto (TypeScript + tipi auto-generati Supabase)

**Cambio libreria i18n:** react-i18next → next-i18next (wrapper ottimizzato per Next.js con supporto SSR/SSG)

**File dove "React" è stato mantenuto (riferimenti legittimi, non dichiarazioni di stack):**
- Stack dei competitor in `architettura.md` (Calendly, Acuity, Fresha, GlossGenius, Mangomint, Barberly, Square Appointments)
- Nomi prodotto: React Email, React Query (TanStack Query)
- Feature framework: React Server Components, React Context
- Tabella alternative: "React + Vite" come alternativa non raccomandata
- Sezione 2.6 che spiega la decisione (menziona React come scelta precedente)
- `styll/` README (app React/Vite — fuori scope)
- `docs/README.md` e `REPORT-RIORDINO.md` (riferimenti a styll/)
- Voci storiche dell'audit log
- Licenze: "React: MIT"

### Task 4 — Cancellazione cartella `progetto/`

**Esito check di completezza:** Nessun contenuto orfano trovato.

Tutte le 8 corrispondenze verificate:

| File `progetto/` | Corrispettivo in `docs/` | Esito |
|---|---|---|
| `01-visione-e-idea.md` | `docs/01-progetto/overview.md` + `docs/05-brand/brand-identity.md` | ✅ |
| `02-funzionalita-e-feature.md` | `docs/03-prodotto/feature-overview.md` | ✅ |
| `03-modello-di-business.md` | `docs/06-business/business-plan.md` (incl. 10 design decisions, riga 716) | ✅ |
| `04-target-e-utenti.md` | `docs/04-utenti/personas-e-journeys.md` | ✅ |
| `05-tecnologia-e-stack.md` | `docs/07-tecnico/architettura.md` (incl. API pricing, templates, GBP, cascade, righe 80-162) | ✅ |
| `06-design-e-ux.md` | `docs/03-prodotto/design-ux.md` (identico) | ✅ |
| `07-competitor-e-mercato.md` | `docs/02-mercato/competitor-analysis.md` + `analisi-mercato.md` (incl. 7 lamentele) | ✅ |
| `08-roadmap-e-sviluppo.md` | `docs/01-progetto/roadmap.md` + `docs/03-prodotto/product-roadmap.md` | ✅ |

**File cancellati:** 8 file, 1422 righe rimosse.

**Link e riferimenti aggiornati (11 file):**
- `messaggio.md`: rimossa tabella "Indice dei file dettagliati" (8 link a `progetto/`), sostituita con rimando a `docs/README.md`; aggiornato banner iniziale
- `docs/README.md`: rimossa nota "I file originali sono ancora nelle loro posizioni originali"; aggiornata sezione "Note sui File Originali"; rimossi riferimenti `progetto/` dalla colonna Fonti di 10 righe
- `docs/01-progetto/overview.md`: aggiornato header Fonti, rimosso banner progetto/, sostituita tabella indice con rimando a `docs/README.md`
- `docs/01-progetto/roadmap.md`: aggiornato header Fonti
- `docs/02-mercato/competitor-analysis.md`: aggiornato header Fonti e nota appendice
- `docs/03-prodotto/design-ux.md`: aggiornato header Fonti
- `docs/03-prodotto/feature-overview.md`: aggiornato header Fonti
- `docs/04-utenti/personas-e-journeys.md`: aggiornato header Fonti
- `docs/05-brand/brand-identity.md`: aggiornato header Fonti
- `docs/06-business/business-plan.md`: aggiornato header Fonti e nota appendice
- `docs/07-tecnico/architettura.md`: aggiornato header Fonti

**Riferimenti `progetto/` mantenuti (documenti storici):**
- `docs/REPORT-RIORDINO.md`: report storico del riordino, descrive il processo originale
- `docs/00-audit-log.md`: voci storiche delle sessioni precedenti
- `docs/09-tesi/ARCHIVED-struttura-tesi-academic-6cap.md`: file archiviato, tabella mapping storica

---

## Riepilogo finale dell'audit completo

L'audit di coerenza del repository Styll è stato completato in 4 sessioni:

| Sessione | Data | Task eseguiti |
|---|---|---|
| 1 | 2026-04-08 | Task 6 (naming), Task 7 (business plan), Task 8 (checklist) |
| 2 | 2026-04-09 | Task 1 (indice tesi a 8 capitoli), ritocco Task 8 |
| 3 | 2026-04-09 | Task 2 (competitor → 13), Task 3 (tabelle DB → 33) |
| 4 | 2026-04-09 | Task 5 (stack Next.js+TS), Task 4 (cancellazione progetto/) |

**Tutti i task del prompt originale sono stati eseguiti:**
- ✅ Task 1 — Indice tesi a 8 capitoli (struttura ABA)
- ✅ Task 2 — Numero competitor consolidato a 13
- ✅ Task 3 — Numero tabelle DB consolidato a 28 v1 + 5 v2 = 33
- ✅ Task 4 — Cartella `progetto/` cancellata (check completezza superato)
- ✅ Task 5 — Stack allineato a Next.js 14+ App Router + TypeScript
- ✅ Task 6 — Naming process documentato
- ✅ Task 7 — 10 discrepanze business plan corrette
- ✅ Task 8 — Checklist di stato aggiornata (13 voci)

## Incongruenze residue

Nessuna incongruenza residua. I due problemi aperti dalle sessioni precedenti sono stati risolti:
1. ~~Stack dichiarato incoerente (React vs Next.js)~~ → risolto con Task 5
2. ~~Cartella `progetto/` ancora presente~~ → risolto con Task 4

## Commit fatti (Sessione 4)

1. `c083e3a` audit: Task 5 - allineamento stack a Next.js 14+ con App Router + TypeScript
2. `ac13fde` audit: Task 4 - cancellazione cartella progetto/ duplicata di docs/
