> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `onboarding-strategy.md`

---

# 🎨 Strategia di Onboarding & UX Copy — Styll

> Piattaforma SaaS di retention per barbieri — "Non ti porto clienti, ti aiuto a gestire i tuoi e a farli tornare."

---

## 1. Introduzione

L'onboarding è il momento più critico nel ciclo di vita di un utente SaaS. È la fase in cui un nuovo iscritto decide — spesso in pochi minuti — se il prodotto merita il suo tempo oppure no. Un onboarding ben progettato non è un "nice-to-have": è un motore di crescita.

### Perché l'onboarding è fondamentale

- **Activation:** Le aziende SaaS con onboarding ottimizzato raggiungono tassi di attivazione del 60-65%, rispetto alla mediana di settore del 35-45% (1Capture, "SaaS Onboarding Best Practices: The Complete 2025 Guide", 2025).
- **Retention:** L'86% degli utenti dichiara di rimanere più fedele a un prodotto che investe in contenuti di onboarding (XB Software, "SaaS Onboarding Guide", 2024). Un buon onboarding può aumentare la retention fino al 50% (Folge, "8 User Onboarding Examples That Actually Work", 2026).
- **Churn:** Il 75% degli utenti non ritorna dopo una prima esperienza negativa (Mick-Mar, "10 SaaS Onboarding Best Practices for 2025", 2025). Ogni minuto di confusione durante l'onboarding causa la perdita dell'8% degli utenti (Krux, "Onboarding UX Best Practices", 2025).
- **Conversione trial-to-paid:** Un onboarding efficace può aumentare la conversione da trial a piano a pagamento fino al 40% (1Capture, 2025).
- **Costo di acquisizione:** Portare il tasso di attivazione dal 40% al 60% riduce il costo di acquisizione per utente mantenuto del 33% (Flowjam, "SaaS Onboarding Best Practices: 2025 Guide", 2025).

Per Styll, dove il target sono micro-imprenditori con poco tempo e poca pazienza tecnologica, l'onboarding deve essere **rapidissimo, guidato e gratificante**. Se Marco (barbiere indipendente, Napoli) non vede la sua landing page brandizzata entro 10 minuti, lo perdiamo.

---

## 2. Aha Moment

L'**Aha Moment** è l'istante in cui l'utente percepisce concretamente il valore del prodotto. Per Styll, questo momento è diverso per ciascun tipo di utente:

### Per il Professionista (Barbiere)

> **Aha Moment:** Il barbiere vede la SUA app brandizzata (con il SUO nome, il SUO logo, i SUOI colori) pronta per essere condivisa con i clienti, e riceve la prima prenotazione reale.

| Parametro | Valore |
|-----------|--------|
| **Azione chiave** | Completare il setup base (servizi + orari + branding) e visualizzare la preview della propria landing page/PWA |
| **Azione di rinforzo** | Ricevere la prima prenotazione da un cliente reale |
| **Entro quanto tempo** | Entro 10 minuti dalla registrazione (setup), entro 48 ore (prima prenotazione) |
| **Come misurarlo** | % utenti che completano il setup base entro la prima sessione; % utenti che ricevono almeno 1 prenotazione entro 48h; tempo medio al primo "preview della landing page" |

### Per il Cliente Finale

> **Aha Moment:** Il cliente vede l'app col brand del suo barbiere, prenota in 3 tap e riceve la conferma istantanea.

| Parametro | Valore |
|-----------|--------|
| **Azione chiave** | Completare la prima prenotazione |
| **Entro quanto tempo** | Entro 60 secondi dall'apertura del link |
| **Come misurarlo** | Tempo medio dalla prima visita alla prima prenotazione completata; tasso di completamento booking al primo tentativo |

---

## 3. Flusso di Onboarding

Il flusso è progettato per il **professionista** (barbiere) che si registra sulla piattaforma. Segue il principio del **progressive disclosure**: mostriamo solo ciò che serve, quando serve.

### Step 1 — Registrazione Lampo

| | |
|--|--|
| **Obiettivo** | Creare l'account nel minor tempo possibile |
| **Cosa vede l'utente** | Form minimale con 3 campi: nome del salone, email, password |
| **Azione richiesta** | Compilare i 3 campi e cliccare il bottone |
| **Titolo** | "Crea il tuo negozio digitale" |
| **Sottotitolo** | "In 2 minuti avrai la tua app. Nessuna carta di credito, nessun impegno." |
| **CTA** | "Inizia gratis →" |

### Step 2 — Personalizza il Tuo Brand

| | |
|--|--|
| **Obiettivo** | Far sentire il prodotto "suo" fin dal primo momento |
| **Cosa vede l'utente** | Pannello con upload logo, scelta colori, nome visualizzato — con **preview live** della landing page a destra |
| **Azione richiesta** | Caricare il logo (o scegliere un'iniziale), selezionare il colore primario |
| **Titolo** | "Dai un volto al tuo negozio" |
| **Sottotitolo** | "Il tuo brand, ovunque. I clienti vedranno la TUA app, non la nostra." |
| **CTA** | "Continua →" |

### Step 3 — Aggiungi i Tuoi Servizi

| | |
|--|--|
| **Obiettivo** | Configurare i servizi offerti (tagli, barba, combo…) |
| **Cosa vede l'utente** | Lista precompilata con i servizi più comuni dei barbieri (modificabili), con prezzo e durata |
| **Azione richiesta** | Confermare o personalizzare almeno 1 servizio |
| **Titolo** | "Cosa offri ai tuoi clienti?" |
| **Sottotitolo** | "Abbiamo già preparato i servizi più comuni. Personalizza prezzi e durata in un tap." |
| **CTA** | "Salva servizi →" |

### Step 4 — Imposta i Tuoi Orari

| | |
|--|--|
| **Obiettivo** | Definire quando il barbiere è disponibile per le prenotazioni |
| **Cosa vede l'utente** | Calendario settimanale con orari precompilati (Lun-Sab, 9:00-19:00), modificabili con drag |
| **Azione richiesta** | Confermare o modificare gli orari |
| **Titolo** | "Quando sei operativo?" |
| **Sottotitolo** | "Imposta i tuoi orari una volta. Il sistema gestisce tutto il resto." |
| **CTA** | "Conferma orari →" |

### Step 5 — Anteprima e Lancio

| | |
|--|--|
| **Obiettivo** | Mostrare il risultato finale e attivare l'effetto "wow" |
| **Cosa vede l'utente** | Preview full-screen della propria landing page + PWA, come la vedranno i clienti. Mockup di uno smartphone con il logo e il nome dell'app |
| **Azione richiesta** | Cliccare per pubblicare e ottenere il link condivisibile |
| **Titolo** | "Ecco la tua app. Pronta." |
| **Sottotitolo** | "Questo è quello che vedranno i tuoi clienti. Condividi il link e ricevi la prima prenotazione." |
| **CTA** | "Pubblica e condividi 🚀" |

### Step 6 — Prima Condivisione (Activation)

| | |
|--|--|
| **Obiettivo** | Guidare il barbiere verso la prima azione concreta: condividere il link |
| **Cosa vede l'utente** | Schermata con link copiabile, bottoni per condividere su WhatsApp/Instagram/Facebook, e template pronti per le Story |
| **Azione richiesta** | Condividere il link su almeno 1 canale |
| **Titolo** | "Fai sapere ai tuoi clienti!" |
| **Sottotitolo** | "Condividi il link della tua app. Abbiamo preparato dei template pronti per le Stories." |
| **CTA** | "Condividi su WhatsApp" / "Copia link" |

---

## 4. UX Copy Pagine Principali

### Landing Page (sito pubblico Styll — per i barbieri)

**Titolo Hero:**
> "Il tuo negozio. La tua app. I tuoi clienti che tornano."

**Sottotitolo:**
> "Styll è il gestionale che trasforma i tuoi clienti occasionali in clienti fedeli. Niente commissioni, niente marketplace. Solo il tuo brand."

**CTA primaria:**
> "Prova gratis per 14 giorni →"

**3 Feature principali:**

| # | Titolo | Descrizione |
|---|--------|-------------|
| 1 | **La tua app, il tuo brand** | I tuoi clienti vedono solo il tuo nome e il tuo logo. Nessuna piattaforma esterna, nessun competitor accanto a te. La tua app si installa dal browser in un tap. |
| 2 | **Clienti che tornano, non che spariscono** | Il Silent Churn Detector ti avvisa quando un cliente abituale smette di venire. Le campagne win-back lo riportano da te. Automaticamente. |
| 3 | **Loyalty che funziona davvero** | Non la solita tessera a punti. Streak, badge, livelli: i tuoi clienti si divertono a tornare. Come Duolingo, ma per il tuo negozio. |

---

### Pagina Signup

**Titolo:**
> "Crea il tuo negozio digitale in 2 minuti"

**Sottotitolo:**
> "Nessuna carta di credito. Nessun impegno. Annulli quando vuoi."

**CTA:**
> "Inizia gratis →"

---

### Dashboard Primo Accesso

**Messaggio di benvenuto:**
> "Benvenuto su Styll, [Nome]! 🎉
> Il tuo negozio digitale è quasi pronto. Completa questi pochi passi e ricevi la tua prima prenotazione oggi stesso."

**Suggerimenti (checklist visuale):**
- ✅ Account creato
- ⬜ Carica il tuo logo e scegli i colori
- ⬜ Aggiungi almeno 1 servizio
- ⬜ Imposta i tuoi orari
- ⬜ Pubblica la tua app e condividi il link

**Messaggio motivazionale (sotto la checklist):**
> "💡 Il setup richiede meno di 10 minuti. Meno di quanto ci vuole per un taglio!"

---

### Pagina Pricing

**Titolo:**
> "Un prezzo chiaro. Nessuna sorpresa. Mai."

**Descrizione piani:**

| Piano | Prezzo | Descrizione |
|-------|--------|-------------|
| **Starter** | €19-29/mese | "Tutto quello che serve per gestire il negozio e iniziare a far tornare i clienti. Prenotazioni, CRM, loyalty base, churn detection. Perfetto per chi inizia." |
| **Growth** | €49-69/mese | "Per chi ha capito che la retention è il suo superpotere. Loyalty gamificata, win-back automatico, analytics avanzata e gestione team fino a 5 persone." |
| **Pro/AI** | €99-149/mese | "Per il negozio che scala. AI Business Coach, previsione ricavi, no-show prediction, staff illimitato e multi-location. Il futuro del tuo business." |

**Nota sotto i piani:**
> "Tutti i piani includono: zero commissioni sulle prenotazioni, export dati gratuito, supporto umano. Sempre."

---

## 5. Microcopy

| Elemento | Testo | Tono |
|----------|-------|------|
| Bottone signup | "Inizia gratis →" | Diretto, zero barriere |
| Bottone upgrade | "Sblocca tutto il potenziale 🚀" | Motivazionale, aspirazionale |
| Placeholder email | "La tua email migliore" | Informale, amichevole |
| Placeholder nome salone | "Es. Barber Shop Marco" | Guida con esempio concreto |
| Loading generico | "Un momento, stiamo preparando tutto..." | Rassicurante, paziente |
| Loading dashboard | "Caricamento appuntamenti di oggi..." | Specifico, contestuale |
| Successo — prenotazione | "Prenotazione confermata! ✅ Il tuo cliente riceverà un promemoria." | Celebrativo, informativo |
| Successo — setup completato | "Il tuo negozio è live! 🎉 Condividi il link per ricevere la prima prenotazione." | Entusiasta, orientato all'azione |
| Errore generico | "Qualcosa non ha funzionato. Riprova, e se persiste scrivici — rispondiamo davvero." | Empatico, con via d'uscita |
| Campo obbligatorio | "Questo campo è necessario per continuare" | Neutro, chiaro |
| Password troppo corta | "La password deve avere almeno 8 caratteri. Quasi ci sei!" | Guida + incoraggiamento |
| Empty state — nessun appuntamento | "Nessun appuntamento per oggi. Condividi il link della tua app per iniziare a riceverne!" | Proattivo, suggerisce azione |
| Tooltip churn detector | "Questo cliente non viene da più tempo del solito. Vuoi inviargli un messaggio?" | Informativo, suggerisce azione |
| Badge ottenuto (cliente) | "Nuovo badge sbloccato: Cliente Fedele! 🏆" | Celebrativo, gamificato |
| Streak (cliente) | "🔥 3 tagli consecutivi! Continua così per sbloccare il prossimo premio." | Motivazionale, gamificato |

---

## 6. Sequenza Email Onboarding

### Email 1 — Welcome (invio immediato dopo la registrazione)

**Oggetto:** Benvenuto su Styll, [Nome]! Il tuo negozio digitale è pronto 🎉

**Corpo:**

> Ciao [Nome],
>
> Hai appena fatto il primo passo per trasformare il tuo negozio. Benvenuto su Styll!
>
> Styll non è l'ennesimo gestionale. È il sistema che ti aiuta a far tornare i tuoi clienti — con il TUO brand, senza commissioni, senza sorprese.
>
> Ecco cosa puoi fare adesso:
> 1. **Personalizza la tua app** — carica il logo e scegli i colori
> 2. **Aggiungi i tuoi servizi** — abbiamo precompilato i più comuni
> 3. **Condividi il link** — i tuoi clienti possono già prenotare
>
> Il setup richiede meno di 10 minuti. Sul serio.
>
> Se hai bisogno di aiuto, rispondi a questa email. C'è una persona vera dall'altra parte.
>
> A presto,
> Il team Styll

**CTA:** "Completa il setup →"

---

### Email 2 — Quick Win (giorno 1)

**Oggetto:** Un consiglio veloce per la tua prima prenotazione 📱

**Corpo:**

> Ciao [Nome],
>
> Sai qual è il modo più veloce per ricevere la tua prima prenotazione? Condividere il link della tua app con i clienti che hai già.
>
> **Ecco 3 modi per farlo ora:**
> - 📲 **WhatsApp:** Manda il link ai tuoi clienti abituali con un messaggio tipo: *"Ciao! Da oggi puoi prenotare direttamente dalla mia app: [link]. Niente chiamate, niente attese."*
> - 📸 **Instagram Stories:** Abbiamo preparato un template pronto nella tua dashboard. Un tap e sei live.
> - 🏪 **In negozio:** Stampa il QR code (lo trovi nella dashboard) e mettilo vicino alla cassa.
>
> Il primo cliente che prenota? Quello è il momento in cui capisci che Styll funziona.
>
> Pronto?

**CTA:** "Vai alla dashboard e condividi →"

---

### Email 3 — Feature Discovery (giorno 3)

**Oggetto:** Sai chi stai perdendo? Styll te lo dice 👀

**Corpo:**

> Ciao [Nome],
>
> Hai mai perso un cliente senza accorgertene? Succede a tutti. Il cliente smette di venire, e quando te ne accorgi è troppo tardi.
>
> Con Styll non succede più. Il **Silent Churn Detector** monitora i tuoi clienti e ti avvisa quando qualcuno non torna da più tempo del solito.
>
> *"Marco non viene da 38 giorni. Normalmente viene ogni 25. Vuoi mandargli un messaggio?"*
>
> Un tap, e il messaggio parte. Il cliente si sente ricordato. Tu non perdi fatturato.
>
> E con il piano Growth, puoi attivare le **campagne win-back automatiche**: il sistema fa tutto da solo, tu pensi ai tagli.
>
> Curiosa/o? Dai un'occhiata nella tua dashboard.

**CTA:** "Scopri il Churn Detector →"

---

### Email 4 — Upgrade (giorno 7)

**Oggetto:** I tuoi clienti meritano di più. E anche tu. ✨

**Corpo:**

> Ciao [Nome],
>
> Una settimana con Styll. Come sta andando?
>
> Se stai già ricevendo prenotazioni, complimenti — sei partito alla grande.
>
> Ora immagina questo:
> - 🔥 I tuoi clienti accumulano **streak** e sbloccano **badge** — e tornano per non perdere il punteggio
> - 🎯 Il sistema manda **messaggi win-back automatici** ai clienti che stanno sparendo
> - 📊 Vedi esattamente chi sono i tuoi **clienti VIP** e quanto valgono
> - 👥 Gestisci il tuo **team** con permessi e calendari separati
>
> Tutto questo è nel piano **Growth**.
>
> E per i prossimi 7 giorni, puoi provarlo **gratis** — senza impegno, senza carta di credito.
>
> Ti basta un tap.

**CTA:** "Prova Growth gratis per 7 giorni →"

---

## 7. Messaggi di Errore

| Errore | Copy Consigliato |
|--------|-----------------|
| **404 — Pagina non trovata** | "Ops! Questa pagina non esiste. Forse il link è sbagliato, oppure la pagina è stata spostata. Torna alla dashboard e riparti da lì. 🏠" |
| **500 — Errore del server** | "Qualcosa è andato storto da parte nostra. Stiamo già lavorando per risolvere. Riprova tra qualche minuto, e se il problema persiste scrivici — rispondiamo sempre." |
| **Login fallito** | "Email o password non corretti. Riprova, oppure reimposta la password — ti mandiamo un link in un attimo. 🔑" |
| **Campo obbligatorio** | "Questo campo è necessario per continuare. Compilalo e sei a posto! ✍️" |
| **Pagamento fallito** | "Il pagamento non è andato a buon fine. Verifica i dati della carta e riprova. Nessun addebito è stato effettuato. Se il problema continua, contattaci." |
| **Connessione assente** | "Sembra che tu sia offline. Controlla la connessione e riprova. I tuoi dati sono al sicuro, non preoccuparti. 📡" |

---

## 8. Case Study

### 1. Slack — Onboarding orientato all'attivazione

**Cosa fanno bene:** Slack concentra l'intero onboarding su un singolo obiettivo: portare l'utente a collaborare con il team il prima possibile. L'onboarding guida step-by-step alla creazione del workspace, all'invito dei colleghi e all'invio del primo messaggio. Ogni passo è progettato per ridurre il carico cognitivo con checklist, progress bar e micro-celebrazioni.

**Risultati:** +25% di engagement degli utenti dopo l'implementazione dell'onboarding guidato. La strategia di attivazione ha contribuito direttamente alla crescita che ha portato all'acquisizione da parte di Salesforce per $27,7 miliardi.

**Fonte:** Dudha, A., "Why Most SaaS Onboarding Fails — And How Slack Got It Right", aminadudha.com, 2024. URL: https://www.aminadudha.com/post/saas-onboarding-fails-slack

---

### 2. Canva — Template-first, zero attrito

**Cosa fanno bene:** Canva elimina il "problema della pagina bianca" offrendo template precompilati fin dal primo secondo. L'onboarding chiede all'utente il suo obiettivo (personale, scuola, business) e personalizza immediatamente l'esperienza. L'utente crea il primo design in meno di 2 minuti, senza alcuna curva di apprendimento.

**Risultati:** Scalata a oltre 40 milioni di utenti mensili, in gran parte grazie alla rapidità con cui i nuovi utenti raggiungono il valore del prodotto. L'onboarding frictionless è il motore della crescita virale.

**Fonte:** Casestudies.com, "How Canva Uses Slack to Scale a Global Graphic Design Platform to Over 40 Million People Each Month", 2024. URL: https://www.casestudies.com/company/slack/case-study/how-canva-uses-slack-to-scale-a-global-graphic-design-platform-to-over-40-million-people-each-month

---

### 3. Duolingo — Gradual engagement e gamification

**Cosa fanno bene:** Duolingo permette all'utente di iniziare una lezione *prima* di creare un account — il cosiddetto "gradual engagement". L'utente prova il prodotto, ottiene una piccola vittoria (la prima lezione completata), e solo dopo gli viene chiesto di registrarsi. La gamification (punti, streak, badge, classifiche) crea habit loop che mantengono l'utente attivo nel tempo.

**Risultati:** L'utente raggiunge la prima "vittoria" in meno di 1 minuto. Le app con onboarding positivo come Duolingo registrano tassi di retention fino all'80% superiori rispetto a quelle con onboarding scadente. Il modello di gamification di Duolingo è diventato un benchmark per l'intero settore SaaS.

**Fonte:** INSART, "Case Study: Why Your SaaS Onboarding is Costing You Revenue (and How to Fix It)", insart.com, 2024. URL: https://insart.com/case-study-saas-onboarding-costing-revenue-fix/

---

## 9. Riscontri per il Tuo Progetto

### ✅ Cosa puoi fare subito

1. **Implementare il flusso di onboarding in 5-6 step** descritto nella sezione 3, con setup guidato e preview live della landing page — è il singolo intervento con il maggiore impatto sull'attivazione.
2. **Scrivere e inserire tutta la microcopy** (sezione 5) nelle interfacce esistenti — è un lavoro a basso costo con alto impatto sulla percezione di qualità.
3. **Creare la checklist di primo accesso** nella dashboard — guida l'utente verso l'Aha Moment senza bisogno di tutorial complessi.
4. **Preparare i template di condivisione** (WhatsApp, Instagram Story) per abbattere la barriera tra setup completato e prima prenotazione.
5. **Implementare i messaggi di errore UX-friendly** — piccolo sforzo, grande differenza nella percezione del prodotto.

### ⚠️ Cosa manca

1. **Sequenza email automatizzata** — serve un sistema di email transazionali (es. Resend, Postmark, o Supabase Edge Functions + servizio email) per inviare le 4 email di onboarding.
2. **Tracking degli eventi di attivazione** — senza analytics per misurare l'Aha Moment (tempo al primo setup, prima prenotazione, tasso di completamento onboarding), non puoi ottimizzare.
3. **Segmentazione utenti** — l'onboarding dovrebbe adattarsi (es. barbiere singolo vs. salone multi-staff vs. migrazione da altro tool).
4. **A/B testing** — una volta live, serve testare varianti di copy e flusso per ottimizzare continuamente.
5. **Contenuti di supporto** — video brevi (< 60 secondi), knowledge base, FAQ inline per gli step più critici del setup.

### 🎯 Top 3 Priorità

1. **🥇 Setup guidato con preview live** — È il momento più critico dell'intero journey (vedi Journey di Marco, persona 1). Se il barbiere non vede la SUA app entro 10 minuti, se ne va. Il setup deve essere precompilato, visuale e concludersi con un effetto "wow".

2. **🥈 Sequenza email di onboarding (4 email)** — Le email trasformano un utente registrato in un utente attivo. Email 1 (welcome) e Email 2 (quick win) sono le più urgenti: guidano verso la prima prenotazione entro 24-48 ore.

3. **🥉 Silent Churn Detector + notifica in dashboard** — È il differenziatore numero 1 di Styll rispetto a TUTTI i competitor del tier 1. Deve essere visibile e funzionante fin dalla v1 per dimostrare il valore unico del prodotto.

---

## 10. Bibliografia e Fonti per la Tesi

### Articoli e Report

1. 1Capture, "SaaS Onboarding Best Practices: The Complete 2025 Guide", 1capture.io, 2025. URL: https://www.1capture.io/blog/onboarding-best-practices-saas-trials

2. Flowjam, "SaaS Onboarding Best Practices: 2025 Guide + Checklist", flowjam.com, 2025. URL: https://www.flowjam.com/blog/saas-onboarding-best-practices-2025-guide-checklist

3. LowChurn, "10 Customer Onboarding Best Practices to Reduce SaaS Churn in 2025", lowchurn.com, 2025. URL: https://www.lowchurn.com/blog/customer-onboarding-best-practices

4. XB Software, "SaaS Onboarding Guide: Boost Retention & User Adoption", xbsoftware.com, 2024. URL: https://xbsoftware.com/blog/saas-onboarding-challenges-best-practices/

5. Mick-Mar, "10 SaaS Onboarding Best Practices for 2025", mick-mar.com, 2025. URL: https://mick-mar.com/blog/saas-onboarding-best-practices/

6. Krux, "Onboarding UX Best Practices – Build High-Conversion SaaS Activation Flows", trykrux.com, 2025. URL: https://www.trykrux.com/blog/onboarding-activation-ux-2025

7. SaaS Operations, "8 SaaS Onboarding Best Practices to Drive Adoption in 2025", saasoperations.com, 2025. URL: https://saasoperations.com/saas-onboarding-best-practices/

8. Guidejar, "9 Customer Onboarding Best Practices for SaaS Teams in 2025", guidejar.com, 2025. URL: https://www.guidejar.com/blog/9-customer-onboarding-best-practices-for-saas-teams-in-2025

9. MarTech Zone, "SaaS Onboarding Best Practices and KPIs for the Modern Enterprise", martech.zone, 2024. URL: https://martech.zone/saas-onboarding-best-practices/

10. UX Design Institute, "UX Onboarding Best Practices in 2025: A Designer's Guide", uxdesigninstitute.com, 2025. URL: https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/

11. Dudha, A., "Why Most SaaS Onboarding Fails — And How Slack Got It Right", aminadudha.com, 2024. URL: https://www.aminadudha.com/post/saas-onboarding-fails-slack

12. INSART, "Case Study: Why Your SaaS Onboarding is Costing You Revenue (and How to Fix It)", insart.com, 2024. URL: https://insart.com/case-study-saas-onboarding-costing-revenue-fix/

13. Folge, "8 User Onboarding Examples That Actually Work", folge.me, 2026. URL: https://folge.me/blog/8-onboarding-examples-that-work

14. SocialTargeter, "Tech Startups and Customer Success: Case Studies on Redefining Onboarding Experiences", socialtargeter.com, 2024. URL: https://www.socialtargeter.com/blogs/tech-startups-and-customer-success-case-studies-on-redefining-onboarding-experiences

15. Nielsen, J., "10 Usability Heuristics for User Interface Design", Nielsen Norman Group, nngroup.com, 1994 (aggiornato 2024). URL: https://www.nngroup.com/articles/ten-usability-heuristics/

16. Datadab, "The Ultimate Guide to SaaS User Onboarding: Best Practices, Examples & Strategies for Retention", datadab.com, 2024. URL: https://www.datadab.com/blog/the-ultimate-guide-to-saas-user-onboarding-best-practices-examples-strategies-for-retention/

### Libri

17. Krug, S., *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability*, New Riders, 3ª edizione, 2014.

18. Podmajersky, T., *Strategic Writing for UX: Drive Engagement, Conversion, and Retention with Every Word*, O'Reilly Media, 2019.

19. Hoober, S., Berkman, E., *Designing Mobile Interfaces*, O'Reilly Media, 2012.

20. Norman, D., *The Design of Everyday Things*, Basic Books, edizione rivista, 2013.

21. Zichermann, G., Cunningham, C., *Gamification by Design: Implementing Game Mechanics in Web and Mobile Apps*, O'Reilly Media, 2011.