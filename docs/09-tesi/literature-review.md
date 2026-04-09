> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `literature-review.md`

---

# Literature Review — Styll: Piattaforma SaaS Verticale per la Retention nel Settore Barbiere

---

## 1. Introduzione

### 1.1 Scopo della revisione

La presente revisione della letteratura ha lo scopo di costruire il quadro teorico e accademico di riferimento per il progetto **Styll**, una piattaforma SaaS (Software as a Service) verticale pensata per i barbieri indipendenti italiani, con focus sulla **retention del cliente** attraverso strumenti di gamification, loyalty e churn detection.

L'obiettivo è identificare, analizzare e collegare i contributi accademici e professionali più rilevanti nelle aree tematiche che informano il progetto: dal modello SaaS all'innovazione dei modelli di business, dal Product-Led Growth alla subscription economy, dalla gamification al customer success.

### 1.2 Domande di ricerca

La revisione si propone di rispondere alle seguenti domande:

1. **Quali sono i fondamenti teorici del modello SaaS** e come si è evoluto dall'Application Service Provider al cloud computing?
2. **Quali framework di innovazione del modello di business** sono più pertinenti per una startup SaaS verticale?
3. **Come il paradigma Product-Led Growth** si applica a piattaforme rivolte a micro-professionisti?
4. **Quali metriche e modelli della subscription economy** sono essenziali per valutare la sostenibilità di un SaaS a ricavi ricorrenti?
5. **Come la gamification può essere applicata ai programmi di loyalty** nel settore dei servizi alla persona?
6. **Quali strategie di pricing** sono più efficaci per il software rivolto a micro-imprenditori?
7. **Quali gap esistono nella letteratura** relativamente all'intersezione tra SaaS verticale, retention e gamification nel settore barbiere/beauty?

### 1.3 Perimetro

La revisione copre la letteratura accademica e professionale pubblicata prevalentemente tra il 1989 e il 2024, con particolare attenzione ai contributi post-2010 che riflettono l'evoluzione del cloud computing e dell'economia delle piattaforme. I temi coperti spaziano dall'informatica gestionale al marketing digitale, dalla strategia d'impresa all'interazione uomo-computer.

---

## 2. Metodologia bibliografica

### 2.1 Database e fonti consultate

| Tipo di fonte | Database / Fonte |
|---------------|-----------------|
| **Database accademici** | Google Scholar, IEEE Xplore, SSRN, ResearchGate, ACM Digital Library, Springer Link, ScienceDirect |
| **Riviste accademiche** | MIS Quarterly, Harvard Business Review, Long Range Planning, Journal of Management, Marketing Science, Information Systems Research, International Journal of Information Management, Electronic Markets |
| **Pubblicazioni istituzionali** | NIST (National Institute of Standards and Technology) |
| **Report di settore** | McKinsey & Company, Gartner, Forrester, IBISWorld, Market Research Intellect |
| **Working paper e blog professionali** | ForEntrepreneurs (David Skok), OpenView Partners, Product-Led Institute |
| **Libri accademici e professionali** | Pubblicazioni Wiley, O'Reilly, Harvard Business Review Press, Routledge, Free Press, Portfolio/Penguin |

### 2.2 Keyword di ricerca

Le ricerche sono state condotte utilizzando combinazioni delle seguenti keyword:

- *Software as a Service*, *SaaS*, *cloud computing*, *multi-tenant architecture*
- *Business model innovation*, *Business Model Canvas*, *Lean Canvas*
- *Product-Led Growth*, *PLG*, *freemium*, *self-service onboarding*
- *Subscription economy*, *recurring revenue*, *MRR*, *ARR*, *churn rate*
- *Lean Startup*, *MVP*, *customer development*, *validated learning*
- *Customer success*, *customer retention*, *churn*, *Net Promoter Score*
- *Pricing strategy*, *value-based pricing*, *freemium model*, *behavioral pricing*
- *Gamification*, *loyalty programs*, *engagement*, *game design elements*
- *Technology adoption*, *TAM*, *diffusion of innovations*, *digital transformation*
- *Barbershop*, *beauty industry*, *micro-business*, *small business digitalization*

### 2.3 Criteri di selezione

- **Inclusione**: paper peer-reviewed, libri pubblicati da editori accademici o professionali riconosciuti, report di società di consulenza di primo livello, working paper da fonti autorevoli.
- **Esclusione**: blog post non referenziati, articoli senza peer-review (salvo eccezioni per contributi seminali come Skok), contenuti promozionali.
- **Periodo**: 1985–2024, con preferenza per contributi post-2010.
- **Lingua**: inglese e italiano.

### 2.4 Numerosità

La revisione include **65+ fonti** tra articoli accademici, libri, report di settore, working paper e atti di conferenza.

---

## 3. Il modello Software as a Service (SaaS)

### 3.1 Definizione NIST

La definizione di riferimento del cloud computing è quella fornita dal National Institute of Standards and Technology (NIST):

> *"Cloud computing is a model for enabling ubiquitous, convenient, on-demand network access to a shared pool of configurable computing resources (e.g., networks, servers, storage, applications, and services) that can be rapidly provisioned and released with minimal management effort or service provider interaction."*
> — Mell & Grance (2011, p. 2)

Il modello NIST identifica tre modelli di servizio — **IaaS** (Infrastructure as a Service), **PaaS** (Platform as a Service) e **SaaS** (Software as a Service) — e quattro modelli di deployment (privato, comunitario, pubblico e ibrido). Il SaaS rappresenta il livello più alto di astrazione, in cui l'utente finale utilizza applicazioni del provider eseguite su infrastruttura cloud, senza gestire l'infrastruttura sottostante (Mell & Grance, 2011).

### 3.2 Evoluzione: dall'ASP al Cloud

L'evoluzione del SaaS può essere tracciata in tre fasi principali:

1. **Application Service Provider (ASP) — fine anni '90**: modello di hosting in cui ogni cliente disponeva di un'istanza dedicata dell'applicazione, con personalizzazione limitata e costi elevati (Cusumano, 2010).
2. **SaaS 1.0 — anni 2000**: introduzione della multi-tenancy, con un'unica istanza dell'applicazione condivisa tra più clienti. Salesforce.com è il caso emblematico di questa transizione (Dubey & Wagle, 2007).
3. **SaaS Cloud-Native — anni 2010–oggi**: architetture basate su microservizi, container e serverless, con scalabilità elastica, deployment continuo e personalizzazione per tenant (Cusumano, 2010; Bezemer & Zaidman, 2010).

### 3.3 Caratteristiche fondamentali del SaaS

Le caratteristiche distintive del modello SaaS, consolidate nella letteratura, includono:

- **Multi-tenancy**: una singola istanza dell'applicazione serve più clienti (tenant) con isolamento logico dei dati (Bezemer & Zaidman, 2010).
- **Accesso via web**: nessuna installazione locale, accessibile da qualsiasi dispositivo connesso.
- **Modello di pricing a sottoscrizione**: ricavi ricorrenti mensili o annuali anziché licenza perpetua (Cusumano, 2010).
- **Aggiornamenti centralizzati**: il provider aggiorna l'applicazione centralmente per tutti i tenant.
- **Scalabilità elastica**: capacità di adattare le risorse alla domanda (Mell & Grance, 2011).

### 3.4 Fattori critici di successo (CSF) del SaaS

La letteratura ha identificato diversi fattori critici di successo per le piattaforme SaaS:

| Fattore critico | Autori di riferimento |
|----------------|----------------------|
| Scalabilità e performance | Cusumano (2010); Mell & Grance (2011) |
| Sicurezza e isolamento dei dati | Bezemer & Zaidman (2010); Mell & Grance (2011) |
| Personalizzazione per tenant | Bezemer & Zaidman (2010) |
| User experience e facilità d'uso | Davis (1989); Venkatesh et al. (2003) |
| Modello di pricing trasparente | Nagle & Müller (2018) |
| Time-to-value rapido | Bush (2019); Ries (2011) |
| Customer success e riduzione del churn | Mehta et al. (2016) |
| Integrabilità con sistemi esterni | Cusumano (2010) |

---

## 4. Business Model Innovation

### 4.1 Il Business Model Canvas (Osterwalder)

Il Business Model Canvas (BMC) è il framework più diffuso per la progettazione e l'analisi dei modelli di business. Proposto da Osterwalder e Pigneur (2010), il Canvas struttura il modello di business in nove blocchi interconnessi:

1. Segmenti di clientela
2. Proposta di valore
3. Canali
4. Relazioni con i clienti
5. Flussi di ricavi
6. Risorse chiave
7. Attività chiave
8. Partnership chiave
9. Struttura dei costi

Il BMC è stato adottato ampiamente sia in ambito accademico sia imprenditoriale come strumento di progettazione strategica, e si presta particolarmente all'analisi di modelli SaaS, dove la proposta di valore e i flussi di ricavi ricorrenti assumono centralità (Osterwalder & Pigneur, 2010).

### 4.2 Il Lean Canvas (Maurya)

Ash Maurya (2012) ha adattato il BMC per il contesto delle startup, creando il **Lean Canvas**. Le modifiche principali riguardano la sostituzione di quattro blocchi:

| BMC (Osterwalder) | Lean Canvas (Maurya) |
|-------------------|---------------------|
| Partnership chiave | Problema |
| Attività chiave | Soluzione |
| Risorse chiave | Metriche chiave |
| Relazioni con i clienti | Vantaggio competitivo ingiusto |

Il Lean Canvas è particolarmente adatto a progetti in fase early-stage come Styll, poiché focalizza l'attenzione sulla validazione del problema prima della soluzione (Maurya, 2012).

### 4.3 L'innovazione del modello di business nella teoria

Teece (2010) definisce il modello di business come la logica attraverso cui un'impresa crea, distribuisce e cattura valore. L'autore sottolinea che l'innovazione tecnologica da sola non è sufficiente: è necessario innovare anche il modello di business per tradurre la tecnologia in valore economico.

Zott, Amit e Massa (2011) offrono una revisione sistematica della letteratura sui modelli di business, identificando quattro prospettive principali: (1) il modello di business come unità di analisi, (2) come framework di classificazione, (3) come driver di performance, e (4) come oggetto di innovazione.

Chesbrough (2010) evidenzia le barriere all'innovazione del modello di business, tra cui la *dominant logic* organizzativa e la resistenza al cambiamento, e propone un approccio sperimentale ispirato alla logica lean.

### 4.4 Piattaforme e modelli multi-sided

Il concetto di piattaforma multi-sided è rilevante per comprendere il posizionamento di Styll. Mentre i marketplace (come Fresha) operano come piattaforme a due lati che intermediano la domanda e l'offerta, Styll opera come **piattaforma abilitante** che fornisce strumenti al professionista per gestire la relazione diretta con il proprio cliente. Questa distinzione è fondamentale nella teoria delle piattaforme (Shapiro & Varian, 1999; Parker et al., 2016).

---

## 5. Lean Startup e validazione

### 5.1 Il metodo Lean Startup (Ries)

Eric Ries (2011) ha sistematizzato il metodo Lean Startup attorno al ciclo **Build-Measure-Learn** (Costruisci-Misura-Impara). I principi fondamentali includono:

- **Validated learning**: l'apprendimento validato come unità di progresso.
- **Minimum Viable Product (MVP)**: la versione più semplice del prodotto che permette di avviare il ciclo di apprendimento.
- **Pivot or persevere**: la decisione strutturata di cambiare direzione o continuare sulla base dei dati raccolti.
- **Innovation accounting**: metriche actionable (non *vanity metrics*) per misurare il progresso reale.

### 5.2 Customer Development (Blank)

Steve Blank (2013) ha introdotto il framework del **Customer Development**, articolato in quattro fasi:

1. **Customer Discovery**: identificare e validare il problema e il segmento di clientela.
2. **Customer Validation**: validare il modello di business e la capacità di vendita.
3. **Customer Creation**: generare domanda e guidare la crescita.
4. **Company Building**: strutturare l'organizzazione per la scala.

Blank sottolinea che la maggior parte delle startup fallisce non per carenze tecnologiche, ma perché costruisce prodotti che nessuno vuole — un problema di *market fit*, non di engineering (Blank, 2013).

### 5.3 La validazione del problema (Fitzpatrick)

Rob Fitzpatrick (2013) ha contribuito con *The Mom Test*, un framework pratico per condurre interviste di validazione efficaci. Il principio cardine è che le domande sulla propria idea di business sono inaffidabili: occorre invece indagare i comportamenti passati e i problemi reali dell'interlocutore. Le tre regole fondamentali sono:

1. Parlare della vita dell'interlocutore, non della propria idea.
2. Chiedere fatti specifici del passato, non opinioni generali sul futuro.
3. Parlare meno e ascoltare di più.

### 5.4 Critiche al Lean Startup

Nonostante la diffusione del metodo, la letteratura accademica ha sollevato critiche:

- **Mancanza di rigore empirico**: il framework si basa prevalentemente su casi aneddotici e non su evidenze quantitative sistematiche (Frederiksen & Brem, 2017).
- **Bias di sopravvivenza**: i casi di successo (Dropbox, Zappos) sono sovra-rappresentati rispetto ai fallimenti.
- **Applicabilità limitata**: il metodo è più adatto a startup digitali B2C/B2B con cicli brevi, meno a settori regolamentati o capital-intensive.
- **Tensione con l'innovazione radicale**: il focus sulla validazione incrementale può ostacolare l'innovazione disruptive (Christensen, 1997).

---

## 6. Product-Led Growth (PLG)

### 6.1 Definizione

Il **Product-Led Growth** (PLG) è una strategia go-to-market in cui il prodotto stesso è il principale motore di acquisizione, attivazione, conversione e espansione dei clienti. Il termine è stato coniato da Blake Bartlett di OpenView Partners e successivamente sistematizzato da Wes Bush (2019).

A differenza del modello tradizionale *Sales-Led*, nel PLG il prodotto permette all'utente di scoprire il valore autonomamente, tipicamente attraverso modelli freemium o trial gratuiti, riducendo la dipendenza dal team di vendita per la prima conversione (Bush, 2019).

### 6.2 Confronto PLG vs Sales-Led

| Dimensione | Product-Led Growth | Sales-Led Growth |
|-----------|-------------------|-----------------|
| Motore di acquisizione | Il prodotto (trial, freemium) | Il team di vendita |
| Time-to-value | Immediato (self-service) | Lungo (demo, negoziazione) |
| Onboarding | Automatizzato, in-app | Guidato da sales/CS |
| Conversione | Bottom-up (utente → decisore) | Top-down (decisore → utente) |
| CAC | Tendenzialmente più basso | Tendenzialmente più alto |
| Scalabilità | Alta (effetti di rete) | Lineare (più venditori = più vendite) |
| Esempi | Slack, Dropbox, Figma, Calendly | Salesforce, Oracle, SAP |

### 6.3 Framework MOAT (Bush)

Bush (2019) propone il **MOAT Framework** per valutare se una strategia PLG è applicabile:

- **M**arket strategy: la strategia è differenziata, dominante o disruptive?
- **O**cean: si opera in un oceano rosso (mercato saturo) o blu (nuova domanda)?
- **A**udience: l'approccio è bottom-up (utente finale) o top-down (decisore aziendale)?
- **T**ime-to-value: quanto rapidamente il prodotto porta l'utente al momento *"aha"*?

### 6.4 Metriche PLG

Le metriche chiave nel paradigma PLG includono:

- **Time-to-Value (TTV)**: tempo necessario perché l'utente raggiunga il primo momento di valore.
- **Product-Qualified Lead (PQL)**: utente che ha raggiunto una soglia di attivazione predefinita nel prodotto.
- **Expansion Revenue**: ricavi aggiuntivi da utenti esistenti (upsell, cross-sell).
- **Net Revenue Retention (NRR)**: percentuale di ricavi mantenuti ed espansi da clienti esistenti.
- **Viral Coefficient**: numero medio di nuovi utenti generati da ogni utente esistente.

### 6.5 Evidenze empiriche

I report di OpenView Partners (2022, 2023) mostrano che le aziende PLG quotate in borsa hanno valutazioni mediane più elevate rispetto alle aziende SaaS tradizionali, con un revenue per dipendente superiore del 50–60% e un tasso di crescita della *net dollar retention* significativamente più alto. Tuttavia, il modello PLG richiede investimenti significativi nel prodotto e nell'esperienza utente, e funziona meglio quando il prodotto può dimostrare valore rapidamente e autonomamente (Bush, 2019; OpenView Partners, 2023).

---

## 7. Subscription Economy e metriche

### 7.1 L'economia della sottoscrizione (Tzuo)

Tien Tzuo, fondatore di Zuora, ha coniato il termine **Subscription Economy** per descrivere la transizione da un'economia basata sulla proprietà dei prodotti a una basata sull'accesso ai servizi (Tzuo & Weisert, 2018). Secondo Tzuo, le aziende che adottano modelli a sottoscrizione beneficiano di:

- Ricavi prevedibili e ricorrenti.
- Relazioni continuative con il cliente (vs. transazioni one-shot).
- Possibilità di iterare il prodotto sulla base dell'utilizzo reale.
- Riduzione delle barriere all'ingresso per il cliente.

Questa logica è direttamente applicabile al modello di business di Styll, che prevede sottoscrizioni mensili su tre tier (Starter, Growth, Pro).

### 7.2 Metriche fondamentali del SaaS

La letteratura ha consolidato un set di metriche essenziali per valutare la salute e la sostenibilità di un business SaaS:

| Metrica | Formula | Fonte principale |
|---------|---------|-----------------|
| **MRR** (Monthly Recurring Revenue) | Σ ricavi ricorrenti mensili | Tzuo & Weisert (2018) |
| **ARR** (Annual Recurring Revenue) | MRR × 12 | Tzuo & Weisert (2018) |
| **Churn Rate** (logo) | Clienti persi nel periodo / Clienti a inizio periodo | Skok (2016); Tzuo & Weisert (2018) |
| **Revenue Churn Rate** | MRR perso nel periodo / MRR a inizio periodo | Skok (2016) |
| **CAC** (Customer Acquisition Cost) | Spese totali sales + marketing / Nuovi clienti acquisiti | Skok (2016) |
| **LTV** (Customer Lifetime Value) | ARPU × Margine lordo / Churn Rate | Fader & Hardie (2010); Skok (2016) |
| **Rapporto LTV/CAC** | LTV / CAC (target ≥ 3:1) | Skok (2016) |
| **CAC Payback Period** | CAC / (ARPU × Margine lordo) — in mesi | Skok (2016) |
| **NRR** (Net Revenue Retention) | (MRR inizio + espansione − churn − contrazione) / MRR inizio | Tzuo & Weisert (2018) |

### 7.3 I contributi di Skok

David Skok (2016) ha fornito uno dei contributi più influenti nella sistematizzazione delle metriche SaaS con la guida *SaaS Metrics 2.0*. I suoi principi cardine includono:

- **La regola del 3:1**: il valore del ciclo di vita del cliente (LTV) deve essere almeno tre volte il costo di acquisizione (CAC).
- **CAC Payback < 12 mesi**: il tempo di recupero del costo di acquisizione non deve superare l'anno.
- **Rule of 40**: la somma del tasso di crescita dei ricavi e del margine operativo deve essere almeno 40%, come indicatore di equilibrio tra crescita e profittabilità.

### 7.4 Unit Economics

L'analisi della unit economics è particolarmente rilevante per Styll. Applicando le formule al modello progettato:

- **ARPU stimato**: €19–€29/mese (Tier Starter) → €49–€69/mese (Tier Growth).
- **Target churn mensile**: <5% (obiettivo <3%).
- **LTV stimato** (Tier Starter, churn 3%): €29 × 0.80 / 0.03 = €773.
- **Target CAC**: <€250 (per mantenere LTV/CAC > 3:1).

---

## 8. Pricing nel software

### 8.1 Value-Based Pricing

Il pricing basato sul valore (*value-based pricing*) stabilisce il prezzo in funzione del valore percepito dal cliente, anziché dei costi di produzione o dei prezzi della concorrenza. Nagle e Müller (2018) identificano tre pilastri:

1. **Creazione di valore**: comprendere quali benefici il prodotto genera per il cliente.
2. **Comunicazione del valore**: articolare e dimostrare il valore in modo convincente.
3. **Cattura del valore**: tradurre il valore percepito in un prezzo che il cliente è disposto a pagare.

Nel contesto SaaS, il value-based pricing è considerato l'approccio più efficace ma anche il più difficile da implementare, poiché richiede una profonda comprensione del cliente e dei suoi processi (Nagle & Müller, 2018).

### 8.2 Il modello Freemium

Il freemium combina un'offerta gratuita di base con funzionalità premium a pagamento. Anderson (2009) ne ha teorizzato le fondamenta economiche in *Free*, evidenziando come il costo marginale quasi nullo del software digitale renda sostenibile servire gratuitamente una base ampia di utenti.

Kumar (2014) ha approfondito le condizioni di successo del freemium in un articolo su Harvard Business Review, identificando cinque fattori critici:

1. Un ampio mercato potenziale.
2. Un costo marginale per utente gratuito molto basso.
3. Una chiara differenziazione tra l'offerta free e premium.
4. Un tasso di conversione free-to-paid sostenibile (tipicamente 2–5%).
5. Effetti di rete o viralità incorporati nel prodotto.

### 8.3 Pricing comportamentale

La ricerca comportamentale ha evidenziato diversi bias cognitivi rilevanti per il pricing del software:

- **Effetto zero** (*zero price effect*): le persone attribuiscono un valore sproporzionatamente alto alle offerte gratuite, rendendo la conversione a pagamento più difficile (Shampanier et al., 2007).
- **Ancoraggio** (*anchoring*): il prezzo del tier più alto influenza la percezione di convenienza dei tier inferiori.
- **Avversione alla perdita**: enfatizzare ciò che l'utente "perde" restando nel tier gratuito è più efficace che comunicare ciò che "guadagna" passando al premium.
- **Effetto di compromesso** (*compromise effect*): in presenza di tre opzioni, gli utenti tendono a scegliere quella intermedia — rilevante per la struttura a tre tier di Styll.

### 8.4 Usage-Based Pricing

Un trend emergente nel SaaS è il *usage-based pricing*, dove il prezzo è correlato al consumo effettivo. Questo modello allinea il costo al valore ricevuto, riducendo le barriere all'ingresso. Tuttavia, introduce imprevedibilità nei ricavi per il provider (OpenView Partners, 2023). Styll adotta un approccio ibrido: sottoscrizione fissa per tier + costi variabili per messaggi oltre la soglia inclusa (pay-per-use a €0,05/messaggio).

---

## 9. Customer Success e Retention

### 9.1 Il framework Customer Success (Mehta)

Mehta, Steinman e Murphy (2016) hanno definito il **Customer Success** come la disciplina che garantisce che i clienti raggiungano i risultati desiderati attraverso l'utilizzo del prodotto. A differenza del customer support (reattivo), il customer success è **proattivo**: anticipa i bisogni, previene il churn e massimizza il valore del cliente nel tempo.

I pilastri del Customer Success includono:

- **Onboarding efficace**: il momento più critico per la retention.
- **Health Score**: un punteggio composito che misura il "benessere" del cliente.
- **Segmentazione**: strategie diverse per clienti ad alto, medio e basso valore.
- **Trigger di rischio**: indicatori precoci di possibile abbandono (riduzione dell'utilizzo, mancato rinnovo, ticket di supporto ripetuti).

### 9.2 Churn e retention

Il churn (abbandono) è il principale nemico della sostenibilità SaaS. Reichheld e Schefter (2000) hanno dimostrato che un aumento del 5% nella retention dei clienti può aumentare i profitti dal 25% al 95%, a seconda del settore.

La relazione tra soddisfazione del cliente, loyalty e profittabilità è stata empiricamente validata da Hallowell (1996), che ha dimostrato che la soddisfazione è una condizione necessaria ma non sufficiente per la loyalty: è l'**esperienza complessiva** — non la sola assenza di problemi — a guidare la fidelizzazione.

Nel contesto di Styll, il churn detection rappresenta una funzionalità core: il **Silent Churn Detector** monitora la frequenza di visita di ogni cliente e avvisa il barbiere quando un cliente abituale smette di presentarsi, attivando meccanismi di win-back automatizzati.

### 9.3 Net Promoter Score (Reichheld)

Reichheld (2003) ha introdotto il **Net Promoter Score (NPS)** come metrica sintetica della loyalty del cliente:

> **NPS = % Promotori (9–10) − % Detrattori (0–6)**

L'NPS è diventato uno standard de facto per misurare la soddisfazione e la propensione al passaparola, particolarmente rilevante per modelli di crescita product-led dove il passaparola organico è un motore di acquisizione fondamentale (Reichheld, 2003).

### 9.4 Customer Lifetime Value (Fader)

Fader e Hardie (2010) hanno contribuito in modo significativo alla modellizzazione del **Customer Lifetime Value** in contesti contrattuali (come il SaaS a sottoscrizione). Il loro approccio probabilistico — in contrasto con modelli deterministici più semplici — tiene conto dell'eterogeneità dei clienti e della distribuzione non uniforme del churn nel tempo.

Fader (2012) ha inoltre introdotto il concetto di **Customer Centricity**, argomentando che non tutti i clienti hanno lo stesso valore e che le aziende dovrebbero concentrare gli investimenti sui clienti a più alto valore potenziale. Questo principio si riflette nel **VIP Score** di Styll, un punteggio composito che identifica i clienti più preziosi per il barbiere.

---

## 10. Trasformazione digitale e adozione tecnologica

### 10.1 Technology Acceptance Model (Davis)

Il **Technology Acceptance Model (TAM)**, proposto da Davis (1989), è il framework più citato per spiegare l'adozione individuale della tecnologia. Il modello identifica due fattori principali:

- **Perceived Usefulness (PU)**: il grado in cui l'utente crede che il sistema migliorerà la sua performance.
- **Perceived Ease of Use (PEOU)**: il grado in cui l'utente crede che l'utilizzo sarà privo di sforzo.

Venkatesh et al. (2003) hanno esteso il TAM nell'**Unified Theory of Acceptance and Use of Technology (UTAUT)**, integrando quattro costrutti: aspettativa di performance, aspettativa di sforzo, influenza sociale e condizioni facilitanti.

Per Styll, il TAM è particolarmente rilevante:
- La **PU** si traduce nella capacità della piattaforma di risolvere problemi reali del barbiere (gestione appuntamenti, churn detection, loyalty).
- La **PEOU** si traduce nell'obiettivo di un setup < 8 minuti e di un'interfaccia che funzioni "in 3 tap".

### 10.2 Diffusion of Innovations (Rogers)

Rogers (2003) ha teorizzato la **diffusione delle innovazioni** come un processo attraverso cui un'innovazione viene comunicata attraverso canali specifici nel tempo tra i membri di un sistema sociale. Il modello identifica cinque categorie di adottanti:

1. **Innovators** (2,5%)
2. **Early Adopters** (13,5%)
3. **Early Majority** (34%)
4. **Late Majority** (34%)
5. **Laggards** (16%)

Le caratteristiche che accelerano l'adozione sono: vantaggio relativo, compatibilità, complessità (inversamente correlata), sperimentabilità e osservabilità (Rogers, 2003).

### 10.3 Crossing the Chasm (Moore)

Moore (2014) ha identificato un **"abisso"** (*chasm*) tra gli early adopters e la early majority, particolarmente critico per le aziende tecnologiche. Per attraversare questo abisso, Moore propone una strategia di focalizzazione:

1. Scegliere un **segmento di nicchia** specifico (per Styll: barbieri indipendenti italiani).
2. Dominare quel segmento prima di espandersi.
3. Costruire un **whole product** che risolva completamente il problema del segmento target.
4. Utilizzare il passaparola all'interno del segmento come motore di crescita.

### 10.4 Trasformazione digitale delle PMI

Vial (2019) definisce la trasformazione digitale come un processo attraverso il quale le tecnologie digitali creano disruption che innesca risposte strategiche nelle organizzazioni, alterando i loro percorsi di creazione di valore. McKinsey & Company (2020) ha documentato come la pandemia COVID-19 abbia accelerato di 3–7 anni l'adozione digitale nelle imprese, con un impatto particolarmente significativo sulle piccole imprese e sui servizi alla persona.

Westerman, Bonnet e McAfee (2014) sottolineano che la trasformazione digitale non è solo una questione tecnologica, ma richiede una trasformazione parallela delle capacità organizzative e della leadership.

---

## 11. Gamification e loyalty nel settore beauty/barbiere

### 11.1 Definizione di gamification

Deterding, Dixon, Khaled e Nacke (2011) hanno proposto la definizione accademica più citata di gamification:

> *"Gamification is the use of game design elements in non-game contexts."*

Gli autori distinguono la gamification da concetti adiacenti come *serious games* (giochi completi con scopi non ludici) e *playful design* (design giocoso senza meccaniche di gioco strutturate). Gli elementi di game design più comuni nella gamification includono punti, badge, classifiche, livelli, sfide e barre di progresso (Deterding et al., 2011).

Huotari e Hamari (2017) hanno successivamente proposto una definizione service-oriented:

> *"Gamification refers to a process of enhancing a service with affordances for gameful experiences in order to support users' overall value creation."*

Questa prospettiva è particolarmente rilevante per Styll, dove la gamification non è fine a sé stessa ma è al servizio della creazione di valore per il barbiere (retention del cliente) e per il cliente (esperienza gratificante e riconoscimento della fedeltà).

### 11.2 Fondamenti motivazionali

La gamification trova fondamento teorico nella **Self-Determination Theory (SDT)** di Deci e Ryan (1985; Ryan & Deci, 2000), che identifica tre bisogni psicologici fondamentali:

1. **Autonomia**: il bisogno di sentirsi artefici delle proprie scelte.
2. **Competenza**: il bisogno di sentirsi efficaci e capaci.
3. **Relazione**: il bisogno di connessione sociale e appartenenza.

I meccanismi di gamification di Styll mappano direttamente su questi bisogni:
- **Autonomia**: il cliente sceglie come interagire con il sistema loyalty.
- **Competenza**: streak, badge e livelli comunicano progresso e padronanza.
- **Relazione**: il sistema rafforza il legame tra cliente e barbiere.

### 11.3 Evidenze empiriche sulla gamification

Hamari, Koivisto e Sarsa (2014) hanno condotto una revisione sistematica della letteratura empirica sulla gamification, analizzando 24 studi. I risultati principali:

- La **maggioranza degli studi** riporta effetti positivi su motivazione, engagement e partecipazione.
- Gli effetti sono **dipendenti dal contesto**: la stessa meccanica può funzionare in un dominio e fallire in un altro.
- Esiste un potenziale **effetto novità**: l'engagement iniziale potrebbe calare nel tempo se non sostenuto da meccaniche evolute.
- I **punti, i badge e le classifiche** sono gli elementi più studiati e implementati.

Koivisto e Hamari (2019) hanno aggiornato questa revisione analizzando un corpus più ampio, confermando che la gamification ha effetti prevalentemente positivi ma sottolineando la necessità di studi longitudinali e in contesti reali di business.

### 11.4 Gamification nei programmi di loyalty

Werbach e Hunter (2012) hanno proposto un framework per applicare il *game thinking* ai contesti di business, distinguendo tra:

- **Meccaniche** (punti, livelli, sfide, ricompense).
- **Dinamiche** (progressione, emozioni, narrazione, relazioni).
- **Componenti** (badge, classifiche, barre di progresso, avatar).

Zichermann e Cunningham (2011) hanno approfondito il design di sistemi gamificati, sottolineando l'importanza dell'**effetto gradiente dell'obiettivo** (*Goal Gradient Effect*): i clienti accelerano il comportamento target man mano che si avvicinano alla ricompensa. Questo principio è implementato in Styll attraverso i micro-progressi motivazionali tra una soglia reward e l'altra.

### 11.5 Lo stato dell'arte nel settore barbiere/beauty

La revisione della letteratura e l'analisi competitiva rivelano un **gap significativo**: nessuna piattaforma SaaS nel segmento accessibile (< €50/mese) del settore barbiere offre meccaniche di gamification strutturate nei propri programmi di loyalty.

L'analisi dei competitor (documentata in dettaglio nel progetto) mostra che:
- **Phorest** offre loyalty avanzata (TreatCard, ReConnect) ma a un prezzo di €99+/mese, inaccessibile per i micro-professionisti.
- **Barberly**, **GlossGenius** e **Booksy** offrono loyalty basica (punti semplici) senza alcuna meccanica di gamification.
- **Nessun competitor** nel settore implementa streak, badge, livelli o sfide.

Questo gap rappresenta un'opportunità di **blue ocean** (Kim & Mauborgne, 2005) per Styll: portare meccaniche di gamification mutuate da app consumer di successo (Duolingo, Starbucks Rewards, Nike Run Club) in un settore che non le ha ancora adottate.

### 11.6 Digitalizzazione del settore barbiere

Il settore dei barbershop sta attraversando una trasformazione digitale significativa. Secondo i dati disponibili più recenti al momento della stesura, nel 2023 il 68% dei barbershop statunitensi aveva adottato sistemi di prenotazione digitale, con una riduzione del 40% dei no-show rispetto alle prenotazioni telefoniche. L'adozione di pagamenti mobili tra i barbieri indipendenti è passata dal 28% nel 2020 al 52% nel 2023 (Gitnux, 2023), un trend che si prevede in ulteriore accelerazione negli anni successivi.

In Italia, il settore conta **137.730 attività** di cui l'82,7% sono micro-imprenditori individuali — un mercato frammentato e largamente sotto-digitalizzato, dove strumenti come WhatsApp e l'agenda cartacea restano dominanti per la gestione degli appuntamenti.

Il mercato globale del software per barbershop era stimato a circa $1,8 miliardi nel 2023, con un tasso di crescita annuale (CAGR) del 10% (Market Research Intellect, 2023) — un trend che, proiettato, porterebbe il mercato a superare i $2,6 miliardi entro il 2026. Queste dinamiche confermano l'opportunità per una soluzione SaaS verticale accessibile e focalizzata sulla retention.

---

## 12. Sintesi e gap della letteratura

### 12.1 Mappa concettuale

La revisione della letteratura ha tracciato un percorso che collega sei macro-aree teoriche al progetto Styll:

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUADRO TEORICO DI STYLL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   SaaS & Cloud Computing ──→ Architettura multi-tenant         │
│         │                                                       │
│         ▼                                                       │
│   Business Model Innovation ──→ Canvas, Lean, PLG              │
│         │                                                       │
│         ▼                                                       │
│   Lean Startup ──→ Validazione, MVP, Build-Measure-Learn       │
│         │                                                       │
│         ▼                                                       │
│   Subscription Economy ──→ Metriche SaaS, Unit Economics       │
│         │                                                       │
│         ▼                                                       │
│   Customer Success & Retention ──→ Churn detection, LTV        │
│         │                                                       │
│         ▼                                                       │
│   Gamification & Loyalty ──→ Blue ocean nel settore barbiere   │
│                                                                 │
│   ← Trasformazione digitale PMI (contesto abilitante) →       │
│   ← Pricing Strategy (sostenibilità economica) →              │
│   ← Adozione tecnologica TAM/UTAUT (fattori critici) →       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Evidenze principali

| # | Evidenza | Fonte principale |
|---|---------|-----------------|
| 1 | Il SaaS multi-tenant è il modello architetturale più efficiente per servire micro-professionisti con esigenze simili | Cusumano (2010); Bezemer & Zaidman (2010) |
| 2 | L'innovazione del modello di business è tanto importante quanto l'innovazione tecnologica | Teece (2010); Chesbrough (2010) |
| 3 | Il PLG è la strategia go-to-market più adatta per SaaS con onboarding self-service | Bush (2019); OpenView Partners (2023) |
| 4 | Il rapporto LTV/CAC ≥ 3:1 e il CAC Payback < 12 mesi sono benchmark fondamentali | Skok (2016); Tzuo & Weisert (2018) |
| 5 | La retention ha un impatto sul profitto 5–25× superiore all'acquisizione di nuovi clienti | Reichheld & Schefter (2000) |
| 6 | La gamification ha effetti positivi sull'engagement, ma dipende dal contesto e dal design | Hamari et al. (2014); Koivisto & Hamari (2019) |
| 7 | Il value-based pricing è l'approccio più efficace ma il più difficile da implementare nel software | Nagle & Müller (2018) |
| 8 | L'adozione tecnologica dipende da utilità percepita e facilità d'uso | Davis (1989); Venkatesh et al. (2003) |
| 9 | La focalizzazione su un segmento di nicchia è essenziale per attraversare il chasm | Moore (2014) |
| 10 | Il settore barbiere è sotto-digitalizzato e nessun competitor offre gamification nel tier accessibile | Analisi competitiva; Gitnux (2023) |

### 12.3 Gap identificati

L'analisi della letteratura ha identificato i seguenti gap rilevanti:

1. **Gap empirico sulla gamification nei servizi alla persona**: la maggior parte degli studi sulla gamification si concentra su educazione, salute e crowdsourcing. Mancano studi empirici sull'applicazione della gamification ai programmi di loyalty nel settore beauty/barbiere.

2. **Gap sulla retention nei SaaS verticali per micro-professionisti**: la letteratura sul customer success si focalizza prevalentemente su SaaS B2B enterprise. Mancano framework specifici per il customer success di micro-professionisti con bassa sofisticazione tecnologica.

3. **Gap sull'intersezione PLG e white-label**: il paradigma PLG è studiato prevalentemente per prodotti con brand proprio. Mancano studi su come applicare il PLG a piattaforme white-label dove il brand del provider è invisibile all'utente finale.

4. **Gap sulla digitalizzazione dei micro-professionisti italiani**: la letteratura sulla trasformazione digitale delle PMI è prevalentemente focalizzata su mercati anglosassoni. Mancano dati specifici sul livello di digitalizzazione dei barbieri italiani e sulle barriere all'adozione in questo contesto.

5. **Gap sul design di sistemi di loyalty duali**: nessuno studio affronta il design di un sistema di loyalty che funzioni simultaneamente per utenti tech-savvy (esperienza gamificata visibile) e per utenti non-tech (esperienza silente e gestita dal professionista).

### 12.4 Opportunità di ricerca

I gap identificati aprono le seguenti opportunità di contributo:

- **Studio empirico** sull'efficacia della gamification nei programmi di loyalty per barbieri, misurando l'impatto su frequenza di visita, churn rate e soddisfazione del cliente.
- **Framework di customer success** per SaaS verticali rivolti a micro-professionisti con bassa digital literacy.
- **Modello di adozione tecnologica** specifico per il segmento dei barbieri italiani, estendendo il TAM/UTAUT con variabili contestuali (dimensione dell'attività, età del professionista, pressione competitiva locale).
- **Design pattern** per sistemi di loyalty adattivi che modulano la complessità dell'esperienza in base al profilo dell'utente finale.

---

## 13. Collegamento col progetto

### 13.1 Framework applicabili

La tabella seguente sintetizza come i framework teorici identificati nella revisione si applicano direttamente alle scelte progettuali di Styll:

| Framework teorico | Applicazione in Styll |
|------------------|----------------------|
| **NIST SaaS / Multi-tenancy** | Architettura multi-tenant con Supabase, isolamento dati per tenant, aggiornamenti centralizzati |
| **Business Model Canvas** | Struttura del modello a 3 tier con proposta di valore retention-first |
| **Lean Canvas** | Focus sulla validazione del problema (silent churn) prima della soluzione |
| **Lean Startup (Ries)** | Roadmap MVP → v2 → v3 con cicli Build-Measure-Learn |
| **Customer Development (Blank)** | Personas basate su interviste e analisi delle recensioni dei competitor |
| **The Mom Test (Fitzpatrick)** | Validazione del problema attraverso le 7 lamentele universali dei barbieri |
| **PLG / MOAT (Bush)** | Self-service onboarding < 8 min, trial → WOW → conversione |
| **Subscription Economy (Tzuo)** | 3 tier con ricavi ricorrenti mensili + revenue variabili |
| **SaaS Metrics (Skok)** | Target LTV/CAC ≥ 3:1, CAC Payback < 12 mesi |
| **Customer Success (Mehta)** | Silent Churn Detector, win-back automatizzati, Health Score per cliente |
| **NPS (Reichheld)** | Richiesta automatica di recensioni post-visita |
| **LTV (Fader)** | VIP Score composito per identificare i clienti a più alto valore |
| **TAM (Davis)** | Design dell'interfaccia guidato da PU e PEOU |
| **Diffusion of Innovations (Rogers)** | Target iniziale: early adopters tra i barbieri (tech-curious, < 40 anni) |
| **Crossing the Chasm (Moore)** | Focalizzazione su un segmento ristretto (barbieri indipendenti italiani) |
| **Gamification (Deterding; Hamari)** | Streak, badge, livelli, sfide — primo nel settore barbiere |
| **SDT (Deci & Ryan)** | Design della loyalty che soddisfa autonomia, competenza e relazione |
| **Goal Gradient Effect** | Micro-progressi motivazionali tra le soglie reward |
| **Blue Ocean (Kim & Mauborgne)** | Gamification nel beauty = spazio competitivo non conteso |
| **Value-Based Pricing (Nagle)** | Pricing ancorato al valore (retention, non solo gestionale) |
| **Freemium (Anderson; Kumar)** | Valutazione futura di un tier gratuito per accelerare l'acquisizione |

### 13.2 Contributo originale del progetto

Il progetto Styll si posiziona all'intersezione di più filoni di ricerca, offrendo un contributo originale su tre dimensioni:

1. **Dimensione progettuale**: primo sistema di loyalty gamificata nel settore barbiere/beauty nel segmento accessibile (< €50/mese), che combina meccaniche di game design (streak, badge, livelli, sfide) con un sistema di churn detection proattivo.

2. **Dimensione architetturale**: dimostrazione pratica di un'architettura SaaS multi-tenant white-label costruita con stack moderno (Next.js + TypeScript + Supabase) che permette a ciascun tenant di offrire un'esperienza completamente brandizzata ai propri clienti, mantenendo la semplicità operativa di una piattaforma centralizzata.

3. **Dimensione di design**: progettazione di un sistema di loyalty duale che si adatta automaticamente al profilo dell'utente finale — gamificato e visibile per gli utenti tech-savvy, silente e gestito dal professionista per gli utenti non-tech — senza richiedere configurazione aggiuntiva al barbiere.

---

## 14. Bibliografia

### Paper accademici e articoli su riviste

Anderson, C. (2009). *Free: The Future of a Radical Price*. Hyperion.

Bezemer, C. P., & Zaidman, A. (2010). Multi-tenant SaaS applications: Maintenance dream or nightmare? In *Proceedings of the Joint ERCIM Workshop on Software Evolution and International Workshop on Principles of Software Evolution* (pp. 88–92). ACM. https://doi.org/10.1145/1862372.1862393

Blank, S. (2013). Why the Lean Start-Up Changes Everything. *Harvard Business Review*, *91*(5), 63–72.

Chesbrough, H. (2010). Business Model Innovation: Opportunities and Barriers. *Long Range Planning*, *43*(2–3), 354–363. https://doi.org/10.1016/j.lrp.2009.07.010

Cusumano, M. A. (2010). Cloud computing and SaaS as new computing platforms. *Communications of the ACM*, *53*(4), 27–29. https://doi.org/10.1145/1721654.1721667

Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly*, *13*(3), 319–340. https://doi.org/10.2307/249008

Deci, E. L., & Ryan, R. M. (1985). *Intrinsic Motivation and Self-Determination in Human Behavior*. Plenum Press.

Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining "gamification". In *Proceedings of the 15th International Academic MindTrek Conference: Envisioning Future Media Environments* (pp. 9–15). ACM. https://doi.org/10.1145/2181037.2181040

Fader, P. S. (2012). *Customer Centricity: Focus on the Right Customers for Strategic Advantage* (2nd ed.). Wharton Digital Press.

Fader, P. S., & Hardie, B. G. S. (2010). Customer-base valuation in a contractual setting: The perils of ignoring heterogeneity. *Marketing Science*, *29*(1), 85–93. https://doi.org/10.1287/mksc.1080.0482

Frederiksen, D. L., & Brem, A. (2017). How do entrepreneurs think they create value? A scientific reflection of Eric Ries' Lean Startup approach. *International Entrepreneurship and Management Journal*, *13*(1), 169–189. https://doi.org/10.1007/s11365-016-0411-x

Hallowell, R. (1996). The relationships of customer satisfaction, customer loyalty, and profitability: An empirical study. *International Journal of Service Industry Management*, *7*(4), 27–42. https://doi.org/10.1108/09564239610129931

Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? — A literature review of empirical studies on gamification. In *Proceedings of the 47th Hawaii International Conference on System Sciences* (pp. 3025–3034). IEEE. https://doi.org/10.1109/HICSS.2014.377

Huotari, K., & Hamari, J. (2017). A definition for gamification: Anchoring gamification in the service marketing literature. *Electronic Markets*, *27*(1), 21–31. https://doi.org/10.1007/s12525-015-0212-z

Koivisto, J., & Hamari, J. (2019). The rise of motivational information systems: A review of gamification research. *International Journal of Information Management*, *45*, 191–210. https://doi.org/10.1016/j.ijinfomgt.2018.10.013

Kumar, V. (2014). Making "Freemium" Work. *Harvard Business Review*, *92*(5), 27–29.

Reichheld, F. F. (2003). The One Number You Need to Grow. *Harvard Business Review*, *81*(12), 46–54.

Reichheld, F. F., & Schefter, P. (2000). E-Loyalty: Your Secret Weapon on the Web. *Harvard Business Review*, *78*(4), 105–113.

Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*, *55*(1), 68–78. https://doi.org/10.1037/0003-066X.55.1.68

Shampanier, K., Mazar, N., & Ariely, D. (2007). Zero as a special price: The true value of free products. *Marketing Science*, *26*(6), 742–757. https://doi.org/10.1287/mksc.1060.0254

Teece, D. J. (2010). Business models, business strategy and innovation. *Long Range Planning*, *43*(2–3), 172–194. https://doi.org/10.1016/j.lrp.2009.07.003

Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. *MIS Quarterly*, *27*(3), 425–478. https://doi.org/10.2307/30036540

Vial, G. (2019). Understanding digital transformation: A review and a research agenda. *Journal of Strategic Information Systems*, *28*(2), 118–144. https://doi.org/10.1016/j.jsis.2019.01.003

Zott, C., Amit, R., & Massa, L. (2011). The business model: Recent developments and future research. *Journal of Management*, *37*(4), 1019–1042. https://doi.org/10.1177/0149206311406265

### Libri

Bush, W. (2019). *Product-Led Growth: How to Build a Product That Sells Itself*. Product-Led Institute.

Christensen, C. M. (1997). *The Innovator's Dilemma: When New Technologies Cause Great Firms to Fail*. Harvard Business School Press.

Fitzpatrick, R. (2013). *The Mom Test: How to Talk to Customers & Learn If Your Business Is a Good Idea When Everyone Is Lying to You*. Robfitz Ltd.

Kim, W. C., & Mauborgne, R. (2005). *Blue Ocean Strategy: How to Create Uncontested Market Space and Make the Competition Irrelevant*. Harvard Business Review Press.

Maurya, A. (2012). *Running Lean: Iterate from Plan A to a Plan That Works* (2nd ed.). O'Reilly Media.

Mehta, N., Steinman, D., & Murphy, L. (2016). *Customer Success: How Innovative Companies Are Reducing Churn and Growing Recurring Revenue*. Wiley.

Moore, G. A. (2014). *Crossing the Chasm: Marketing and Selling Disruptive Products to Mainstream Customers* (3rd ed.). Harper Business. (Opera originale pubblicata nel 1991)

Nagle, T. T., & Müller, G. (2018). *The Strategy and Tactics of Pricing: A Guide to Growing More Profitably* (6th ed.). Routledge.

Osterwalder, A., & Pigneur, Y. (2010). *Business Model Generation: A Handbook for Visionaries, Game Changers, and Challengers*. Wiley.

Parker, G. G., Van Alstyne, M. W., & Choudary, S. P. (2016). *Platform Revolution: How Networked Markets Are Transforming the Economy and How to Make Them Work for You*. W. W. Norton & Company.

Porter, M. E. (1985). *Competitive Advantage: Creating and Sustaining Superior Performance*. Free Press.

Ries, E. (2011). *The Lean Startup: How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses*. Crown Business.

Rogers, E. M. (2003). *Diffusion of Innovations* (5th ed.). Free Press.

Shapiro, C., & Varian, H. R. (1999). *Information Rules: A Strategic Guide to the Network Economy*. Harvard Business School Press.

Tzuo, T., & Weisert, G. (2018). *Subscribed: Why the Subscription Model Will Be Your Company's Future — and What to Do About It*. Portfolio/Penguin.

Werbach, K., & Hunter, D. (2012). *For the Win: How Game Thinking Can Revolutionize Your Business*. Wharton Digital Press.

Westerman, G., Bonnet, D., & McAfee, A. (2014). *Leading Digital: Turning Technology into Business Transformation*. Harvard Business Review Press.

Zichermann, G., & Cunningham, C. (2011). *Gamification by Design: Implementing Game Mechanics in Web and Mobile Apps*. O'Reilly Media.

### Working paper e report

Dubey, A., & Wagle, D. (2007). Delivering software as a service. *McKinsey Quarterly*, May 2007. https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/delivering-software-as-a-service

McKinsey & Company. (2020). *How COVID-19 has pushed companies over the technology tipping point — and transformed business forever*. McKinsey Digital. https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/how-covid-19-has-pushed-companies-over-the-technology-tipping-point-and-transformed-business-forever

Mell, P., & Grance, T. (2011). *The NIST Definition of Cloud Computing* (NIST Special Publication 800-145). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-145

OpenView Partners. (2023). *2023 Product Benchmarks Report*. OpenView. https://openviewpartners.com/product-benchmarks/

Skok, D. (2016). *SaaS Metrics 2.0 — A Guide to Measuring and Improving What Matters*. ForEntrepreneurs. https://www.forentrepreneurs.com/saas-metrics-2/

### Report di settore

Gitnux. (2023). *Digital Transformation in the Barber Industry: Statistics and Trends*. https://gitnux.org/digital-transformation-in-the-barber-industry-statistics/

IBISWorld. (2024). *Barber Shops in the US — Industry Market Research Report*. IBISWorld.

Market Research Intellect. (2023). *Barber Shop Software Market Size, Share, Growth and Industry Analysis*. https://www.marketresearchintellect.com/product/global-barber-shop-software-market-size-and-forecast/

### Risorse online

OpenView Partners. (2022). *The Product-Led Growth Index*. https://openviewpartners.com/

Product-Led Institute. (2023). *Product-Led Growth Resources*. https://productled.com/