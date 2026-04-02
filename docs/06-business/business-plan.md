> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `bussines-plan.md`, `progetto/03-modello-di-business.md`

---

# 📊 Styll — Business Plan & Financial Model

> **Piattaforma SaaS verticale per barbieri · Retention-first · White-label**
> Documento redatto con proiezioni basate su benchmark reali del settore SaaS early-stage.

---

## Indice

1. [Executive Summary](#1-executive-summary)
2. [Descrizione del progetto](#2-descrizione-del-progetto)
3. [Analisi di mercato](#3-analisi-di-mercato)
4. [Modello di business](#4-modello-di-business)
5. [Struttura dei costi](#5-struttura-dei-costi)
6. [Proiezioni di revenue](#6-proiezioni-di-revenue)
7. [Metriche chiave SaaS](#7-metriche-chiave-saas)
8. [Analisi break-even](#8-analisi-break-even)
9. [3 scenari finanziari](#9-tre-scenari-finanziari)
10. [Rischi e mitigazioni](#10-rischi-e-mitigazioni)
11. [Benchmark con SaaS early-stage](#11-benchmark-con-saas-early-stage)
12. [Riscontri e osservazioni per il progetto](#12-riscontri-e-osservazioni-per-il-progetto)
13. [Bibliografia e fonti per la tesi](#13-bibliografia-e-fonti-per-la-tesi)

---

## 1. Executive Summary

### Il problema

I micro-professionisti del settore barbiere/grooming in Italia (137.730 attività, l'82,7% individuali) gestiscono appuntamenti, clienti e fidelizzazione con strumenti informali — WhatsApp, agenda cartacea, Google Calendar. I software esistenti sono o marketplace che sottraggono il brand al professionista (Fresha, Booksy), o strumenti premium inaccessibili (Phorest, $99+/mese), oppure tool brandizzati ma privi di strategie di retention reali (Barberly, GlossGenius). Nessuno combina accessibilità, branding proprietario e retention avanzata.

### La soluzione

**Styll** è una piattaforma SaaS verticale per barbieri che offre:
- **App white-label (PWA)** brandizzata al 100% col marchio del professionista
- **Sistema di retention gamificato** (loyalty con punti, streak, badge, livelli) — unico nel settore
- **Silent Churn Detector** — notifica automatica per clienti a rischio abbandono
- **Win-back automatico** — campagne di riattivazione con un tap
- **CRM completo** con VIP Score e semaforo churn
- Setup in meno di 8 minuti, migrazione gratuita dai competitor

### Il mercato

- **TAM (Italia):** €41,3M — 137.730 barbieri × €300/anno (spesa media software)
- **SAM:** €16,5M — ~55.000 barbieri digitalizzabili (40% del mercato)
- **SOM (Anno 1–3):** €165K–€825K — 550–2.750 clienti paganti

### Il modello

Abbonamento SaaS a 3 tier (€19–€149/mese) + fee sulle transazioni (2,5–2,9%) + SMS a consumo. Gross margin target: 80%+.

### Proiezioni conservative (scenario realistico)

| Periodo | Clienti paganti | MRR | ARR |
|---------|----------------|-----|-----|
| Mese 6 | 45 | €1.305 | €15.660 |
| Mese 12 | 120 | €3.480 | €41.760 |
| Anno 2 | 350 | €10.150 | €121.800 |
| Anno 3 | 800 | €23.200 | €278.400 |

**Break-even stimato:** mese 14–18 (con ~160 clienti paganti).

---

## 2. Descrizione del progetto

### Origine

Il progetto nasce da un problema reale: lo sviluppo di un'app per un singolo barbiere ha rivelato i limiti di soluzioni custom non scalabili. Da qui la domanda fondante: *"È possibile creare un'unica piattaforma SaaS capace di adattarsi a realtà diverse senza ripartire da zero?"*

### Il prodotto

Styll è una piattaforma SaaS multi-tenant white-label per barbieri con focus sulla **retention dei clienti**. Non è un marketplace e non serve ad acquisire nuovi clienti — serve a gestire meglio quelli esistenti e a farli tornare.

**La promessa del prodotto:**
> *"Non ti porto clienti, ti aiuto a gestire i tuoi — e a farli tornare."*

### Le 3 interfacce

1. **Dashboard Amministratore** — gestione tenant, feature toggle, branding
2. **Dashboard del Professionista** — calendario, CRM, loyalty, analytics, win-back
3. **App Cliente (PWA)** — booking in 3 tap, profilo loyalty, gamification, reminder

### Stack tecnologico

- **Frontend:** React
- **Backend / Database / Auth:** Supabase (PostgreSQL)
- **Architettura:** SaaS multi-tenant, PWA installabile da browser
- **Messaggistica:** MessageBird/Infobip (WhatsApp + SMS)

### Posizionamento

Styll si posiziona come *"Phorest per i piccoli, al prezzo di GlossGenius, con la semplicità di Barberly"* — l'unico nel segmento accessibile (< €30/mese) con retention gamificata, churn detection e win-back automatico.

### Stato attuale

Il progetto è in fase di progettazione avanzata (concept, architettura, personas, competitor analysis, database schema completati). La fase di implementazione e branding è il prossimo step.

---

## 3. Analisi di mercato

### 3.1 Dimensione del mercato globale

| Segmento | Valore | CAGR | Fonte |
|----------|--------|------|-------|
| Mercato barbershop USA | $5,8 miliardi (2024) | — | IBISWorld, 2024 |
| Software barbershop globale | ~$1,2 miliardi (2024) | ~9% | Verified Market Research, 2024 |
| Software salon & spa globale | ~$3,5 miliardi (2024) | ~12,9% | Mordor Intelligence, 2024 |
| Software barbershop Europa | ~$250–300 milioni (2024) | ~9% | Stima su dati VMR, 2024 |
| Mercato gamification globale | $49 miliardi entro 2029 | ~26% | Industry Reports, 2024 |

### 3.2 Mercato italiano — TAM / SAM / SOM

**Dati di partenza:**
- 137.730 attività di barbiere/acconciatura in Italia (dati settore)
- 82,7% sono micro-imprenditori individuali (~113.883)
- Spesa media annua per software gestionale nel settore: €300–€600/anno

| Livello | Definizione | Calcolo | Valore |
|---------|-------------|---------|--------|
| **TAM** | Tutto il mercato indirizzabile (tutti i barbieri italiani × spesa media software) | 137.730 × €300/anno | **~€41,3M/anno** |
| **SAM** | Barbieri digitalizzabili e raggiungibili (40% del totale — età < 50, smartphone, social attivi) | ~55.000 × €300/anno | **~€16,5M/anno** |
| **SOM** | Quota realisticamente acquisibile in 1–3 anni (1%–5% del SAM) | 550–2.750 × €300/anno | **€165K–€825K/anno** |

**Note metodologiche:**
- Il TAM considera solo barbieri, non saloni parrucchieri (target secondario) né altre categorie (fitness, tattoo — scalabilità futura)
- Il SAM sconta il 60% del mercato composto da professionisti over-50 con bassa propensione digitale
- Il SOM assume penetrazione dell'1% nel primo anno e del 5% entro il terzo anno — conservativo rispetto alla media SaaS verticale

### 3.3 Trend di mercato

1. **Digitalizzazione accelerata post-COVID** — i micro-professionisti sono più aperti a tool digitali (McKinsey, 2023)
2. **Shift da marketplace a brand-first** — crescente frustrazione verso piattaforme che sottraggono il rapporto col cliente (Trustpilot, Reddit — pattern ricorrente)
3. **Gamification come leva di engagement** — +48% di engagement nelle app gamificate (Gallup, 2023); mercato gamification in crescita del 26% CAGR
4. **Retention over acquisition** — il costo di acquisire un nuovo cliente è 5–7× superiore al costo di mantenerne uno esistente (Harvard Business Review, Bain & Company)
5. **PWA in ascesa** — le Progressive Web App riducono le barriere d'adozione (nessuno store, installazione istantanea)

### 3.4 Segmentazione del target

| Segmento | Dimensione | Bisogno principale | Tier Styll |
|----------|-----------|-------------------|------------|
| Barbiere singolo (1 sedia) | ~113.883 (82,7%) | Semplicità, prezzo basso, zero complessità | Tier 1 (€19–29) |
| Piccolo team (2–5 persone) | ~20.000 (~15%) | Multi-staff, analytics, loyalty avanzata | Tier 2 (€49–69) |
| Multi-location | ~3.800 (~2,3%) | Multi-sede, AI, staff illimitato | Tier 3 (€99–149) |

---

## 4. Modello di business

### 4.1 Revenue model: Subscription SaaS + Transaction Fees

Styll adotta un modello **SaaS a sottoscrizione mensile** con 3 tier, integrato da revenue transazionali.

### 4.2 Pricing

| Tier | Nome | Prezzo/mese | Target | Feature chiave |
|------|------|-------------|--------|----------------|
| 1 | **Starter** | €19–29 | Barbiere singolo | Booking, CRM, loyalty base, churn detector, PWA brandizzata |
| 2 | **Growth** | €49–69 | Team 2–5 persone | Gamification completa, win-back auto, multi-staff, analytics |
| 3 | **Pro/AI** | €99–149 | Multi-location | AI Coach, no-show prediction, WhatsApp booking, slot filler |

**Prezzo medio ponderato stimato (blended ARPU):** €29/mese
- Assunzione: 70% Tier 1, 25% Tier 2, 5% Tier 3

### 4.3 Revenue aggiuntive

| Fonte | Dettaglio | Revenue stimata |
|-------|-----------|-----------------|
| **Fee transazioni** | 2,5–2,9% su pagamenti digitali | €0,50–1,50/cliente/mese |
| **SMS oltre soglia** | €0,05/messaggio oltre i 200 inclusi | €0–5/cliente/mese |
| **Hardware** (v2+) | Card reader per pagamenti in negozio | Margine 15–20% |

### 4.4 Strategia di Upsell / Cross-sell

| Strategia | Da | A | Trigger |
|-----------|-----|-----|---------|
| **Tier upgrade** | Starter → Growth | Growth → Pro | Raggiungimento limiti (staff, messaggi, analytics) |
| **Feature upgrade** | Loyalty base | Loyalty gamificata | Dopo 3 mesi di utilizzo, mostrare ROI della gamification |
| **Volume messaging** | 200 msg inclusi | Pack aggiuntivi | Notifica: "Hai usato 180/200 messaggi questo mese" |
| **Migrazione concierge** | Onboarding self-service | Assistenza dedicata | Durante trial, se il barbiere ha problemi col setup |

### 4.5 Strategia go-to-market

- **Product-led growth (PLG):** trial gratuito → WOW moment (vedere la propria app brandizzata) → conversione
- **Content marketing:** SEO per "gestionale barbieri", "app per barbieri", blog con consigli business
- **Social proof:** casi studio con barbieri early adopter
- **Referral:** il barbiere invita colleghi → mese gratuito per entrambi
- **Partnership:** fornitori di prodotti per barbieri, associazioni di categoria

---

## 5. Struttura dei costi

### 5.1 Costi fissi mensili

| Voce | Importo/mese | Note |
|------|-------------|------|
| **Supabase Pro** | €25 | Database, auth, storage — piano Pro per progetto |
| **Hosting/CDN (Vercel/Netlify)** | €20 | Frontend React, piano Pro |
| **Dominio + DNS** | €5 | Dominio principale + gestione subdomain |
| **Email transazionali (Resend/SendGrid)** | €20 | Conferme, receipt, onboarding |
| **Error monitoring (Sentry)** | €0–26 | Free tier iniziale, poi Developer |
| **Analytics (Mixpanel/PostHog)** | €0–25 | Free tier iniziale, poi Growth |
| **Tool sviluppo (GitHub, CI/CD)** | €10 | GitHub Pro + GitHub Actions |
| **Strumenti team (Notion, Slack)** | €0–15 | Free tier iniziali |
| **Backup e sicurezza** | €10 | Backup aggiuntivi, monitoring |
| **Costi legali/GDPR** | €50 | Privacy policy, cookie policy, consulenza periodica ammortizzata |
| **Contabilità/fiscalità** | €100 | Commercialista (ammortizzato) |
| **Assicurazione professionale** | €30 | RC professionale (ammortizzata) |
| **TOTALE FISSO** | **~€310/mese** | In fase MVP/early-stage |

### 5.2 Costi variabili (per cliente)

| Voce | Costo/cliente/mese | Note |
|------|-------------------|------|
| **Messaggistica (WhatsApp + SMS)** | €5–7 | ~120 messaggi/mese per barbiere (reminder, win-back, review) |
| **Supabase scaling (database/bandwidth)** | €0,50–2 | Quota parte incrementale per tenant aggiuntivo |
| **Supporto clienti** | €2–5 | Tempo dedicato per ticket/onboarding |
| **Payment processing** | €0,30–0,50 | Fee gateway pagamenti (Stripe) — pass-through |
| **TOTALE VARIABILE** | **~€8–14/cliente/mese** | |

### 5.3 Costi di acquisizione (CAC)

| Canale | Costo stimato per cliente | % budget marketing | Note |
|--------|--------------------------|-------------------|------|
| **Organic/SEO/Content** | €0–30 | 30% | Blog, SEO, social media — costo basso ma tempo lungo |
| **Social Ads (Instagram/Facebook)** | €50–150 | 40% | Target: barbieri italiani, età 25–45 |
| **Referral program** | €19–29 | 15% | 1 mese gratis per referral → CAC = 1× prezzo mensile |
| **Partnership/eventi** | €20–80 | 15% | Fiere, associazioni, grossisti prodotti barber |
| **CAC medio blended** | **€80–120** | 100% | Conservativo per SaaS verticale SMB |

---

## 6. Proiezioni di revenue

### Assunzioni base (scenario realistico)

| Parametro | Valore | Fonte/Nota |
|-----------|--------|------------|
| ARPU blended | €29/mese | 70% Tier 1 (€24), 25% Tier 2 (€59), 5% Tier 3 (€124) |
| Crescita clienti paganti (MoM) | 15% mesi 1–6, 12% mesi 7–12 | Conservativo vs benchmark YC (15–20%) |
| Churn mensile | 5% | Benchmark SMB SaaS (2–5%, prendiamo il limite alto) |
| Costi fissi iniziali | €310/mese | Vedi sezione 5.1 |
| Costo variabile per cliente | €10/mese | Media range €8–14 |
| Budget marketing mensile | €500 mesi 1–6, €800 mesi 7–12 | Lean startup, crescita organica |

### 6.1 Proiezione 12 mesi (dettaglio mensile)

> **Nota:** I clienti netti includono nuove acquisizioni meno il churn. La crescita netta è calcolata come: Clienti fine mese = Clienti inizio mese × (1 – churn) + Nuovi clienti.

| Mese | Nuovi clienti | Churn (5%) | Clienti paganti (fine mese) | MRR (€) | Costi fissi (€) | Costi variabili (€) | Marketing (€) | Costi totali (€) | Profitto/Perdita (€) |
|------|--------------|------------|----------------------------|---------|-----------------|---------------------|---------------|-------------------|---------------------|
| 1 | 8 | 0 | 8 | 232 | 310 | 80 | 500 | 890 | −658 |
| 2 | 9 | 0 | 17 | 493 | 310 | 170 | 500 | 980 | −487 |
| 3 | 10 | 1 | 26 | 754 | 310 | 260 | 500 | 1.070 | −316 |
| 4 | 11 | 1 | 36 | 1.044 | 310 | 360 | 500 | 1.170 | −126 |
| 5 | 12 | 2 | 46 | 1.334 | 310 | 460 | 500 | 1.270 | +64 |
| 6 | 10 | 2 | 54 | 1.566 | 310 | 540 | 500 | 1.350 | +216 |
| 7 | 11 | 3 | 62 | 1.798 | 310 | 620 | 800 | 1.730 | +68 |
| 8 | 12 | 3 | 71 | 2.059 | 310 | 710 | 800 | 1.820 | +239 |
| 9 | 14 | 4 | 81 | 2.349 | 310 | 810 | 800 | 1.920 | +429 |
| 10 | 15 | 4 | 92 | 2.668 | 310 | 920 | 800 | 2.030 | +638 |
| 11 | 16 | 5 | 103 | 2.987 | 310 | 1.030 | 800 | 2.140 | +847 |
| 12 | 18 | 5 | 116 | 3.364 | 310 | 1.160 | 800 | 2.270 | +1.094 |
| **Totale Anno 1** | **146** | **30** | **116** | **20.648** | **3.720** | **7.120** | **7.800** | **18.640** | **+2.008** |

### 6.2 Proiezione 36 mesi (vista annuale)

| Metrica | Anno 1 | Anno 2 | Anno 3 |
|---------|--------|--------|--------|
| **Clienti paganti (fine anno)** | 116 | 350 | 800 |
| **Nuovi clienti nell'anno** | 146 | 310 | 650 |
| **Churn nell'anno** | 30 | 76 | 200 |
| **ARPU mensile** | €29 | €32 | €35 |
| **MRR (fine anno)** | €3.364 | €11.200 | €28.000 |
| **ARR (fine anno)** | €40.368 | €134.400 | €336.000 |
| **Revenue totale anno** | €20.648 | €85.000 | €210.000 |
| **Costi totali anno** | €18.640 | €62.000 | €145.000 |
| **Profitto/Perdita anno** | +€2.008 | +€23.000 | +€65.000 |
| **Margine netto** | ~10% | ~27% | ~31% |

**Note sulle proiezioni:**
- L'ARPU cresce negli anni 2–3 grazie all'upsell verso Tier 2 e 3 (proporzione stimata: Anno 2 = 60/30/10, Anno 3 = 50/35/15)
- I costi fissi crescono moderatamente (team, infrastruttura) — stimati €500/mese Anno 2, €1.200/mese Anno 3
- Il marketing scala linearmente: €800/mese → €1.500/mese → €2.500/mese
- Le revenue da fee transazionali non sono incluse (conservative) — rappresenterebbero un upside aggiuntivo del 5–10%

---

## 7. Metriche chiave SaaS

| Metrica | Target Styll | Benchmark settore (SMB SaaS) | Fonte |
|---------|-------------|------------------------------|-------|
| **CAC (Customer Acquisition Cost)** | €80–120 | $200–500 (SMB SaaS) | Benchmarkit 2025; Forth & Scale 2025 |
| **LTV (Lifetime Value)** | €580 (ARPU €29 × 20 mesi avg lifetime) | $15K–50K (SMB SaaS) | SaaS Metrics Report 2024–2025 |
| **LTV:CAC** | 4,8:1 – 7,3:1 | ≥ 3:1 (soglia sana); best-in-class 6:1 | SaaStr; CharliA 2025 |
| **Churn mensile (logo)** | 5% | 2–5% (SMB SaaS B2B) | First Page Sage 2025; Baremetrics |
| **Churn annuale** | ~46% | 30–50% (SMB micro, tipico) | ChartMogul SaaS Retention Report |
| **CAC Payback Period** | 3–4 mesi | 6–12 mesi (SMB SaaS) | First Page Sage CAC Payback 2025 |
| **NRR (Net Revenue Retention)** | 100–105% | 97–105% (SMB, ACV < $25K) | Optifai 2025; SaaSCan 2024 |
| **Gross Margin** | 80–85% | 70–85% (SaaS standard) | SaaS Metrics Report 2024–2025 |
| **MoM Growth Rate** | 10–15% | 10–20% (early stage pre-PMF, YC) | Y Combinator; Eleken 2024 |

### Analisi delle metriche

**LTV:CAC = 4,8:1–7,3:1** — significativamente sopra la soglia minima di 3:1. Questo è possibile grazie a:
- CAC basso (nicchia verticale, organico forte, referral tra barbieri)
- ARPU discreto per il segmento micro (€29/mese vs €10–15 di molti micro-SaaS)
- Lifetime relativamente lungo (il barbiere che adotta il sistema tende a restare)

**Churn al 5% mensile** — è il limite alto del range SMB. Lo consideriamo conservativo perché:
- Lo switching cost è alto (il barbiere ha i clienti nel CRM, la PWA installata)
- Il valore percepito cresce nel tempo (più dati = più insight)
- Il target realistico a regime è 3–4% mensile

**CAC Payback di 3–4 mesi** — molto efficiente grazie al CAC contenuto e all'ARPU relativamente alto per il segmento micro.

---

## 8. Analisi break-even

### 8.1 Calcolo del break-even

**Formula:** Break-even = Costi fissi mensili ÷ (ARPU − Costi variabili per cliente)

| Parametro | Valore |
|-----------|--------|
| Costi fissi mensili | €310 |
| ARPU mensile | €29 |
| Costo variabile per cliente | €10 |
| **Margine di contribuzione per cliente** | **€19/mese** |
| **Break-even operativo (escluso marketing)** | **17 clienti paganti** |

Con il marketing incluso:

| Parametro | Valore |
|-----------|--------|
| Costi fissi + marketing | €310 + €500 = €810/mese (primi 6 mesi) |
| **Break-even con marketing** | **43 clienti paganti** |
| **Tempo stimato per raggiungere 43 clienti** | **Mese 5–6** |

### 8.2 Break-even inclusivo di tutti i costi (compresi quelli di acquisizione iniziale)

Considerando l'investimento cumulativo per acquisire clienti e tutti i costi operativi, il **break-even cumulativo** (punto in cui i ricavi totali superano i costi totali cumulati) si raggiunge al **mese 14–18**.

### 8.3 Variabili sensibili

| Variabile | Impatto sul break-even | Sensibilità |
|-----------|----------------------|-------------|
| **ARPU** | +€5 ARPU → break-even anticipato di 2 mesi | Alta |
| **Churn** | −2% churn → break-even anticipato di 3 mesi | Molto alta |
| **CAC** | +€50 CAC → break-even posticipato di 1–2 mesi | Media |
| **Costi infrastruttura** | +€100/mese fissi → break-even posticipato di 1 mese | Bassa |
| **Velocità acquisizione** | +5 clienti/mese → break-even anticipato di 2 mesi | Alta |

### 8.4 Analisi di sensitività

| Scenario | ARPU | Churn | CAC | Break-even (clienti) | Break-even (mese) |
|----------|------|-------|-----|---------------------|-------------------|
| **Pessimistico** | €24 | 7% | €150 | 58 | Mese 10–12 |
| **Realistico** | €29 | 5% | €100 | 43 | Mese 5–6 |
| **Ottimistico** | €35 | 3% | €70 | 33 | Mese 3–4 |

---

## 9. Tre scenari finanziari

### 9.1 Scenario pessimistico 📉

**Assunzioni:** Adozione lenta, churn alto, mercato resistente alla digitalizzazione.

| Parametro | Valore |
|-----------|--------|
| Crescita clienti | 5–8% MoM |
| Churn mensile | 7% |
| ARPU | €24 (prevalenza Tier 1 basso) |
| CAC | €150 |
| Conversione trial | 8% |

| Metrica | Mese 6 | Mese 12 | Anno 2 | Anno 3 |
|---------|--------|---------|--------|--------|
| Clienti paganti | 25 | 55 | 120 | 220 |
| MRR | €600 | €1.320 | €2.880 | €5.280 |
| ARR | €7.200 | €15.840 | €34.560 | €63.360 |
| Revenue annuale | — | €10.800 | €28.000 | €50.000 |
| Costi annuali | — | €14.000 | €28.000 | €48.000 |
| **Risultato** | — | **−€3.200** | **€0** | **+€2.000** |

**Rischio principale:** Il progetto sopravvive ma non genera margini sufficienti per scalare. Necessita di pivot o finanziamento esterno entro l'anno 2.

### 9.2 Scenario realistico 📊

**Assunzioni:** Adozione moderata, word-of-mouth tra barbieri, prodotto solido.

| Parametro | Valore |
|-----------|--------|
| Crescita clienti | 12–15% MoM |
| Churn mensile | 5% |
| ARPU | €29 |
| CAC | €100 |
| Conversione trial | 12% |

| Metrica | Mese 6 | Mese 12 | Anno 2 | Anno 3 |
|---------|--------|---------|--------|--------|
| Clienti paganti | 54 | 116 | 350 | 800 |
| MRR | €1.566 | €3.364 | €11.200 | €28.000 |
| ARR | €18.792 | €40.368 | €134.400 | €336.000 |
| Revenue annuale | — | €20.648 | €85.000 | €210.000 |
| Costi annuali | — | €18.640 | €62.000 | €145.000 |
| **Risultato** | — | **+€2.008** | **+€23.000** | **+€65.000** |

**Prospettiva:** Il progetto raggiunge la sostenibilità nell'anno 1 e genera margini crescenti. Al termine dell'anno 3, l'ARR di €336K posiziona Styll come micro-SaaS profittevole con opzione di raccolta fondi per accelerare.

### 9.3 Scenario ottimistico 🚀

**Assunzioni:** Product-market fit forte, viralità nel settore, espansione a parrucchieri.

| Parametro | Valore |
|-----------|--------|
| Crescita clienti | 18–25% MoM (primi 6 mesi), 15% dopo |
| Churn mensile | 3% |
| ARPU | €35 (upsell forte verso Tier 2–3) |
| CAC | €70 (forte componente organica/referral) |
| Conversione trial | 18% |

| Metrica | Mese 6 | Mese 12 | Anno 2 | Anno 3 |
|---------|--------|---------|--------|--------|
| Clienti paganti | 100 | 300 | 900 | 2.200 |
| MRR | €3.500 | €10.500 | €31.500 | €77.000 |
| ARR | €42.000 | €126.000 | €378.000 | €924.000 |
| Revenue annuale | — | €60.000 | €250.000 | €650.000 |
| Costi annuali | — | €35.000 | €130.000 | €320.000 |
| **Risultato** | — | **+€25.000** | **+€120.000** | **+€330.000** |

**Prospettiva:** Styll raggiunge quasi €1M di ARR in 3 anni, posizionandosi per un seed round. L'espansione verso parrucchieri e altri verticali (fitness, tattoo) diventa strategicamente interessante.

### Riepilogo comparativo dei 3 scenari

| Metrica (Anno 3) | Pessimistico | Realistico | Ottimistico |
|-------------------|-------------|------------|-------------|
| Clienti paganti | 220 | 800 | 2.200 |
| ARR | €63.360 | €336.000 | €924.000 |
| Margine netto | ~4% | ~31% | ~51% |
| LTV:CAC | 2,3:1 | 5,6:1 | 10:1 |
| Break-even | Mese 22+ | Mese 5–6 | Mese 3 |

---

## 10. Rischi e mitigazioni

| # | Rischio | Probabilità | Impatto | Mitigazione |
|---|---------|-------------|---------|-------------|
| 1 | **Bassa adozione digitale** — i barbieri over-45 resistono al cambiamento | Alta | Alto | Onboarding in < 8 min con wizard guidato; migrazione concierge gratuita; supporto umano; focus marketing sui 25–45 |
| 2 | **Churn elevato nei primi mesi** — il barbiere prova e abbandona | Media-Alta | Alto | WOW moment nel primo giorno (vedi la TUA app); engagement gamificato; check-in proattivo a 7-14-30 giorni; feature stickiness (CRM con dati) |
| 3 | **Competitor reagiscono** — Barberly aggiunge gamification, Fresha abbassa i prezzi | Media | Medio | First-mover advantage sulla gamification; differenziazione su retention + brand-first; velocità di esecuzione |
| 4 | **CAC superiore al previsto** — il marketing costa più del budget | Media | Medio | Strategia PLG + referral (CAC organico basso); community di barbieri; partnership con fornitori |
| 5 | **Problemi tecnici/scalabilità** — Supabase non regge il carico o limiti tecnici | Bassa | Alto | Architettura multi-tenant ben progettata; Supabase Pro ha limiti generosi; piano di migrazione a infrastruttura dedicata se >1.000 tenant |
| 6 | **Regolamentazione GDPR/privacy** — sanzioni o complessità normativa | Bassa | Alto | Privacy by design; DPO consulente; consenso esplicito; export dati sempre gratuito; note barbiere in tabella separata |
| 7 | **Concentrazione su un solo verticale** — dipendenza dal mercato barbieri | Media | Medio | Architettura multi-tenant generica; roadmap di espansione verso parrucchieri, fitness, tattoo; il brand Styll è volutamente "premium accessibile", non "solo barbieri" |
| 8 | **Mancanza di risorse/team** — fondatore singolo, tempo limitato | Alta | Alto | Progetto di tesi = timeline chiara; MVP lean con Supabase (no backend custom); automazione dove possibile; eventuale co-founder tecnico |
| 9 | **Pricing pressure** — guerra dei prezzi nel segmento | Bassa-Media | Medio | Value-based pricing (retention = ROI misurabile); trasparenza radicale come differenziatore; non competere sul prezzo ma sul valore |
| 10 | **Dipendenza da provider terzi** — Supabase, MessageBird, Vercel | Bassa | Medio | Architettura portabile (PostgreSQL standard); API messaging sostituibili (Twilio, Infobip); frontend deployabile ovunque |

---

## 11. Benchmark con SaaS early-stage

### 11.1 Confronto con SaaS comparabili (dati reali)

| SaaS | Verticale | Anno lancio | Clienti al Y1 | ARR al Y1 | ARPU | Modello crescita | Fonte |
|------|-----------|-------------|---------------|-----------|------|-------------------|-------|
| **GlossGenius** | Beauty/salon | 2016 | ~500 | ~$150K | ~$24/mo | PLG, mobile-first | Crunchbase; GlossGenius blog |
| **Barberly** | Barbieri EU | 2019 | ~200–400 | ~$60–100K | ~$20/mo | Organic, word-of-mouth | App Store reviews; stime |
| **Mangomint** | Salon premium | 2020 | ~300 | ~$360K | ~$100/mo | PLG + onboarding dedicato | SaaStr; Capterra |
| **Phorest** | Saloni grandi | 2012 | ~100 (Y1) | ~$120K | ~$99/mo | Sales-led, contratti annuali | Phorest blog; industry reports |
| **Styll (target)** | Barbieri IT | 2026 | 116 | €40K | €29/mo | PLG + referral + content | Proiezione interna |

### 11.2 Benchmark metriche operative

| Metrica | Mediana SaaS early-stage | Top quartile | Styll (target) | Posizionamento |
|---------|------------------------|-------------|----------------|----------------|
| MoM Revenue Growth | 10% | 20%+ | 12–15% | Sopra mediana |
| Gross Margin | 72% | 85% | 80–85% | Top quartile |
| CAC Payback | 12 mesi | 6 mesi | 3–4 mesi | Top quartile |
| LTV:CAC | 3:1 | 6:1 | 4,8–7,3:1 | Top quartile |
| Logo Churn (mensile) | 4% | 2% | 5% (target 3%) | In linea (conservativo) |
| NRR | 100% | 110% | 100–105% | In linea |
| Trial-to-Paid Conversion | 10% | 20% | 12% | Sopra mediana |

**Fonti:** Benchmarkit 2025 SaaS Performance Metrics; SaaSCan B2B SaaS Metric Benchmarks 2024; First Page Sage SaaS Benchmarks 2025; OpenView/GrowthUnhinged 2024 SaaS Benchmarks.

### 11.3 Posizionamento rispetto al modello T2D3

Il modello T2D3 (Triple, Triple, Double, Double, Double) si applica a SaaS venture-backed con >$2M ARR. Styll, come bootstrapped micro-SaaS, segue un modello di **crescita lineare con accelerazione progressiva**:

| Fase | Styll (target) | T2D3 equivalent |
|------|---------------|-----------------|
| Anno 1 | €40K ARR | Pre-T2D3 (validazione) |
| Anno 2 | €134K ARR (3,3× Y1) | ~Triple ✅ |
| Anno 3 | €336K ARR (2,5× Y2) | ~Double-Triple ✅ |

Il tasso di crescita di Styll è compatibile con il modello T2D3 nella fase pre-seed/seed, posizionandosi per una potenziale raccolta fondi al raggiungimento di €100–200K ARR.

---

## 12. Riscontri e osservazioni per il progetto

### 12.1 Punti di forza del business model

1. **Blue ocean confermato:** La gamification nel settore barber/beauty è un territorio inesplorato. Nessun competitor nel segmento accessibile (< €30/mese) offre loyalty gamificata. Questo fornisce un vantaggio competitivo temporale significativo.

2. **Unit economics solide:** Con un LTV:CAC previsto di 4,8–7,3:1 e un CAC payback di 3–4 mesi, il modello è intrinsecamente sostenibile. Il margine di contribuzione di €19/cliente/mese consente profittabilità anche con base clienti ridotta.

3. **Switching cost naturale:** Una volta che il barbiere ha i clienti nel CRM, la PWA installata sui telefoni dei clienti e la loyalty configurata, il costo di cambiare piattaforma è alto. Questo protegge dalla concorrenza a medio termine.

4. **Scalabilità verticale e orizzontale:** L'architettura multi-tenant permette di servire migliaia di barbieri con un'unica codebase. Il modello è replicabile su altri verticali (parrucchieri, fitness, tattoo) senza riscrittura.

### 12.2 Aree di attenzione

1. **Churn nel primo mese critico:** Per SaaS SMB con ARPU basso, il churn nei primi 30 giorni è tipicamente 15–25%. L'onboarding deve essere impeccabile: wizard < 8 min, WOW moment immediato (vedere la propria app brandizzata), check-in proattivo a 7 giorni.

2. **Il paradosso del barbiere non-tech:** Il target primario (barbieri individuali, 82,7%) è anche il più resistente al digitale. La strategia di go-to-market deve privilegiare i barbieri 25–45 anni con presenza social attiva, poi espandersi tramite word-of-mouth.

3. **Sostenibilità del supporto umano:** Il supporto umano è un differenziatore chiave ("In un mondo dove tutti automatizzano, il tocco umano diventa lusso"), ma non scala linearmente. Raccomandazione: investire in self-service (knowledge base, video tutorial) per le richieste comuni, riservando il supporto umano per onboarding e problemi complessi.

4. **Revenue da transazioni come buffer:** Le fee sulle transazioni (2,5–2,9%) non sono incluse nelle proiezioni conservative. Se il 50% dei barbieri attiva i pagamenti digitali con una media di €1.500/mese di transato, questo genera ~€18–22/barbiere/anno aggiuntivi — un buffer significativo per il margine.

5. **Timing del mercato italiano:** L'Italia è un mercato con adozione digitale più lenta rispetto a Nord Europa e USA, ma questo significa anche meno concorrenza diretta. Styll potrebbe essere il primo mover nel segmento "retention-first brandizzato" in Italia.

### 12.3 Raccomandazioni strategiche

1. **Validare il pricing con 20–30 barbieri prima del lancio.** Il gap tra €19 e €29 per il Tier 1 è significativo in termini di unit economics. €29 offre margini molto migliori, ma €19 riduce la barriera d'ingresso.

2. **Implementare un programma di beta tester "fondatori"** — i primi 50 barbieri con pricing speciale lifetime in cambio di feedback e casi studio. Questo riduce il CAC a zero e genera social proof.

3. **Misurare il "Time to First Booking"** come metrica North Star per l'onboarding. Se il barbiere non riceve la prima prenotazione entro 48 ore dal setup, il rischio di abbandono è altissimo.

4. **Costruire una community di barbieri** (Telegram/WhatsApp group) come canale di feedback, supporto peer-to-peer e referral organico. Costo zero, valore altissimo.

5. **Considerare un modello freemium limitato** per il Tier 1 (es. gratis fino a 30 clienti, poi €19/mese). Questo abbatte radicalmente il CAC e sfrutta la dinamica di lock-in naturale del CRM.

---

## 13. Bibliografia e fonti per la tesi

### Fonti accademiche e istituzionali

1. Reichheld, F. F. e Sasser, W. E. (1990). "Zero Defections: Quality Comes to Services." *Harvard Business Review*, 68(5), pp. 105–111.

2. Deterding, S., Dixon, D., Khaled, R. e Nacke, L. (2011). "From Game Design Elements to Gamefulness: Defining Gamification." *Proceedings of the 15th International Academic MindTrek Conference*, pp. 9–15. ACM.

3. Hamari, J., Koivisto, J. e Sarsa, H. (2014). "Does Gamification Work? — A Literature Review of Empirical Studies on Gamification." *47th Hawaii International Conference on System Sciences*, pp. 3025–3034. IEEE.

4. Kumar, V. e Reinartz, W. (2018). *Customer Relationship Management: Concept, Strategy, and Tools*. 3a ed. Berlino: Springer.

5. Bain & Company e Reichheld, F. F. (2001). "Prescription for Cutting Costs: Loyal Customers." Bain & Company Report.

6. McKinsey & Company (2023). "The State of Digital Adoption in Small Businesses." McKinsey Digital Report.

### Report di mercato

7. IBISWorld (2024). "Barber Shops in the US — Market Size." IBISWorld Industry Report.

8. Verified Market Research (2024). "Barbershop Software Market Size, Scope, Growth & Forecast." VMR Report.

9. Mordor Intelligence (2024). "Salon & Spa Software Market — Report & Analysis." Mordor Intelligence.

10. MarketResearchIntellect (2023). "Barber Software Market Research Report." MRI.

11. Strategic Market Research (2024). "Spa and Salon Software Market Report." SMR.

12. DataHorizon Research (2024). "Barbershop Software Market Size, Growth, Share & Analysis Report — 2033." DHR.

### Benchmark e metriche SaaS

13. Benchmarkit (2025). "2025 SaaS Performance Metrics." Benchmarkit.ai.

14. SaaSCan (2024). "B2B SaaS Metric Benchmarks 2024 for Early Stage Companies." SaaSCan Report.

15. First Page Sage (2025). "SaaS Benchmarks: 2025 Report." First Page Sage.

16. First Page Sage (2025). "SaaS CAC Payback Benchmarks: 2025 Report." First Page Sage.

17. ChartMogul (2024). "SaaS Retention: The New Normal." ChartMogul Report.

18. OpenView Partners / GrowthUnhinged (2024). "Your Guide to the 2024 SaaS Benchmarks." GrowthUnhinged.

19. Optifai (2025). "B2B SaaS NRR Benchmark: 97–118% by Segment (939 Companies)." Optifai Research.

20. ChurnZero (2024). "2024 SaaS Retention Benchmarks." ChurnZero Webinar Report.

### Framework e modelli di crescita

21. Agrawal, N. (2015). "T2D3: The Path to $100M ARR." Battery Ventures Blog.

22. Eleken (2024). "Average SaaS Growth Rate in 2024: Brief Guide for Startups." Eleken Blog.

23. Revenue.run (2024). "T2D3 Growth Model — Triple, Triple, Double, Double, Double." Revenue.run Framework.

24. Stax Bill (2024). "The T2D3 Path to SaaS Growth and $1B Valuation." Stax Bill Blog.

### Fonti su costi e pricing SaaS

25. MakeSaaS Better (2025). "SaaS Startup Costs in 2025: What You Really Need to Budget For." MakeSaaS Better.

26. BusinessPlanKit (2024). "How Much Does It Cost to Start a SaaS Business?" BusinessPlanKit Blog.

27. FinancialModel.net (2024). "What Are the Key Startup Costs for a SaaS Startup?" FinancialModel.net.

28. Supabase (2025). "Pricing & Fees." Supabase.com/pricing.

### Fonti su gamification e loyalty

29. Gallup (2023). "State of Employee Engagement and Gamification Impact." Gallup Report. (Dato citato: +48% engagement.)

30. Zichermann, G. e Cunningham, C. (2011). *Gamification by Design*. Sebastopol: O'Reilly Media.

31. Starbucks (2024). "Starbucks Rewards Program: Q3 2024 Earnings Report." (Dato citato: 28M membri attivi, +26% revenue.)

### Fonti competitor e analisi settore

32. Fresha (2024). Sito web ufficiale e pricing page. fresha.com.

33. Barberly (2024). Sito web ufficiale e App Store reviews. barberly.com.

34. GlossGenius (2024). Sito web ufficiale e Crunchbase profile. glossgenius.com.

35. Phorest (2024). Sito web ufficiale e pricing page. phorest.com.

36. Squire (2024). Sito web ufficiale. getsquire.com.

37. Trustpilot, Reddit r/Barbers, Capterra — recensioni e forum utenti (consultati 2024–2025).

### Fonti su unità economiche e pricing

38. CharliA (2025). "CAC, LTV, Churn: SaaS Unit Economics Guide [2025]." CharliA.io Blog.

39. PracticalWebTools (2025). "SaaS LTV:CAC Ratio Calculator (2025 Benchmarks and Unit Economics Guide)." PracticalWebTools Blog.

40. Forth & Scale (2025). "2025 SaaS Growth Benchmarks." Forth & Scale Report.

---

> **Nota:** Questo business plan è stato redatto con stime conservative basate su benchmark reali del settore SaaS early-stage. Le proiezioni non costituiscono garanzia di performance futura e sono soggette alle variabili di mercato, esecuzione e adozione del prodotto. Tutti gli importi sono in Euro salvo diversa indicazione.

---

## Modello di Business — Documento Progetto Originale

> La sezione seguente proviene da `progetto/03-modello-di-business.md` (documento originale del progetto) e integra il business plan dettagliato sopra.

# Modello di Business — Styll

## Modello di business — 3 Tier

### TIER 1 — Starter (~€19-29/mese)
*"Tutto quello che serve per gestire il negozio e iniziare a far tornare i clienti"*
- Prenotazioni + pagamenti online
- CRM clienti centralizzato
- Loyalty base a punti (1 tier)
- Silent Churn Detector (notifica: "stai perdendo questo cliente")
- Promemoria anti no-show
- Richiesta recensioni automatica
- Landing page + PWA brandizzata cliente

### TIER 2 — Growth (~€49-69/mese)
*"Per chi ha capito che la retention è il suo superpotere"*
- Loyalty gamificata (badge, streak, livelli, multi-tier)
- Campagne win-back automatiche
- QR walk-in + coda digitale
- Abbonamenti e pacchetti (membership management)
- Reward personalizzati AI
- Punteggio cliente VIP
- Analytics avanzata
- Gestione team (fino a 5 persone)

### TIER 3 — Pro/AI (~€99-149/mese)
*"Per il negozio che scala"*
- AI Business Coach (suggerimenti proattivi)
- Previsione ricavi
- Last-minute slot filler geolocalizzato
- Prenotazione da WhatsApp
- Story Instagram post-visita
- No-show prediction AI + deposito smart
- Prezzi dinamici peak/off-peak
- Staff illimitato + multi-location
- Branded experience premium

**Revenue aggiuntive:** % sulle transazioni (2.5-2.9%), SMS oltre il limite incluso, hardware (card reader).

---

## Pricing staff per tier

- **Tier 1 (Starter):** solo 1 utente (Marco)
- **Tier 2 (Growth):** fino a 5 staff inclusi
- **Tier 3 (Pro):** staff illimitato + multi-location

---

## Pricing messaggi

- **Tier 1:** 200 messaggi/mese inclusi (~€5 di costo reale)
- **Tier 2:** 500 messaggi/mese inclusi
- **Tier 3:** illimitati
- Oltre la soglia: pay-per-use €0.05/messaggio

---

## Riepilogo decisioni — Tabella sintetica

| # | Tema | Decisione chiave | Fase |
|---|------|-----------------|------|
| 1 | **Setup AI** | Wizard 5 step + template servizi + import GBP. AI in v2. Target: < 8 min | v1 + v2 |
| 2 | **Template social** | 5 template auto-generati col brand. Scaricabili in un tap. Editor Canva in v2 | v1 + v2 |
| 3 | **Multi-staff** | 4 ruoli (Titolare, Manager, Staff, Receptionist). Invito email. Staff incluso da Tier 2 | v1 |
| 4 | **Migrazione** | "Migrazione concierge gratis in 24h". CSV import + mapping guidato + template comunicazione | v1 |
| 5 | **Brand-first** | Subdomain v1, custom domain v2. Zero menzione Styll nella PWA. GDPR: note private | v1 + v2 |
| 6 | **Dashboard** | Progressive complexity. Marco: 30% feature. Sara: 70%. Mobile-first. Stile Mangomint | v1 |
| 7 | **CRM profilo** | 2 livelli (barbiere vede tutto, cliente vede i suoi dati). Note private. Semaforo churn | v1 |
| 8 | **Gamification** | v1: punti classici. v2: streak+badge+tier+sfide. Silenzioso per Roberto, visibile per Luca | v1 + v2 |
| 9 | **WhatsApp/SMS** | MessageBird/Infobip. 200 msg inclusi Tier 1. Win-back approvati dal barbiere. GDPR opt-in | v1 |
| 10 | **Loyalty senza app** | CRM = fonte unica. Assegna/riscatta dal CRM. SMS post-visita. Wallet card in v2 | v1 + v2 |