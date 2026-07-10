> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `legal-compliance.md`

---

# Legal & Compliance — Styll

> **⚠️ DISCLAIMER**
> Questo documento è redatto a **scopo informativo e accademico** nell'ambito di un progetto di tesi.
> **Non sostituisce in alcun modo la consulenza legale professionale** di un avvocato o di un consulente specializzato in diritto digitale, privacy e proprietà intellettuale.
> Le informazioni qui contenute si basano sulla normativa vigente al momento della stesura e potrebbero non riflettere eventuali aggiornamenti successivi.
> Si consiglia di rivolgersi a un professionista qualificato prima di prendere decisioni legali o operative.

---

## Indice

1. [Introduzione e disclaimer](#1-introduzione-e-disclaimer)
2. [Panoramica normativa](#2-panoramica-normativa)
3. [GDPR](#3-gdpr)
4. [Privacy Policy](#4-privacy-policy)
5. [Terms of Service](#5-terms-of-service)
6. [Cookie Policy e consent](#6-cookie-policy-e-consent)
7. [Pagamenti e PCI DSS](#7-pagamenti-e-pci-dss)
8. [Proprietà intellettuale](#8-proprietà-intellettuale)
9. [Contratti e SLA](#9-contratti-e-sla)
10. [Normative specifiche di settore](#10-normative-specifiche-di-settore)
11. [Checklist compliance pre-launch](#11-checklist-compliance-pre-launch)
12. [Tool per la compliance](#12-tool-per-la-compliance)
13. [Case study](#13-case-study)
14. [Riscontri e osservazioni per il progetto Styll](#14-riscontri-e-osservazioni-per-il-progetto-styll)
15. [Bibliografia e Fonti per la Tesi](#15-bibliografia-e-fonti-per-la-tesi)

---

## 1. Introduzione e disclaimer

**Styll** è una piattaforma **SaaS verticale per barbieri** con architettura **multi-tenant**, modello **B2B2C** (il professionista è il cliente B2B, il cliente finale del barbiere è l'utente B2C), focalizzata sulla **retention** e sulla **gamification della loyalty**.

### Caratteristiche rilevanti per la compliance

| Aspetto | Dettaglio |
|---------|-----------|
| **Tipo di dati trattati** | Dati personali (nome, telefono, email), dati di prenotazione, dati di pagamento, dati di loyalty/gamification, note CRM, storico visite, preferenze cliente, dati di geolocalizzazione (slot filler), punteggi comportamentali (VIP Score, churn detection) |
| **Mercato di riferimento** | Italia (primario), UE (scalabilità futura) |
| **Modello di business** | B2B2C — SaaS venduto ai barbieri (B2B) che lo usano con i propri clienti finali (B2C) |
| **Stack tecnologico** | Next.js 14+ con App Router, TypeScript (frontend), Supabase (backend/database/auth), PWA |
| **Integrazioni** | Google Business Profile (OAuth 2.0), Instagram, WhatsApp, SMS, Apple Pay, pagamenti online |
| **Pagamenti** | Abbonamento SaaS + % sulle transazioni (2,5–2,9%), hardware (card reader) |
| **White-label** | Ogni barbiere ha la propria app brandizzata (subdomain, colori, logo) |
| **Profilazione** | Silent Churn Detector, VIP Score, No-show Prediction AI, reward personalizzati |

> **⚠️ DISCLAIMER**: Questo documento è redatto a scopo informativo e accademico. Non sostituisce la consulenza legale professionale.

---

## 2. Panoramica normativa

### Normative applicabili a Styll

| Normativa | Ambito | Applicabilità a Styll |
|-----------|--------|----------------------|
| **GDPR** (Reg. UE 2016/679) | Protezione dati personali nell'UE | ✅ Obbligatorio — trattamento dati personali di interessati nell'UE |
| **Codice Privacy italiano** (D.Lgs. 196/2003, modificato dal D.Lgs. 101/2018) | Adeguamento nazionale del GDPR | ✅ Obbligatorio — operatività in Italia |
| **Direttiva ePrivacy** (2002/58/CE) | Cookie, comunicazioni elettroniche | ✅ Obbligatorio — uso di cookie, SMS, notifiche push |
| **Linee guida cookie Garante Privacy** (Provvedimento 10 giugno 2021, n. 231) | Cookie e tracciamento in Italia | ✅ Obbligatorio — piattaforma web con cookie |
| **Codice del Consumo** (D.Lgs. 206/2005) | Tutela consumatori | ✅ Obbligatorio — interfaccia B2C (clienti finali del barbiere) |
| **PCI DSS v4.0** | Sicurezza dati di pagamento | ✅ Obbligatorio — gestione pagamenti online |
| **PSD2** (Direttiva UE 2015/2366) | Servizi di pagamento, SCA | ✅ Obbligatorio — pagamenti online nell'UE |
| **Codice della Proprietà Industriale** (D.Lgs. 30/2005) | Marchi, brevetti, IP | ✅ Rilevante — protezione marchio Styll |
| **Legge sul diritto d'autore** (L. 633/1941) | Copyright software | ✅ Rilevante — protezione codice sorgente |
| **Digital Services Act** (Reg. UE 2022/2065) | Servizi digitali, responsabilità piattaforme | ⚠️ Potenzialmente applicabile — se Styll ospita contenuti generati dagli utenti |
| **AI Act** (Reg. UE 2024/1689) | Regolamentazione intelligenza artificiale | ⚠️ Rilevante per v3 — AI Business Coach, No-show Prediction AI |
| **Normativa fiscale** (fatturazione elettronica, IVA) | Obblighi fiscali italiani | ✅ Obbligatorio — fatturazione SaaS |

### Doppio ruolo di Styll nel trattamento dati

Styll opera con un **doppio ruolo** nel trattamento dei dati personali:

```
┌────────────────────────────────────────────────────────┐
│              ARCHITETTURA DATI STYLL                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Styll = TITOLARE (Controller)                         │
│  → Per i dati dei barbieri (clienti B2B diretti)       │
│  → Per i dati propri della piattaforma                 │
│                                                        │
│  Styll = RESPONSABILE (Processor)                      │
│  → Per i dati dei clienti finali dei barbieri          │
│  → Il barbiere è il Titolare per i propri clienti     │
│                                                        │
│  Barbiere = TITOLARE (Controller)                      │
│  → Per i dati dei propri clienti finali                │
│  → Styll tratta questi dati per conto del barbiere     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. GDPR

### 3.1 Principi fondamentali (Art. 5 GDPR)

| Principio | Applicazione a Styll |
|-----------|---------------------|
| **Liceità, correttezza, trasparenza** | Informativa chiara per barbieri e clienti finali; basi giuridiche definite per ogni trattamento |
| **Limitazione della finalità** | Dati raccolti solo per gestione appuntamenti, loyalty, CRM, pagamenti — non per finalità incompatibili |
| **Minimizzazione dei dati** | Raccogliere solo i dati strettamente necessari (es. prenotazione senza registrazione: solo nome + telefono) |
| **Esattezza** | Consentire aggiornamento dati da parte del cliente (telefono, email, preferenze) |
| **Limitazione della conservazione** | Definire retention period per ogni categoria di dati; cancellazione automatica dopo cessazione rapporto |
| **Integrità e riservatezza** | Crittografia, controllo accessi basato su ruoli (RBAC), backup, audit log |
| **Responsabilizzazione (Accountability)** | Documentazione completa, registro trattamenti, DPIA, DPO se necessario |

### 3.2 Basi giuridiche per il trattamento (Art. 6 GDPR)

| Trattamento | Base giuridica | Riferimento |
|-------------|---------------|-------------|
| Gestione account barbiere (B2B) | **Esecuzione contratto** (Art. 6.1.b) | Contratto di abbonamento SaaS |
| Gestione prenotazioni cliente finale | **Esecuzione contratto** (Art. 6.1.b) | Il servizio di prenotazione richiesto dal cliente |
| CRM e storico visite | **Legittimo interesse** (Art. 6.1.f) | Interesse del barbiere a gestire la relazione col cliente |
| Loyalty e gamification | **Consenso** (Art. 6.1.a) | Il cliente sceglie di aderire al programma loyalty |
| Silent Churn Detection | **Legittimo interesse** (Art. 6.1.f) | Analisi statistica interna per il barbiere (con bilanciamento interessi) |
| VIP Score e profilazione | **Consenso** (Art. 6.1.a) | Profilazione automatizzata — richiede consenso esplicito |
| Invio SMS/push promemoria | **Esecuzione contratto** (Art. 6.1.b) | Promemoria relativo all'appuntamento prenotato |
| Invio SMS/push marketing (win-back) | **Consenso** (Art. 6.1.a) | Comunicazione commerciale — richiede opt-in esplicito |
| Pagamenti online | **Obbligo legale** (Art. 6.1.c) + **Esecuzione contratto** (Art. 6.1.b) | Normativa fiscale + servizio richiesto |
| Geolocalizzazione (slot filler) | **Consenso** (Art. 6.1.a) | Dato sensibile — richiede consenso esplicito e granulare |
| AI Business Coach (v3) | **Legittimo interesse** (Art. 6.1.f) | Con DPIA preventiva e informativa dettagliata |

### 3.3 Registro delle attività di trattamento (Art. 30 GDPR)

Styll deve mantenere un **Registro delle Attività di Trattamento (ROPA)** che includa:

| Campo | Descrizione |
|-------|-------------|
| **Titolare/Responsabile** | Styll S.r.l. (o forma giuridica scelta) |
| **Categorie di interessati** | Barbieri (B2B), clienti finali dei barbieri (B2C) |
| **Categorie di dati** | Dati identificativi, dati di contatto, dati di prenotazione, dati di pagamento, dati di loyalty, preferenze, note CRM, dati di utilizzo piattaforma |
| **Finalità** | Erogazione servizio SaaS, gestione prenotazioni, CRM, loyalty, analytics, pagamenti, comunicazioni di servizio |
| **Destinatari** | Sub-responsabili (Supabase, provider pagamenti, provider SMS, provider email) |
| **Trasferimento extra-UE** | Sì — se Supabase utilizza server US (verificare configurazione regione) |
| **Termini di cancellazione** | Da definire per categoria (es. 2 anni dopo ultima interazione per dati cliente, 10 anni per dati fiscali) |
| **Misure di sicurezza** | Crittografia at-rest e in-transit, RBAC, MFA per admin, audit log, backup automatici |

### 3.4 DPIA — Valutazione d'Impatto sulla Protezione dei Dati (Art. 35 GDPR)

Una DPIA è **obbligatoria** per Styll in relazione a:

1. **Silent Churn Detector** — monitoraggio sistematico del comportamento dei clienti
2. **VIP Score** — profilazione automatizzata con effetti significativi (trattamento differenziato)
3. **No-show Prediction AI (v3)** — decisione automatizzata che può comportare un deposito obbligatorio
4. **Geolocalizzazione (v3)** — trattamento dati di localizzazione
5. **AI Business Coach (v3)** — suggerimenti automatizzati basati su analisi comportamentale

La DPIA deve includere:
- Descrizione sistematica dei trattamenti
- Valutazione della necessità e proporzionalità
- Valutazione dei rischi per i diritti e le libertà degli interessati
- Misure di mitigazione previste
- Eventuale consultazione preventiva con il Garante Privacy (Art. 36 GDPR)

### 3.5 Diritti degli interessati (Artt. 15-22 GDPR)

Styll deve garantire meccanismi per l'esercizio dei seguenti diritti:

| Diritto | Implementazione in Styll |
|---------|-------------------------|
| **Accesso** (Art. 15) | Dashboard cliente: visualizzazione dati personali, storico prenotazioni, punti loyalty |
| **Rettifica** (Art. 16) | Modifica in-app di telefono, email, preferenze |
| **Cancellazione** (Art. 17) | Funzione "Elimina il mio account" + cancellazione da CRM barbiere (su richiesta) |
| **Limitazione** (Art. 18) | Possibilità di disattivare trattamenti specifici (es. loyalty, profilazione) |
| **Portabilità** (Art. 20) | Export dati in formato strutturato (CSV/JSON) — coerente con il valore "I tuoi dati sono tuoi" |
| **Opposizione** (Art. 21) | Opt-out da profilazione, marketing, comunicazioni non essenziali |
| **Non essere soggetto a decisioni automatizzate** (Art. 22) | Rilevante per VIP Score e No-show Prediction — diritto di contestare la decisione e ottenere intervento umano |

**Nota importante**: Il valore di Styll "Export dati: sempre gratis" è perfettamente allineato con il diritto alla portabilità del GDPR.

### 3.6 Data Processing Agreement (DPA)

Styll deve stipulare un **DPA (Art. 28 GDPR)** con:

**a) I barbieri (Styll come Responsabile)**
- Styll tratta i dati dei clienti finali per conto del barbiere
- Il DPA definisce: finalità, durata, categorie di dati, obblighi di Styll, diritti del barbiere
- Da integrare nei Terms of Service come allegato

**b) I sub-responsabili (Styll come Titolare/Responsabile)**
- Supabase (database, autenticazione)
- Provider di pagamento (es. Stripe)
- Provider SMS (es. Twilio)
- Provider email transazionale
- CDN/hosting
- Google (per Google Business Profile API)

**Lista sub-responsabili**: deve essere mantenuta aggiornata e comunicata ai barbieri, con possibilità di opposizione alla nomina di nuovi sub-responsabili.

### 3.7 Trasferimento dati extra-UE

Se Styll utilizza servizi con server al di fuori dello Spazio Economico Europeo (SEE), deve garantire:

| Meccanismo | Applicazione |
|-----------|-------------|
| **Decisione di adeguatezza** (Art. 45 GDPR) | Valido per USA con EU-US Data Privacy Framework (DPF) — verificare che i sub-responsabili siano certificati DPF |
| **Clausole Contrattuali Standard (SCC)** (Art. 46.2.c GDPR) | Fallback per provider non coperti da decisione di adeguatezza |
| **Transfer Impact Assessment (TIA)** | Valutazione del rischio per ogni trasferimento — richiesta dalle Raccomandazioni EDPB 01/2020 |

**Raccomandazione per Styll**: Configurare Supabase con **regione EU** (es. `eu-west-1` su AWS Frankfurt) per evitare trasferimenti extra-UE per i dati principali.

### 3.8 Incident response e data breach

La sola formula "notifica entro 72 ore" non e sufficiente. Styll deve mantenere una procedura operativa con ruoli, escalation, checklist, template e registro incidenti. Il riferimento operativo interno e il [runbook data breach](../legal/data-breach-runbook.md), da usare insieme a DPA e ROPA.

---

## 4. Privacy Policy

La Privacy Policy di Styll deve essere **doppia**:

### 4.1 Privacy Policy per il barbiere (B2B)

Informativa resa da Styll al barbiere come proprio cliente diretto:

1. **Identità e dati di contatto del Titolare** — Styll S.r.l., sede legale, email, PEC
2. **Dati di contatto del DPO** (se nominato)
3. **Categorie di dati trattati** — dati identificativi, dati di contatto, dati aziendali, dati di pagamento, dati di utilizzo piattaforma
4. **Finalità e basi giuridiche** — esecuzione contratto SaaS, assistenza, fatturazione, miglioramento servizio
5. **Destinatari e sub-responsabili** — lista completa con localizzazione server
6. **Trasferimento extra-UE** — meccanismi di garanzia utilizzati
7. **Periodo di conservazione** — per ogni categoria di dati
8. **Diritti dell'interessato** — accesso, rettifica, cancellazione, portabilità, opposizione, reclamo al Garante
9. **Natura del conferimento** — obbligatorio/facoltativo e conseguenze del rifiuto
10. **Processo decisionale automatizzato** — se applicabile
11. **Modalità di reclamo** — al Garante per la Protezione dei Dati Personali (www.garanteprivacy.it)

### 4.2 Privacy Policy per il cliente finale (B2C)

Informativa resa dal barbiere (Titolare) al proprio cliente, **tramite Styll** (Responsabile):

1. **Identità del Titolare** — il barbiere (con i propri dati di contatto)
2. **Identità del Responsabile** — Styll S.r.l.
3. **Categorie di dati trattati** — nome, telefono, email, storico appuntamenti, preferenze, dati loyalty, dati di pagamento (se applicabile)
4. **Finalità** — prenotazione appuntamenti, gestione relazione, programma loyalty, comunicazioni di servizio
5. **Basi giuridiche** — esecuzione contratto, consenso (per loyalty, marketing), legittimo interesse (per CRM)
6. **Destinatari** — Styll (Responsabile), sub-responsabili di Styll
7. **Periodo di conservazione**
8. **Diritti dell'interessato**
9. **Profilazione** — informativa specifica su VIP Score, churn detection (con diritto di opt-out)
10. **Cookie e tecnologie di tracciamento** — rimando alla Cookie Policy

**Nota**: Styll deve fornire ai barbieri un **template di informativa privacy pre-compilato** e personalizzabile, da esporre nella PWA del barbiere.

---

## 5. Terms of Service

### 5.1 Terms of Service B2B (Styll → Barbiere)

| Sezione | Contenuto |
|---------|-----------|
| **Definizioni** | SaaS, Piattaforma, Utente Professionista, Cliente Finale, Tenant, PWA |
| **Oggetto del contratto** | Licenza d'uso della piattaforma Styll in modalità SaaS |
| **Durata e rinnovo** | Abbonamento mensile, rinnovo automatico, cancellazione in qualsiasi momento |
| **Pricing e pagamenti** | Tier 1/2/3, commissioni su transazioni (2,5-2,9%), fatturazione, IVA |
| **Livelli di servizio (SLA)** | Struttura SLA da formalizzare e pubblicare solo quando operativa (vedi Sezione 9) |
| **Proprietà dei dati** | I dati dei clienti finali sono del barbiere; export gratuito in qualsiasi momento |
| **Proprietà intellettuale** | La piattaforma è di Styll; il brand del barbiere è del barbiere |
| **Responsabilità e limitazioni** | Limitazione di responsabilità di Styll, esclusione danni indiretti |
| **Trattamento dati (DPA)** | Allegato con DPA ai sensi dell'Art. 28 GDPR |
| **Uso accettabile** | Divieto di uso fraudolento, abusivo, contrario alla legge |
| **Sospensione e risoluzione** | Cause di sospensione (mancato pagamento), cause di risoluzione |
| **Legge applicabile e foro** | Legge italiana, foro competente (es. Milano o sede legale Styll) |
| **Modifiche ai termini** | Notifica con 30 giorni di anticipo, diritto di recesso se non accettate |
| **Forza maggiore** | Clausola standard |
| **Clausola di salvaguardia** | Se una clausola è nulla, le altre restano valide |

### 5.2 Terms of Service B2C (Barbiere → Cliente Finale)

Styll deve fornire al barbiere un **template di Termini di Servizio** da esporre nella PWA, che includa:

- Descrizione del servizio di prenotazione online
- Politica di cancellazione e no-show
- Regole del programma loyalty (se attivo)
- Privacy e trattamento dati (rimando all'informativa)
- Limitazioni di responsabilità
- Legge applicabile

**Nota sul Codice del Consumo**: Poiché il cliente finale è un consumatore (B2C), i termini devono rispettare il D.Lgs. 206/2005, in particolare:
- Divieto di clausole vessatorie (Art. 33-36)
- Diritto di recesso per contratti a distanza (Art. 52-59) — se applicabile
- Informazioni precontrattuali obbligatorie (Art. 49)

---

## 6. Cookie Policy e consent

### 6.1 Requisiti normativi

La Cookie Policy di Styll deve conformarsi a:
- **Direttiva ePrivacy** (2002/58/CE) e relativo recepimento italiano
- **Linee guida cookie del Garante Privacy** (Provvedimento 10 giugno 2021, n. 231)
- **GDPR** per il trattamento dei dati personali raccolti tramite cookie

### 6.2 Classificazione dei cookie

| Tipo | Consenso necessario | Esempi in Styll |
|------|-------------------|-----------------|
| **Cookie tecnici** (strettamente necessari) | ❌ No (solo informativa) | Sessione utente, autenticazione Supabase, preferenze lingua, CSRF token |
| **Cookie analitici** (anonimizzati, first-party) | ❌ No (se IP anonimizzato) | Analytics con IP masking (es. Plausible, Matomo self-hosted) |
| **Cookie analitici** (third-party, non anonimizzati) | ✅ Sì | Google Analytics (se usato senza anonimizzazione) |
| **Cookie di profilazione/marketing** | ✅ Sì (consenso esplicito, granulare) | Pixel Facebook, tracciamento conversioni, remarketing |

### 6.3 Requisiti del banner cookie

Secondo le linee guida del Garante Privacy italiano:

- ✅ **Primo livello (banner)**: breve informativa con pulsanti "Accetta", "Rifiuta" e "Personalizza" — tutti dello stesso peso visivo
- ✅ **Secondo livello (pagina completa)**: Cookie Policy dettagliata con elenco di ogni cookie, provider, finalità, durata, base giuridica
- ❌ **Vietato**: pre-selezionare caselle, ottenere consenso tramite scroll, cookie wall (condizionare l'accesso all'accettazione dei cookie)
- ✅ **Revoca**: il consenso deve essere revocabile con la stessa facilità con cui è stato dato (link persistente nel footer)
- ✅ **Rinnovo**: richiedere il consenso periodicamente (raccomandato: ogni 6-12 mesi) o quando cambiano i trattamenti
- ✅ **Prova del consenso**: conservare log con timestamp, scelte dell'utente, versione della policy

### 6.4 Consent Management Platform (CMP) consigliata

| Tool | Costo | Note |
|------|-------|------|
| **Iubenda** | Da €29/anno | Soluzione italiana, conforme Garante, generatore automatico |
| **Cookiebot (Usercentrics)** | Da €12/mese | Scansione automatica cookie, IAB TCF v2.2 |
| **CookieYes** | Da €9/mese | Facile, conforme GDPR, banner personalizzabile |
| **Osano** | Gratuito (base) | Open source friendly |

**Raccomandazione per Styll**: Per la dashboard B2B di Styll, implementare una CMP. Per le PWA dei barbieri, i cookie tecnici di sessione non richiedono consenso; se vengono aggiunti analytics o tracking, il barbiere deve attivare la CMP tramite un toggle nella dashboard.

---

## 7. Pagamenti e PCI DSS

### 7.1 Architettura pagamenti di Styll

Styll gestisce due flussi di pagamento:

1. **Abbonamento SaaS** (Barbiere → Styll): pagamento ricorrente mensile per il servizio
2. **Pagamento servizi** (Cliente finale → Barbiere, tramite Styll): pagamento del taglio/servizio con commissione Styll (2,5-2,9%)

### 7.2 PCI DSS — Livelli di conformità

| Livello | Volume transazioni annue | Requisiti |
|---------|------------------------|-----------|
| **Livello 1** | > 6 milioni | Audit on-site da QSA, Report on Compliance (ROC) |
| **Livello 2** | 1-6 milioni | SAQ annuale, scansione trimestrale ASV |
| **Livello 3** | 20.000 – 1 milione | SAQ annuale, scansione trimestrale ASV |
| **Livello 4** | < 20.000 | SAQ annuale (raccomandato) |

**Styll in fase di lancio**: Livello 4 → **SAQ A** (se utilizza Stripe Checkout o Stripe Elements, dove i dati della carta non transitano mai sui server di Styll).

### 7.3 PCI DSS v4.0 — Requisiti chiave (da marzo 2025)

- ✅ **MFA obbligatoria** per ogni accesso al Cardholder Data Environment (CDE)
- ✅ **Monitoraggio script di terze parti** sulle pagine di pagamento
- ✅ **Gestione vulnerabilità** continua e tempestiva
- ✅ **Crittografia forte** per dati sensibili in transito e a riposo

### 7.4 Provider di pagamento certificati PCI DSS Livello 1

| Provider | Costo | Integrazione | Note |
|----------|-------|-------------|------|
| **Stripe** | 1,5% + €0,25 (EU) | Stripe Checkout / Elements | Il più usato dai SaaS, SAQ A, Connect per marketplace |
| **Stripe Connect** | + fee piattaforma | Per gestire pagamenti barbiere→cliente | Modello "Platform" ideale per Styll |
| **PayPal / Braintree** | ~2,9% + €0,35 | Checkout hosted | Alternativa, meno usato nel SaaS |
| **Mollie** | 1,8% + €0,25 (EU) | Checkout hosted | Provider EU, buon supporto italiano |
| **Satispay** | Commissione fissa | API native | Molto usato in Italia tra giovani e professionisti |

**Raccomandazione per Styll**: Utilizzare **Stripe Connect** in modalità Platform:
- I dati della carta non toccano mai i server Styll → **SAQ A** (minimo onere PCI DSS)
- Gestione automatica di split payment (barbiere + commissione Styll)
- Onboarding KYC del barbiere gestito da Stripe
- Conformità PSD2/SCA automatica

### 7.5 Fatturazione e obblighi fiscali

| Obbligo | Dettaglio |
|---------|-----------|
| **Fatturazione elettronica** | Obbligatoria in Italia per B2B (via SDI — Sistema di Interscambio) |
| **IVA** | Aliquota standard 22% per servizi digitali B2B in Italia |
| **Reverse charge** | Per clienti B2B in altri paesi UE (Art. 196 Direttiva IVA) |
| **Regime forfettario** | Molti barbieri in Italia sono in regime forfettario — Styll deve supportare fatturazione con/senza IVA |
| **Provider fatturazione** | Fatture in Cloud, Aruba, Flextax (per generazione automatica fatture) |

### 7.6 PSD2 e Strong Customer Authentication (SCA)

Per i pagamenti online nell'UE, Styll deve supportare la **Strong Customer Authentication** (SCA):
- Richiesta per pagamenti elettronici sopra €30 (con esenzioni)
- Implementata automaticamente da Stripe e altri provider conformi
- Due fattori su tre: qualcosa che l'utente **conosce**, **possiede**, o **è**

---

## 8. Proprietà intellettuale

### 8.1 Marchio — Registrazione "Styll"

| Aspetto | Dettaglio |
|---------|-----------|
| **Tipo di marchio** | Marchio denominativo ("Styll") + marchio figurativo (logo) |
| **Dove registrare** | UIBM (Italia) e/o EUIPO (UE) |
| **Classi di Nizza** | Classe 9 (software), Classe 35 (gestione aziendale, CRM), Classe 42 (SaaS, cloud) |
| **Durata** | 10 anni, rinnovabile indefinitamente |
| **Costo indicativo** | UIBM: ~€101 (una classe) + €34 per classe aggiuntiva; EUIPO: €850 (una classe) + €50-€150 per classi aggiuntive |
| **Principio** | First-to-file in Italia — registrare il prima possibile |
| **Ricerca anteriorità** | Verificare su TMView (EUIPO) e banca dati UIBM che "Styll" non sia già registrato nelle classi rilevanti |

**Raccomandazione**: Registrare immediatamente il marchio "Styll" sia come denominativo che come figurativo (logo), almeno nelle Classi 9, 35 e 42, presso UIBM e/o EUIPO.

### 8.2 Copyright e licenze software

| Aspetto | Dettaglio |
|---------|-----------|
| **Codice sorgente** | Protetto automaticamente dal diritto d'autore (L. 633/1941, Art. 2 n. 8) senza necessità di registrazione |
| **Titolarità** | Assicurarsi che tutti i contratti con sviluppatori (dipendenti o freelance) contengano cessione esplicita dei diritti patrimoniali d'autore a Styll |
| **Licenze open source** | Verificare la compatibilità delle licenze delle librerie usate (React: MIT, Supabase: Apache 2.0) con il modello di business SaaS proprietario |
| **Contenuti generati** | I template social, le icone, le immagini usate nella piattaforma devono avere licenze adeguate (es. CC0, MIT, licenze commerciali) |

### 8.3 Brevetti

Il software in quanto tale **non è brevettabile** in Italia e nell'UE (Art. 52 EPC — Convenzione sul Brevetto Europeo). Tuttavia, se l'algoritmo di Styll (es. Silent Churn Detection, VIP Score) produce un **effetto tecnico**, potrebbe essere brevettabile come invenzione implementata via software. Valutare con un consulente brevettuale.

### 8.4 NDA — Accordi di non divulgazione

Stipulare NDA con:
- Sviluppatori esterni e freelance
- Consulenti e beta tester
- Potenziali investitori (prima di condividere business plan e codebase)
- Eventuali partner commerciali

### 8.5 Dominio e tutela online

- Registrare i domini: `styll.app`, `styll.it`, `styll.eu` e varianti difensive
- Registrare gli handle social: @styll su Instagram, TikTok, X, LinkedIn
- Monitorare registrazioni abusive di domini simili (cybersquatting)

---

## 9. Contratti e SLA

### 9.1 Schema di SLA da contrattualizzare

> **Nota operativa:** la tabella seguente descrive una **struttura commerciale da formalizzare**, non una promessa oggi attiva o pubblicabile. Qualunque SLA verso clienti deve essere pubblicato solo quando monitoring, supporto e procedure interne coerenti sono realmente operativi; per la gestione incidenti/privacy il riferimento attuale e il [runbook data breach](../legal/data-breach-runbook.md).

| Metrica | Tier 1 (Starter) | Tier 2 (Growth) | Tier 3 (Pro) |
|---------|-----------------|-----------------|-------------|
| **Target uptime** | 99,5% | 99,9% | 99,95% |
| **Target risposta supporto** | 24h (email) | 12h (email) + chat | 4h (email + chat + priorità) |
| **Finestra di manutenzione** | Notte (01:00-05:00 CET) | Notte (01:00-05:00 CET) | Notte, con preavviso 48h |
| **Obiettivo backup/restore** | Giornaliero | Giornaliero | Giornaliero + point-in-time recovery |
| **Crediti SLA** | — | Credito proporzionale per downtime | Credito proporzionale + escalation |

### 9.2 Elementi contrattuali B2B essenziali

| Elemento | Descrizione |
|----------|-------------|
| **Onboarding** | Setup guidato incluso; eventuale migrazione assistita da offrire solo con capacita operativa esplicita e tempi dichiarati nel piano commerciale |
| **Formazione** | Documentazione online, video tutorial, supporto umano |
| **Exit strategy** | Export dati gratuito in CSV/JSON in qualsiasi momento — nessun lock-in |
| **Penali per downtime** | Da definire solo insieme a SLA effettivamente monitorati, pubblicati e contrattualizzati |
| **Riservatezza** | Styll non accede ai dati dei clienti finali se non per assistenza tecnica, su richiesta del barbiere |
| **Assicurazione** | Valutare polizza RC professionale e cyber insurance |

### 9.3 Contratti con fornitori

Styll deve stipulare contratti scritti con tutti i fornitori critici:
- Supabase (Terms of Service + DPA)
- Provider pagamenti (Stripe Agreement + DPA)
- Provider SMS/comunicazioni
- CDN e servizi infrastrutturali
- Eventuali fornitori AI (OpenAI per v3)

---

## 10. Normative specifiche di settore

### 10.1 Settore barbieri e acconciatori in Italia

| Normativa | Dettaglio | Impatto su Styll |
|-----------|-----------|-----------------|
| **L. 174/2005** | Disciplina dell'attività di acconciatore | Styll non eroga servizi di acconciatura, ma deve verificare che i propri clienti B2B siano professionisti abilitati |
| **Normativa igienico-sanitaria regionale** | Requisiti igienici per saloni | Non direttamente applicabile a Styll, ma rilevante per la documentazione fornita |
| **Obblighi fiscali micro-imprese** | Regime forfettario, contributi INPS artigiani | Styll deve supportare la fatturazione compatibile con il regime forfettario |

### 10.2 Comunicazioni commerciali (SMS, email, push)

| Normativa | Requisito | Implementazione in Styll |
|-----------|-----------|-------------------------|
| **Art. 130 Codice Privacy** | Consenso preventivo per comunicazioni commerciali (opt-in) | Opt-in esplicito per messaggi win-back e promozionali |
| **Soft spam (Art. 130 c. 4)** | Email/SMS promozionali a clienti esistenti per prodotti/servizi analoghi | Utilizzabile per comunicazioni di re-booking da parte del barbiere ai propri clienti |
| **Direttiva ePrivacy** | Consenso per comunicazioni elettroniche non sollecitate | Doppio opt-in raccomandato dal Garante per marketing |
| **Reg. UE 2024/1689 (AI Act)** | Trasparenza su decisioni automatizzate | Rilevante per v3: informare che i suggerimenti di win-back sono generati da AI |

### 10.3 Accessibilità digitale

| Normativa | Dettaglio |
|-----------|-----------|
| **European Accessibility Act (EAA)** — Direttiva UE 2019/882 | Dal 28 giugno 2025, i servizi digitali devono essere accessibili alle persone con disabilità |
| **L. 4/2004 (Legge Stanca)** | Accessibilità dei siti web in Italia — applicabile ai servizi della PA e, dal 2025, estesa ai privati con fatturato > €2M |
| **WCAG 2.1 livello AA** | Standard tecnico di riferimento per l'accessibilità web |

**Impatto su Styll**: La PWA e la dashboard devono rispettare i requisiti di accessibilità (contrasto colori, navigazione da tastiera, screen reader, testi alternativi). Particolarmente rilevante per il Persona "Roberto" (54 anni, basso tech): testi grandi, bottoni enormi, contrasto alto.

---

## 11. Checklist compliance pre-launch

### 🔴 Obbligatori (bloccanti per il lancio)

- [ ] 🔴 **Privacy Policy B2B** — informativa per i barbieri conforme al GDPR
- [ ] 🔴 **Privacy Policy B2C** — template per i barbieri da esporre nella PWA, conforme al GDPR
- [ ] 🔴 **Terms of Service B2B** — contratto di abbonamento SaaS con DPA allegato
- [ ] 🔴 **Cookie Policy** — conforme alle linee guida del Garante Privacy
- [ ] 🔴 **Cookie Banner** — con pulsanti Accetta/Rifiuta/Personalizza dello stesso peso visivo
- [ ] 🔴 **Registro trattamenti (ROPA)** — documentazione interna Art. 30 GDPR
- [ ] 🔴 **DPA con sub-responsabili** — Supabase, Stripe, provider SMS, ecc.
- [ ] 🔴 **Consenso esplicito per loyalty** — opt-in per adesione al programma
- [ ] 🔴 **Consenso esplicito per comunicazioni marketing** — opt-in per SMS/push win-back
- [ ] 🔴 **Meccanismo esercizio diritti** — email/form per richieste accesso, cancellazione, portabilità
- [ ] 🔴 **Fatturazione elettronica** — integrazione con SDI per fatture B2B
- [ ] 🔴 **Conformità PCI DSS** — utilizzo di Stripe Checkout/Elements (SAQ A), nessun dato carta sui server
- [ ] 🔴 **SCA (Strong Customer Authentication)** — per pagamenti online
- [ ] 🔴 **Informativa pre-contrattuale** — per consumatori B2C (Art. 49 Codice del Consumo)

### 🟡 Raccomandati (da completare entro 3 mesi dal lancio)

- [ ] 🟡 **DPIA** — per Silent Churn Detector e VIP Score
- [ ] 🟡 **Nomina DPO** — valutare se obbligatoria in base al volume di dati trattati
- [ ] 🟡 **Registrazione marchio** — "Styll" presso UIBM e/o EUIPO
- [ ] 🟡 **NDA** — con sviluppatori, consulenti, beta tester
- [ ] 🟡 **Contratti di cessione IP** — con tutti gli sviluppatori (interni/esterni)
- [ ] 🟡 **Audit licenze open source** — verifica compatibilità licenze delle librerie utilizzate
- [x] 🟡 **Procedura data breach** — runbook operativo attivo: [docs/legal/data-breach-runbook.md](../legal/data-breach-runbook.md)
- [ ] 🟡 **SLA documentato** — per ogni tier di abbonamento
- [ ] 🟡 **Cyber insurance** — polizza assicurativa per rischio cyber
- [ ] 🟡 **Documentazione accessibilità** — dichiarazione di conformità WCAG 2.1 AA

### 🟢 Best practice (da pianificare)

- [ ] 🟢 **Certificazione ISO 27001** — sistema di gestione della sicurezza delle informazioni
- [ ] 🟢 **Penetration testing** — audit di sicurezza della piattaforma
- [ ] 🟢 **Privacy by Design audit** — revisione periodica dell'architettura
- [ ] 🟢 **Formazione team** — corso GDPR per tutto il team
- [ ] 🟢 **Audit annuale compliance** — revisione completa della conformità
- [ ] 🟢 **Trust page pubblica** — pagina su styll.app con certificazioni, sub-processor list, status page
- [ ] 🟢 **Bug bounty program** — per identificazione vulnerabilità da parte della community
- [ ] 🟢 **SOC 2 Type II** — certificazione per clienti enterprise (scalabilità futura)

---

## 12. Tool per la compliance

| Tool | Funzione | Costo | Alternativa |
|------|----------|-------|-------------|
| **Iubenda** | Privacy Policy, Cookie Policy, Terms, Consent Management | Da €29/anno | Termly, GetTerms |
| **Cookiebot (Usercentrics)** | Cookie scanning, banner, consent management | Da €12/mese | CookieYes (da €9/mese), Osano (free tier) |
| **OneTrust** | Privacy management completo, DPIA, ROPA | Enterprise (su richiesta) | TrustArc, Securiti.ai |
| **Stripe** | Pagamenti PCI DSS Level 1, SCA, Connect | 1,5% + €0,25/transazione | Mollie (1,8% + €0,25), Satispay |
| **Vanta** | Automazione SOC 2, ISO 27001, GDPR | Da $10.000/anno | Drata, Secureframe |
| **LegalBlink** | Generatore documenti legali per siti italiani | Da €120/anno | Iubenda, AvvocatoFlash |
| **Fatture in Cloud** | Fatturazione elettronica SDI | Da €8/mese | Aruba Fatturazione, Flextax |
| **Plausible Analytics** | Analytics privacy-friendly, no cookie | Da €9/mese | Matomo self-hosted (gratuito), Fathom |
| **ProtonMail / Tutanota** | Email crittografata per comunicazioni sensibili | Gratuito (base) | Standard email con TLS |
| **1Password Business** | Gestione password e secret del team | Da $7,99/utente/mese | Bitwarden ($3/utente/mese) |
| **GitGuardian** | Rilevamento secret nel codice sorgente | Gratuito (open source) | TruffleHog |
| **Snyk** | Scansione vulnerabilità dipendenze | Gratuito (base) | Dependabot (GitHub), npm audit |

---

## 13. Case study

### 13.1 Advanced Computer Software Group — £3,07 milioni (UK, 2025)

**Azienda**: Provider SaaS per il settore sanitario (NHS)
**Violazione**: Dopo un attacco ransomware, è emerso che l'azienda non aveva implementato misure di sicurezza adeguate: assenza di MFA, mancata applicazione di patch di sicurezza note.
**Dati esposti**: Dati personali e medici di circa 80.000 persone.
**Sanzione**: £3,07 milioni dal Information Commissioner's Office (ICO).
**Lezione per Styll**: Implementare MFA obbligatoria per tutti gli accessi alla dashboard, gestione tempestiva delle vulnerabilità, patch management continuo.

*Fonte: ICO, Enforcement Notice, marzo 2025; Alston & Bird, "ICO fine ransomware SaaS Advanced Health", 2025.*

### 13.2 Meta Platforms — €1,2 miliardi (Irlanda, 2023)

**Azienda**: Meta (Facebook, Instagram, WhatsApp) — modello SaaS/piattaforma.
**Violazione**: Trasferimento illegale di dati personali di utenti UE verso gli USA senza garanzie adeguate, in violazione del Capo V del GDPR (Artt. 44-49).
**Sanzione**: €1,2 miliardi dalla Data Protection Commission (DPC) irlandese — la multa GDPR più alta mai comminata.
**Lezione per Styll**: Configurare Supabase con data residency EU; verificare che tutti i sub-responsabili (Stripe, SMS provider, ecc.) siano conformi al trasferimento dati extra-UE; utilizzare SCC o verificare la certificazione DPF.

*Fonte: Data Protection Commission Ireland, Decision IN-20-5-2, 22 maggio 2023.*

### 13.3 LinkedIn — €310 milioni (Irlanda, 2024)

**Azienda**: LinkedIn (Microsoft) — piattaforma SaaS professionale.
**Violazione**: Profilazione e pubblicità mirata senza base giuridica adeguata; uso di dati personali per analytics comportamentali senza consenso valido.
**Sanzione**: €310 milioni dalla DPC irlandese.
**Lezione per Styll**: Il VIP Score e la profilazione automatizzata (churn detection, no-show prediction) richiedono una base giuridica solida — preferibilmente consenso esplicito — e una DPIA documentata.

*Fonte: Data Protection Commission Ireland, Enforcement Decision, ottobre 2024; Infosecurity Magazine, "Top 10 Data Protection Fines 2024".*

### 13.4 Clearview AI — €20 milioni (Italia, 2022)

**Azienda**: Clearview AI — SaaS di riconoscimento facciale.
**Violazione**: Raccolta massiva di immagini da internet senza consenso, profilazione biometrica, assenza di base giuridica, mancata nomina di rappresentante nell'UE.
**Sanzione**: €20 milioni dal Garante per la Protezione dei Dati Personali italiano.
**Lezione per Styll**: Anche SaaS non europee sono soggette al GDPR se trattano dati di interessati nell'UE. Il Garante italiano è tra le autorità più attive e severe.

*Fonte: Garante per la Protezione dei Dati Personali, Provvedimento del 10 febbraio 2022 [9751362].*

### 13.5 Foodinho (Glovo) — €2,6 milioni (Italia, 2021)

**Azienda**: Foodinho S.r.l. (Glovo) — piattaforma SaaS di food delivery.
**Violazione**: Profilazione automatizzata dei rider senza informativa adeguata, senza DPIA, con decisioni automatizzate (assegnazione turni e ordini) che producevano effetti significativi sugli interessati.
**Sanzione**: €2,6 milioni dal Garante Privacy italiano.
**Lezione per Styll**: Gli algoritmi che producono effetti significativi sugli utenti (es. No-show Prediction che impone un deposito) richiedono DPIA, informativa specifica, e diritto di contestare la decisione automatizzata (Art. 22 GDPR).

*Fonte: Garante per la Protezione dei Dati Personali, Provvedimento del 10 giugno 2021 [9675440].*

---

## 14. Riscontri e osservazioni per il progetto Styll

### 14.1 Punti di forza già presenti

| Aspetto | Commento |
|---------|----------|
| **"I tuoi dati sono tuoi"** | Perfettamente allineato con GDPR (diritto alla portabilità, Art. 20) e con la trasparenza richiesta dalle autorità |
| **Export dati gratuito** | Vantaggio competitivo E compliance: Phorest fa pagare $295, Styll lo offre gratis |
| **Note barbiere private** | Corretto: le note del barbiere NON devono essere visibili al cliente nella PWA — conforme al principio di minimizzazione |
| **Consenso al primo accesso** | Già previsto nel design: consenso esplicito + opt-out sempre disponibile |
| **Prenotazione senza registrazione** | Minimizzazione dei dati: solo nome + telefono per prenotare — eccellente approccio privacy by design |

### 14.2 Aree di attenzione

| Area | Rischio | Raccomandazione |
|------|---------|-----------------|
| **Silent Churn Detector** | È una forma di monitoraggio sistematico → potrebbe richiedere DPIA e informativa specifica | Effettuare DPIA; informare il barbiere che il sistema analizza i pattern di visita; offrire opt-out al cliente finale |
| **VIP Score** | Profilazione automatizzata con effetti potenzialmente significativi | Base giuridica: consenso esplicito del barbiere per l'attivazione; informativa al cliente; diritto di contestare il punteggio |
| **No-show Prediction + deposito** | Decisione automatizzata con effetti giuridici/significativi (Art. 22 GDPR) | Il deposito non può essere imposto solo su base algoritmica senza intervento umano; il cliente deve poter contestare e ottenere revisione umana |
| **Geolocalizzazione (Slot Filler)** | Dato di localizzazione = dato sensibile che richiede consenso granulare | Consenso specifico separato; possibilità di opt-out senza perdere il servizio base |
| **Win-back SMS** | Comunicazione commerciale → richiede consenso esplicito (opt-in) | Distinguere SMS di servizio (reminder appuntamento = esecuzione contratto) da SMS promozionali (win-back = consenso) |
| **Multi-tenant data isolation** | Rischio di data leakage tra tenant | Row Level Security (RLS) rigorosa su Supabase; test di isolamento; audit periodici |
| **Supabase data residency** | Se i dati sono su server US → trasferimento extra-UE | Configurare Supabase con regione EU; verificare conformità DPF di Supabase |
| **Template privacy per barbieri** | Il barbiere (Titolare) potrebbe non saper redigere un'informativa | Fornire template pre-compilato e personalizzabile; il barbiere deve solo inserire i propri dati di contatto |
| **Doppio opt-in marketing** | Il Garante italiano nel 2025 considera il doppio opt-in quasi obbligatorio per il marketing | Implementare doppio opt-in per iscrizione a comunicazioni promozionali |
| **AI Act (v3)** | L'AI Business Coach e il No-show Prediction rientrano potenzialmente nelle categorie a rischio limitato dell'AI Act | Garantire trasparenza (l'utente deve sapere che interagisce con un sistema AI); documentazione del sistema |

### 14.3 Quick wins

1. **Integrare Iubenda o LegalBlink** per generare automaticamente Privacy Policy, Cookie Policy e Terms conformi alla normativa italiana
2. **Attivare Supabase in regione EU** per evitare problematiche di trasferimento dati extra-UE
3. **Usare Stripe Checkout** (hosted payment page) per minimizzare lo scope PCI DSS a SAQ A
4. **Aggiungere una pagina "Privacy & Legal"** nella dashboard del barbiere con i documenti precompilati
5. **Registrare il marchio "Styll"** il prima possibile (principio first-to-file)

---

## 15. Bibliografia e Fonti per la Tesi

### Normative e regolamenti

1. **Regolamento (UE) 2016/679** del Parlamento Europeo e del Consiglio, del 27 aprile 2016, relativo alla protezione delle persone fisiche con riguardo al trattamento dei dati personali (GDPR). *Gazzetta Ufficiale dell'Unione Europea*, L 119, 4 maggio 2016, pp. 1-88.

2. **Decreto Legislativo 30 giugno 2003, n. 196** — Codice in materia di protezione dei dati personali (Codice Privacy), come modificato dal D.Lgs. 10 agosto 2018, n. 101. *Gazzetta Ufficiale della Repubblica Italiana*, n. 174, 29 luglio 2003.

3. **Decreto Legislativo 10 agosto 2018, n. 101** — Disposizioni per l'adeguamento della normativa nazionale al GDPR. *Gazzetta Ufficiale della Repubblica Italiana*, n. 205, 4 settembre 2018.

4. **Direttiva 2002/58/CE** del Parlamento Europeo e del Consiglio, del 12 luglio 2002, relativa al trattamento dei dati personali e alla tutela della vita privata nel settore delle comunicazioni elettroniche (Direttiva ePrivacy). *Gazzetta Ufficiale delle Comunità Europee*, L 201, 31 luglio 2002.

5. **Decreto Legislativo 6 settembre 2005, n. 206** — Codice del Consumo. *Gazzetta Ufficiale della Repubblica Italiana*, n. 235, 8 ottobre 2005.

6. **Decreto Legislativo 10 febbraio 2005, n. 30** — Codice della proprietà industriale. *Gazzetta Ufficiale della Repubblica Italiana*, n. 52, 4 marzo 2005.

7. **Legge 22 aprile 1941, n. 633** — Protezione del diritto d'autore e di altri diritti connessi al suo esercizio. *Gazzetta Ufficiale del Regno d'Italia*, n. 166, 16 luglio 1941.

8. **Regolamento (UE) 2022/2065** del Parlamento Europeo e del Consiglio, del 19 ottobre 2022, relativo a un mercato unico dei servizi digitali (Digital Services Act). *Gazzetta Ufficiale dell'Unione Europea*, L 277, 27 ottobre 2022.

9. **Regolamento (UE) 2024/1689** del Parlamento Europeo e del Consiglio, del 13 giugno 2024, che stabilisce regole armonizzate sull'intelligenza artificiale (AI Act). *Gazzetta Ufficiale dell'Unione Europea*, L, 12 luglio 2024.

10. **Direttiva (UE) 2015/2366** del Parlamento Europeo e del Consiglio, del 25 novembre 2015, relativa ai servizi di pagamento nel mercato interno (PSD2). *Gazzetta Ufficiale dell'Unione Europea*, L 337, 23 dicembre 2015.

11. **Direttiva (UE) 2019/882** del Parlamento Europeo e del Consiglio, del 17 aprile 2019, sui requisiti di accessibilità dei prodotti e dei servizi (European Accessibility Act). *Gazzetta Ufficiale dell'Unione Europea*, L 151, 7 giugno 2019.

### Linee guida e provvedimenti delle autorità

12. **Garante per la Protezione dei Dati Personali** (2021). *Linee guida cookie e altri strumenti di tracciamento*, Provvedimento del 10 giugno 2021, n. 231. Roma: Garante Privacy. Disponibile su: https://www.garanteprivacy.it/

13. **Garante per la Protezione dei Dati Personali** (2022). *Provvedimento nei confronti di Clearview AI*, 10 febbraio 2022, doc. web n. 9751362. Roma: Garante Privacy.

14. **Garante per la Protezione dei Dati Personali** (2021). *Provvedimento nei confronti di Foodinho S.r.l.*, 10 giugno 2021, doc. web n. 9675440. Roma: Garante Privacy.

15. **European Data Protection Board (EDPB)** (2020). *Raccomandazioni 01/2020 sulle misure che integrano gli strumenti di trasferimento al fine di garantire la conformità al livello di protezione dei dati personali dell'UE*, versione 2.0, giugno 2021.

16. **European Data Protection Board (EDPB)** (2020). *Linee guida 07/2020 sui concetti di titolare del trattamento e di responsabile del trattamento ai sensi del GDPR*, versione 2.0, luglio 2021.

17. **PCI Security Standards Council** (2024). *PCI DSS v4.0.1 — Payment Card Industry Data Security Standard*. Wakefield, MA: PCI SSC. Disponibile su: https://www.pcisecuritystandards.org/

### Articoli e risorse accademiche

18. Voigt, P. e von dem Bussche, A. (2017). *The EU General Data Protection Regulation (GDPR): A Practical Guide*. Cham: Springer International Publishing. DOI: 10.1007/978-3-319-57959-7.

19. Bygrave, L.A. (2014). *Data Privacy Law: An International Perspective*. Oxford: Oxford University Press.

20. Bolognini, L. e Bistolfi, C. (2017). *Pseudonymization and impacts of Big (personal/anonymous) Data processing in the transition from the Directive 95/46/EC to the new EU General Data Protection Regulation*. Computer Law & Security Review, 33(2), pp. 171-181.

21. Politou, E., Alepis, E. e Patsakis, C. (2018). *Forgetting personal data and revoking consent under the GDPR: Challenges and proposed solutions*. Journal of Cybersecurity, 4(1), tyy001.

22. Tikkinen-Piri, C., Rohunen, A. e Markkula, J. (2018). *EU General Data Protection Regulation: Changes and implications for personal data collecting companies*. Computer Law & Security Review, 34(1), pp. 134-153.

### Risorse pratiche e blog

23. Stripe Documentation (2025). *Integration security guide*. Disponibile su: https://docs.stripe.com/security/guide

24. Supabase Documentation (2025). *Security and Compliance*. Disponibile su: https://supabase.com/docs/guides/platform/going-into-prod

25. Iubenda (2025). *Guida alla compliance per siti web e app in Italia*. Disponibile su: https://www.iubenda.com/

26. CMS Law (2025). *GDPR Enforcement Tracker Report 2025*. Disponibile su: https://cms.law/en/int/publication/gdpr-enforcement-tracker-report

27. LegalBlink (2025). *Cookie Law guida 2025*. Disponibile su: https://legalblink.it/post/cookie-law-2025.html

28. ICLG (2025). *Trade Marks Laws and Regulations Report 2025-2026: Italy*. Disponibile su: https://iclg.com/practice-areas/trade-marks-laws-and-regulations/italy

---

> **⚠️ DISCLAIMER FINALE**
> Questo documento è stato redatto a **scopo informativo e accademico** come parte di un progetto di tesi.
> **Non costituisce parere legale** e non sostituisce la consulenza di un professionista qualificato.
> Le normative citate sono soggette a modifiche e aggiornamenti. Si raccomanda di verificare sempre la normativa vigente e di consultare un avvocato specializzato prima di prendere decisioni operative.