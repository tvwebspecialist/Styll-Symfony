> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri  
> **Stack:** Next.js 14+ (frontend) + Symfony 7.4 + API Platform (backend) + PostgreSQL 16 self-hosted (VPS EU)  
> _Documento aggiornato: luglio 2026. Versione Supabase archiviata in `docs/_archivio-supabase/analisi-strategica-supabase.md`_

---

# 📊 Analisi Strategica — Progetto Styll

> **Documento di ricerca e analisi strategica completa**
> Generato a supporto del progetto di tesi Styll — piattaforma SaaS verticale di retention per barbieri e micro-professionisti su appuntamento.

---

## FASE 0 — Contestualizzazione

### ✅ Conferma lettura `messaggio.md` — 5 punti chiave:

1. **Vision e posizionamento**: Styll è una piattaforma SaaS verticale "retention-first" per barbieri italiani indipendenti (137.730 attività, 82.7% micro-imprenditori). NON è un marketplace — il brand del professionista è sempre protagonista (white-label completo).
2. **Differenziazione**: Gamification della loyalty (blue ocean — nessun competitor la offre), Silent Churn Detector, win-back automatico, pricing trasparente (3 tier: Starter €19-29, Growth €49-69, Pro €99-149), data ownership totale.
3. **Competitor**: Fresha/Booksy/theCut sono marketplace (competitor indiretti). Barberly è il competitor diretto più vicino ma senza retention. Phorest è il benchmark retention ma costa $99+ e non è per piccoli. GlossGenius è il benchmark UX.
4. **Architettura**: Next.js 14+ (App Router) + TypeScript (frontend) + Symfony 7.4 + API Platform (backend REST) + PostgreSQL 16 VPS, PWA installabile, 3 interfacce (Admin, Barbiere, Cliente), multi-tenant con Doctrine TenantFilter. Setup guidato in 5 step (< 8 minuti). 4 personas definite (Marco, Sara, Luca, Roberto).
5. **Roadmap**: v1 = MVP (prenotazioni + CRM + loyalty base + churn detector + PWA), v2 = gamification completa + win-back + walk-in QR, v3 = AI Coach + prediction + WhatsApp booking.

### ✅ Conferma lettura `database-architetture.md` — 5 punti chiave:

1. **Schema completo**: 39 tabelle v1, +9 in v2 (48 totali), organizzate in aree funzionali. Schema in `symfony-app/docker/postgres/init/`. Entità Doctrine pilota: Calendar (Area 4) + CRM (Area 5).
2. **Multi-tenancy**: Ogni tabella operativa ha `tenant_id`. Isolamento via `TenantFilter` Doctrine (sostituisce RLS Supabase). Funzione PHP `TenantContext` che risolve `tenant_id` dal JWT per-request.
3. **Strutture chiave**: Appointments con exclusion constraint (no sovrapposizioni), prezzi snapshot, pagamenti separati dagli appuntamenti, loyalty con versioning immutabile delle config, optimistic locking su appointments.
4. **Sicurezza e GDPR**: Soft delete con `deleted_at` + `deleted_by`. `client_consents` per consensi granulari. `client_notes` sempre private. VPS EU (Hetzner Frankfurt) per data residency.
5. **Piano operativo**: Docker Compose (postgres:16 + php-fpm:8.2 + nginx + mercure). DoctrineMigrationsBundle per migrazioni. PHPUnit 11.5 per test (12/12 passati).

---

## FASE 1 — Analisi di Mercato Online (Ricerca Web)

### 1.1 — Dimensione del Mercato 2025-2026

| Segmento | Dimensione 2025 | Dimensione 2026 | CAGR (→ 2030/32) | Fonte |
|----------|-----------------|-----------------|-------------------|-------|
| Barbershop Software (globale) | $700M – $1.45B | ~$1.3 – $1.5B | 8 – 10.3% | ReportPrime, VerifiedMarketReports |
| Salon Management Software (globale) | $1.24B | $1.36B | 9.6 – 9.9% | The Business Research Company |
| Settore hairstyling Italia | €16.5B fatturato (2024) | €18.1B (proiezione) | +9.8% | ItaliaInsights |
| Digital transformation barber industry | — | — | 15.2% (2024-2030) | Gitnux |
| Mercato gamification globale | — | — | → $49B entro 2029 | Industry reports |

**Driver principali della crescita:**
- Adozione massiva di soluzioni cloud/SaaS per accessibilità e scalabilità
- Domanda crescente di prenotazione digitale e mobile-first
- CRM e strumenti di retention per migliorare il repeat business
- AI e automazione (scheduling optimization, marketing, engagement)
- Europa e Asia-Pacifico come regioni a crescita più rapida

### 1.2 — Mercato Italia

| Aspetto | Dati |
|---------|------|
| **Attività italiane barbieri** | 137.730 (anagrafe tributaria 2024) |
| **Distribuzione** | 82.7% micro-imprenditori (1-3 persone) |
| **Fatturato medio per attività** | €80.000 – €150.000/anno |
| **Digitalizzazione** | <15% usa software gestionale (enorme opportunità) |
| **Target Styll** | 80.000+ attività raggiungibili nel primo biennio |

---

## FASE 2 — Analisi dei Competitor

### 2.1 — Matrice comparativa

| Dimensione | **Fresha** | **GlossGenius** | **Phorest** | **Barberly** | **Styll** |
|-----------|-----------|----------------|------------|-------------|---------|
| **Target** | Tutti i salon | Beauty/nails (US) | Salon medio-grande | Barbieri | Barbieri IT indipendenti |
| **Modello** | Marketplace + SaaS | SaaS puro | SaaS enterprise | App branded | SaaS verticale |
| **Prezzo** | Gratis + commissioni | $24–$48/mese | $99–$239/mese | €29–69/mese | €19–149/mese |
| **Loyalty** | Base (punti) | No | TreatCard ($99+) | No | **Gamificata inclusa** |
| **Churn detection** | No | No | ReConnect ($99+) | No | **Silent Churn Detector** |
| **PWA** | No (app nativa) | No | No | App nativa | **Sì** |
| **White-label** | No (Fresha brand) | No | Parziale | App brandizzata | **White-label completo** |

### 2.2 — Posizionamento strategico

Styll opera in un segmento non presidiato: **barbieri italiani indipendenti con focus retention**. I competitor grandi (Fresha, Phorest) sono generalisti e costosi. I piccoli (Barberly) non hanno retention. Styll è l'unico con:
1. Gamification loyalty inclusa nel prezzo
2. Silent Churn Detector nativo
3. White-label completo (brand del barbiere, mai Styll)
4. PWA installabile (no App Store)
5. Prezzo da €19/mese accessibile anche per il barbiere con 50 clienti

---

## FASE 3 — Analisi del Modello di Business

### 3.1 — Revenue model

| Tier | Prezzo | Feature incluse | Target |
|------|--------|----------------|--------|
| **Starter** | €19-29/mese | Booking, CRM base, loyalty punti, 100 clienti | Barbiere singolo, appena digitale |
| **Growth** | €49-69/mese | Tutto Starter + gamification completa, churn detector, win-back automatico, 500 clienti, 2 staff | Barbershop 2-3 persone |
| **Pro** | €99-149/mese | Tutto Growth + AI receptionist, multi-location, API access, clienti illimitati | Barbershop avanzato, catena piccola |

### 3.2 — Unit economics

| Metrica | Stima v1 |
|---------|---------|
| **MRR target 6 mesi** | €5.000-10.000 (100-200 barbieri) |
| **MRR target 12 mesi** | €20.000-40.000 (400-800 barbieri) |
| **CAC** | €50-150 (principalmente demo in negozio + referral) |
| **LTV** | €600-2.400 (24-48 mesi × ARPU €25-50) |
| **LTV/CAC** | 4-16x — sostenibile |
| **Churn target** | <3%/mese (obiettivo retention-first) |

---

## FASE 4 — Analisi Infrastruttura Tecnica dei Competitor

### Tabella Comparativa Stack Tecnologici

| Area | **Fresha** | **Barberly** | **GlossGenius** | **Phorest** | **Styll** |
|------|-----------|-------------|----------------|------------|-----------|
| **Cloud Provider** | AWS (probabile) | N/D | AWS/GCP (probabile) | AWS (confermato) | **VPS Hetzner EU (self-hosted)** |
| **Frontend Web** | React o Angular | Dashboard web | React (probabile) | Angular/React | **Next.js 14+ (App Router), TypeScript** |
| **App Client** | Native iOS + Android | Native iOS + Android | PWA + Web | Native iOS + Android | **PWA** |
| **Backend** | Node.js o .NET Core (microservizi) | N/D | Node.js (probabile) | .NET / Java | **Symfony 7.4 + API Platform v4** |
| **Database** | PostgreSQL o MySQL | N/D | PostgreSQL (probabile) | SQL Server o PostgreSQL | **PostgreSQL 16 (self-hosted)** |
| **Architettura** | Microservizi multi-tenant | Monolite probabile | Microservizi (probabile) | Microservizi | **Monolite multi-tenant (Doctrine)** |
| **Multi-tenancy** | Shared DB con isolation logica | App separate per barbiere | Shared DB | Shared DB + sharding | **Shared tables + TenantFilter Doctrine** |
| **API** | REST interna | Non pubblica | Non pubblica | REST/GraphQL | **API Platform v4 (REST auto-generata)** |
| **Auth** | OAuth2 + email/social | Email + social | Email + social + Apple | OAuth2 + SSO | **JWT RS256 (lexik/jwt-authentication)** |
| **Realtime** | WebSocket per calendario | N/D | N/D | WebSocket probabile | **Mercure SSE (SSE, non WebSocket)** |
| **Storage** | CloudFlare + AWS | N/D | CloudFlare (probabile) | AWS CloudFront | **VPS + MinIO (v2) o Hetzner Storage** |
| **Scalabilità** | 450K+ business, sharding + Redis | Piccola scala | Media scala | Grande scala | **1K-10K tenant target v1-v2** |

### Come si Posiziona il Nostro Stack (Next.js + Symfony + PostgreSQL VPS)

**✅ Vantaggi dello stack Styll:**

| Vantaggio | Dettaglio |
|-----------|----------|
| **Costo prevedibile** | VPS Hetzner CX32: €18/mese — fisso, nessun costo variabile per tenant o per query |
| **Zero vendor lock-in** | PostgreSQL standard, Symfony open source, VPS sostituibile. Nessun lock-in su cloud provider |
| **Controllo totale** | DB, auth, storage, realtime — tutto controllato. Nessuna dipendenza da SLA terzi |
| **GDPR data residency** | VPS in EU (Hetzner Frankfurt) — nessun trasferimento extra-UE per dati core |
| **PostgreSQL power** | Exclusion constraints, partial indexes, JSONB, pg_cron — funzionalità enterprise |
| **API Platform** | REST API auto-generata dallo schema Doctrine. Standard + HAL/JSON-LD/OpenAPI |
| **PWA vs App native** | Un'unica codebase web vs 3 (web + iOS + Android). Costo e tempo 3-5x inferiore |
| **Symfony ecosystem** | 14+ anni di maturità, LTS 7.4 supportato fino a nov 2029, community enorme |

**⚠️ Limiti dello stack Styll:**

| Limite | Dettaglio | Mitigazione |
|--------|----------|-------------|
| **Ops overhead** | VPS richiede gestione: aggiornamenti, backup, monitoring | Docker Compose + Hetzner Snapshot + cron pg_dump. Effort: 1-2h/mese |
| **No managed services** | Backup, replica, failover non automatici | pg_dump cron giornaliero, Hetzner snapshot, PgBouncer per connection pooling |
| **PWA push notifications** | iOS le supporta dal 16.4+ con limitazioni | Cascata canali: Push → WhatsApp → SMS. Mai dipendere da un solo canale |
| **OTP SMS per clienti** | Richiede implementazione custom (Redis TTL) | **DECISIONE DA CONFERMARE** — bundle SMS OTP o implementazione custom |
| **Nessuna API pubblica competitor** | No import automatico da Fresha/Booksy | CSV import + migrazione concierge manuale |
| **Cold start** | Nessuno (PHP-FPM persistente, non serverless) | Vantaggio rispetto a Edge Functions |

---

## FASE 5 — Analisi Criticità della Nostra Infrastruttura

### 5.1 — Criticità dello Schema Database

| # | Area | Criticità | Gravità | Dettaglio |
|---|------|-----------|---------|-----------|
| 1 | **Normalizzazione** | Schema ben normalizzato | 🟢 | Le tabelle sono correttamente separate. Nessuna God Table. |
| 2 | **Walk-in anonimi** | `appointments.client_id` dovrebbe essere nullable | 🟡 | Un walk-in senza nome (raro ma possibile) non ha record `clients`. Soluzione: `client_id` nullable + `guest_name`/`guest_phone` |
| 3 | **TenantFilter isolation** | Rischio di entità non filtrate — il rischio #1 | 🔴 | Un'entità senza `tenant_id` in `getAssociationMappings` non viene filtrata. Serve un test per ogni entità. 12 test base già passano (MIGRATION-LOG.md FASE 2) |
| 4 | **Performance TenantFilter** | Overhead PHP su ogni query generata da Doctrine | 🟡 | Il filter è già in-memory, nessuna query aggiuntiva. Ma va testato con Symfony Profiler su query complesse |
| 5 | **Scalabilità 1K tenant** | 1.000 × 200 clienti = 200K righe in `clients` | 🟢 | Gli indici previsti sono sufficienti. PostgreSQL gestisce milioni di righe con indici corretti |
| 6 | **Scalabilità 10K tenant** | 2M clienti, 10M+ appuntamenti | 🟡 | Retention policy (24 mesi) su `messages_log`. Valutare partitioning su `appointments` oltre 10M righe |
| 7 | **Tipi di dato** | `price_at_booking` come DECIMAL(10,2) | 🟢 | Già uniformato come string in PHP (Doctrine type `decimal`). Precisione finanziaria garantita |
| 8 | **Backup manuale** | Nessun backup automatico su VPS | 🔴 | **CRITICO pre-lancio**: pg_dump cron giornaliero + Hetzner Volume Snapshot. Testare restore |
| 9 | **Connection pooling** | PHP-FPM apre connessioni persistenti a PostgreSQL | 🟡 | PgBouncer in transaction mode risolve per > 50 barbieri simultanei |
| 10 | **OTP clienti non implementato** | Clienti (Luca/Roberto) non possono ancora autenticarsi | 🔴 | **DECISIONE DA CONFERMARE** — serve prima del lancio |

### 5.2 — Criticità Architetturali

| # | Area | Criticità | Gravità | Dettaglio e Mitigazione |
|---|------|-----------|---------|------------------------|
| 1 | **VPS single point of failure** | Se il VPS è down, Styll è inaccessibile | 🟡 | Hetzner ha SLA 99.9%. Per v2+: read replica + failover, multi-region opzionale |
| 2 | **Realtime SSE vs WebSocket** | Mercure usa SSE (unidirezionale) | 🟢 | Per notifiche in-app e aggiornamento calendario SSE è sufficiente. Chat bidirezionale (WhatsApp inbox) è lato Next.js |
| 3 | **PWA push notifications** | iOS adoption rate ~40% | 🟡 | Cascata Push → WhatsApp → SMS → Email. Mai dipendere solo da push |
| 4 | **Stripe v2** | La tabella `payments` è già pronta con `stripe_payment_id`. Usare Stripe Connect | 🟡 | PCI compliance gestita da Stripe. Webhook Symfony Messenger per ricevere conferme |
| 5 | **TenantFilter write protection** | Il filter protegge solo SELECT (Doctrine non filtra INSERT/UPDATE) | 🟡 | Write protection a livello service layer (validazione `tenant_id` esplicita). Documentato in DA-15 |
| 6 | **Disaster Recovery** | Nessun PITR (Point-in-Time Recovery) automatico su VPS | 🟡 | pg_dump giornaliero + Hetzner Snapshot. Per dati critici: export settimanale su Hetzner Object Storage |

### 5.3 — Criticità di Scalabilità

| # | Area | Criticità | Gravità | Dettaglio |
|---|------|-----------|---------|-----------|
| 1 | **VPS CX22 (tesi)** | 2 vCPU, 4 GB RAM | 🟡 | Sufficiente per sviluppo e demo. Passare a CX32 (€18/mese) prima del lancio beta |
| 2 | **VPS CX32 (beta)** | 4 vCPU, 8 GB RAM — €18/mese | 🟢 | Sufficiente per v1 (fino a ~500 tenant). Costo fisso prevedibile |
| 3 | **Costi al crescere** | CX42 €38/mese, CCX23 dedicated €60/mese | 🟡 | A 1K+ tenant con revenue Styll €20K+/anno, qualsiasi tier VPS è sostenibile |
| 4 | **PHP-FPM worker pool** | Default 5-10 worker — limite a ~50 request simultanee | 🟡 | `pm.max_children = 25-50` su CX32. PgBouncer per connessioni DB. Monitorare con php-fpm status |
| 5 | **Storage immagini** | Logo, foto prodotti, foto staff — su VPS | 🟢 | ~5-10MB per tenant. 1K tenant = 5-10GB. Sufficiente. Comprimere immagini al upload (Symfony imagine-bundle) |
| 6 | **Rate limiting API** | Symfony non ha rate limiting default | 🟡 | `symfony/rate-limiter` su endpoint auth, OTP, booking. Configurare in `security.yaml` |

### 5.4 — Proposte di Miglioramento

| # | Criticità | Gravità | Soluzione Proposta | Quando |
|---|-----------|---------|-------------------|--------|
| 1 | Tenant isolation test suite | 🔴 Critica | PHPUnit test per ogni entità: "utente tenant A non legge/scrive dati tenant B" | **v1 (pre-lancio)** |
| 2 | Backup automatico | 🔴 Critica | pg_dump cron giornaliero + Hetzner Snapshot + test restore mensile | **v1** |
| 3 | OTP SMS clienti | 🔴 Critica | Implementare autenticazione cliente (DECISIONE DA CONFERMARE) | **v1** |
| 4 | Rate limiting | 🟡 Importante | `symfony/rate-limiter` su auth/OTP/booking | **v1** |
| 5 | Checklist sicurezza pre-lancio | 🔴 Critica | CORS (nelmio/cors-bundle), CSP headers, input validation, JWT rotation | **v1** |
| 6 | Monitoring e alerting | 🟡 Importante | Sentry (errori PHP) + PostHog (analytics) + cron monitor (healthcheck.io) | **v1** |
| 7 | PgBouncer | 🟡 Importante | Connection pooling per > 50 tenant simultanei | **v2** |
| 8 | Multi-region / failover | 🟢 Bassa | Hetzner replica a Finlandia/USA come fallback | **v3+** |
| 9 | PWA offline mode | 🟡 Importante | Service Worker con cache per appuntamenti di oggi offline | **v2** |
| 10 | Export dati automatico | 🟢 Bassa | Cron settimanale export clienti/appuntamenti su Hetzner Object Storage | **v2** |

---

## FASE 6 — Feature Killer per Abbattere la Concorrenza

### 6.1 — Feature da Implementare Subito (v1)

| # | Feature | Cosa fa | Perché è killer | Effort | Impatto |
|---|---------|---------|----------------|--------|---------|
| 1 | **"Stai perdendo X clienti" — Alert visivo** | Banner in dashboard: "Hai 7 clienti a rischio 🔴 questa settimana" | Nessun competitor mostra questo dato così direttamente | 2-3 giorni | 🔴 Altissimo |
| 2 | **Booking senza account** (guest booking) | Prenota con solo nome + telefono. Loyalty si attiva al login | Fresha richiede account → frizione enorme. Conversione +30-50% | 1-2 giorni | 🔴 Alto |
| 3 | **QR code dinamico per vetrina** | Il barbiere stampa un QR → cliente scanna → prenota direttamente | Nessun competitor lo offre gratis in v1. Tangibile | 1 giorno | 🟡 Medio |
| 4 | **Messaggio win-back con un tap** | Dalla lista clienti 🔴, un bottone → WhatsApp/SMS personalizzato | Phorest lo fa a $99+. Noi lo includiamo | 2-3 giorni | 🔴 Alto |
| 5 | **Confronto visivo "prima/dopo Styll"** | Il barbiere inserisce nome → preview live della SUA app vs Fresha | Nessun competitor lo fa. Conversion rate +20-40% | 3-4 giorni | 🔴 Alto |

### 6.2 — Feature da Copiare/Migliorare

| Competitor | Cosa fa bene | Come NOI lo facciamo MEGLIO |
|-----------|-------------|----------------------------|
| **Fresha** | Setup servizi precompilati | + Template servizi italiani con prezzi in € realistici + Import Google Business Profile |
| **GlossGenius** | UX mobile-first, design minimalista | + Progressive complexity (Marco vede 30%, Sara vede 70%) |
| **Phorest** | TreatCard loyalty con punti per €1 | + Gamificata con streak, badge, livelli + INCLUSA nel prezzo |
| **Phorest** | ReConnect win-back automatico | + Un tap in v1 + Automatico in v2 + Prezzo accessibile |
| **Barberly** | App brandizzata per ogni barbiere | + PWA installabile senza App Store = zero costi, zero approvazione Apple |

### 6.3 — Feature "Wow" per il Pitch Commerciale (demo 5 minuti)

| # | Momento "Wow" | Come si dimostra | Effetto emotivo |
|---|--------------|-----------------|-----------------|
| 1 | **"Ecco la TUA app"** | Nome + logo → preview live in 30 secondi | "È la MIA app, non di qualcun altro!" |
| 2 | **"Stai perdendo 7 clienti"** | Dashboard con clienti a rischio 🔴 con nome e giorni | "Non sapevo di star perdendo questi clienti..." |
| 3 | **"Un tap per riportarli"** | Click su cliente 🔴 → messaggio win-back pre-compilato → "Invia" | "Così semplice? Posso farlo ogni giorno!" |
| 4 | **"I tuoi clienti hanno livelli"** | PWA con streak 🔥, punti, badge, barra progresso | "È come un gioco! I miei clienti giovani lo adoreranno" |
| 5 | **"Prenota in 3 tap"** | Demo live booking: servizio → data/ora → conferma. Senza account | "Questo è più veloce di WhatsApp" |

### 6.4 — Feature per la Meta-Retention

| # | Strategia | Switching cost |
|---|-----------|----------------|
| 1 | Storico clienti diventa indispensabile | Alto — i dati sono esportabili ma la vista aggregata no |
| 2 | I clienti hanno la PWA installata | Molto alto — il barbiere non vuole rieducare 200+ clienti |
| 3 | Gamification loyalty = engagement | Molto alto — i clienti hanno streak, badge, livelli |
| 4 | Template social brandizzati | Medio — friction pratica (ristampare QR code) |
| 5 | Community di barbieri | Medio — il barbiere perde la community se lascia |

---

## FASE 7 — Prospect Commerciali (Zona Vicenza–Brescia)

### 7.1 — Metodologia di Ricerca Prospect

**Criteri di qualificazione (in ordine di priorità):**
1. ⭐ Recensioni Google 4+ stelle con almeno 50 recensioni
2. 📱 Presenza Instagram attiva (post regolari, Stories, bio curata)
3. 🔗 Link prenotazione già in bio Instagram (predisposizione al digitale)
4. 🆕 Apertura recente (ultimi 12-24 mesi — più aperti all'innovazione)
5. 👥 Team piccolo (2-5 persone — target Tier 2 Growth)
6. 🏷️ Brand curato (logo professionale, arredamento moderno)

**Città target:** Vicenza, Verona, Soave, Villafranca di Verona, Peschiera del Garda, Sirmione, Desenzano del Garda, Brescia, comuni intermedi.

**Obiettivo: 30+ prospect qualificati:**
- 🔴 10 prospect "caldi" — già digitali, brand forte, probabilmente frustrati dal tool attuale
- 🟡 10 prospect "tiepidi" — buon brand, social attivo, nessun software visibile
- 🟢 10 prospect "freddi" — buone recensioni ma poca presenza digitale

### 7.2 — Aziende e Partner Potenziali

| Tipo Partner | Valore | Approccio |
|-------------|--------|-----------|
| **Grossisti prodotti barber** (American Crew, Proraso, Bullfrog) | I barbieri riscattano prodotti come reward → il grossista vende di più | "I tuoi clienti barbieri offrono i tuoi prodotti come premio fedeltà" |
| **Scuole di barbiere** (Veneto/Lombardia) | Studenti imparano con Styll → quando aprono, scelgono Styll | Offrire Styll gratis come strumento didattico |
| **CNA / Confartigianato** (sezione barbieri) | Accesso a centinaia di barbieri associati | Demo/webinar "Digitalizzazione per barbieri" |
| **Agenzie social media locali** | L'agenzia gestisce i social del barbiere → propone Styll | Partnership di affiliazione: commissione o mese gratis |
| **Fornitori arredamento barbershop** | Contatto con barbieri che stanno aprendo = prospect ideali | "Quando vendi una poltrona, includi 3 mesi gratis di Styll" |

---

## FASE 8 — Strategia di Marketing e Go-to-Market

### 8.1 — Pre-lancio (Mesi -3 → 0)

| Attività | Canale | KPI |
|----------|--------|-----|
| **Landing page con waitlist** | Web (SEO + social) | 200+ iscritti |
| **Contenuti social educativi** | Instagram, TikTok | 500+ follower |
| **Beta tester recruitment** | Visita in negozio, DM Instagram | 3-5 beta tester attivi |
| **Cold outreach personalizzato** | Instagram DM, email | 20% response rate |
| **Presenza fiere/eventi** | In persona | 10+ contatti qualificati |

### 8.2 — Budget Stimato

| Attività | Costo mensile | Priorità |
|----------|--------------|---------|
| **VPS Hetzner CX22 (tesi)** | €8/mese | Must-have |
| **VPS Hetzner CX32 (beta)** | €18/mese | Must-have al lancio |
| **Vercel free tier** (Next.js frontend) | €0 (free tier) | Must-have |
| **Contenuti social** (creazione propria) | €0 (tempo) | Must-have |
| **Ads Instagram/TikTok** (opzionale) | €100-300/mese | Nice-to-have |
| **Demo in negozio** (visite) | €30-50/mese | Must-have |
| **SMS/WhatsApp outreach** | €10-20/mese | Must-have |
| **TOTALE MENSILE** | **€160-400/mese** | — |

---

## FASE 9 — Proposta Database Ottimizzato

### 9.1 — Schema: Miglioramenti Proposti

| # | Criticità | Correzione |
|---|-----------|-----------|
| 1 | Tipi DECIMAL inconsistenti | Uniformare TUTTI i campi prezzo a `DECIMAL(10,2)`. Già fatto in entità Doctrine (type `decimal`) |
| 2 | `appointments.client_id` nullable | Rendere nullable per walk-in anonimi. Aggiungere `guest_name` e `guest_phone` (nullable) |
| 3 | `payment_status` su appointments | Aggiungere ENUM ('unpaid', 'paid', 'partial', 'refunded') DEFAULT 'unpaid' per vista rapida senza JOIN |
| 4 | Rate limiting win-back | Aggiungere `last_winback_sent_at` su `client_analytics` |
| 5 | Indici mancanti | `(tenant_id, appointment_id)` su `appointment_services` e `appointment_products` |
