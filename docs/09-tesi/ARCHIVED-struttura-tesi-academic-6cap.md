> ⚠️ **DOCUMENTO ARCHIVIATO**
> Questa struttura tesi a 6 capitoli in stile academic (case study Yin) era una proposta elaborata prima della definizione del contesto ABA (Accademia di Belle Arti). È stata superata dalla struttura a 8 capitoli definita in `indice-tesi.md`. Conservata per riferimento storico.

---

# Struttura Tesi — Progetto Styll

> Documento di pianificazione per la stesura della tesi di laurea sul progetto Styll: piattaforma SaaS verticale per la fidelizzazione nel settore barbershop con gamification e rilevamento silenzioso del churn.

---

## 1. INFORMAZIONI GENERALI

### Titolo proposto

**Styll: un modello SaaS verticale con gamification per la retention dei micro-professionisti nel settore barbershop — Analisi di mercato, architettura e strategia di crescita**

### Titoli alternativi

1. *Fidelizzazione gamificata nel settore barbershop: progettazione e validazione di una piattaforma SaaS verticale per micro-imprese*
2. *Silent Churn Detection e loyalty gamificata: un case study sulla digitalizzazione dei barbieri indipendenti italiani*
3. *Dal booking alla retention: un modello di business SaaS white-label per la trasformazione digitale del settore barbershop*

### Tipo di tesi

Tesi di Laurea Magistrale

### Area disciplinare

Economia e Management dell'Innovazione / Marketing Digitale / Imprenditorialità e Startup

### Domande di ricerca

- **RQ1:** Una piattaforma SaaS verticale con loyalty gamificata e rilevamento silenzioso del churn può costituire un modello di business sostenibile per la retention dei micro-professionisti nel settore barbershop?
- **RQ2:** Quali meccaniche di gamification risultano più efficaci nel favorire la fidelizzazione dei clienti finali e la riduzione del churn silenzioso in un contesto di micro-imprese di servizi alla persona?
- **RQ3:** Quale strategia di pricing e go-to-market consente a una piattaforma SaaS verticale di raggiungere la sostenibilità economica nel mercato italiano dei barbieri indipendenti (137.730 attività)?

### Obiettivi

1. Analizzare il panorama competitivo delle soluzioni SaaS per il settore barbershop/beauty, identificando gap di mercato e opportunità di differenziazione.
2. Progettare e descrivere l'architettura di una piattaforma SaaS verticale (Styll) con sistema di gamification a 4 livelli e rilevamento silenzioso del churn.
3. Definire e validare un modello di business a 3 tier di pricing (€19/€49/€149 al mese) attraverso analisi di mercato, voice of customer e benchmark competitivo.
4. Elaborare una strategia di crescita product-led con piano di internazionalizzazione su 9 mercati target.
5. Contribuire alla letteratura sull'applicazione della gamification nei programmi di fidelizzazione B2B2C per micro-imprese.

### Contributo originale

La tesi offre un contributo originale su tre fronti: (a) l'applicazione sistematica della gamification alla retention B2B2C nel settore dei micro-professionisti, un ambito scarsamente esplorato dalla letteratura accademica; (b) la concettualizzazione e progettazione di un meccanismo di *silent churn detection* specifico per attività con prenotazioni ricorrenti; (c) l'analisi approfondita di un modello di business SaaS verticale white-label in un mercato frammentato (137.730 barbieri indipendenti in Italia), con validazione attraverso analisi competitiva su 13 piattaforme e studio della voice of customer su oltre 2.800 recensioni.

---

## 2. ABSTRACT

### Bozza in italiano (circa 250 parole)

La digitalizzazione dei micro-professionisti rappresenta una delle sfide più rilevanti nell'economia dei servizi alla persona. Nel settore barbershop, caratterizzato da un'elevata frammentazione (137.730 attività in Italia) e da una limitata adozione di strumenti digitali avanzati, il fenomeno del *silent churn* — l'abbandono graduale e non comunicato da parte dei clienti — costituisce una minaccia significativa alla sostenibilità delle attività.

Il presente lavoro analizza la progettazione e la validazione del modello di business di Styll, una piattaforma SaaS verticale white-label che integra un sistema di fidelizzazione gamificata a quattro livelli (punti, tier, streak, badge) con un meccanismo proprietario di rilevamento silenzioso del churn e win-back automatico. La ricerca adotta un approccio di case study singolo integrato (Yin, 2018) con metodologia mixed-method, combinando desk research, analisi competitiva su 13 piattaforme concorrenti e studio qualitativo della voice of customer su oltre 2.800 recensioni.

L'analisi di mercato identifica un gap significativo: le piattaforme esistenti si concentrano prevalentemente sulla fase di booking, trascurando la retention come leva strategica. Styll si posiziona come soluzione *brand-first retention platform*, con un modello di pricing a tre livelli (€19/€49/€149 mensili) e architettura tecnica basata su React, Supabase e PWA multi-tenant.

I risultati evidenziano come l'integrazione di meccaniche di gamification fondate sulla Self-Determination Theory (Deci & Ryan, 1985) con algoritmi di churn prediction possa generare un vantaggio competitivo sostenibile. La tesi contribuisce alla letteratura sulla business model innovation nei mercati verticali SaaS e sull'applicazione della gamification nei contesti B2B2C per micro-imprese.

### Draft in English (circa 250 words)

The digitalization of micro-professionals represents one of the most significant challenges in the personal services economy. In the barbershop sector, characterized by high fragmentation (137,730 businesses in Italy alone) and limited adoption of advanced digital tools, silent churn — the gradual, uncommunicated abandonment by clients — poses a significant threat to business sustainability.

This thesis analyzes the design and validation of the business model of Styll, a vertical white-label SaaS platform that integrates a four-layer gamified loyalty system (points, tiers, streaks, badges) with a proprietary silent churn detection and automated win-back mechanism. The research adopts a single embedded case study approach (Yin, 2018) with a mixed-method methodology, combining desk research, competitive analysis across 13 competing platforms, and qualitative voice-of-customer analysis of over 2,800 reviews.

The market analysis identifies a significant gap: existing platforms focus predominantly on the booking phase, neglecting retention as a strategic lever. Styll positions itself as a brand-first retention platform, with a three-tier pricing model (€19/€49/€149 per month) and a technical architecture built on React, Supabase, and multi-tenant PWA.

The findings demonstrate how integrating gamification mechanics grounded in Self-Determination Theory (Deci & Ryan, 1985) with churn prediction algorithms can generate a sustainable competitive advantage. The thesis contributes to the literature on business model innovation in vertical SaaS markets and the application of gamification in B2B2C contexts for micro-enterprises.

### Parole chiave

**Italiano:** SaaS verticale, gamification, fidelizzazione clienti, silent churn, barbershop, micro-imprese, business model innovation, product-led growth, subscription economy, trasformazione digitale

**English:** Vertical SaaS, gamification, customer retention, silent churn, barbershop, micro-enterprises, business model innovation, product-led growth, subscription economy, digital transformation

---

## 3. STRUTTURA CAPITOLI DETTAGLIATA

### INTRODUZIONE (15–20 pp.)

- **Contesto generale:** la digitalizzazione dei micro-professionisti nell'economia dei servizi alla persona
- **Il problema:** il silent churn nel settore barbershop e l'inadeguatezza delle soluzioni esistenti
- **Domande di ricerca:** presentazione di RQ1, RQ2, RQ3
- **Obiettivi della ricerca:** obiettivi conoscitivi, progettuali e di validazione
- **Metodologia:** introduzione all'approccio case study singolo integrato
- **Rilevanza della ricerca:** contributo teorico e implicazioni manageriali
- **Struttura della tesi:** panoramica dei capitoli e della logica argomentativa

---

### CAPITOLO 1 — Revisione della Letteratura (30–40 pp.)

#### 1.1 Il modello Software-as-a-Service (SaaS)
- 1.1.1 Definizione e caratteristiche fondamentali del SaaS
- 1.1.2 Evoluzione storica: dal software on-premise al cloud computing (Mell & Grance, 2011)
- 1.1.3 Il SaaS nel contesto del cloud computing: IaaS, PaaS, SaaS (Cusumano, 2010)
- 1.1.4 Architetture multi-tenant e implicazioni tecniche (Bezemer & Zaidman, 2010; Krebs, Momm & Kounev, 2012)
- 1.1.5 SaaS verticale vs. orizzontale: definizioni e tendenze emergenti
- 1.1.6 La trasformazione SaaS delle industrie tradizionali (Gao, Sunyaev & Leimeister, 2020; Dubey & Wagle, 2007)

#### 1.2 Business Model Innovation
- 1.2.1 Definizione e tassonomia dei modelli di business (Zott, Amit & Massa, 2011)
- 1.2.2 Il Business Model Canvas (Osterwalder & Pigneur, 2010)
- 1.2.3 Il Lean Canvas per startup digitali (Maurya, 2012)
- 1.2.4 Business model design e cattura del valore (Teece, 2010; Chesbrough, 2010)
- 1.2.5 Modelli di business per piattaforme digitali (Parker, Van Alstyne & Choudary, 2016)
- 1.2.6 L'economia dell'informazione e le regole dei network (Shapiro & Varian, 1999)

#### 1.3 Lean Startup e validazione del mercato
- 1.3.1 I principi del Lean Startup (Ries, 2011)
- 1.3.2 Customer Development e validazione (Blank, 2013)
- 1.3.3 Tecniche di validazione qualitativa: The Mom Test (Fitzpatrick, 2013)
- 1.3.4 Lean Analytics e metriche di validazione (Croll & Yoskovitz, 2013)
- 1.3.5 Riflessioni critiche sul Lean Startup (Frederiksen & Brem, 2017)
- 1.3.6 Product management e sviluppo prodotto (Cagan, 2018; Olsen, 2015)

#### 1.4 Product-Led Growth (PLG)
- 1.4.1 Definizione e principi del PLG (Bush, 2019)
- 1.4.2 Il prodotto come motore di acquisizione, espansione e retention
- 1.4.3 Metriche PLG e framework di misurazione (OpenView Partners)
- 1.4.4 Growth hacking e viral loops (Ellis & Brown, 2017)
- 1.4.5 PLG vs. sales-led: implicazioni per SaaS verticali

#### 1.5 Subscription Economy e metriche SaaS
- 1.5.1 L'ascesa dell'economia in abbonamento (Tzuo & Weisert, 2018)
- 1.5.2 Metriche chiave SaaS: MRR, ARR, churn rate, LTV, CAC (Skok, 2016)
- 1.5.3 Customer-base valuation e analisi coorte (Fader, 2012; Fader & Hardie, 2010)
- 1.5.4 Il framework AARRR (Pirate Metrics) per startup SaaS
- 1.5.5 Benchmarking SaaS: standard di settore e best practice

#### 1.6 Strategia di pricing per SaaS
- 1.6.1 Fondamenti di pricing strategy (Nagle & Müller, 2018; Simon & Fassnacht, 2019)
- 1.6.2 Modelli di pricing SaaS: freemium, tiered, usage-based (Kumar, 2014)
- 1.6.3 Psicologia del prezzo: anchoring, pennies-a-day, zero price (Tversky & Kahneman, 1974; Gourville, 1998; Shampanier, Mazar & Ariely, 2007)
- 1.6.4 Price endings e percezione del valore (Anderson & Simester, 2003)
- 1.6.5 Monetizzazione dell'innovazione (Ramanujam & Tacke, 2016)
- 1.6.6 Il paradosso della scelta nel pricing (Iyengar & Lepper, 2000)
- 1.6.7 L'economia del gratuito e modelli freemium (Anderson, 2009; Ariely, 2008)

#### 1.7 Customer Success e Retention
- 1.7.1 Il framework del Customer Success (Mehta, Steinman & Murphy, 2016)
- 1.7.2 Il Net Promoter Score e la misurazione della loyalty (Reichheld, 2003)
- 1.7.3 Il legame soddisfazione-fedeltà-profittabilità (Hallowell, 1996; Reichheld & Sasser, 1990)
- 1.7.4 E-loyalty nell'era digitale (Reichheld & Schefter, 2000)
- 1.7.5 CRM e gestione del valore del cliente (Kumar & Reinartz, 2018)
- 1.7.6 Il churn silenzioso: definizione, cause, impatto
- 1.7.7 Strategie di win-back e re-engagement

#### 1.8 Gamification
- 1.8.1 Definizione e framework concettuale (Deterding et al., 2011; Huotari & Hamari, 2017)
- 1.8.2 Fondamenti psicologici: Self-Determination Theory (Deci & Ryan, 1985; Ryan & Deci, 2000)
- 1.8.3 Evidenze empiriche sull'efficacia della gamification (Hamari, Koivisto & Sarsa, 2014; Koivisto & Hamari, 2019)
- 1.8.4 Gamification e programmi di fidelizzazione (Werbach & Hunter, 2012; Zichermann & Cunningham, 2011)
- 1.8.5 Elementi di game design: punti, badge, leaderboard, streak, tier
- 1.8.6 Gamification nel marketing dei servizi: stato dell'arte e lacune
- 1.8.7 Criticità e anti-pattern della gamification

#### 1.9 Trasformazione digitale delle micro-imprese
- 1.9.1 Framework della digital transformation (Vial, 2019; Westerman, Bonnet & McAfee, 2014)
- 1.9.2 Barriere all'adozione tecnologica nelle micro-imprese (McKinsey, 2020)
- 1.9.3 Modelli di adozione tecnologica: Diffusion of Innovations (Rogers, 2003), TAM (Davis, 1989), UTAUT (Venkatesh et al., 2003)
- 1.9.4 Il divario digitale nei servizi alla persona
- 1.9.5 Crossing the chasm: dall'early adopter al mainstream (Moore, 2014)
- 1.9.6 L'innovazione dirompente nei mercati tradizionali (Christensen, 1997)

#### 1.10 Il settore barbershop: contesto e digitalizzazione
- 1.10.1 Dimensione del mercato globale dei servizi barbershop (IBISWorld, Gitnux)
- 1.10.2 Il mercato italiano: 137.730 attività, frammentazione, tendenze
- 1.10.3 Trend di settore: mascolinità consapevole, esperienza premium, social media
- 1.10.4 Livello di digitalizzazione e adozione tecnologica nel settore
- 1.10.5 Le specificità del rapporto barbiere-cliente: fiducia, ricorrenza, personalizzazione

---

### CAPITOLO 2 — Analisi di Mercato (25–35 pp.)

#### 2.1 Il mercato SaaS globale e verticale
- 2.1.1 Dimensione e crescita del mercato SaaS globale
- 2.1.2 L'emergere dei SaaS verticali: definizione e driver di crescita
- 2.1.3 SaaS per il settore beauty e wellness: panoramica

#### 2.2 Il settore barbershop e beauty: dimensione, trend e proiezioni
- 2.2.1 Il mercato globale dei servizi barbershop: TAM $5.8B (US)
- 2.2.2 Il mercato europeo e italiano: 137.730 attività, segmentazione geografica
- 2.2.3 Trend di mercato: crescita, premiumizzazione, digitalizzazione
- 2.2.4 Proiezioni e scenari futuri

#### 2.3 Analisi competitiva
- 2.3.1 Metodologia dell'analisi competitiva
- 2.3.2 Mapping dei 13 competitor principali:
  - Fresha (booking-first, 0% commission su piano base)
  - Booksy (marketplace-oriented)
  - theCut (verticale barbershop US)
  - Barberly (soluzione italiana)
  - GlossGenius (all-in-one beauty)
  - Phorest (salon management enterprise)
  - Squire (barbershop-specific US)
  - Boulevard, Vagaro, Zenoti, Treatwell, Uala, Square Appointments
- 2.3.3 Matrice competitiva: funzionalità, pricing, target, posizionamento
- 2.3.4 Gap analysis: l'assenza di soluzioni retention-first con gamification
- 2.3.5 Posizionamento strategico di Styll: Blue Ocean Strategy (Kim & Mauborgne, 2005)

#### 2.4 Analisi della domanda: Voice of Customer
- 2.4.1 Metodologia di analisi: 2.800+ recensioni da App Store e Google Play
- 2.4.2 Le 7 lamentele universali dei barbieri verso le piattaforme esistenti
- 2.4.3 Bisogni latenti e non soddisfatti
- 2.4.4 L'opportunità Blue Ocean della gamification nella retention
- 2.4.5 Validazione qualitativa della value proposition

#### 2.5 Analisi TAM/SAM/SOM
- 2.5.1 Total Addressable Market (TAM): mercato globale barbershop SaaS
- 2.5.2 Serviceable Addressable Market (SAM): mercato europeo, focus Italia
- 2.5.3 Serviceable Obtainable Market (SOM): target realistico primi 3 anni
- 2.5.4 Dinamiche di espansione del mercato

#### 2.6 Willingness to pay e validazione del pricing
- 2.6.1 Analisi della sensibilità al prezzo nel segmento target
- 2.6.2 Confronto con i prezzi dei competitor
- 2.6.3 Validazione del modello a tre tier

---

### CAPITOLO 3 — Metodologia (10–15 pp.)

#### 3.1 Approccio metodologico
- 3.1.1 Il case study singolo integrato come strategia di ricerca (Yin, 2018)
- 3.1.2 Giustificazione della scelta metodologica
- 3.1.3 Paradigma di ricerca: approccio interpretativo-costruttivista

#### 3.2 Design della ricerca
- 3.2.1 Unità di analisi: il progetto Styll
- 3.2.2 Embedded units: modello di business, architettura tecnica, strategia di crescita
- 3.2.3 Proposizioni teoriche e framework concettuale

#### 3.3 Raccolta dati
- 3.3.1 Approccio mixed-method: desk research e analisi qualitativa
- 3.3.2 Fonti primarie: documentazione progettuale, analisi di mercato, voice of customer
- 3.3.3 Fonti secondarie: letteratura accademica, report di settore, dati di mercato
- 3.3.4 Analisi delle recensioni: campione di 2.800+ recensioni, piattaforme analizzate, criteri di selezione
- 3.3.5 Triangolazione delle fonti

#### 3.4 Analisi dei dati
- 3.4.1 Analisi tematica della voice of customer
- 3.4.2 Analisi comparativa dei competitor
- 3.4.3 Analisi del modello di business tramite BMC e Lean Canvas
- 3.4.4 Proiezioni finanziarie e scenari

#### 3.5 Limitazioni e bias
- 3.5.1 Limitazioni del case study singolo: generalizzabilità
- 3.5.2 Bias del ricercatore-fondatore
- 3.5.3 Assenza di dati sperimentali (pre-lancio)
- 3.5.4 Strategie di mitigazione dei bias

---

### CAPITOLO 4 — Il Progetto Styll (30–40 pp.)

#### 4.1 Genesi e visione
- 4.1.1 L'intuizione iniziale: dal problema personale all'opportunità di mercato
- 4.1.2 La visione: brand-first retention platform
- 4.1.3 Mission, valori e posizionamento strategico
- 4.1.4 Il nome e l'identità di brand

#### 4.2 Modello di business
- 4.2.1 Business Model Canvas completo
- 4.2.2 Value proposition: retention gamificata + silent churn detection
- 4.2.3 Modello di pricing a 3 tier:
  - Starter (€19/mese): funzionalità base, 1 programma loyalty
  - Professional (€49/mese): gamification completa, analytics, churn detection
  - Enterprise (€149/mese): white-label, API, multi-sede, supporto dedicato
- 4.2.4 Revenue streams: subscription, setup fee, transazionale, marketplace
- 4.2.5 Struttura dei costi e unit economics
- 4.2.6 Lean Canvas e ipotesi chiave

#### 4.3 Architettura della gamification
- 4.3.1 Framework teorico: SDT applicata alla loyalty barbershop
- 4.3.2 Layer 1 — Sistema a punti: accumulo, conversione, reward
- 4.3.3 Layer 2 — Sistema a tier: Bronze, Silver, Gold, Platinum — progressione e benefici
- 4.3.4 Layer 3 — Streak: incentivazione della regolarità delle visite
- 4.3.5 Layer 4 — Badge e achievement: collezionismo e status sociale
- 4.3.6 I 3 template di programma loyalty: Classico, Premium, Gamificato
- 4.3.7 Personalizzazione e configurabilità per il barbiere

#### 4.4 Silent Churn Detection e win-back automatico
- 4.4.1 Definizione operativa di silent churn nel contesto barbershop
- 4.4.2 Algoritmo di detection: analisi della frequenza, pattern recognition
- 4.4.3 Sistema di alert e scoring del rischio churn
- 4.4.4 Meccanismi di win-back automatico: trigger, messaggi, incentivi
- 4.4.5 Misurazione dell'efficacia: metriche e KPI

#### 4.5 Architettura tecnica
- 4.5.1 Stack tecnologico: React (frontend), Supabase (backend), PWA
- 4.5.2 Architettura multi-tenant: isolamento dati, Row Level Security (RLS)
- 4.5.3 Database schema: 35 tabelle, relazioni, ottimizzazioni
- 4.5.4 Architettura API e integrazioni
- 4.5.5 PWA white-label: personalizzazione per barbiere, installabilità
- 4.5.6 Scalabilità, performance e sicurezza
- 4.5.7 Strategia AI: integrazione intelligenza artificiale per churn prediction

#### 4.6 UX e Onboarding
- 4.6.1 Principi di design: progressive complexity, mobile-first
- 4.6.2 Wizard di onboarding in 5 step (completamento < 8 minuti)
- 4.6.3 Le 4 personas utente: barbiere tradizionale, barbiere digitale, catena, cliente finale
- 4.6.4 User journey mapping per ciascuna persona
- 4.6.5 Design system e componenti UI (Norman, 2013; Krug, 2014)
- 4.6.6 UX writing e microcopy strategico (Podmajersky, 2019)
- 4.6.7 Mobile interface design (Hoober & Berkman, 2012)

#### 4.7 Compliance legale e normativa
- 4.7.1 GDPR: conformità, basi giuridiche, diritti degli interessati (Voigt & von dem Bussche, 2017; Tikkinen-Piri et al., 2018)
- 4.7.2 Privacy by design e by default (Bolognini & Bistolfi, 2017; Politou, Alepis & Patsakis, 2018)
- 4.7.3 Pseudonimizzazione e protezione dei dati (Bygrave, 2014)
- 4.7.4 PCI DSS: sicurezza dei pagamenti
- 4.7.5 Normativa italiana: D.Lgs. 196/2003, D.Lgs. 101/2018
- 4.7.6 Direttiva ePrivacy e comunicazioni elettroniche
- 4.7.7 AI Act europeo: implicazioni per il churn prediction
- 4.7.8 PSD2 e integrazione pagamenti
- 4.7.9 Digital Services Act (DSA): obblighi per piattaforme digitali

---

### CAPITOLO 5 — Strategia di Crescita (25–30 pp.)

#### 5.1 Strategia go-to-market
- 5.1.1 Approccio product-led growth per micro-imprese
- 5.1.2 Content marketing come canale primario di acquisizione
- 5.1.3 SEO strategy: modello pillar-cluster per il settore barbershop
- 5.1.4 Referral barbiere-a-barbiere: meccanica e incentivi
- 5.1.5 Fasi di lancio: pre-launch, beta, general availability

#### 5.2 Content e SEO strategy
- 5.2.1 Keyword research: volumi, difficoltà, intento di ricerca
- 5.2.2 Architettura dei contenuti: pillar page e cluster tematici
- 5.2.3 Calendario editoriale: frequenza, formati, canali
- 5.2.4 Content funnel: awareness, consideration, decision

#### 5.3 Social media e brand strategy
- 5.3.1 Strategia Instagram: contenuti, frequenza, community
- 5.3.2 Strategia TikTok: format, trend, reach organico
- 5.3.3 Build in public: trasparenza come leva di marketing
- 5.3.4 Founder branding e personal brand del fondatore
- 5.3.5 Community building nel settore barbershop

#### 5.4 Strategia di internazionalizzazione
- 5.4.1 I 9 mercati target: selezione e prioritizzazione
- 5.4.2 PPP pricing: adattamento dei prezzi per parità di potere d'acquisto
- 5.4.3 Localizzazione: lingua, valuta, normativa, cultura
- 5.4.4 Strategia di ingresso per ciascun mercato
- 5.4.5 Sfide e rischi dell'internazionalizzazione

#### 5.5 Ecosystem di partnership
- 5.5.1 I 5 tipi di partnership: tecnologiche, distributive, di contenuto, istituzionali, commerciali
- 5.5.2 Integrazioni tecniche: POS, pagamenti, social, calendari
- 5.5.3 Partnership con distributori di prodotti per barbieri
- 5.5.4 Collaborazioni con scuole e associazioni di categoria
- 5.5.5 Marketplace e revenue sharing

#### 5.6 Framework KPI e metriche
- 5.6.1 Framework AARRR applicato a Styll
- 5.6.2 North Star Metric: definizione e razionale
- 5.6.3 Metriche SaaS: MRR, churn rate, LTV, CAC, LTV/CAC ratio
- 5.6.4 Dashboard e reporting: strumenti e frequenza
- 5.6.5 OKR trimestrali e ciclo di review

#### 5.7 Proiezioni finanziarie
- 5.7.1 Assunzioni del modello finanziario
- 5.7.2 Scenario pessimistico: crescita lenta, churn elevato
- 5.7.3 Scenario realistico: crescita moderata, metriche benchmark
- 5.7.4 Scenario ottimistico: crescita virale, espansione rapida
- 5.7.5 Analisi del break-even point
- 5.7.6 Fabbisogno finanziario e opzioni di funding

---

### CAPITOLO 6 — Risultati e Discussione (15–20 pp.)

#### 6.1 Sintesi dei risultati
- 6.1.1 Risultati dell'analisi di mercato
- 6.1.2 Risultati della progettazione del modello di business
- 6.1.3 Risultati della strategia di crescita
- 6.1.4 Risposta alle domande di ricerca (RQ1, RQ2, RQ3)

#### 6.2 Confronto con la letteratura
- 6.2.1 Styll e i modelli di business SaaS verticale
- 6.2.2 Gamification e retention: confronto con le evidenze empiriche
- 6.2.3 Product-led growth nei mercati frammentati
- 6.2.4 Validazione delle teorie sul pricing SaaS

#### 6.3 Implicazioni teoriche e manageriali
- 6.3.1 Contributo alla teoria della business model innovation
- 6.3.2 Implicazioni per il design della gamification B2B2C
- 6.3.3 Raccomandazioni per founder di SaaS verticali
- 6.3.4 Implicazioni per i micro-professionisti del settore

#### 6.4 Lezioni apprese e anti-pattern
- 6.4.1 Lezioni dalla fase di progettazione
- 6.4.2 Anti-pattern identificati nella gamification
- 6.4.3 Anti-pattern nel pricing SaaS per micro-imprese
- 6.4.4 Errori comuni nella digitalizzazione di settori tradizionali

---

### CONCLUSIONI (5–10 pp.)

- Riepilogo del percorso di ricerca e dei risultati principali
- Contributo originale della tesi alla letteratura e alla pratica
- Limitazioni della ricerca e strategie di mitigazione
- Sviluppi futuri: validazione sperimentale, lancio, raccolta dati reali
- Riflessioni finali sul potenziale del modello SaaS verticale per micro-professionisti

---

### BIBLIOGRAFIA

(cfr. Sezione 9 per la bibliografia unificata completa)

---

### APPENDICI

- **Appendice A:** Business Model Canvas completo di Styll
- **Appendice B:** Lean Canvas
- **Appendice C:** Tabelle comparative dei 13 competitor
- **Appendice D:** Proiezioni finanziarie dettagliate (3 scenari)
- **Appendice E:** Screenshot e mockup dell'interfaccia utente
- **Appendice F:** Database schema completo (35 tabelle)
- **Appendice G:** Matrice funzionalità × piano di pricing
- **Appendice H:** Risultati dell'analisi Voice of Customer
- **Appendice I:** Calendario editoriale e piano SEO

---

## 4. METODOLOGIA CONSIGLIATA

### Approccio di ricerca

Si consiglia l'adozione di un **case study singolo integrato** (single embedded case study) secondo il framework di Yin (2018), con analisi qualitativa e componenti mixed-method. Il caso Styll rappresenta un caso *rivelatore* (revelatory case) in quanto consente di studiare un fenomeno — l'applicazione della gamification alla retention B2B2C per micro-professionisti — ancora scarsamente documentato nella letteratura accademica.

### Tabella: Fonti dati per la ricerca

| Tipo di dato | Fonte | Cosa fornisce | File di riferimento |
|---|---|---|---|
| Letteratura accademica | Database accademici (Scopus, WoS, Google Scholar) | Framework teorici, evidenze empiriche, gap di ricerca | `docs/09-tesi/literature-review.md` |
| Dati di mercato | Report di settore (IBISWorld, Mordor Intelligence, Statista) | Dimensione mercato, trend, proiezioni, TAM/SAM/SOM | `docs/02-mercato/analisi-mercato.md`, `docs/02-mercato/trend-analysis.md` |
| Analisi competitiva | Siti web competitor, App Store, Google Play | Funzionalità, pricing, posizionamento, gap | `docs/02-mercato/competitor-analysis.md` |
| Voice of Customer | 2.800+ recensioni App Store e Google Play | Bisogni, lamentele, aspettative dei barbieri | `docs/04-utenti/voice-of-customer.md` |
| Documentazione progettuale | Repository Styll (docs/, progetto/) | Specifiche tecniche, business model, strategia | Tutti i file in `docs/` e `progetto/` |
| Dati normativi | Normativa UE e italiana | Requisiti di compliance, vincoli legali | `docs/08-strategia/legal-compliance.md` |
| Benchmark SaaS | Report OpenView, Benchmarkit, SaaStr | Metriche di riferimento, best practice di settore | `docs/06-business/kpi-framework.md` |

---

## 5. MAPPA MATERIALI → CAPITOLI

### Tabella: collegamento file prodotti ai capitoli della tesi

| File prodotto | Capitolo/i | Come utilizzarlo |
|---|---|---|
| `messaggio.md` | Introduzione, Cap. 4 | Visione fondativa, contesto del progetto, motivazione personale del fondatore |
| `docs/09-tesi/literature-review.md` | Cap. 1 | Base per l'intera revisione della letteratura; framework teorici, riferimenti bibliografici strutturati |
| `docs/02-mercato/competitor-analysis.md` | Cap. 2 | Analisi dettagliata dei 13 competitor, matrice comparativa, gap analysis |
| `docs/02-mercato/analisi-mercato.md` | Cap. 2 | Dati di mercato, dimensionamento TAM/SAM/SOM, trend quantitativi |
| `docs/02-mercato/trend-analysis.md` | Cap. 1, Cap. 2 | Trend di settore per il contesto (Cap. 1) e per l'analisi di mercato (Cap. 2) |
| `docs/06-business/pricing-strategy.md` | Cap. 1, Cap. 4 | Fondamenti teorici del pricing (Cap. 1) e strategia dei 3 tier (Cap. 4) |
| `docs/06-business/business-plan.md` | Cap. 4, Cap. 5 | Modello di business, proiezioni finanziarie, struttura dei costi |
| `docs/06-business/go-to-market.md` | Cap. 5 | Strategia di lancio, canali di acquisizione, fasi di go-to-market |
| `docs/06-business/kpi-framework.md` | Cap. 5 | Framework AARRR, North Star Metric, metriche SaaS, dashboard |
| `docs/07-tecnico/architettura.md` | Cap. 4 | Architettura tecnica, stack React+Supabase, PWA multi-tenant |
| `docs/07-tecnico/database-schema.md` | Cap. 4, Appendici | Schema delle 35 tabelle, relazioni, RLS — descrizione e appendice |
| `docs/07-tecnico/ai-strategy-research.md` | Cap. 1, Cap. 4 | Stato dell'arte AI (Cap. 1) e applicazione al churn prediction (Cap. 4) |
| `docs/08-strategia/legal-compliance.md` | Cap. 4 | GDPR, privacy, PCI DSS, normativa italiana — sezione compliance |
| `docs/08-strategia/internazionalizzazione.md` | Cap. 5 | I 9 mercati target, PPP pricing, strategia di localizzazione |
| `docs/08-strategia/strategia-social.md` | Cap. 5 | Strategia Instagram, TikTok, build in public, founder branding |
| `docs/08-strategia/analisi-strategica.md` | Cap. 2, Cap. 4 | Analisi SWOT, posizionamento strategico, vantaggio competitivo |
| `docs/08-strategia/partnership-ecosistem.md` | Cap. 5 | I 5 tipi di partnership, integrazioni, ecosystem strategy |
| `docs/03-prodotto/onboarding-strategy.md` | Cap. 4 | Wizard 5 step, progressive complexity, tempo di completamento |
| `docs/03-prodotto/product-roadmap.md` | Cap. 4, Cap. 5 | Roadmap di sviluppo (Cap. 4), fasi di crescita (Cap. 5) |
| `docs/03-prodotto/feature-overview.md` | Cap. 4 | Panoramica funzionalità, architettura gamification, template loyalty |
| `docs/03-prodotto/design-ux.md` | Cap. 4 | Design system, principi UX, interfaccia mobile-first |
| `docs/04-utenti/voice-of-customer.md` | Cap. 2, Cap. 4 | Le 7 lamentele universali (Cap. 2) e requisiti funzionali derivati (Cap. 4) |
| `docs/04-utenti/personas-e-journeys.md` | Cap. 4 | Le 4 personas, user journey, scenari d'uso |
| `docs/05-brand/brand-identity.md` | Cap. 4 | Nome, identità visiva, tono di voce, posizionamento di brand |
| `progetto/01-visione-e-idea.md` | Introduzione, Cap. 4 | Genesi del progetto, visione fondativa, problema identificato |
| `progetto/02-funzionalita-e-feature.md` | Cap. 4 | Lista funzionalità dettagliata, specifiche tecniche |
| `progetto/03-modello-di-business.md` | Cap. 4 | BMC, revenue model, struttura dei costi, unit economics |
| `progetto/04-target-e-utenti.md` | Cap. 2, Cap. 4 | Segmentazione target (Cap. 2) e design per personas (Cap. 4) |
| `progetto/05-tecnologia-e-stack.md` | Cap. 4 | Stack tecnologico dettagliato, scelte architetturali, motivazioni |
| `progetto/06-design-e-ux.md` | Cap. 4 | Principi di design, wireframe, flussi utente |
| `progetto/07-competitor-e-mercato.md` | Cap. 2 | Analisi competitiva sintetica, panoramica di mercato |
| `progetto/08-roadmap-e-sviluppo.md` | Cap. 4, Cap. 5 | Piano di sviluppo tecnico (Cap. 4) e milestone strategiche (Cap. 5) |

---

## 6. TIMELINE DI SCRITTURA (18 settimane)

### Pianificazione della stesura

| Fase | Capitolo | Durata (settimane) | Periodo | Priorità |
|---|---|---|---|---|
| 1 — Revisione letteratura | Cap. 1 — Literature Review | 4 | S1–S4 | 🔴 Alta |
| 2 — Metodologia | Cap. 3 — Metodologia | 1.5 | S5–S6 | 🔴 Alta |
| 3 — Analisi di mercato | Cap. 2 — Analisi di Mercato | 3 | S6–S8 | 🔴 Alta |
| 4 — Il progetto Styll | Cap. 4 — Il Progetto Styll | 4 | S9–S12 | 🟡 Media |
| 5 — Strategia di crescita | Cap. 5 — Strategia di Crescita | 2.5 | S13–S15 | 🟡 Media |
| 6 — Risultati e discussione | Cap. 6 — Risultati e Discussione | 1.5 | S15–S16 | 🟡 Media |
| 7 — Introduzione e conclusioni | Introduzione + Conclusioni | 1 | S17 | 🟢 Finale |
| 8 — Revisione e formattazione | Tutti i capitoli + Bibliografia + Appendici | 1 | S18 | 🟢 Finale |

### Note sulla sequenza

1. **Si parte dal Cap. 1 (Literature Review):** è il fondamento teorico su cui poggia l'intera tesi. La revisione della letteratura definisce il framework concettuale e le lenti interpretative.
2. **Cap. 3 (Metodologia) segue immediatamente:** definire l'approccio metodologico prima dell'analisi empirica garantisce rigore e coerenza.
3. **Cap. 2 (Analisi di Mercato) dopo la metodologia:** l'analisi di mercato è la prima applicazione empirica, che fornisce il contesto per i capitoli successivi.
4. **Cap. 4 e Cap. 5 in sequenza:** il progetto e la strategia di crescita costituiscono il cuore empirico della tesi.
5. **Cap. 6 dopo i capitoli empirici:** la discussione richiede che tutti i risultati siano già stati presentati.
6. **Introduzione e conclusioni per ultime:** si scrivono meglio quando il contenuto è completo.

---

## 7. CONSIGLI DI STILE E FORMATTAZIONE

### Standard di citazione

- **Stile citazionale:** APA 7th Edition (American Psychological Association)
- **Citazioni nel testo:** (Autore, Anno) o Autore (Anno) per citazioni narrative
- **Citazioni multiple:** ordine alfabetico, separate da punto e virgola: (Blank, 2013; Ries, 2011)
- **Et al.:** dalla prima citazione per 3+ autori

### Formattazione

- **Font:** Times New Roman, 12 pt
- **Interlinea:** 1,5
- **Margini:** 2,5 cm su tutti i lati
- **Allineamento:** giustificato
- **Rientro prima riga:** 1,25 cm
- **Numerazione pagine:** in basso a destra, a partire dall'Introduzione
- **Note a piè di pagina:** Times New Roman, 10 pt, interlinea singola

### Stile di scrittura

- **Registro:** accademico, formale, impersonale
- **Persona:** terza persona singolare o forme impersonali ("si analizza", "è stato osservato", "il presente lavoro esamina")
- **Evitare:** prima persona ("io", "noi"), linguaggio colloquiale, anglicismi non necessari
- **Termini tecnici in inglese:** in corsivo alla prima occorrenza, con traduzione/spiegazione tra parentesi
- **Acronimi:** scritti per esteso alla prima occorrenza, seguiti dall'acronimo tra parentesi; successivamente solo l'acronimo
- **Tabelle e figure:** numerate progressivamente per capitolo (es. Tabella 2.1, Figura 4.3), con didascalia descrittiva
- **Lunghezza complessiva stimata:** 150–200 pagine (escluse appendici e bibliografia)

### Struttura dei capitoli

- Ogni capitolo inizia con una breve introduzione (0,5–1 p.) che ne presenta il contenuto e il collegamento con i capitoli precedenti
- Ogni capitolo si chiude con una sintesi (0,5–1 p.) che riassume i punti chiave e anticipa il capitolo successivo
- I paragrafi dovrebbero avere una lunghezza media di 150–250 parole

---

## 8. RISCONTRI E OSSERVAZIONI

### Punti di forza del materiale prodotto

1. **Completezza della documentazione:** il progetto dispone di una documentazione estremamente ricca e strutturata che copre tutti gli aspetti — dal mercato alla tecnologia, dal business alla compliance — facilitando enormemente la stesura della tesi.
2. **Solido framework teorico:** la literature review già prodotta integra efficacemente teorie da ambiti diversi (SaaS, gamification, pricing, digital transformation), creando un framework multidisciplinare robusto.
3. **Analisi competitiva approfondita:** l'analisi di 13 competitor con matrice comparativa e gap analysis fornisce una base empirica solida per il posizionamento strategico.
4. **Voice of Customer basata su dati reali:** l'analisi di 2.800+ recensioni conferisce validità empirica alla tesi, distinguendola da lavori puramente concettuali.
5. **Coerenza strategica:** dalla visione al modello di business, dall'architettura tecnica alla strategia di crescita, il progetto presenta una coerenza interna notevole che facilita la narrazione accademica.
6. **Innovazione identificabile:** il concetto di silent churn detection combinato con gamification per micro-professionisti rappresenta un contributo originale chiaro e difendibile.

### Gap da colmare

1. **Validazione empirica con utenti reali:** il materiale attuale è prevalentemente progettuale. Sarebbe opportuno integrare, ove possibile, feedback da barbieri reali (anche informali) per rafforzare la validazione. In alternativa, dichiarare esplicitamente questa limitazione nella metodologia.
2. **Approfondimento metodologico:** la sezione metodologica necessita di un'elaborazione più dettagliata sulla giustificazione epistemologica della scelta del case study, sui criteri di qualità della ricerca qualitativa e sulle strategie di mitigazione dei bias.
3. **Collegamento esplicito teoria-pratica:** alcuni capitoli progettuali potrebbero beneficiare di rimandi più espliciti alla letteratura (es. "la scelta del modello a 3 tier si fonda su…"), rafforzando il carattere accademico del lavoro.
4. **Dati finanziari dettagliati:** le proiezioni finanziarie necessitano di maggiore granularità nelle assunzioni e di una sensitivity analysis strutturata.

### Suggerimenti

1. **Creare un glossario:** data la natura interdisciplinare della tesi, un glossario dei termini tecnici (in appendice o all'inizio) migliorerebbe la leggibilità per commissioni con competenze diverse.
2. **Aggiungere un framework visuale:** un diagramma che sintetizzi l'architettura concettuale della tesi (dalla teoria al progetto alla validazione) aiuterebbe il lettore a orientarsi nel lavoro.
3. **Preparare una versione sintetica per il relatore:** un documento di 5–10 pagine che riassuma il lavoro, utile per le riunioni con il relatore e per ottenere feedback tempestivi.
4. **Considerare un capitolo zero di background:** per lettori non familiari con il settore barbershop e/o con il SaaS, un breve capitolo di background potrebbe facilitare la comprensione (alternativa: integrare nel Cap. 1).

### Top 5 azioni prioritarie

1. **Finalizzare la literature review (Cap. 1):** completare e strutturare la revisione della letteratura secondo la struttura proposta, assicurandosi di coprire tutti i filoni teorici.
2. **Scrivere la metodologia (Cap. 3):** redigere il capitolo metodologico con particolare attenzione alla giustificazione del case study e alla triangolazione delle fonti.
3. **Strutturare l'analisi di mercato (Cap. 2):** trasformare i dati di mercato già raccolti in un'analisi organica con tabelle, grafici e interpretazioni.
4. **Redigere il capitolo sul progetto (Cap. 4):** è il capitolo centrale; collegare sistematicamente ogni scelta progettuale alla letteratura e ai dati di mercato.
5. **Compilare la bibliografia APA 7th:** uniformare tutte le citazioni al formato APA 7th edition, eliminando duplicati e completando i riferimenti incompleti.

---

## 9. BIBLIOGRAFIA UNIFICATA

> Bibliografia completa, deduplicata, in formato APA 7th Edition, compilata dai materiali del progetto Styll. Organizzata per categoria e in ordine alfabetico.

---

### 9.1 Paper accademici

Anderson, E. T., & Simester, D. I. (2003). Effects of $9 price endings on retail sales: Evidence from field experiments. *Quantitative Marketing and Economics*, *1*(1), 93–110.

Bezemer, C. P., & Zaidman, A. (2010). Multi-tenant SaaS applications: Maintenance dream or nightmare? *Proceedings of the Joint ERCIM Workshop on Software Evolution (EVOL) and International Workshop on Principles of Software Evolution (IWPSE)*, 88–92.

Blank, S. (2013). Why the lean start-up changes everything. *Harvard Business Review*, *91*(5), 63–72.

Bolognini, L., & Bistolfi, C. (2017). Pseudonymization and impacts of Big (personal/anonymous) Data processing in the transition from the Directive 95/46/EC to the new EU General Data Protection Regulation. *Computer Law & Security Review*, *33*(2), 171–181.

Chesbrough, H. (2010). Business model innovation: Opportunities and barriers. *Long Range Planning*, *43*(2–3), 354–363.

Cusumano, M. A. (2010). Cloud computing and SaaS as new computing platforms. *Communications of the ACM*, *53*(4), 27–29.

Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly*, *13*(3), 319–340.

Deci, E. L., & Ryan, R. M. (1985). *Intrinsic motivation and self-determination in human behavior*. Plenum Press.

Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining "gamification." *Proceedings of the 15th International Academic MindTrek Conference*, 9–15.

Dubey, A., & Wagle, D. (2007). Delivering software as a service. *The McKinsey Quarterly*, *6*(2007), 1–12.

Fader, P. S., & Hardie, B. G. S. (2010). Customer-base valuation in a contractual setting: The perils of ignoring heterogeneity. *Marketing Science*, *29*(1), 85–93.

Frederiksen, D. L., & Brem, A. (2017). How do entrepreneurs think they create value? A scientific reflection of Eric Ries' Lean Startup approach. *International Entrepreneurship and Management Journal*, *13*(2), 413–440.

Gao, F., Sunyaev, A., & Leimeister, J. M. (2020). SaaS transformation: Concepts, barriers, and impacts. *Journal of Information Technology*, *35*(3), 1–24.

Gourville, J. T. (1998). Pennies-a-day: The effect of temporal reframing on transaction evaluation. *Journal of Consumer Research*, *24*(4), 395–408.

Hallowell, R. (1996). The relationships of customer satisfaction, customer loyalty, and profitability: An empirical study. *International Journal of Service Industry Management*, *7*(4), 27–42.

Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? — A literature review of empirical studies on gamification. *Proceedings of the 47th Hawaii International Conference on System Sciences (HICSS)*, 3025–3034.

Huotari, K., & Hamari, J. (2017). A definition for gamification: Anchoring gamification in the service marketing literature. *Electronic Markets*, *27*(1), 21–31.

Iyengar, S. S., & Lepper, M. R. (2000). When choice is demotivating: Can one desire too much of a good thing? *Journal of Personality and Social Psychology*, *79*(6), 995–1006.

Koivisto, J., & Hamari, J. (2019). The rise of motivational information systems: A review of gamification research. *International Journal of Information Management*, *45*, 191–210.

Krebs, R., Momm, C., & Kounev, S. (2012). Architectural concerns in multi-tenant SaaS applications. *Proceedings of the 2nd International Conference on Cloud Computing and Services Science (CLOSER)*, 426–431.

Kumar, V. (2014). Making "freemium" work. *Harvard Business Review*, *92*(5), 27–29.

Politou, E., Alepis, E., & Patsakis, C. (2018). Forgetting personal data and revoking consent under the GDPR: Challenges and proposed solutions. *Journal of Cybersecurity*, *4*(1), tyy001.

Reichheld, F. F. (2003). The one number you need to grow. *Harvard Business Review*, *81*(12), 46–55.

Reichheld, F. F., & Sasser, W. E. (1990). Zero defections: Quality comes to services. *Harvard Business Review*, *68*(5), 105–111.

Reichheld, F. F., & Schefter, P. (2000). E-loyalty: Your secret weapon on the web. *Harvard Business Review*, *78*(4), 105–113.

Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*, *55*(1), 68–78.

Sawhney, M., & Srivastava, R. K. (2003). Marketing strategy in the digital age. In R. A. Peterson & R. A. Kerin (Eds.), *Wiley International Encyclopedia of Marketing*. Wiley.

Shampanier, K., Mazar, N., & Ariely, D. (2007). Zero as a special price: The true value of free products. *Marketing Science*, *26*(6), 742–757.

Teece, D. J. (2010). Business models, business strategy and innovation. *Long Range Planning*, *43*(2–3), 172–194.

Tikkinen-Piri, C., Rohunen, A., & Markkula, J. (2018). EU General Data Protection Regulation: Changes and implications for personal data collecting companies. *Computer Law & Security Review*, *34*(1), 134–153.

Tsai, W. T., Sun, X., & Balasooriya, J. (2010). Service-oriented cloud computing architecture. *Proceedings of the 7th International Conference on Information Technology: New Generations (ITNG)*, 684–689.

Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. *Science*, *185*(4157), 1124–1131.

Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. *MIS Quarterly*, *27*(3), 425–478.

Vial, G. (2019). Understanding digital transformation: A review and a research agenda. *The Journal of Strategic Information Systems*, *28*(2), 118–144.

Zott, C., Amit, R., & Massa, L. (2011). The business model: Recent developments and future research. *Journal of Management*, *37*(4), 1019–1042.

---

### 9.2 Libri e monografie

Anderson, C. (2009). *Free: The future of a radical price*. Hyperion.

Ariely, D. (2008). *Predictably irrational: The hidden forces that shape our decisions*. HarperCollins.

Bush, W. (2019). *Product-led growth: How to build a product that sells itself*. Product-Led Institute.

Bygrave, L. A. (2014). *Data privacy law: An international perspective*. Oxford University Press.

Cagan, M. (2018). *Inspired: How to create tech products customers love* (2nd ed.). Wiley.

Christensen, C. M. (1997). *The innovator's dilemma: When new technologies cause great firms to fail*. Harvard Business School Press.

Croll, A., & Yoskovitz, B. (2013). *Lean analytics: Use data to build a better startup faster*. O'Reilly Media.

Ellis, S., & Brown, M. (2017). *Hacking growth: How today's fastest-growing companies drive breakout success*. Currency.

Fader, P. S. (2012). *Customer centricity: Focus on the right customers for strategic advantage* (2nd ed.). Wharton School Press.

Fitzpatrick, R. (2013). *The Mom Test: How to talk to customers and learn if your business is good when everyone is lying to you*. Robfitz.

Hoober, S., & Berkman, E. (2012). *Designing mobile interfaces: Patterns for interaction design*. O'Reilly Media.

Kim, W. C., & Mauborgne, R. (2005). *Blue ocean strategy: How to create uncontested market space and make the competition irrelevant*. Harvard Business School Press.

Krug, S. (2014). *Don't make me think, revisited: A common sense approach to web usability* (3rd ed.). New Riders.

Kumar, V., & Reinartz, W. (2018). *Customer relationship management: Concept, strategy, and tools* (3rd ed.). Springer.

Maurya, A. (2012). *Running lean: Iterate from plan A to a plan that works* (2nd ed.). O'Reilly Media.

Mehta, N., Steinman, D., & Murphy, L. (2016). *Customer success: How innovative companies are reducing churn and growing recurring revenue*. Wiley.

Moore, G. A. (2014). *Crossing the chasm: Marketing and selling disruptive products to mainstream customers* (3rd ed.). HarperBusiness.

Nagle, T. T., & Müller, G. (2018). *The strategy and tactics of pricing: A guide to growing more profitably* (6th ed.). Routledge.

Norman, D. A. (2013). *The design of everyday things* (revised and expanded ed.). Basic Books.

Olsen, D. (2015). *The lean product playbook: How to innovate with minimum viable products and rapid customer feedback*. Wiley.

Osterwalder, A., & Pigneur, Y. (2010). *Business model generation: A handbook for visionaries, game changers, and challengers*. Wiley.

Parker, G. G., Van Alstyne, M. W., & Choudary, S. P. (2016). *Platform revolution: How networked markets are transforming the economy and how to make them work for you*. W. W. Norton & Company.

Podmajersky, T. (2019). *Strategic writing for UX: Drive engagement, conversion, and retention with every word*. O'Reilly Media.

Ramanujam, M., & Tacke, G. (2016). *Monetizing innovation: How smart companies design the product around the price*. Wiley.

Ries, E. (2011). *The lean startup: How today's entrepreneurs use continuous innovation to create radically successful businesses*. Crown Business.

Rogers, E. M. (2003). *Diffusion of innovations* (5th ed.). Free Press.

Shapiro, C., & Varian, H. R. (1999). *Information rules: A strategic guide to the network economy*. Harvard Business School Press.

Simon, H., & Fassnacht, M. (2019). *Price management: Strategy, analysis, decision, implementation*. Springer.

Tzuo, T., & Weisert, G. (2018). *Subscribed: Why the subscription model will be your company's future — and what to do about it*. Portfolio/Penguin.

Voigt, P., & von dem Bussche, A. (2017). *The EU General Data Protection Regulation (GDPR): A practical guide*. Springer.

Werbach, K., & Hunter, D. (2012). *For the win: How game thinking can revolutionize your business*. Wharton School Press.

Westerman, G., Bonnet, D., & McAfee, A. (2014). *Leading digital: Turning technology into business transformation*. Harvard Business Review Press.

Zichermann, G., & Cunningham, C. (2011). *Gamification by design: Implementing game mechanics in web and mobile apps*. O'Reilly Media.

---

### 9.3 Report e white paper

Benchmarkit. (2023). *SaaS metrics report 2023*. Benchmarkit.

Fortune Business Insights. (2023). *Barbershop market size, share & COVID-19 impact analysis, 2023–2030*. Fortune Business Insights.

Gallup. (2023). *State of the global workplace report*. Gallup.

Gitnux. (2023). *Barbershop industry statistics and trends*. Gitnux.

Grand View Research. (2023). *Salon software market size, share & trends analysis report, 2023–2030*. Grand View Research.

IBISWorld. (2023). *Barber shops in the US: Market research report*. IBISWorld.

IBISWorld. (2023). *Barber shops in Italy: Market research report*. IBISWorld.

McKinsey & Company. (2020). *How COVID-19 has pushed companies over the technology tipping point — and transformed business forever*. McKinsey Digital.

McKinsey & Company. (2021). *The next normal: The recovery will be digital*. McKinsey Global Institute.

Mordor Intelligence. (2023). *Salon software market — Growth, trends, and forecasts (2023–2028)*. Mordor Intelligence.

OpenView Partners. (2023). *Product-led growth benchmarks report 2023*. OpenView.

Skok, D. (2016). *SaaS metrics 2.0 — A guide to measuring and improving what matters*. For Entrepreneurs.

Statista. (2023). *Beauty & personal care — Italy: Market report*. Statista.

---

### 9.4 Risorse online

Booksy. (2024). *Piattaforma di prenotazione per saloni e barbieri*. https://booksy.com

Fresha. (2024). *Software gestionale gratuito per saloni e barbieri*. https://www.fresha.com

GlossGenius. (2024). *All-in-one app for beauty professionals*. https://www.glossgenius.com

Phorest. (2024). *Salon software that grows your business*. https://www.phorest.com

Squire. (2024). *Barbershop management platform*. https://www.getsquire.com

Supabase. (2024). *The open source Firebase alternative*. https://supabase.com/docs

theCut. (2024). *The #1 barber booking app*. https://thecut.co

Treatwell. (2024). *Prenota trattamenti di bellezza online*. https://www.treatwell.it

Uala. (2024). *Software gestionale per parrucchieri e centri estetici*. https://www.uala.com

Y Combinator. (2024). *Startup Library: Resources for founders*. https://www.ycombinator.com/library

---

### 9.5 Normative

Parlamento Europeo e Consiglio dell'Unione Europea. (2016). Regolamento (UE) 2016/679 del 27 aprile 2016 relativo alla protezione delle persone fisiche con riguardo al trattamento dei dati personali (GDPR). *Gazzetta Ufficiale dell'Unione Europea*, L 119, 1–88.

Repubblica Italiana. (2003). Decreto Legislativo 30 giugno 2003, n. 196 — Codice in materia di protezione dei dati personali. *Gazzetta Ufficiale della Repubblica Italiana*.

Repubblica Italiana. (2018). Decreto Legislativo 10 agosto 2018, n. 101 — Disposizioni per l'adeguamento della normativa nazionale al Regolamento (UE) 2016/679. *Gazzetta Ufficiale della Repubblica Italiana*.

Parlamento Europeo e Consiglio dell'Unione Europea. (2002). Direttiva 2002/58/CE del 12 luglio 2002 relativa al trattamento dei dati personali e alla tutela della vita privata nel settore delle comunicazioni elettroniche (Direttiva ePrivacy). *Gazzetta Ufficiale dell'Unione Europea*, L 201, 37–47.

Parlamento Europeo e Consiglio dell'Unione Europea. (2024). Regolamento (UE) 2024/1689 del 13 giugno 2024 che stabilisce regole armonizzate sull'intelligenza artificiale (AI Act). *Gazzetta Ufficiale dell'Unione Europea*.

Parlamento Europeo e Consiglio dell'Unione Europea. (2015). Direttiva (UE) 2015/2366 del 25 novembre 2015 relativa ai servizi di pagamento nel mercato interno (PSD2). *Gazzetta Ufficiale dell'Unione Europea*, L 337, 35–127.

Parlamento Europeo e Consiglio dell'Unione Europea. (2022). Regolamento (UE) 2022/2065 del 19 ottobre 2022 relativo a un mercato unico dei servizi digitali (Digital Services Act — DSA). *Gazzetta Ufficiale dell'Unione Europea*, L 277, 1–102.

---

*Documento generato come guida alla strutturazione della tesi di laurea sul progetto Styll. Ultimo aggiornamento: 2025.*-