> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** *(contenuto consolidato da fonti di progetto originali)*

---

# Design e UX — Styll

## Dashboard — Decisione progettuale

### Problema
La dashboard deve funzionare sia per Marco (1 sedia) sia per Sara (3 dipendenti, 2 sedi).

### Benchmark competitor

| SaaS | Stile Dashboard |
|------|----------------|
| **Mangomint** | Pulita, modulare, automazioni intelligenti (4.9/5 Capterra) |
| **GlossGenius** | Bellissima, mobile-first, minimalista |
| **Phorest** | Complessa, potente, troppe info per piccoli |
| **Fresha** | Funzionale ma generica |

### Decisione — Principio "Progressive complexity"

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

## CRM — Profilo cliente avanzato

### Problema
Il barbiere non ricorda cosa ha fatto l'ultima volta, le preferenze, i prodotti.

### Benchmark competitor
Vagaro, Boulevard, Zenoti, Phorest — tutti offrono profili clienti avanzati ma nessuno con semaforo churn o VIP score.

### Decisione — Profilo a 2 livelli

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

## Gestione dipendenti e multi-staff — Decisione

### Benchmark competitor

| SaaS | Ruoli disponibili |
|------|------------------|
| **Mangomint** | Owner, Manager, Staff, Front Desk — permessi granulari |
| **Phorest** | Owner, Manager, Stylist, Receptionist — complesso ma completo |
| **Fresha** | Owner, Team Member — semplice, pochi ruoli |
| **GlossGenius** | Solo (1 utente) → Team plan recente |

### 4 ruoli per Styll

| Ruolo | Vede | Può fare |
|-------|------|----------|
| **Titolare (Owner)** | Tutto: tutti i calendari, tutti i clienti, tutti i KPI | Tutto: gestisce staff, servizi, loyalty, branding, billing |
| **Manager** | Tutto tranne billing | Gestisce staff e appuntamenti, non il billing |
| **Barbiere (Staff)** | Solo il suo calendario e i suoi clienti | Conferma appuntamenti, aggiunge note, assegna punti loyalty |
| **Receptionist** | Tutti i calendari (sola lettura) | Prenota per tutti, gestisce walk-in, check-in clienti |

### Calendario multi-staff
- Vista titolare: calendari **affiancati** (side-by-side) — come Mangomint
- Vista staff: solo il proprio calendario
- Il cliente nella PWA sceglie con chi prenotare (o "primo disponibile")

### Setup staff
- Il titolare invita via email/link
- Lo staff accetta e crea password → vede solo il suo scope
- Il titolare pre-configura servizi e orari per ogni staff member

**CRM condiviso:** Il CRM clienti è condiviso ma filtrato per staff assegnato. La loyalty è gestita dal Titolare, lo staff può solo assegnare punti. Permessi pre-configurati, non customizzabili in v1 (semplifica).

---

## Comunicazione brand-first — Decisione

### Benchmark competitor

| SaaS | Approccio white-label |
|------|----------------------|
| **Shopify** | Theme personalizzabili, dominio custom, zero menzione Shopify al cliente |
| **Auth0** | Universal Login customizzabile per tenant |
| **Barberly** | App brandizzata su App Store per ogni barbiere |
| **GlossGenius** | Branding parziale, il nome GlossGenius è visibile |

### Landing page B2B (vendita)
- Mockup interattivo: il barbiere inserisce il nome del suo negozio → vede in real-time come apparirebbe la SUA app
- Confronto visivo: "Con Fresha vedono QUESTO → Con NOI vedono QUESTO"

---

## Loyalty per clienti senza app — Decisione

### Il CRM è SEMPRE la fonte di verità unica per la loyalty
- Ogni cliente ha un profilo nel CRM con punti, livello, streak — anche se non ha la PWA
- Il barbiere assegna punti manualmente dopo una visita walk-in (un tap)
- Il barbiere riscatta reward dal CRM per conto del cliente
- Log completo di tutte le operazioni per trasparenza

### 3 modi per comunicare i punti al cliente senza app
1. **A voce** — il barbiere legge dal CRM: "Roberto, hai 450 punti!"
2. **SMS automatico post-visita** — "Grazie Roberto! Hai ora 450 punti. Ancora 50 per un taglio gratis 💈"
3. **Apple/Google Wallet** (v2) — card digitale senza app, aggiornata automaticamente

**Sincronizzazione:** Se Roberto un giorno installa la PWA, i punti sono già lì. Il profilo CRM è unico: con o senza PWA, stessi dati, stessi punti. Zero perdita dati nel passaggio.

---

## Setup intelligente con AI — Decisione

### Benchmark competitor

| SaaS | Setup Time | Approccio |
|------|-----------|-----------|
| **Mangomint** | ~30 giorni con onboarding manager | Hands-on con specialista, call 30 min, import in 24h |
| **GlossGenius** | ~10 min self-service | Wizard step-by-step, mobile-first |
| **Barberly** | ~15 min | Form classico multi-step |
| **Phorest** | ~30 giorni con concierge | Migrazione assistita completa |

### Decisione per v1 — Setup guidato smart (senza AI vera)
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

### Decisione per v2 — AI vera
- Campo testo libero: "Descrivi la tua attività" → NLP estrae servizi, orari, prezzi
- Implementabile con OpenAI API (GPT-4o): costo ~$0.01-0.03 per setup
- Structured output JSON da prompt → popola form

**SaaS di riferimento:** Typeform (1 domanda alla volta, conversazionale), Duolingo (detection automatica lingua/location, percorso adattivo)