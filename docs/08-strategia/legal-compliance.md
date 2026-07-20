> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri  
> **Stack:** Next.js 14+ (frontend) + Symfony 7.4 + PostgreSQL 16 self-hosted (VPS Hetzner EU)  
> _Documento aggiornato: luglio 2026. Versione Supabase archiviata in `docs/_archivio-supabase/legal-compliance-supabase.md`_

---

# Legal & Compliance — Styll

> **⚠️ DISCLAIMER**
> Questo documento è redatto a **scopo informativo e accademico** nell'ambito di un progetto di tesi.
> **Non sostituisce in alcun modo la consulenza legale professionale** di un avvocato o di un consulente specializzato in diritto digitale, privacy e proprietà intellettuale.

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
14. [Riscontri per il progetto Styll](#14-riscontri-per-il-progetto-styll)
15. [Fonti](#15-fonti)

---

## 1. Introduzione e disclaimer

**Styll** è una piattaforma **SaaS verticale per barbieri** con architettura **multi-tenant**, modello **B2B2C**, focalizzata sulla **retention** e sulla **gamification della loyalty**.

### Caratteristiche rilevanti per la compliance

| Aspetto | Dettaglio |
|---------|-----------|
| **Tipo di dati trattati** | Dati personali (nome, telefono, email), dati di prenotazione, dati di pagamento, dati di loyalty/gamification, note CRM, storico visite, preferenze cliente, punteggi comportamentali (VIP Score, churn detection) |
| **Mercato di riferimento** | Italia (primario), UE (scalabilità futura) |
| **Modello di business** | B2B2C — SaaS venduto ai barbieri (B2B) che lo usano con i propri clienti finali (B2C) |
| **Stack tecnologico** | Next.js 14+ con App Router, TypeScript (frontend), Symfony 7.4 + API Platform (backend REST), PostgreSQL 16 self-hosted su VPS Hetzner Frankfurt (UE), PWA |
| **Integrazioni** | Google Business Profile (OAuth 2.0), Instagram, WhatsApp, SMS, Apple Pay, pagamenti online |
| **Pagamenti** | Abbonamento SaaS + % sulle transazioni (2,5–2,9%), hardware (card reader) |
| **White-label** | Ogni barbiere ha la propria app brandizzata (subdomain, colori, logo) |
| **Profilazione** | Silent Churn Detector, VIP Score, No-show Prediction AI, reward personalizzati |

---

## 2. Panoramica normativa

### Normative applicabili a Styll

| Normativa | Ambito | Applicabilità a Styll |
|-----------|--------|----------------------|
| **GDPR** (Reg. EU 2016/679) | Trattamento dati personali UE | 🔴 Obbligatoria — dati staff e clienti finali dei barbieri |
| **D.Lgs. 196/2003** (Codice Privacy IT) | Integrazione GDPR in Italia | 🔴 Obbligatoria |
| **ePrivacy Directive** / Cookie Law | Cookie e comunicazioni elettroniche | 🔴 Obbligatoria — app PWA usa sessioni e local storage |
| **PCI DSS** | Pagamenti con carta | 🟡 Gestita da Stripe (PCI Level 1) — Styll non tocca i dati carta |
| **Legge 49/2004** | Spamming (SMS/WhatsApp commerciali) | 🔴 Obbligatoria — win-back e reminder richiedono consenso |
| **D.Lgs. 231/2001** | Responsabilità amministrativa enti | 🟢 Monitorare — rilevante dopo costituzione società |
| **Direttiva NIS2** (2022/2555) | Sicurezza informatica operatori essenziali | 🟡 Non applicabile in v1 (PMI sotto-soglia) |

---

## 3. GDPR

### 3.1 — Ruoli GDPR nel modello B2B2C di Styll

```
Styll (Titolare per dati staff) ←→ Barbiere (Titolare per dati clienti finali)
         ↓                                        ↓
   [Sub-responsabili Styll]             [Responsabile del trattamento: Styll]
   Hetzner, Vercel, Stripe, etc.        (Styll tratta dati clienti per conto del barbiere)
```

| Soggetto | Ruolo GDPR | Dati trattati |
|----------|-----------|--------------|
| **Styll** | Titolare | Dati account barbiere (email, nome attività, payment) |
| **Styll** | Responsabile del trattamento | Dati clienti del barbiere (clienti finali: Luca, Roberto) |
| **Barbiere** | Titolare | Dati clienti finali (raccogliti nel suo negozio) |
| **Hetzner Online GmbH** | Sub-responsabile di Styll | VPS hosting (database + backend) |
| **Vercel Inc.** | Sub-responsabile di Styll | Frontend Next.js hosting |
| **Stripe Inc.** | Sub-responsabile di Styll | Pagamenti |
| **MessageBird / Infobip** | Sub-responsabile di Styll | SMS e WhatsApp |
| **Anthropic PBC** | Sub-responsabile di Styll | AI inbox receptionist |

### 3.2 — Basi giuridiche del trattamento

| Categoria di dati | Finalità | Base giuridica (art. 6 GDPR) |
|-------------------|---------|------------------------------|
| Dati account barbiere | Fornitura servizio SaaS | **Contratto** (art. 6.1.b) |
| Dati clienti finali | CRM + booking per conto barbiere | **Legittimo interesse** (art. 6.1.f) |
| Consensi marketing | Win-back, reminder | **Consenso esplicito** (art. 6.1.a) |
| Dati loyalty | Funzionalità gamification | **Contratto** (art. 6.1.b) |
| Log AI e audit | Sicurezza, miglioramento servizio | **Legittimo interesse** (art. 6.1.f) |

### 3.3 — Trasferimenti extra-UE

| Sub-responsabile | Sede | Trasferimento extra-UE | Garanzia |
|-----------------|------|----------------------|---------|
| **Hetzner Online GmbH** | DE (Frankfurt) | ❌ No | VPS in UE — nessun trasferimento |
| **Vercel Inc.** | USA | ⚠️ Edge EU possibile | SCC + Edge Network EU attivo |
| **Stripe Inc.** | USA + Dublin | ⚠️ Minimo | SCC, sede EU operativa |
| **MessageBird** | NL | ❌ No | Sede EU |
| **Anthropic PBC** | USA | ⚠️ Sì | SCC, dati minimizzati nel prompt |
| **Sentry Inc.** | USA | ⚠️ Sì | SCC + data scrubbing (no PII) |

**Nota fondamentale vs versione Supabase:** Con VPS Hetzner (self-hosted), i **dati core** (database PostgreSQL, backup, log backend) non lasciano mai i server Hetzner in Germania/EU. Questo è un vantaggio significativo rispetto al managed service su AWS (che Supabase usava). Il rischio di trasferimento extra-UE è limitato ai servizi ausiliari (Vercel, Anthropic, Sentry).

### 3.4 — Diritti degli interessati

| Diritto | Art. GDPR | Implementazione tecnica |
|---------|-----------|------------------------|
| **Accesso** | Art. 15 | API endpoint `GET /api/clients/{id}/export` — JSON completo |
| **Rettifica** | Art. 16 | Dashboard cliente: modifica profilo self-service |
| **Cancellazione** | Art. 17 | Soft delete + `deleted_at`. Hard delete dopo 30 giorni con cron |
| **Portabilità** | Art. 20 | Export JSON/CSV dei propri dati |
| **Opposizione** | Art. 21 | Opt-out win-back: `client_consents.marketing_consent = false` |
| **Limitazione** | Art. 18 | Flag `churn_opted_out` su `clients` |

### 3.5 — Retention policy

| Categoria dati | Periodo di conservazione | Trigger eliminazione |
|---------------|--------------------------|---------------------|
| Dati staff (account barbiere) | Vita contratto + 5 anni | Cancellazione account |
| Dati clienti finali | 24 mesi dall'ultimo appuntamento | Cron mensile |
| Log prenotazioni | 36 mesi (obbligo fiscale) | Cron annuale |
| Log messaggi (`messages_log`) | 24 mesi | Cron mensile |
| Log AI (`inbox_ai_runs`) | 12 mesi | Cron mensile |
| Audit log | 36 mesi | Archiviazione compresso |

---

## 4. Privacy Policy

### 4.1 — Struttura minima richiesta

La Privacy Policy di Styll deve includere (art. 13-14 GDPR):

1. **Identità del titolare**: Styll SaaS (ragione sociale da definire), indirizzo, email DPO
2. **Categorie di dati**: personali, comportamentali, tecnici (IP, user agent)
3. **Finalità e basi giuridiche**: per ogni categoria (vedi sezione 3.2)
4. **Sub-responsabili**: lista aggiornata (sezione 3.3)
5. **Diritti degli interessati**: con link/procedura per esercitarli
6. **Conservazione**: tabella retention (sezione 3.5)
7. **Trasferimenti extra-UE**: per i sub-responsabili con sede US
8. **Cookie**: link alla Cookie Policy separata

### 4.2 — Privacy Policy specifica per barbieri (DPA)

Il barbiere firma un **Data Processing Agreement (DPA)** che definisce:
- Styll come responsabile del trattamento dei dati dei clienti finali del barbiere
- Obblighi di sicurezza di Styll (encryption, backup, access control)
- Procedura di notifica violazione dati (72h a Styll → 72h al barbiere → autorità)
- Diritto di audit del barbiere sui sistemi Styll
- Subappalto ai sub-responsabili approvati (lista in sezione 3.3)

---

## 5. Terms of Service

### 5.1 — Clausole chiave per Styll

| Sezione | Contenuto |
|---------|-----------|
| **Definizioni** | "Servizio", "Tenant" (il barbiere), "Utente finale" (cliente del barbiere), "Dati del Servizio" |
| **Account e accesso** | 1 account per attività, credenziali non trasferibili, notifica immediata di compromissione |
| **Uso accettabile** | No spam, no scraping, no rivendita accesso, no dati falsi |
| **Pagamento** | Abbonamento mensile prepagato, nessun rimborso per mese iniziato, trial 14 giorni |
| **Dati e proprietà** | Il barbiere è proprietario dei dati dei suoi clienti. Styll ha licenza limitata per erogare il servizio |
| **Uptime SLA** | 99% mensile (VPS Hetzner SLA 99.9% + margine). Credito proporzionale se sotto SLA |
| **Limitazione responsabilità** | Esclusione danni indiretti. Cap: 12 mesi di canone pagato |
| **Risoluzione** | 30 giorni di preavviso. Export dati disponibile 90 giorni dopo risoluzione |
| **Legge applicabile** | Legge italiana. Foro: Vicenza (o accordo parti) |

---

## 6. Cookie Policy e consent

### 6.1 — Categorie cookie

| Categoria | Consenso richiesto | Cookie usati |
|-----------|-------------------|--------------|
| **Tecnici strettamente necessari** | ❌ No (solo informativa) | JWT token (localStorage), CSRF token, preferenze UI, lingua (`locale`) |
| **Analitici (anonimizzati)** | ⚠️ Sì con banner | PostHog (se attivato) — dati aggregati, no cross-site |
| **Marketing/remarketing** | ⚠️ Sì con banner | Solo se Styll attiva ads pixel (opzionale, non in v1) |

**Nota:** L'app è una PWA con autenticazione JWT — usa `localStorage` e `sessionStorage`, non cookie di sessione tradizionali. Il consenso cookie classico si applica solo ai cookie analytics.

### 6.2 — Implementazione consent

- Banner CMP (Consent Management Platform) al primo accesso
- Gestione preferenze sempre accessibile (icona in footer PWA)
- Consenso registrato in `client_consents.cookie_analytics_consent` con timestamp

---

## 7. Pagamenti e PCI DSS

### 7.1 — Modello di pagamento

Styll usa **Stripe Connect** per gestire due flussi:

1. **Abbonamento SaaS** (Stripe Billing): il barbiere paga Styll mensilmente
2. **Pagamenti in-app v2** (Stripe Connect Standard): i clienti finali pagano il barbiere; Styll trattiene una % di piattaforma

### 7.2 — PCI DSS compliance

| Aspetto | Implementazione |
|---------|----------------|
| **Nessun dato carta su Styll** | Stripe Hosted Fields / Payment Element — i dati carta non toccano mai i server Styll |
| **PCI Level 1** | Stripe è certificato PCI DSS Level 1 — copre la parte pagamenti |
| **Styll** | SAQ A (Self Assessment Questionnaire A) — il livello più semplice, per chi usa payment page hosted |
| **Webhook** | Verifica firma `Stripe-Signature` su ogni webhook (HMAC-SHA256) |

---

## 8. Proprietà intellettuale

| Asset | Proprietà | Protezione |
|-------|-----------|-----------|
| **Codice sorgente Styll** | Styll (Tommaso Vezzaro) | Copyright automatico. Valutare licenza privata o BSL |
| **Brand "Styll"** | Styll | Registrazione marchio EUIPO consigliata (classe 42: SaaS) |
| **Database clienti** | Barbiere (per i suoi clienti) | Proprietà del barbiere — Styll ha licenza limitata per il servizio |
| **Template social** | Styll (layout) + barbiere (contenuto) | Copyright Styll sul template, diritti derivati al barbiere |
| **Librerie open source** | Varie | MIT (Next.js, React), MIT (Symfony: MIT), Apache 2.0 — compatibili con SaaS proprietario |

**Licenze open source usate:**
- Next.js: MIT ✅
- React: MIT ✅
- Symfony: MIT ✅
- API Platform: MIT ✅
- Doctrine ORM: MIT ✅
- `lexik/jwt-authentication-bundle`: MIT ✅
- `dunglas/mercure`: AGPL-3.0 ⚠️ — verificare implicazioni per il server Mercure (self-hosted = OK, no copyleft issue)
- PostgreSQL: PostgreSQL License (BSD-like) ✅

---

## 9. Contratti e SLA

### 9.1 — Contratti necessari

| Contratto | Con chi | Quando |
|-----------|---------|--------|
| **Terms of Service + DPA** | Con ogni barbiere (tenant) | Prima del primo utilizzo |
| **DPA sub-responsabile** | Hetzner, Stripe, MessageBird, Anthropic | Prima del go-live |
| **Contratti staff** | Eventuali dipendenti/consulenti | All'assunzione |
| **NDA** | Beta tester | Prima dell'accesso alla piattaforma |

### 9.2 — SLA Styll

| Metrica | Target | Misurazione |
|---------|--------|------------|
| **Uptime mensile** | 99% | Hetzner + monitoring healthcheck.io |
| **Tempo risposta API p95** | < 500ms | Sentry Performance / Symfony Profiler |
| **Tempo risposta booking** | < 2s | Lighthouse CI |
| **Notifica incident** | < 1h | Email + status page |
| **Risoluzione incident P1** | < 4h | SLA contrattuale |
| **Backup RTO** | < 4h | Hetzner Snapshot + pg_dump restore test mensile |

---

## 10. Normative specifiche di settore

### 10.1 — Settore barbieri / saloni (Italia)

| Normativa | Applicabilità | Note |
|-----------|--------------|------|
| **CCNL Acconciatura** | No (Styll è SaaS, non gestisce lo staff del barbiere) | Il barbiere gestisce i propri dipendenti |
| **Registro PS** (Pubblica Sicurezza) | No | Styll non raccoglie dati sensibili tipicamente in registro PS |
| **Scontrino fiscale / e-fattura** | ⚠️ Styll v2+ | Se gestisce pagamenti online, l'integrazione con SDI (Sistema di Interscambio) è richiesta |
| **Smaltimento materiali** | No | Styll non gestisce prodotti fisici del barbiere |

### 10.2 — AI e algoritmi (DPIA)

La funzionalità **Silent Churn Detector** e **No-show Prediction AI** costituiscono **profilazione automatizzata** ai sensi dell'art. 22 GDPR. Richiede:

1. **DPIA** (Data Protection Impact Assessment) prima del deployment
2. **Informativa esplicita** al cliente finale (tramite il barbiere)
3. **Opt-out** dalla profilazione (già implementato: `clients.churn_opted_out`)
4. **No decisioni automatizzate con effetti giuridici** — le azioni (win-back) richiedono approvazione esplicita del barbiere

---

## 11. Checklist compliance pre-launch

### 🔴 Obbligatori (blockers)

- [ ] **Privacy Policy** pubblicata in italiano (e inglese se UK/internazionale)
- [ ] **DPA firmato** con ogni sub-responsabile (Hetzner, Stripe, MessageBird/Infobip, Anthropic)
- [ ] **Terms of Service** pubblicati e accettati prima dell'uso (checkbox obbligatorio)
- [ ] **DPA barbiere** — modello pronto da far firmare a ogni tenant
- [ ] **Cookie banner** conforme (solo tecnici necessari senza consenso, analitici con consenso)
- [ ] **Autenticazione sicura** — JWT RS256, HTTPS (TLS 1.3), HSTS header
- [ ] **Rate limiting** su endpoint auth, OTP, booking — `symfony/rate-limiter`
- [ ] **Backup testato** — pg_dump giornaliero + Hetzner Snapshot + restore test

### 🟡 Importanti (entro 30 giorni)

- [ ] **Registro trattamenti** (art. 30 GDPR) compilato
- [ ] **Procedura data breach** documentata (72h GDPR notification)
- [ ] **DPIA** per churn detection e AI inbox receptionist
- [ ] **Nomina DPO** (o valutazione se obbligatoria)
- [ ] **Retribuzione sicura** — CORS (nelmio/cors-bundle), CSP headers, X-Frame-Options
- [ ] **Penetration test** base (OWASP Top 10 self-assessment)

### 🟢 Pianificati (v2)

- [ ] **e-Fattura / SDI** integrazione se pagamenti online
- [ ] **Marchio Styll** — registrazione EUIPO classe 42
- [ ] **Polizza assicurativa** responsabilità civile professionale digitale
- [ ] **Certificazione ISO 27001** (per vendita a enterprise)

---

## 12. Tool per la compliance

| Area | Tool | Costo |
|------|------|-------|
| **Privacy Policy / ToS generazione** | Iubenda, Termly | €129-299/anno |
| **Cookie consent management** | Iubenda, Cookiebot | €129-299/anno |
| **DPA management** | DPA Kit (EU-DSGVO.org), Osano | Gratuito o €199/anno |
| **Sicurezza / Monitoring** | Sentry (errori), PostHog (analytics GDPR-compliant) | Free tier ok per v1 |
| **Vulnerability scanning** | Snyk (dipendenze), OWASP ZAP (web) | Gratuito |
| **Backup testing** | pg_restore + script di test automatizzato | Gratuito (cron) |
| **Status page** | Healthcheck.io, Upptime | Gratuito (open source) |

---

## 13. Case study

### 13.1 — Violazione GDPR: Lesson Learned

**Caso British Airways (2019)** — €22M di multa per breach di 500K utenti.
- **Lezione per Styll**: Implementare alerting su accessi anomali (es. >100 query su `clients` in 1 minuto da un singolo IP) via Symfony event listener + Sentry.

**Caso Clearview AI (2022)** — Multato in Italia €20M per scraping volti.
- **Lezione per Styll**: La profilazione AI (churn detector) richiede base giuridica esplicita e DPIA. Non assumere che "serve alla piattaforma" sia sufficiente.

**Caso Doctolib (2021)** — Violazione data sharing con AWS US senza adeguate garanzie.
- **Lezione per Styll**: Configurare tutti i sub-responsabili con SCC firmate. Con VPS Hetzner EU i dati core non lasciano l'UE — vantaggio architetturale rispetto a servizi managed US.

---

## 14. Riscontri per il progetto Styll

### 14.1 — Punti di forza compliance

| Aspetto | Valutazione |
|---------|------------|
| **Tabella `client_consents`** | ✅ Granulare, con timestamp e tipo consenso |
| **Soft delete con `deleted_by`** | ✅ Audit trail per GDPR art. 17 |
| **UUID non incrementali** | ✅ Impossibile enumerare clienti di altri tenant |
| **VPS EU (Hetzner Frankfurt)** | ✅ Nessun trasferimento extra-UE per dati core |
| **TenantFilter fail-closed** | ✅ Zero row leakage se JWT assente |
| **`churn_opted_out` su clients** | ✅ Opt-out dalla profilazione già implementato |

### 14.2 — Rischi da gestire

| Rischio | Gravità | Mitigazione |
|---------|---------|-------------|
| **Multi-tenant isolation** | 🔴 Alta | TenantFilter + test suite (12/12 ✅) + audit annuale |
| **Data residency sub-responsabili** | 🟡 Media | SCC con Vercel, Anthropic, Sentry. Dati core su Hetzner EU |
| **AI profilazione senza DPIA** | 🔴 Alta | DPIA obbligatoria prima del deploy churn detector + AI inbox |
| **Backup non testato** | 🔴 Alta | Cron pg_dump + test restore mensile |
| **OTP clienti** | 🟡 Media | DECISIONE DA CONFERMARE — implementazione custom o bundle |
| **ePrivacy / Cookie** | 🟡 Media | Banner CMP prima del lancio pubblico |

### 14.3 — Azioni prioritarie

1. 🔴 Implementare DPA con Hetzner, Stripe, MessageBird, Anthropic
2. 🔴 Redigere Privacy Policy + ToS + DPA barbieri
3. 🔴 Completare DPIA per churn detector e AI inbox
4. 🟡 Implementare rate limiting con `symfony/rate-limiter`
5. 🟡 Configurare CSP, HSTS, X-Frame-Options in Nginx
6. 🟡 Impostare cron pg_dump + test restore mensile

---

## 15. Fonti

1. Garante Privacy (2026). *Violazioni e sanzioni GDPR — Report annuale*
2. European Data Protection Board (2025). *Guidelines on Data Transfers*
3. Stripe Inc. (2026). *PCI Compliance Guide*. stripe.com/docs/security/guide
4. Hetzner Online GmbH (2026). *Data Processing Agreement*. hetzner.com/legal/privacy
5. Dunglas, K. (2024). *API Platform — Security Best Practices*. api-platform.com/docs/core/security
6. OWASP Foundation (2025). *OWASP Top 10 2025*. owasp.org/Top10
7. Iubenda (2026). *Privacy Policy Generator per SaaS*. iubenda.com
