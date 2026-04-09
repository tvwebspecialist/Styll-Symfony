> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** *(contenuto consolidato da fonti di progetto originali)*

---

# Target e Utenti — Styll

## A chi è rivolto

**Target primario:** Barbieri italiani indipendenti (137.730 attività sul territorio, 82.7% micro-imprenditori individuali)

**Target secondario:** Saloni da parrucchieri con piccoli team (2-5 persone)

**Scalabilità futura:** Fitness, tattoo, fisioterapia — qualsiasi micro-professionista su appuntamento

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
**Scenario:** Da Fresha ad Styll — migrazione e gestione multi-staff

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
- Trova Styll: nessuna commissione, white-label
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