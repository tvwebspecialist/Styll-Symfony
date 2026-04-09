> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `internazionalizzazione.md`

---

# Internazionalizzazione & Espansione Mercati — Styll

> Documento di analisi strategica per l'internazionalizzazione della piattaforma **Styll**, SaaS verticale per barbieri con focus sulla retention.

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Readiness all'internazionalizzazione](#2-readiness-allinternazionalizzazione)
3. [Mappatura mercati](#3-mappatura-mercati)
4. [Schede mercato dettagliate](#4-schede-mercato-dettagliate)
5. [Matrice di opportunità](#5-matrice-di-opportunità)
6. [Strategia di localizzazione](#6-strategia-di-localizzazione)
7. [Pricing internazionale](#7-pricing-internazionale)
8. [Normative per paese](#8-normative-per-paese)
9. [Playbook di ingresso](#9-playbook-di-ingresso)
10. [Case study](#10-case-study)
11. [Rischi e mitigazioni](#11-rischi-e-mitigazioni)
12. [Riscontri e osservazioni per il tuo progetto](#12-riscontri-e-osservazioni-per-il-tuo-progetto)
13. [Bibliografia e Fonti per la Tesi](#13-bibliografia-e-fonti-per-la-tesi)

---

## 1. Introduzione

Styll è una piattaforma SaaS verticale pensata per barbieri e micro-professionisti del settore beauty. L'obiettivo centrale è la **retention del cliente** attraverso strumenti di loyalty gamificata, win-back automatico, churn detection silenzioso e branding white-label in formato PWA.

**Situazione attuale:**
- **Lingua:** Italiano
- **Mercato attuale:** Italia (137.730 attività barber/beauty sul territorio, 82,7% micro-imprenditori individuali)
- **Tipo di utenza:** Barbieri indipendenti e piccoli saloni (1–5 persone)
- **Settore:** Beauty & grooming — sotto-segmento barber shop
- **Stack tecnologico:** Next.js 14+ con App Router, TypeScript (frontend) + Supabase (backend, database, auth) — architettura SaaS multi-tenant, PWA lato cliente
- **Dipendenza da lingua/cultura:** Media-alta. L'esperienza è progettata per micro-professionisti italiani (terminologia, UX, flussi di comunicazione SMS/WhatsApp, cultura della fidelizzazione del barbiere). La localizzazione richiede adattamento linguistico, culturale e normativo.

Il presente documento analizza l'opportunità, la fattibilità e la strategia per portare Styll in mercati internazionali, identificando i paesi più promettenti e definendo un playbook operativo di ingresso.

---

## 2. Readiness all'internazionalizzazione

### Scorecard di readiness

La seguente scorecard valuta la preparazione di Styll per l'espansione internazionale su 6 criteri chiave, con punteggio da 1 (non pronto) a 10 (completamente pronto).

| # | Criterio | Punteggio (1-10) | Note |
|---|----------|:----------------:|------|
| 1 | **Architettura tecnica scalabile** | 8 | Architettura SaaS multi-tenant cloud-based (Supabase), PWA cross-platform. Nessun vincolo infrastrutturale locale. Supabase supporta deployment multi-region. |
| 2 | **Separazione contenuti/codice (i18n readiness)** | 5 | Attualmente l'interfaccia è in italiano hardcoded. Necessaria implementazione di un sistema i18n (es. next-i18next). La struttura Next.js facilita la modularizzazione. |
| 3 | **Indipendenza da valuta e pagamenti** | 4 | Pricing attuale in EUR. Necessaria integrazione con gateway multi-valuta (Stripe supporta 135+ valute). Nessun sistema PPP implementato. |
| 4 | **Product-market fit domestico validato** | 6 | Il prodotto è in fase di tesi/MVP. Il PMF italiano è in fase di validazione. La proposta di valore (retention-first, gamification) è unica nel settore e potenzialmente universale. |
| 5 | **Compliance e privacy (GDPR-ready)** | 7 | Essendo italiano, il prodotto è nativamente GDPR-compliant. Buona base per l'espansione in UE. Per mercati extra-UE servono adattamenti (CCPA, LGPD, Privacy Act). |
| 6 | **Team e risorse per l'espansione** | 3 | Progetto attualmente accademico (tesi). Team ridotto. Scalabilità del supporto e della localizzazione richiede risorse aggiuntive. |

**Punteggio totale: 33/60**

**Interpretazione:**
- **0–20:** Non pronto — focalizzarsi sul mercato domestico
- **21–35:** **Parzialmente pronto** — consolidare il PMF domestico, investire in i18n tecnico, pianificare l'espansione ← *Styll è qui*
- **36–50:** Pronto per l'espansione selettiva — iniziare con mercati adiacenti
- **51–60:** Pronto per l'espansione aggressiva

**Raccomandazione:** Styll ha un'architettura tecnica solida e una compliance GDPR nativa che costituiscono ottime fondamenta. Le aree di intervento prioritario prima dell'internazionalizzazione sono: (1) implementare i18n nel codebase Next.js, (2) integrare pagamenti multi-valuta, (3) validare il PMF in Italia.

---

## 3. Mappatura mercati

Analisi comparativa di 9 mercati target per l'espansione internazionale di Styll.

| Paese | Dim. mercato barber (USD) | Crescita annua (CAGR) | Lingua | Maturità digitale | Facilità di ingresso |
|-------|:-------------------------:|:---------------------:|--------|:------------------:|:--------------------:|
| 🇪🇸 Spagna | ~$1,2 mld | 4–5% | Spagnolo | Alta | ⭐⭐⭐⭐⭐ |
| 🇬🇧 Regno Unito | ~$1,8 mld | 4–5% | Inglese | Molto alta | ⭐⭐⭐⭐ |
| 🇩🇪 Germania | ~$1,5 mld | 3–4% | Tedesco | Molto alta | ⭐⭐⭐ |
| 🇫🇷 Francia | ~$1,4 mld | 3–4% | Francese | Alta | ⭐⭐⭐ |
| 🇺🇸 Stati Uniti | ~$5,8 mld | 4,2% | Inglese | Molto alta | ⭐⭐ |
| 🇧🇷 Brasile | ~$1,5 mld | 5–6% | Portoghese | Media | ⭐⭐⭐ |
| 🇦🇪 Emirati Arabi | ~$0,3 mld | 5–7% | Arabo/Inglese | Alta | ⭐⭐⭐ |
| 🇵🇹 Portogallo | ~$0,3 mld | 4–5% | Portoghese | Media-alta | ⭐⭐⭐⭐⭐ |
| 🇦🇺 Australia | ~$0,6 mld | 3–4% | Inglese | Molto alta | ⭐⭐⭐ |

> **Fonti:** Kentley Insights (2025), IBISWorld (2025), Statista — Software as a Service Worldwide (2024), Ken Research — Europe Salon & Beauty Services Market (2024).

---

## 4. Schede mercato dettagliate

### 4.1 🇪🇸 Spagna

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$1,2 miliardi (2024) |
| **Crescita annua** | 4–5% CAGR |
| **Popolazione digitale** | 44,4 milioni di utenti internet (93% della popolazione) |
| **Lingua** | Spagnolo (castigliano) + catalano, basco, galiziano |
| **Valuta** | Euro (EUR) — stessa valuta di Styll |
| **Willingness to pay** | Media-alta. Prezzo SaaS accettato: €15–30/mese per micro-professionisti |
| **Competitor locali** | Booksy (presente), Treatwell (presente), Bewe, MiAgenda. Nessun competitor forte con focus retention. |
| **Normative** | GDPR (membro UE). Fatturazione elettronica facoltativa ma in crescita. |
| **Fiscalità** | IVA 21%. Obbligo di emissione di fattura per servizi digitali B2B. |
| **Opportunità** | Cultura barber forte; stessa valuta (EUR); vicinanza culturale mediterranea; mercato SaaS beauty sotto-servito per i piccoli. Settore beauty/wellness in crescita del 8–11% annuo (Ken Research, 2024). |
| **Rischi** | Presenza di Booksy e Treatwell; frammentazione linguistica regionale (catalano, basco); adozione digitale lenta nei piccoli centri. |
| **Fonti** | Statista Digital Market Outlook — Spain (2024); Ken Research — Europe Salon & Beauty Services Market (2024); INE — Instituto Nacional de Estadística |

---

### 4.2 🇬🇧 Regno Unito

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$1,8 miliardi (2024) |
| **Crescita annua** | 4–5% CAGR. Il settore beauty UK è cresciuto del 9% nel 2024 (Professional Beauty, 2024). |
| **Popolazione digitale** | 63,7 milioni di utenti internet (94% della popolazione) |
| **Lingua** | Inglese |
| **Valuta** | Sterlina britannica (GBP) |
| **Willingness to pay** | Alta. Barbieri UK abituati a pagare £20–40/mese per software gestionali. |
| **Competitor locali** | Fresha (HQ Londra), Treatwell, Barberly, Timely, Phorest (forte in UK/IE). Mercato competitivo ma con spazio per soluzioni retention-first. |
| **Normative** | UK GDPR + Data Protection Act 2018. Post-Brexit, regime separato dall'UE ma sostanzialmente allineato. |
| **Fiscalità** | VAT 20%. Registrazione VAT obbligatoria per vendite digitali a consumatori UK. Digital Services Tax (2%) per ricavi da servizi digitali. |
| **Opportunità** | Mercato beauty più grande d'Europa. Oltre 61.000 esercizi hair & beauty. Altissima maturità digitale e propensione al SaaS. Lingua inglese = scalabilità globale del materiale marketing. |
| **Rischi** | Forte concorrenza (Fresha ha HQ a Londra). Necessità di adattamento valuta (GBP). Regime fiscale post-Brexit separato dall'UE. |
| **Fonti** | NHBF — Industry Statistics (2024); Professional Beauty UK (2024); PolicyBee — UK Hair and Beauty Industry Statistics (2025); Statista — SaaS UK (2024) |

---

### 4.3 🇩🇪 Germania

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$1,5 miliardi (2024) |
| **Crescita annua** | 3–4% CAGR |
| **Popolazione digitale** | 77,5 milioni di utenti internet (93% della popolazione) |
| **Lingua** | Tedesco |
| **Valuta** | Euro (EUR) |
| **Willingness to pay** | Alta. Mercato beauty & personal care tedesco stimato a $17–19 miliardi (Statista, 2024). Forte cultura della qualità. |
| **Competitor locali** | Treatwell (forte), Shore, Planity, Booksy. Competitor locali consolidati nella prenotazione, ma nessuno con gamification. |
| **Normative** | GDPR (membro UE). Bundesdatenschutzgesetz (BDSG) come normativa supplementare. Requisiti molto stringenti su consenso e trattamento dati. |
| **Fiscalità** | IVA 19%. Obbligo di fatturazione elettronica per B2B in fase di implementazione (2025). |
| **Opportunità** | Economia più grande d'Europa. Stessa valuta EUR. Alto potere d'acquisto. Forte cultura del grooming maschile. |
| **Rischi** | Barriera linguistica significativa (tedesco). Consumatori molto esigenti sulla privacy e sulla qualità. Localizzazione tedesca richiede cura estrema. Mercato conservatore nell'adozione di nuovi tool. |
| **Fonti** | Statista — Personal Care Market in Europe (2024); Cognitivemarketresearch — Europe Cosmetics and Beauty Industry Report (2026) |

---

### 4.4 🇫🇷 Francia

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$1,4 miliardi (2024) |
| **Crescita annua** | 3–4% CAGR |
| **Popolazione digitale** | 60,9 milioni di utenti internet (93% della popolazione) |
| **Lingua** | Francese |
| **Valuta** | Euro (EUR) |
| **Willingness to pay** | Media-alta. Forte cultura beauty, ma micro-professionisti sensibili al prezzo. |
| **Competitor locali** | Planity (leader locale per saloni), Treatwell, Fresha (nuovi uffici a Parigi nel 2025). La Francia ha un ecosistema di prenotazione locale consolidato. |
| **Normative** | GDPR (membro UE). CNIL come autorità garante. Requisiti specifici su cookie e consenso. |
| **Fiscalità** | IVA 20%. Regime di auto-entrepreneur diffuso tra barbieri. Obbligo di fatturazione certificata (NF 525). |
| **Opportunità** | Terzo mercato beauty in Europa. Stessa valuta EUR. Forte cultura barber (barbier) in crescita. 85.000+ saloni stimati. |
| **Rischi** | Forte concorrenza locale (Planity domina). Barriera linguistica. I francesi tendono a preferire soluzioni locali. Complessità fiscale (NF 525). |
| **Fonti** | Ken Research — Europe Salon & Beauty Services Market (2024); Bebeez — Fresha European Expansion (2025); Statista — France Beauty Market (2024) |

---

### 4.5 🇺🇸 Stati Uniti

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$5,8 miliardi (2024), previsto $6,4–7,0 miliardi entro il 2025 |
| **Crescita annua** | 4,2% CAGR (IBISWorld, 2025) |
| **Popolazione digitale** | 312 milioni di utenti internet (93% della popolazione) |
| **Lingua** | Inglese (+ spagnolo per significativa minoranza) |
| **Valuta** | Dollaro USA (USD) |
| **Willingness to pay** | Molto alta. Barbieri USA abituati a $24–50/mese per software. |
| **Competitor locali** | Squire, GlossGenius, theCut, Fresha, Boulevard, Vagaro, Square Appointments. Mercato molto competitivo e saturo nel segmento booking. |
| **Normative** | Nessuna legge federale privacy unificata. CCPA/CPRA (California), state-level laws in crescita. Regime opt-out. |
| **Fiscalità** | Sales tax variabile per stato (0–10,25%). Nexus rules complesse per SaaS. Nessuna IVA federale. |
| **Opportunità** | Mercato barbershop più grande al mondo. Altissima willingness to pay. Nessun competitor forte nella gamification della loyalty per barbieri indie. Mercato SaaS USA: ~$150–225 miliardi. |
| **Rischi** | Mercato estremamente competitivo. Costi di customer acquisition elevati. Complessità fiscale (sales tax per stato). Distanza culturale e fuso orario. Necessario supporto in inglese 24/7. |
| **Fonti** | IBISWorld — Barber Shops in the US (2025); Kentley Insights — Barber Shops Industry Report (2025); HaircutNow — 2025 Barber Business Outlook; Statista — SaaS US Market (2024) |

---

### 4.6 🇧🇷 Brasile

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$1,5 miliardi (2024, stima regionale Americas) |
| **Crescita annua** | 5–6% CAGR |
| **Popolazione digitale** | 187 milioni di utenti internet (87% della popolazione) |
| **Lingua** | Portoghese brasiliano |
| **Valuta** | Real brasiliano (BRL) |
| **Willingness to pay** | Media-bassa. PPP significativamente inferiore all'Europa. Prezzo SaaS accettato: R$50–100/mese (~€9–18). |
| **Competitor locali** | Booksy (presente), Trinks, Avec, iSalon. Mercato frammentato con molti operatori locali. |
| **Normative** | LGPD (Lei Geral de Proteção de Dados) — ispirata al GDPR. ANPD come autorità garante. |
| **Fiscalità** | PIS/COFINS + ISS su servizi digitali. Complessità fiscale elevata. Aliquote variabili per stato (ICMS). Nota Fiscal Eletrônica obbligatoria. |
| **Opportunità** | Mercato barber più grande dell'America Latina. Forte cultura del grooming maschile (barbearia). Popolazione giovane e digitalmente attiva. Crescita rapida dell'adozione SaaS. |
| **Rischi** | Willingness to pay bassa. Complessità fiscale estrema. Volatilità valutaria (BRL). Barriera linguistica. Infrastruttura internet disomogenea nelle aree rurali. |
| **Fonti** | DojoBusiness — Barbershop Industry Statistics (2026); Kentley Insights — Global Barber Shops Market Size (2025); DataGuidance — GDPR vs LGPD |

---

### 4.7 🇦🇪 Emirati Arabi Uniti

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$0,3 miliardi (2024, stima regionale Middle East & Africa ~$1 mld) |
| **Crescita annua** | 5–7% CAGR |
| **Popolazione digitale** | 9,7 milioni di utenti internet (99% della popolazione) |
| **Lingua** | Arabo (ufficiale), Inglese (lingua franca del business) |
| **Valuta** | Dirham (AED), ancorato al USD |
| **Willingness to pay** | Molto alta. Mercato premium/luxury. Barbieri disposti a pagare $30–60/mese per software di qualità. |
| **Competitor locali** | Fresha (presente), Booksy, poche soluzioni locali. Mercato SaaS beauty sotto-servito per soluzioni retention-first. |
| **Normative** | UAE Federal Decree-Law No. 45/2021 sulla protezione dei dati personali. Requisiti di data residency per alcuni settori. |
| **Fiscalità** | IVA 5% (tra le più basse al mondo). Nessuna imposta sul reddito per le società in free zone. Regime fiscale favorevole per SaaS. |
| **Opportunità** | Altissimo potere d'acquisto. Cultura del grooming maschile molto forte. Espansione luxury barbershop in Dubai e Abu Dhabi. Alta penetrazione smartphone. Mercato piccolo ma ad alto valore. |
| **Rischi** | Mercato piccolo in termini assoluti. Necessità di supporto RTL (right-to-left) per interfaccia araba. Dipendenza da popolazione espatriata (che può essere transitoria). |
| **Fonti** | MarketResearch.com — 2024 Global Barber Shops Industry Report; Kentley Insights — Global Barber Shops Market Size (2025) |

---

### 4.8 🇵🇹 Portogallo

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$0,3 miliardi (2024) |
| **Crescita annua** | 4–5% CAGR |
| **Popolazione digitale** | 8,6 milioni di utenti internet (84% della popolazione) |
| **Lingua** | Portoghese europeo |
| **Valuta** | Euro (EUR) — stessa valuta di Styll |
| **Willingness to pay** | Media. Prezzo SaaS accettato: €12–25/mese. PPP inferiore alla media UE. |
| **Competitor locali** | Fresha (presente), Treatwell (non presente), pochi competitor locali. Mercato sotto-servito. |
| **Normative** | GDPR (membro UE). CNPD come autorità garante. |
| **Fiscalità** | IVA 23%. Regime de contabilidade organizada per professionisti. Fatturazione elettronica in fase di espansione. |
| **Opportunità** | Vicinanza culturale e linguistica (tramite portoghese). Stessa valuta EUR. Mercato sotto-servito con pochi competitor. Gateway per il mercato brasiliano (lingua portoghese). Comunità italiana numerosa. |
| **Rischi** | Mercato piccolo in termini assoluti. Potere d'acquisto inferiore alla media UE. Adozione digitale in crescita ma più lenta. |
| **Fonti** | Statista — Portugal Digital Market Outlook (2024); Ken Research — Europe Salon & Beauty Services Market (2024) |

---

### 4.9 🇦🇺 Australia

| Parametro | Dettaglio |
|-----------|----------|
| **Dimensione mercato barber** | ~$0,6 miliardi (2024) |
| **Crescita annua** | 3–4% CAGR |
| **Popolazione digitale** | 24,4 milioni di utenti internet (93% della popolazione) |
| **Lingua** | Inglese |
| **Valuta** | Dollaro australiano (AUD) |
| **Willingness to pay** | Alta. Barbieri australiani abituati a pagare AUD 30–60/mese (~€18–36) per software. |
| **Competitor locali** | Fresha, Timely (NZ/AU), Shortcuts (locale), Square. Pochi competitor con focus retention. |
| **Normative** | Privacy Act 1988 + Australian Privacy Principles (APPs). Notifiable Data Breaches scheme. Penalità fino a AUD 50 milioni. |
| **Fiscalità** | GST 10%. Registrazione GST obbligatoria per vendite digitali ad australiani (soglia AUD 75.000). |
| **Opportunità** | Mercato maturo con alta propensione al SaaS. Forte cultura barber (soprattutto Melbourne, Sydney). Fuso orario gestibile con supporto asincrono. Lingua inglese. |
| **Rischi** | Distanza geografica e fuso orario. Mercato relativamente piccolo. Presenza di Timely e Fresha. Compliance Privacy Act richiede adattamenti specifici. |
| **Fonti** | Statista — Australia Beauty & Personal Care (2024); DLA Piper — Data Protection Laws of the World |

---

## 5. Matrice di opportunità

### Metodologia di scoring

Ogni mercato è valutato su 7 criteri con punteggio da 1 (basso) a 5 (alto). Il punteggio totale massimo è 35.

| Criterio | Peso | Descrizione |
|----------|:----:|-------------|
| Dimensione mercato barber | 1x | Valore assoluto del mercato barbershop |
| Crescita | 1x | Tasso di crescita annuo del settore |
| Willingness to pay | 1x | Disponibilità a pagare per software SaaS |
| Facilità di ingresso | 1,5x | Barriere linguistiche, culturali, normative, fiscali |
| Gap competitivo | 1,5x | Assenza di competitor con focus retention/gamification |
| Maturità digitale | 1x | Propensione all'adozione di strumenti digitali |
| Sinergia con Styll | 1x | Affinità culturale, valutaria, linguistica con il prodotto attuale |

### Scoring per mercato

| Paese | Dim. mercato | Crescita | WTP | Facilità ingresso (×1,5) | Gap competitivo (×1,5) | Maturità digitale | Sinergia | **Totale (/40)** |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 🇪🇸 Spagna | 3 | 4 | 3 | 5 (7,5) | 4 (6) | 4 | 5 | **32,5** |
| 🇬🇧 Regno Unito | 4 | 4 | 4 | 3 (4,5) | 3 (4,5) | 5 | 3 | **29,0** |
| 🇵🇹 Portogallo | 2 | 4 | 3 | 5 (7,5) | 5 (7,5) | 3 | 5 | **32,0** |
| 🇩🇪 Germania | 4 | 3 | 4 | 2 (3) | 3 (4,5) | 5 | 4 | **27,5** |
| 🇫🇷 Francia | 3 | 3 | 3 | 2 (3) | 2 (3) | 4 | 4 | **23,0** |
| 🇺🇸 Stati Uniti | 5 | 4 | 5 | 1 (1,5) | 3 (4,5) | 5 | 2 | **27,0** |
| 🇧🇷 Brasile | 4 | 5 | 2 | 2 (3) | 4 (6) | 3 | 3 | **26,0** |
| 🇦🇪 Emirati Arabi | 2 | 5 | 5 | 3 (4,5) | 4 (6) | 4 | 2 | **28,5** |
| 🇦🇺 Australia | 2 | 3 | 4 | 3 (4,5) | 3 (4,5) | 5 | 2 | **25,0** |

### 🏆 Top 3 mercati raccomandati

| Rank | Paese | Punteggio | Motivazione |
|:----:|-------|:---------:|-------------|
| 🥇 | **Spagna** | 32,5/40 | Massima sinergia: stessa valuta (EUR), vicinanza culturale mediterranea, GDPR già coperto, forte cultura barber, gap competitivo nella retention. Mercato ideale per il primo test internazionale. |
| 🥈 | **Portogallo** | 32,0/40 | Mercato sotto-servito con pochi competitor. Stessa valuta EUR, GDPR nativo. Gateway strategico per il Brasile (lingua portoghese). Facile da servire dall'Italia. |
| 🥉 | **Regno Unito** | 29,0/40 | Mercato beauty più grande d'Europa. Altissima maturità digitale e willingness to pay. La traduzione in inglese apre anche ad altri mercati anglofoni (Australia, USA). |

---

## 6. Strategia di localizzazione

### 6.1 Localizzazione del prodotto (L10n)

La localizzazione del prodotto va oltre la semplice traduzione. Per Styll, che è un tool brandizzato white-label, la localizzazione impatta tre livelli:

**Dashboard del professionista:**
- Traduzione completa dell'interfaccia
- Adattamento dei template di servizi (es. "Taglio" → "Corte" in spagnolo, "Haircut" in inglese)
- Formati data/ora localizzati (DD/MM/YYYY vs MM/DD/YYYY)
- Formati valuta e simboli
- Template di comunicazione (SMS, email, notifiche) localizzati

**App cliente (PWA):**
- L'app è brandizzata col nome del barbiere → la lingua segue quella del barbiere/mercato
- Traduzione del flusso di prenotazione, gamification, loyalty
- Terminologia adattata (es. "Streak" universale, "Badge" universale, ma descrizioni localizzate)

**Landing page e marketing:**
- Contenuti SEO locali per ogni mercato
- Case study e testimonianze locali
- Adattamento delle personas (es. "Marco il barbiere di Napoli" → "Carlos el barbero de Madrid")

### 6.2 Internazionalizzazione tecnica (i18n)

**Implementazione raccomandata per Next.js:**

1. **Libreria:** `next-i18next` (wrapper di react-i18next ottimizzato per Next.js, con supporto SSR/SSG nativo)
2. **Struttura file di traduzione:**
   ```
   /src/locales/
     ├── it/translation.json    (italiano — lingua base)
     ├── es/translation.json    (spagnolo)
     ├── en/translation.json    (inglese)
     ├── pt/translation.json    (portoghese)
     ├── de/translation.json    (tedesco)
     ├── fr/translation.json    (francese)
     └── ar/translation.json    (arabo)
   ```
3. **Detection automatica:** Lingua del browser (`navigator.language`) + preferenza utente salvata in profilo
4. **Pluralizzazione:** Gestita nativamente da i18next (regole diverse per lingua)
5. **RTL support:** Necessario per arabo (Emirati). Implementabile con attributo `dir="rtl"` e CSS logical properties
6. **Formattazione numeri/date/valute:** Utilizzare `Intl.NumberFormat` e `Intl.DateTimeFormat` (API native del browser)

### 6.3 Localizzazione dei contenuti

**Strategia contenuti per mercato:**
- Blog/SEO localizzato per ogni mercato target
- Materiali di onboarding tradotti e culturalmente adattati
- Template email/SMS pre-tradotti per ogni lingua
- Knowledge base multilingue
- Video tutorial con sottotitoli o voice-over locali

### 6.4 Tre livelli di localizzazione

| Livello | Descrizione | Sforzo | Mercati applicabili |
|---------|-------------|--------|---------------------|
| **L1 — Base** | Traduzione UI + formati data/valuta + template servizi locali + help center tradotto | Basso (2–4 settimane) | Spagna, Portogallo (primo test) |
| **L2 — Intermedio** | L1 + contenuti marketing locali + SEO locale + adattamento personas + supporto nella lingua locale (email) | Medio (1–2 mesi) | Regno Unito, Germania, Francia |
| **L3 — Avanzato** | L2 + supporto RTL + adattamento normativo/fiscale profondo + partnership locali + supporto telefonico locale | Alto (3–6 mesi) | USA, Brasile, Emirati Arabi, Australia |

---

## 7. Pricing internazionale

### 7.1 PPP Pricing (Purchasing Power Parity)

Il PPP pricing adatta il prezzo del prodotto al potere d'acquisto locale, garantendo accessibilità senza sacrificare il valore percepito. Si utilizza il Big Mac Index (The Economist) come proxy.

**Calcolo del fattore PPP:**

```
Fattore PPP = Prezzo Big Mac locale / Prezzo Big Mac USA ($5,79)
Prezzo locale = Prezzo base × Fattore PPP
```

### 7.2 Tabella prezzo per paese

Prezzo base di riferimento: **Tier 1 Starter = €25/mese** (Italia)

| Paese | Valuta | Fattore PPP | Prezzo Tier 1 (locale) | Prezzo Tier 1 (EUR equiv.) | Prezzo Tier 2 (locale) | Prezzo Tier 3 (locale) |
|-------|--------|:-----------:|:----------------------:|:--------------------------:|:----------------------:|:----------------------:|
| 🇮🇹 Italia | EUR | 1,00 | €25/mese | €25 | €55/mese | €119/mese |
| 🇪🇸 Spagna | EUR | 0,95 | €24/mese | €24 | €52/mese | €113/mese |
| 🇵🇹 Portogallo | EUR | 0,80 | €20/mese | €20 | €44/mese | €95/mese |
| 🇬🇧 Regno Unito | GBP | 0,99 | £21/mese | ~€25 | £46/mese | £99/mese |
| 🇩🇪 Germania | EUR | 1,05 | €26/mese | €26 | €58/mese | €125/mese |
| 🇫🇷 Francia | EUR | 1,00 | €25/mese | €25 | €55/mese | €119/mese |
| 🇺🇸 Stati Uniti | USD | 1,00 | $29/mese | ~€27 | $59/mese | $129/mese |
| 🇧🇷 Brasile | BRL | 0,45 | R$59/mese | ~€11 | R$129/mese | R$279/mese |
| 🇦🇪 Emirati Arabi | AED | 0,85 | 99 AED/mese | ~€25 | 219 AED/mese | 469 AED/mese |
| 🇦🇺 Australia | AUD | 0,90 | AUD 39/mese | ~€24 | AUD 85/mese | AUD 185/mese |

> **Nota:** I prezzi sono arrotondati a cifre "psicologiche" locali. Il fattore PPP è calcolato sulla base del Big Mac Index 2025 (The Economist) e del PPP conversion factor (World Bank, 2024).

### 7.3 Gestione multi-valuta

**Implementazione raccomandata:**

1. **Gateway di pagamento:** Stripe (supporta 135+ valute, presente in 46+ paesi, gestisce conversioni automatiche)
2. **Pricing in valuta locale:** Visualizzare e addebitare nella valuta locale del barbiere (non in EUR convertito)
3. **Stripe Billing + Tax:** Calcolo automatico IVA/GST/Sales Tax per ogni paese
4. **Invoicing:** Fatture generate nella lingua e valuta locale con requisiti fiscali del paese
5. **Fallback:** Per paesi non supportati da Stripe, considerare Paddle o FastSpring come Merchant of Record (MoR), che gestiscono IVA, imposte e compliance per il venditore

**Merchant of Record (MoR) vs Direct Selling:**

| Approccio | Pro | Contro | Raccomandato per |
|-----------|-----|--------|-----------------|
| **Direct selling** (Stripe) | Margini più alti, controllo completo | Responsabilità fiscale diretta, compliance per ogni paese | UE (GDPR/VAT OSS semplifica), UK |
| **MoR** (Paddle/FastSpring) | Zero gestione fiscale, compliance automatica | Commissioni più alte (5–10%), meno controllo | USA, Brasile, UAE, Australia |

---

## 8. Normative per paese

| Paese | Privacy / Data Protection | Fatturazione | Pagamenti | Fiscalità SaaS |
|-------|--------------------------|-------------|-----------|----------------|
| 🇮🇹 **Italia** | GDPR + Codice Privacy (D.Lgs. 196/2003) | Fattura elettronica obbligatoria (SDI) per B2B/B2C italiani | PSD2, Strong Customer Authentication | IVA 22%, reverse charge per B2B UE |
| 🇪🇸 **Spagna** | GDPR + LOPDGDD | Factura electrónica facoltativa, TicketBAI in Paesi Baschi | PSD2, SCA | IVA 21%, VAT OSS per vendite UE B2C |
| 🇬🇧 **Regno Unito** | UK GDPR + Data Protection Act 2018 | Invoice standard, Making Tax Digital (MTD) | FCA-regulated, SCA | VAT 20% + Digital Services Tax 2% |
| 🇩🇪 **Germania** | GDPR + BDSG | GoBD-compliant invoicing, KassenSichV per registratori | PSD2, SCA, BaFin-regulated | USt. 19%, Reverse Charge per B2B UE |
| 🇫🇷 **Francia** | GDPR + Loi Informatique et Libertés (CNIL) | Facture électronique obbligatoria 2026 (B2B), NF 525 | PSD2, SCA, ACPR-regulated | TVA 20%, regime auto-entrepreneur |
| 🇺🇸 **Stati Uniti** | CCPA/CPRA (California), state-level laws | Invoice standard, no e-invoicing federale | PCI DSS, state money transmitter laws | Sales tax variabile per stato (0–10,25%) |
| 🇧🇷 **Brasile** | LGPD (Lei Geral de Proteção de Dados) | Nota Fiscal Eletrônica obbligatoria | Banco Central-regulated, PIX | PIS/COFINS + ISS + ICMS, complessità alta |
| 🇦🇪 **Emirati Arabi** | Federal Decree-Law No. 45/2021, data residency | Tax Invoice obbligatoria, e-invoicing in fase di adozione | CBUAE-regulated | VAT 5%, Free Zone exemptions |
| 🇦🇺 **Australia** | Privacy Act 1988 + APPs | Tax Invoice standard, ATO requirements | ASIC-regulated, NPP (PayID) | GST 10%, soglia AUD 75.000 per registrazione |

> **Raccomandazione:** Per i mercati extra-UE (USA, Brasile, UAE, Australia), utilizzare un Merchant of Record (Paddle o FastSpring) che gestisce automaticamente la compliance fiscale e normativa come rivenditore, eliminando la necessità di registrazione fiscale diretta in ogni paese.

---

## 9. Playbook di ingresso

### Fase 1 — Test (Mesi 1–3)

**Obiettivo:** Validare la domanda in 1–2 mercati pilota senza investimento strutturale.

**Azioni:**
1. **Implementare i18n nel codebase Next.js** — Estrarre tutte le stringhe hardcoded, configurare `next-i18next`, creare file di traduzione per spagnolo e portoghese
2. **Tradurre l'interfaccia** in spagnolo (Spagna) e portoghese (Portogallo) — Livello L1
3. **Configurare Stripe** per accettare pagamenti in EUR dai nuovi mercati (stessa valuta, configurazione minima)
4. **Landing page localizzata** — Creare versioni spagnola e portoghese della landing page di Styll
5. **Campagna di acquisizione micro-budget** — Instagram/Facebook Ads geolocalizzati su barbieri in Spagna e Portogallo (budget: €500–1.000/mercato)
6. **Raccogliere feedback** — Interviste con i primi 10–20 barbieri per mercato
7. **Metriche chiave:** Sign-up rate, activation rate, NPS, feedback qualitativo

**Budget stimato:** €3.000–5.000 totali
**Team:** 1 founder/developer + 1 traduttore freelance

---

### Fase 2 — Validazione (Mesi 4–8)

**Obiettivo:** Raggiungere 50–100 barbieri attivi nei mercati pilota e validare il modello economico.

**Azioni:**
1. **Localizzazione L2** — Contenuti marketing locali, SEO locale, adattamento personas
2. **Pricing validation** — Testare 2–3 fasce di prezzo per mercato (A/B test)
3. **Supporto nella lingua locale** — Almeno email support in spagnolo e portoghese
4. **Community building** — Gruppi Facebook/WhatsApp per barbieri utenti in ogni mercato
5. **Primo mercato anglofono** — Traduzione inglese (UK) e apertura al Regno Unito
6. **Referral program localizzato** — "Invita un collega barbiere, ricevi 1 mese gratis"
7. **Partnership locali** — Contattare associazioni di barbieri, fornitori di prodotti, influencer locali
8. **Metriche chiave:** MRR per mercato, churn rate, CAC, LTV, retention rate

**Budget stimato:** €8.000–15.000
**Team:** 1–2 developer + 1 marketing/growth + traduttori freelance

---

### Fase 3 — Scaling (Mesi 9–18)

**Obiettivo:** Scalare i mercati validati e aprirne di nuovi.

**Azioni:**
1. **Localizzazione L2/L3** per mercati validati — Tedesco (Germania), francese (Francia)
2. **Merchant of Record** — Integrare Paddle o FastSpring per mercati extra-UE (USA, Brasile, Australia)
3. **Content marketing internazionale** — Blog SEO multi-lingua, video tutorial, academy
4. **Supporto multi-lingua** — Chat live o ticketing in 4+ lingue
5. **Partnership strategiche** — Distributori di prodotti barber, academy di formazione, brand ambassador locali
6. **Product-led growth internazionale** — Viral loop: il barbiere condivide l'app → i clienti vedono il brand → altri barbieri scoprono Styll
7. **Valutare mercati premium:** UAE (alto valore per cliente) e USA (massima scala)
8. **Metriche chiave:** Revenue per mercato, market share stimata, payback period per mercato

**Budget stimato:** €30.000–80.000
**Team:** 3–5 persone (dev, marketing, support, sales)

---

## 10. Case study

### 10.1 Fresha — Da Shedul a leader globale in 120+ paesi

**Contesto:** Fresha (ex Shedul) è una piattaforma di prenotazione e gestione per saloni, fondata a Londra nel 2015.

**Strategia di espansione:**
- Modello freemium: software gratuito, monetizzazione su pagamenti e servizi aggiuntivi
- Localizzazione aggressiva: 22 lingue supportate, valute locali, gateway di pagamento locali
- Uffici regionali in Europa (Londra, Madrid, Parigi, Amsterdam), Americas e Middle East

**Risultati:**
- 450.000+ business attivi in 120+ paesi (2024)
- $100M+ di revenue stimato annuo
- Nuovi uffici a Madrid, Parigi e Amsterdam nel 2025

**Lezione per Styll:** La localizzazione profonda (lingua + valuta + compliance) è stata chiave. Il modello freemium ha accelerato l'adozione. Fresha ha iniziato in UK e poi si è espansa in mercati adiacenti.

> Fonti: PRNewswire (2023); The Salon Magazine (2024); Bebeez (2025)

---

### 10.2 Typeform — Dalla Spagna al mercato globale

**Contesto:** Typeform è un SaaS di form e survey fondato a Barcellona nel 2012.

**Strategia di espansione:**
- Prodotto nativo in inglese fin dal lancio, nonostante il team fosse spagnolo
- Product-led growth: il prodotto si diffonde perché gli utenti lo condividono (ogni form è un touchpoint di marketing)
- Localizzazione progressiva dell'interfaccia in 10+ lingue

**Risultati:**
- Milioni di utenti globali
- >60% del revenue da mercati non spagnoli entro il quarto anno
- Acquisizione da Typeform da parte di fondi europei e americani

**Lezione per Styll:** Partire con l'inglese (anche da un mercato non anglofono) massimizza la scala. Il prodotto stesso può essere veicolo di acquisizione internazionale (la PWA del barbiere è visibile ai clienti → effetto virale).

> Fonti: Vitikainen, A. (2023), *International expansion of SaaS companies*, University of Turku; IpaNovia — Global Expansion Strategy SaaS (2024)

---

### 10.3 Calendly — Crescita virale internazionale

**Contesto:** Calendly è un SaaS di scheduling fondato ad Atlanta (USA) nel 2013.

**Strategia di espansione:**
- Viralità intrinseca: ogni invito di scheduling espone un nuovo utente al prodotto
- Supporto per fusi orari globali fin dalla v1
- Localizzazione progressiva (10+ lingue)
- Freemium model + enterprise tier

**Risultati:**
- 20M+ utenti in 200+ paesi
- $350M+ ARR (2023)
- Crescita quasi interamente product-led, senza team di vendita internazionali iniziali

**Lezione per Styll:** La viralità del prodotto (il cliente del barbiere usa la PWA → scopre Styll → lo suggerisce al proprio barbiere) può replicare il modello Calendly. Investire nella viralità intrinseca è più efficiente del paid marketing internazionale.

> Fonti: SaaSLaunchr — 10 SaaS Growth Case Studies (2024); Zuora — 10 Essential SaaS Growth Strategies (2024)

---

### 10.4 Booksy — Dall'Europa dell'Est al mercato globale

**Contesto:** Booksy è un marketplace di prenotazione per barbieri e saloni, fondato in Polonia nel 2015.

**Strategia di espansione:**
- Lancio iniziale in Polonia, poi espansione in UK, USA, Brasile, Spagna, Sudafrica, Messico
- Modello marketplace: l'acquisizione di barbieri in ogni mercato richiede team locali
- Localizzazione completa per ogni mercato (lingua, valuta, pagamenti, normative)

**Risultati:**
- 60.000+ business attivi in 7 paesi
- Forte presenza in USA e Brasile
- Raccolta fondi per $130M+ per finanziare l'espansione

**Lezione per Styll:** Booksy dimostra che un prodotto barber-focused può scalare internazionalmente. Tuttavia, il modello marketplace richiede investimenti pesanti in ogni mercato. Il modello SaaS brandizzato di Styll è più leggero da scalare.

> Fonti: The Salon Business — Best 9 Salon Software (2025); Crunchbase — Booksy

---

### 10.5 Phorest — Dall'Irlanda al mercato enterprise internazionale

**Contesto:** Phorest è un SaaS per saloni medio-grandi, fondato a Dublino nel 2003.

**Strategia di espansione:**
- Focus iniziale su Irlanda e UK, poi espansione in USA, Germania, Australia
- Modello high-touch: onboarding assistito, migrazione dati concierge, team di vendita locale
- Feature differenzianti: TreatCard (loyalty), ReConnect (win-back), Reputation Manager

**Risultati:**
- 9.000+ saloni in 5 paesi
- Revenue stimato $30M+/anno
- Acquisizione da parte del gruppo Constellation Software

**Lezione per Styll:** Phorest dimostra che le feature di retention (loyalty + win-back) sono un differenziatore forte anche in mercati internazionali. Tuttavia, il modello high-touch ($99+/mese + contratti annuali) limita la scala ai saloni grandi. Styll può portare queste feature ai micro-professionisti a un prezzo accessibile.

> Fonti: The Salon Business — Best 9 Salon Software (2025); Phorest.com — Company About

---

## 11. Rischi e mitigazioni

| # | Rischio | Probabilità | Impatto | Mitigazione |
|---|---------|:-----------:|:-------:|-------------|
| 1 | **Mancanza di PMF domestico prima dell'espansione** | Alta | Critico | Validare il PMF in Italia con almeno 50 barbieri attivi prima di internazionalizzare. L'espansione prematura è la causa #1 di fallimento per startup SaaS. |
| 2 | **Risorse insufficienti per supporto multi-lingua** | Alta | Alto | Iniziare con supporto email asincrono + knowledge base tradotta. Usare tool AI (es. DeepL, ChatGPT) per triage multilingue. Assumere freelancer madrelingua per i mercati chiave. |
| 3 | **Complessità fiscale nei mercati extra-UE** | Media | Alto | Utilizzare un Merchant of Record (Paddle/FastSpring) che gestisce IVA, sales tax, compliance fiscale automaticamente. Per l'UE, usare il regime VAT OSS (One-Stop-Shop). |
| 4 | **Competitor locali con più risorse** | Media | Medio | Differenziarsi con gamification (unica nel settore), pricing trasparente e supporto umano. Non competere sul budget marketing, ma sulla qualità del prodotto e viralità. |
| 5 | **Traduzione di bassa qualità** | Media | Medio | Evitare la traduzione automatica per l'interfaccia utente. Usare traduttori professionisti madrelingua. Far validare le traduzioni da barbieri reali nel mercato target. |
| 6 | **Frammentazione dell'attenzione** | Alta | Alto | Massimo 2 mercati alla volta. Validare prima di espandere. Ogni nuovo mercato deve raggiungere breakeven prima di aprire il successivo. |
| 7 | **Volatilità valutaria** (Brasile, UAE) | Media | Medio | Pricing in valuta locale con revisione trimestrale. Per il Brasile, considerare pricing ancorato al dollaro con conversione locale. |
| 8 | **Fallimento del modello virale in mercati diversi** | Bassa | Medio | Testare il viral loop (barbiere → cliente PWA → nuovo barbiere) in ogni mercato. Se non funziona, investire in canali di acquisizione locali (Instagram, partnership). |
| 9 | **Problemi di compliance privacy** | Bassa | Critico | Audit privacy prima dell'ingresso in ogni mercato. Mappare i requisiti specifici (GDPR UE, UK GDPR, CCPA, LGPD, Privacy Act). Considerare un DPO esterno. |
| 10 | **Distanza culturale sottovalutata** | Media | Medio | Per ogni mercato, condurre interviste con 10+ barbieri locali prima del lancio. Adattare non solo la lingua, ma anche il tono, gli esempi e le comunicazioni. |

---

## 12. Riscontri e osservazioni per il tuo progetto

### Punti di forza per l'internazionalizzazione

1. **Architettura cloud-native multi-tenant:** Supabase + Next.js è uno stack moderno, scalabile e senza vincoli geografici. Supporta deployment multi-region con minimo sforzo.

2. **Proposta di valore universale:** La retention del cliente (loyalty, win-back, churn detection) è un bisogno universale per i barbieri, indipendentemente dal paese. La gamification non ha barriere culturali (Duolingo lo dimostra).

3. **Modello white-label PWA:** Il fatto che l'app appaia come "l'app del barbiere" e non come una piattaforma esterna elimina il problema del brand recognition in nuovi mercati. Il barbiere è il brand, non Styll.

4. **Viralità intrinseca:** Ogni cliente che usa la PWA è un potenziale touchpoint per un nuovo barbiere. Questo effetto virale può funzionare cross-border (un barbiere italiano in Spagna, un cliente che si trasferisce, ecc.).

5. **Pricing accessibile:** €19–29/mese è competitivo a livello globale per il segmento micro-professionisti. Con PPP pricing, è accessibile anche in mercati a basso potere d'acquisto.

### Aree di intervento prioritario

1. **i18n tecnico (priorità 1):** Implementare `react-i18next` e estrarre tutte le stringhe hardcoded. Questa è la precondizione tecnica per qualsiasi espansione. Stimato: 2–3 settimane di sviluppo.

2. **Integrazione Stripe multi-valuta (priorità 2):** Configurare Stripe Billing con pricing in valute locali e calcolo automatico IVA. Stimato: 1–2 settimane.

3. **Validazione PMF Italia (priorità 0):** Prima di internazionalizzare, raggiungere almeno 50 barbieri attivi paganti in Italia. L'espansione internazionale senza PMF domestico è prematura.

4. **Strategia linguistica:** Per la tesi, raccomando di implementare almeno il supporto inglese e spagnolo come proof of concept dell'architettura i18n, dimostrando la scalabilità della piattaforma.

### Osservazioni specifiche per la tesi

- L'internazionalizzazione è un capitolo forte per la tesi perché dimostra la **scalabilità** dell'architettura multi-tenant e la **generalizzabilità** della soluzione.
- La matrice di opportunità e il playbook di ingresso possono essere presentati come **framework decisionale** riutilizzabile per altri SaaS verticali.
- I case study (Fresha, Typeform, Calendly, Booksy, Phorest) forniscono **validazione empirica** della strategia proposta.
- Il PPP pricing e la tabella normativa dimostrano una **comprensione delle complessità** del business internazionale, elemento valorizzato nelle tesi di ambito economico-tecnologico.

---

## 13. Bibliografia e Fonti per la Tesi

### Fonti accademiche e report di ricerca

1. Fortune Business Insights. (2024). *Software as a Service (SaaS) Market Size, Global Report 2024–2034*. Disponibile su: https://www.fortunebusinessinsights.com/software-as-a-service-saas-market-102222

2. Gartner, Inc. (2024). *Market Share: Enterprise Application Software as a Service, Worldwide, 2023*. Gartner Research.

3. Vitikainen, A. (2023). *International expansion of SaaS companies*. Bachelor's thesis, University of Turku. Disponibile su: https://www.utupub.fi/handle/10024/177476

4. Statista. (2024). *Software as a Service — Worldwide: Market Forecast*. Statista Digital Market Outlook. Disponibile su: https://www.statista.com/outlook/tmo/public-cloud/software-as-a-service/worldwide

5. Statista. (2024). *Personal Care Market in Europe — Statistics and Facts*. Disponibile su: https://www.statista.com/topics/4132/personal-care-market-in-europe/

### Report di settore

6. Ken Research. (2024). *Europe Salon & Beauty Services Market Size, Trends, Growth Forecast*. Disponibile su: https://www.kenresearch.com/industry-reports/europe-salon-beauty-services-market

7. Deep Market Insights. (2025). *Europe Professional Beauty Services Market Size & Outlook, 2025–2033*. Disponibile su: https://deepmarketinsights.com/vista/insights/professional-beauty-services-market/europe

8. Cognitive Market Research. (2026). *Europe Cosmetics and Beauty Industry Report*. Disponibile su: https://www.cognitivemarketresearch.com/regional-analysis/europe-cosmetics-and-beauty-market-report

9. Kentley Insights. (2025). *Global Barber Shops Market Size 2025*. Disponibile su: https://www.kentleyinsights.com/barber-shops-market-size/

10. IBISWorld. (2025). *Barber Shops in the US Industry Analysis, 2025*. Disponibile su: https://www.ibisworld.com/united-states/industry/barber-shops/5806/

11. NHBF — National Hair & Beauty Federation. (2024). *Industry Statistics*. Disponibile su: https://www.nhbf.co.uk/about-the-nhbf/campaigning-for-you/industry-research-reports-and-statistics/nhbf-industry-statistics/

12. Professional Beauty UK. (2024). *UK beauty sector grew 9% in 2024, driven by salon and spa services*. Disponibile su: https://professionalbeauty.co.uk/uk-beauty-industry-growth-2024-gdp-report

### Normative e compliance

13. European Commission. (2016). *Regulation (EU) 2016/679 — General Data Protection Regulation (GDPR)*. Official Journal of the European Union.

14. DataGuidance / OneTrust. (2024). *Comparing privacy laws: GDPR v. LGPD*. Disponibile su: https://www.dataguidance.com/sites/default/files/gdpr_v_lgpd_revised_edition.pdf

15. DLA Piper. (2024). *Data Protection Laws of the World*. Disponibile su: https://www.dlapiperdataprotection.com/

16. Usercentrics. (2026). *Global Data Privacy Laws: Your 2026 Guide*. Disponibile su: https://usercentrics.com/guides/data-privacy/data-privacy-laws/

### Pricing e PPP

17. The Economist. (2025). *The Big Mac Index*. Disponibile su: https://www.economist.com/big-mac-index

18. World Bank. (2024). *PPP conversion factor, GDP (LCU per international $)*. Disponibile su: https://data.worldbank.org/indicator/PA.NUS.PPP

19. OECD. (2024). *Purchasing Power Parities (PPP)*. Disponibile su: https://www.oecd.org/en/data/indicators/purchasing-power-parities-ppp.html

### SaaS growth e internazionalizzazione

20. SaaSLaunchr. (2024). *10 SaaS Growth Case Studies to Inspire Your Startup*. Disponibile su: https://www.saaslaunchr.com/saas-growth-case-studies/

21. Zuora. (2024). *The 10 Essential SaaS Growth Strategies: International Expansion*. Disponibile su: https://www.zuora.com/subscribed/international-expansion-10-essential-saas-growth-strategies/

22. IpaNovia. (2024). *Global Expansion Strategy SaaS*. Disponibile su: https://www.ipanovia.com/global-expansion-saas/

23. SaaSConsult. (2025). *SaaS GTM for International Markets — Strategic Expansion Framework for 2025*. Disponibile su: https://saasconsult.co/blog/saas-gtm-strategy-international-expansion/

### Competitor analysis

24. The Salon Business. (2025). *Best 9 Salon Software 2025: Quick Guide*. Disponibile su: https://thesalonbusiness.com/best-9-salon-software-quick-guide/

25. Bebeez. (2025). *Fresha Accelerates European Expansion with New Offices in Madrid, Paris and the Netherlands*. Disponibile su: https://bebeez.eu/2025/02/27/fresha-accelerates-european-expansion-with-new-offices-in-madrid-paris-and-the-netherlands/

### Dati di mercato supplementari

26. HaircutNow. (2025). *2025 Barber Business Outlook: Trends, Growth & Opportunities*. Disponibile su: https://haircutnow.com/the-barber-business-in-2025-report/

27. DojoBusiness. (2026). *Barbershop Industry: Market Statistics and Growth*. Disponibile su: https://dojobusiness.com/blogs/news/barbershop-industry-statistics

28. PolicyBee. (2025). *UK Hair and Beauty Industry Statistics 2025*. Disponibile su: https://www.policybee.co.uk/blog/uk-hair-and-beauty-industry-statistics

29. SpreadThoughts. (2024). *SaaS Market Size by Country — US, India, UK & Global Forecast*. Disponibile su: https://www.spreadthoughts.com/saas-market-size-by-country/

30. Vena Solutions. (2026). *85 SaaS Statistics, Trends and Benchmarks for 2026*. Disponibile su: https://www.venasolutions.com/blog/saas-statistics