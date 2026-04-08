# Styll — Product Roadmap & Prioritizzazione

> **Versione:** 1.0 — Aprile 2026
> **Autore:** Product Management
> **Progetto di tesi:** Piattaforma SaaS verticale per barbieri con focus sulla retention

---

## Indice

1. [Product Vision e Strategy](#1-product-vision-e-strategy)
2. [Stato Attuale del Prodotto](#2-stato-attuale-del-prodotto)
3. [Inventario Completo delle Feature](#3-inventario-completo-delle-feature)
4. [Prioritizzazione Multi-Framework](#4-prioritizzazione-multi-framework)
5. [Matrice Effort vs Impact](#5-matrice-effort-vs-impact)
6. [Definizione MVP](#6-definizione-mvp)
7. [Roadmap Trimestrale (Q1–Q4)](#7-roadmap-trimestrale-q1q4)
8. [User Story — Top 5 Feature](#8-user-story--top-5-feature)
9. [Feature Gating per Piano di Pricing](#9-feature-gating-per-piano-di-pricing)
10. [Metriche di Successo per Feature](#10-metriche-di-successo-per-feature)
11. [Mappa Dipendenze e Rischi](#11-mappa-dipendenze-e-rischi)
12. [Case Study — Decisioni di Prodotto SaaS](#12-case-study--decisioni-di-prodotto-saas)
13. [Riscontri e Osservazioni](#13-riscontri-e-osservazioni)
14. [Bibliografia e Fonti per la Tesi](#14-bibliografia-e-fonti-per-la-tesi)

---

## 1. Product Vision e Strategy

### 1.1 Product Vision

Styll è il sistema di retention brandizzato per micro-professionisti su appuntamento. Non è un marketplace, non è un gestionale generico: è il primo strumento che porta gamification, churn detection e win-back automatico nel settore barber/beauty a un prezzo accessibile.

**North Star Metric:** Retention Rate dei clienti finali (% clienti che tornano entro 45 giorni dalla visita precedente).

### 1.2 Principi Guida

1. **Retention-first, non acquisition-first.** Ogni feature deve rispondere alla domanda: "Questo aiuta il barbiere a far tornare i suoi clienti?"
2. **Il brand è del professionista.** Styll è invisibile al cliente finale. La PWA mostra il logo, i colori e il nome del barbiere.
3. **Progressive complexity.** Marco (1 sedia) vede il 30% delle feature. Sara (3 dipendenti, 2 sedi) vede il 70%. Nessuno è sopraffatto.
4. **Setup < 8 minuti.** L'onboarding è il momento critico. Se il barbiere non completa il setup, non diventa mai un utente attivo.
5. **I dati sono del barbiere.** Export gratis, sempre. Zero lock-in.
6. **La gamification è adattiva.** Visibile e divertente per Luca (22 anni), silenziosa e in background per Roberto (54 anni).
7. **Ship fast, learn faster.** Ogni feature deve essere rilasciata nella versione più semplice che genera valore, poi iterata.

### 1.3 Strategy Canvas

Il posizionamento strategico di Styll si articola su tre assi competitivi dove il mercato è scoperto:

- **Asse 1 — Retention nel tier accessibile (<€30/mese):** Nessun competitor sotto i €99/mese offre churn detection, win-back automatico e loyalty gamificata. Phorest lo fa, ma a €99+/mese con contratti annuali. Il gap è enorme.
- **Asse 2 — Gamification nel beauty/barber:** Blue ocean completo. Nessun competitor, in nessun tier di prezzo, offre streak, badge, livelli e sfide. Duolingo ha dimostrato che la gamification aumenta l'engagement del 48% (Gallup).
- **Asse 3 — White-label per micro-imprenditori:** Barberly offre un'app brandizzata su App Store, ma richiede pubblicazione store e manutenzione. Styll offre una PWA installabile in 1 tap, zero store, zero burocrazia.

---

## 2. Stato Attuale del Prodotto

### 2.1 Fase di Progettazione

Il progetto Styll è attualmente in **fase di progettazione pre-sviluppo**. Non esiste codice di produzione. Lo stato attuale è il seguente:

**Completato (progettazione):**

| Area | Stato | Qualità | Note |
|------|-------|---------|------|
| Concept e posizionamento | ✅ Completo | Alta | Differenziamento chiaro vs competitor |
| Analisi competitor (8 aziende, 2 categorie) | ✅ Completo | Alta | Tabelle comparative, review utenti analizzate |
| Personas (4: 2 professionisti + 2 clienti) | ✅ Completo | Alta | Con journey map completa per ciascuno |
| User Journey Maps (4 journey) | ✅ Completo | Alta | Touchpoint, emozioni, takeaway per fase |
| Modello di business (3 tier) | ✅ Completo | Alta | Pricing calibrato su benchmark |
| Architettura database (33 tabelle, 10 aree) | ✅ Completo | Alta | Schema PostgreSQL/Supabase, RLS, multi-tenant |
| Gamification design (4 layer, 3 template) | ✅ Completo | Alta | Soglie calibrate, flussi per persona |
| Decisioni progettuali (10/10 open questions) | ✅ Completo | Alta | Con benchmark competitor e dati reali |
| Roadmap feature (v1/v2/v3) | ✅ Completo | Media | Presente ma non prioritizzata con framework |
| Stack tecnologico (React + Supabase) | ✅ Scelto | Media | PWA, multi-tenant, white-label |
| Indice tesi (10 capitoli) | ✅ Completo | Alta | Struttura accademica definita |
| Naming definitivo: Styll | ✅ Completo | Alta | Processo documentato in `docs/05-brand/naming-process.md` |
| Business plan con proiezioni 12/36 mesi | ✅ Completo | Alta | Scenari pessimistico/realistico/ottimistico |
| Literature review accademica | ✅ Completo | Alta | Fonti SaaS, retention, gamification |
| Internazionalizzazione (9 mercati, PPP pricing) | ✅ Completo | Alta | Pricing adattato per potere d'acquisto |
| Voice of Customer (2.800+ recensioni) | ✅ Completo | Alta | Analisi qualitativa su recensioni competitor |
| Pricing strategy comparativa (7 modelli SaaS) | ✅ Completo | Alta | Benchmark di mercato dettagliato |
| Go-to-market plan | ✅ Completo | Alta | Strategia acquisizione e canali |
| Legal compliance / GDPR | ✅ Completo | Alta | Conformità normativa e privacy |
| Strategia social e brand | ✅ Completo | Alta | Piano editoriale e posizionamento |
| KPI framework e metriche SaaS | ✅ Completo | Alta | Dashboard metriche e target |
| Architettura tecnica dettagliata | ✅ Completo | Alta | Infrastruttura, API, costi |
| Analisi strategica completa | ✅ Completo | Alta | SWOT, Porter, value chain |
| Struttura tesi definita | ✅ Completo | Alta | Capitoli, sezioni, metodologia |

**Da completare:**

| Area | Stato | Priorità |
|------|-------|----------|
| Branding e identità visiva | ❌ Da fare | Alta |
| Architettura dell'informazione | ❌ Da fare | Alta |
| Wireframe low-fidelity | ❌ Da fare | Alta |
| Design system | ❌ Da fare | Alta |
| UI high-fidelity | ❌ Da fare | Alta |
| Prototipo interattivo (Figma) | ❌ Da fare | Alta |
| Implementazione frontend (React) | ❌ Da fare | Media |
| Implementazione backend (Supabase) | ❌ Da fare | Media |
| Testing e validazione | ❌ Da fare | Media |
| Scrittura tesi (Cap. 1-10) | ❌ Da fare | Alta |

### 2.2 Debito Tecnico e Rischi Identificati

Essendo in fase pre-sviluppo, il debito tecnico è zero. I rischi principali sono progettuali:

1. **Rischio scope creep:** 33 tabelle database e 9 feature innovative per il solo MVP è ambizioso. Serve una definizione MVP più stretta.
2. **Rischio PWA adoption:** L'installazione di una PWA non è intuitiva per tutti gli utenti (Roberto, 54 anni). Il tasso di installazione PWA è mediamente del 15-25%.
3. **Rischio multi-tenant complexity:** L'architettura multi-tenant con RLS, branding dinamico e feature toggle richiede una solida infrastruttura di base prima di qualsiasi feature.
4. **Rischio messaging costs:** I costi WhatsApp/SMS (~€6.50/mese per barbiere) erodono il margine del Tier 1 (€19-29/mese).
5. **Rischio onboarding drop-off:** Il target < 8 minuti per il setup è aggressivo. GlossGenius ci impiega ~10 min con un wizard ottimizzato.

### 2.3 Bug Noti

Nessun bug: il prodotto non è ancora sviluppato. I punti di attenzione emergono dalla progettazione:

- Lo schema database prevede `appointment_products` in v1, ma la vendita prodotti potrebbe essere rinviata a v2 senza impatto sulla value proposition core.
- La tabella `client_analytics` (VIP Score, semaforo churn) richiede job schedulati o trigger PostgreSQL per il calcolo. La complessità infrastrutturale è sottostimata.
- Il "Cascata intelligente" per i messaggi (Push → WhatsApp → SMS → Email) è prevista per v2 ma è critica fin dal v1 per Roberto.

---

## 3. Inventario Completo delle Feature

### 3.1 Categorizzazione

Ogni feature è classificata in 5 categorie:

- **CORE** — Funzionalità essenziale senza la quale il prodotto non ha senso
- **GROWTH** — Feature che aumenta adoption, engagement o retention
- **MONETIZATION** — Feature che giustifica upgrade di tier o genera revenue addizionale
- **INNOVATION** — Feature differenziante, blue ocean, nessun competitor la offre
- **INFRA** — Infrastruttura tecnica necessaria per abilitare altre feature

### 3.2 Inventario Completo

| ID | Feature | Categoria | Fonte | Fase Prevista | Effort (settimane dev) |
|----|---------|-----------|-------|---------------|----------------------|
| F01 | **Architettura multi-tenant + RLS** | INFRA | Architettura interna | v1 | 3 |
| F02 | **Auth con Supabase (staff + OTP clienti)** | INFRA | Architettura interna | v1 | 2 |
| F03 | **Branding dinamico per tenant (CSS vars, logo, colori)** | CORE | Competitor (Barberly, Phorest) | v1 | 2 |
| F04 | **Wizard setup 5 step** | CORE | Decisione progettuale #1 | v1 | 2 |
| F05 | **Catalogo servizi con template precompilati** | CORE | Decisione progettuale #1 | v1 | 1 |
| F06 | **Import da Google Business Profile** | GROWTH | Decisione progettuale #1 | v1 | 1.5 |
| F07 | **Dashboard barbiere (calendario giornaliero)** | CORE | Benchmark (Mangomint, GlossGenius) | v1 | 3 |
| F08 | **Gestione appuntamenti (CRUD + conferma)** | CORE | Baseline di mercato | v1 | 2 |
| F09 | **Landing page PWA per tenant** | CORE | Barberly, GlossGenius | v1 | 2 |
| F10 | **Booking cliente in 3 tap** | CORE | Journey Luca, GlossGenius | v1 | 2 |
| F11 | **CRM clienti centralizzato** | CORE | Baseline di mercato | v1 | 2 |
| F12 | **Profilo cliente a 2 livelli (barbiere/cliente)** | CORE | Decisione progettuale #7 | v1 | 1.5 |
| F13 | **Note private barbiere (GDPR)** | CORE | Decisione progettuale #7 | v1 | 0.5 |
| F14 | **Loyalty base a punti (Template Classico)** | CORE | Decisione progettuale #8 | v1 | 2 |
| F15 | **Catalogo reward (4 default + 2 custom)** | CORE | Decisione progettuale #8 | v1 | 1 |
| F16 | **Silent Churn Detector (semaforo 🟢🟡🔴)** | INNOVATION | Feature esclusiva Styll | v1 | 1.5 |
| F17 | **Promemoria anti no-show (notifica)** | CORE | Baseline di mercato | v1 | 1 |
| F18 | **Richiesta recensioni automatica (link Google)** | GROWTH | Phorest Reputation Manager | v1 | 1 |
| F19 | **Template social auto-brandizzati (5 template)** | GROWTH | Decisione progettuale #2 | v1 | 1.5 |
| F20 | **Subdomain per tenant (nome.styll.app)** | INFRA | Decisione progettuale #5 | v1 | 1 |
| F21 | **Gestione orari staff (working_hours + override)** | CORE | Baseline di mercato | v1 | 1.5 |
| F22 | **Tracking pagamenti offline** | CORE | Decisione progettuale pre-schema | v1 | 0.5 |
| F23 | **Catalogo prodotti + vendita in appuntamento** | CORE | Sezione Prodotti & Inventario | v1 | 2 |
| F24 | **Giacenza base (quantità + alert scorta bassa)** | CORE | Sezione Prodotti & Inventario | v1 | 1 |
| F25 | **Migrazione CSV (import guidato + mapping)** | GROWTH | Decisione progettuale #4 | v1 | 2 |
| F26 | **Punti iniziali per clienti storici** | GROWTH | Gamification design | v1 | 0.5 |
| F27 | **Messaggistica (SMS/WhatsApp via MessageBird)** | CORE | Decisione progettuale #9 | v1 | 2.5 |
| F28 | **Log messaggi + tracking costi** | INFRA | Decisione progettuale #9 | v1 | 1 |
| F29 | **Consensi GDPR + opt-in/opt-out** | INFRA | Requisito legale | v1 | 1 |
| F30 | **Multi-staff (4 ruoli: Titolare, Manager, Staff, Receptionist)** | MONETIZATION | Decisione progettuale #3 | v1 | 3 |
| F31 | **Calendario multi-staff affiancato** | MONETIZATION | Decisione progettuale #3 | v1 | 2 |
| F32 | **PWA installabile (manifest, service worker, offline)** | INFRA | Architettura tecnica | v1 | 1.5 |
| F33 | **Dashboard admin piattaforma** | INFRA | Architettura (Area 10) | v1 | 2 |
| F34 | **Loyalty gamificata (streak + badge + tier)** | INNOVATION | Feature esclusiva Styll | v2 | 4 |
| F35 | **Campagne win-back automatiche** | INNOVATION | Phorest ReConnect + Styll twist | v2 | 3 |
| F36 | **QR walk-in + coda digitale** | INNOVATION | Feature esclusiva Styll | v2 | 2.5 |
| F37 | **Abbonamenti e pacchetti (membership)** | MONETIZATION | Trend mercato | v2 | 3 |
| F38 | **VIP Score composito** | INNOVATION | Feature esclusiva Styll | v2 | 1.5 |
| F39 | **Analytics avanzata (revenue, retention, trend)** | MONETIZATION | Phorest, Mangomint | v2 | 3 |
| F40 | **Sfide temporanee (create dal barbiere)** | INNOVATION | Feature esclusiva Styll | v2 | 2 |
| F41 | **Custom domain per tenant** | MONETIZATION | Decisione progettuale #5 | v2 | 2 |
| F42 | **Movimenti magazzino tracciati** | GROWTH | Sezione Prodotti v2 | v2 | 2 |
| F43 | **Editor template social (Canva API)** | GROWTH | Decisione progettuale #2 | v2 | 2 |
| F44 | **Apple/Google Wallet loyalty card** | GROWTH | Gamification per Roberto | v2 | 2 |
| F45 | **Cascata messaggi intelligente** | GROWTH | Decisione progettuale #9 | v2 | 1.5 |
| F46 | **AI Business Coach** | INNOVATION | Feature esclusiva Styll | v3 | 5 |
| F47 | **Previsione ricavi** | INNOVATION | Feature esclusiva Styll | v3 | 3 |
| F48 | **Last-minute Slot Filler geolocalizzato** | INNOVATION | Feature esclusiva Styll | v3 | 4 |
| F49 | **Prenotazione da WhatsApp** | GROWTH | Trend mercato Italia | v3 | 3 |
| F50 | **After-Visit Story (Instagram template)** | INNOVATION | Feature esclusiva Styll | v3 | 2 |
| F51 | **No-show Prediction AI + deposito smart** | INNOVATION | Feature esclusiva Styll | v3 | 4 |
| F52 | **Prezzi dinamici peak/off-peak** | MONETIZATION | Trend mercato | v3 | 2.5 |
| F53 | **Setup AI (NLP per descrizione attività)** | GROWTH | Decisione progettuale #1 | v2 | 2 |
| F54 | **Foto prima/dopo nel profilo** | GROWTH | Decisione progettuale #7 | v2 | 1.5 |
| F55 | **Pagamento online integrato (Stripe)** | MONETIZATION | Baseline di mercato avanzato | v2 | 3 |
| F56 | **Report prodotti più venduti** | GROWTH | Sezione Prodotti v2 | v2 | 1 |
| F57 | **Multi-location (sedi multiple)** | MONETIZATION | Decisione progettuale #3 | v2 | 3 |
| F58 | **Notifiche push PWA** | CORE | Architettura tecnica | v1 | 1.5 |
| F59 | **Suggerisci servizio ("l'ultima volta ha fatto...")** | GROWTH | Decisione progettuale #7 | v1 | 1 |
| F60 | **Micro-progressi loyalty (Goal Gradient Effect)** | GROWTH | Gamification design | v1 | 0.5 |

**Totale feature inventariate: 60**
- v1 (MVP): 33 feature
- v2 (Growth): 18 feature
- v3 (AI/Pro): 9 feature

---

## 4. Prioritizzazione Multi-Framework

### 4.1 Framework RICE

**Formula:** RICE Score = (Reach × Impact × Confidence) / Effort

**Scala utilizzata:**
- **Reach:** utenti impattati per trimestre (scala 1-10 dove 10 = tutti gli utenti)
- **Impact:** contributo agli obiettivi (0.25 = minimo, 0.5 = basso, 1 = medio, 2 = alto, 3 = massimo)
- **Confidence:** certezza delle stime (100% = alta, 80% = media, 50% = bassa)
- **Effort:** settimane-persona di sviluppo

**Top 20 feature per RICE Score:**

| Rank | ID | Feature | R | I | C | E | RICE |
|------|----|---------|---|---|---|---|------|
| 1 | F10 | Booking in 3 tap | 10 | 3 | 100% | 2 | 15.0 |
| 2 | F07 | Dashboard calendario giornaliero | 10 | 3 | 100% | 3 | 10.0 |
| 3 | F09 | Landing page PWA tenant | 10 | 3 | 100% | 2 | 15.0 |
| 4 | F14 | Loyalty base a punti | 8 | 3 | 90% | 2 | 10.8 |
| 5 | F16 | Silent Churn Detector | 8 | 3 | 80% | 1.5 | 12.8 |
| 6 | F08 | Gestione appuntamenti | 10 | 2 | 100% | 2 | 10.0 |
| 7 | F11 | CRM clienti | 10 | 2 | 100% | 2 | 10.0 |
| 8 | F04 | Wizard setup 5 step | 10 | 2 | 90% | 2 | 9.0 |
| 9 | F03 | Branding dinamico | 10 | 2 | 100% | 2 | 10.0 |
| 10 | F17 | Promemoria anti no-show | 9 | 2 | 100% | 1 | 18.0 |
| 11 | F27 | Messaggistica SMS/WhatsApp | 8 | 2 | 80% | 2.5 | 5.1 |
| 12 | F05 | Template servizi precompilati | 10 | 1 | 100% | 1 | 10.0 |
| 13 | F21 | Gestione orari staff | 10 | 2 | 100% | 1.5 | 13.3 |
| 14 | F25 | Migrazione CSV | 5 | 3 | 80% | 2 | 6.0 |
| 15 | F34 | Loyalty gamificata | 6 | 3 | 70% | 4 | 3.2 |
| 16 | F35 | Win-back automatico | 6 | 3 | 70% | 3 | 4.2 |
| 17 | F58 | Notifiche push PWA | 8 | 2 | 90% | 1.5 | 9.6 |
| 18 | F18 | Richiesta recensioni | 7 | 1 | 90% | 1 | 6.3 |
| 19 | F12 | Profilo cliente 2 livelli | 10 | 1 | 100% | 1.5 | 6.7 |
| 20 | F59 | Suggerisci servizio | 8 | 1 | 80% | 1 | 6.4 |

### 4.2 Framework ICE

**Formula:** ICE Score = Impact × Confidence × Ease (scala 1-10 ciascuno)

| Rank | ID | Feature | I | C | E | ICE |
|------|----|---------|---|---|---|-----|
| 1 | F17 | Promemoria anti no-show | 9 | 10 | 9 | 810 |
| 2 | F10 | Booking in 3 tap | 10 | 10 | 7 | 700 |
| 3 | F16 | Silent Churn Detector | 10 | 8 | 8 | 640 |
| 4 | F14 | Loyalty base a punti | 9 | 9 | 7 | 567 |
| 5 | F09 | Landing page PWA | 9 | 10 | 7 | 630 |
| 6 | F04 | Wizard setup 5 step | 8 | 9 | 7 | 504 |
| 7 | F07 | Dashboard calendario | 10 | 10 | 5 | 500 |
| 8 | F59 | Suggerisci servizio | 6 | 8 | 9 | 432 |
| 9 | F60 | Micro-progressi loyalty | 5 | 8 | 10 | 400 |
| 10 | F18 | Richiesta recensioni | 6 | 9 | 9 | 486 |

### 4.3 Modello Kano

| ID | Feature | Categoria Kano | Motivazione |
|----|---------|---------------|-------------|
| F07 | Dashboard calendario | **Must-be (Basic)** | Senza calendario il prodotto non funziona |
| F08 | Gestione appuntamenti | **Must-be** | Funzionalità base attesa |
| F10 | Booking in 3 tap | **Must-be** | Il cliente finale si aspetta di prenotare |
| F11 | CRM clienti | **Must-be** | Ogni gestionale ha un CRM |
| F17 | Promemoria no-show | **Must-be** | Standard di mercato |
| F03 | Branding dinamico | **Performance** | Più è personalizzabile, più il barbiere è soddisfatto |
| F14 | Loyalty base a punti | **Performance** | Presente in alcuni competitor, gradita se ben fatta |
| F27 | Messaggistica | **Performance** | WhatsApp/SMS è un canale atteso ma non ovunque |
| F25 | Migrazione CSV | **Performance** | Riduce l'attrito, ma non tutti migrano da un competitor |
| F16 | Silent Churn Detector | **Attractive (Delight)** | Nessuno lo offre nel tier accessibile. WOW factor |
| F34 | Loyalty gamificata | **Attractive** | Blue ocean, nessun competitor, alto engagement |
| F35 | Win-back automatico | **Attractive** | Solo Phorest lo offre a €99+/mese |
| F36 | QR walk-in + coda | **Attractive** | Nessuno lo offre, risolve un problema reale |
| F38 | VIP Score | **Attractive** | Dato actionable unico |
| F46 | AI Business Coach | **Attractive** | Futuro, alto WOW, bassa aspettativa |
| F29 | GDPR consensi | **Must-be** | Requisito legale obbligatorio |

### 4.4 MoSCoW per MVP (v1)

| Priorità | Feature |
|----------|---------|
| **MUST HAVE** | F01 Multi-tenant + RLS, F02 Auth, F03 Branding, F04 Wizard setup, F05 Template servizi, F07 Dashboard calendario, F08 Gestione appuntamenti, F09 Landing page PWA, F10 Booking 3 tap, F11 CRM clienti, F12 Profilo 2 livelli, F14 Loyalty punti, F17 Promemoria no-show, F20 Subdomain, F21 Orari staff, F29 GDPR, F32 PWA installabile, F58 Push notifications |
| **SHOULD HAVE** | F13 Note private, F15 Catalogo reward, F16 Silent Churn Detector, F25 Migrazione CSV, F27 Messaggistica SMS/WhatsApp, F28 Log messaggi |
| **COULD HAVE** | F06 Import GBP, F18 Richiesta recensioni, F19 Template social, F22 Tracking pagamenti, F26 Punti iniziali storici, F59 Suggerisci servizio, F60 Micro-progressi |
| **WON'T HAVE (v1)** | F23 Prodotti, F24 Giacenza, F30 Multi-staff 4 ruoli (solo Titolare + Staff in v1), F31 Calendario affiancato, F33 Dashboard admin completa |

### 4.5 Classifica Finale Aggregata

Combinando i 4 framework con peso: RICE 30%, ICE 25%, Kano 25%, MoSCoW 20%.

| Rank | ID | Feature | RICE | ICE | Kano | MoSCoW | Score Aggregato |
|------|----|---------|------|-----|------|--------|----------------|
| 1 | F10 | **Booking in 3 tap** | 1° | 2° | Must-be | Must | ⭐⭐⭐⭐⭐ |
| 2 | F07 | **Dashboard calendario** | 2° | 7° | Must-be | Must | ⭐⭐⭐⭐⭐ |
| 3 | F17 | **Promemoria no-show** | 10° | 1° | Must-be | Must | ⭐⭐⭐⭐⭐ |
| 4 | F16 | **Silent Churn Detector** | 5° | 3° | Attractive | Should | ⭐⭐⭐⭐⭐ |
| 5 | F14 | **Loyalty base a punti** | 4° | 4° | Performance | Must | ⭐⭐⭐⭐⭐ |
| 6 | F09 | **Landing page PWA** | 3° | 5° | Must-be | Must | ⭐⭐⭐⭐⭐ |
| 7 | F04 | **Wizard setup 5 step** | 8° | 6° | Performance | Must | ⭐⭐⭐⭐ |
| 8 | F03 | **Branding dinamico** | 9° | — | Performance | Must | ⭐⭐⭐⭐ |
| 9 | F11 | **CRM clienti** | 7° | — | Must-be | Must | ⭐⭐⭐⭐ |
| 10 | F27 | **Messaggistica** | 11° | — | Performance | Should | ⭐⭐⭐⭐ |
| 11 | F34 | **Loyalty gamificata** | 15° | — | Attractive | Won't (v1) | ⭐⭐⭐⭐ |
| 12 | F35 | **Win-back automatico** | 16° | — | Attractive | Won't (v1) | ⭐⭐⭐⭐ |
| 13 | F25 | **Migrazione CSV** | 14° | — | Performance | Should | ⭐⭐⭐ |
| 14 | F59 | **Suggerisci servizio** | 20° | 8° | — | Could | ⭐⭐⭐ |
| 15 | F18 | **Richiesta recensioni** | 18° | 10° | — | Could | ⭐⭐⭐ |

---

## 5. Matrice Effort vs Impact

```
                        ALTO IMPATTO
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              │  🚀 QUICK   │  ⭐ BIG     │
              │    WINS     │    BETS     │
              │             │             │
              │ F17 NoShow  │ F07 Dashb.  │
              │ F16 Churn   │ F14 Loyalty │
              │ F59 Sugger. │ F10 Booking │
              │ F60 Micro   │ F27 Messag. │
              │ F13 Note    │ F25 Migraz. │
              │ F18 Review  │ F09 Landing │
              │ F05 Templ.  │ F04 Wizard  │
   BASSO ─────┼─────────────┼─────────────┼───── ALTO
   EFFORT     │             │             │   EFFORT
              │  😐 FILL    │  ⚠️ MONEY   │
              │    INS      │    PITS     │
              │             │             │
              │ F22 Track   │ F30 Multi-  │
              │   pay.      │   staff     │
              │ F26 Punti   │ F31 Cal.    │
              │   iniz.     │   affiancato│
              │ F06 Import  │ F23 Prodotti│
              │   GBP       │ F33 Admin   │
              │             │             │
              └─────────────┼─────────────┘
                            │
                       BASSO IMPATTO
```

**Lettura della matrice:**

- **🚀 Quick Wins (alto impatto, basso effort):** Priorità massima. Il Silent Churn Detector (F16) e il Promemoria no-show (F17) sono le feature con il miglior rapporto valore/costo. Implementabili in 1-1.5 settimane ciascuna, differenzianti, immediatamente percepite dal barbiere.
- **⭐ Big Bets (alto impatto, alto effort):** Il cuore del prodotto. Dashboard, Booking, Loyalty e Messaggistica richiedono investimento significativo ma sono imprescindibili.
- **😐 Fill Ins (basso impatto, basso effort):** Possono essere aggiunte se c'è tempo nel quarter, ma non bloccano il lancio.
- **⚠️ Money Pits (basso impatto, alto effort):** Multi-staff completo e prodotti/inventario hanno alto effort per un impatto limitato nel segmento target primario (barbiere singolo). Devono essere rinviati o semplificati.

---

## 6. Definizione MVP

### 6.1 Principi di Definizione

L'MVP deve rispondere a una domanda sola: **"Il barbiere singolo riesce a gestire appuntamenti, clienti e loyalty — e il suo cliente riesce a prenotare in 3 tap?"**

Se la risposta è sì, il prodotto ha valore. Tutto il resto è iterazione.

### 6.2 Feature Incluse nell'MVP

| ID | Feature | Motivazione inclusione |
|----|---------|----------------------|
| F01 | Multi-tenant + RLS | Fondazione tecnica. Senza questo, nulla funziona |
| F02 | Auth (staff + OTP clienti) | Il barbiere deve fare login, il cliente deve autenticarsi |
| F03 | Branding dinamico | Value proposition core: "la TUA app" |
| F04 | Wizard setup 5 step | Il setup è il momento più critico. Senza wizard, il barbiere abbandona |
| F05 | Template servizi | Riduce il tempo di setup da 15 a 5 minuti |
| F07 | Dashboard calendario | Il barbiere apre la dashboard ogni mattina. Deve vedere gli appuntamenti del giorno |
| F08 | Gestione appuntamenti | CRUD base: creare, confermare, completare, cancellare |
| F09 | Landing page PWA | Il punto di ingresso per il cliente finale |
| F10 | Booking in 3 tap | L'esperienza core del cliente. Se il booking è macchinoso, nessuno lo usa |
| F11 | CRM clienti | Il barbiere deve vedere chi sono i suoi clienti, la frequenza, i contatti |
| F12 | Profilo cliente 2 livelli | Il barbiere vede tutto, il cliente vede i suoi dati |
| F13 | Note private barbiere | "Vuole il 3 ai lati" — informazione operativa critica |
| F14 | Loyalty base a punti | Il differenziante rispetto a Barberly. Anche nella forma più semplice |
| F15 | Catalogo reward | Senza reward, i punti sono inutili |
| F16 | Silent Churn Detector | Il WOW factor del prodotto. "Marco non viene da 42 giorni." — nessun competitor lo fa |
| F17 | Promemoria no-show | Riduce i no-show del 29% (dato medio settore). ROI immediato |
| F20 | Subdomain tenant | nome.styll.app — il minimo per il white-label |
| F21 | Orari staff | Il barbiere deve impostare quando è disponibile |
| F29 | GDPR consensi | Requisito legale non negoziabile |
| F32 | PWA installabile | Il cliente deve poter "installare" l'app |
| F58 | Push notifications | Canale primario per reminder e conferme |
| F60 | Micro-progressi loyalty | "Metà strada! 💪" — zero costo, alto engagement |

**Totale: 22 feature — ~34 settimane-dev stimate**

### 6.3 Feature Escluse dall'MVP (con motivazione)

| ID | Feature | Motivazione esclusione |
|----|---------|----------------------|
| F06 | Import GBP | Nice-to-have: il wizard funziona anche senza |
| F18 | Richiesta recensioni | Il barbiere può farlo manualmente. Non blocca il lancio |
| F19 | Template social | Utile ma non critico. Il barbiere può condividere il link su Instagram |
| F22 | Tracking pagamenti | In v1 il pagamento è offline. Il tracking formale può aspettare |
| F23-24 | Prodotti + Giacenza | I prodotti sono il 15-25% del revenue del barbiere ma non il core della value proposition "retention-first" |
| F25 | Migrazione CSV | Importante per Sara, ma non per Marco (target primario del MVP) |
| F26 | Punti iniziali storici | Il primo barbiere di test non avrà clienti storici nel sistema |
| F27-28 | Messaggistica SMS/WA | Alto costo infrastrutturale. In v1 bastano le push notification. L'SMS/WhatsApp arriva nel primo update post-lancio |
| F30-31 | Multi-staff completo | Marco è solo. Sara viene dopo |
| F33 | Dashboard admin | In v1 l'admin gestisce i tenant da Supabase Studio |

### 6.4 Criteri di Successo dell'MVP

| Criterio | Target | Come si misura |
|----------|--------|---------------|
| Setup completion rate | > 70% | % barbieri che completano il wizard |
| Time to first appointment | < 48h | Tempo dal completamento setup alla prima prenotazione ricevuta |
| Booking completion rate | > 80% | % tentativi di prenotazione completati con successo |
| Weekly active barbieri | > 60% | % barbieri che aprono la dashboard almeno 3 volte/settimana |
| Client booking frequency | ≥ 1/mese per cliente | Numero medio prenotazioni per cliente per mese |
| NPS barbieri | > 40 | Net Promoter Score dopo 30 giorni di utilizzo |
| Churn detector engagement | > 50% | % barbieri che interagiscono con gli alert churn |

---

## 7. Roadmap Trimestrale (Q1–Q4)

### Q1 — "Le Fondamenta" (Mesi 1-3)

**Tema:** Costruire l'infrastruttura core e il flusso principale barbiere → cliente.

| Mese | Feature | Effort | Milestone |
|------|---------|--------|-----------|
| **Mese 1** | F01 Multi-tenant + RLS (3 sett.) | 3 sett. | Architettura funzionante con 2 tenant di test |
| | F02 Auth Supabase (2 sett.) | 2 sett. | Login staff + OTP clienti operativo |
| **Mese 2** | F07 Dashboard calendario (3 sett.) | 3 sett. | Barbiere vede appuntamenti del giorno |
| | F08 Gestione appuntamenti (2 sett.) | 2 sett. | CRUD appuntamenti completo |
| | F21 Orari staff (1.5 sett.) | 1.5 sett. | Orari settimanali configurabili |
| **Mese 3** | F03 Branding dinamico (2 sett.) | 2 sett. | CSS vars caricate da config tenant |
| | F09 Landing page PWA (2 sett.) | 2 sett. | Landing page renderizzata con brand tenant |
| | F10 Booking in 3 tap (2 sett.) | 2 sett. | Flusso prenotazione end-to-end funzionante |

**Effort totale Q1:** ~20.5 settimane-dev
**Dipendenze:** F01 → tutto. F02 → F07, F08, F09. F21 → F10.
**Metriche Q1:** Completamento infrastruttura 100%. Flusso booking end-to-end funzionante. 2 barbieri beta attivi.
**Rischio principale:** La complessità del multi-tenant + RLS potrebbe richiedere più di 3 settimane.

---

### Q2 — "Il Prodotto" (Mesi 4-6)

**Tema:** CRM, loyalty, onboarding — il barbiere inizia a lavorare con il prodotto ogni giorno.

| Mese | Feature | Effort | Milestone |
|------|---------|--------|-----------|
| **Mese 4** | F11 CRM clienti (2 sett.) | 2 sett. | Lista clienti con ricerca e filtri |
| | F12 Profilo 2 livelli (1.5 sett.) | 1.5 sett. | Barbiere vede tutto, cliente vede i suoi dati |
| | F13 Note private (0.5 sett.) | 0.5 sett. | Note GDPR-compliant |
| | F04 Wizard setup 5 step (2 sett.) | 2 sett. | Onboarding guidato funzionante |
| **Mese 5** | F14 Loyalty punti (2 sett.) | 2 sett. | Punti assegnati automaticamente alla conferma appuntamento |
| | F15 Catalogo reward (1 sett.) | 1 sett. | 4 reward default configurati |
| | F16 Silent Churn Detector (1.5 sett.) | 1.5 sett. | Semaforo churn nella lista clienti |
| | F05 Template servizi (1 sett.) | 1 sett. | Template barbiere precompilati |
| **Mese 6** | F17 Promemoria no-show (1 sett.) | 1 sett. | Push notification 24h prima |
| | F32 PWA installabile (1.5 sett.) | 1.5 sett. | Manifest + service worker + banner install |
| | F20 Subdomain (1 sett.) | 1 sett. | nome.styll.app funzionante |
| | F58 Push notifications (1.5 sett.) | 1.5 sett. | Notifiche push operative |
| | F29 GDPR (1 sett.) | 1 sett. | Consensi e opt-out |
| | F60 Micro-progressi (0.5 sett.) | 0.5 sett. | "Metà strada!" nella loyalty |

**Effort totale Q2:** ~19 settimane-dev
**Dipendenze:** F11 → F12, F13, F16. F14 → F15, F60. F32 → F58.
**Metriche Q2:** 5 barbieri beta attivi. Setup medio < 10 min. Almeno 20 clienti finali che prenotano. NPS barbieri > 30.
**Milestone chiave:** **Fine Q2 = MVP funzionante.** Beta chiusa con 5-10 barbieri reali.
**Rischio principale:** Il Silent Churn Detector richiede dati storici: i primi mesi di beta non ne avranno a sufficienza per validare il semaforo.

---

### Q3 — "La Crescita" (Mesi 7-9)

**Tema:** Messaggistica, migrazione, multi-staff leggero — il prodotto è pronto per barbieri reali oltre la beta.

| Mese | Feature | Effort | Milestone |
|------|---------|--------|-----------|
| **Mese 7** | F27 Messaggistica SMS/WA (2.5 sett.) | 2.5 sett. | Integrazione MessageBird/Infobip operativa |
| | F28 Log messaggi (1 sett.) | 1 sett. | Tracking invii e costi |
| | F18 Richiesta recensioni (1 sett.) | 1 sett. | Link Google Reviews automatico post-visita |
| **Mese 8** | F25 Migrazione CSV (2 sett.) | 2 sett. | Import guidato con mapping colonne |
| | F19 Template social (1.5 sett.) | 1.5 sett. | 5 template brandizzati scaricabili |
| | F59 Suggerisci servizio (1 sett.) | 1 sett. | "L'ultima volta ha fatto Taglio + Barba" |
| | F06 Import GBP (1.5 sett.) | 1.5 sett. | Auto-fill da Google Business Profile |
| **Mese 9** | F30 Multi-staff (3 sett.) — versione semplificata: solo Titolare + Staff | 2 sett. | Invito staff via email, 2 ruoli |
| | F22 Tracking pagamenti offline (0.5 sett.) | 0.5 sett. | Contanti / POS / altro |
| | F26 Punti iniziali storici (0.5 sett.) | 0.5 sett. | Import punti per clienti migrati |

**Effort totale Q3:** ~14 settimane-dev
**Dipendenze:** F27 → F17 (upgrade da push a multi-canale). F25 → F26.
**Metriche Q3:** 20+ barbieri attivi. Tasso migrazione (barbieri che importano CSV) > 30%. Open rate messaggi > 40%. Primi ricavi da subscription.
**Milestone chiave:** **Fine Q3 = Lancio pubblico Tier 1 (Starter).**
**Rischio principale:** L'integrazione con provider di messaggistica può richiedere tempo per l'approvazione dei template WhatsApp Business API.

---

### Q4 — "La Retention" (Mesi 10-12)

**Tema:** Gamification completa, win-back, analytics — il differenziante di Styll prende vita.

| Mese | Feature | Effort | Milestone |
|------|---------|--------|-----------|
| **Mese 10** | F34 Loyalty gamificata: streak + badge (2.5 sett.) | 2.5 sett. | Streak attive, 8 badge sbloccabili |
| | F34b Loyalty gamificata: tier (1.5 sett.) | 1.5 sett. | 4 livelli con benefici ON/OFF |
| **Mese 11** | F35 Campagne win-back (3 sett.) | 3 sett. | "Marco non viene da 45 giorni. Mando il messaggio?" |
| | F38 VIP Score (1.5 sett.) | 1.5 sett. | Punteggio composito calcolato automaticamente |
| **Mese 12** | F39 Analytics avanzata (3 sett.) | 3 sett. | Revenue, retention rate, trend settimanali |
| | F40 Sfide temporanee (2 sett.) | 2 sett. | "3 visite in 2 mesi = prodotto gratis" |
| | F36 QR walk-in + coda digitale (2.5 sett.) | 2.5 sett. | QR in vetrina → coda → SMS "tocca a te" |

**Effort totale Q4:** ~16 settimane-dev
**Dipendenze:** F34 → F14 (upgrade). F35 → F27, F16. F38 → F11, F14. F39 → tutte le feature transazionali.
**Metriche Q4:** Streak media clienti > 3. Win-back conversion rate > 15%. VIP Score attivato dal 50%+ dei barbieri. Retention rate clienti > 60%.
**Milestone chiave:** **Fine Q4 = Lancio Tier 2 (Growth).** La gamification è il differenziante percepito dal mercato.
**Rischio principale:** La gamification potrebbe non risuonare con tutti i barbieri. Necessario A/B test tra template loyalty.

---

### Riepilogo Timeline

```
Q1 (M1-3)           Q2 (M4-6)           Q3 (M7-9)           Q4 (M10-12)
┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│ FONDAMENTA │      │ IL PRODOTTO│      │ LA CRESCITA│      │LA RETENTION│
│            │      │            │      │            │      │            │
│ Multi-ten. │      │ CRM        │      │ SMS/WA     │      │ Gamificat. │
│ Auth       │  →   │ Loyalty    │  →   │ Migrazione │  →   │ Win-back   │
│ Dashboard  │      │ Churn Det. │      │ Multi-staff│      │ Analytics  │
│ Booking    │      │ Wizard     │      │ Template   │      │ QR walk-in │
│ Landing    │      │ PWA        │      │ Social     │      │ VIP Score  │
│            │      │            │      │            │      │            │
│ 20.5 sett. │      │ 19 sett.   │      │ 14 sett.   │      │ 16 sett.   │
│            │      │            │      │            │      │            │
│  Infra ✅  │      │  MVP ✅    │      │ Lancio T1  │      │ Lancio T2  │
└────────────┘      └────────────┘      └────────────┘      └────────────┘
```

---

## 8. User Story — Top 5 Feature

### 8.1 EPIC: Booking in 3 Tap (F10)

**Come** cliente del barbiere, **voglio** prenotare un appuntamento dal telefono in massimo 3 passaggi, **così che** non debba più mandare messaggi su WhatsApp e aspettare una risposta.

**Story 1 — Selezione servizio**
- Come cliente, voglio vedere la lista dei servizi disponibili con prezzo e durata, così che possa scegliere cosa fare.
- Criteri di accettazione: i servizi sono caricati dal catalogo del tenant; ogni servizio mostra nome, prezzo e durata; posso selezionare uno o più servizi; il totale si aggiorna in tempo reale; i servizi non attivi non sono visibili.

**Story 2 — Selezione data e ora**
- Come cliente, voglio vedere gli slot disponibili su un calendario, così che possa scegliere quando venire.
- Criteri di accettazione: mostro solo gli slot liberi in base agli orari dello staff; gli slot passati non sono selezionabili; la durata dello slot è calcolata dalla somma dei servizi selezionati; se multi-staff, posso scegliere "con chi" o "primo disponibile"; il fuso orario è gestito correttamente.

**Story 3 — Conferma prenotazione**
- Come cliente, voglio confermare la prenotazione con un singolo tap, così che il processo sia immediato.
- Criteri di accettazione: se ho un account OTP, i dati sono pre-compilati; se sono guest, inserisco solo nome e telefono; ricevo conferma visiva immediata sullo schermo; il barbiere riceve notifica nella dashboard; l'appuntamento compare nel calendario del barbiere.

**Story 4 — Conferma post-booking**
- Come cliente, voglio ricevere un riepilogo della prenotazione, così che possa ricordare data, ora e servizio.
- Criteri di accettazione: il riepilogo mostra data, ora, servizio, barbiere, indirizzo; posso aggiungere l'evento al calendario del telefono; posso cancellare la prenotazione da questa schermata (se il barbiere lo consente).

---

### 8.2 EPIC: Silent Churn Detector (F16)

**Come** barbiere, **voglio** essere avvisato quando un cliente abituale smette di venire, **così che** possa contattarlo prima di perderlo definitivamente.

**Story 1 — Calcolo frequenza media**
- Come sistema, devo calcolare la frequenza media di visita per ogni cliente, basandomi sullo storico appuntamenti completati.
- Criteri di accettazione: la frequenza media è calcolata come media dei giorni tra una visita e la successiva; servono almeno 2 visite per calcolare la frequenza; il calcolo si aggiorna ad ogni visita completata; il dato è visibile nel profilo CRM del cliente.

**Story 2 — Semaforo churn**
- Come barbiere, voglio vedere un indicatore visivo (🟢🟡🔴) accanto a ogni cliente nella lista CRM.
- Criteri di accettazione: 🟢 Verde = il cliente è nei tempi (giorni dall'ultima visita < frequenza media); 🟡 Giallo = il cliente è in ritardo (giorni > frequenza media × 1.2); 🔴 Rosso = il cliente è a rischio (giorni > frequenza media × 1.5); il semaforo è calcolato in tempo reale o con job schedulato ogni 24h.

**Story 3 — Alert in dashboard**
- Come barbiere, voglio vedere nella dashboard i clienti a rischio churn con un messaggio actionable.
- Criteri di accettazione: la dashboard mostra una sezione "Clienti a rischio" con nome, giorni dall'ultima visita, frequenza media; il messaggio è personalizzato ("Marco F. non viene da 42 giorni. Normalmente viene ogni 28"); un bottone "Contatta" apre il flusso di messaggistica o mostra il numero di telefono.

**Story 4 — Filtro CRM per rischio**
- Come barbiere, voglio filtrare la lista clienti per livello di rischio.
- Criteri di accettazione: filtro dropdown con opzioni Tutti, A rischio (🔴), In ritardo (🟡), In regola (🟢); il conteggio per categoria è visibile senza filtrare; il filtro si combina con la ricerca per nome.

---

### 8.3 EPIC: Loyalty Base a Punti (F14)

**Come** barbiere, **voglio** offrire un programma fedeltà a punti ai miei clienti, **così che** abbiano un incentivo a tornare da me invece che andare altrove.

**Story 1 — Configurazione loyalty**
- Come barbiere, voglio configurare il programma loyalty durante il setup o dalle impostazioni.
- Criteri di accettazione: scelgo il template loyalty (v1: solo Classico — punti fissi per visita); imposto il numero di punti per visita (default: 100); vedo un'anteprima di come funzionerà per il cliente; posso attivare/disattivare la loyalty in qualsiasi momento.

**Story 2 — Assegnazione automatica punti**
- Come sistema, devo assegnare i punti automaticamente quando il barbiere conferma un appuntamento.
- Criteri di accettazione: alla conferma dell'appuntamento, i punti sono aggiunti al saldo del cliente; una transaction viene creata nel log loyalty; il cliente con PWA riceve una notifica push ("Hai guadagnato 100 punti!"); il barbiere vede il saldo aggiornato nel profilo CRM.

**Story 3 — Assegnazione manuale punti**
- Come barbiere, voglio assegnare punti manualmente a un cliente dal CRM.
- Criteri di accettazione: nel profilo cliente c'è un bottone "Aggiungi punti"; posso specificare il numero di punti e una nota; la transaction è loggata come "manuale" con timestamp e staff che l'ha eseguita.

**Story 4 — Riscatto reward**
- Come cliente, voglio riscattare i miei punti per un premio.
- Criteri di accettazione: nella PWA vedo i reward disponibili con il costo in punti; posso selezionare un reward se ho abbastanza punti; mostrando la schermata al barbiere, lui conferma il riscatto dalla dashboard; i punti vengono sottratti e la transaction è loggata.

**Story 5 — Vista punti per il cliente**
- Come cliente, voglio vedere il mio saldo punti e la barra di progresso verso il prossimo premio.
- Criteri di accettazione: nella PWA c'è una sezione "La mia fedeltà" con saldo punti corrente; una barra di progresso visiva verso il prossimo reward; lo storico delle ultime transazioni (punti guadagnati/spesi).

---

### 8.4 EPIC: Wizard Setup 5 Step (F04)

**Come** barbiere, **voglio** configurare la mia app in meno di 8 minuti con una procedura guidata, **così che** non debba perdere ore a capire come funziona.

**Story 1 — Step 1: Informazioni base**
- Come barbiere, inserisco nome attività, telefono e città.
- Criteri di accettazione: campi obbligatori con validazione in tempo reale; autocomplete città da database IT; il subdomain viene suggerito automaticamente (es. "Marco's Barber" → marcos-barber.styll.app); posso modificare il subdomain suggerito.

**Story 2 — Step 2: Tipo attività + template servizi**
- Come barbiere, seleziono il tipo di attività e ottengo servizi precompilati.
- Criteri di accettazione: opzioni: Barbiere, Parrucchiere, Altro; selezionando "Barbiere" si precompilano 5-6 servizi con prezzi medi (Taglio €15, Barba €10, Taglio+Barba €20, Rasatura €12, Trattamento €25); posso modificare nomi e prezzi o aggiungere/rimuovere servizi; i servizi hanno già una durata default.

**Story 3 — Step 3: Orari di lavoro**
- Come barbiere, imposto i miei orari settimanali.
- Criteri di accettazione: template default "Lun-Sab 9:00-19:00, pausa 13:00-14:00"; posso modificare ogni giorno individualmente; posso avere slot multipli per giorno (mattina + pomeriggio); la domenica è chiusa di default ma attivabile.

**Story 4 — Step 4: Brand (logo + colori)**
- Come barbiere, personalizzo l'aspetto della mia app.
- Criteri di accettazione: upload logo (JPG/PNG, max 2MB); scelta colore primario con color picker; scelta colore secondario; se carico un logo, il sistema suggerisce una palette estratta dal logo; preview in tempo reale di come apparirà la landing page.

**Story 5 — Step 5: Preview e conferma**
- Come barbiere, voglio vedere un'anteprima della mia app prima di pubblicarla.
- Criteri di accettazione: preview mobile-responsive della landing page con il mio brand; bottone "Pubblica la tua app!"; dopo la pubblicazione, ricevo il link da condividere; posso tornare a qualsiasi step precedente per modificare.

---

### 8.5 EPIC: Dashboard Barbiere (F07)

**Come** barbiere, **voglio** aprire la dashboard ogni mattina e vedere in un colpo d'occhio la mia giornata, **così che** possa concentrarmi sul tagliare i capelli e non sulla gestione.

**Story 1 — Saluto e overview**
- Come barbiere, appena apro la dashboard vedo un saluto e i KPI del giorno.
- Criteri di accettazione: "Buongiorno Marco 👋" con data corrente; KPI giornalieri: numero appuntamenti oggi, primo appuntamento (ora), revenue stimata del giorno; KPI settimanali: clienti serviti, revenue, retention %; il saluto cambia in base all'ora (Buongiorno/Buon pomeriggio/Buonasera).

**Story 2 — Lista appuntamenti del giorno**
- Come barbiere, voglio vedere tutti gli appuntamenti di oggi in ordine cronologico.
- Criteri di accettazione: lista scrollabile con ora, nome cliente, servizio, durata stimata; stato dell'appuntamento (confermato, in attesa, completato, cancellato); tap su un appuntamento apre il dettaglio con profilo cliente e note; i buchi nel calendario sono visibili ("14:00-15:00 libero").

**Story 3 — Alert clienti a rischio**
- Come barbiere, voglio vedere nella dashboard i clienti che sto perdendo.
- Criteri di accettazione: sezione "Clienti a rischio" sotto gli appuntamenti; max 5 clienti mostrati con nome, giorni dall'ultima visita, semaforo; bottone "Contatta" per ogni cliente; la sezione si nasconde se non ci sono clienti a rischio.

**Story 4 — Mobile-responsive**
- Come barbiere, devo poter usare la dashboard dal mio smartphone.
- Criteri di accettazione: layout responsive che funziona su schermi 375px+; touch-friendly: bottoni minimi 44×44px; la navigazione è un bottom tab bar su mobile; le informazioni critiche sono visibili senza scroll su mobile.

---

## 9. Feature Gating per Piano di Pricing

### Matrice Feature × Piano

| Feature | Tier 1 Starter (€19-29) | Tier 2 Growth (€49-69) | Tier 3 Pro (€99-149) |
|---------|------------------------|------------------------|---------------------|
| **BOOKING & CALENDARIO** | | | |
| Prenotazioni online | ✅ | ✅ | ✅ |
| Gestione appuntamenti | ✅ | ✅ | ✅ |
| Calendario singolo staff | ✅ | ✅ | ✅ |
| Calendario multi-staff affiancato | ❌ | ✅ (fino a 5) | ✅ (illimitato) |
| QR walk-in + coda digitale | ❌ | ✅ | ✅ |
| Prenotazione da WhatsApp | ❌ | ❌ | ✅ |
| **CRM & CLIENTI** | | | |
| CRM clienti centralizzato | ✅ | ✅ | ✅ |
| Profilo cliente 2 livelli | ✅ | ✅ | ✅ |
| Note private barbiere | ✅ | ✅ | ✅ |
| Suggerisci servizio | ✅ | ✅ | ✅ |
| Foto prima/dopo | ❌ | ✅ | ✅ |
| VIP Score composito | ❌ | ✅ | ✅ |
| **LOYALTY & GAMIFICATION** | | | |
| Loyalty punti (Template Classico) | ✅ | ✅ | ✅ |
| Catalogo reward (4+2) | ✅ | ✅ | ✅ |
| Micro-progressi | ✅ | ✅ | ✅ |
| Streak + Badge | ❌ | ✅ | ✅ |
| Tier/Livelli (Bronze→Platinum) | ❌ | ✅ | ✅ |
| Sfide temporanee | ❌ | ✅ | ✅ |
| Smart Reward AI | ❌ | ❌ | ✅ |
| **RETENTION & CHURN** | | | |
| Silent Churn Detector | ✅ (notifica) | ✅ (notifica + azione) | ✅ (notifica + azione + AI) |
| Promemoria no-show | ✅ (push) | ✅ (push + SMS/WA) | ✅ (+ AI prediction) |
| Win-back automatico | ❌ | ✅ | ✅ |
| No-show Prediction AI | ❌ | ❌ | ✅ |
| **MESSAGGISTICA** | | | |
| Push notification | ✅ | ✅ | ✅ |
| SMS/WhatsApp | ❌ | ✅ (500 msg/mese) | ✅ (illimitati) |
| Cascata intelligente | ❌ | ✅ | ✅ |
| **BRANDING & PWA** | | | |
| Landing page brandizzata | ✅ | ✅ | ✅ |
| PWA installabile | ✅ | ✅ | ✅ |
| Subdomain (nome.styll.app) | ✅ | ✅ | ✅ |
| Custom domain | ❌ | ✅ | ✅ |
| **STAFF & SEDI** | | | |
| 1 utente | ✅ | ✅ | ✅ |
| Multi-staff (fino a 5) | ❌ | ✅ | ✅ |
| Staff illimitato | ❌ | ❌ | ✅ |
| Multi-location | ❌ | ❌ | ✅ |
| **PRODOTTI** | | | |
| Catalogo prodotti | ✅ | ✅ | ✅ |
| Vendita in appuntamento | ✅ | ✅ | ✅ |
| Giacenza + alert | ✅ | ✅ | ✅ |
| Report vendite prodotti | ❌ | ✅ | ✅ |
| **ANALYTICS** | | | |
| KPI base (revenue, clienti) | ✅ | ✅ | ✅ |
| Analytics avanzata | ❌ | ✅ | ✅ |
| Previsione ricavi AI | ❌ | ❌ | ✅ |
| AI Business Coach | ❌ | ❌ | ✅ |
| **MARKETING** | | | |
| Template social (5 base) | ✅ | ✅ | ✅ |
| Editor template (Canva) | ❌ | ✅ | ✅ |
| After-Visit Story Instagram | ❌ | ❌ | ✅ |
| Last-minute Slot Filler | ❌ | ❌ | ✅ |
| **ALTRO** | | | |
| Migrazione CSV | ✅ | ✅ | ✅ |
| Migrazione concierge gratuita | ✅ | ✅ | ✅ |
| Export dati gratis | ✅ | ✅ | ✅ |
| Richiesta recensioni | ✅ | ✅ | ✅ |
| GDPR compliance | ✅ | ✅ | ✅ |

### Principi di Gating

1. **Tier 1 deve funzionare.** Marco con 1 sedia deve poter gestire il suo negozio completamente. Il Tier 1 non è crippled.
2. **Tier 2 si giustifica con la retention.** Gamification, win-back, analytics: feature che il barbiere desidera dopo aver visto il valore del Tier 1.
3. **Tier 3 si giustifica con l'AI e la scala.** Multi-location, staff illimitato, AI: per chi il business è cresciuto grazie a Styll.
4. **Zero feature-shock.** Il barbiere in Tier 1 non vede le feature del Tier 2 disattivate con lucchetto. Le vede solo quando è pronto (progressive disclosure).

---

## 10. Metriche di Successo per Feature

| ID | Feature | Metrica Primaria | Target | Metrica Secondaria |
|----|---------|-----------------|--------|-------------------|
| F04 | Wizard setup | Setup completion rate | > 70% | Time-to-complete < 8 min |
| F07 | Dashboard | DAU barbieri (daily active) | > 60% degli utenti | Tempo medio sessione > 3 min |
| F10 | Booking 3 tap | Booking completion rate | > 80% | Tempo medio prenotazione < 90 sec |
| F14 | Loyalty punti | % barbieri che attivano loyalty | > 60% | Punti assegnati/mese per barbiere > 500 |
| F16 | Silent Churn Detector | % barbieri che interagiscono con alert | > 50% | Tasso contatto clienti a rischio > 30% |
| F17 | Promemoria no-show | Riduzione no-show rate | -25% vs baseline | Tasso apertura notifica > 70% |
| F25 | Migrazione CSV | % barbieri che importano dati | > 30% | Errori di mapping < 5% |
| F27 | Messaggistica | Open rate messaggi | > 40% | Costo per barbiere < €8/mese |
| F34 | Gamification | Streak media clienti | > 3 consecutive | Badge sbloccati/cliente > 2 in 6 mesi |
| F35 | Win-back | Conversion rate win-back | > 15% | Tempo medio rientro cliente < 14 giorni |
| F38 | VIP Score | % barbieri che consultano VIP Score | > 40% | Correlazione VIP Score ↔ retention > 0.6 |
| F39 | Analytics | % barbieri che aprono analytics | > 50% | Tempo in analytics > 2 min/sessione |
| F36 | QR walk-in | Walk-in gestiti via QR/mese | > 10 per barbiere | Tempo attesa percepita < 15 min |
| F46 | AI Business Coach | % suggerimenti accettati | > 25% | Revenue uplift attribuibile > 5% |
| F48 | Slot Filler | Slot vuoti riempiti | > 20% degli slot notificati | Revenue addizionale per slot > €15 |

---

## 11. Mappa Dipendenze e Rischi

### 11.1 Dipendenze Critiche

```
F01 Multi-tenant ──→ TUTTO (fondazione)
       │
       ├──→ F02 Auth ──→ F07 Dashboard ──→ F08 Appuntamenti
       │                                        │
       │                                        ├──→ F14 Loyalty ──→ F34 Gamification
       │                                        │         │
       │                                        │         └──→ F15 Reward
       │                                        │
       │                                        └──→ F16 Churn Detector ──→ F35 Win-back
       │
       ├──→ F03 Branding ──→ F09 Landing ──→ F10 Booking
       │                        │
       │                        └──→ F32 PWA ──→ F58 Push ──→ F17 Reminder
       │
       ├──→ F11 CRM ──→ F12 Profilo ──→ F13 Note
       │       │
       │       └──→ F38 VIP Score ──→ F39 Analytics
       │
       └──→ F20 Subdomain ──→ F41 Custom domain
```

### 11.2 Registro Rischi

| ID | Rischio | Probabilità | Impatto | Mitigazione |
|----|---------|-------------|---------|-------------|
| R1 | **PWA install rate bassa** | Alta | Alto | Istruire il barbiere a guidare il cliente. Banner chiaro. Fallback: il booking funziona anche senza installare la PWA |
| R2 | **WhatsApp Business API approval lenta** | Media | Alto | Iniziare la richiesta in Q1, 3 mesi prima del bisogno. Piano B: solo SMS in Q3 |
| R3 | **Multi-tenant RLS complexity** | Media | Alto | Dedicare sprint 0 alla validazione dell'architettura RLS con test automatizzati |
| R4 | **Adoption gamification bassa tra barbieri** | Media | Medio | A/B test tra template loyalty. Il Template Classico (v1) è il fallback semplice |
| R5 | **Costi messaggistica erodono margini** | Bassa | Medio | 200 msg inclusi con soglia. Pay-per-use oltre la soglia. Monitoraggio costi reali vs previsionali |
| R6 | **Scope creep sulla tesi** | Alta | Alto | Separare chiaramente "progettato" (tesi) da "implementato" (prototipo). La tesi può coprire la progettazione completa, il codice copre il MVP |
| R7 | **Competitor copia le feature** | Bassa | Basso | La gamification è un sistema, non una singola feature. Difficile da copiare senza riprogettare il prodotto |
| R8 | **Mancanza di dati storici per Churn Detector** | Alta | Medio | In v1 il Churn Detector richiede almeno 2-3 mesi di dati. Comunicare chiaramente che il valore cresce nel tempo |
| R9 | **Complessità GDPR** | Media | Alto | Consulto legale pre-lancio. Consensi implementati come requisito infrastrutturale in Q2 |
| R10 | **Pricing troppo basso per sostenibilità** | Bassa | Alto | Monitorare unit economics dal Q3. Margine target > 70% sul Tier 1 |

---

## 12. Case Study — Decisioni di Prodotto SaaS

### Case Study 1: Duolingo — La streak come motore di retention (decisione vincente)

**Contesto:** Duolingo è un'app di apprendimento linguistico con oltre 500 milioni di utenti registrati. La sfida principale non è l'acquisizione utenti (l'app è gratuita) ma la retention: convincere le persone a tornare ogni giorno.

**Decisione:** Il team prodotto ha scelto di investire massicciamente sulla meccanica della "streak" — il conteggio delle sessioni consecutive giornaliere. Inizialmente era una feature secondaria; il CPO Jorge Mazal ha identificato il Current Retention Rate come la metrica a più alto leverage e ha creato un team dedicato a ottimizzarla. La streak è stata poi arricchita con notifiche "streak saver" a fine giornata, animazioni, "streak freeze" (per non perdere la striscia in caso di giorno saltato), e condivisione social.

**Risultato:** La percentuale di utenti con una streak di 7+ giorni è passata dal 20% al 60% delle DAU. Le notifiche streak-saver hanno generato miglioramenti significativi nell'engagement quotidiano. Duolingo adotta un modello di sperimentazione continua con centinaia di test A/B in parallelo, con l'obiettivo dichiarato di migliorare l'app dell'1% ogni settimana.

**Lezione per Styll:** La streak è una meccanica ad altissimo leverage. Nel contesto barbiere la frequenza non è giornaliera ma mensile: la "streak" di Styll è "visite consecutive entro 45 giorni". La meccanica è la stessa, la scala temporale è diversa. Il punto chiave: non basta aggiungere una streak — serve investire in micro-interazioni (notifiche, celebrazioni, condivisione) che la rendono emotivamente significativa.

---

### Case Study 2: Calendly — Il freemium come growth engine (decisione vincente)

**Contesto:** Calendly è un tool di scheduling che compete con decine di alternative. Fondata nel 2013, ha raggiunto oltre 10 milioni di utenti grazie a una strategia di pricing articolata su un free tier robusto e tier a pagamento che salgono progressivamente.

**Decisione:** Il free tier di Calendly offre funzionalità genuine, non una versione crippled. Questo ha creato un circolo virtuoso: ogni link di scheduling condiviso da un utente free è marketing gratuito per Calendly. I tier a pagamento sono progettati per monetizzare i bisogni che emergono naturalmente con la crescita dell'uso (team scheduling, integrazioni, analytics). La scelta di offrire circa il 20% di sconto sugli abbonamenti annuali ha portato il 60% dei sottoscrittori a pagare annualmente, stabilizzando il cash flow.

**Risultato:** L'approccio product-led growth con free tier sostanzioso ha permesso a Calendly di crescere con costi di acquisizione bassissimi. Ogni utente free è un potenziale evangelist.

**Lezione per Styll:** Il Tier 1 di Styll deve essere "enough" — non crippled. Marco in Tier 1 deve poter gestire il negozio completamente, e il suo link di prenotazione condiviso su Instagram è marketing gratuito per Styll. L'upgrade al Tier 2 avviene quando Marco vede il valore della gamification e del win-back, non perché il Tier 1 è artificialmente limitato. La struttura a sconto annuale (~20%) è da replicare.

---

### Case Study 3: Phorest — Lock-in come anti-pattern (decisione perdente)

**Contesto:** Phorest è il leader di mercato nella retention per saloni medio-grandi, con funzionalità come TreatCard (loyalty), ReConnect (win-back) e Reputation Manager. Il prodotto è oggettivamente il migliore nel suo segmento per chi può permetterselo.

**Decisione:** Phorest ha adottato un modello con contratti annuali vincolanti, costi di migrazione dati elevati (295 dollari per l'export) e pricing opaco. Questa strategia massimizza la customer lifetime value ma genera frustrazione documentata su forum come Reddit, Trustpilot e Capterra. I barbieri si sentono "ostaggio" e le recensioni negative si concentrano sul lock-in, non sulla qualità del prodotto.

**Risultato:** Phorest mantiene clienti attraverso il friction, non il valore. L'NPS è compromesso da pratiche di pricing percepite come aggressive. Il segmento dei micro-professionisti rimane completamente scoperto perché il prezzo e la complessità sono barriere insormontabili.

**Lezione per Styll:** L'anti-modello Phorest è il manifesto di Styll. "I tuoi dati sono tuoi, export gratis, sempre" non è solo un selling point — è un posizionamento etico che genera trust. Il pricing deve essere radicalmente trasparente: un prezzo, niente sorprese, niente contratti vincolanti. La retention del cliente SaaS deve derivare dal valore percepito, mai dalla frizione in uscita. Questo posizionamento è un vantaggio competitivo diretto: ogni barbiere frustrato da Phorest, Fresha o Booksy è un potenziale cliente Styll.

---

## 13. Riscontri e Osservazioni

### 13.1 Quick Wins — Massimo impatto, minimo sforzo

1. **Silent Churn Detector (F16) — 1.5 settimane.** La feature con il miglior rapporto valore/costo dell'intero inventario. È un semaforo calcolato con una query SQL. Zero integrazione esterna, zero costo operativo. L'impatto emotivo sul barbiere è enorme: "il sistema mi dice chi sto perdendo, prima che sia troppo tardi." Nessun competitor nel tier accessibile lo offre.

2. **Micro-progressi loyalty (F60) — 0.5 settimane.** Il Goal Gradient Effect è uno dei principi più validati della psicologia comportamentale: le persone accelerano quando si avvicinano all'obiettivo. "Ancora 50 punti per il prossimo premio! 💪" costa mezza settimana di sviluppo, zero costo operativo, e aumenta l'engagement della loyalty in modo misurabile. Da Starbucks a Nike Run Club, ogni programma fedeltà di successo usa questo principio.

3. **Suggerisci servizio (F59) — 1 settimana.** "L'ultima volta Luca ha fatto Taglio + Barba (28 giorni fa). Suggerire lo stesso?" Un tap per pre-compilare il prossimo appuntamento. Sembra una feature minore, ma riduce la frizione operativa quotidiana del barbiere e comunica "il sistema ti conosce". Costa 1 settimana.

### 13.2 Feature Critiche — Senza queste il prodotto non funziona

1. **Wizard setup < 8 minuti (F04).** L'onboarding è il momento make-or-break. Dalla journey di Marco: "Abbandonerebbe se il processo dura più di 10 minuti." Se il wizard non funziona, nulla di ciò che viene dopo ha importanza. Ogni minuto in più nel setup è un barbiere perso per sempre.

2. **Booking in 3 tap (F10).** Se il cliente finale non riesce a prenotare velocemente, il barbiere non vede valore nel sistema. Dalla journey di Luca: "Se non posso prenotare in 30 secondi dal telefono, non prenoto." Il booking è il primo e unico test che ogni barbiere fa per giudicare il prodotto.

3. **Branding dinamico (F03).** La promessa "la TUA app" è il posizionamento stesso del prodotto. Se la landing page mostra "Powered by Styll" in modo prominente o ha un aspetto generico, il barbiere non si riconosce e non condivide il link con i clienti. Il branding deve essere impeccabile dal giorno 1.

### 13.3 Le 3 Feature che Faranno la Differenza

1. **Loyalty gamificata con streak, badge e livelli (F34).** Questa è il blue ocean. Nessun competitor, in nessun tier di prezzo, offre gamification nel settore barber/beauty. I dati sono chiari: Duolingo ha dimostrato che le streak portano la percentuale di utenti attivi con 7+ giorni consecutivi dal 20% al 60%. Gallup riporta un aumento del 48% nell'engagement con meccaniche di gamification. Il mercato della gamification è previsto a 49 miliardi di dollari entro il 2029. Styll è il primo a portare questo nel mondo barbiere — non come feature secondaria, ma come core product differentiator.

2. **Silent Churn Detector + Win-back automatico (F16 + F35).** La combinazione di queste due feature crea il "sistema di retention" che nessun competitor accessibile offre. F16 identifica chi sta per andarsene. F35 offre un tap per ricontattarlo. "Marco non viene da 45 giorni. Normalmente viene ogni 30. Vuoi che gli mandi un messaggio?" La potenza di questa combinazione è nella sua semplicità: il barbiere non deve essere un data analyst per capire chi sta perdendo.

3. **AI Business Coach (F46).** Proiettata nel v3, è la feature che trasforma Styll da "gestionale con retention" a "business partner intelligente". "Hai 3 buchi mercoledì. 3 clienti non vengono da 35+ giorni. Mando il messaggio?" Il barbiere non analizza dati: il sistema gli dice cosa fare e lui conferma con un tap. È il futuro del prodotto e il differenziante definitivo rispetto a qualsiasi competitor, in qualsiasi tier.

---

## 14. Bibliografia e Fonti per la Tesi

### Fonti Accademiche e di Ricerca

1. Hamari, J., Koivisto, J., & Sarsa, H. (2014). "Does Gamification Work? A Literature Review of Empirical Studies on Gamification." *Proceedings of the 47th Hawaii International Conference on System Sciences (HICSS)*. IEEE. DOI: 10.1109/HICSS.2014.377

2. Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). "From Game Design Elements to Gamefulness: Defining Gamification." *Proceedings of the 15th International Academic MindTrek Conference*. ACM. DOI: 10.1145/2181037.2181040

3. Kivetz, R., Urminsky, O., & Zheng, Y. (2006). "The Goal-Gradient Hypothesis Resurrected: Purchase Acceleration, Illusionary Goal Progress, and Customer Retention." *Journal of Marketing Research*, 43(1), 39-58. (Fondamento scientifico per i micro-progressi loyalty)

4. Gallup (2023). "State of the Global Workplace Report." — Dato citato: +48% engagement con meccaniche di gamification. URL: https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx

5. Norman, D. A. (2013). *The Design of Everyday Things: Revised and Expanded Edition*. Basic Books. (Principi di usabilità applicati al design della dashboard)

6. Krug, S. (2014). *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability*. New Riders. (Fondamento per il principio "booking in 3 tap")

### Fonti di Mercato e Industry Report

7. IBISWorld (2024). "Barber Shops in the US - Market Size." — Dato citato: mercato barbershop US $5.8 miliardi. URL: https://www.ibisworld.com/industry-statistics/market-size/barber-shops-united-states/

8. MarketResearchIntellect (2023). "Barber Shop Software Market Size & Growth." — Dato citato: mercato software barber ~$1.8 miliardi, +10% CAGR. URL: https://www.marketresearchintellect.com/product/barber-shop-software-market/

9. Mordor Intelligence (2024). "Gamification Market - Growth, Trends, and Forecast." — Dato citato: mercato gamification $49B entro 2029. URL: https://www.mordorintelligence.com/industry-reports/gamification-market

10. Zenoti (2023). "Beauty & Wellness Consumer Trends Report." — Dato citato: 64% clienti preferiscono offerte AI-driven. URL: https://www.zenoti.com/resources/reports

### Fonti Competitor e Benchmark

11. Fresha. Sito ufficiale e pagina pricing. URL: https://www.fresha.com/for-business/pricing

12. Booksy. Sito ufficiale. URL: https://booksy.com/biz

13. Barberly. Sito ufficiale. URL: https://www.barberly.com

14. GlossGenius. Sito ufficiale e blog. URL: https://www.glossgenius.com

15. Phorest. Sito ufficiale e documentazione TreatCard/ReConnect. URL: https://www.phorest.com

16. Squire. Sito ufficiale. URL: https://getsquire.com

17. Mangomint. Sito ufficiale e documentazione UX. URL: https://www.mangomint.com

18. theCut. Sito ufficiale. URL: https://thecut.co

### Fonti Tecnologiche

19. Supabase. Documentazione ufficiale: Row Level Security, Auth, Realtime. URL: https://supabase.com/docs

20. Google. "Progressive Web Apps" — Documentazione tecnica PWA. URL: https://web.dev/progressive-web-apps/

21. Meta. "WhatsApp Business API Pricing." URL: https://developers.facebook.com/docs/whatsapp/pricing/

22. MessageBird. Documentazione API e pricing SMS Italia. URL: https://messagebird.com/pricing/

### Fonti su Product Management e SaaS Strategy

23. Cagan, M. (2018). *Inspired: How to Create Tech Products Customers Love*. Wiley. (Framework per product discovery e prioritizzazione)

24. Olsen, D. (2015). *The Lean Product Playbook*. Wiley. (Metodologia per definizione MVP)

25. Intercom. "RICE: Simple prioritization for product managers." URL: https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/

26. Ellis, S. & Brown, M. (2017). *Hacking Growth*. Crown Business. (Framework ICE e product-led growth)

27. Atlassian. "Prioritization Frameworks." URL: https://www.atlassian.com/agile/product-management/prioritization-framework

### Case Study Citati

28. Duolingo. Case Study PLG e gamification. Fonti multiple: NoGood (2025), "Duolingo PLG Case Study: Gamified Language-Learning." URL: https://nogood.io/blog/duolingo-case-study/

29. Calendly. Case Study pricing e freemium. Monetizely (2025), "Calendly's SaaS Pricing Strategy." URL: https://www.getmonetizely.com/articles/calendlys-saas-pricing-strategy

30. Starbucks. "Starbucks Rewards Program" — 28M membri attivi, +26% revenue. Investor Relations. URL: https://investor.starbucks.com

### Fonti Recensioni Utenti (Forum e Piattaforme)

31. Reddit. Subreddit r/barbers, r/hairstylist, r/smallbusiness — Thread su Fresha, Booksy, software per barbieri.

32. Trustpilot. Pagine recensioni di Fresha, Booksy, Phorest, GlossGenius.

33. Capterra. Comparazione software per saloni e barbieri. URL: https://www.capterra.com/salon-software/

34. Better Business Bureau (BBB). Reclami su theCut e Squire.

---

> **Nota finale:** Questo documento è un artefatto vivente. Ogni decisione di prioritizzazione deve essere rivalidata con dati reali dopo il primo contatto con barbieri reali. Le stime di effort sono indicative e basate su un team di 1-2 sviluppatori full-stack. I framework di prioritizzazione sono strumenti di supporto decisionale, non decisioni finali — il contesto strategico e il feedback utente prevalgono sempre sui punteggi numerici.