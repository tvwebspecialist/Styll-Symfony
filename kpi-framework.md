# 📈 KPI & Metrics Framework — Styll

## Indice
1. [Introduzione](#1-introduzione)
2. [North Star Metric](#2-north-star-metric)
3. [Framework AARRR (Pirate Metrics)](#3-framework-aarrr-pirate-metrics)
4. [Metriche Finanziarie SaaS](#4-metriche-finanziarie-saas)
5. [Metriche di Prodotto](#5-metriche-di-prodotto)
6. [Metriche di Marketing](#6-metriche-di-marketing)
7. [Metriche di Customer Success](#7-metriche-di-customer-success)
8. [Dashboard — Struttura Consigliata](#8-dashboard--struttura-consigliata)
9. [Tool di Analytics Raccomandati](#9-tool-di-analytics-raccomandati)
10. [Benchmark di Settore](#10-benchmark-di-settore)
11. [Obiettivi per Fase](#11-obiettivi-per-fase)
12. [Errori Comuni nel Tracking](#12-errori-comuni-nel-tracking)
13. [Riscontri e Osservazioni per il Tuo Progetto](#13-riscontri-e-osservazioni-per-il-tuo-progetto)
14. [Bibliografia e Fonti per la Tesi](#14-bibliografia-e-fonti-per-la-tesi)

---

## 1. Introduzione

Le metriche sono il sistema nervoso di ogni SaaS. Per **Styll** — piattaforma SaaS verticale B2B per barbieri focalizzata sulla retention — misurare correttamente i KPI è fondamentale per quattro ragioni:

1. **Guidano le decisioni:** In un mercato verticale (137.730 barbieri in Italia, 82,7% micro-imprenditori individuali), ogni scelta di prodotto deve essere validata dai dati. Non si possono sprecare risorse su feature che non muovono l'ago.

2. **Attraggono investitori:** Un SaaS con metriche solide (LTV:CAC >3:1, Net Revenue Retention >100%, churn <5% mensile) è investibile. Le metriche dimostrano product-market fit in modo oggettivo.

3. **Misurano il product-market fit:** Il core value di Styll è far tornare i clienti dal barbiere. Se i barbieri che usano Styll hanno un tasso di ritorno dei clienti significativamente più alto rispetto a chi non lo usa, il product-market fit è dimostrato.

4. **Prevengono il churn:** Ironia della sorte, Styll aiuta i barbieri a prevenire il churn dei loro clienti — ma Styll stessa deve prevenire il churn dei barbieri. Le metriche di engagement e adozione delle feature sono il sistema di allerta precoce.

### Contesto del progetto

| Aspetto | Dettaglio |
|---------|-----------|
| **Tipo di SaaS** | B2B verticale, multi-tenant, white-label |
| **Target primario** | Barbieri italiani indipendenti |
| **Fase attuale** | Pre-launch / MVP in sviluppo |
| **Monetizzazione** | Subscription 3 tier (€19-29, €49-69, €99-149) + fee transazioni |
| **Stack tecnico** | React + Supabase |
| **Modello di distribuzione** | Product-Led Growth (PLG) con trial gratuita |
| **Differenziatore chiave** | Retention-first con gamification della loyalty |

---

## 2. North Star Metric

### Cos'è

La North Star Metric (NSM) è la singola metrica che meglio cattura il valore fondamentale che il prodotto offre ai propri clienti. Non è una vanity metric (come i download o le pagine viste): è l'indicatore che, se cresce, significa che il prodotto sta funzionando e il business crescerà di conseguenza.

Una buona NSM deve essere:
- **Correlata al valore per il cliente:** se sale, il cliente sta ottenendo beneficio
- **Leading indicator della revenue:** predice la crescita futura
- **Azionabile:** il team può influenzarla con azioni concrete
- **Comprensibile da tutti:** dal CEO al junior developer

### La Tua North Star Metric Consigliata

**Metrica:** **Numero di prenotazioni ricorrenti settimanali per barbiere attivo**
*(Recurring Bookings per Active Barber per Week)*

**Perché:** Styll esiste per far tornare i clienti. Il numero di prenotazioni ricorrenti (clienti che prenotano per la seconda volta o più) è il segnale più diretto che il sistema di retention funziona. Se un barbiere su Styll riceve regolarmente prenotazioni da clienti che tornano, sta ottenendo valore dalla piattaforma. Questa metrica cattura contemporaneamente:
- L'adozione del booking da parte dei clienti finali
- L'efficacia della loyalty e del win-back
- L'engagement del barbiere con la piattaforma
- La probabilità che il barbiere continui a pagare l'abbonamento

**Come misurarla:**
```sql
-- Prenotazioni ricorrenti = prenotazioni da clienti che hanno già prenotato almeno 1 volta in precedenza
SELECT
  t.tenant_id,
  COUNT(*) AS recurring_bookings
FROM bookings b
JOIN tenants t ON b.tenant_id = t.id
WHERE b.created_at >= NOW() - INTERVAL '7 days'
  AND b.client_id IN (
    SELECT client_id FROM bookings
    WHERE created_at < b.created_at
    GROUP BY client_id
    HAVING COUNT(*) >= 1
  )
  AND t.status = 'active'
GROUP BY t.tenant_id;
```

**Frequenza:** Settimanale (con trend rolling 4 settimane)

### Esempi di North Star Metric di SaaS Noti

| SaaS | North Star Metric | Perché Funziona |
|------|-------------------|-----------------|
| **Slack** | Messaggi giornalieri inviati da team attivi | Misura il valore core: comunicazione. Più messaggi = più valore per il team = meno probabilità di churn |
| **Spotify** | Tempo di ascolto settimanale | Più ascolti = più valore percepito = più probabilità di rimanere abbonati |
| **Shopify** | GMV (Gross Merchandise Volume) per merchant | Più vende il merchant = più guadagna = più rimane su Shopify |
| **Zoom** | Meeting settimanali ospitati | Ogni meeting = valore consegnato. Correlazione diretta con retention e upsell |
| **Canva** | Design completati per settimana | Ogni design = valore consegnato. L'utente che produce torna |
| **Dropbox** | File caricati per utente per settimana | Più file = più dati conservati = switching cost più alto = retention |
| **HubSpot** | Team che usano 5+ feature per settimana | Multi-feature adoption = stickiness = espansione account |
| **Styll** | **Prenotazioni ricorrenti per barbiere attivo per settimana** | Misura direttamente la retention dei clienti del barbiere — il valore core della piattaforma |

---

## 3. Framework AARRR (Pirate Metrics)

Il framework AARRR (creato da Dave McClure, 500 Startups) segmenta il customer journey in 5 fasi: **Acquisition, Activation, Retention, Revenue, Referral**. Per Styll, applichiamo il framework su due livelli: il barbiere (B2B) e il cliente finale (B2C indiretto).

### Acquisition — Come i barbieri trovano Styll

| Metrica | Definizione | Come Misurarla | Tool | Target |
|---------|-------------|----------------|------|--------|
| **Visitatori unici** | Utenti unici che visitano il sito/landing page di Styll | Sessioni uniche per periodo | Google Analytics 4 / Plausible | >5.000/mese entro M6 |
| **Traffico per canale** | Distribuzione del traffico per fonte (organico, social, referral, paid) | UTM parameters + GA4 breakdown | Google Analytics 4 | Organico >40% entro M12 |
| **Signup rate** | % di visitatori che iniziano la registrazione (trial) | Signups / Visitatori unici × 100 | Mixpanel / PostHog | 3-5% |
| **CAC per canale** | Costo di acquisizione per ogni canale marketing | Spesa canale / Nuovi clienti paganti dal canale | Spreadsheet + GA4 | <€150 blended |
| **Costo per lead (CPL)** | Costo per ottenere un lead qualificato (barbiere interessato) | Spesa marketing / Lead generati | GA4 + CRM | <€30 |
| **Click-through rate (CTR) ads** | % di click sugli annunci a pagamento | Click / Impressioni × 100 | Meta Ads / Google Ads | >2% |

### Activation — La prima esperienza di valore ("Aha Moment")

L'**Aha Moment** di Styll per il barbiere è: **"Il primo cliente reale prenota tramite la mia app brandizzata."**

| Metrica | Definizione | Come Misurarla | Tool | Target |
|---------|-------------|----------------|------|--------|
| **Activation rate** | % di barbieri registrati che raggiungono l'Aha Moment | Barbieri con ≥1 prenotazione ricevuta / Barbieri registrati × 100 | PostHog / Supabase query | >40% entro 7 giorni |
| **Time to first value (TTFV)** | Tempo dalla registrazione alla prima prenotazione ricevuta | Timestamp prima prenotazione − Timestamp registrazione | Supabase query | <48 ore |
| **Onboarding completion rate** | % di barbieri che completano il wizard di setup (5 step) | Step 5 completato / Registrazioni × 100 | PostHog funnel | >70% |
| **Aha Moment rate** | % di barbieri che raggiungono il momento "wow" (la landing page live con il proprio brand) | Barbieri con landing pubblicata / Registrazioni × 100 | PostHog | >60% |
| **Setup time** | Tempo medio per completare il setup iniziale | Timestamp fine wizard − Timestamp inizio wizard | Supabase query | <8 minuti |

### Retention — I barbieri continuano a usare Styll?

| Metrica | Definizione | Come Misurarla | Tool | Target |
|---------|-------------|----------------|------|--------|
| **DAU/WAU/MAU** | Barbieri che accedono alla dashboard giornalmente / settimanalmente / mensilmente | Login unici per periodo | PostHog / Supabase auth logs | DAU/MAU >30% |
| **Retention curve (D1, D7, D30)** | % di barbieri che tornano dopo 1, 7, 30 giorni dalla registrazione | Cohort analysis per data di registrazione | PostHog / Amplitude | D30 >50% |
| **Customer churn rate** | % di barbieri che cancellano l'abbonamento per mese | Barbieri persi / Barbieri totali inizio periodo × 100 | Stripe + Supabase | <5% mensile |
| **Cohort retention** | Retention segmentata per mese di acquisizione | Analisi per coorte mensile | PostHog / Spreadsheet | Curva che si appiattisce >40% dopo M3 |
| **Feature adoption rate** | % di barbieri che usano feature chiave (loyalty, win-back, analytics) | Utenti feature X / Utenti totali attivi × 100 | PostHog | Loyalty >50%, Win-back >30% |
| **Stickiness ratio** | DAU/MAU — misura quanto il prodotto è parte della routine quotidiana | DAU medio / MAU | PostHog | >25% |

### Revenue — Pagano?

| Metrica | Definizione | Come Misurarla | Tool | Target |
|---------|-------------|----------------|------|--------|
| **MRR (Monthly Recurring Revenue)** | Ricavo mensile ricorrente totale | Somma di tutti gli abbonamenti attivi | Stripe / Baremetrics | €10K entro M12 |
| **ARR (Annual Recurring Revenue)** | MRR × 12 — proiezione annuale | MRR × 12 | Stripe / Baremetrics | €120K entro M12 |
| **ARPU (Average Revenue Per User)** | Ricavo medio per barbiere | MRR / Barbieri paganti | Stripe | €35-50 |
| **LTV (Lifetime Value)** | Valore totale di un barbiere nel tempo | ARPU × Margine lordo × (1 / Churn rate mensile) | Spreadsheet / Baremetrics | >€750 |
| **Conversion free→paid** | % di trial che convertono in abbonamento pagato | Barbieri paganti / Barbieri che hanno fatto trial × 100 | Stripe + Supabase | >15% |
| **Expansion revenue** | Ricavi aggiuntivi da upsell (Starter→Growth, Growth→Pro) | MRR expansion / MRR totale | Stripe | >10% del MRR dopo M6 |
| **Revenue churn** | % del MRR perso per cancellazioni e downgrade | MRR perso / MRR inizio periodo × 100 | Stripe / Baremetrics | <3% mensile |

### Referral — Lo consigliano?

| Metrica | Definizione | Come Misurarla | Tool | Target |
|---------|-------------|----------------|------|--------|
| **NPS (Net Promoter Score)** | Probabilità che il barbiere consigli Styll ad un collega (scala 0-10) | Survey in-app periodica | Typeform / Delighted | >50 |
| **Referral rate** | % di nuovi barbieri acquisiti tramite referral di barbieri esistenti | Signups con codice referral / Signups totali × 100 | Supabase + UTM tracking | >20% |
| **Viral coefficient (K-factor)** | Numero medio di nuovi barbieri generati da ogni barbiere esistente | K = Inviti medi × Conversion rate inviti | Supabase query | >0.3 (obiettivo >0.6) |
| **Organic word-of-mouth** | % di barbieri che citano "consiglio di un collega" come fonte di scoperta | Survey al signup: "Come ci hai conosciuto?" | Supabase / Typeform | >30% |
| **Review/Testimonial rate** | % di barbieri attivi che lasciano una testimonianza | Testimonianze raccolte / Barbieri attivi × 100 | CRM tracking | >10% |

---

## 4. Metriche Finanziarie SaaS

Queste sono le metriche che investitori, advisor e board guardano per valutare la salute del business. Le formule seguono il framework di David Skok ("SaaS Metrics 2.0").

| Metrica | Formula | Il Tuo Target (M12) | Benchmark Settore | Importanza |
|---------|---------|:-------------------:|:-----------------:|:----------:|
| **MRR** | Somma abbonamenti attivi | €10.000 | Variabile per fase | 🔴 Critica |
| **ARR** | MRR × 12 | €120.000 | Variabile per fase | 🔴 Critica |
| **Net Revenue Retention (NRR)** | (MRR inizio + Expansion − Churn − Downgrade) / MRR inizio × 100 | >100% | Mediana 101%, top >120% | 🔴 Critica |
| **Gross Margin** | (Revenue − COGS) / Revenue × 100 | >75% | 70-85% per SaaS | 🔴 Critica |
| **CAC** | Costi Sales & Marketing / Nuovi clienti paganti | <€150 | Mediana: €2 spesi per €1 di nuovo ARR | 🔴 Critica |
| **LTV** | ARPU × Gross Margin % × (1 / Monthly Churn Rate) | >€750 | 3-5× il CAC | 🔴 Critica |
| **LTV:CAC** | LTV / CAC | >3:1 | Minimo 3:1, ideale 4-5:1 | 🔴 Critica |
| **CAC Payback** | CAC / (ARPU mensile × Gross Margin %) | <12 mesi | Mediana 20 mesi, target <12 | 🟡 Importante |
| **Burn Rate** | Costi operativi mensili − Ricavi mensili | Diminuire ogni mese | Sostenibile per runway | 🟡 Importante |
| **Runway** | Cassa disponibile / Burn Rate mensile | >18 mesi | >12 mesi minimo | 🟡 Importante |
| **Quick Ratio** | (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR) | >4 | >4 = eccellente, >2 = buono | 🟡 Importante |
| **Rule of 40** | Growth Rate % + Profit Margin % | >40% | >40% = SaaS sano | 🟢 Monitorare |
| **Gross Logo Churn** | Clienti persi / Clienti inizio periodo × 100 | <5% mensile | SMB: 3-5% mensile | 🔴 Critica |
| **MRR Growth Rate** | (MRR fine − MRR inizio) / MRR inizio × 100 | >15% M/M in early stage | Mediana 19-21% annuo per SaaS privati | 🔴 Critica |

### Formule dettagliate

**LTV (David Skok formula):**
```
LTV = ARPU × Gross Margin % × (1 / Churn Rate)

Esempio per Styll:
- ARPU mensile: €40
- Gross Margin: 80%
- Monthly Churn: 4%
- Customer Lifetime: 1 / 0.04 = 25 mesi
- LTV = €40 × 0.80 × 25 = €800
```

**CAC Payback:**
```
CAC Payback = CAC / (ARPU × Gross Margin %)

Esempio:
- CAC: €150
- ARPU mensile: €40
- Gross Margin: 80%
- Payback = €150 / (€40 × 0.80) = 4.7 mesi ✅
```

**Quick Ratio (Mamoon Hamid, Social Capital):**
```
Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)

Esempio:
- New MRR: €2.000
- Expansion MRR: €500
- Churned MRR: €400
- Contraction MRR: €100
- Quick Ratio = €2.500 / €500 = 5.0 ✅ Eccellente
```

---

## 5. Metriche di Prodotto

Le metriche di prodotto misurano come i barbieri e i clienti finali interagiscono con Styll. Sono fondamentali per guidare le decisioni di roadmap.

### Metriche lato Barbiere (Dashboard)

| Metrica | Definizione | Come Misurarla | Target |
|---------|-------------|----------------|--------|
| **Session duration** | Tempo medio per sessione nella dashboard | Timestamp logout/inattività − login | 5-15 min/sessione |
| **Feature usage rate** | % di utilizzo per ogni feature principale | Eventi feature / Sessioni totali | Booking >90%, CRM >60%, Loyalty >50% |
| **Setup completion rate** | % di barbieri che completano tutte le configurazioni | Checklist items completati / Totale items | >80% entro D7 |
| **Calendar fill rate** | % di slot disponibili che vengono prenotati | Prenotazioni / Slot disponibili × 100 | >40% dopo M3 |
| **Action-to-churn correlation** | Quali azioni predicono la cancellazione | Analisi correlazione uso feature vs churn | Identificare 3+ predictor |
| **Error rate** | Errori applicativi per sessione | Error count / Sessioni totali | <1% |
| **Page load time (P95)** | Tempo di caricamento della dashboard al 95° percentile | Performance monitoring | <2 secondi |

### Metriche lato Cliente Finale (PWA)

| Metrica | Definizione | Come Misurarla | Target |
|---------|-------------|----------------|--------|
| **PWA install rate** | % di visitatori della landing che installano la PWA | Installazioni / Visite landing × 100 | >15% |
| **Booking completion rate** | % di utenti che iniziano e completano una prenotazione | Booking completati / Booking iniziati × 100 | >80% (obiettivo "3 tap") |
| **Time to book** | Tempo medio per completare una prenotazione | Timestamp conferma − Timestamp apertura booking | <60 secondi |
| **Rebooking rate** | % di clienti che prenotano una seconda volta | Clienti con ≥2 prenotazioni / Clienti con ≥1 prenotazione × 100 | >40% |
| **Loyalty engagement rate** | % di clienti che interagiscono con punti/badge/streak | Clienti che visualizzano/usano loyalty / Clienti attivi × 100 | >30% |
| **Push notification opt-in rate** | % di clienti che accettano le notifiche push | Opt-in / Installazioni PWA × 100 | >60% |
| **No-show rate** | % di prenotazioni dove il cliente non si presenta | No-show / Prenotazioni totali × 100 | <10% (con reminder attivo) |

### Metriche di Gamification (v2+)

| Metrica | Definizione | Target |
|---------|-------------|--------|
| **Streak attive** | % di clienti con streak ≥3 | >20% dei clienti attivi |
| **Badge earned rate** | Media di badge guadagnati per cliente attivo | >2 badge in 3 mesi |
| **Level progression rate** | % di clienti che salgono di livello | >30% passa da Livello 1 a 2 entro M3 |
| **Gamification lift** | Differenza di retention tra utenti engaged con gamification e non | >15% di retention in più |

---

## 6. Metriche di Marketing

### Metriche di Acquisizione

| Metrica | Definizione | Come Misurarla | Tool | Target |
|---------|-------------|----------------|------|--------|
| **Traffico organico** | Visite da motori di ricerca | GA4 Acquisition report | Google Analytics 4 | >2.000/mese entro M6 |
| **SEO ranking** | Posizione per keyword target ("gestionale barbieri", "app barbiere") | Keyword position tracking | Google Search Console / Ahrefs | Top 10 per 5 keyword entro M12 |
| **Social media followers** | Crescita follower su Instagram/TikTok | Follower count mensile | Meta Business Suite | >5.000 Instagram entro M12 |
| **Content engagement** | Like, commenti, salvataggi, condivisioni per post | Engagement / Reach × 100 | Meta Business Suite | Engagement rate >3% |
| **Email list growth rate** | Crescita mensile della mailing list | (Nuovi iscritti − Disiscritti) / Lista totale × 100 | Mailchimp / Resend | >10% mensile |
| **Email open rate** | % di email aperte | Email aperte / Email inviate × 100 | Mailchimp / Resend | >25% |
| **Email click rate** | % di click nelle email | Click / Email aperte × 100 | Mailchimp / Resend | >3% |
| **Landing page conversion rate** | % di visitatori della landing che si registrano | Registrazioni / Visitatori landing × 100 | GA4 + PostHog | >5% |
| **Demo/trial request rate** | % di visitatori che richiedono una demo o iniziano trial | Demo requests / Visitatori × 100 | GA4 + CRM | >3% |

### Metriche di Conversione per Canale

| Canale | Metrica Chiave | Target |
|--------|----------------|--------|
| **Instagram/TikTok** | Signup da social / Total signups | >25% dei signups |
| **SEO/Organico** | Signup da organico / Total signups | >30% dei signups dopo M12 |
| **Referral** | Signup da referral / Total signups | >20% dei signups |
| **Google Ads** | CPA (Cost per Acquisition) | <€100 |
| **Meta Ads** | CPA | <€80 |
| **Partnerships (associazioni barbieri)** | Signup da partnership | >10% dei signups |

---

## 7. Metriche di Customer Success

### Metriche di Supporto

| Metrica | Definizione | Come Misurarla | Tool | Target |
|---------|-------------|----------------|------|--------|
| **Support tickets per barbiere** | Media di ticket per barbiere al mese | Ticket totali / Barbieri attivi | Intercom / Crisp | <0.5 ticket/barbiere/mese |
| **First response time** | Tempo medio dalla creazione del ticket alla prima risposta | Timestamp prima risposta − Timestamp creazione | Intercom / Crisp | <2 ore (orario lavorativo) |
| **Resolution time** | Tempo medio dalla creazione alla risoluzione | Timestamp risoluzione − Timestamp creazione | Intercom / Crisp | <24 ore |
| **First contact resolution (FCR)** | % di ticket risolti al primo contatto | Ticket risolti al primo contatto / Ticket totali × 100 | Intercom / Crisp | >70% |
| **CSAT (Customer Satisfaction Score)** | Punteggio di soddisfazione post-interazione | Survey post-ticket (1-5 stelle) | Intercom / Crisp | >4.2/5 |

### Metriche di Health Score

Il **Customer Health Score** è un punteggio composito che predice la probabilità di churn o espansione di un barbiere.

| Componente | Peso | Segnale Positivo | Segnale Negativo |
|------------|:----:|------------------|------------------|
| **Frequenza di login** | 25% | Login giornaliero | Nessun login da >7 giorni |
| **Prenotazioni ricevute** | 30% | Trend crescente | Calo >20% M/M |
| **Feature adoption** | 20% | Usa 3+ feature | Usa solo booking base |
| **Ticket di supporto** | 10% | Nessun ticket critico | Ticket critici ripetuti |
| **Tenure (anzianità)** | 15% | >6 mesi di abbonamento | <30 giorni |

**Classificazione:**
- 🟢 **Healthy (score 75-100):** Cliente soddisfatto, candidato per upsell
- 🟡 **At Risk (score 40-74):** Intervento proattivo necessario
- 🔴 **Unhealthy (score 0-39):** Rischio churn imminente — azione immediata

### Metriche di Onboarding

| Metrica | Definizione | Target |
|---------|-------------|--------|
| **Onboarding NPS** | NPS misurato al completamento dell'onboarding | >40 |
| **Time to onboard** | Tempo medio per completare l'onboarding | <8 minuti |
| **Onboarding drop-off point** | Step del wizard dove avviene il maggior abbandono | Identificare e ottimizzare |
| **Help article views** | Quante volte vengono consultati gli articoli di aiuto | Trend decrescente (=prodotto più intuitivo) |

---

## 8. Dashboard — Struttura Consigliata

### Dashboard Giornaliera (Operativa)
**Utente:** Fondatore / Head of Product
**Tempo di consultazione:** 5 minuti

| Sezione | Metriche | Visualizzazione |
|---------|----------|-----------------|
| **KPI Header** | MRR attuale, Barbieri attivi, North Star Metric (prenotazioni ricorrenti) | 3 card grandi con trend arrow |
| **Acquisizione oggi** | Nuove registrazioni trial, Visitatori sito | Counter + sparkline 7 giorni |
| **Engagement** | Barbieri attivi oggi (DAU), Prenotazioni ricevute oggi | Counter + confronto ieri |
| **Supporto** | Ticket aperti, Tempo medio prima risposta | Counter + status (🟢🟡🔴) |
| **Alerting** | Barbieri "at risk" (Health Score <40) | Lista con azione rapida |

### Dashboard Settimanale (Tattica)
**Utente:** Team prodotto + marketing
**Tempo di consultazione:** 15-20 minuti

| Sezione | Metriche | Visualizzazione |
|---------|----------|-----------------|
| **Funnel AARRR** | Visitatori → Signup → Activation → Pagamento → Referral | Funnel chart con conversion rate per step |
| **Retention** | Cohort retention (D1, D7, D30) | Heatmap cohort |
| **North Star Metric** | Prenotazioni ricorrenti per barbiere — trend 4 settimane | Line chart con media mobile |
| **Feature adoption** | Top 5 feature più/meno usate | Horizontal bar chart |
| **Marketing** | Traffico per canale, CPL per canale, Signup per canale | Stacked bar chart |
| **Revenue** | MRR trend, New vs Churned MRR | Waterfall chart |

### Dashboard Mensile (Strategica)
**Utente:** Fondatori + Advisor
**Tempo di consultazione:** 30-45 minuti

| Sezione | Metriche | Visualizzazione |
|---------|----------|-----------------|
| **Financial Overview** | MRR, ARR, MRR Growth, Net Revenue Retention, Quick Ratio | Card + trend 12 mesi |
| **Unit Economics** | CAC, LTV, LTV:CAC ratio, Payback period | Gauge charts con benchmark |
| **Cohort Deep Dive** | Retention per coorte mensile a 3, 6, 12 mesi | Heatmap cohort dettagliata |
| **Churn Analysis** | Churn rate per tier, motivi di cancellazione, churn prediction | Pie chart motivi + trend line |
| **Growth Accounting** | New MRR, Expansion MRR, Churned MRR, Contraction MRR | MRR waterfall bridge |
| **Customer Health** | Distribuzione Health Score (🟢🟡🔴), trend | Donut chart + trend |
| **Benchmark Comparison** | Le nostre metriche vs benchmark di settore | Radar chart |

### Layout Consigliato

```
┌─────────────────────────────────────────────────┐
│            KPI HEADER (3 metriche principali)     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │  MRR    │  │ Barbieri│  │  NSM    │          │
│  │ €8.450  │  │  Active │  │ 12.3    │          │
│  │ ↑ 12%   │  │   211   │  │ ↑ 8%    │          │
│  └─────────┘  └─────────┘  └─────────┘          │
├─────────────────────────────────────────────────┤
│  FUNNEL AARRR          │  RETENTION COHORT      │
│  ┌───────────────┐     │  ┌─────────────────┐   │
│  │ Visitors 5.2K │     │  │  M1  M2  M3  M4 │   │
│  │ Signups   260 │     │  │  ██  ▓▓  ░░  ░░ │   │
│  │ Active    156 │     │  │  ██  ▓▓  ░░     │   │
│  │ Paying     89 │     │  │  ██  ▓▓         │   │
│  │ Referral   23 │     │  │  ██             │   │
│  └───────────────┘     │  └─────────────────┘   │
├─────────────────────────────────────────────────┤
│  MRR WATERFALL          │  HEALTH SCORE          │
│  ┌───────────────┐     │  ┌─────────────────┐   │
│  │ New    +€2.1K │     │  │  🟢 65%         │   │
│  │ Exp    +€0.5K │     │  │  🟡 25%         │   │
│  │ Churn  -€0.4K │     │  │  🔴 10%         │   │
│  │ Net    +€2.2K │     │  │                 │   │
│  └───────────────┘     │  └─────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 9. Tool di Analytics Raccomandati

| Tool | Tipo | Costo | Ideale Per | Alternativa Free |
|------|------|:-----:|-----------|-----------------|
| **PostHog** | Product analytics | Free fino a 1M eventi/mese, poi usage-based | Tracking eventi, funnel, cohort, feature flags, session replay | — (è già l'alternativa free) |
| **Baremetrics** | Revenue analytics | Da $108/mese | Dashboard MRR, churn, LTV automatica da Stripe | ProfitWell (free per metriche base) |
| **Google Analytics 4** | Web analytics | Gratuito | Traffico sito, conversioni, acquisizione | Plausible (~€9/mese, privacy-first) |
| **Hotjar** | Behavior analytics | Free fino a 35 sessioni/giorno | Heatmap, session recording, survey | Microsoft Clarity (gratuito) |
| **Mixpanel** | Product analytics | Free fino a 1M eventi/mese, poi da $20/mese | Event tracking avanzato, funnel | PostHog |
| **Stripe Dashboard** | Payment analytics | Incluso in Stripe | Revenue, pagamenti, churn involontario | — |
| **Google Search Console** | SEO analytics | Gratuito | Performance SEO, keyword, indicizzazione | — |
| **Resend** | Email analytics | Free fino a 3.000 email/mese | Email transazionali, open/click rate | — |
| **Crisp** | Customer support | Free per 2 operatori | Live chat, ticket, knowledge base | — |
| **Supabase Analytics** | Database analytics | Incluso in Supabase | Query dirette sui dati del prodotto | — |

### Stack Consigliato per Styll

Data la fase attuale (pre-launch/MVP) e il budget limitato di una startup, consigliamo uno stack **cost-effective** che scala:

#### Fase 1 — MVP (€0/mese)
| Funzione | Tool | Costo |
|----------|------|:-----:|
| Product analytics | **PostHog Cloud** (free tier) | €0 |
| Web analytics | **Google Analytics 4** | €0 |
| Behavior analytics | **Microsoft Clarity** | €0 |
| Revenue analytics | **Stripe Dashboard** | €0 |
| SEO | **Google Search Console** | €0 |
| Email | **Resend** (free tier) | €0 |
| Support | **Crisp** (free tier) | €0 |
| **Totale** | | **€0/mese** |

#### Fase 2 — Growth (€50-150/mese)
| Funzione | Tool | Costo |
|----------|------|:-----:|
| Product analytics | **PostHog Cloud** (paid) | ~€0-50 |
| Revenue analytics | **Baremetrics** o **ProfitWell** | €0-108 |
| Behavior analytics | **Hotjar** (Plus) | €39 |
| Email marketing | **Mailchimp** o **Resend** (paid) | €15-30 |
| Support | **Crisp** (Pro) | €25 |

#### Fase 3 — Scale (€300-500/mese)
| Funzione | Tool | Costo |
|----------|------|:-----:|
| Product analytics | **Amplitude** o **Mixpanel** (Growth) | €100-200 |
| Revenue analytics | **Baremetrics** | €108+ |
| Customer success | **Vitally** o **Gainsight** | €100+ |
| Support | **Intercom** | €74+ |

---

## 10. Benchmark di Settore

I benchmark seguenti sono basati su dati aggregati di SaaS B2B con focus SMB, comparabili a Styll per target e pricing. I dati provengono da report di Baremetrics Open Benchmarks, Benchmarkit 2025, re:cap 2025 e ChartMogul.

| Metrica | Bottom 25% | Mediana | Top 25% | Top 10% | Fonte |
|---------|:----------:|:-------:|:-------:|:-------:|-------|
| **Monthly customer churn** | >5% | 3-5% | 1-3% | <1% | Baremetrics Open Benchmarks, 2025 |
| **Monthly revenue churn** | >8% | 4-6% | 2-4% | <2% | ChartMogul SaaS Benchmarks, 2025 |
| **Free→Paid conversion** | <5% | 5-15% | 15-25% | >25% | Benchmarkit 2025, Lenny's Newsletter |
| **Trial→Paid conversion (opt-in)** | <15% | 15-25% | 25-40% | >40% | Benchmarkit 2025 |
| **Net Revenue Retention** | <90% | 100-105% | 105-120% | >120% | Pavilion 2025 B2B SaaS Benchmarks |
| **NPS** | <20 | 20-40 | 40-60 | >60 | Delighted NPS Benchmarks |
| **LTV:CAC** | <2:1 | 3:1 | 4:1 | >5:1 | Skok, "SaaS Metrics 2.0" |
| **CAC Payback** | >24 mesi | 15-20 mesi | 8-12 mesi | <6 mesi | Benchmarkit 2025 |
| **Gross Margin** | <60% | 70-75% | 75-85% | >85% | KeyBanc 2024 SaaS Survey |
| **DAU/MAU (stickiness)** | <10% | 15-20% | 25-35% | >40% | Mixpanel Product Benchmarks 2024 |
| **Onboarding completion** | <40% | 50-65% | 65-80% | >80% | Userpilot SaaS Onboarding Benchmarks |
| **Quick Ratio** | <1.5 | 2-3 | 3-4 | >4 | Mamoon Hamid / Social Capital |
| **ARR Growth (early stage)** | <15% | 20-30% | 30-50% | >100% | Bessemer Cloud Index 2024 |
| **Support CSAT** | <3.5/5 | 4.0/5 | 4.3/5 | >4.5/5 | Zendesk CX Trends 2024 |

### Note sui benchmark per Styll

⚠️ **Attenzione al segmento SMB:** I benchmark sopra includono SaaS di tutte le dimensioni. Per SaaS verticali B2B che servono micro-imprenditori (come Styll), è normale attendersi:
- **Churn mensile più alto** (5-7%) nei primi mesi — il segmento SMB è intrinsecamente più volatile
- **CAC più basso** (€50-150) — il mercato è locale e il passaparola funziona
- **LTV più basso in assoluto** (€500-1.500) — i ticket medi sono bassi, ma il volume compensa
- **Conversion rate più alto** se il funnel è product-led e il trial è immediato

---

## 11. Obiettivi per Fase

### Pre-Launch (Ora → Lancio)

| Metrica | Obiettivo | Priorità |
|---------|-----------|:--------:|
| **Waitlist signups** | >500 barbieri nella waitlist | 🔴 |
| **Landing page conversion** | >8% visitatori → waitlist | 🔴 |
| **Beta tester attivi** | 10-20 barbieri che usano il prodotto attivamente | 🔴 |
| **Onboarding completion rate (beta)** | >70% | 🔴 |
| **Time to first booking (beta)** | <48 ore dalla registrazione | 🟡 |
| **Bug critici** | 0 bug bloccanti | 🔴 |
| **NPS beta tester** | >40 | 🟡 |
| **Content marketing** | 10+ articoli SEO pubblicati | 🟡 |
| **Social presence** | >1.000 follower Instagram | 🟢 |

### Launch (Mese 1-3)

| Metrica | Obiettivo | Priorità |
|---------|-----------|:--------:|
| **Barbieri paganti** | 50-100 | 🔴 |
| **MRR** | €1.500-3.000 | 🔴 |
| **Activation rate** | >35% (registrato → prima prenotazione ricevuta entro D7) | 🔴 |
| **Monthly churn** | <8% (accettabile in early stage) | 🔴 |
| **Time to first value** | <48 ore | 🟡 |
| **NPS** | >30 | 🟡 |
| **CAC** | <€100 (con canali organici + referral) | 🟡 |
| **Support response time** | <4 ore | 🟡 |
| **Free→Paid conversion** | >10% | 🔴 |
| **Referral rate** | >10% dei nuovi signup | 🟢 |

### Growth (Mese 4-12)

| Metrica | Obiettivo | Priorità |
|---------|-----------|:--------:|
| **Barbieri paganti** | 200-500 | 🔴 |
| **MRR** | €10.000-20.000 | 🔴 |
| **MRR Growth rate** | >15% M/M | 🔴 |
| **Monthly churn** | <5% | 🔴 |
| **NRR** | >100% | 🔴 |
| **LTV:CAC** | >3:1 | 🔴 |
| **Activation rate** | >45% | 🟡 |
| **Feature adoption (loyalty)** | >50% dei barbieri attivi | 🟡 |
| **Referral rate** | >20% | 🟡 |
| **NPS** | >50 | 🟡 |
| **Upsell rate (Starter→Growth)** | >15% dei Starter | 🟢 |
| **Quick Ratio** | >3 | 🟢 |

### Scale (Anno 2+)

| Metrica | Obiettivo | Priorità |
|---------|-----------|:--------:|
| **Barbieri paganti** | >2.000 | 🔴 |
| **ARR** | >€500.000 | 🔴 |
| **Monthly churn** | <3% | 🔴 |
| **NRR** | >110% | 🔴 |
| **LTV:CAC** | >4:1 | 🔴 |
| **Gross Margin** | >80% | 🔴 |
| **Rule of 40** | >40% | 🟡 |
| **Espansione in nuovi verticali** | 1+ verticale (es. parrucchieri, fitness) | 🟡 |
| **ARPU** | >€50 (grazie a upsell e tier medio/alto) | 🟡 |
| **CAC Payback** | <8 mesi | 🟢 |
| **Viral coefficient** | >0.5 | 🟢 |

---

## 12. Errori Comuni nel Tracking

### ❌ Errore 1 — Vanity Metrics vs Actionable Metrics

**Il problema:** Concentrarsi su metriche che "fanno bella figura" ma non guidano decisioni.

| Vanity Metric | Perché è Vanity | Actionable Metric Alternativa |
|---------------|-----------------|-------------------------------|
| Totale barbieri registrati | Include chi non ha mai completato il setup | Barbieri attivi (≥1 prenotazione ricevuta negli ultimi 30 giorni) |
| Pagine viste | Non dice se il barbiere sta ottenendo valore | Session duration + feature usage rate |
| Download/installazioni PWA | Il cliente ha installato ma potrebbe non usarla mai | Rebooking rate (clienti che prenotano ≥2 volte) |
| Follower social | Non correlano direttamente con revenue | Signup rate da social |

**Soluzione:** Per ogni metrica chiediti: *"Se questa metrica cambia, cambiamo strategia?"*. Se la risposta è no, è una vanity metric.

### ❌ Errore 2 — Misurare troppo (Analysis Paralysis)

**Il problema:** Tracciare 50+ metriche e non sapere su cosa concentrarsi.

**Soluzione per Styll:**
- **Pre-launch:** Traccia solo 5 metriche (waitlist, landing conversion, beta NPS, bug critici, onboarding rate)
- **Launch:** Aggiungi MRR, churn, activation rate, CAC, NPS (totale: 10)
- **Growth:** Espandi a 15-20 metriche (aggiungi cohort, NRR, feature adoption, LTV:CAC)
- **Regola d'oro:** Ogni persona del team deve avere massimo 3 metriche "sue"

### ❌ Errore 3 — Non segmentare

**Il problema:** Guardare le metriche aggregate nasconde insight cruciali.

**Esempio per Styll:**
- Il churn medio è 4% → sembra ok
- Ma segmentando: Tier Starter ha 7% churn, Tier Growth ha 2% churn
- **Insight:** Il problema è nel Tier Starter, non nel prodotto intero
- **Azione:** Migliorare il valore percepito dello Starter o accelerare l'upsell al Growth

**Segmentazioni consigliate:**
- Per **tier** (Starter, Growth, Pro)
- Per **geografia** (Nord, Centro, Sud Italia)
- Per **dimensione** (barbiere singolo vs team)
- Per **canale di acquisizione** (organico, paid, referral)
- Per **tenure** (0-3 mesi, 3-6, 6-12, >12)

### ❌ Errore 4 — Ignorare le cohort

**Il problema:** Le metriche aggregate mescolano coorti diverse e mascherano i trend.

**Esempio:**
- Il churn mensile sembra stabile al 4%
- Ma la coorte di gennaio ha 2% churn (prodotto migliorato), quella di giugno ha 8% (acquisizione low-quality)
- Senza cohort analysis, non lo vedi

**Soluzione:** Crea sempre una cohort table mensile e segui ogni coorte per almeno 6 mesi.

### ❌ Errore 5 — Confondere Correlazione e Causazione

**Il problema:** "I barbieri che usano la loyalty hanno 50% meno churn" → *non significa* che la loyalty causa meno churn. Potrebbe essere che i barbieri più engaged usano tutto di più, inclusa la loyalty.

**Soluzione:**
- Usa A/B testing prima di concludere causalità
- Controlla per variabili confondenti (tenure, dimensione, tier)
- Formulazione corretta: "C'è una correlazione tra uso della loyalty e retention — da investigare con test controllato"

### ❌ Errore 6 — Ignorare il Churn Involontario

**Il problema:** Circa il 20-30% del churn SaaS è involontario (carta scaduta, pagamento fallito), non una decisione consapevole del barbiere.

**Soluzione per Styll:**
- Implementare **dunning management** su Stripe (retry automatici per pagamenti falliti)
- Inviare email/SMS prima della scadenza della carta
- Monitorare separatamente churn volontario e involontario
- Target: recuperare >50% del churn involontario con dunning efficace

### ❌ Errore 7 — Non tracciare il "Perché" del Churn

**Il problema:** Sapere che il 4% dei barbieri cancella non basta. Bisogna sapere perché.

**Soluzione:**
- Survey di cancellazione obbligatoria (3 opzioni + campo libero)
- Exit interview opzionale per barbieri di alto valore
- Categorizzare i motivi: prezzo, complessità, feature mancante, competitor, chiusura attività
- Rivedere mensilmente le categorie di churn per prioritizzare la roadmap

---

## 13. Riscontri e Osservazioni per il Tuo Progetto

### ✅ Metriche più importanti per la tua fase attuale (Pre-Launch/MVP)

Dato che Styll è in fase di sviluppo pre-lancio, le metriche critiche **ora** sono:

1. **Waitlist signups e landing conversion** — Valida la domanda di mercato prima di scrivere codice
2. **Beta tester activation rate** — I primi 10-20 barbieri completano il setup e ricevono prenotazioni?
3. **Time to First Value (TTFV)** — Se un barbiere non riceve la prima prenotazione entro 48 ore, il rischio di abbandono è altissimo
4. **NPS dei beta tester** — NPS >40 in beta indica product-market fit iniziale
5. **Bug critici a zero** — Nessun bug bloccante per il lancio

### ⚠️ Metriche da NON ignorare

1. **Churn involontario:** Implementa dunning fin dal giorno 1 con Stripe. È MRR che perdi senza motivo.
2. **Activation rate:** Se i barbieri si registrano ma non completano il setup, il problema è nell'onboarding, non nell'acquisizione. Il tuo obiettivo di "setup in <8 minuti" è ottimo — misuralo.
3. **Feature adoption rate della loyalty:** La gamification è il tuo differenziatore unico. Se i barbieri non attivano la loyalty, perdi il vantaggio competitivo. Traccia da subito.
4. **Rebooking rate dei clienti finali:** Styll promette "farli tornare". Se i clienti dei barbieri non tornano a prenotare, la promessa è vuota. Questa è la metrica di verità.
5. **NPS segmentato per tier:** Il tier Starter potrebbe avere NPS basso (feature limitate) e il Growth alto. Questo guida le decisioni di pricing e bundling.

### 💡 Quick wins di analytics

1. **Implementa PostHog fin dal primo commit di frontend.** È gratuito per 1M eventi/mese e ti dà funnel, cohort, session replay e feature flags — tutto ciò che serve per l'MVP.

2. **Aggiungi un campo "Come ci hai conosciuto?" al signup.** Semplice dropdown con 5 opzioni: Instagram, Google, Consiglio di un collega, Associazione di categoria, Altro. Ti dirà subito quali canali funzionano.

3. **Crea un evento "aha_moment" in PostHog** quando il barbiere riceve la prima prenotazione tramite la sua landing page. Questo è il tuo conversion event più importante.

4. **Usa Stripe Billing con dunning automatico** fin dal giorno 1. Configura 3 retry su pagamento fallito + email di avviso. Recupererai il 50%+ del churn involontario.

5. **Traccia il setup wizard step-by-step.** Crea un evento per ogni step del wizard (step_1_completed, step_2_completed, ..., step_5_completed). Saprai esattamente dove i barbieri abbandonano.

### 🎯 Piano di implementazione tracking (prioritizzato)

**Settimana 1-2 (Pre-Launch):**
- [ ] Integrare PostHog nel frontend React
- [ ] Configurare Google Analytics 4 sulla landing page
- [ ] Implementare evento di signup/registrazione
- [ ] Implementare tracking del wizard (5 step)
- [ ] Configurare Microsoft Clarity per heatmap (landing page)

**Settimana 3-4 (Beta):**
- [ ] Tracciare evento "aha_moment" (prima prenotazione ricevuta)
- [ ] Creare funnel Signup → Setup → First Booking in PostHog
- [ ] Implementare survey NPS in-app (beta tester)
- [ ] Configurare Stripe Dashboard per revenue tracking
- [ ] Tracciare feature adoption (loyalty, CRM, analytics)

**Mese 2-3 (Launch):**
- [ ] Creare dashboard giornaliera con metriche chiave
- [ ] Implementare cohort analysis mensile
- [ ] Configurare alerting automatico (es. churn spike, activation drop)
- [ ] Implementare Health Score per ogni barbiere
- [ ] Creare survey di cancellazione

**Mese 4-6 (Growth):**
- [ ] Valutare Baremetrics o ProfitWell per revenue analytics avanzata
- [ ] Implementare A/B testing su onboarding
- [ ] Creare dashboard mensile per advisor/investitori
- [ ] Segmentare tutte le metriche per tier, canale, geografia

---

## 14. Bibliografia e Fonti per la Tesi

### Articoli e Guide sulle Metriche SaaS

1. Skok, D., "SaaS Metrics 2.0 – A Guide to Measuring and Improving What Matters", *For Entrepreneurs Blog*, 2022. Disponibile: [https://www.forentrepreneurs.com/saas-metrics-2/](https://www.forentrepreneurs.com/saas-metrics-2/)
2. Skok, D., "SaaS Metrics 2.0 – Detailed Definitions", *For Entrepreneurs Blog*, 2022. Disponibile: [https://www.forentrepreneurs.com/saas-metrics-2-definitions-2/](https://www.forentrepreneurs.com/saas-metrics-2-definitions-2/)
3. Chen, A., "The Power User Curve", *Andreessen Horowitz (a16z) Blog*, 2018. Disponibile: [https://a16z.com/the-power-user-curve/](https://a16z.com/the-power-user-curve/)
4. Reeves, B., Chen, A., "16 Startup Metrics", *Andreessen Horowitz (a16z)*, 2015. Disponibile: [https://a16z.com/16-startup-metrics/](https://a16z.com/16-startup-metrics/)
5. McClure, D., "Startup Metrics for Pirates: AARRR!", *500 Startups*, 2007. Disponibile: [https://www.slideshare.net/dmc500hats/startup-metrics-for-pirates-long-version](https://www.slideshare.net/dmc500hats/startup-metrics-for-pirates-long-version)
6. Hamid, M., "The SaaS Quick Ratio", *Social Capital Blog*, 2015. Disponibile: [https://medium.com/@mamaborgesma/the-saas-quick-ratio-a-simple-measure-of-saas-growth-health-3e4f21e67b1](https://medium.com/@mamaborgesma/the-saas-quick-ratio-a-simple-measure-of-saas-growth-health-3e4f21e67b1)
7. Tunguz, T., "Why Is Net Dollar Retention The Most Important Metric for SaaS Companies?", *Tomasz Tunguz Blog*, 2020. Disponibile: [https://tomtunguz.com/net-dollar-retention/](https://tomtunguz.com/net-dollar-retention/)
8. Rachitsky, L., "What is good retention?", *Lenny's Newsletter*, 2022. Disponibile: [https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29)
9. Rachitsky, L., "The North Star Metric", *Lenny's Newsletter*, 2023. Disponibile: [https://www.lennysnewsletter.com/p/what-is-a-north-star-metric](https://www.lennysnewsletter.com/p/what-is-a-north-star-metric)

### Report e Benchmark

1. Benchmarkit, "2025 SaaS Performance Metrics", Benchmarkit, 2025. Disponibile: [https://www.benchmarkit.ai/2025benchmarks](https://www.benchmarkit.ai/2025benchmarks)
2. Maxio, "2025 B2B SaaS Benchmarks Report", Maxio, 2025. Disponibile: [https://www.maxio.com/resources/2025-saas-benchmarks-report](https://www.maxio.com/resources/2025-saas-benchmarks-report)
3. re:cap, "SaaS Benchmarks 2025: Free Tool + Real B2B Metrics", re:cap, 2025. Disponibile: [https://www.re-cap.com/benchmarking-tool](https://www.re-cap.com/benchmarking-tool)
4. ChartMogul, "SaaS Growth Insights & Benchmarks", ChartMogul, 2025. Disponibile: [https://chartmogul.com/insights/](https://chartmogul.com/insights/)
5. Baremetrics, "Open Benchmarks – Live SaaS Metrics", Baremetrics, 2025. Disponibile: [https://baremetrics.com/open-benchmarks](https://baremetrics.com/open-benchmarks)
6. Pavilion, "2025 B2B SaaS Benchmarks: CAC, NRR & Growth Rate Metrics", Pavilion, 2025. Disponibile: [https://www.joinpavilion.com/resource/b2b-saas-performance-benchmarks](https://www.joinpavilion.com/resource/b2b-saas-performance-benchmarks)
7. KeyBanc Capital Markets, "2024 SaaS Survey Results", KeyBanc, 2024. Disponibile: [https://www.key.com/businesses-institutions/industry-expertise/technology/saas-survey.html](https://www.key.com/businesses-institutions/industry-expertise/technology/saas-survey.html)
8. Bessemer Venture Partners, "Bessemer Cloud Index", BVP, 2024. Disponibile: [https://www.bvp.com/cloud-index](https://www.bvp.com/cloud-index)
9. OpenView Partners, "2024 Product Benchmarks Report", OpenView, 2024. Disponibile: [https://openviewpartners.com/product-benchmarks/](https://openviewpartners.com/product-benchmarks/)
10. Mixpanel, "Product Benchmarks 2024", Mixpanel, 2024. Disponibile: [https://mixpanel.com/benchmarks/](https://mixpanel.com/benchmarks/)

### Libri e Pubblicazioni

1. Croll, A., Yoskovitz, B., *Lean Analytics: Use Data to Build a Better Startup Faster*, O'Reilly Media, 2013. ISBN: 978-1449335670
2. McClure, D., "Startup Metrics for Pirates", 500 Startups, 2007
3. Skok, D., "SaaS Metrics 2.0 – A Guide to Measuring and Improving What Matters", For Entrepreneurs Blog, 2022
4. Ellis, S., Brown, M., *Hacking Growth: How Today's Fastest-Growing Companies Drive Breakout Success*, Currency, 2017. ISBN: 978-0451497215
5. Ries, E., *The Lean Startup: How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses*, Crown Business, 2011. ISBN: 978-0307887894
6. Murphy, L., *Customer Success: How Innovative Companies Are Reducing Churn and Growing Recurring Revenue*, Wiley, 2016. ISBN: 978-1119167969
7. Zichermann, G., Cunningham, C., *Gamification by Design: Implementing Game Mechanics in Web and Mobile Apps*, O'Reilly Media, 2011. ISBN: 978-1449397678
8. Olsen, D., *The Lean Product Playbook*, Wiley, 2015. ISBN: 978-1118960875

### Tool e Documentazione

1. PostHog — Product Analytics Open Source. Documentazione: [https://posthog.com/docs](https://posthog.com/docs)
2. Stripe Billing — Subscription Management. Documentazione: [https://stripe.com/docs/billing](https://stripe.com/docs/billing)
3. Google Analytics 4 — Web Analytics. Documentazione: [https://developers.google.com/analytics](https://developers.google.com/analytics)
4. Supabase — Backend as a Service. Documentazione: [https://supabase.com/docs](https://supabase.com/docs)
5. Mixpanel — Event Analytics. Documentazione: [https://docs.mixpanel.com/](https://docs.mixpanel.com/)
6. Baremetrics — Revenue Analytics. Documentazione: [https://baremetrics.com/docs](https://baremetrics.com/docs)
7. Microsoft Clarity — Behavior Analytics. Documentazione: [https://learn.microsoft.com/en-us/clarity/](https://learn.microsoft.com/en-us/clarity/)
8. Plausible Analytics — Privacy-first Web Analytics. Documentazione: [https://plausible.io/docs](https://plausible.io/docs)