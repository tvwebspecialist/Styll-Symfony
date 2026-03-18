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

**Target secondario:** Saloni da parrucchieri con piccoli team (2-5 persone)

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

## User Journey Maps

### Journey 1 — Marco Ferretti (Barbiere indipendente)
**Scenario:** Dalla scoperta della piattaforma al primo cliente che prenota

| Fase | Scoperta | Registrazione | Setup | Primo Cliente | Uso Quotidiano |
|------|----------|---------------|-------|---------------|----------------|
| **Emozione** | 👍 Happy | 👀 Neutral | 👎 Unhappy | 👍 Happy | 👍 Happy |
| **Curva** | Alta → | Scende → | Punto più basso → | Risale → | Stabile alta |

**Azioni e pensieri per fase:**

**Scoperta:**
- Vede un post su Instagram di un collega che usa l'app
- Incuriosito dalla possibilità di avere la "sua" app brandizzata
- Confronta mentalmente con WhatsApp e agenda cartacea

**Registrazione:**
- Apre il sito e clicca "Prova gratis"
- Inserisce email, nome del salone, telefono
- Si chiede se sarà complicato da configurare

**Setup:**
- Deve inserire servizi, orari, prezzi, logo
- Si sente sopraffatto dal numero di campi
- Non capisce subito come appare la sua landing page
- Abbandonerebbe se il processo dura più di 10 minuti

**Primo Cliente:**
- Condivide il link della sua app su Instagram Stories
- Un cliente abituale prenota dal telefono
- Vede la notifica in dashboard: è entusiasta

**Uso Quotidiano:**
- Ogni mattina apre la dashboard per vedere gli appuntamenti
- I clienti prenotano in autonomia, meno messaggi WhatsApp
- Si sente professionale e organizzato

**Takeaway:**
- Scoperta: La prima impressione deve urlare "semplicità" e "il TUO brand"
- Registrazione: Registrazione in massimo 3 step, zero complessità
- Setup: Setup guidato con preview live — il punto più critico
- Primo Cliente: Fornire template pronti per condividere su social
- Uso Quotidiano: Dashboard minimal — solo ciò che serve nel giorno

---

### Journey 2 — Sara Bianchi (Titolare salone parrucchiera)
**Scenario:** Da Fresha ad Amity — migrazione e gestione multi-staff

| Fase | Frustrazione | Scoperta | Migrazione | Setup Multi-Staff | Gestione Reale |
|------|-------------|----------|------------|-------------------|----------------|
| **Emozione** | 👎 Unhappy | 👀 Neutral | 👀 Neutral | 👍 Happy | 👍 Happy |
| **Curva** | Punto più basso → | Risale → | Stabile → | Sale → | Stabile alta |

**Azioni e pensieri per fase:**

**Frustrazione:**
- Fresha prende commissioni su ogni prenotazione
- I suoi barbieri sono visibili accanto ai concorrenti
- Perde il controllo del rapporto col cliente
- Si sente intrappolata in un marketplace

**Scoperta:**
- Cerca su Google "gestionale barbieri senza commissioni"
- Trova Amity: nessuna commissione, white-label
- Legge la promessa "il TUO brand, non il nostro"
- È scettica ma incuriosita

**Migrazione:**
- Deve spostare lista clienti e storico appuntamenti
- Teme di perdere dati durante il passaggio
- Vorrebbe un import CSV o automatico da Fresha
- Ha paura che i clienti si confondano col cambio

**Setup Multi-Staff:**
- Configura i 3 barbieri con orari e servizi diversi
- Assegna permessi: ogni barbiere vede solo i suoi dati
- Personalizza colori e logo per le sue 2 sedi
- Vede la preview delle landing page: soddisfatta

**Gestione Reale:**
- Monitora tutti gli appuntamenti da un'unica dashboard
- Confronta performance dei barbieri e delle sedi
- I clienti prenotano senza commissioni
- Il brand è finalmente suo, non di Fresha

**Takeaway:**
- Frustrazione: Marketing → enfatizzare "zero commissioni" e "il TUO brand"
- Scoperta: Landing page chiara con confronto diretto vs marketplace
- Migrazione: Offrire import dati facile — è il momento di massima ansia
- Setup Multi-Staff: Setup multi-staff deve essere intuitivo con permessi chiari
- Gestione Reale: Dashboard con vista aggregata multi-sede e confronto KPI

---

### Journey 3 — Luca Esposito (Cliente giovane)
**Scenario:** Dal link su Instagram alla prima prenotazione e fidelizzazione

| Fase | Link Social | Landing Page | Installa PWA | Prenota | Taglio | Fidelizzazione |
|------|------------|-------------|-------------|---------|--------|----------------|
| **Emozione** | 👍 Happy | 👍 Happy | 👀 Neutral | 👍 Happy | 👍 Happy | 👍 Happy |
| **Curva** | Alta → | Stabile → | Scende leggermente → | Risale → | Stabile alta → | Stabile alta |

**Azioni e pensieri per fase:**

**Link Social:**
- Vede una Story del barbiere su Instagram con "Prenota qui"
- Clicca il link in bio per curiosità
- Si aspetta qualcosa di veloce e moderno

**Landing Page:**
- Arriva sulla landing page del barbiere
- Vede il brand del barbiere, non una piattaforma esterna
- Trova subito servizi e prezzi
- Pensa: "sembra l'app del mio barbiere"

**Installa PWA:**
- Il banner suggerisce "Aggiungi alla Home"
- Non sa bene cos'è una PWA
- La installa ma si chiede se occupa spazio
- Vede l'icona col logo del barbiere: ok, figo

**Prenota:**
- Sceglie "Taglio + Barba" dal menu servizi
- Seleziona giorno e ora dallo slot disponibile
- Conferma in 3 tap senza creare account
- Riceve conferma istantanea su schermo

**Taglio:**
- Riceve reminder push il giorno prima
- Va dal barbiere, tutto è già pronto
- Nessuna attesa, il barbiere sa già cosa fare
- Esperienza fluida, si sente VIP

**Fidelizzazione:**
- Dopo il taglio riceve "Prenota il prossimo?"
- Vede la streak: "3 tagli consecutivi 🔥"
- La prossima volta apre direttamente l'app dalla Home
- Non torna più a chiamare o scrivere su WhatsApp

**Takeaway:**
- Link Social: Il link social è il canale #1 — deve caricare in <2 secondi
- Landing Page: La landing deve sembrare l'app del barbiere, non un SaaS
- Installa PWA: Spiegare la PWA in modo semplice: "Aggiungi, è gratis"
- Prenota: Prenotazione in max 3 tap, zero registrazione obbligatoria
- Taglio: Push reminder non invasivo: 1 solo, il giorno prima
- Fidelizzazione: Gamification leggera: streak e rebooking automatico

---

### Journey 4 — Roberto Marini (Cliente maturo)
**Scenario:** Dall'SMS del barbiere alla prenotazione — esperienza passiva e rassicurante

| Fase | SMS dal Barbiere | Apre il Link | Prenota | Visita | Continuità |
|------|-----------------|-------------|---------|--------|------------|
| **Emozione** | 👀 Neutral | 👎 Unhappy | 👀 Neutral | 👍 Happy | 👍 Happy |
| **Curva** | Media → | Scende → | Risale → | Alta → | Stabile alta |

**Azioni e pensieri per fase:**

**SMS dal Barbiere:**
- Riceve un SMS: "Ciao Roberto, prenota il prossimo taglio qui"
- Non sa cosa sia, ma si fida del barbiere
- Pensa: "ma non posso chiamare come sempre?"
- Apre il link per curiosità più che per convinzione

**Apre il Link:**
- Si apre una pagina nel browser del telefono
- I testi sono piccoli, non capisce subito cosa fare
- Cerca un numero di telefono da chiamare
- Non vuole "registrarsi" o "scaricare nulla"

**Prenota:**
- Vede i servizi con prezzi chiari e bottone grande "Prenota"
- Seleziona il solito taglio classico
- Sceglie la data dal calendario visuale
- Conferma senza inserire email — solo nome e telefono

**Visita:**
- Riceve un SMS di promemoria il giorno prima
- Arriva al salone, il barbiere sa già l'orario
- Non deve aspettare, si sente rispettato
- Paga in contanti come sempre — nessun obbligo digitale

**Continuità:**
- Dopo 3 settimane riceve un altro SMS gentile
- Questa volta prenota subito: ha capito il meccanismo
- Inizia a sentirlo naturale, non tecnologico
- Lo racconta agli amici: "il mio barbiere ha l'app"

**Takeaway:**
- SMS dal Barbiere: L'SMS è il canale giusto — deve essere personale, non spam
- Apre il Link: Testi grandi, contrasto alto, zero gergo tech. Mostrare anche tel.
- Prenota: Zero registrazione: solo nome + telefono. Bottoni enormi
- Visita: Reminder via SMS, non push. Pagamento cash deve restare opzione
- Continuità: Re-engagement automatico e gentile — mai aggressivo

---

## 🔍 Open Questions — Decisioni Progettuali

> Tutti i 10 temi emersi dalla rilettura del progetto sono stati analizzati in profondità con ricerca web, benchmark competitor, analisi costi e confronto con SaaS di riferimento. Per ciascuno è stata presa una **decisione progettuale concreta**.

---

### 1. 🧠 Setup intelligente con AI — ✅ DECISIONE PRESA

**Problema:** Il setup è il punto più critico delle journey (Marco abbandona se dura >10 minuti).

**Benchmark competitor:**

| SaaS | Setup Time | Approccio |
|------|-----------|-----------|
| **Mangomint** | ~30 giorni con onboarding manager | Hands-on con specialista, call 30 min, import in 24h |
| **GlossGenius** | ~10 min self-service | Wizard step-by-step, mobile-first |
| **Barberly** | ~15 min | Form classico multi-step |
| **Phorest** | ~30 giorni con concierge | Migrazione assistita completa |

**Decisione per v1 — Setup guidato smart (senza AI vera):**
- **Wizard in 5 step** conversazionali (1 schermata per step):
  1. Nome attività + telefono + città
  2. Tipo attività (barbiere/parrucchiere/altro) → pre-compila servizi template
  3. Orari (template: "Lun-Sab 9-19" modificabile)
  4. Logo + colori (upload o generazione palette automatica da logo)
  5. Preview live della landing page → "Ecco la TUA app!"
- **Template di servizi precompilati** per barbieri (Taglio €15, Barba €10, Taglio+Barba €20...) modificabili
- **Import da Google Business Profile** via OAuth 2.0: nome, indirizzo, orari, telefono, foto → auto-fill
- **Obiettivo: < 8 minuti** per barbiere singolo
- **Fallback:** il barbiere può sempre saltare e completare dopo

**Decisione per v2 — AI vera:**
- Campo testo libero: "Descrivi la tua attività" → NLP estrae servizi, orari, prezzi
- Implementabile con OpenAI API (GPT-4o): costo ~$0.01-0.03 per setup
- Structured output JSON da prompt → popola form

**Google Business Profile API:**
- Gratuita (con limiti di quota)
- OAuth 2.0 → `locations.get` → nome, indirizzo, orari, telefono, foto, categorie
- Perfetta per auto-fill al signup

**SaaS di riferimento:** Typeform (1 domanda alla volta, conversazionale), Duolingo (detection automatica lingua/location, percorso adattivo)

---

### 2. 📱 Template social per promuovere l'app — ✅ DECISIONE PRESA

**Problema:** Il barbiere ha l'app, ma non sa come comunicarla ai clienti.

**Benchmark competitor:**

| SaaS | Approccio |
|------|-----------|
| **GlossGenius** | Marketing kit integrato, share link diretto |
| **Barberly** | Nessun tool marketing integrato |
| **Canva API** | Editor embeddabile, brand kit |
| **PromoRepublic** | Template pronti per categorie business ($49+/mese standalone) |

**Decisione per v1 — 5 template statici auto-brandizzati:**
1. *"Prenota qui"* — con QR code alla PWA
2. *"La mia nuova app"* — per lancio
3. *"Promo inaugurale"* — sconto primo taglio
4. *"Post-taglio"* — "Come è andata? Lascia una recensione"
5. *"Reminder stagionale"* — "È ora di un taglio!"

**Specifiche tecniche:**
- Generati server-side con **Sharp/Canvas API** (Node.js) usando colori + logo + nome del barbiere
- Export come PNG per Instagram Stories (1080x1920) e post (1080x1080)
- Deep link alla PWA integrato
- Costo: zero (librerie open source)
- Nella dashboard sotto "Promuovi la tua app"

**Decisione per v2 — Editor leggero:**
- Integrazione Canva API (Button "Edit in Canva") o editor semplice in-app

---

### 3. 👥 Gestione dipendenti e multi-staff — ✅ DECISIONE PRESA

**Problema:** Sara ha 3 dipendenti e 2 sedi.

**Benchmark competitor:**

| SaaS | Ruoli disponibili |
|------|------------------|
| **Mangomint** | Owner, Manager, Staff, Front Desk — permessi granulari |
| **Phorest** | Owner, Manager, Stylist, Receptionist — complesso ma completo |
| **Fresha** | Owner, Team Member — semplice, pochi ruoli |
| **GlossGenius** | Solo (1 utente) → Team plan recente |

**Decisione — 4 ruoli per Amity:**

| Ruolo | Vede | Può fare |
|-------|------|----------|
| **Titolare (Owner)** | Tutto: tutti i calendari, tutti i clienti, tutti i KPI | Tutto: gestisce staff, servizi, loyalty, branding, billing |
| **Manager** | Tutto tranne billing | Gestisce staff e appuntamenti, non il billing |
| **Barbiere (Staff)** | Solo il suo calendario e i suoi clienti | Conferma appuntamenti, aggiunge note, assegna punti loyalty |
| **Receptionist** | Tutti i calendari (sola lettura) | Prenota per tutti, gestisce walk-in, check-in clienti |

**Calendario multi-staff:**
- Vista titolare: calendari **affiancati** (side-by-side) — come Mangomint
- Vista staff: solo il proprio calendario
- Il cliente nella PWA sceglie con chi prenotare (o "primo disponibile")

**Setup staff:**
- Il titolare invita via email/link
- Lo staff accetta e crea password → vede solo il suo scope
- Il titolare pre-configura servizi e orari per ogni staff member

**Pricing staff:**
- **Tier 1 (Starter):** solo 1 utente (Marco)
- **Tier 2 (Growth):** fino a 5 staff inclusi
- **Tier 3 (Pro):** staff illimitato + multi-location

**CRM condiviso:** Il CRM clienti è condiviso ma filtrato per staff assegnato. La loyalty è gestita dal Titolare, lo staff può solo assegnare punti. Permessi pre-configurati, non customizzabili in v1 (semplifica).

---

### 4. 🔄 Migrazione dai competitor — ✅ DECISIONE PRESA

**Problema:** Sara viene da Fresha e ha paura di perdere i dati.

**Benchmark competitor:**

| SaaS | Approccio migrazione | Costo |
|------|---------------------|-------|
| **Phorest** | Concierge dedicato, team specializzato, import completo | Incluso (contratto annuale) |
| **Mangomint** | Onboarding manager, import dati in 24h, call 30 min | Incluso |
| **GlossGenius** | Self-service CSV import | Gratuito |
| **Barberly** | Import manuale, supporto email | Basic |

**Cosa si può importare da Fresha/Booksy:**

| Campo | Fresha | Booksy | WhatsApp/Cartaceo |
|-------|--------|--------|-------------------|
| Nome + cognome | ✅ | ✅ | Manuale |
| Telefono | ✅ | ✅ | Manuale |
| Email | ✅ | ✅ | Raro |
| Note cliente | ✅ | ⚠️ | No |
| Storico appuntamenti | ✅ | ⚠️ | No |
| Servizi e prezzi | ✅ | ✅ | Manuale |

**Decisione — "Migrazione concierge — ti aiutiamo noi, gratis, in 24h":**
1. Il barbiere carica il CSV nella dashboard (drag & drop)
2. Il sistema mappa automaticamente le colonne (nome, telefono, email...)
3. Preview dei dati → conferma → import
4. **Se il barbiere non riesce:** "Mandaci il file, ci pensiamo noi in 24h" (gratis)
5. Template SMS/WhatsApp pronti: *"Ciao [Nome], da oggi puoi prenotare qui: [link PWA]"*
6. Import punti loyalty dal vecchio sistema (campo opzionale nel CSV)

**v2 — Import intelligente:** AI che riconosce formato CSV non standard e mappa automaticamente.

**Selling point differenziante:** La migrazione concierge gratuita è uno dei principali selling point vs competitor.

---

### 5. 🏷️ Comunicazione brand-first — ✅ DECISIONE PRESA

**Problema:** Il barbiere deve capire immediatamente che questa non è un'altra piattaforma che gli ruba il brand.

**Benchmark competitor:**

| SaaS | Approccio white-label |
|------|----------------------|
| **Shopify** | Theme personalizzabili, dominio custom, zero menzione Shopify al cliente |
| **Auth0** | Universal Login customizzabile per tenant |
| **Barberly** | App brandizzata su App Store per ogni barbiere |
| **GlossGenius** | Branding parziale, il nome GlossGenius è visibile |

**Decisione — Architettura branding per tenant (React + Supabase):**

```javascript
// Ogni tenant ha un config in Supabase
{
  tenant_id: "uuid",
  business_name: "Marco's Barber",
  primary_color: "#1A1A2E",
  secondary_color: "#E94560",
  logo_url: "https://cdn.amity.app/tenants/marco/logo.png",
  favicon_url: "...",
  custom_domain: "prenotamarco.it", // v2
  subdomain: "marco.amity.app"     // v1
}
```

**v1 — Subdomain + CSS Variables:**
- Ogni barbiere ha: `nomeattività.amity.app`
- CSS Variables caricate da config tenant → colori, font, logo cambiano runtime
- Il cliente vede SOLO il brand del barbiere, MAI "Amity" (tranne un piccolo "Powered by" nel footer)

**v2 — Custom domain:**
- Il barbiere usa il suo dominio: `prenotamarco.it`
- SSL automatico via Let's Encrypt
- DNS CNAME + wildcard certificate

**Landing page B2B (vendita):**
- Mockup interattivo: il barbiere inserisce il nome del suo negozio → vede in real-time come apparirebbe la SUA app
- Confronto visivo: "Con Fresha vedono QUESTO → Con NOI vedono QUESTO"

**Privacy e GDPR:**
- Le note del barbiere NON sono visibili al cliente nella PWA
- Il cliente vede: storico prenotazioni, punti loyalty, prossima visita
- Il cliente può aggiornare: telefono, email, preferenze orario
- Consenso esplicito al primo accesso, opt-out sempre disponibile
- Export dati cliente: sempre gratis

---

### 6. 📊 Design della Dashboard — ✅ DECISIONE PRESA

**Problema:** La dashboard deve funzionare sia per Marco (1 sedia) sia per Sara (3 dipendenti, 2 sedi).

**Benchmark competitor:**

| SaaS | Stile Dashboard |
|------|----------------|
| **Mangomint** | Pulita, modulare, automazioni intelligenti (4.9/5 Capterra) |
| **GlossGenius** | Bellissima, mobile-first, minimalista |
| **Phorest** | Complessa, potente, troppe info per piccoli |
| **Fresha** | Funzionale ma generica |

**Decisione — Principio "Progressive complexity":**

**Dashboard Marco (barbiere singolo) — vede il 30%:**
- Saluto personalizzato ("Buongiorno Marco 👋")
- Appuntamenti di OGGI (lista scrollabile con orario + servizio + cliente)
- Alert: clienti a rischio churn ("Marco F. non viene da 42 giorni" + bottone win-back)
- KPI settimanali: revenue, clienti serviti, retention %
- Buchi nel calendario di oggi ("14:00-15:00 libero" + bottone "Notifica clienti vicini")

**Dashboard Sara (titolare multi-staff) — vede il 70%:**
- Saluto + switcher sede ("Sede: Roma Centro ▼")
- Vista team giornaliera: calendari affiancati (Anna | Giulia | Paolo)
- KPI team settimanali per singolo staff (revenue, retention)
- Churn alert aggregato ("5 clienti a rischio")

**Principi design:**
- Stessa codebase, complessità adattiva basata su ruolo e tier
- Mobile-first: la dashboard principale deve funzionare perfettamente su smartphone
- Benchmark design: Mangomint (pulizia) + GlossGenius (bellezza)

---

### 7. 👤 Profilo cliente avanzato (CRM) — ✅ DECISIONE PRESA

**Problema:** Il barbiere non ricorda cosa ha fatto l'ultima volta, le preferenze, i prodotti.

**Benchmark competitor:** Vagaro, Boulevard, Zenoti, Phorest — tutti offrono profili clienti avanzati ma nessuno con semaforo churn o VIP score.

**Decisione — Profilo a 2 livelli:**

| Sezione | Campi | Visibile al cliente (PWA)? |
|---------|-------|--------------------------|
| **Dati base** | Nome, telefono, email, foto | ✅ Sì (editabili) |
| **Storico** | Tutti i servizi + date + barbiere + importo | ✅ Sì (read-only) |
| **Preferenze** | Taglio preferito, prodotti, allergie | ✅ Sì (editabili dal cliente) |
| **Note barbiere** | "Vuole il 3 ai lati", "parla del figlio" | ❌ No (private) |
| **Loyalty** | Punti, livello, streak, badge | ✅ Sì |
| **Rischio churn** | Giorni dall'ultima visita vs media, semaforo 🟢🟡🔴 | ❌ Solo barbiere |
| **VIP Score** | Punteggio composito (frequenza, spesa, puntualità, referral, review) | ❌ Solo barbiere |
| **Comunicazione** | Canale preferito (SMS/WhatsApp/Push), consensi GDPR | ✅ Sì (modificabile) |

**Feature "Suggerisci servizio" (v1):**
- "L'ultima volta Luca ha fatto Taglio + Barba (28 giorni fa). Suggerire lo stesso?"
- Un tap per il barbiere → pre-compila il prossimo appuntamento

**Feature "Foto prima/dopo" (v2):**
- Il barbiere scatta foto del taglio → salvate nel profilo
- Utile come reference per la prossima visita

**Principi:** Le note del barbiere sono SEMPRE private (GDPR). Semaforo churn visibile nella lista clienti. VIP Score calcolato automaticamente, visibile solo al barbiere.

---

### 8. 🎮 Flusso completo gamification e loyalty — ✅ DECISIONE PRESA

**Problema:** La gamification è il nostro blue ocean, ma serviva progettare il flusso completo.

**Benchmark:**

| SaaS/App | Meccanica | Efficacia |
|----------|-----------|-----------|
| **Duolingo** | Streak giornaliera, XP, livelli, leaderboard, "streak freeze" | +48% engagement (DAU) |
| **Starbucks Rewards** | Stelle per acquisto → tier Bronze/Gold, reward personalizzati | 28M membri attivi, +26% revenue |
| **Nike Run Club** | Badge per traguardi, sfide settimanali, community | Alta retention |
| **Phorest TreatCard** | Punti per €1 speso → reward al barbiere | Unico nel settore, ma zero gamification |
| **Passtastic** | Card digitale in Apple/Google Wallet, QR scan | No app required |

**Decisione — 5 meccaniche di gamification:**

| Meccanica | Come funziona | Esempio |
|-----------|--------------|---------|
| **Punti** | X punti per €1 speso (configurabile dal barbiere) | "Hai guadagnato 200 punti!" |
| **Streak** | Visite consecutive entro X giorni (es. ogni 30-45 gg) | "5 visite consecutive 🔥" |
| **Badge** | Traguardi automatici | "Primo taglio", "10ª visita", "1 anno di fedeltà" |
| **Livelli/Tier** | Soglie punti → benefici crescenti | Bronze → Silver → Gold → Platinum |
| **Sfide** | Temporanee, create dal barbiere | "3 visite in 2 mesi = prodotto gratis" |

**Schema database (Supabase):**
```sql
-- Loyalty config per tenant
CREATE TABLE loyalty_config (
  tenant_id UUID REFERENCES tenants(id),
  points_per_euro INTEGER DEFAULT 10,
  streak_threshold_days INTEGER DEFAULT 45,
  tiers JSONB DEFAULT '[
    {"name": "Bronze", "min_points": 0, "benefits": []},
    {"name": "Silver", "min_points": 500, "benefits": ["5% sconto"]},
    {"name": "Gold", "min_points": 1500, "benefits": ["10% sconto", "prodotto omaggio"]},
    {"name": "Platinum", "min_points": 5000, "benefits": ["taglio gratis trimestrale"]}
  ]'
);

-- Loyalty stato per cliente
CREATE TABLE client_loyalty (
  client_id UUID REFERENCES clients(id),
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  tier VARCHAR DEFAULT 'Bronze',
  badges JSONB DEFAULT '[]',
  last_visit_date DATE
);
```

**Flusso per il CLIENTE tech-savvy (Luca, 22 anni — visibile e divertente):**
1. Prenota e va dal barbiere
2. Il barbiere conferma la visita nella dashboard
3. Punti assegnati automaticamente + streak aggiornata
4. Notifica PWA: "🔥 Streak di 5! Hai guadagnato 200 punti. Ancora 100 per Silver!"
5. Nella PWA: barra progresso, badge collection, posizione nel tier
6. Riscatto: seleziona reward nella PWA → mostra schermata al barbiere → barbiere conferma

**Flusso per il CLIENTE non-tech (Roberto, 54 anni — silenzioso e in background):**
1. Roberto viene, il barbiere conferma la visita dal CRM
2. Punti assegnati automaticamente (Roberto non lo sa)
3. Il barbiere vede nel CRM: "Roberto ha 450 punti. Ancora 50 per taglio gratis"
4. Il barbiere glielo dice a voce: "Roberto, il prossimo taglio è gratis!"
5. Opzionale: SMS post-visita: "Grazie Roberto! Hai 450 punti 💈"

**Flusso per il BARBIERE:**
1. Nel setup, sceglie un template loyalty (es. "1 punto per €1, taglio gratis a 500 punti")
2. Può personalizzare reward e soglie
3. Vede classifica clienti più fedeli
4. Può assegnare punti manualmente (walk-in senza app)

**Roadmap gamification:**
- **v1 (Tier 1):** Punti classici — configurazione semplice, 1 reward
- **v2 (Tier 2):** Gamification completa — streak, badge, livelli, sfide, classifica

---

### 9. 📨 Prenotazioni e reminder via WhatsApp/SMS — ✅ DECISIONE PRESA

**Problema:** Roberto usa solo SMS, Luca preferisce WhatsApp. Servono entrambi.

**Prezzi reali 2025 (Italia):**

**WhatsApp Business API (prezzi Meta):**

| Tipo messaggio | Costo per messaggio |
|---------------|-------------------|
| Marketing (template) | €0.0572 |
| Utility (reminder, conferma) | €0.0248 |
| Autenticazione | €0.0248-0.0313 |
| User-initiated (entro 24h) | **GRATIS** |

**SMS API (Italia):**

| Provider | Costo per SMS |
|----------|--------------|
| **Twilio** | ~€0.055 |
| **MessageBird** | ~€0.045 |
| **Infobip** | ~€0.04-0.05 (volume) |
| **Vonage** | ~€0.062 |

**Provider consigliati per Amity:** MessageBird o Infobip (API unificata WhatsApp + SMS, prezzi competitivi Italia, pay-as-you-go).

**Calcolo costi per barbiere singolo (~120 clienti/mese):**
- Reminder 24h prima: 120 × €0.0248 = €2.98/mese
- Win-back (10 clienti/mese): 10 × €0.0572 = €0.57/mese
- Review request: 120 × €0.0248 = €2.98/mese
- **Totale: ~€6.50/mese** → ampiamente sostenibile

**Decisione — Strategia canali:**

| Canale | Per chi | Quando |
|--------|---------|--------|
| **Push notification (PWA)** | Luca (ha la PWA) | Reminder 24h, conferma booking |
| **WhatsApp** | Luca + clienti con WhatsApp | Reminder, win-back, promozioni |
| **SMS** | Roberto (no WhatsApp business) | Reminder, win-back |
| **Email** | Tutti (fallback) | Conferma booking, receipt |

**Cascata intelligente (v2):** Push → WhatsApp → SMS → Email

**Pricing messaggi:**
- **Tier 1:** 200 messaggi/mese inclusi (~€5 di costo reale)
- **Tier 2:** 500 messaggi/mese inclusi
- **Tier 3:** illimitati
- Oltre la soglia: pay-per-use €0.05/messaggio

**Regole:**
- Il barbiere approva i win-back prima dell'invio (mai spam automatico in v1)
- GDPR: opt-in esplicito + opt-out in ogni messaggio
- Frequenza win-back: max 1 al mese per cliente

---

### 10. 🏆 Punti loyalty lato CRM (per clienti senza app) — ✅ DECISIONE PRESA

**Problema:** Non tutti i clienti installeranno la PWA (es. Roberto). Il barbiere deve gestire i punti dal CRM.

**Benchmark competitor:** Vagaro, Boulevard, Zenoti, Phorest — tutti offrono profili clienti avanzati ma nessuno con semaforo churn o VIP score.

**Decisione — Il CRM è SEMPRE la fonte di verità unica per la loyalty:**
- Ogni cliente ha un profilo nel CRM con punti, livello, streak — anche se non ha la PWA
- Il barbiere assegna punti manualmente dopo una visita walk-in (un tap)
- Il barbiere riscatta reward dal CRM per conto del cliente
- Log completo di tutte le operazioni per trasparenza

**3 modi per comunicare i punti al cliente senza app:**
1. **A voce** — il barbiere legge dal CRM: "Roberto, hai 450 punti!"
2. **SMS automatico post-visita** — "Grazie Roberto! Hai ora 450 punti. Ancora 50 per un taglio gratis 💈"
3. **Apple/Google Wallet** (v2) — card digitale senza app, aggiornata automaticamente

**Sincronizzazione:** Se Roberto un giorno installa la PWA, i punti sono già lì. Il profilo CRM è unico: con o senza PWA, stessi dati, stessi punti. Zero perdita dati nel passaggio.

---

## Riepilogo decisioni — Tabella sintetica

| # | Tema | Decisione chiave | Fase |
|---|------|-----------------|------|
| 1 | **Setup AI** | Wizard 5 step + template servizi + import GBP. AI in v2. Target: < 8 min | v1 + v2 |
| 2 | **Template social** | 5 template auto-generati col brand. Scaricabili in un tap. Editor Canva in v2 | v1 + v2 |
| 3 | **Multi-staff** | 4 ruoli (Titolare, Manager, Staff, Receptionist). Invito email. Staff incluso da Tier 2 | v1 |
| 4 | **Migrazione** | "Migrazione concierge gratis in 24h". CSV import + mapping guidato + template comunicazione | v1 |
| 5 | **Brand-first** | Subdomain v1, custom domain v2. Zero menzione Amity nella PWA. GDPR: note private | v1 + v2 |
| 6 | **Dashboard** | Progressive complexity. Marco: 30% feature. Sara: 70%. Mobile-first. Stile Mangomint | v1 |
| 7 | **CRM profilo** | 2 livelli (barbiere vede tutto, cliente vede i suoi dati). Note private. Semaforo churn | v1 |
| 8 | **Gamification** | v1: punti classici. v2: streak+badge+tier+sfide. Silenzioso per Roberto, visibile per Luca | v1 + v2 |
| 9 | **WhatsApp/SMS** | MessageBird/Infobip. 200 msg inclusi Tier 1. Win-back approvati dal barbiere. GDPR opt-in | v1 |
| 10 | **Loyalty senza app** | CRM = fonte unica. Assegna/riscatta dal CRM. SMS post-visita. Wallet card in v2 | v1 + v2 |

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
- [x] User Journey Maps completate (4 journey per le 4 personas)
- [x] Open Questions & spunti di approfondimento documentati (10 temi)
- [x] Open Questions risolte — decisioni progettuali concrete per tutti i 10 temi
- [ ] Naming definitivo da scegliere
- [ ] Branding e identità visiva
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
- **Il CRM è la fonte di verità unica** — la loyalty funziona con o senza PWA installata
- **Setup < 8 minuti** — wizard 5 step + import GBP + template servizi
- **Migrazione concierge gratuita** — selling point differenziante
- **4 ruoli staff** — Titolare, Manager, Staff, Receptionist
- **Messaging: 200 msg/mese inclusi Tier 1** — WhatsApp + SMS via MessageBird/Infobip
- **Gamification adattiva** — visibile per Luca, invisibile per Roberto

---



## 🎮 Gamification & Loyalty 
Sistema a 4 Layer
Il sistema di gamification è composto da 4 layer indipendenti, attivabili in base al template scelto dal barbiere:
Strato
Cosa fa
Sempre attivo?
Livello 1: Punti → Ricompensa
Il cliente accumula punti e riscatta premi
✅ Sempre (è la base)
Livello 2: Livello → Status + Benefici
Livelli annuali con benefici concreti ON/OFF
Solo nel modello VIP Club
Livello 3: Serie (Streak)
Visite consecutive con bonus punti
Solo in Template Streak Master e VIP Club
Livello 4: Badge
Traguardi una tantum, puramente celebrativi
Solo nel modello VIP Club











I 3 Template di Loyalty
Il barbiere sceglie un template al momento del setup. Ogni template attiva layer diversi:
Modello
Formula punti
Strati attivi
Per chi è
🏷️ Classico
Punti fissi per visita (es. 100)
Livello 1
Marco — vuole semplicità, zero interferenze
🔥 Streak Master
X punti per €1 speso (es. 10 pt/€1)
Livello 1 + Livello 3
Chi vuole premiare chi spende di più + streak
🏆 Club VIP
Punti per servizio (personalizzabili) OPPURE formula degli altri
Strato 1 + 2 + 3 + 4
Sara — vuole il massimo controllo e i tier

Roadmap:
v1 = 🏷️ Classico
v2 = 🏷️ Classico + 🔥 Streak Master + 🏆 VIP Club

Soglie Reward — Calibrate per il settore barbiere
Principio economico: il barbiere "investe" nella ricompensa. Deve guadagnarci più di quello che regala.
Dati di riferimento:
Visita media: ogni 28-35 giorni
Spesa media per visita: €20-30
Visite annuali per cliente fedele: 10-13
Costo prodotto per il barbiere: €3-8 (ingrosso)
Costo taglio "regalato": €0 reale (tempo) ma €15-25 di mancato incasso
Formula di esempio: 10 punti per €1 speso → visita media €25 = 250 punti/visita
Soglia
Punti
Visite equivalenti
Tempo (~1 visita/mese)
Tipo di ricompensa
Costo barbiere
🎁 Premio 1
2.000
~8 visite
~8 mesi
Prodotto styling omaggio
€3-8
🎁 Premio 2
3.750
~15 visite
~15 mesi
Servizio extra gratis (barba, sopracciglia)
€5-10
🎁 Premio 3
5.000
~20 visite
~20 mesi
Taglio completo gratis
€15-25
🎁 Premio 4
7.500
~30 visite
~30 mesi
Trattamento premium completo
€25-40

Queste sono soglie DEFAULT. Il barbiere può modificarle.
Micro-progressi (Goal Gradient Effect): tra una soglia e l'altra, il cliente vede traguardi motivazionali senza ricompensa (es. "Metà strada! 💪", "Quasi al traguardo..."). Non costano nulla al barbiere ma mantengono l'impegno.

Numero Premi: 4 default + max 2 custom (= max 6 totali)
4 ricompense pre-compilate con soglie e nomi default → modificabili dal barbiere.
2 slot extra opzionali per ricompense personalizzate (es. "Birra gratis a 1.000 punti").
Marco attiva la fedeltà e ha già 4 ricompense pronte senza fare niente.
Sara personalizza tutto e aggiunge 1-2 extra.
Regola: meno ricompense = più impatto. Ogni traguardo deve sentirsi speciale.


I 4 Tier — Status + Benefici Concreti
Concetto: il tier è status visivo (bordo + badge sulla foto profilo nella PWA) + benefici reali attivabili/disattivabili dal barbiere.
Livello
Punti annuali
Elemento visivo
Benefici (ON/OFF dal barbiere)
🥉 Livello 1 (base)
0 - 2.499
Profilo standard
Nessun beneficio extra — accumula punti normalmente
🥈 Livello 2
2.500 - 4.999
Bordo argento + stemma 🥈
☐ Prenotazione prioritaria (slot riservato)

☐ +10% punti bonus su ogni visita

☐ Accesso anticipato a nuovi servizi
🥇 Livello 3
5.000 - 9.999
Bordo oro + stemma 🥇
☐ Tutto il Tier 2+

☐ Sconto permanente (default 5%, personalizzabile)

☐ Servizio upgrade gratis 1x/anno

☐ Compleanno ricompensa automatico
💎 Livello 4
10.000+
Bordo diamante + stemma 💎 + animazione
☐ Tutto il Tier 3+

☐ Sconto permanente (default 10%, personalizzabile)

☐ Prenotazione prioritaria sempre

☐ Invito eventi esclusivi

☐ Taglio gratuito il giorno del compleanno

Raggiungibilità (con spesa media €25/visita):
Livello
Visite/anno necessarie
Frequenza
% clienti che ci arriveranno
🥈 Livello 2
~10
~1 al mese
Maggior parte dei clienti fedeli
🥇 Livello 3
~20
~2 al mese
Clienti molto fedeli
💎 Livello 4
~40
~1 a settimana
1-2% dei clienti (aspirazionale)

Ogni beneficio è ON/OFF. Il barbiere può disattivare singoli benefici o personalizzare la percentuale di sconto (3%, 5%, 10% — decide lui). Lo sconto non è esagerato nemmeno al 10% per il Tier 4: un cliente Diamante ha speso €1.000+ nell'anno, il 10% di sconto è un investimento sulla fidelizzazione.
Nomi dei tier: per ora usiamo Tier 1/2/3/4. I nomi definitivi (es. "Apprendista → Barbiere → Maestro → Leggenda") verranno scelti nella fase di branding.

Livello di ripristino: Reset Annuale + 2 Mesi di Grazia
Decisione confermata: reset annuale con periodo di grazia di 2 mesi.
Come funziona:
A fine anno i punti tier si resettano a 0.
Il tier raggiunto resta attivo per 2 mesi (periodo di grazia).
In quei 2 mesi, se il cliente ricomincia ad accumulare punti, mantiene il tier.
Se dopo 2 mesi non ha abbastanza punti per quel tier, scende al tier corretto (non graduale — va al tier che i suoi punti attuali giustificano).
Esempio:
Mese
Punti cumulativi anno
Livello attivo
Nota
Gen-Dic Anno 1
5.500
🥇 Oro
Raggiunto Oro
1 Gen Anno 2
0 (reimposta)
🥇 Oro
Periodo di grazia (2 mesi)
Febbraio Anno 2
450
🥇 Oro
Ancora in grazia
1 Marzo Anno 2
900
🥉 Bronzo
Grazia scaduta → scende al tier corretto
Giu Anno 2
2.800
🥈 Argento
Risale appena raggiunge la soglia

Perché questa scelta:
Il Diamante resta esclusivo — devi riguadagnartelo ogni anno.
Non c'è inflazione ("dopo 5 anni tutti sono Gold").
I 2 mesi di grazia evitano la frustrazione del reset brutale.
Stesso modello di Sephora Beauty Insider — validato dal mercato.

Punti Iniziali per Clienti Storici
Problema: il primo anno il barbiere attiva Amity e tutti i clienti storici partono da Bronze. Non è giusto.
Soluzione: il barbiere può assegnare punti iniziali ai clienti storici dal CRM.
Come funziona:
Il sistema suggerisce automaticamente i punti in base allo storico importato (es. "Luca ha 36 visite nello storico → suggerito 3.600 punti").
Il barbiere può accettare il suggerimento o personalizzare.
Questo vale solo al momento dell'attivazione iniziale.





Come si guadagnano i punti — in base al template
Modello
Formula
Come funziona
Il barbiere deve fare qualcosa?
🏷️ Classico
Punti fissi per visita (es. 100)
Il cliente viene → 100 punti. Bene.
No, conferma automatica appuntamento
🔥 Streak Master
X punti per €1 speso (es. 10)
Taglio+Barba €35 → 350 punti. Chi spende di più prende di più.
No, il sistema conosce già i prezzi dei servizi
🏆 Club VIP
Punti per servizio (personalizzabili)
"Taglio = 80pt, Barba = 50pt, Colore = 120pt"
Sì, configura i punti per servizio (oppure usa la formula degli altri template)

Nota chiave: nel template Streak Master e VIP Club, il sistema calcola automaticamente i punti perché ha già i servizi con i prezzi nel gestionale. Quando il barbiere conferma un appuntamento, i punti si assegnano da soli. Zero lavoro extra. Per i walk-in senza prenotazione o clienti senza app (es. Roberto), il barbiere assegna punti manualmente dal CRM con un tap.










Riepilogo Architettura Completa
┌─────────────────────────────────────────────────────────┐
│               🎮 SISTEMA GAMIFICATION             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ STRATO 1: PUNTI → REWARD (sempre attivo)          │  │
│  │ • Il cliente accumula punti                       │  │
│  │ • Soglie ricompensa: ~8, ~15, ~20, ~30 visite     │  │
│  │ • 4 ricompense predefinite + max 2 personalizzate │  │
│  │ • Barra di avanzamento + traguardi motivazionali  │  │
│  │ • Il barbiere sceglie le ricompense e le soglie   │  │
│  │ • Funziona con e senza PWA (CRM = fonte verità)   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ STRATO 2: TIER → STATUS + BENEFICI (opzionale)    │  │
│  │ • 4 livelli basati su punti annuali               │  │
│  │ • Elementi visivi (bordo, badge, animazione)      │  │
│  │ • Benefici concreti ON/OFF dal barbiere           │  │
│  │ • Reset annuale + 2 mesi grazia                   │  │
│  │ • Attivo in Template VIP Club                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ LAYER 3: STREAK (opzionale)                       │  │
│  │ • Visite consecutive entro 45 giorni              │  │
│  │ • Bonus punti + milestone streak                  │  │
│  │ • Streak Shield +7 giorni                         │  │
│  │ • Attivo in Template Streak Master e VIP Club     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ LAYER 4: BADGE (opzionale)                        │  │
│  │ • Traguardi una tantum (8-10 badge)               │  │
│  │ • Puramente visivi, celebrativi                   │  │
│  │ • Attivo nel modello VIP Club                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  MODELLO:                                               │
│  🏷️ Classico = Livello 1 (punti fissi/visita)           │
│  🔥 Serie = Livello 1 (punti/€1) + Livello 3            │
│  🏆 VIP Club = Livello 1 (punti/servizio) + 2 + 3 + 4   │
│                                                         │
│  ROADMAP:                                               │
│  v1 = 🏷️ Classico                                       │
│  v2 = 🏷️ + 🔥 + 🏆                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘

---


## Prossimi step

1. ~~**User Journey Maps** — percorso completo di ogni persona con il prodotto~~ ✅ Completato
2. ~~**Open Questions** — spunti di approfondimento su setup, staff, loyalty, migrazione, ecc.~~ ✅ Documentati
3. ~~**Approfondire le Open Questions** — risolvere i 10 temi uno per uno e trasformarli in decisioni~~ ✅ Completato
4. **Architettura dell'informazione** — mappa di tutte le schermate e navigazione
5. **Wireframe low-fidelity** — schizzi strutturali
6. **Design system** — regole visive + componenti (post-branding)
7. **UI high-fidelity** — schermate finali
8. **Prototipo interattivo** — Figma cliccabile
9. **Scrittura tesi** — Cap. 1-4 già pronti da scrivere con il materiale raccolto