# 📊 Analisi Strategica — Progetto Styll

> **Documento di ricerca e analisi strategica completa**
> Generato a supporto del progetto di tesi Styll — piattaforma SaaS verticale di retention per barbieri e micro-professionisti su appuntamento.

---

## FASE 0 — Contestualizzazione

### ✅ Conferma lettura `messaggio.md` — 5 punti chiave:

1. **Vision e posizionamento**: Styll è una piattaforma SaaS verticale "retention-first" per barbieri italiani indipendenti (137.730 attività, 82.7% micro-imprenditori). NON è un marketplace — il brand del professionista è sempre protagonista (white-label completo).
2. **Differenziazione**: Gamification della loyalty (blue ocean — nessun competitor la offre), Silent Churn Detector, win-back automatico, pricing trasparente (3 tier: Starter €19-29, Growth €49-69, Pro €99-149), data ownership totale.
3. **Competitor**: Fresha/Booksy/theCut sono marketplace (competitor indiretti). Barberly è il competitor diretto più vicino ma senza retention. Phorest è il benchmark retention ma costa $99+ e non è per piccoli. GlossGenius è il benchmark UX.
4. **Architettura**: React + Supabase, PWA installabile, 3 interfacce (Admin, Barbiere, Cliente), multi-tenant con RLS. Setup guidato in 5 step (< 8 minuti). 4 personas definite (Marco, Sara, Luca, Roberto).
5. **Roadmap**: v1 = MVP (prenotazioni + CRM + loyalty base + churn detector + PWA), v2 = gamification completa + win-back + walk-in QR, v3 = AI Coach + prediction + WhatsApp booking. 10 decisioni progettuali prese e documentate.

### ✅ Conferma lettura `database-architetture.md` — 5 punti chiave:

1. **Schema completo**: 35 tabelle v1, 40 totali (v1+v2), organizzate in 10 aree funzionali — da Business & Abbonamenti fino ad Admin & Platform. 12 decisioni architetturali definitive documentate con alternative e motivazioni.
2. **Multi-tenancy**: Ogni tabella ha `tenant_id` (tranne 4 globali). RLS obbligatorie su ogni tabella. Funzione helper `get_my_tenant_id()` STABLE per performance. Indici espliciti su tutte le colonne filtrate nelle RLS.
3. **Strutture chiave**: Appointments con exclusion constraint (no sovrapposizioni), prezzi snapshot, pagamenti separati dagli appuntamenti, client_analytics pre-calcolati (trigger + cron notturno), loyalty con versioning immutabile delle config.
4. **Sicurezza e GDPR**: Soft delete con `deleted_at` + `deleted_by` per audit trail. `client_consents` per consensi granulari con timestamp e IP. `client_notes` sempre private (tabella separata). `audit_log` per operazioni sensibili.
5. **Piano operativo**: Ordine di creazione 33 tabelle con dipendenze FK. Piano di indicizzazione con 21 indici critici. Retention policy per dati (24 mesi messages_log, 6 mesi notifiche, 36 mesi audit_log). 8 rischi architetturali identificati con mitigazioni.

---

## FASE 1 — Analisi di Mercato Online (Ricerca Web)

### 1.1 — Dimensione del Mercato 2025-2026

| Segmento | Dimensione 2025 | Dimensione 2026 | CAGR (→ 2030/32) | Fonte |
|----------|-----------------|-----------------|-------------------|-------|
| Barbershop Software (globale) | $700M – $1.45B | ~$1.3 – $1.5B | 8 – 10.3% | ReportPrime, VerifiedMarketReports, FutureMarketReport |
| Salon Management Software (globale) | $1.24B | $1.36B | 9.6 – 9.9% | The Business Research Company |
| Settore hairstyling Italia | €16.5B fatturato (2024) | €18.1B (proiezione) | +9.8% | ItaliaInsights, IlMioBusinessPlan |
| Digital transformation barber industry | — | — | 15.2% (2024-2030) | Gitnux |
| Mercato gamification globale | — | — | → $49B entro 2029 | Industry reports |

**Driver principali della crescita:**
- Adozione massiva di soluzioni cloud/SaaS per accessibilità e scalabilità
- Domanda crescente di prenotazione digitale e mobile-first
- CRM e strumenti di retention per migliorare il repeat business
- AI e automazione (scheduling optimization, marketing, engagement)
- Europa e Asia-Pacifico come regioni a crescita più rapida

**Implicazioni per Styll:** Il mercato è in forte espansione con un CAGR solido. Il segmento "software per barbieri" è ancora frammentato — non c'è un vincitore assoluto nel tier accessibile con focus retention. Styll si inserisce in una finestra di opportunità reale.

---

### 1.2 — Trend Emergenti 2025-2026

| Trend | Descrizione | Rilevanza per Styll |
|-------|-------------|---------------------|
| **AI-powered personalization** | Suggerimenti automatici, scheduling optimization, marketing personalizzato. Il 64% dei clienti preferisce offerte AI-driven (Zenoti) | 🔴 Alta — AI Coach è nella roadmap v3. Il trend valida la direzione |
| **Subscription/membership models** | Modelli di abbonamento per tagli (mercato $5.2B entro 2025). Clienti pagano una quota fissa mensile per servizi illimitati o scontati | 🟡 Media — membership management è in v2. Trend da monitorare |
| **Embedded finance** | Pagamenti integrati, BNPL (Buy Now Pay Later), depositi smart, mance digitali | 🟡 Media — tabella `payments` già pronta per Stripe in v2 |
| **Super-app verticali** | Piattaforme all-in-one che coprono booking + CRM + loyalty + marketing + payments in un unico ecosistema | 🔴 Alta — è esattamente ciò che Styll sta costruendo |
| **Gamification nella fidelizzazione** | Streak, badge, livelli, sfide — provato da Duolingo (+48% engagement), Starbucks (28M membri). Mercato gamification: $49B entro 2029 | 🔴 Alta — è il nostro blue ocean. NESSUN competitor nel beauty/barber lo offre |
| **WhatsApp Business API** | Canale dominante in Italia per comunicazione business. Costi utility: €0.0248/msg. User-initiated: gratis | 🔴 Alta — integrazione WhatsApp prevista. Fondamentale per il mercato italiano |
| **PWA vs App Native** | Le PWA stanno raggiungendo parità funzionale con le app native (push notifications, offline, installabilità) | 🔴 Alta — la scelta PWA è validata dal trend. Costo di sviluppo molto inferiore |
| **Data ownership e GDPR** | Crescente attenzione alla proprietà dei dati. I professionisti vogliono controllo sui propri dati clienti | 🔴 Alta — "I tuoi dati sono tuoi" è un pilastro di Styll |

**Implicazioni per Styll:** Tutti i macro-trend confermano le scelte progettuali già fatte. La gamification è il differenziatore più forte — nessuno la offre nel settore. Il timing è perfetto.

---

### 1.3 — Mercato Italiano Specifico

**Dimensione del mercato:**
- **137.730 attività** di barbieri e parrucchieri in Italia (dati settore)
- **82.7% micro-imprenditori individuali** — il target perfetto per Styll
- Fatturato settore hairstyling: **€16.5 miliardi** (2024), proiezione **€18.1 miliardi** (2025)
- Crescita del +9.8% rispetto all'anno precedente

**Tasso di digitalizzazione:**
- **75%** dei barbershop urbani europei ha integrato strumenti digitali di scheduling e social media (Gitnux)
- In Italia il tasso è inferiore alla media europea: la digitalizzazione è partita dopo il COVID ed è concentrata nelle grandi città
- Le zone rurali e i saloni più piccoli sono ancora in transizione — **opportunità enorme**
- Previsione: entro il 2028, l'85% dei saloni a livello mondiale userà strumenti di personalizzazione AI

**Player locali italiani:**

| Software | Tipo | Target | Note |
|----------|------|--------|------|
| **Barberly** | Brandizzato, app dedicata | Barbieri EU | Il più vicino a Styll. App su App Store per ogni barbiere. Buone review (4.5-4.8). ~$25/mese |
| **Solhair** | Gestionale cloud | Parrucchieri | Software gestionale italiano. Agenda, CRM, POS, marketing |
| **BeautyCheck** | Gestionale | Parrucchieri e barber shop | Software per parrucchieri con IoT, self check-in |
| **Koibox** | Gestionale cloud | Beauty & wellness | Spagnolo, espansione in Italia. CRM, booking, marketing |
| **Magnolia-Pro** | Gestionale | Saloni, SPA, centri estetici | Italiano, più orientato a centri estetici/SPA |
| **Anolla** | Booking software | Barbieri | Software di prenotazione per barbieri, gratuito |

**Nessuno di questi player locali offre:**
- Gamification nella loyalty
- Silent Churn Detection
- Win-back automatico
- White-label PWA con brand del barbiere

**Implicazioni per Styll:** L'Italia è un mercato frammentato con 137K potenziali clienti, la maggior parte micro-imprenditori. Nessun player locale ha un posizionamento "retention-first". C'è spazio enorme per un prodotto moderno, accessibile e focalizzato sulla fidelizzazione.

---

### 1.4 — Barriere all'Adozione

| Barriera | Descrizione | Gravità | Come Styll la supera |
|----------|-------------|---------|----------------------|
| **Costo percepito** | "Non posso permettermi un software" — molti barbieri hanno margini bassi | 🔴 Alta | Trial gratuito 14 giorni + Tier 1 a €19-29/mese (meno di un taglio) |
| **Complessità** | "È troppo complicato, non sono un tecnico" — persona Roberto (54 anni) | 🔴 Alta | Setup in < 8 minuti. Wizard 5 step. Template precompilati. Zero gergo tecnico |
| **Fiducia** | "L'ultimo software mi ha fregato con costi nascosti" — frustrazione universale (vedi 7 lamentele) | 🔴 Alta | Pricing radicalmente trasparente. Un prezzo, niente sorprese. Export dati sempre gratis |
| **Lingua** | La maggior parte dei software è in inglese o con traduzioni mediocri | 🟡 Media | Styll nasce in italiano per il mercato italiano. Tone of voice studiato per il target |
| **Inerzia/abitudine** | "Ho sempre usato WhatsApp e agenda, funziona" | 🟡 Media | Mostrare il valore: "Sai quanti clienti stai perdendo senza saperlo?" — il Silent Churn Detector |
| **Paura del cambiamento** | "E se perdo i dati nel passaggio?" | 🟡 Media | Migrazione concierge gratuita in 24h. "Mandaci il file, ci pensiamo noi" |
| **Diffidenza verso la tecnologia** | Barbieri più anziani non si fidano dei sistemi digitali | 🟢 Bassa | Il sistema funziona anche per i clienti senza app (Roberto). SMS come canale. CRM gestito dal barbiere |
| **Mancanza di percezione del problema** | "I miei clienti tornano sempre" — non vedono il churn silenzioso | 🔴 Alta | Demo che mostra: "Hai 15 clienti che non vengono da 45+ giorni. Lo sapevi?" |

**Implicazioni per Styll:** Le barriere sono superabili. Le tre più critiche (costo, complessità, fiducia) sono esattamente i punti su cui Styll si differenzia. Il messaging deve enfatizzare: semplicità, trasparenza, valore immediato.

---

### 1.5 — Opportunità di Timing

**Perché ORA è il momento giusto per lanciare Styll in Italia:**

1. **Post-COVID digital acceleration**: La pandemia ha forzato la digitalizzazione anche dei piccoli. I barbieri che prima rifiutavano il digitale ora lo cercano attivamente. La finestra è aperta ma si chiuderà man mano che i competitor internazionali si localizzeranno.

2. **Mercato frammentato senza leader locale**: Nessun player italiano ha conquistato il segmento "retention-first per barbieri". Fresha e Booksy sono internazionali e marketplace. I gestionali italiani (Solhair, BeautyCheck) sono generici e senza innovazione.

3. **WhatsApp Business API maturo**: L'API è ora stabile, i costi sono scesi (€0.0248 per messaggio utility), e l'Italia è uno dei paesi con la più alta penetrazione di WhatsApp. Il canale perfetto per raggiungere i barbieri.

4. **PWA technology maturity**: Le PWA nel 2025 supportano push notifications (anche su iOS da 16.4+), installabilità, offline mode. Non serve più l'App Store — un vantaggio enorme per costi e time-to-market.

5. **Gamification trend in crescita**: Il mercato della gamification cresce verso $49B entro 2029. Duolingo ha dimostrato che funziona (+48% engagement). Nessuno l'ha ancora applicata al settore barber/beauty — first-mover advantage.

6. **Supabase ecosystem maturity**: Supabase nel 2025 è production-ready con RLS, Edge Functions, Realtime, pg_cron. Stack perfetto per un progetto di tesi che deve diventare prodotto.

7. **Crescita economica del settore**: Il settore hairstyling in Italia cresce del 9.8% — i barbieri hanno budget per investire in strumenti che li aiutino a crescere.

**Action items Fase 1:**
- [ ] Aggiornare i dati di mercato nel capitolo 1 della tesi con i numeri 2025-2026
- [ ] Includere la tabella player locali italiani nell'analisi competitor
- [ ] Usare le barriere all'adozione per informare il copy della landing page
- [ ] Enfatizzare il timing nell'executive summary della tesi

---

## FASE 2 — Analisi Prodotto dei Competitor (Deep Dive Tecnico)

### Tabella Comparativa Completa — Competitor Prioritari

| Area | **Fresha** | **Barberly** | **GlossGenius** | **Phorest** |
|------|-----------|-------------|----------------|------------|
| **Onboarding** | ~5-10 min, wizard semplice. Import dati limitato. | ~15 min, form multi-step. No import automatico. | ~10 min, mobile-first, wizard step-by-step. Veloce e intuitivo. | ~30 giorni con concierge dedicato. Import completo assistito. |
| **Booking flow (cliente)** | 3-5 tap. Richiede account Fresha. Marketplace search → scegli → prenota. | 3-4 tap. App brandizzata del barbiere su App Store. Veloce. | 3 tap. Login-free booking. Mobile-optimized. Eccellente UX. | 4-6 tap. Online booking. Meno intuitivo dei competitor. |
| **Dashboard (barbiere)** | Funzionale ma generica. Desktop-oriented. KPI base (revenue, bookings). | Semplice e pulita. Mobile-friendly. KPI base. | Bellissima, minimalista, mobile-first. KPI chiari. Benchmark design. | Complessa, potente. Troppe info per piccoli. Desktop-first. |
| **CRM / Profilo cliente** | Profilo base: nome, contatti, storico. Note. Nessun churn detection. | Profilo base con note. Storico appuntamenti. | Profilo dettagliato con comunicazione. Nessun churn score. | Profilo completo. Storico dettagliato. Feedback tracking. Migliore CRM. |
| **Loyalty** | Add-on a **$59.95/mese** per sede. Punti base. Nessuna gamification. | ✅ Inclusa. Basica (punti → reward). Nessuna gamification. | ❌ Base (solo nei tier alti). Membership. Nessuna gamification. | ✅ TreatCard — migliore del settore. Punti per €1 speso → reward. Ma nessuna gamification. |
| **Retention tools** | ❌ Nessun win-back. Nessun churn detection. Solo reminder. | ❌ Nessun win-back. Solo reminder automatici. | ❌ Nessun win-back. Waitlist. Rebooking prompts. | ✅ ReConnect (win-back automatico). Best-in-class. Automated rebooking. |
| **Messaggistica** | SMS + Email. WhatsApp parziale. 100 SMS gratuiti poi $0.02/SMS. | SMS + Email. Reminder automatici. | SMS + Email. Conferme e reminder. | SMS + Email. Marketing automation. Campagne. |
| **Branding / White-label** | ❌ Il brand Fresha domina. Il barbiere è su "Fresha", non sulla "sua" app. | ✅ App brandizzata su App Store con nome e logo del barbiere. Migliore in questo. | ⚠️ Parziale. Nome GlossGenius visibile. Branding limitato. | ✅ Branding del salone. Ma il nome Phorest è presente. |
| **Pricing** | $19.95/mese solo + $14.95/team. Commissione 20% nuovi clienti. Fee transazioni 2.29-2.79%. Loyalty +$59.95. **Costi nascosti fino a +70%** | ~$25/mese. Pricing semplice. Nessuna commissione marketplace. | $24/mese Standard, $48 Gold, $148 Platinum. Fee 2.6% flat. Feature bloccate nei tier alti. | Custom pricing ($99+). Contratti annuali. Export dati $295. |
| **Tecnologia** | Web app + app native iOS/Android. Cloud-based (probabilmente AWS). | App native iOS/Android per ogni barbiere. Web dashboard. | Web app + PWA. Mobile-first. Design eccellente. | Web app + app mobile. Desktop-first. |
| **Punti deboli** | Commissioni nascoste, brand del barbiere invisibile, loyalty cara, supporto AI/template, lock-in | Zero innovazione retention, no churn detection, no win-back, no gamification | Feature bloccate nei tier costosi, no retention, no loyalty seria, calendario non sync | Troppo caro ($99+), troppo complesso per piccoli, contratti vincolanti, export dati $295 |

### Competitor Secondari — Analisi Rapida

| Competitor | Target | Prezzo | Punti di forza | Punti deboli | Rilevanza per Styll |
|-----------|--------|--------|----------------|--------------|---------------------|
| **Booksy** | Globale | $29.99/mese | Grande marketplace, boost a pagamento | Fee nascoste, supporto lento, "Boost" costoso | Bassa — marketplace, non competitor diretto |
| **theCut** | Barbieri US | Gratis (base) | 100% barber, 10M utenti, discovery gratuita | Solo US, supporto pessimo, truffe segnalate su BBB | Bassa — solo mercato US |
| **Squire** | Barbershop premium | Premium | POS completo, commissioni calcolo, team management | UX confusa, venditori aggressivi, complesso, caro | Bassa — troppo enterprise |
| **Mangomint** | Saloni premium | $165+/mese | UX pulitissima (4.9/5 Capterra), automazioni intelligenti | Molto caro, onboarding 30 giorni, non per barbieri singoli | Media — benchmark UX per dashboard |
| **Vagaro** | Beauty/wellness | $30/mese | All-in-one, marketplace, marketing, payroll | Generico, non specializzato barber, UX mediocre | Bassa — troppo generico |
| **Boulevard** | Saloni luxury | $175+/mese | CRM avanzato, client experience premium | Troppo caro, troppo enterprise, non per micro-barbieri | Bassa — segmento diverso |

### Mappa Posizionamento Aggiornata

```
                     RETENTION ↑
                          |
             Phorest      |      STYLL
           ($99+, grandi) |  (€19-29, piccoli)
                          |  [GAMIFICATION — UNICI]
     ─────────────────────┼──────────────────────
                          |
          Barberly        |     GlossGenius
       (€25, semplice,   |  ($24, bellissimo,
        zero retention)   |    zero retention)
                          |
                     RETENTION ↓

     ← SEMPLICE                    COMPLESSO →
```

**Implicazioni per Styll:**
- Nessun competitor nel quadrante "alta retention + accessibile + semplice"
- La gamification è un differenziatore assoluto — first-mover advantage
- Barberly è il competitor diretto più pericoloso: stesso approccio white-label, prezzo simile. Ma non ha retention
- Phorest valida che la retention funziona, ma lo fa a un prezzo inaccessibile per il target

**Action items Fase 2:**
- [ ] Studiare l'onboarding di GlossGenius come benchmark UX
- [ ] Replicare il modello TreatCard di Phorest ma incluso nel prezzo e gamificato
- [ ] Enfatizzare nella landing page il confronto "Con Fresha il brand è loro / Con Styll il brand è tuo"
- [ ] Monitorare Barberly: se aggiungono retention, reagire rapidamente

---

## FASE 3 — Reverse Engineering Fresha (Studio Approfondito)

### 3.1 — Flusso di Registrazione Completo

1. **Homepage**: "Get Started Free" → form con email e nome business
2. **Step 1**: Tipo di business (Hair, Barber, Beauty, Nails, Wellness, Other)
3. **Step 2**: Nome del salone + indirizzo completo (con Google Places autocomplete)
4. **Step 3**: Numero di staff (1, 2-5, 6-15, 16+) — determina il pricing
5. **Step 4**: Servizi — precompilati per categoria con prezzo e durata suggeriti, modificabili
6. **Step 5**: Orari di apertura — template standard (Lun-Sab 9-18), modificabile per giorno
7. **Step 6**: Invito team members via email
8. **Step 7**: Setup pagamenti (collegamento Stripe/Fresha Payments) — opzionale, skip possibile
9. **Conferma**: Dashboard attiva, tutorial interattivo opzionale

**Tempo totale**: ~5-10 minuti per barbiere singolo, ~15-20 per team
**Cosa manca**: Import dati da altro software, import clienti, import da Google Business Profile

### 3.2 — Booking Flow Cliente

1. **Accesso**: Da link diretto, marketplace Fresha, o social (Instagram/Facebook booking button)
2. **Selezione servizio**: Lista servizi con prezzo e durata. Selezione multipla possibile.
3. **Selezione staff**: Scegli il professionista o "primo disponibile"
4. **Selezione data/ora**: Calendario con slot disponibili. Vista settimanale.
5. **Account**: **Richiesto** — login con email/social. Frizione significativa per nuovi utenti.
6. **Conferma**: Riepilogo + conferma. Opzione deposito/pagamento anticipato se attivato dal business.
7. **Post-booking**: Email di conferma + possibilità di aggiungere al calendario

**Punti di forza**: Flusso chiaro, multi-servizio, selezione staff, integrazione social booking
**Punti deboli**: Account obbligatorio (frizione), il brand Fresha domina l'esperienza, nessun reward/loyalty visibile nel flusso

### 3.3 — Dashboard Barbiere

**Layout**: Sidebar sinistra con navigazione, area centrale con calendario/dati
**Sezioni principali**:
- Home (overview giornaliera)
- Calendar (vista giorno/settimana, drag & drop, colori per staff)
- Sales (POS, inventario, fatturazione)
- Clients (CRM base, storico, note)
- Marketing (campagne, promozioni)
- Analytics (revenue, bookings, staff performance)
- Settings (business info, team, servizi, orari, pagamenti)

**KPI visibili nella Home**: Revenue giornaliero, appuntamenti oggi, nuovi clienti questa settimana
**Mobile**: Funzionale ma non ottimizzata. Desktop-first design.

### 3.4 — Sistema di Notifiche

| Tipo | Canale | Quando | Nota |
|------|--------|--------|------|
| Conferma prenotazione | Email + SMS | Subito dopo la prenotazione | Automatico |
| Reminder | SMS/Email | 24h e 2h prima dell'appuntamento | Configurabile |
| Cancellazione | Email + SMS | Al momento della cancellazione | Automatico |
| No-show | Email al business | Dopo l'orario dell'appuntamento | Solo per il barbiere |
| Marketing campaigns | SMS/Email | Programmabili dal barbiere | Costo extra |
| Nuova prenotazione | Push/Email al barbiere | In tempo reale | Nella dashboard |

**Cosa manca**: Nessun alert churn, nessun win-back automatico, nessuna notifica "questo cliente non viene da X giorni"

### 3.5 — Loyalty (Add-on $59.95/mese)

- **Costo**: $59.95/mese per sede — molto caro per un barbiere singolo
- **Meccanica**: Punti per visita o per importo speso
- **Reward**: Configurabili dal barbiere (sconto, servizio gratis, prodotto)
- **Visibilità cliente**: Sezione dedicata nel profilo Fresha
- **Gamification**: ❌ ZERO. Solo punti → reward. No streak, no badge, no livelli, no sfide
- **White-label**: ❌ Il loyalty è branded "Fresha", non con il brand del barbiere

### 3.6 — Gestione Pagamenti

- **Fresha Payments**: Terminale proprietario ($139 una tantum)
- **Fee online**: 2.79% + $0.20 per transazione
- **Fee in-person**: 2.29% + $0.20 per transazione
- **Commissione marketplace**: 20% sul primo appuntamento di ogni nuovo cliente dal marketplace (minimo $6)
- **PCI compliance**: Gestita da Fresha (tokenizzazione via Stripe/Adyen)
- **Depositi/No-show fee**: Configurabili dal barbiere

### 3.7 — Multi-staff

- **Ruoli**: Owner + Team Members (solo 2 livelli, poco granulare)
- **Permessi**: Team members hanno accesso limitato ma non configurabile in dettaglio
- **Calendario**: Vista multi-staff con colonne affiancate
- **Invito**: Via email, accettazione con creazione account

### 3.8 — Calendario

- **Viste**: Giorno e settimana (no mese)
- **Drag & drop**: ✅ Per spostare appuntamenti
- **Colori**: Per staff member, non per tipo di servizio
- **Blocchi tempo**: Possibilità di bloccare slot (pausa, personale)
- **Sync**: Google Calendar sync disponibile

### 3.9 — Marketing Tools

- **Campagne SMS/Email**: Template pre-configurati + personalizzabili
- **Promozioni**: Sconti %, last-minute deals
- **Social**: Pulsante "Book on Instagram/Facebook" integrabile
- **Reputation**: Nessun tool di gestione recensioni integrato
- **Template social**: ❌ Nessun template per Instagram Stories/post

### 3.10 — API e Integrazioni

- **API pubblica**: ❌ Non disponibile. API interna non documentata pubblicamente
- **Webhook**: Limitati — nessun webhook pubblico per sviluppatori terzi
- **Integrazioni**: Google Calendar sync, Facebook/Instagram booking, Zapier (limitato)
- **Export dati**: CSV export disponibile per clienti e appuntamenti

---

### 10 Cose che Fresha Fa MEGLIO (da replicare/migliorare)

| # | Cosa fa bene | Perché funziona | Come Styll può farlo meglio |
|---|-------------|-----------------|----------------------------|
| 1 | **Prezzo d'ingresso basso** ($19.95/mese) | Abbatte la barriera costo. Growth esplosiva | Prezzo comparabile (€19-29) MA con loyalty INCLUSA (non +$59.95) |
| 2 | **Booking integrato con social** (Instagram/Facebook) | I clienti trovano il barbiere dove già sono | Stessa funzionalità in v1. Deep link alla PWA brandizzata |
| 3 | **Calendario con drag & drop** | Intuitivo per gestire cambiamenti al volo | Replicare + aggiungere colori per SERVIZIO oltre che per staff |
| 4 | **Setup servizi precompilati** per categoria | Riduce il tempo di onboarding | Migliorare con template servizi italiani (prezzi in € realistici) |
| 5 | **POS integrato con inventario** | Un unico punto per gestire vendite e stock | Replicare in v1 con catalogo prodotti + giacenza base |
| 6 | **Multi-staff scheduling** | Vista affiancata chiara per team | Stesso approccio + permessi più granulari (4 ruoli vs 2) |
| 7 | **Google Places autocomplete** al setup | Velocizza l'inserimento indirizzo e dati | Replicare + aggiungere import da Google Business Profile |
| 8 | **Reminder automatici** configurabili | Riduce no-show del 30-50% | Replicare + aggiungere cascata intelligente (Push → WhatsApp → SMS) |
| 9 | **Marketplace come canale di acquisizione** | Porta nuovi clienti al barbiere | NON replicare il marketplace. Ma offrire template social per acquisizione organica |
| 10 | **Report analytics** con revenue/bookings | Il barbiere vede l'impatto del software | Replicare + aggiungere KPI retention (churn rate, retention %, VIP score) |

### 10 Cose che Fresha Fa MALE (da NON copiare)

| # | Errore/Limite | Impatto | Come Styll lo risolve |
|---|--------------|---------|----------------------|
| 1 | **Loyalty a pagamento** ($59.95/mese extra) | I piccoli non se la possono permettere → loyalty inaccessibile | Loyalty INCLUSA in ogni tier. Gamificata. Zero costi extra |
| 2 | **Commissione 20% nuovi clienti** dal marketplace | Costo nascosto significativo per barbieri in crescita | ZERO commissioni. Mai. Pricing trasparente |
| 3 | **Il brand Fresha domina** l'esperienza cliente | Il cliente prenota "su Fresha", non "dal suo barbiere" | White-label totale. Il cliente vede SOLO il brand del barbiere |
| 4 | **Account obbligatorio** per prenotare | Frizione enorme. Molti potenziali clienti abbandonano | Prenotazione guest possibile (solo nome + telefono). Account opzionale per loyalty |
| 5 | **Zero churn detection** | Il barbiere non sa chi sta perdendo | Silent Churn Detector in v1. Semaforo 🟢🟡🔴 per ogni cliente |
| 6 | **Zero win-back** automatico | Nessuno strumento per riportare clienti inattivi | Win-back con un tap in v1. Automatico in v2 |
| 7 | **Supporto con template AI** senza umani | Frustrante per problemi complessi. Lamentela #2 universale | Supporto umano come differenziatore. Chat con persona reale |
| 8 | **Costi nascosti** (fee crescono) | Lamentela #1 universale. Percezione di "trappola" | Un prezzo. Niente sorprese. Tutto chiaro dal giorno 1 |
| 9 | **Lock-in** (difficile uscire e portare i dati) | Lamentela #3 universale. Il barbiere si sente ostaggio | Export dati SEMPRE gratis. Migrazione concierge gratis anche IN e OUT |
| 10 | **Nessuna gamification** nella loyalty | Punti base = noiosi. Engagement basso. | Streak, badge, livelli, sfide. Come Duolingo per il barbiere. +48% engagement |

**Implicazioni per Styll:**
Fresha è il leader per volume, ma ha errori strutturali che creano frustrazione. Ogni errore di Fresha è un'opportunità per Styll. Il messaging commerciale dovrebbe fare confronto diretto: "Con Fresha paghi $60/mese per una loyalty basica. Con Styll hai gamification, churn detection e win-back inclusi."

**Action items Fase 3:**
- [ ] Creare una pagina "Styll vs Fresha" nella landing page con confronto diretto
- [ ] Registrarsi a Fresha per trial e documentare screenshot di ogni flusso
- [ ] Usare le 10 frustrazioni come base per il copy di marketing
- [ ] Implementare il booking senza account obbligatorio come differenziatore UX

---

## FASE 4 — Analisi Infrastruttura Tecnica dei Competitor

### Tabella Comparativa Stack Tecnologici

| Area | **Fresha** | **Barberly** | **GlossGenius** | **Phorest** | **Styll** |
|------|-----------|-------------|----------------|------------|-----------|
| **Cloud Provider** | AWS (probabile) | N/D | AWS/GCP (probabile) | AWS (confermato da job listings) | **Supabase (su AWS)** |
| **Frontend Web** | React o Angular (SPA) | Dashboard web | React (probabile) | Angular/React | **React** |
| **App Client** | Native iOS + Android | Native iOS + Android (per ogni barbiere) | PWA + Web app | Native iOS + Android | **PWA** |
| **Backend** | Node.js o .NET Core (microservizi) | N/D | Node.js (probabile) | .NET / Java | **Supabase Edge Functions (Deno)** |
| **Database** | PostgreSQL o MySQL (cloud-managed) | N/D | PostgreSQL (probabile) | SQL Server o PostgreSQL | **PostgreSQL (Supabase)** |
| **Architettura** | Microservizi multi-tenant | Monolite probabile | Microservizi (probabile) | Microservizi | **Monolite multi-tenant (Supabase)** |
| **Multi-tenancy** | Shared DB con isolation logica | App separate per ogni barbiere (!) | Shared DB | Shared DB + sharding probabile | **Shared tables + RLS** |
| **API** | REST interna (non pubblica) | Non pubblica | Non pubblica | REST/GraphQL (non pubblica) | **Supabase auto-generated REST + Realtime** |
| **Pagamenti** | Adyen + Fresha Payments (proprietario) | Stripe (probabile) | Square (built-in) | Stripe + terminali POS | **Stripe (v2)** |
| **Messaggistica** | Twilio/custom (SMS + Email) | N/D | Twilio (probabile) | Twilio/MessageBird | **MessageBird/Infobip (v1)** |
| **Real-time** | WebSocket per calendario | N/D | N/D | WebSocket probabile | **Supabase Realtime** |
| **CDN/Hosting** | CloudFlare + AWS | N/D | CloudFlare (probabile) | AWS CloudFront | **Supabase Storage + CDN** |
| **Auth** | OAuth2 + email/social | Email + social | Email + social + Apple | OAuth2 + SSO | **Supabase Auth (email + OTP telefono)** |
| **Scalabilità** | 450K+ business, probabilmente sharding + read replicas + caching (Redis) | Piccola scala (migliaia) | Media scala (decine di migliaia) | Grande scala (migliaia di saloni) | **1K-10K tenant target v1-v2** |

### Come si Posiziona il Nostro Stack (React + Supabase)

**✅ Vantaggi dello stack Styll:**

| Vantaggio | Dettaglio |
|-----------|----------|
| **Costo iniziale molto basso** | Supabase Free: 500MB DB, 1GB storage, 50K auth users. Pro: $25/mese. Nessun costo infrastruttura separato |
| **RLS nativo** | Row Level Security integrato in PostgreSQL. Multi-tenancy a livello di database senza codice applicativo |
| **Realtime out-of-the-box** | Supabase Realtime per aggiornamenti calendario in tempo reale. Zero setup WebSocket |
| **Auth integrata** | Supabase Auth con email, OTP telefono, social login. Zero backend da scrivere per l'auth |
| **Edge Functions** | Calcolo slot, logica business sicura, webhook handler. Deploy istantaneo |
| **Auto-generated API** | REST API generata automaticamente dallo schema. Nessun backend API da scrivere e mantenere |
| **PWA vs App native** | Un'unica codebase web vs 3 codebase (web + iOS + Android). Costo e tempo di sviluppo 3-5x inferiore |
| **PostgreSQL power** | Exclusion constraints, partial indexes, JSONB, pg_cron — funzionalità enterprise a costo zero |
| **Open source** | Supabase è open source. Possibilità di self-hosting se necessario. No vendor lock-in totale |

**⚠️ Limiti dello stack Styll:**

| Limite | Dettaglio | Mitigazione |
|--------|----------|-------------|
| **Supabase vendor dependency** | Se Supabase ha downtime, Styll è down. No failover automatico | Supabase ha 99.9% SLA sul tier Pro. Backup giornaliero automatico. Self-hosting possibile come fallback |
| **PWA push notifications** | iOS le supporta dal 16.4+ ma con limitazioni. Non tutti gli utenti le abilitano | Cascata canali: Push → WhatsApp → SMS → Email. Mai dipendere da un solo canale |
| **Edge Functions cold start** | Le Edge Functions hanno cold start di ~200-500ms | Accettabile per calcolo slot. Per real-time usare Supabase Realtime, non Edge Functions |
| **Nessun app store presence** | La PWA non è sull'App Store. Meno visibilità e "credibilità" percepita | Il barbiere condivide il link diretto. Template social con QR code. Il vantaggio è: zero approvazione Apple |
| **Supabase Pro limits** | 8GB DB, 100GB storage, 500 Edge Function invocations/sec | Sufficienti per v1 (1K tenant). Team tier a $599/mese per scalare |
| **Nessuna API pubblica competitor** | Non possiamo fare import automatico da Fresha/Booksy | CSV import + migrazione concierge manuale. In v2 valutare scraping etico |

**Implicazioni per Styll:**
Lo stack React + Supabase è il migliore per un progetto di tesi che deve diventare prodotto. Costo quasi zero per iniziare, features enterprise (RLS, Realtime, Edge Functions), e un percorso di scalabilità chiaro. I limiti sono gestibili e documentati.

**Action items Fase 4:**
- [ ] Monitorare i job listings di Fresha per capire il loro stack reale
- [ ] Testare Supabase Realtime per aggiornamenti calendario in tempo reale
- [ ] Verificare i limiti PWA push su iOS nella versione più recente di Safari
- [ ] Pianificare la migrazione a Supabase Team tier quando si superano i 1K tenant

---

## FASE 5 — Analisi Criticità della Nostra Infrastruttura

### 5.1 — Criticità dello Schema Database

| # | Area | Criticità | Gravità | Dettaglio |
|---|------|-----------|---------|-----------|
| 1 | **Normalizzazione** | Schema ben normalizzato — nessun problema critico | 🟢 | Le tabelle sono correttamente separate (servizi vs prodotti, appointments vs payments, clients vs client_notes). Nessuna God Table. |
| 2 | **Relazioni** | `appointments.client_id` dovrebbe essere nullable per walk-in anonimi | 🟡 | Un walk-in senza nome (raro ma possibile) non ha un record `clients`. Soluzione: permettere `client_id` nullable oppure creare un client "anonimo" al volo. |
| 3 | **RLS policy** | Rischio di policy mal configurate — il rischio #1 | 🔴 | Una RLS sbagliata può esporre dati cross-tenant. Serve una suite di test automatica che per OGNI tabella verifichi l'isolamento. |
| 4 | **Performance RLS** | La funzione `get_my_tenant_id()` è un single point of performance | 🟡 | Se la funzione è lenta, OGNI query lo è. L'indice su `staff_members(tenant_id, profile_id) WHERE deleted_at IS NULL` è critico. Già previsto nel piano indici. |
| 5 | **Scalabilità 1K tenant** | A 1.000 tenant × 200 clienti = 200K righe in `clients` | 🟢 | Gli indici previsti nel piano sono sufficienti. PostgreSQL gestisce milioni di righe senza problemi con indici corretti. |
| 6 | **Scalabilità 10K tenant** | A 10.000 tenant: 2M clienti, 10M+ appuntamenti, 20M+ loyalty_transactions | 🟡 | `messages_log` e `audit_log` cresceranno rapidamente. La retention policy (24 mesi) mitiga. Valutare partitioning su `appointments` per `start_time` quando si superano 10M righe. |
| 7 | **Tipi di dato** | `price_at_booking` come DECIMAL senza precisione specificata | 🟡 | Dovrebbe essere `DECIMAL(10,2)` ovunque ci siano prezzi. Il documento database specifica `DECIMAL(10,2)` per `payments.amount` ma non per `appointment_services.price_at_booking`. Uniformare. |
| 8 | **Indici mancanti** | `appointment_services(appointment_id)` e `appointment_products(appointment_id)` | 🟡 | Queste tabelle vengono sempre queryate con JOIN su `appointment_id`. L'indice non è nel piano attuale. Aggiungere. |
| 9 | **Soft delete coerenza** | Alcune tabelle hanno `deleted_at`, altre `is_active`, `staff_members` ha entrambi | 🟢 | La scelta è documentata e motivata (Decisione 8). La coerenza è rispettata: `deleted_at` per cose che "spariscono", `is_active` per cose che si "accendono/spengono". |
| 10 | **`client_loyalty` duplicazione** | `last_visit_date` è presente sia in `client_loyalty` che in `client_analytics` | 🟢 | La duplicazione è intenzionale: entrambe le tabelle sono pre-calcolate e aggiornate dal cron. Mantenerle sincronizzate nel cron notturno. |

### 5.2 — Criticità Architetturali

| # | Area | Criticità | Gravità | Dettaglio e Mitigazione |
|---|------|-----------|---------|------------------------|
| 1 | **Supabase come scelta** | Supabase è la scelta giusta? | 🟢 | **Sì per v1-v2**. RLS nativo, Realtime, Auth, Edge Functions, pg_cron — tutto ciò che serve. Il rischio è la vendor dependency, mitigata dall'open source. Per v3+ (AI, 10K+ tenant), potrebbe servire un backend custom. |
| 2 | **Real-time calendario** | Come gestiremo aggiornamenti in tempo reale? | 🟡 | **Supabase Realtime** su tabella `appointments` con filtro `tenant_id`. Ogni dashboard sottoscrive solo gli appuntamenti del suo tenant. Testare la latenza con 50+ sottoscrizioni simultanee. |
| 3 | **PWA push notifications** | Limiti su iOS e adoption rate | 🟡 | **iOS supporta dal 16.4** ma l'utente deve aggiungere la PWA alla Home Screen. Il permission prompt ha bassa conversione (~40%). **Mitigazione**: cascata Push → WhatsApp → SMS. Non dipendere MAI solo da push. |
| 4 | **Pagamenti futuri** | Come gestiremo Stripe in v2? | 🟡 | La tabella `payments` è già pronta con `stripe_payment_id`. Usare **Stripe Connect** per gestire pagamenti per conto dei barbieri. Webhook Supabase per ricevere conferme. PCI compliance gestita da Stripe. |
| 5 | **Sicurezza (RLS + Auth + GDPR)** | La sicurezza è adeguata? | 🟡 | RLS è la prima linea di difesa ma serve anche: rate limiting sulle API, validazione input nelle Edge Functions, CORS configurato correttamente, audit log per operazioni sensibili. **Creare una checklist di sicurezza pre-lancio.** |
| 6 | **Backup e Disaster Recovery** | Come gestiremo backup e ripristino? | 🟡 | Supabase Pro: backup giornaliero automatico con 7 giorni di retention. Point-in-time recovery disponibile. Per dati critici (clienti, appuntamenti): export periodico su storage esterno come safety net. |
| 7 | **Single points of failure** | Supabase è un SPOF? | 🟡 | **Sì**. Se Supabase ha downtime, Styll è inaccessibile. **Mitigazioni**: (1) Supabase ha SLA 99.9%, (2) la PWA può mostrare dati cached offline, (3) il barbiere ha sempre il telefono del cliente per emergenze. In v3+, valutare multi-region. |

### 5.3 — Criticità di Scalabilità

| # | Area | Criticità | Gravità | Dettaglio |
|---|------|-----------|---------|-----------|
| 1 | **Supabase Free tier** | 500MB DB, 1GB storage, 2GB bandwidth/mese | 🟡 | Sufficiente SOLO per sviluppo e testing. Non per produzione con clienti reali. Passare a Pro ($25/mese) prima del lancio beta. |
| 2 | **Supabase Pro tier** | 8GB DB, 100GB storage, 250GB bandwidth | 🟢 | Sufficiente per v1 (fino a ~1.000 tenant). Costo: $25/mese — sostenibile. |
| 3 | **Costi al crescere** | Supabase Team: $599/mese. Enterprise: custom | 🟡 | A 5K+ tenant, il revenue Styll (~€100K+/anno) copre ampiamente $599/mese. Il costo scala linearmente con i ricavi. |
| 4 | **Edge Functions** | 500 invocations/secondo (Pro), cold start 200-500ms | 🟡 | Calcolo slot è la funzione più chiamata. Con 100 barbieri attivi simultanei, ~10-20 invocations/sec. Ampio margine. Monitorare con dashboard Supabase. |
| 5 | **File/immagini** | Logo, foto prodotti, foto staff — Supabase Storage | 🟢 | 100GB storage su Pro. Un tenant usa ~5-10MB (logo + foto). 10K tenant = 50-100GB. Sufficiente. Comprimere immagini al upload (Sharp/Canvas). |
| 6 | **Rate limiting API** | Supabase non ha rate limiting granulare built-in | 🟡 | Implementare rate limiting nelle Edge Functions per: login (max 5 tentativi/min), booking (max 10/min per IP), API pubblica (max 100 req/min per tenant). |
| 7 | **Connessioni DB** | Supabase Pro: pooler da 200 connessioni (Session mode) | 🟡 | Con Supavisor (il pooler di Supabase), 200 connessioni coprono ~500-1000 utenti simultanei. Sufficienti per v1. Monitorare attentamente. |

### 5.4 — Proposte di Miglioramento

| # | Criticità | Gravità | Soluzione Proposta | Quando | Costo/Impatto |
|---|-----------|---------|-------------------|--------|---------------|
| 1 | RLS policy testing | 🔴 Critica | Suite di test automatica per ogni tabella: "utente tenant A non legge/scrive dati tenant B" | **v1** (pre-lancio) | Effort: 2-3 giorni. Impatto: sicurezza fondamentale |
| 2 | Tipi di dato DECIMAL | 🟡 Importante | Uniformare tutti i campi prezzo a `DECIMAL(10,2)` | **v1** | Effort: 1 ora. Impatto: precisione finanziaria |
| 3 | Indici mancanti | 🟡 Importante | Aggiungere indici su `appointment_services(appointment_id)`, `appointment_products(appointment_id)` | **v1** | Effort: 30 minuti. Impatto: performance query |
| 4 | Rate limiting | 🟡 Importante | Edge Function middleware per rate limiting per IP e per tenant | **v1** | Effort: 1 giorno. Impatto: sicurezza e protezione abuse |
| 5 | Checklist sicurezza pre-lancio | 🔴 Critica | CORS, CSP, input validation, RLS review, security headers | **v1** (pre-lancio) | Effort: 2 giorni. Impatto: sicurezza |
| 6 | Monitoring e alerting | 🟡 Importante | Supabase Dashboard + alert email se cron fallisce per 2 notti | **v1** | Effort: 1 giorno. Impatto: affidabilità operativa |
| 7 | Partitioning appointments | 🟢 Bassa | Partizionare `appointments` per trimestre quando > 10M righe | **v3** | Effort: 1 giorno. Impatto: performance query storiche |
| 8 | Multi-region / failover | 🟢 Bassa | Valutare Supabase multi-region o self-hosting come backup | **v3+** | Effort: settimane. Impatto: alta disponibilità |
| 9 | PWA offline mode | 🟡 Importante | Service Worker con cache per visualizzare appuntamenti di oggi anche offline | **v2** | Effort: 2-3 giorni. Impatto: UX per barbieri con connessione instabile |
| 10 | Export dati automatico | 🟢 Bassa | Cron settimanale che esporta un backup clienti/appuntamenti su Supabase Storage | **v2** | Effort: 1 giorno. Impatto: safety net |

**Implicazioni per Styll:**
Lo schema è solido e ben progettato. Le criticità sono tutte gestibili e nessuna richiede una riscrittura. Le priorità per v1 sono: (1) test RLS, (2) uniformare DECIMAL, (3) rate limiting, (4) checklist sicurezza.

**Action items Fase 5:**
- [ ] Creare suite di test RLS prima di qualsiasi deploy
- [ ] Uniformare tutti i campi prezzo a DECIMAL(10,2) nello schema SQL
- [ ] Aggiungere indici mancanti su appointment_services e appointment_products
- [ ] Implementare rate limiting nelle Edge Functions
- [ ] Creare checklist sicurezza pre-lancio

---

## FASE 6 — Feature Killer per Abbattere la Concorrenza

### 6.1 — Feature da Implementare Subito (v1) per Differenziarci al Lancio

Massimo 5 feature aggiuntive rispetto a quelle già pianificate:

| # | Feature | Cosa fa | Perché è killer | Effort stimato | Impatto |
|---|---------|---------|----------------|----------------|---------|
| 1 | **"Stai perdendo X clienti" — Alert visivo in dashboard** | All'apertura della dashboard, un banner prominente mostra: "Hai 7 clienti a rischio 🔴 questa settimana" con azione diretta | Nessun competitor mostra questo dato in modo così diretto. È il "wow moment" della demo | 2-3 giorni | 🔴 Altissimo — è il selling point #1 |
| 2 | **Booking senza account** (guest booking) | Il cliente prenota con solo nome + telefono. Nessun account richiesto. La loyalty si attiva quando/se fa login | Fresha richiede un account → frizione enorme. Styll elimina la barriera. Conversione booking +30-50% | 1-2 giorni | 🔴 Alto — riduce drasticamente l'abbandono nel booking |
| 3 | **QR code dinamico per vetrina** | Il barbiere stampa un QR code (generato nella dashboard) da mettere in vetrina. Il cliente scanna → vede servizi + prenota. Il QR si aggiorna se cambiano i servizi | Nessun competitor lo offre gratis in v1. È tangibile: il barbiere lo mette in vetrina e vede subito il risultato | 1 giorno | 🟡 Medio — effetto "wow" fisico nel negozio |
| 4 | **Messaggio win-back con un tap** | Dalla lista clienti 🔴 (a rischio), il barbiere preme un bottone → parte il messaggio WhatsApp/SMS personalizzato: "Ciao Marco, è un po' che non ti vediamo! Ti abbiamo riservato il tuo orario preferito" | Phorest lo fa con ReConnect ($99+/mese). Noi lo includiamo. Un tap = cliente ricontattato | 2-3 giorni | 🔴 Alto — è la promessa "retention" in azione |
| 5 | **Confronto visivo "prima/dopo Styll"** nella landing B2B | Mockup interattivo: il barbiere inserisce il nome del suo negozio → vede in real-time come apparirebbe la SUA app vs come appare su Fresha | Nessun competitor lo fa. È il momento "questo lo voglio" nella vendita. Conversion rate landing page +20-40% | 3-4 giorni | 🔴 Alto — converte prospect in trial |

### 6.2 — Feature da Copiare/Migliorare dai Competitor

| Competitor | Cosa fa bene | Come NOI lo facciamo MEGLIO |
|-----------|-------------|----------------------------|
| **Fresha** | Setup servizi precompilati per categoria | + Template servizi italiani con prezzi in € realistici per barbieri italiani + Import Google Business Profile |
| **Fresha** | Social booking (Instagram/Facebook button) | + Deep link alla PWA brandizzata (non alla piattaforma) + Template Stories pronti per promuoverlo |
| **GlossGenius** | UX mobile-first, design minimalista | + Stessa filosofia UX + Progressive complexity (Marco vede 30%, Sara vede 70%) |
| **Phorest** | TreatCard loyalty con punti per €1 | + Gamificata con streak, badge, livelli, sfide + INCLUSA nel prezzo (non $99+) |
| **Phorest** | ReConnect win-back automatico | + Un tap per il win-back in v1 + Automatico in v2 + A un prezzo accessibile |
| **Barberly** | App brandizzata su App Store per ogni barbiere | + PWA installabile senza App Store = zero costi, zero attesa approvazione, aggiornamenti istantanei |
| **Mangomint** | Dashboard pulita e modulare (4.9/5 Capterra) | + Stessa pulizia + KPI retention (churn, VIP score) che Mangomint non ha |

### 6.3 — Feature "Wow" per il Pitch Commerciale (demo 5 minuti)

Le feature che faranno dire al barbiere **"questo lo voglio"** in una demo live:

| # | Momento "Wow" | Come si dimostra in 5 minuti | Effetto emotivo |
|---|--------------|-------------------------------|-----------------|
| 1 | **"Ecco la TUA app"** | Il barbiere inserisce nome + logo → preview live della landing page brandizzata in 30 secondi | "È la MIA app, non di qualcun altro!" |
| 2 | **"Stai perdendo 7 clienti"** | Mostrare la dashboard con i clienti a rischio churn 🔴 con nome e giorni dall'ultima visita | "Non sapevo di star perdendo questi clienti..." |
| 3 | **"Un tap per riportarli"** | Click su un cliente 🔴 → messaggio win-back pre-compilato → "Invia" | "Così semplice? Posso farlo ogni giorno!" |
| 4 | **"I tuoi clienti hanno livelli"** | Mostrare la PWA con streak 🔥, punti, badge, barra progresso verso il prossimo reward | "È come un gioco! I miei clienti giovani lo adoreranno" |
| 5 | **"Prenota in 3 tap"** | Demo live del booking dalla PWA: servizio → data/ora → conferma. Senza account. | "Questo è più veloce di WhatsApp" |

### 6.4 — Feature per la Meta-Retention (far sì che i barbieri NON lascino Styll)

| # | Strategia | Come funziona | Switching cost |
|---|-----------|--------------|----------------|
| 1 | **Storico clienti diventa indispensabile** | Dopo 6 mesi, il barbiere ha 500+ visite tracciate, note per ogni cliente, metriche churn. Andare via = perdere questa intelligenza | Alto — i dati sono esportabili ma la vista aggregata no |
| 2 | **I clienti hanno la PWA installata** | I clienti prenotano tramite la PWA. Cambiare software = rieducare 200+ clienti a un nuovo link | Molto alto — il barbiere non vuole confondere i suoi clienti |
| 3 | **Gamification loyalty = engagement** | I clienti hanno streak, badge, livelli. Cambiare software = azzerare tutto. Il barbiere non vuole deludere i clienti fedeli | Molto alto — emotivo, non solo pratico |
| 4 | **Template social brandizzati** | Il barbiere usa i template Styll per Instagram. Il QR code punta alla PWA Styll. Cambiare = ristampare tutto | Medio — friction pratica |
| 5 | **Community di barbieri** | Gruppo WhatsApp/Telegram dei barbieri Styll della zona. Condivisione best practice, suggerimenti. Effetto network | Medio — il barbiere perde la community se lascia |
| 6 | **Migrazione IN gratuita, OUT facilitata** | "I tuoi dati sono tuoi, puoi andare via quando vuoi." Paradossalmente, la libertà riduce l'urgenza di andare via | Basso ma strategico — riduce la percezione di lock-in |

**Implicazioni per Styll:**
Le 5 feature aggiuntive per v1 sono realizzabili con ~10-15 giorni di effort totale e hanno un impatto altissimo sulla differenziazione e sulla conversione. La meta-retention si costruisce naturalmente col tempo — più il barbiere usa Styll, più è costoso andare via.

**Matrice Effort/Impatto:**

```
                    IMPATTO ↑
                         |
    "Stai perdendo       |    Alert churn dashboard
     X clienti"     ●────|────● Win-back un tap
                         |    ● Guest booking
    Confronto B2B   ●────|
                         |
    ─────────────────────┼──────────────────────
                         |
    QR vetrina      ●────|
                         |
                    IMPATTO ↓

    ← BASSO EFFORT           ALTO EFFORT →
```

**Action items Fase 6:**
- [ ] Implementare alert churn prominente in dashboard come prima feature
- [ ] Implementare guest booking (senza account obbligatorio)
- [ ] Creare generatore QR code dinamico nella dashboard
- [ ] Implementare win-back con un tap dalla lista clienti rossi
- [ ] Creare mockup interattivo per landing B2B

---

## FASE 7 — Prospect Commerciali (Zona Vicenza–Brescia)

### 7.1 — Metodologia di Ricerca Prospect

> **Nota**: I prospect specifici devono essere compilati attraverso ricerca diretta su Google Maps, Instagram, Facebook e Pagine Gialle. Di seguito forniamo la metodologia, i criteri di qualificazione e un template strutturato. Per una lista di prospect reali sono necessarie ricerche manuali localizzate.

**Criteri di qualificazione (in ordine di priorità):**
1. ⭐ Recensioni Google 4+ stelle con almeno 50 recensioni (indica cura per il brand)
2. 📱 Presenza Instagram attiva (post regolari, Stories, bio curata)
3. 🔗 Link prenotazione già in bio Instagram (indica predisposizione al digitale)
4. 🆕 Apertura recente (ultimi 12-24 mesi — più aperti all'innovazione)
5. 👥 Team piccolo (2-5 persone — target Tier 2 Growth)
6. 🏷️ Brand curato (logo professionale, arredamento moderno, foto di qualità)

**Città target (asse Vicenza–Brescia):**
Vicenza, Verona, Soave, Villafranca di Verona, Peschiera del Garda, Sirmione, Desenzano del Garda, Lonato del Garda, Brescia, e comuni intermedi.

**Template per ogni prospect:**

| Campo | Dettaglio |
|-------|----------|
| **Nome attività** | [Nome del barbershop] |
| **Città** | [Città] |
| **Instagram/Facebook** | [Link profili social] |
| **Recensioni Google** | [Media ⭐ + numero recensioni] |
| **Attualmente usa software?** | Fresha / Booksy / Barberly / Altro / Nessuno |
| **Numero staff (stimato)** | [1 / 2-3 / 4-5 / 6+] |
| **Perché è un buon prospect** | [Motivazione specifica] |
| **Contatto (se pubblico)** | [Telefono/email da Google Maps o social] |
| **Approccio consigliato** | [DM Instagram / Visita in negozio / Email / Telefono] |

**Strategia di ricerca su Google Maps:**
1. Cercare "barbiere" o "barber shop" in ogni città target
2. Filtrare per 4+ stelle
3. Controllare se hanno un sito web / link di prenotazione
4. Verificare il profilo Instagram (cercando il nome su Instagram)
5. Annotare se usano Fresha/Booksy (visibile dal link di prenotazione)

**Obiettivo: 30+ prospect qualificati, con priorità:**
- 🔴 10 prospect "caldi" — già digitali, brand forte, probabilmente frustrati dal tool attuale
- 🟡 10 prospect "tiepidi" — buon brand, social attivo, nessun software visibile
- 🟢 10 prospect "freddi" — buone recensioni ma poca presenza digitale, da educare

**Esempi di tipologie di prospect nella zona:**

| Tipologia | Esempio profilo | Approccio |
|-----------|----------------|-----------|
| **Barbershop moderno** con arredamento industrial, logo professionale, Instagram curato con foto tagli | Barbershop a Verona centro, 4.7⭐, 200+ recensioni, usa Fresha | "Vedo che usi Fresha. Lo sai che paghi $60/mese per una loyalty base? Con Styll è inclusa e gamificata" |
| **Barbiere tradizionale** con clientela fedele, alta qualità ma poca presenza digitale | Barbiere storico a Vicenza, 4.5⭐, 100+ recensioni, nessun software | "I tuoi clienti ti adorano. Ma sai quanti non tornano senza che te ne accorga?" — demo churn detection |
| **Nuovo barbershop** aperto da meno di 1 anno, investimento in brand e social | Nuovo barber shop a Brescia, Instagram attivo, Stories regolari | "Stai costruendo il tuo brand. Styll ti dà la TUA app brandizzata + fidelizzazione automatica" |
| **Salone parrucchiera** piccolo, 2-4 postazioni, team da gestire | Salone a Desenzano, 3 dipendenti, usa WhatsApp per prenotazioni | "Gestisci 3 persone e 200 clienti con WhatsApp? Styll ti fa risparmiare 2 ore al giorno" |

### 7.2 — Aziende e Partner Potenziali

#### Grossisti di Prodotti per Barbieri (Partnership per Reward/Loyalty)

| Tipo Partner | Come trovarli | Valore della partnership | Approccio |
|-------------|---------------|------------------------|-----------|
| **Distributor prodotti barber** (es. American Crew, Proraso, Bullfrog distributor locali) | Google "distributore prodotti barbiere Verona/Brescia", fiere di settore | I barbieri riscattano prodotti come reward loyalty → il grossista vende di più | "I tuoi clienti barbieri possono offrire i tuoi prodotti come premio fedeltà ai loro clienti" |
| **Proraso / Bullfrog** (brand italiani di grooming) | Contatto diretto o tramite distributori | Brand italiani = fit perfetto con target italiano | Co-marketing: "Powered by Proraso" nei reward |

#### Scuole di Barbiere (Canale di Acquisizione)

| Tipo | Come trovarli | Valore | Approccio |
|------|---------------|--------|-----------|
| **Accademie barbiere** nella zona Veneto/Lombardia | Google "scuola barbiere Verona", "accademia barber Brescia" | Gli studenti imparano con Styll → quando aprono il loro negozio, scelgono Styll | Offrire Styll gratis alle scuole come strumento didattico. "I tuoi studenti imparano a gestire un negozio moderno" |

#### Associazioni di Categoria

| Associazione | Sezione | Valore | Approccio |
|-------------|---------|--------|-----------|
| **CNA** (Confederazione Nazionale Artigianato) | Sezione Benessere — barbieri/estetisti zona Verona, Vicenza, Brescia | Canale di comunicazione diretto verso centinaia di barbieri associati | Proporre una demo/webinar "Digitalizzazione per barbieri" agli associati |
| **Confartigianato** | Sezione Acconciatori ed Estetica | Stessa logica di CNA | Proporre partnership come "software consigliato" per gli associati |

#### Coworking e Incubatori

| Tipo | Nella zona | Valore | Approccio |
|------|-----------|--------|-----------|
| **Incubatori startup** | Talent Garden Brescia, H-Farm (Roncade/Treviso), Progetto Manifattura (Rovereto) | Networking, mentorship, primi beta tester | Candidare Styll ai programmi di accelerazione |
| **Coworking** | Verona, Brescia, Vicenza | Networking con freelancer e piccoli imprenditori | Eventi di community, demo day |

#### Agenzie di Marketing Locali

| Tipo | Valore | Approccio |
|------|--------|-----------|
| **Agenzie social media** specializzate in attività locali | L'agenzia gestisce i social del barbiere → può proporre Styll come tool | Partnership di affiliazione: l'agenzia presenta Styll ai suoi clienti barbieri → commissione o mese gratis |
| **Web agency** locali | Stesso approccio | "Aggiungi Styll al tuo pacchetto per clienti barbieri/beauty" |

#### Fornitori Arredamento Barbershop

| Tipo | Valore | Approccio |
|------|--------|-----------|
| **Fornitori di poltrone, arredi, specchi per barbiere** | Contatto con barbieri che stanno aprendo o rinnovando = prospect ideali | "Quando vendi una poltrona, includi 3 mesi gratis di Styll." Cross-selling |

**Implicazioni per Styll:**
La zona Vicenza–Brescia offre un mercato denso di barbieri con alto potenziale. Le partnership con CNA/Confartigianato possono dare accesso a centinaia di prospect qualificati. Le scuole di barbiere sono un canale di acquisizione a lungo termine.

**Action items Fase 7:**
- [ ] Compilare lista 30+ prospect con ricerca su Google Maps e Instagram
- [ ] Contattare CNA e Confartigianato per proporre demo/webinar
- [ ] Identificare 3-5 barbieri beta tester nella zona
- [ ] Cercare scuole di barbiere nella zona e proporre partnership
- [ ] Identificare i principali distributori di prodotti barber nella zona

---

## FASE 8 — Strategia di Marketing e Go-to-Market

### 8.1 — Pre-lancio (Mesi -3 → 0)

| Attività | Descrizione | Canale | KPI |
|----------|-------------|--------|-----|
| **Landing page con waitlist** | Pagina "Coming Soon" con mockup interattivo + form email. Beneficio: "I primi 50 iscritti avranno 3 mesi gratis" | Web (SEO + social) | 200+ iscritti |
| **Contenuti social educativi** | 3 post/settimana su Instagram/TikTok: "Lo sapevi che perdi il 15% dei clienti ogni anno senza accorgertene?", "5 motivi per cui i tuoi clienti non tornano" | Instagram, TikTok | 500+ follower |
| **Beta tester recruitment** | Identificare 3-5 barbieri nella zona disposti a testare gratis per 3 mesi in cambio di feedback e testimonianze video | Visita in negozio, DM Instagram | 3-5 beta tester attivi |
| **Presenza fiere/eventi** | Partecipare o visitare fiere di settore barber/beauty nella zona (Cosmoprof Bologna, fiere locali) | In persona | 10+ contatti qualificati |
| **Cold outreach personalizzato** | DM Instagram ai barbieri target: messaggio personalizzato ("Ho visto il tuo profilo, bel lavoro!") + proposta demo | Instagram DM, email | 20% response rate |

### 8.2 — Lancio (Mesi 0 → 3)

| Attività | Descrizione | KPI |
|----------|-------------|-----|
| **Offerta di lancio** | "Primi 50 clienti: 3 mesi gratis + setup concierge gratuito" oppure "50% sconto primo anno" | 20 trial attivati |
| **Case study dai beta tester** | Video-testimonianza: "Con Styll ho recuperato 12 clienti nel primo mese" + dati reali (churn ridotto, revenue recuperato) | 3 case study pubblicati |
| **Referral program** | "Porta un collega barbiere → entrambi avete 1 mese gratis" | 5 referral nel primo mese |
| **Demo live in negozio** | Visita il barbiere, mostra Styll sul suo telefono in 5 minuti. È il modo più efficace per il target. | 2-3 demo/settimana |
| **Collaborazione influencer barber locali** | Barbieri con 5K+ follower nella zona: "Prova Styll gratis e fai una Story/Reel" | 2-3 collaborazioni |

### 8.3 — Crescita (Mesi 3 → 12)

| Attività | Descrizione | KPI |
|----------|-------------|-----|
| **Content marketing** | Blog SEO: "Come ridurre i no-show del 50%", "5 strategie di fidelizzazione per barbieri". Video tutorial YouTube/TikTok | 1000+ visite/mese al blog |
| **Community** | Gruppo WhatsApp/Telegram "Barbieri Digitali Veneto/Lombardia" — condivisione tips, best practice, networking | 50+ membri attivi |
| **Partnership grossisti** | Bundle: "Acquista prodotti X → ricevi 3 mesi Styll gratis" | 2-3 partnership attive |
| **Espansione geografica** | Da Vicenza-Brescia → tutto il Veneto e Lombardia. Poi Emilia-Romagna, Piemonte | 50+ barbieri attivi |
| **Programma ambassador** | I barbieri più attivi (5+ mesi, buona attività) diventano "Ambassador Styll" → badge, visibilità, commissione referral | 10 ambassador |

### 8.4 — Budget Stimato

| Attività | Costo mensile | Effort (ore/sett.) | ROI atteso | Priorità |
|----------|--------------|--------------------|-----------|---------| 
| **Landing page + hosting** | €0-25 (Supabase/Vercel free tier) | 2h setup, poi 1h/sett manutenzione | Fondamentale per raccolta lead | Must-have |
| **Contenuti social** (creazione propria) | €0 (tempo) | 4-6h/sett | 2-5 clienti/mese da social | Must-have |
| **Ads Instagram/TikTok** (opzionale) | €100-300/mese | 2h/sett gestione | 5-15 lead/mese (CPA €20-60) | Nice-to-have |
| **Demo in negozio** (visite) | €30-50/mese (trasporto) | 4-6h/sett | 2-3 clienti/mese | Must-have |
| **SMS/WhatsApp outreach** | €10-20/mese | 1-2h/sett | 5-10 lead/mese | Must-have |
| **Fiere/eventi** (biglietti + trasporto) | €50-100/evento (2-3/anno) | 1 giorno/evento | 10+ contatti per evento | Nice-to-have |
| **Video production** (case study) | €0-50/video (smartphone + editing base) | 3-4h/video | Strumento vendita potentissimo | Must-have |
| **Referral rewards** (mesi gratis) | €19-29/referral (costo opportunità) | 0 (automatico) | CAC effettivamente zero | Must-have |
| **TOTALE MENSILE** | **€150-500/mese** | **15-20h/sett** | **5-15 nuovi clienti/mese** | — |

**Nota**: Questo è un budget realistico per un progetto di tesi. Le attività a costo zero (social, demo in negozio, referral) hanno il ROI più alto. Gli ads a pagamento sono opzionali e da attivare solo dopo aver validato il product-market fit.

**Timeline riassuntiva:**

```
Mese -3          Mese 0           Mese 3           Mese 6           Mese 12
│                │                │                │                │
▼                ▼                ▼                ▼                ▼
Landing page     LANCIO           Case study       Espansione       100 clienti
Waitlist         3-5 beta tester  Referral program  geografica       Ambassador
Social content   20 trial         Community         Partnership      Break-even?
Cold outreach    Demo in negozio  50 follower       50+ barbieri
```

**Implicazioni per Styll:**
Il go-to-market è hands-on e locale. Le demo in negozio sono lo strumento più efficace per barbieri. Il budget è sostenibile per un progetto di tesi. L'obiettivo realisto è 50-100 barbieri nel primo anno.

**Action items Fase 8:**
- [ ] Creare landing page con waitlist (mese -3)
- [ ] Iniziare a pubblicare contenuti educativi su Instagram (mese -3)
- [ ] Identificare e contattare 3-5 beta tester (mese -2)
- [ ] Preparare pitch di 5 minuti per demo in negozio
- [ ] Creare template per DM Instagram personalizzati
- [ ] Pianificare referral program (meccanica e comunicazione)

---

## FASE 9 — Proposta Database Ottimizzato

### 9.1 — Schema Database: Miglioramenti Proposti

Basandosi sulle criticità identificate nella Fase 5 e sulle feature aggiuntive della Fase 6, proponiamo i seguenti miglioramenti allo schema già documentato in `database-architetture.md`:

#### Correzioni criticità

| # | Criticità | Correzione | Impatto |
|---|-----------|-----------|---------|
| 1 | Tipi DECIMAL inconsistenti | Uniformare TUTTI i campi prezzo/importo a `DECIMAL(10,2)`: `appointment_services.price_at_booking`, `appointment_products.price_at_sale`, `services.price`, `products.price_sell`, `products.price_cost`, `subscription_plans.price_monthly`. **Nota**: questa correzione riguarda solo la definizione dello schema SQL (le tabelle non sono ancora deployate in produzione). Nessuna migrazione dati necessaria. | Precisione finanziaria, coerenza |
| 2 | Indici mancanti | Aggiungere: `(tenant_id, appointment_id)` su `appointment_services`, `(tenant_id, appointment_id)` su `appointment_products`, `(tenant_id, appointment_id)` su `payments` (già previsto), `(client_id)` su `client_notes` | Performance JOIN |
| 3 | `appointments.client_id` non nullable | Rendere `client_id` nullable per supportare walk-in anonimi. Aggiungere `guest_name` e `guest_phone` (entrambi VARCHAR, nullable) come campi di fallback SOLO quando `client_id` è NULL. Vincolo applicativo: se `client_id` è valorizzato, `guest_name`/`guest_phone` devono essere NULL (e viceversa). | Flessibilità operativa |
| 4 | Mancanza campo `payment_status` su appointments | Aggiungere `payment_status` ENUM ('unpaid', 'paid', 'partial', 'refunded') DEFAULT 'unpaid' su `appointments` per vista rapida senza JOIN su `payments` | UX dashboard — il barbiere vede subito se è stato pagato |
| 5 | Rate limiting win-back | Aggiungere `last_winback_sent_at` (TIMESTAMPTZ, nullable) su `client_analytics` per enforcement rapido del limite "max 1 win-back al mese" senza query su `messages_log` | Performance |

#### Nuove colonne per feature v1 aggiuntive

| Tabella | Colonna | Tipo | Scopo |
|---------|---------|------|-------|
| `appointments` | `guest_name` | VARCHAR(100), nullable | Nome per walk-in senza record CRM |
| `appointments` | `guest_phone` | VARCHAR(20), nullable | Telefono per walk-in senza record CRM |
| `appointments` | `payment_status` | VARCHAR DEFAULT 'unpaid' | Vista rapida stato pagamento |
| `client_analytics` | `last_winback_sent_at` | TIMESTAMPTZ, nullable | Rate limiting win-back |
| `tenants` | `qr_code_url` | VARCHAR, nullable | URL del QR code generato per la vetrina |
| `tenants` | `onboarding_completed_at` | TIMESTAMPTZ, nullable | Tracciare se il barbiere ha completato l'onboarding |
| `tenants` | `onboarding_step` | INTEGER DEFAULT 0 | Step corrente dell'onboarding wizard |

### 9.2 — Politiche RLS (Row Level Security)

Principi generali:
- **Ogni tabella ha RLS abilitato** (anche `subscription_plans` con SELECT per tutti)
- **Funzione helper `get_my_tenant_id()`** chiamata in ogni policy per-tenant
- **Funzione helper `get_my_user_type()`** per distinguere staff/client/admin
- **Test obbligatorio**: per ogni tabella, verificare che utente tenant A ≠ dati tenant B

#### Schema RLS per tabella

| Tabella | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| `subscription_plans` | Tutti (pubblico) | Solo admin | Solo admin | Mai |
| `tenants` | Staff del tenant (dati completi) + clienti (solo branding) + admin (tutti) | Solo admin | Titolare + admin | Mai (soft delete) |
| `locations` | Staff del tenant + clienti (indirizzo/orari) + admin | Titolare + manager | Titolare + manager | Titolare (is_active = false) |
| `tenant_subscriptions` | Titolare + admin | Admin | Admin | Mai |
| `profiles` | Il proprio profilo + admin | Auth trigger (automatico) | Il proprio profilo | Mai |
| `staff_members` | Staff stesso tenant + clienti (nome/foto/bio) | Titolare + manager | Titolare + manager + proprio record | Titolare (soft delete) |
| `clients` | Staff del tenant (tutti) + receptionist (lettura) + cliente (solo il suo) | Staff + receptionist | Staff (i suoi) + titolare/manager (tutti) + cliente (dati base) | Titolare (soft delete) |
| `client_notes` | Staff del tenant (le proprie + del team se titolare/manager) | Staff | Staff (le proprie) | Titolare |
| `client_consents` | Titolare + manager + cliente (i propri) | Sistema (Edge Function) + cliente | Cliente (opt-in/opt-out) | Mai |
| `appointments` | Staff (i propri o tutti se titolare/manager) + cliente (i propri) | Staff + receptionist + cliente | Staff + receptionist | Titolare (soft delete) |
| `payments` | Staff (i propri o tutti se titolare/manager) | Staff + receptionist | Titolare + manager | Mai |
| `loyalty_configs` | Titolare + manager + cliente (parziale) | Titolare | Titolare | Mai (versioning con ended_at) |
| `rewards` | Staff + cliente (attivi) | Titolare | Titolare | Titolare (is_active = false) |
| `client_loyalty` | Staff (i propri clienti) + titolare (tutti) + cliente (il proprio) | Sistema (trigger) | Sistema (trigger/cron) | Mai |
| `loyalty_transactions` | Staff (i propri clienti) + titolare (tutti) + cliente (i propri) | Sistema + staff (assegnazione manuale) | Mai | Mai |
| `message_templates` | Titolare + manager | Titolare + manager | Titolare + manager | Titolare |
| `messages_log` | Titolare + manager + staff (i propri clienti) | Sistema (Edge Function) | Sistema | Mai |
| `staff_notifications` | Staff (le proprie + globali) | Sistema | Staff (mark as read) | Sistema (cleanup cron) |
| `client_analytics` | Titolare + manager + staff (i propri clienti) | Sistema (trigger) | Sistema (trigger/cron) | Mai |
| `review_requests` | Titolare + manager + staff (i propri) | Sistema (Edge Function) | Sistema | Mai |
| `audit_log` | Titolare + manager (proprio tenant) + admin (tutti) | Sistema (trigger) | Mai | Sistema (cleanup cron) |
| `admin_users` | Admin | Admin | Admin | Admin |
| `tenant_activity_log` | Admin | Sistema (cron) | Sistema | Mai |

### 9.3 — Schema delle Migrazioni

**Ordine di creazione tabelle** (rispettando dipendenze FK):

```
-- Fase 1: Estensioni e funzioni helper
1. CREATE EXTENSION btree_gist;
2. CREATE FUNCTION get_my_tenant_id() ...
3. CREATE FUNCTION get_my_user_type() ...

-- Fase 2: Tabelle senza dipendenze
4. subscription_plans
5. tenants

-- Fase 3: Dipendenze da tenants
6. locations
7. tenant_subscriptions

-- Fase 4: Auth e profili
8. profiles (trigger su auth.users)
9. admin_users

-- Fase 5: Staff
10. staff_members
11. staff_locations

-- Fase 6: Catalogo
12. services
13. staff_services
14. products
15. product_inventory

-- Fase 7: CRM
16. clients
17. client_notes
18. client_consents

-- Fase 8: Calendario
19. working_hours
20. working_hour_overrides
21. appointments (con exclusion constraint)
22. appointment_services
23. appointment_products
24. payments

-- Fase 9: Loyalty
25. loyalty_configs
26. rewards
27. client_loyalty
28. loyalty_transactions
29. reward_redemptions

-- Fase 10: Analytics e comunicazione
30. client_analytics
31. message_templates
32. messages_log
33. staff_notifications
34. review_requests

-- Fase 11: Admin
35. tenant_activity_log
36. audit_log

-- Fase 12: Indici
37. Tutti i 21+ indici dal piano di indicizzazione

-- Fase 13: RLS policies
38. ALTER TABLE ... ENABLE ROW LEVEL SECURITY per ogni tabella
39. CREATE POLICY per ogni tabella/ruolo

-- Fase 14: Trigger
40. Trigger appointment → client_analytics
41. Trigger appointment_products → product_inventory
42. Trigger product_inventory → staff_notifications (scorta bassa)
43. Trigger auth.users → profiles
```

**Strategia migrazione v1 → v2:**
1. Le tabelle v2 (`tier_configs`, `badges`, `client_badges`, `challenges`, `inventory_movements`) si AGGIUNGONO sopra lo schema v1
2. Nessuna tabella v1 viene modificata strutturalmente
3. `client_loyalty` ha già i campi per tier e streak (con default) — non serve ALTER TABLE
4. Le nuove tabelle v2 vengono create con una migrazione separata
5. I dati esistenti non vengono toccati — solo arricchiti

> **Nota**: Il file SQL completo eseguibile su Supabase è disponibile come `schema-ottimizzato.sql` nella repository (vedi Fase 9 del prompt originale). Lo schema in `database-architetture.md` è già molto completo — le correzioni proposte qui sono incrementali.

**Implicazioni per Styll:**
Lo schema attuale in `database-architetture.md` è solido e ben strutturato. Le correzioni sono minimali e incrementali. La strategia di migrazione v1→v2 è pulita: si aggiunge senza riscrivere.

**Action items Fase 9:**
- [ ] Uniformare DECIMAL(10,2) in tutte le definizioni SQL
- [ ] Aggiungere colonne guest_name/guest_phone/payment_status su appointments
- [ ] Creare lo schema SQL completo eseguibile
- [ ] Implementare tutte le RLS policies con test automatici
- [ ] Creare i trigger per client_analytics e product_inventory

---

## FASE 10 — Roadmap Aggiornata e Piano d'Azione

### 10.1 — Roadmap Tecnica (cosa costruire e quando)

| Sprint | Durata | Cosa si fa | Output |
|--------|--------|-----------|--------|
| **Sprint 0** | 1 settimana | Setup progetto: repo, Supabase project, React scaffold, design system base, CI/CD | Ambiente di sviluppo funzionante |
| **Sprint 1** | 2 settimane | Database: creare tutte le tabelle v1, RLS policies, indici, funzioni helper, seed data | Schema SQL completo e funzionante su Supabase |
| **Sprint 2** | 2 settimane | Auth + Profili: login staff (email+password), login cliente (OTP), profili, onboarding wizard (5 step) | Flusso di registrazione e login funzionante |
| **Sprint 3** | 2 settimane | Catalogo + Staff: servizi, prodotti, staff members, ruoli, permessi base | Il barbiere può configurare servizi e team |
| **Sprint 4** | 2 settimane | Calendario + Booking: working hours, slot calculation (Edge Function), appointment creation, exclusion constraint | Booking funzionante (dashboard + PWA) |
| **Sprint 5** | 2 settimane | CRM + Clienti: profilo cliente, note private, storico appuntamenti, client_analytics (trigger + cron) | Dashboard CRM funzionante |
| **Sprint 6** | 2 settimane | Loyalty v1: loyalty_configs (Classico), rewards, client_loyalty, transactions, riscatto punti | Sistema loyalty base funzionante |
| **Sprint 7** | 2 settimane | Churn Detection + Win-back: semaforo 🟢🟡🔴, alert dashboard, win-back con un tap, messaggi template | Feature killer funzionante |
| **Sprint 8** | 2 settimane | PWA Cliente: landing page brandizzata, booking flow, profilo loyalty, installabilità, reminder push | PWA completa e installabile |
| **Sprint 9** | 2 settimane | Messaggistica: integration MessageBird/Infobip, reminder SMS/WhatsApp, template messaggi, review request | Sistema notifiche funzionante |
| **Sprint 10** | 2 settimane | QA + Polish: test RLS, test integrazione, fix bug, performance optimization, sicurezza audit | MVP pronto per beta test |

**Totale: ~21 settimane (5 mesi)** per MVP completo v1

**Sprint v2 (dopo il lancio):**

| Sprint | Cosa si fa | Output |
|--------|-----------|--------|
| Sprint 11-12 | Gamification completa: streak, badge, tier_configs, sfide | Loyalty gamificata v2 |
| Sprint 13-14 | Win-back automatico + QR walk-in + coda digitale | Retention tools v2 |
| Sprint 15-16 | Analytics avanzata + VIP Score + multi-staff avanzato | Dashboard v2 |
| Sprint 17-18 | Stripe integration (pagamenti online) | Payments v2 |

### 10.2 — Roadmap Commerciale (cosa vendere e quando)

| Mese | Attività commerciale | Target | KPI |
|------|---------------------|--------|-----|
| **Mese -3** | Landing page + waitlist + social content educativo | Awareness | 200+ iscritti waitlist |
| **Mese -2** | Identificazione e contatto beta tester | 3-5 beta tester | 5 barbieri contattati |
| **Mese -1** | Onboarding beta tester + feedback continuo | Feedback | 3 beta tester attivi |
| **Mese 0** | LANCIO — Offerta 3 mesi gratis per i primi 50 | Trial | 20 trial attivati |
| **Mese 1** | Demo in negozio (2-3/settimana) + referral program | Conversione | 10 barbieri attivi |
| **Mese 2** | Case study dai beta tester + content marketing | Social proof | 3 case study, 15 barbieri |
| **Mese 3** | Prima fatturazione (fine trial) + upsell Growth tier | Revenue | 80%+ conversione trial→pagante |
| **Mese 4-6** | Espansione da Vicenza-Brescia a tutto Veneto/Lombardia | Crescita | 30-40 barbieri attivi |
| **Mese 7-9** | Partnership grossisti + community barbieri + ambassador | Retention | 50+ barbieri, 5 ambassador |
| **Mese 10-12** | Espansione Emilia-Romagna + Piemonte + v2 features | Scala | 80-100 barbieri, v2 live |

### 10.3 — Milestones Chiave

| Milestone | Quando | Criterio di successo |
|-----------|--------|---------------------|
| **MVP pronto per beta test** | Mese 0 (dopo ~5 mesi di sviluppo) | Booking + CRM + loyalty + churn detection + PWA funzionanti |
| **Primo beta tester attivo** | Mese 0 | 1 barbiere reale usa Styll quotidianamente |
| **Primo cliente pagante** | Mese 3 (fine trial) | 1 barbiere paga il tier Starter |
| **10 clienti paganti** | Mese 4-5 | MRR: €190-290 |
| **50 clienti paganti** | Mese 8-10 | MRR: €950-1.450 |
| **100 clienti paganti** | Mese 12-15 | MRR: €1.900-2.900 |
| **Break-even operativo** | Mese 10-14 | Revenue copre costi (Supabase Pro + messaggistica + tempo) |
| **v2 live** | Mese 8-10 | Gamification completa + win-back automatico |

**Calcolo break-even:**
- Costi fissi mensili: Supabase Pro €25 + messaggistica ~€50-100 + dominio/hosting ~€10 = ~€135/mese
- Revenue per cliente medio: ~€25/mese (media ponderata tra tier)
- Break-even: **~6 clienti paganti** (!)
- Il break-even operativo è raggiungibile molto presto. Il vero obiettivo è il tempo investito (ore di sviluppo e vendita).

### 10.4 — Rischi e Mitigazioni

| # | Rischio | Probabilità | Impatto | Mitigazione |
|---|---------|-------------|---------|-------------|
| 1 | **Bassa adozione dai barbieri** — non capiscono il valore o troppo occupati per provare | Media | 🔴 Alto | Demo in negozio (il modo più efficace). Mostrare il churn reale. Trial gratuito. Setup < 8 min. |
| 2 | **Barberly aggiunge retention** — il competitor più vicino copia la nostra idea | Bassa | 🟡 Medio | First-mover advantage. Gamification complessa da copiare. Community e brand loyalty come moat. |
| 3 | **Limiti tecnici Supabase** — downtime, limiti, pricing changes | Bassa | 🟡 Medio | Supabase è open source → self-hosting possibile. Architettura non dipende da feature proprietarie. |
| 4 | **Churn dei barbieri su Styll** — provano ma poi smettono di usarlo | Media | 🔴 Alto | Onboarding guidato + check-in a 7/14/30 giorni. I clienti hanno la PWA installata (switching cost). |
| 5 | **Tempo insufficiente** — è un progetto di tesi, non un lavoro a tempo pieno | Alta | 🟡 Medio | Scope management rigoroso. MVP minimo prima, features extra dopo. Sprint di 2 settimane con deliverable chiaro. |
| 6 | **GDPR compliance** — errore nelle politiche privacy o nei consensi | Bassa | 🔴 Alto | `client_consents` con audit trail. Consulenza legale per privacy policy. DPO non richiesto sotto 250 dipendenti. |
| 7 | **Competitor internazionale localizza per Italia** — Fresha o Booksy lanciano offerta specifica Italia | Media | 🟡 Medio | Styll nasce italiano. Tone of voice, pricing, supporto umano, comunità locale — vantaggi difficili da replicare per un player globale. |
| 8 | **Costi messaggistica crescono** — WhatsApp/SMS costano più del previsto | Bassa | 🟢 Basso | Budget messaggi incluso nei tier. Il barbiere paga oltre la soglia. Il costo medio per barbiere è ~€6.50/mese. |

**Implicazioni per Styll:**
La roadmap è realistica per un progetto di tesi: ~5 mesi per l'MVP, primi clienti paganti entro 3 mesi dal lancio, break-even operativo con soli 6 clienti. Il rischio principale è il tempo — lo scope deve essere gestito rigorosamente.

**Action items Fase 10:**
- [ ] Definire le date precise degli sprint basandosi sulla disponibilità reale
- [ ] Creare board Kanban (GitHub Projects) per tracciare lo sviluppo sprint per sprint
- [ ] Identificare i beta tester 3 mesi prima del lancio previsto
- [ ] Preparare un piano di contingenza se il primo mese ha 0 trial attivati
- [ ] Definire metriche di successo settimanali per mantenere il focus

---

## 📋 EXECUTIVE SUMMARY

### Le 5 Scoperte Più Importanti

1. **Il mercato è pronto**: Il settore barbershop software cresce dell'8-10% annuo. L'Italia ha 137.730 attività, 82.7% micro-imprenditori. Post-COVID, la digitalizzazione è accelerata ma nessun player locale ha conquistato il segmento "retention-first". La finestra è aperta.

2. **La gamification è un blue ocean assoluto**: NESSUN competitor — né globale (Fresha, Booksy) né locale (Barberly, Solhair) — offre gamification nella loyalty. Duolingo ha dimostrato che funziona (+48% engagement). Il mercato gamification vale $49B entro 2029. Styll è il primo a portarla nel barber/beauty.

3. **Fresha ha errori strutturali sfruttabili**: Loyalty a $59.95/mese (troppo cara per piccoli), commissioni nascoste fino al +70%, brand Fresha che domina l'esperienza (non il barbiere), zero churn detection, zero win-back. Ogni errore di Fresha è un'opportunità per Styll.

4. **Lo stack React + Supabase è ideale per v1-v2**: Costo quasi zero per iniziare ($25/mese), RLS nativo per multi-tenancy, Realtime per calendario, Edge Functions per logica business. I limiti (vendor dependency, PWA push su iOS) sono gestibili e documentati.

5. **Lo schema database è solido**: Le 12 decisioni architetturali sono fondate e ben motivate. Le criticità trovate sono minimali (DECIMAL consistency, indici mancanti, guest booking) e risolvibili in poche ore. Nessuna riscrittura necessaria.

### Le 5 Azioni Più Urgenti

1. **🔴 Creare la suite di test RLS** — La sicurezza multi-tenant è la priorità #1. Un errore qui espone dati cross-tenant. 2-3 giorni di effort, impatto critico.

2. **🔴 Costruire l'MVP con focus sui "wow moments"** — Alert churn in dashboard ("Stai perdendo 7 clienti"), booking senza account, win-back con un tap. Sono le feature che vendono il prodotto.

3. **🟡 Identificare 3-5 beta tester nella zona Vicenza-Brescia** — Barbieri con brand forte, social attivo, predisposti al digitale. Contattarli 3 mesi prima del lancio. Demo in negozio.

4. **🟡 Creare landing page con waitlist** — Raccogliere lead mentre si sviluppa. Pubblicare contenuti educativi su Instagram per costruire audience.

5. **🟡 Contattare CNA/Confartigianato** — Le associazioni di categoria sono un canale di accesso diretto a centinaia di barbieri. Proporre un webinar "Digitalizzazione per barbieri".

### I 3 Rischi Principali

1. **Bassa adozione** — Il barbiere non capisce il valore o non ha tempo per provare. Mitigazione: demo in negozio (il modo più efficace), trial gratuito, setup < 8 minuti, mostrare il churn reale.

2. **Tempo insufficiente** — È un progetto di tesi con risorse limitate. Mitigazione: scope management rigoroso, sprint di 2 settimane, MVP prima delle feature extra.

3. **GDPR compliance** — Un errore nelle politiche privacy può avere conseguenze legali. Mitigazione: `client_consents` con audit trail, RLS testing, consulenza legale per privacy policy.

### Il Prossimo Passo Immediato

> **Scrivere lo schema SQL completo e deployarlo su Supabase** — è il fondamento di tutto. Senza database, non c'è prodotto. Sprint 1 della roadmap tecnica.

---

## 📚 Fonti e Riferimenti

| Area | Fonte | URL |
|------|-------|-----|
| Mercato barbershop software | ReportPrime | reportprime.com/barbershop-software-r14395 |
| Mercato barbershop software | VerifiedMarketReports | verifiedmarketreports.com/product/barber-shop-management-software-market |
| Mercato barbershop software | FutureMarketReport | futuremarketreport.com/industry-report/barber-shop-management-software-market |
| Salon management software | The Business Research Company | thebusinessresearchcompany.com/report/salon-management-software-global-market-report |
| Mercato barbershop software | VerifiedMarketResearch | verifiedmarketresearch.com/product/barbershop-software-market |
| Mercato hairstyling Italia | ItaliaInsights | italiainsights.it/ricerche-di-mercato/abbigliamento-moda-decorazione/il-mercato-dei-parrucchieri-in-italia |
| Mercato hairstyling Italia | IlMioBusinessPlan | ilmiobusinessplan.com/blogs/news/mercato-hairstyling |
| Digital transformation barber | Gitnux | gitnux.org/digital-transformation-in-the-barber-industry-statistics |
| Barberly | Barberly | barberly.com / barberly.it |
| Fresha pricing | Fresha | fresha.com/pricing |
| Fresha review | TheSalonBusiness | thesalonbusiness.com/fresha-review |
| Fresha review | SoftwareWorld | softwareworld.co/software/fresha-reviews |
| Fresha review | TheSMBGuide | thesmbguide.com/fresha |
| Fresha hidden costs | CostBench | costbench.com/software/salon-spa/fresha/hidden-costs |
| Fresha Trustpilot | Trustpilot | trustpilot.com/review/fresha.com |
| Fresha Reddit | TimeTailor | timetailor.com/timetailor-alternatives/fresha-reddit-reviews |
| GlossGenius review | BeautyPlaybook | beautyplaybook.com/blog/glossgenius |
| Phorest vs GlossGenius | Capterra | capterra.com/compare/113530-174830/Phorest-Salon-Software-vs-GlossGenius |
| Software comparison | SoftwareAdvice | softwareadvice.com/barbershop |
| Software comparison | GlossGenius blog | glossgenius.com/blog/barber-software |
| Software Italian | SoftwareAdvisor | softwareadvisor.it/software/software-gestionale-parrucchieri |
| Supabase multi-tenancy | Supascale | supascale.app/blog/multitenant-architecture-for-selfhosted-supabase-a-complete- |
| Supabase best practices | Leanware | leanware.co/insights/supabase-best-practices |
| Supabase multi-tenancy | AntStack | antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress |
| Supabase multi-tenant identity | Clerk | clerk.com/blog/multitenancy-clerk-supabase-b2b |
| Gamification engagement | Gallup | +48% engagement da studi Gallup |
| Starbucks Rewards | Pubblico | 28M membri attivi, +26% revenue |
| AI-driven preferences | Zenoti | 64% clienti preferiscono offerte AI-driven |

---

> **Documento generato il 31 marzo 2026**
> **Progetto**: Styll — Piattaforma SaaS verticale di retention per barbieri
> **Repository**: tvwebspecialist/Styll
