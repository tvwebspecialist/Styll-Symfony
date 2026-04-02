# Funzionalità e Feature — Styll

## Le 3 interfacce del sistema

### Architettura Multi-Tenant
Un'unica piattaforma centrale che ospita più barbieri contemporaneamente, mantenendo separati dati, impostazioni e identità visiva di ciascuno.

### 1. Dashboard Amministratore
   - Creazione e gestione dei professionisti (barbieri)
   - Attivazione/disattivazione accessi in base all'abbonamento
   - Configurazione nome, colori, logo e stile del brand
   - Abilitazione/disabilitazione funzionalità (feature toggle)

### 2. Dashboard del Professionista (Barbiere)
   - Gestione calendario + walk-in
   - Visualizzazione e organizzazione appuntamenti
   - Configurazione servizi offerti
   - Gestione clienti con CRM (storico, frequenza, rischio churn)
   - Setup loyalty e reward
   - Notifiche win-back ("questo cliente non viene da X giorni")
   - Analytics (revenue, retention rate, clienti attivi)

### 3. Landing Page + App Cliente (PWA)
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

## 🎮 Gamification & Loyalty — Sistema a 4 Layer

Il sistema di gamification è composto da 4 layer indipendenti, attivabili in base al template scelto dal barbiere:

| Strato | Cosa fa | Sempre attivo? |
|--------|---------|---------------|
| Livello 1: Punti → Ricompensa | Il cliente accumula punti e riscatta premi | ✅ Sempre (è la base) |
| Livello 2: Livello → Status + Benefici | Livelli annuali con benefici concreti ON/OFF | Solo nel modello VIP Club |
| Livello 3: Serie (Streak) | Visite consecutive con bonus punti | Solo in Template Streak Master e VIP Club |
| Livello 4: Badge | Traguardi una tantum, puramente celebrativi | Solo nel modello VIP Club |

### I 3 Template di Loyalty

Il barbiere sceglie un template al momento del setup. Ogni template attiva layer diversi:

| Modello | Formula punti | Strati attivi | Per chi è |
|---------|--------------|---------------|-----------|
| 🏷️ Classico | Punti fissi per visita (es. 100) | Livello 1 | Marco — vuole semplicità, zero interferenze |
| 🔥 Streak Master | X punti per €1 speso (es. 10 pt/€1) | Livello 1 + Livello 3 | Chi vuole premiare chi spende di più + streak |
| 🏆 Club VIP | Punti per servizio (personalizzabili) OPPURE formula degli altri | Strato 1 + 2 + 3 + 4 | Sara — vuole il massimo controllo e i tier |

**Roadmap:**
- v1 = 🏷️ Classico
- v2 = 🏷️ Classico + 🔥 Streak Master + 🏆 VIP Club

### Come si guadagnano i punti — in base al template

| Modello | Formula | Come funziona | Il barbiere deve fare qualcosa? |
|---------|---------|--------------|--------------------------------|
| 🏷️ Classico | Punti fissi per visita (es. 100) | Il cliente viene → 100 punti. Bene. | No, conferma automatica appuntamento |
| 🔥 Streak Master | X punti per €1 speso (es. 10) | Taglio+Barba €35 → 350 punti. Chi spende di più prende di più. | No, il sistema conosce già i prezzi dei servizi |
| 🏆 Club VIP | Punti per servizio (personalizzabili) | "Taglio = 80pt, Barba = 50pt, Colore = 120pt" | Sì, configura i punti per servizio (oppure usa la formula degli altri template) |

**Nota chiave:** nel template Streak Master e VIP Club, il sistema calcola automaticamente i punti perché ha già i servizi con i prezzi nel gestionale. Quando il barbiere conferma un appuntamento, i punti si assegnano da soli. Zero lavoro extra. Per i walk-in senza prenotazione o clienti senza app (es. Roberto), il barbiere assegna punti manualmente dal CRM con un tap.

---

### Soglie Reward — Calibrate per il settore barbiere

**Principio economico:** il barbiere "investe" nella ricompensa. Deve guadagnarci più di quello che regala.

**Dati di riferimento:**
- Visita media: ogni 28-35 giorni
- Spesa media per visita: €20-30
- Visite annuali per cliente fedele: 10-13
- Costo prodotto per il barbiere: €3-8 (ingrosso)
- Costo taglio "regalato": €0 reale (tempo) ma €15-25 di mancato incasso

**Formula di esempio:** 10 punti per €1 speso → visita media €25 = 250 punti/visita

| Soglia | Punti | Visite equivalenti | Tempo (~1 visita/mese) | Tipo di ricompensa | Costo barbiere |
|--------|-------|--------------------|------------------------|-------------------|----------------|
| 🎁 Premio 1 | 2.000 | ~8 visite | ~8 mesi | Prodotto styling omaggio | €3-8 |
| 🎁 Premio 2 | 3.750 | ~15 visite | ~15 mesi | Servizio extra gratis (barba, sopracciglia) | €5-10 |
| 🎁 Premio 3 | 5.000 | ~20 visite | ~20 mesi | Taglio completo gratis | €15-25 |
| 🎁 Premio 4 | 7.500 | ~30 visite | ~30 mesi | Trattamento premium completo | €25-40 |

Queste sono soglie DEFAULT. Il barbiere può modificarle.

**Micro-progressi (Goal Gradient Effect):** tra una soglia e l'altra, il cliente vede traguardi motivazionali senza ricompensa (es. "Metà strada! 💪", "Quasi al traguardo..."). Non costano nulla al barbiere ma mantengono l'impegno.

**Numero Premi:** 4 default + max 2 custom (= max 6 totali)
- 4 ricompense pre-compilate con soglie e nomi default → modificabili dal barbiere.
- 2 slot extra opzionali per ricompense personalizzate (es. "Birra gratis a 1.000 punti").
- Marco attiva la fedeltà e ha già 4 ricompense pronte senza fare niente.
- Sara personalizza tutto e aggiunge 1-2 extra.
- Regola: meno ricompense = più impatto. Ogni traguardo deve sentirsi speciale.

---

### I 4 Tier — Status + Benefici Concreti

**Concetto:** il tier è status visivo (bordo + badge sulla foto profilo nella PWA) + benefici reali attivabili/disattivabili dal barbiere.

| Livello | Punti annuali | Elemento visivo | Benefici (ON/OFF dal barbiere) |
|---------|--------------|----------------|-------------------------------|
| 🥉 Livello 1 (base) | 0 - 2.499 | Profilo standard | Nessun beneficio extra — accumula punti normalmente |
| 🥈 Livello 2 | 2.500 - 4.999 | Bordo argento + stemma 🥈 | ☐ Prenotazione prioritaria (slot riservato) / ☐ +10% punti bonus su ogni visita / ☐ Accesso anticipato a nuovi servizi |
| 🥇 Livello 3 | 5.000 - 9.999 | Bordo oro + stemma 🥇 | ☐ Tutto il Tier 2+ / ☐ Sconto permanente (default 5%, personalizzabile) / ☐ Servizio upgrade gratis 1x/anno / ☐ Compleanno ricompensa automatico |
| 💎 Livello 4 | 10.000+ | Bordo diamante + stemma 💎 + animazione | ☐ Tutto il Tier 3+ / ☐ Sconto permanente (default 10%, personalizzabile) / ☐ Prenotazione prioritaria sempre / ☐ Invito eventi esclusivi / ☐ Taglio gratuito il giorno del compleanno |

**Raggiungibilità (con spesa media €25/visita):**

| Livello | Visite/anno necessarie | Frequenza | % clienti che ci arriveranno |
|---------|----------------------|-----------|------------------------------|
| 🥈 Livello 2 | ~10 | ~1 al mese | Maggior parte dei clienti fedeli |
| 🥇 Livello 3 | ~20 | ~2 al mese | Clienti molto fedeli |
| 💎 Livello 4 | ~40 | ~1 a settimana | 1-2% dei clienti (aspirazionale) |

Ogni beneficio è ON/OFF. Il barbiere può disattivare singoli benefici o personalizzare la percentuale di sconto (3%, 5%, 10% — decide lui). Lo sconto non è esagerato nemmeno al 10% per il Tier 4: un cliente Diamante ha speso €1.000+ nell'anno, il 10% di sconto è un investimento sulla fidelizzazione.

**Nomi dei tier:** per ora usiamo Tier 1/2/3/4. I nomi definitivi (es. "Apprendista → Barbiere → Maestro → Leggenda") verranno scelti nella fase di branding.

### Livello di ripristino: Reset Annuale + 2 Mesi di Grazia

**Decisione confermata:** reset annuale con periodo di grazia di 2 mesi.

Come funziona:
- A fine anno i punti tier si resettano a 0.
- Il tier raggiunto resta attivo per 2 mesi (periodo di grazia).
- In quei 2 mesi, se il cliente ricomincia ad accumulare punti, mantiene il tier.
- Se dopo 2 mesi non ha abbastanza punti per quel tier, scende al tier corretto (non graduale — va al tier che i suoi punti attuali giustificano).

Esempio:

| Mese | Punti cumulativi anno | Livello attivo | Nota |
|------|-----------------------|----------------|------|
| Gen-Dic Anno 1 | 5.500 | 🥇 Oro | Raggiunto Oro |
| 1 Gen Anno 2 | 0 (reimposta) | 🥇 Oro | Periodo di grazia (2 mesi) |
| Febbraio Anno 2 | 450 | 🥇 Oro | Ancora in grazia |
| 1 Marzo Anno 2 | 900 | 🥉 Bronzo | Grazia scaduta → scende al tier corretto |
| Giu Anno 2 | 2.800 | 🥈 Argento | Risale appena raggiunge la soglia |

Perché questa scelta:
- Il Diamante resta esclusivo — devi riguadagnartelo ogni anno.
- Non c'è inflazione ("dopo 5 anni tutti sono Gold").
- I 2 mesi di grazia evitano la frustrazione del reset brutale.
- Stesso modello di Sephora Beauty Insider — validato dal mercato.

### Punti Iniziali per Clienti Storici

**Problema:** il primo anno il barbiere attiva Styll e tutti i clienti storici partono da Bronze. Non è giusto.

**Soluzione:** il barbiere può assegnare punti iniziali ai clienti storici dal CRM.

Come funziona:
- Il sistema suggerisce automaticamente i punti in base allo storico importato (es. "Luca ha 36 visite nello storico → suggerito 3.600 punti").
- Il barbiere può accettare il suggerimento o personalizzare.
- Questo vale solo al momento dell'attivazione iniziale.

---

### Flussi gamification per persona

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

---

### Riepilogo Architettura Completa Gamification

```
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
```

---

## 🛒 Prodotti & Inventario — Decisione progettuale

### Problema
Un barbiere/professionista non vende solo servizi: vende anche prodotti (cera, olio barba, shampoo, styling). Questi prodotti rappresentano il 15-25% del revenue di un barbershop ben gestito. Nessun competitor nel nostro tier (Barberly, GlossGenius) offre un inventario integrato con il booking.

### Concept
I prodotti sono parte dell'esperienza operativa dell'appuntamento:
- Il barbiere aggiunge i prodotti venduti/usati direttamente nell'appuntamento
- Aprendo l'appuntamento di Luca alle 10:00 vede: "Taglio + Barba + Matt Clay" → sa cosa preparare
- La giacenza si aggiorna automaticamente ad ogni vendita
- Non è un e-commerce: è un tool operativo che aiuta il barbiere a prepararsi e a non restare senza stock

### Come funziona nel flusso
1. Il **cliente** prenota servizi (Taglio + Barba) dalla PWA
2. Il **barbiere** aggiunge prodotti all'appuntamento dalla dashboard (durante o dopo la visita)
3. La **giacenza** si decrementa automaticamente
4. Quando la scorta scende sotto una soglia → **alert "scorta bassa"** nella dashboard

### Roadmap prodotti

| Fase | Cosa si fa | Complessità |
|------|-----------|-------------|
| **v1** | Catalogo prodotti + vendita prodotti dentro l'appuntamento + giacenza base (quantità in stock, alert "scorta bassa") | Bassa |
| **v2** | Movimenti di magazzino tracciati (carico/scarico con log), alert riordino, report prodotti più venduti | Media |
| **v3** | Suggerimenti AI ("Ordina 5 Matt Clay, finisci tra 8 giorni"), margini profitto per prodotto | Alta |
