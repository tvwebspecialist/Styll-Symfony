# Contesto del Progetto di Tesi

> **Usa questo file all'inizio di ogni nuova chat con Copilot:**
> *"Leggi il file messaggio.md nel repo tvwebspecialist/Amity"*

---

## Perché nasce questo progetto

Questo progetto nasce da un problema reale vissuto in prima persona.
Inizialmente è stata sviluppata un'app per un singolo barbiere, per semplificare la gestione degli appuntamenti e dei clienti. L'idea funzionava, ma il limite era evidente: ogni nuova attività avrebbe richiesto un progetto da rifare da zero.

Da questa riflessione nasce la domanda centrale:
> È possibile creare un'unica app lato utente e un unico gestionale lato professionista, capaci di adattarsi a realtà diverse senza ripartire da zero?

La risposta è questo progetto di tesi.

---

## L'idea

Una piattaforma **SaaS verticale per barbieri** con focus sulla **retention** che:
- Non è un marketplace e non serve a portare nuovi clienti
- Serve a chi i clienti li ha già, ma vuole gestirli meglio e **farli tornare**
- È sempre online, non si installa, non complica la vita
- È brandizzata al 100% col brand del professionista (white-label)
- Integra loyalty gamificata, win-back automatico e churn detection

**La promessa del prodotto:**
> *"Non ti porto clienti, ti aiuto a gestire i tuoi — e a farli tornare."*

Il professionista rimane sempre al centro. La tecnologia lavora in silenzio, dietro le quinte.

---

## Posizionamento strategico

**Non siamo:**
- Un marketplace (Fresha, Booksy, theCut)
- Un gestionale generico (Square, Acuity)
- Un tool solo per saloni grandi (Phorest, Squire)

**Siamo:**
- Un **sistema di retention brandizzato** per micro-professionisti
- Il primo a portare **gamification nella loyalty** del settore barber/beauty
- Phorest per i piccoli, al prezzo di GlossGenius, con la semplicità di Barberly

**Mappa di posizionamento:**
```
                    RETENTION ↑
                         |
            Phorest      |      NOI
          (caro, grandi) |  (accessibile, piccoli)
                         |
    ─────────────────────┼──────────────────────
                         |
         Barberly        |     GlossGenius
      (bello, semplice,  |  (bellissimo, zero
       zero retention)   |    retention)
                         |
                    RETENTION ↓

    ← SEMPLICE                    COMPLESSO →
```

---

## A chi è rivolto

**Target primario:** Barbieri italiani indipendenti (137.730 attività sul territorio, 82.7% micro-imprenditori individuali)

**Target secondario:** Saloni da parrucchiere con piccoli team (2-5 persone)

**Scalabilità futura:** Fitness, tattoo, fisioterapia — qualsiasi micro-professionista su appuntamento

---

## Struttura tecnica

### Architettura Multi-Tenant
Un'unica piattaforma centrale che ospita più barbieri contemporaneamente, mantenendo separati dati, impostazioni e identità visiva di ciascuno.

### Le 3 interfacce del sistema

1. **Dashboard Amministratore**
   - Creazione e gestione dei professionisti (barbieri)
   - Attivazione/disattivazione accessi in base all'abbonamento
   - Configurazione nome, colori, logo e stile del brand
   - Abilitazione/disabilitazione funzionalità (feature toggle)

2. **Dashboard del Professionista (Barbiere)**
   - Gestione calendario + walk-in
   - Visualizzazione e organizzazione appuntamenti
   - Configurazione servizi offerti
   - Gestione clienti con CRM (storico, frequenza, rischio churn)
   - Setup loyalty e reward
   - Notifiche win-back ("questo cliente non viene da X giorni")
   - Analytics (revenue, retention rate, clienti attivi)

3. **Landing Page + App Cliente (PWA)**
   - Landing page dedicata per ogni barbiere
   - Il cliente installa l'app direttamente dal browser (nessuno store)
   - Sul telefono del cliente appare l'app del barbiere (non una piattaforma esterna)
   - Booking in 3 tap
   - Profilo loyalty con punti, streak, livello, badge
   - Reminder automatici

### White-Label e Branding Esterno
Ogni professionista dispone di:
- Indirizzo web dedicato
- Nome app personalizzato
- Icona personalizzata
- Colori e logo coerenti con il proprio brand

L'esperienza percepita dal cliente è quella di un'app proprietaria del barbiere, non di una piattaforma esterna.

### Stack Tecnologico
- **Frontend:** React
- **Backend / Database / Auth:** Supabase
- **Architettura:** SaaS online, sempre accessibile, aggiornabile centralmente
- **Tipo app cliente:** PWA (Progressive Web App) — no App Store, installabile da browser

---

## Analisi competitor completa

### Categorie di competitor

**MARKETPLACE (non sono competitor diretti — fanno un prodotto diverso):**
Il cliente finale cerca il barbiere sulla LORO piattaforma. Il brand del barbiere è secondario.

| Nome | Target | Utenti | Note |
|------|--------|--------|------|
| **Fresha** | Tutti, globale | 450K+ business | Leader globale, marketplace + gestionale. Loyalty +$60/mese extra. Commissione 20% su nuovi clienti. |
| **Booksy** | Tutti, globale | 60K+ business | Simile a Fresha. "Boost" a pagamento per visibilità. Fee nascoste. |
| **theCut** | Barbieri US | 10M utenti, 18K+ barbieri | Focus 100% barber, discovery gratuita. Supporto pessimo, truffe segnalate. |
| **Squire** | Barbershop premium | 3K+ shop | Premium, complesso. UX confusa, venditori aggressivi. |

**TOOL BRANDIZZATI (competitor diretti — stesso approccio "l'app è del barbiere"):**

| Nome | Target | Prezzo | Loyalty | Gamification | Win-back | Note |
|------|--------|--------|---------|-------------|----------|------|
| **Barberly** | Barbieri EU | ~$20/mese | ✅ Basica | ❌ | ❌ | Il più simile a noi. App brandizzata su App Store per ogni barbiere. Buone review (4.5-4.8). Ma ZERO innovazione sulla retention. |
| **BookedBarber** | Barbieri indie | ~$30/mese | ❓ | ❌ | ❌ | Nuovo. Ha "AI Business Coach". Data ownership. Poche review, da monitorare. |
| **GlossGenius** | Beauty pro US | $24/mese | ❌ Basica | ❌ | ❌ | UX migliore del settore. Ma target beauty/saloni, non barbieri. Feature bloccate dietro tier costosi. |
| **Phorest** | Saloni medio-grandi | $99+/mese | ✅ TreatCard (top) | ❌ | ✅ ReConnect (top) | Unico con retention vera. Ma caro, complesso, contratti annuali, $295 per esportare dati. Non per barbieri singoli. |

### Tabella comparativa completa

| | Fresha | Booksy | theCut | Barberly | BookedBarber | GlossGenius | Phorest | **NOI** |
|--|--------|--------|--------|----------|-------------|-------------|---------|---------|
| **Tipo** | Marketplace | Marketplace | Marketplace | Brandizzato | Brandizzato | Brandizzato | Brandizzato | **Brandizzato** |
| **Target** | Tutti | Tutti | Barbieri US | Barbieri EU | Barbieri indie | Beauty US | Saloni grandi | **Barbieri singoli/piccoli** |
| **Prezzo entry** | $19.95 | $29.99 | Gratis | ~$20 | ~$30 | $24 | $99+ | **~€19-29** |
| **App col brand del barbiere** | ❌ | ❌ | ❌ | ✅ | ✅ Website | ⚠️ Parziale | ✅ | **✅ PWA** |
| **Loyalty** | +$60/mese | ✅ Card base | ✅ Punti base | ✅ Basica | ❓ | ❌ | ✅ TreatCard | **✅ Gamificata** |
| **Gamification** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ UNICI** |
| **Win-back auto** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ ReConnect | **✅** |
| **Silent churn detection** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **✅** |
| **Data ownership** | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ ($295 export) | **✅ Sempre gratis** |
| **Supporto** | Template AI | Lento | Pessimo | ⭐⭐⭐⭐⭐ | ❓ | AI + lento | Buono→cala | **Umano (obiettivo)** |

### Le 7 lamentele universali dai forum (Reddit, Trustpilot, BBB, Capterra)

1. 🔴 **"I costi crescono di nascosto"** — Fresha, Booksy, GlossGenius
2. 🔴 **"Il supporto non esiste / è AI"** — TUTTI
3. 🔴 **"Mi sento ostaggio, non riesco a uscire"** — Fresha, Phorest, Booksy
4. 🔴 **"L'app è troppo complessa"** — Squire, Phorest
5. 🔴 **"La loyalty è inutile/basica"** — GlossGenius, Squire, theCut
6. 🔴 **"Notifiche mancanti, prenotazioni perse"** — Booksy, theCut
7. 🔴 **"Non so chi sto perdendo"** — TUTTI tranne Phorest

---

## Learnings — Cosa abbiamo imparato

### ✅ What's worth having
- Prezzo d'ingresso basso (sotto €30) per crescita esplosiva (da Fresha)
- Booking integrato con social: Instagram/Facebook/Google (da Fresha)
- Design come vantaggio competitivo — UX = il prodotto (da GlossGenius)
- Mobile-first nativo (da GlossGenius)
- TreatCard = loyalty con punti + reward personalizzabili (da Phorest)
- ReConnect = win-back automatico per clienti che non tornano (da Phorest)
- Reputation Manager = review automatiche (da Phorest)
- Content marketing per acquisizione: SEO, blog, academy (da Phorest)
- Data ownership e migrazione gratis (da GlossGenius)
- Product-led growth: trial → WOW → conversione (da GlossGenius)

### ❌ What to avoid
- Loyalty come add-on a pagamento (Fresha: +$60/mese)
- Costi nascosti e commissioni crescenti (Fresha, Booksy)
- Supporto con template AI senza umani (Fresha, GlossGenius)
- Contratti annuali vincolanti (Phorest)
- Data export a pagamento (Phorest: $295)
- Feature bloccate dietro tier costosi (GlossGenius)
- Curva di apprendimento ripida (Phorest, Squire)
- Calendario non sincronizzato con esterni (GlossGenius)
- Perdere il controllo dei dati del barbiere (Fresha marketplace)

---

## Opportunities — Come ci differenziamo

### 1. "Retention-first" come posizionamento unico
Nessun competitor nel TIER 1 (prezzo accessibile) ha la retention come core. Phorest sì, ma costa $99+.

### 2. Gamification della loyalty — blue ocean
NESSUN competitor ha gamification. Badge, streak, sfide, leaderboard. Dati: +48% engagement (Gallup). Mercato gamification: $49B entro 2029.

### 3. "I tuoi dati sono tuoi" come manifesto
Fresha tiene i dati. Phorest fa pagare $295 per esportarli. Noi: export gratis, sempre.

### 4. Win-back intelligente per il barbiere singolo
"Marco non viene da 45 giorni. Normalmente viene ogni 30. Vuoi che gli mandi un messaggio?" Un tap.

### 5. Pricing radicalmente trasparente
Un prezzo. Niente sorprese. Mai.

### 6. Supporto umano come differenziatore
In un mondo dove tutti automatizzano, il tocco umano diventa lusso.

### 7. Buchi di mercato confermati dalla ricerca
- Nessuno fa loyalty moderna (non punti 2010) nel TIER 1
- Nessuno fa analytics di retention actionable per piccoli
- Nessuno fa gestione ibrida walk-in + appointment con QR
- Nessuno fa no-show prediction con deposito intelligente (solo per clienti a rischio)
- Nessuno fa gamification nel beauty/barber

---

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

## Roadmap feature

### v1 — Lancio (MVP)
- Prenotazioni + pagamenti online
- CRM clienti centralizzato
- Loyalty base a punti
- Silent Churn Detector (notifica)
- Promemoria anti no-show
- Richiesta recensioni auto
- Landing page + PWA cliente brandizzata

### v2 — Crescita
- Loyalty gamificata (badge, streak, livelli)
- Campagne win-back automatiche
- QR walk-in + coda digitale
- Abbonamenti e pacchetti
- Reward personalizzati
- Punteggio cliente VIP
- Analytics avanzata

### v3 — AI
- AI Business Coach
- Previsione ricavi
- Last-minute slot filler geolocalizzato
- Prenotazione da WhatsApp
- Story Instagram post-visita
- No-show prediction AI + deposito smart
- Prezzi dinamici

---

## Feature innovative esclusive (nessun competitor le ha)

| # | Feature | Descrizione | Fase |
|---|---------|-------------|------|
| 1 | **Gamification loyalty** | Streak, badge, livelli, sfide. Come Duolingo per il barbiere. +48% engagement. | v2 |
| 2 | **Silent Churn Detector** | Notifica quando un cliente abituale smette di venire. "Marco non viene da 38 giorni." | v1 |
| 3 | **Business Coach AI** | Suggerimenti proattivi: "Hai 3 buchi mercoledì. 3 clienti non vengono da 35+ giorni. Mando il messaggio?" | v3 |
| 4 | **Smart Reward** | Premio personalizzato per ogni cliente basato sul comportamento. Chi sta per andarsene → taglio gratis. Chi è fedele → prodotto nuovo. | v2-v3 |
| 5 | **No-show Prediction AI** | Reliability score per cliente. Deposito richiesto SOLO ai clienti a rischio, non a tutti. | v3 |
| 6 | **Last-minute Slot Filler** | Buco nel calendario → notifica ai clienti nel raggio di 2-3km → "Slot disponibile ORA, -20%" | v3 |
| 7 | **Client VIP Score** | Punteggio automatico basato su frequenza, spesa, puntualità, referral, review. Il barbiere sa chi sono i clienti che lo fanno vivere. | v2 |
| 8 | **After-Visit Story** | Template Instagram Story brandizzato post-taglio + bonus punti se il cliente condivide. Marketing virale gratis. | v3 |
| 9 | **Walk-in QR + Coda Digitale** | QR sulla vetrina → il walk-in scanna → entra nella coda → SMS "tocca a te tra 15 min" | v2 |

---

## Personas

### Persona 1 — Marco Ferretti, 28 anni (Barbiere indipendente, Napoli)
> *"Io so fare tagli perfetti. Ma gestire il negozio, i clienti, i conti... non è quello per cui ho studiato."*

- 1 sedia, in affitto, aperto da 2 anni, fa tutto da solo
- iPhone 14, gestisce tutto su WhatsApp + Google Calendar
- Frustrazioni: no-show, silent churn, caos WhatsApp, costi nascosti software, sedia vuota infrasettimanale
- Obiettivi: riempire i buchi, sapere chi perde, app col SUO brand, sembrare professionale
- Needs: setup 15 min, prenotazioni automatiche, notifica churn, prezzo giusto, dati suoi

### Persona 2 — Sara Bianchi, 38 anni (Titolare salone parrucchiera, Roma)
> *"Passo più tempo a gestire il salone che a lavorare con i capelli."*

- 3 postazioni, 3 dipendenti, aperto da 5 anni, usa Fresha (frustrata)
- Sposata, 2 figli — work/life balance impossibile
- Frustrazioni: Fresha costa troppo e mostra il suo brand non il mio, loyalty +€60/mese, gestione turni manuale, clienti persi senza accorgersene
- Obiettivi: il suo brand ovunque, gestire team, churn detector, loyalty inclusa, meno tempo sull'admin
- Needs: migrazione da Fresha, multi-staff, silent churn, loyalty vera, funzionare anche per clienti che telefonano

### Persona 3 — Luca Esposito, 22 anni (Cliente giovane, studente, Milano)
> *"Se non posso prenotare in 30 secondi dal telefono, non prenoto."*

- Studente + part-time, va dal barbiere ogni 3 settimane
- iPhone, 6+ ore/giorno, Instagram/TikTok, paga con Apple Pay
- Usa Duolingo con streak di 145 giorni — la gamification lo coinvolge
- Frustrazioni: dover mandare WhatsApp e aspettare, nessun reward per la fedeltà, no reminder
- Needs: booking in 3 tap, gamification (streak, badge, livelli), reward, reminder, pagamento contactless

### Persona 4 — Roberto Marini, 54 anni (Cliente maturo, commercialista, Verona)
> *"Io il mio barbiere lo chiamo al telefono. Perché devo scaricare un'app?"*

- Stesso barbiere da 12 anni, ogni 4 settimane, sabato 9:30
- iPhone 12, usa solo WhatsApp/email/Maps, zero social, basso tech
- Frustrazioni: app con troppe schermate, font piccoli, password, registrazione obbligatoria
- Needs: NON deve scaricare niente, SMS come canale, il barbiere lo gestisce dal CRM, si sente valorizzato senza capire la gamification, il sistema lavora in background per lui

---

## Indice tesi (aggiornato)

### Introduzione
- Contesto e motivazioni del progetto
- Obiettivi della tesi
- Metodo di lavoro e approccio progettuale
- Struttura del documento

### Capitolo 1 — Contesto teorico e di mercato
1.1 La digitalizzazione dei micro-professionisti locali
1.2 Il modello SaaS: definizione, evoluzione e varianti
1.3 SaaS verticali, marketplace e gestionali brandizzati: differenze fondamentali
1.4 Il tema della relazione diretta professionista–cliente
1.5 Il settore barbershop e grooming: dimensione del mercato, trend e proiezioni

### Capitolo 2 — Analisi del problema
2.1 Il professionista locale oggi: come gestisce appuntamenti, clienti e fidelizzazione
2.2 Limiti degli strumenti informali (agenda cartacea, WhatsApp, Google Calendar)
2.3 Il problema invisibile: la perdita silenziosa dei clienti (silent churn)
2.4 Bisogni reali del professionista: oltre la prenotazione
2.5 Bisogni del cliente finale

### Capitolo 3 — Analisi delle soluzioni esistenti
3.1 Panoramica: categorie di soluzioni (marketplace, tool brandizzati, gestionali generici)
3.2 Analisi dei marketplace: Fresha, Booksy, theCut
3.3 Analisi dei tool brandizzati: Barberly, BookedBarber, GlossGenius
3.4 Analisi delle soluzioni premium: Phorest, Squire
3.5 Tavola comparativa e benchmark
3.6 Analisi delle recensioni utenti: pattern di frustrazione e soddisfazione
3.7 Buchi di mercato identificati

### Capitolo 4 — Learnings e opportunità strategiche
4.1 Cosa funziona: lezioni dai competitor (what's worth having)
4.2 Cosa evitare: errori ricorrenti e anti-pattern
4.3 Opportunità di differenziazione: dove il mercato è vuoto
4.4 La retention come territorio inesplorato nel segmento accessibile
4.5 La gamification applicata alla fidelizzazione: stato dell'arte e case study

### Capitolo 5 — Visione e concept del progetto
5.1 Posizionamento: non un gestionale, un sistema di retention
5.2 La filosofia brand-first: l'app è del professionista
5.3 Modello white-label e scelta tecnica: PWA vs app nativa
5.4 Target primario e possibilità di estensione verticale
5.5 Modello di business: struttura dei tier, pricing e monetizzazione
5.6 Roadmap prodotto: v1, v2, v3

### Capitolo 6 — Brand identity
6.1 Strategia di branding e posizionamento percettivo
6.2 Il processo di naming
6.3 Identità visiva: logo, palette colori, tipografia
6.4 Tono di voce e personalità del brand
6.5 Applicazione del brand nell'interfaccia

### Capitolo 7 — Progettazione UX
7.1 Ricerca utenti: personas del professionista e del cliente finale
7.2 Scenari d'uso e user journey
7.3 Architettura dell'informazione
7.4 Flussi principali: prenotazione, loyalty/gamification, win-back, dashboard barbiere
7.5 Principi di usabilità e scelte progettuali
7.6 Il design per due utenti: l'esperienza del barbiere e del suo cliente

### Capitolo 8 — Progettazione UI e prototipazione
8.1 Design system: fondamenta visive e componenti
8.2 Il sistema di branding adattivo: come l'interfaccia cambia per ogni barbiere
8.3 Progettazione delle interfacce principali (lato barbiere)
8.4 Progettazione delle interfacce principali (lato cliente)
8.5 Le interfacce della gamification: streak, badge, livelli, reward
8.6 Prototipo interattivo e walkthrough

### Capitolo 9 — Implementazione tecnica
9.1 Architettura del sistema: PWA, backend, database multi-tenant
9.2 Scelte tecnologiche e stack
9.3 Funzionalità implementate nel prototipo
9.4 Gestione multi-brand: come un'unica piattaforma serve migliaia di barbieri

### Capitolo 10 — Feature innovative e visione futura
10.1 Le feature che nessun competitor offre
10.2 Business Coach AI
10.3 Smart Reward personalizzato
10.4 No-show prediction e deposito intelligente
10.5 Last-minute slot filler geolocalizzato
10.6 After-Visit Story: marketing virale organico
10.7 Scalabilità: dal barbiere al fitness, dal tattoo al veterinario
10.8 Validazione: test, feedback e prossimi passi

### Conclusioni
### Bibliografia e sitografia
### Appendici

---

## Dati di mercato chiave

| Dato | Valore | Fonte |
|------|--------|-------|
| Mercato barbershop US | $5.8 miliardi (2024) | IBISWorld |
| Crescita annuale software barber | +10% CAGR | MarketResearchIntellect |
| Mercato software barber | ~$1.8 miliardi (2023) | MarketResearchIntellect |
| Barbieri in Italia (target) | 137.730 attività | Dati settore |
| Micro-imprenditori individuali | 82.7% | Dati settore |
| Mercato subscription haircut | $5.2 miliardi entro 2025 | Unlimited-haircuts.com |
| Aumento engagement con gamification | +48% | Gallup |
| Mercato gamification globale | $49 miliardi entro 2029 | Industry reports |
| No-show rate periodi di picco | 15-25% | Industry data |
| Riduzione no-show con AI prediction | -10% a -40% | Healthcare case studies |
| Clienti che preferiscono offerte AI-driven | 64% | Zenoti |

---

## Stato attuale del progetto

- [x] Idea e concept definiti
- [x] Struttura tecnica progettata (multi-tenant, white-label, PWA, 3 interfacce)
- [x] Stack tecnologico scelto (React + Supabase)
- [x] Analisi competitor completata (8 competitor, 2 categorie)
- [x] Learnings e opportunities definiti
- [x] Modello di business definito (3 tier)
- [x] Roadmap feature completa (v1, v2, v3)
- [x] Feature innovative esclusive definite (9 feature)
- [x] Personas creati (4: 2 professionisti + 2 clienti)
- [x] Indice tesi aggiornato (10 capitoli)
- [x] Brand Analysis "Your Company" completata
- [ ] Naming definitivo da scegliere
- [ ] Branding e identità visiva
- [ ] User Journey Maps
- [ ] Architettura dell'informazione e flussi
- [ ] Wireframe low-fidelity
- [ ] Design system
- [ ] Progettazione UI/UX (high-fidelity)
- [ ] Prototipo interattivo
- [ ] Scrittura tesi (Cap. 1-4 pronti da scrivere)
- [ ] Testing e validazione

---

## Note e decisioni importanti

- Il prodotto è **verticale sui barbieri**, ma il brand è **generale e premium**
- La tecnologia deve restare **invisibile**: il barbiere e il suo brand sono protagonisti
- **Non è un marketplace**: nessuna competizione tra barbieri, nessuna acquisizione clienti
- **Retention-first**: la gamification e il churn detection sono il core, non feature secondarie
- La PWA permette di avere un'app "installabile" senza passare dagli store
- L'architettura multi-tenant permette di gestire tutti i barbieri con un solo sistema centrale
- **Fresha, Booksy, theCut NON sono competitor diretti** — sono marketplace. Noi siamo un tool brandizzato
- **Barberly è il competitor diretto più vicino** — ma non ha retention
- **Phorest è il benchmark per la retention** — ma costa $99+ e non è per piccoli
- La gamification nel settore barber/beauty è un **blue ocean** — nessuno la fa
- Il prodotto deve funzionare per Luca (22 anni, vuole gamification) E per Roberto (54 anni, vuole solo un SMS)
- **I dati del barbiere sono del barbiere. Sempre. Export gratis.**

---

## Prossimi step

1. **User Journey Maps** — percorso completo di ogni persona con il prodotto
2. **Architettura dell'informazione** — mappa di tutte le schermate e navigazione
3. **Wireframe low-fidelity** — schizzi strutturali
4. **Design system** — regole visive + componenti (post-branding)
5. **UI high-fidelity** — schermate finali
6. **Prototipo interattivo** — Figma cliccabile
7. **Scrittura tesi** — Cap. 1-4 già pronti da scrivere con il materiale raccolto