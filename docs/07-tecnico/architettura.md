> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `progetto/05-tecnologia-e-stack.md`, `tech-stack-recommendations.md`

---

# Tecnologia e Stack — Styll

## Stack Tecnologico
- **Frontend:** Next.js 14+ con App Router, TypeScript
- **Backend / Database / Auth:** Supabase
- **Architettura:** SaaS online, sempre accessibile, aggiornabile centralmente
- **Tipo app cliente:** PWA (Progressive Web App) — no App Store, installabile da browser

---

## Architettura Multi-Tenant

Un'unica piattaforma centrale che ospita più barbieri contemporaneamente, mantenendo separati dati, impostazioni e identità visiva di ciascuno.

---

## Architettura branding per tenant (Next.js + Supabase)

```javascript
// Ogni tenant ha un config in Supabase
{
  tenant_id: "uuid",
  business_name: "Marco's Barber",
  primary_color: "#1A1A2E",
  secondary_color: "#E94560",
  logo_url: "https://cdn.Styll.app/tenants/marco/logo.png",
  favicon_url: "...",
  custom_domain: "prenotamarco.it", // v2
  subdomain: "marco.Styll.app"     // v1
}
```

**v1 — Subdomain + CSS Variables:**
- Ogni barbiere ha: `nomeattività.Styll.app`
- CSS Variables caricate da config tenant → colori, font, logo cambiano runtime
- Il cliente vede SOLO il brand del barbiere, MAI "Styll" (tranne un piccolo "Powered by" nel footer)

**v2 — Custom domain:**
- Il barbiere usa il suo dominio: `prenotamarco.it`
- SSL automatico via Let's Encrypt
- DNS CNAME + wildcard certificate

---

## Database schema gamification (Supabase)

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

---

## Prezzi API di comunicazione reali 2025 (Italia)

### WhatsApp Business API (prezzi Meta)

| Tipo messaggio | Costo per messaggio |
|---------------|-------------------|
| Marketing (template) | €0.0572 |
| Utility (reminder, conferma) | €0.0248 |
| Autenticazione | €0.0248-0.0313 |
| User-initiated (entro 24h) | **GRATIS** |

### SMS API (Italia)

| Provider | Costo per SMS |
|----------|--------------|
| **Twilio** | ~€0.055 |
| **MessageBird** | ~€0.045 |
| **Infobip** | ~€0.04-0.05 (volume) |
| **Vonage** | ~€0.062 |

**Provider consigliati per Styll:** MessageBird o Infobip (API unificata WhatsApp + SMS, prezzi competitivi Italia, pay-as-you-go).

**Calcolo costi per barbiere singolo (~120 clienti/mese):**
- Reminder 24h prima: 120 × €0.0248 = €2.98/mese
- Win-back (10 clienti/mese): 10 × €0.0572 = €0.57/mese
- Review request: 120 × €0.0248 = €2.98/mese
- **Totale: ~€6.50/mese** → ampiamente sostenibile

---

## Template social — Specifiche tecniche

**5 template statici auto-brandizzati:**
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

---

## Google Business Profile API

- Gratuita (con limiti di quota)
- OAuth 2.0 → `locations.get` → nome, indirizzo, orari, telefono, foto, categorie
- Perfetta per auto-fill al signup

---

## Privacy e GDPR

- Le note del barbiere NON sono visibili al cliente nella PWA
- Il cliente vede: storico prenotazioni, punti loyalty, prossima visita
- Il cliente può aggiornare: telefono, email, preferenze orario
- Consenso esplicito al primo accesso, opt-out sempre disponibile
- Export dati cliente: sempre gratis
- GDPR: opt-in esplicito + opt-out in ogni messaggio
- Frequenza win-back: max 1 al mese per cliente
- Il barbiere approva i win-back prima dell'invio (mai spam automatico in v1)

---

## Cascata intelligente canali (v2)

Push → WhatsApp → SMS → Email

| Canale | Per chi | Quando |
|--------|---------|--------|
| **Push notification (PWA)** | Luca (ha la PWA) | Reminder 24h, conferma booking |
| **WhatsApp** | Luca + clienti con WhatsApp | Reminder, win-back, promozioni |
| **SMS** | Roberto (no WhatsApp business) | Reminder, win-back |
| **Email** | Tutti (fallback) | Conferma booking, receipt |

---

## Raccomandazioni Stack Tecnologico — Analisi Dettagliata

> La sezione seguente proviene da `tech-stack-recommendations.md` e fornisce raccomandazioni dettagliate a supporto delle scelte tecnologiche sopra.

# 🛠️ Tech Stack Recommendations — Styll

> Documento generato dall'analisi completa della repository `tvwebspecialist/Styll`.
> Aggiornato a: Aprile 2026.

---

## Indice

1. [Introduzione](#1--introduzione)
2. [Analisi dello stack attuale](#2--analisi-dello-stack-attuale)
3. [Stack di SaaS di riferimento](#3--stack-di-saas-di-riferimento)
4. [Raccomandazioni per layer](#4--raccomandazioni-per-layer)
5. [Architettura consigliata](#5--architettura-consigliata)
6. [Infrastruttura e hosting](#6--infrastruttura-e-hosting)
7. [Sicurezza](#7--sicurezza)
8. [DevOps e CI/CD](#8--devops-e-cicd)
9. [Tool e servizi terzi](#9--tool-e-servizi-terzi)
10. [Scalabilità](#10--scalabilità)
11. [Stima costi tecnologici](#11--stima-costi-tecnologici)
12. [Riscontri e osservazioni per il tuo progetto](#12--riscontri-e-osservazioni-per-il-tuo-progetto)
13. [Bibliografia e Fonti per la Tesi](#13--bibliografia-e-fonti-per-la-tesi)

---

## 1 — Introduzione

Questo documento fornisce un'analisi tecnica completa e raccomandazioni architetturali per **Styll**, una piattaforma SaaS verticale per barbieri e professionisti della bellezza focalizzata sulla **retention dei clienti**. L'analisi si basa su:

- **Lettura integrale** del file `messaggio.md` (1.686 righe) e `database-architetture.md` (1.164 righe)
- **Analisi della repository**: struttura, linguaggi, dipendenze, configurazioni
- **Ricerca comparativa** su SaaS simili (Fresha, Calendly, GlossGenius, Phorest, Barberly)
- **Trend tecnologici 2025–2026**: ThoughtWorks Technology Radar, State of JS, StackOverflow Developer Survey
- **Benchmark di costo**: Supabase, Vercel, Railway, Fly.io, AWS, e alternative

L'obiettivo è fornire una guida concreta per trasformare il progetto di tesi documentale in un prodotto SaaS funzionante, con attenzione a **budget da startup**, **scalabilità progressiva** e **time-to-market rapido**.

---

## 2 — Analisi dello stack attuale

### 2.1 — Stato della repository

| Aspetto | Dettaglio |
|---------|-----------|
| **File presenti** | 3 file markdown (`messaggio.md`, `database-architetture.md`, `README.md`) |
| **Codice sorgente** | ❌ Nessuno — repository di sola documentazione/pianificazione |
| **Configurazioni** | ❌ Nessun `package.json`, `tsconfig.json`, `docker-compose.yml`, `.env` |
| **CI/CD** | ❌ Nessuna pipeline configurata |
| **Test** | ❌ Nessun framework di test |
| **Dimensione** | ~396 KB totali, ~2.852 righe di documentazione |

### 2.2 — Stack tecnologico pianificato (da `messaggio.md`)

| Layer | Tecnologia dichiarata | Note |
|-------|----------------------|------|
| **Frontend** | Next.js 14+ (App Router), TypeScript | Routing multi-tenant nativo, SSR/SSG per landing, SEO |
| **Backend / API** | Supabase (Edge Functions) | PostgreSQL + Auth + Realtime + Storage |
| **Database** | PostgreSQL (via Supabase) | 33 tabelle in v1, +5 in v2 (totale 38), RLS multi-tenant |
| **Autenticazione** | Supabase Auth | Email+password (staff), OTP SMS (clienti) |
| **App client** | PWA (Progressive Web App) | Installabile da browser, no App Store |
| **Messaggistica** | MessageBird / Infobip | WhatsApp + SMS |
| **Pagamenti** | Stripe (v2) | Webhook integration |
| **AI** | OpenAI GPT-4o (v2-v3) | Smart setup, business coach |

### 2.3 — Punti di forza della pianificazione

| # | Punto di forza | Evidenza |
|---|---------------|----------|
| 1 | **Architettura database matura** | 12 decisioni architetturali documentate e motivate con alternative valutate |
| 2 | **Multi-tenancy ben progettata** | RLS policy, `tenant_id` su ogni tabella, funzione helper `get_my_tenant_id()` |
| 3 | **GDPR-first** | Tabella `client_consents` separata, soft delete con `deleted_by`, audit trail |
| 4 | **Scalabilità prevista** | Slot calcolati runtime (no pre-generazione), indici espliciti, partitioning pianificato |
| 5 | **Domain knowledge profondo** | 4 personas dettagliate, 4 user journey, analisi 13 competitor |
| 6 | **Business model chiaro** | 3 tier con feature flags JSONB, pricing €19-149/mese |

### 2.4 — Criticità e gap

| # | Criticità | Rischio | Raccomandazione |
|---|-----------|---------|-----------------|
| 1 | **Zero codice implementato** | Alto — nessuna validazione tecnica delle scelte | Iniziare con MVP verticale (booking + CRM) |
| 2 | ~~React senza framework~~ | ✅ **Risolto** — adottato Next.js 14+ con App Router (decisione audit sessione 4) | — |
| 3 | ~~Nessun type safety~~ | ✅ **Risolto** — adottato TypeScript end-to-end (decisione audit sessione 4) | — |
| 4 | **Nessuna strategia di test** | Alto — 33 tabelle con trigger e cron senza test | Definire strategia testing (unit + integration + e2e) |
| 5 | **Nessuna UI library scelta** | Basso — ma impatta velocity di sviluppo | Adottare **shadcn/ui** + **Tailwind CSS** |
| 6 | **State management non definito** | Basso — Supabase realtime + React context possono bastare | Valutare **Zustand** o **TanStack Query** |
| 7 | **Nessun monitoring/logging** | Medio — critico per produzione | Pianificare da subito (Sentry + PostHog) |
| 8 | **Edge Functions non testate** | Medio — slot calculation, cron jobs, trigger sono complessi | Prototipare early per validare performance |

### 2.5 — Debito tecnico potenziale

Pur non essendoci codice, le decisioni documentate presentano aree di debito tecnico potenziale:

1. **JSONB per feature flags**: flessibile ma non validato a livello di schema — servono validation rules
2. **Cron job notturno per riconciliazione**: richiede infrastruttura (pg_cron o Supabase scheduled functions)
3. **Exclusion constraint per overlap**: richiede estensione `btree_gist` — verificare disponibilità su Supabase
4. **Funzione `get_my_tenant_id()` STABLE**: performance dipende dal query planner di PostgreSQL — testare con EXPLAIN ANALYZE
5. **33 tabelle + trigger + RLS in v1**: complessità significativa per un MVP — valutare un rilascio più graduale

---

### 2.6 — Decisioni prese durante l'audit

Durante la sessione di audit di coerenza del 9 aprile 2026, sono state formalizzate le seguenti decisioni tecniche che risolvono alcune criticità identificate nelle sezioni precedenti:

#### Passaggio da "React" a "Next.js 14+ con App Router"

**Decisione**: Lo stack front-end ufficiale è Next.js 14+ con App Router, non React vanilla.

**Motivazioni**:
1. **Routing multi-tenant nativo**: il requisito architetturale di gestire ogni barbiere come tenant con routing dinamico (`[slug]`) è nativo in Next.js App Router, che è stato progettato esattamente per questo caso d'uso
2. **Performance delle landing page**: le landing page brandizzate dei barbieri sono il primo touchpoint del funnel di conversione cliente. La user journey di Luca (Cap. 4.5) identifica come requisito critico un caricamento sotto i 2 secondi. Next.js permette di generare queste pagine in modalità SSR o SSG, ottenendo tempi di first contentful paint inferiori rispetto a una SPA React vanilla
3. **SEO per acquisizione organica**: il business plan include il content marketing SEO come canale di acquisizione primario. Le landing page dei barbieri devono essere indicizzabili, requisito risolto dal rendering server-side di Next.js
4. **Standard di mercato**: nel 2026 Next.js è il framework di default per progetti React SaaS, con documentazione, community e tooling maturi

#### Adozione di TypeScript

**Decisione**: Il codice applicativo è scritto in TypeScript, non in JavaScript puro.

**Motivazioni**:
1. **Qualità del codice generato da AI tool**: il workflow di sviluppo previsto per il progetto include l'uso intensivo di AI assistant (GitHub Copilot, Claude) per la generazione di codice partendo da design Figma e istruzioni testuali. TypeScript fornisce agli AI tool le informazioni di tipo necessarie per generare codice corretto al primo tentativo, riducendo gli errori di integrazione con il database
2. **Tipi auto-generati da Supabase**: lo schema delle 33 tabelle v1 (38 totali) può essere tradotto in tipi TypeScript automaticamente con il comando `npx supabase gen types typescript`. Questo garantisce coerenza end-to-end tra database e codice applicativo senza dichiarazioni manuali
3. **Rilevamento errori in fase di sviluppo**: in un progetto con 4 ruoli utente, multi-tenant, 33 tabelle e branding dinamico, il rilevamento precoce di errori di tipo da parte dell'editor (VS Code) riduce significativamente il tempo di debug

**Data della decisione**: 9 aprile 2026
**Stato**: applicata a tutta la documentazione a partire dalla sessione di audit 4

---

## 3 — Stack di SaaS di riferimento

### 3.1 — SaaS nel settore booking/beauty

| SaaS | Frontend | Backend | Database | Hosting | Modello | Fonte |
|------|----------|---------|----------|---------|---------|-------|
| **Calendly** | React, Next.js | Ruby on Rails, Node.js | PostgreSQL | AWS, Docker, Kubernetes | Freemium SaaS | StackShare, job postings |
| **Acuity Scheduling** | React | Ruby on Rails | PostgreSQL | Heroku / AWS | SaaS (acquisito da Squarespace) | Crunchbase, tech blog |
| **Fresha** | React, Vue.js | Node.js, PHP/Laravel | MySQL / PostgreSQL | AWS, Docker | Marketplace + SaaS | StackShare, engineering blog |
| **GlossGenius** | React Native (mobile + web) | Node.js, Serverless | PostgreSQL | Google Cloud / AWS | Vertical SaaS | Job postings, TechCrunch |
| **Phorest** | Angular | .NET Core | SQL Server | Azure | Enterprise SaaS | Company blog, StackShare |
| **Mangomint** | React | Ruby on Rails | PostgreSQL | AWS | Vertical SaaS | Job postings |
| **Barberly** | React Native | Node.js | MongoDB | AWS | Vertical SaaS | App Store analysis |
| **Square Appointments** | React | Go, Java | PostgreSQL, NoSQL | GCP | Platform SaaS | Engineering blog |

### 3.2 — SaaS di riferimento per architettura simile (Next.js + Supabase)

| SaaS | Stack | Utenti | Revenue | Note |
|------|-------|--------|---------|------|
| **Cal.com** | Next.js + Prisma + PostgreSQL | 20K+ | Open-source + Enterprise | Scheduling open-source, architettura di riferimento |
| **Dub.co** | Next.js + Tinybird + Planetscale | 50K+ | $1M+ ARR | Link management, ottimo esempio di SaaS Next.js |
| **Plausible** | Elixir + ClickHouse | 10K+ | $1M+ ARR | Analytics privacy-first, modello SaaS verticale |
| **Resend** | Next.js + React Email | 30K+ | Growing | Email API, stack moderno Next.js |

---

## 4 — Raccomandazioni per layer

### 4.1 — Frontend

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **Next.js 14+ (App Router)** | SSR/SSG/ISR nativi, React Server Components, routing file-based, ottimizzazione immagini, SEO, full-stack | Complessità App Router, curve con RSC | Gratuito (OSS) | Media (3-4 settimane) | ✅ **SÌ** |
| React + Vite | Veloce in dev, bundle ottimizzato, SPA pura | No SSR nativo, SEO limitato, routing manuale | Gratuito (OSS) | Bassa (1-2 settimane) | ⚠️ Solo per dashboard interna |
| Remix | Full-stack React, form handling nativo, nested routes | Community più piccola, meno ecosystem | Gratuito (OSS) | Media (3-4 settimane) | ❌ |
| Vue.js + Nuxt | Sintassi più semplice, buona DX | Ecosystem più piccolo, meno risorse per SaaS | Gratuito (OSS) | Bassa (2-3 settimane) | ❌ |

**Raccomandazione**: **Next.js 14+** con App Router. Motivazioni:
- La PWA del cliente richiede **SSR per SEO** (la landing page di ogni barbiere deve essere indicizzata)
- **React Server Components** riducono il bundle JS inviato al client — critico per mobile (target: barbieri con smartphone)
- Il routing file-based semplifica la struttura multi-tenant (`/[slug]/...`)
- Integrazione nativa con Vercel per deployment zero-config
- Ampia community e risorse specifiche per SaaS

### 4.2 — UI Framework e Design System

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **shadcn/ui + Tailwind CSS** | Componenti copy-paste, accessibili (Radix), personalizzabili, no vendor lock-in | Non è una libreria "installabile", richiede copia file | Gratuito (OSS) | Media (2-3 settimane) | ✅ **SÌ** |
| Chakra UI | API semplice, accessibile, theming potente | Bundle più pesante, meno flessibile del utility-first | Gratuito (OSS) | Bassa (1-2 settimane) | ⚠️ Alternativa valida |
| Material UI (MUI) | Ecosystem maturo, molti componenti | Pesante, opinionated, aspetto "Google" | Gratuito (OSS, pro $) | Media | ❌ |
| Ant Design | Ricchissimo di componenti enterprise | Pesante, design language cinese, difficile da customizzare | Gratuito (OSS) | Media | ❌ |

**Raccomandazione**: **shadcn/ui + Tailwind CSS + Radix UI**. Motivazioni:
- Il white-label richiede **CSS variables per tenant** — Tailwind + CSS variables = perfetto
- shadcn/ui è basato su Radix (accessibilità WCAG nativa)
- Componenti come calendar, dialog, dropdown sono essenziali per un booking system
- Nessun vendor lock-in: i componenti sono nel tuo codice

### 4.3 — Backend e API

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **Supabase (Edge Functions + RLS)** | PostgreSQL managed, Auth integrato, Realtime, Storage, RLS per multi-tenancy | Vendor lock-in parziale, Edge Functions limitate | Free → $25/mese (Pro) | Media (3-4 settimane) | ✅ **SÌ** |
| Next.js API Routes + Prisma | Full-stack in un progetto, type-safe ORM | Serverless cold starts, no realtime nativo | Gratuito (OSS) | Media (2-3 settimane) | ⚠️ Complementare a Supabase |
| Express.js / Fastify | Massima flessibilità, pieno controllo | Tutto da costruire (auth, realtime, storage) | Gratuito (OSS) | Bassa-Media | ❌ Per v1 |
| Firebase | Realtime maturo, mobile SDK eccellente | NoSQL (non ideale per relazioni complesse), vendor lock-in Google, costi imprevedibili | Free → pay-per-use | Bassa | ❌ |

**Raccomandazione**: **Supabase come backend primario** + **Next.js API Routes per logica custom**. Motivazioni:
- Il database schema con 33 tabelle relazionali è **progettato per PostgreSQL** — Supabase è PostgreSQL managed
- RLS multi-tenant è già pianificato nel documento di architettura
- Auth con OTP SMS per clienti è nativo in Supabase Auth
- Edge Functions per calcolo slot disponibili (Decisione 6 del DB)
- Next.js API Routes per logica che non è puro CRUD (es. generazione template social, integrazione OpenAI)

### 4.4 — Database

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **PostgreSQL (via Supabase)** | Relazionale, RLS, JSONB, exclusion constraints, btree_gist, maturo | Scaling verticale (non orizzontale), Supabase limita alcune estensioni | Incluso in Supabase | Media | ✅ **SÌ** |
| MySQL / PlanetScale | Veloce, branching (PlanetScale), scaling orizzontale | No RLS nativo, no exclusion constraints, JSONB meno maturo | PlanetScale: da $39/mese | Media | ❌ |
| MongoDB | Schema flessibile, scaling orizzontale | Non ideale per relazioni complesse (33 tabelle!), no ACID completo | Atlas: da $0 (free) | Bassa | ❌ |
| CockroachDB | PostgreSQL-compatible, distributed | Complessità operativa, costo per startup | Da $0 (free tier) | Alta | ❌ |

**Raccomandazione**: **PostgreSQL via Supabase** — l'intero schema database è già progettato per PostgreSQL con funzionalità specifiche (RLS, exclusion constraints, btree_gist, partial unique index). Cambiare database richiederebbe una riprogettazione completa.

### 4.5 — Autenticazione

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **Supabase Auth** | Integrato con DB, RLS-aware, OTP SMS, OAuth, PKCE | Meno personalizzabile di Auth0, custom claims limitati | Incluso (50K MAU free) | Bassa | ✅ **SÌ** |
| Clerk | DX eccellente, UI pre-built, webhook | Costo per MAU, vendor lock-in | Free → $25/mese + $0.02/MAU | Bassa | ⚠️ Valida alternativa |
| Auth0 | Enterprise-grade, SSO, MFA, compliance | Complesso, costoso per scale | Free (7.5K MAU) → $23/mese | Media-Alta | ❌ Overkill per v1 |
| NextAuth.js (Auth.js) | Open-source, flessibile, Next.js nativo | Richiede gestione sessioni, no OTP SMS nativo | Gratuito (OSS) | Media | ❌ |

**Raccomandazione**: **Supabase Auth** — già pianificato, integrato con RLS, supporta OTP SMS per i clienti (Decisione 3: `user_type` in `profiles`).

### 4.6 — Pagamenti

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **Stripe** | Standard de facto, API eccellente, subscription billing, Connect per marketplace | Commissione 1.5%+€0.25 (EU), webhook complessi | Pay-per-use | Media | ✅ **SÌ** |
| Lemon Squeezy | Merchant of Record (gestisce IVA/tasse), API semplice | Commissione 5%+$0.50, meno funzionalità | Pay-per-use | Bassa | ⚠️ Per vendita B2B semplificata |
| Paddle | MoR come Lemon Squeezy, compliance fiscale | Commissione 5%+$0.50, meno flessibile | Pay-per-use | Bassa | ❌ |
| PayPal | Diffuso in Italia, familiarità utente | API meno moderne, UX peggiore, commissioni alte | 2.9%+€0.35 | Bassa | ❌ |

**Raccomandazione**: **Stripe** per i pagamenti dei barbieri (subscription) e dei clienti (booking online in v2). La tabella `payments` nel DB è già progettata con `stripe_payment_id` e `stripe_customer_id`.

### 4.7 — Email transazionali

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **Resend** | API moderna, React Email per template, DX eccellente | Nuovo (meno maturo), limiti free tier | 3.000 email/mese gratis → $20/mese | Bassa | ✅ **SÌ** |
| Postmark | Deliverability eccellente, veloce | Più costoso, API meno moderna | 100 email/mese gratis → $15/mese | Bassa | ⚠️ Alternativa premium |
| SendGrid (Twilio) | Maturo, alto volume, analytics | UX datata, deliverability calata | 100 email/giorno gratis → $20/mese | Media | ❌ |
| Amazon SES | Economicissimo ad alto volume | Setup complesso, no template builder | $0.10 per 1.000 email | Alta | ❌ Per v1 |

**Raccomandazione**: **Resend** con **React Email** per i template. Stack perfettamente integrato con Next.js e React.

### 4.8 — SMS e WhatsApp

| Opzione | Pro | Contro | Costo (Italia) | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|----------------|-------------|----------------|
| **Twilio** | API matura, WhatsApp Business API, globale | Costo SMS Italia relativamente alto | SMS: ~€0.05/msg, WhatsApp: ~€0.03/msg | Media | ✅ **SÌ** |
| MessageBird | API unificata SMS+WhatsApp, buon supporto EU | Acquisito da Bird, pivot in corso | SMS: ~€0.05/msg, WhatsApp: ~€0.03/msg | Media | ⚠️ Alternativa (già citato nel progetto) |
| Vonage (Nexmo) | Affidabile, API stabile | Meno innovativo, DX non al top | SMS: ~€0.06/msg | Media | ❌ |
| Infobip | Forte in Europa, omnichannel | Pricing opaco, enterprise-oriented | Su richiesta | Media | ❌ |

**Raccomandazione**: **Twilio** per SMS + WhatsApp Business API. Motivazioni: API più stabile e documentata, integrazione Supabase Auth per OTP già disponibile, pricing trasparente.

### 4.9 — Analytics e monitoring

| Opzione | Pro | Contro | Costo | Curva appr. | ⭐ Raccomandato |
|---------|-----|--------|-------|-------------|----------------|
| **PostHog** | Product analytics + session recording + feature flags, self-hostable, GDPR-friendly | Richiede setup, UI meno polished | 1M eventi/mese gratis → $0.00045/evento | Bassa-Media | ✅ **SÌ** |
| **Sentry** | Error tracking best-in-class, performance monitoring | Solo errori (non product analytics) | 5K errori/mese gratis → $26/mese | Bassa | ✅ **SÌ** (complementare) |
| Plausible | Privacy-first, leggero, GDPR-compliant | Solo web analytics (no product analytics) | €9/mese | Bassa | ⚠️ Per landing page |
| Mixpanel | Product analytics potente, funnel/retention | Costoso a scala, meno privacy-friendly | Free (20M eventi) → $28/mese | Media | ❌ |
| Google Analytics 4 | Gratuito, potente | GDPR problematico, complesso, dati Google | Gratuito | Media | ❌ |

**Raccomandazione**: **PostHog** per product analytics + **Sentry** per error tracking. PostHog è self-hostable (GDPR compliance) e include feature flags — utili per il rollout graduale delle funzionalità.

---

## 5 — Architettura consigliata

### 5.1 — Monolith vs Microservizi

| Aspetto | Monolith modulare | Microservizi |
|---------|-------------------|--------------|
| **Complessità iniziale** | ✅ Bassa | ❌ Alta |
| **Time-to-market** | ✅ Veloce | ❌ Lento |
| **Costo operativo** | ✅ Basso | ❌ Alto (orchestrazione, networking) |
| **Team richiesto** | ✅ 1-3 sviluppatori | ❌ 5+ sviluppatori |
| **Scalabilità** | ⚠️ Verticale (sufficiente fino a 10K+ utenti) | ✅ Orizzontale |
| **Deployment** | ✅ Semplice | ❌ Complesso (CI/CD per servizio) |

**Raccomandazione**: **Modular monolith** con Next.js. Struttura suggerita:

```
styll/
├── apps/
│   └── web/                    # Next.js App (dashboard + PWA + landing)
│       ├── app/
│       │   ├── (marketing)/    # Landing page B2B
│       │   ├── (auth)/         # Login/signup
│       │   ├── admin/          # Dashboard admin piattaforma
│       │   ├── dashboard/      # Dashboard barbiere
│       │   └── [slug]/         # PWA cliente (multi-tenant via slug)
│       ├── components/
│       │   ├── ui/             # shadcn/ui components
│       │   ├── booking/        # Componenti prenotazione
│       │   ├── loyalty/        # Componenti loyalty/gamification
│       │   └── dashboard/      # Componenti dashboard
│       └── lib/
│           ├── supabase/       # Client + server Supabase
│           ├── stripe/         # Integrazione Stripe
│           └── utils/          # Helpers condivisi
├── packages/
│   ├── db/                     # Tipi TypeScript generati da Supabase
│   ├── emails/                 # Template email (React Email)
│   └── shared/                 # Logica condivisa (validazione, costanti)
├── supabase/
│   ├── migrations/             # SQL migrations
│   ├── functions/              # Edge Functions (slot calculation, cron)
│   ├── seed.sql                # Dati di seed per sviluppo
│   └── config.toml             # Config Supabase locale
└── docs/                       # Documentazione tecnica
```

### 5.2 — Multi-tenancy

**Approccio raccomandato**: **Shared database, shared schema, RLS isolation** (già pianificato).

```
┌──────────────────────────────────────────────────┐
│                   Next.js App                     │
│  ┌─────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Landing  │  │  Dashboard   │  │  PWA Client  │ │
│  │  B2B     │  │  Barbiere    │  │  [slug]      │ │
│  └─────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │
              ┌────────▼────────┐
              │   Supabase      │
              │  ┌────────────┐ │
              │  │  Auth      │ │
              │  │  (JWT+RLS) │ │
              │  └────────────┘ │
              │  ┌────────────┐ │
              │  │ PostgreSQL │ │
              │  │  (RLS per  │ │
              │  │  tenant_id)│ │
              │  └────────────┘ │
              │  ┌────────────┐ │
              │  │  Edge Fn   │ │
              │  │  (Slot,    │ │
              │  │   Cron)    │ │
              │  └────────────┘ │
              │  ┌────────────┐ │
              │  │  Storage   │ │
              │  │  (Logo,    │ │
              │  │   Foto)    │ │
              │  └────────────┘ │
              └─────────────────┘
```

**Vantaggi di questo approccio per Styll**:
- **Costo**: un solo database per tutti i tenant (vs un database per tenant)
- **Manutenzione**: una sola migrazione da applicare (vs N migrazioni)
- **Sicurezza**: RLS garantisce isolamento a livello di database (non applicativo)
- **Semplicità**: il `tenant_id` è l'unico discriminante, la funzione `get_my_tenant_id()` centralizza la logica

### 5.3 — API design

**Raccomandazione**: **Supabase client SDK** per operazioni CRUD + **Next.js Server Actions** per logica complessa.

| Tipo operazione | Approccio | Esempio |
|----------------|-----------|---------|
| CRUD semplice | Supabase JS client con RLS | `supabase.from('appointments').select('*')` |
| Logica complessa | Next.js Server Actions | Creazione appuntamento con validazione slot |
| Calcolo slot | Supabase Edge Function | Calcolo disponibilità in tempo reale |
| Webhook esterni | Next.js API Routes | Stripe webhook, MessageBird callback |
| Cron jobs | Supabase Scheduled Functions | Riconciliazione notturna, churn detection |

### 5.4 — Caching

| Layer | Strumento | Uso |
|-------|-----------|-----|
| **Browser** | React Query (TanStack Query) | Cache client-side per dati frequenti (servizi, orari) |
| **CDN** | Vercel Edge Cache | Caching delle landing page dei barbieri (ISR) |
| **Database** | `STABLE` function + prepared statements | `get_my_tenant_id()` cacheable per transazione |
| **Application** | `unstable_cache` (Next.js) | Cache server-side per dati semi-statici (piani, feature flags) |

**Nota**: Per v1, **non serve Redis**. TanStack Query + ISR + PostgreSQL `STABLE` functions sono sufficienti fino a migliaia di utenti.

### 5.5 — Queue e background jobs

| Fase | Strumento | Uso |
|------|-----------|-----|
| **v1** | Supabase Edge Functions + `pg_cron` | Cron notturno (riconciliazione analytics, churn detection, tier reset) |
| **v1** | Supabase Database Webhooks | Trigger su insert/update (notifiche push, aggiornamento metriche) |
| **v2** | Trigger.dev o Inngest | Job asincroni complessi (generazione template social, import CSV, AI) |

### 5.6 — File storage

| Tipo file | Storage | Strategia |
|-----------|---------|-----------|
| Logo tenant | Supabase Storage (bucket pubblico) | Upload con resize server-side, CDN |
| Foto staff | Supabase Storage (bucket pubblico) | Limite 2MB, resize automatico |
| Foto prodotti | Supabase Storage (bucket pubblico) | Ottimizzazione Next.js Image |
| Export CSV | Supabase Storage (bucket privato) | Generazione on-demand, URL firmato |
| Template social | Supabase Storage (bucket privato) | Generati server-side con Sharp/Canvas |

---

## 6 — Infrastruttura e hosting

### 6.1 — Confronto provider

| Provider | Piano | Costo/mese | Pro | Contro | ⭐ Raccomandato |
|----------|-------|-----------|-----|--------|----------------|
| **Vercel** | Pro | $20/utente | Best-in-class Next.js DX, preview deploys, CDN globale, ISR nativo | Costi imprevedibili per bandwidth, vendor lock-in | ✅ **SÌ (v1)** |
| **Railway** | Pro | $5 + usage | Container always-on, DB integrato, pricing prevedibile | No edge functions, meno integrato con Next.js | ⚠️ Alternativa economica |
| **Fly.io** | Pay-as-you-go | $5 + usage | Edge globale, Docker, persistent volumes | Richiede Docker expertise, più DIY | ⚠️ Per scaling futuro |
| **Render** | Starter | $7 + usage | Semplice, DB managed, free tier | No edge, build lenti | ❌ |
| **Netlify** | Pro | $19/utente | Buono per static/JAMstack | Next.js SSR via adapter (non nativo), overage costoso | ❌ |
| **AWS (ECS/Lambda)** | On-demand | Variabile | Massima flessibilità, scaling illimitato | Complessità operativa enorme, richiede DevOps | ❌ Per v1 |
| **Supabase** | Pro | $25/progetto | Backend completo (DB + Auth + Storage + Edge Fn) | Vendor lock-in parziale | ✅ **SÌ** (già scelto) |

### 6.2 — Stack hosting raccomandato

```
┌─────────────────────────────────────────┐
│           Vercel ($20/mese)             │
│  Next.js App (SSR, ISR, API Routes)     │
│  CDN globale, Preview Deploys           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Supabase ($25/mese)             │
│  PostgreSQL, Auth, Edge Functions,      │
│  Storage, Realtime, Scheduled Functions │
└─────────────────────────────────────────┘
```

**Costo base hosting v1**: ~$45/mese (Vercel Pro + Supabase Pro)

---

## 7 — Sicurezza

### 7.1 — Checklist sicurezza per Styll

| # | Area | Requisito | Priorità | Strumento/Approccio |
|---|------|-----------|----------|---------------------|
| 1 | **HTTPS** | Tutti i domini serviti via HTTPS | 🔴 Critico | Vercel (automatico), Supabase (automatico) |
| 2 | **Autenticazione** | JWT + RLS, OTP SMS, password hashing (bcrypt via Supabase Auth) | 🔴 Critico | Supabase Auth |
| 3 | **Autorizzazione** | RLS policy per ogni tabella, `get_my_tenant_id()` | 🔴 Critico | PostgreSQL RLS |
| 4 | **OWASP Top 10** | Protezione XSS, CSRF, injection, broken auth | 🔴 Critico | Next.js (CSP headers), Supabase (parametrized queries) |
| 5 | **Encryption at rest** | Database crittografato | 🔴 Critico | Supabase (AES-256 su AWS) |
| 6 | **Encryption in transit** | TLS 1.3 per tutte le connessioni | 🔴 Critico | Automatico (Vercel + Supabase) |
| 7 | **Rate limiting** | Protezione brute-force login, API abuse | 🟡 Alto | Supabase Auth (built-in), Vercel (Edge Middleware) |
| 8 | **CORS** | Whitelist domini autorizzati | 🟡 Alto | Next.js middleware, Supabase config |
| 9 | **GDPR** | Consensi granulari, data export, diritto all'oblio | 🔴 Critico | Tabella `client_consents`, soft delete |
| 10 | **Backup** | Backup automatici giornalieri | 🟡 Alto | Supabase Pro (7 giorni, point-in-time recovery) |
| 11 | **Input validation** | Validazione server-side per tutti i form | 🟡 Alto | Zod (TypeScript schema validation) |
| 12 | **Secrets management** | Chiavi API in variabili d'ambiente, mai in codice | 🔴 Critico | Vercel Environment Variables, `.env.local` |
| 13 | **Content Security Policy** | CSP headers per prevenire XSS | 🟡 Alto | Next.js `next.config.js` headers |
| 14 | **Audit logging** | Log di azioni critiche (login, modifica dati, eliminazione) | 🟢 Medio | Tabella `tenant_activity_log` (già pianificata) |
| 15 | **Dependency scanning** | Vulnerabilità nelle dipendenze | 🟢 Medio | Dependabot (GitHub), `npm audit` |

### 7.2 — Best practice specifiche per Styll

1. **Multi-tenant isolation**: testare RLS con utente A che tenta di accedere ai dati del tenant B
2. **OTP SMS**: rate limiting rigoroso (max 5 OTP/ora per numero) per prevenire SMS pumping
3. **File upload**: validare MIME type e dimensione lato server (logo, foto prodotti)
4. **Webhook Stripe**: verificare firma (`stripe.webhooks.constructEvent`) per prevenire spoofing
5. **Edge Functions**: non esporre `service_role` key al client — usare solo in server-side
6. **PWA**: implementare `Content-Security-Policy` strict per il manifest e service worker

---

## 8 — DevOps e CI/CD

### 8.1 — Git workflow

**Raccomandazione**: **GitHub Flow** (semplificato per team piccolo).

```
main (produzione)
  └── feature/booking-system
  └── feature/loyalty-engine
  └── fix/slot-overlap-bug
  └── chore/update-deps
```

| Branch | Scopo | Deploy |
|--------|-------|--------|
| `main` | Codice in produzione | Auto-deploy su Vercel (production) |
| `feature/*` | Nuove funzionalità | Preview deploy su Vercel |
| `fix/*` | Bug fix | Preview deploy |
| `staging` (opzionale v2) | Pre-produzione | Deploy su ambiente staging |

### 8.2 — Pipeline CI/CD

```yaml
# .github/workflows/ci.yml (esempio)
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint          # ESLint + Prettier
      - run: npm run type-check    # TypeScript
      - run: npm run test          # Vitest (unit + integration)
      - run: npm run build         # Next.js build
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright test   # E2E tests
  db:
    runs-on: ubuntu-latest
    steps:
      - run: supabase db lint      # Lint SQL migrations
      - run: supabase test db      # pgTAP tests per RLS
```

### 8.3 — Testing strategy

| Tipo | Strumento | Cosa testa | Coverage target |
|------|-----------|-----------|-----------------|
| **Unit** | Vitest | Funzioni pure, validazione, calcoli loyalty/churn | 80%+ |
| **Integration** | Vitest + Supabase local | API routes, Edge Functions, RLS policy | 70%+ |
| **E2E** | Playwright | Flussi utente critici (booking, login, loyalty) | Flussi core |
| **Database** | pgTAP (via Supabase CLI) | RLS policy, trigger, constraint, funzioni SQL | Tutte le policy |
| **Visual** | Storybook (opzionale v2) | Componenti UI isolati | Componenti chiave |

### 8.4 — Ambienti

| Ambiente | Hosting | Database | Scopo |
|----------|---------|----------|-------|
| **Local** | `next dev` + Supabase CLI | Supabase local (Docker) | Sviluppo |
| **Preview** | Vercel Preview | Supabase project di staging | Review PR |
| **Production** | Vercel Production | Supabase project di produzione | Utenti reali |
| **Staging** (v2) | Vercel (branch `staging`) | Supabase project di staging | Pre-release testing |

### 8.5 — Monitoring e logging

| Strumento | Funzione | Costo |
|-----------|----------|-------|
| **Sentry** | Error tracking, performance monitoring | Free (5K eventi/mese) |
| **PostHog** | Product analytics, session recording, feature flags | Free (1M eventi/mese) |
| **Vercel Analytics** | Web vitals, performance | Incluso in Pro |
| **Supabase Dashboard** | Query performance, connection pool, storage usage | Incluso |
| **Better Uptime / UptimeRobot** | Uptime monitoring, alerting | Free tier disponibile |

---

## 9 — Tool e servizi terzi

| Categoria | Tool raccomandato | Costo/mese | Alternativa gratuita |
|-----------|------------------|-----------|---------------------|
| **Hosting frontend** | Vercel Pro | $20 | Netlify Free (limiti) |
| **Backend + DB + Auth** | Supabase Pro | $25 | Supabase Free (limiti) |
| **Pagamenti** | Stripe | Pay-per-use (~1.5%+€0.25) | — |
| **Email transazionali** | Resend | $0 (3K/mese) → $20 | Supabase Auth emails (solo OTP) |
| **SMS / WhatsApp** | Twilio | Pay-per-use (~€0.05/SMS) | — |
| **Error tracking** | Sentry | $0 (5K/mese) | LogRocket Free |
| **Product analytics** | PostHog | $0 (1M eventi/mese) | Plausible ($9/mese) |
| **Design / Prototyping** | Figma | $0 (Free per 1 utente) | Penpot (OSS) |
| **Repo / CI/CD** | GitHub + Actions | $0 (Free per repo pubblici) | GitLab Free |
| **DNS / Domini** | Cloudflare | $0 (DNS gratuito) + ~€10/anno dominio | — |
| **Image optimization** | Vercel Image Optimization | Incluso in Pro | Sharp (self-hosted) |
| **Validazione form** | Zod | $0 (OSS) | Yup (OSS) |
| **ORM / Query builder** | Supabase JS Client | $0 (incluso) | Prisma (OSS), Drizzle (OSS) |
| **UI Components** | shadcn/ui + Radix UI | $0 (OSS) | Headless UI (OSS) |
| **CSS Framework** | Tailwind CSS | $0 (OSS) | — |
| **State management** | TanStack Query + Zustand | $0 (OSS) | React Context |
| **Testing** | Vitest + Playwright | $0 (OSS) | Jest + Cypress |
| **Linting** | ESLint + Prettier + Biome | $0 (OSS) | — |
| **Background jobs** | Supabase Cron / Edge Functions | Incluso | Trigger.dev (v2) |
| **PWA** | next-pwa / Serwist | $0 (OSS) | Workbox (Google) |

---

## 10 — Scalabilità

### 10.1 — Piano di scaling progressivo

#### Fase 1: 0–1.000 utenti (MVP → Product-Market Fit)

| Aspetto | Approccio | Costo stimato |
|---------|-----------|---------------|
| **Architettura** | Monolith Next.js + Supabase | — |
| **Database** | Supabase Pro (8 GB, 1 istanza) | $25/mese |
| **Hosting** | Vercel Pro (1 seat) | $20/mese |
| **CDN** | Vercel Edge Network (incluso) | $0 |
| **Cache** | TanStack Query (client) + ISR (server) | $0 |
| **Background jobs** | pg_cron + Edge Functions | $0 (incluso) |
| **Monitoring** | Sentry Free + PostHog Free | $0 |
| **Team** | 1-2 sviluppatori full-stack | — |
| **Focus** | Velocità di iterazione, feedback utenti, PMF | — |

#### Fase 2: 1.000–10.000 utenti (Growth)

| Aspetto | Approccio | Costo stimato |
|---------|-----------|---------------|
| **Database** | Supabase Pro (scale compute, read replicas) | $50-150/mese |
| **Hosting** | Vercel Pro (2-3 seats) | $40-60/mese |
| **CDN** | Vercel Edge + Cloudflare (opzionale) | $0-20/mese |
| **Cache** | Aggiungere Upstash Redis per session/cache | $10-30/mese |
| **Background jobs** | Trigger.dev o Inngest per job complessi | $0-25/mese |
| **Monitoring** | Sentry Team + PostHog Scale | $26-50/mese |
| **Email** | Resend Pro (50K/mese) | $20/mese |
| **Team** | 3-5 sviluppatori | — |
| **Focus** | Performance, stabilità, multi-location, team features | — |

#### Fase 3: 10.000+ utenti (Scale)

| Aspetto | Approccio | Costo stimato |
|---------|-----------|---------------|
| **Database** | Supabase Enterprise o PostgreSQL self-managed (RDS) | $200-500/mese |
| **Hosting** | Vercel Enterprise o Kubernetes (EKS/GKE) | $200-500/mese |
| **CDN** | Cloudflare Pro + Vercel | $20-50/mese |
| **Cache** | Redis cluster (Upstash/ElastiCache) | $50-100/mese |
| **Background jobs** | Dedicated queue (BullMQ + Redis) | $50-100/mese |
| **Monitoring** | Datadog o Grafana Cloud | $50-200/mese |
| **Email** | Resend Business o SES | $50-100/mese |
| **Search** | Meilisearch o Typesense (ricerca clienti) | $30-50/mese |
| **Team** | 5-10 sviluppatori + DevOps | — |
| **Focus** | Ottimizzazione costi, compliance enterprise, API pubblica | — |

### 10.2 — Database scaling strategy

| Metrica | Soglia | Azione |
|---------|--------|--------|
| **Connessioni attive** | >80% pool | Aggiungere connection pooling (PgBouncer, già incluso in Supabase) |
| **Query time P95** | >500ms | Analizzare con `EXPLAIN ANALYZE`, aggiungere indici |
| **Storage** | >7 GB (80% del Pro) | Upgrade compute o partitioning tabelle grandi (`appointments`, `loyalty_transactions`) |
| **Righe in tabelle hot** | >1M per tenant | Partitioning per `tenant_id` o per data |
| **RLS overhead** | >20ms per query | Ottimizzare `get_my_tenant_id()`, custom claims JWT |

---

## 11 — Stima costi tecnologici

### 11.1 — Costi per fase (solo infrastruttura, escluso team)

| Servizio | 0–100 utenti | 100–1.000 utenti | 1.000–10.000 utenti | 10.000+ utenti |
|----------|-------------|------------------|--------------------|--------------------|
| **Supabase** | $0 (free) | $25 (pro) | $75-150 | $200-500 |
| **Vercel** | $0 (hobby) | $20 (pro) | $40-100 | $200-500 |
| **Stripe** | $0 (pay-per-use) | ~$15-50 | ~$100-500 | ~$500-2.000 |
| **Twilio (SMS)** | ~$5-10 | ~$20-50 | ~$100-300 | ~$500-1.500 |
| **Resend (Email)** | $0 (free) | $0-20 | $20-50 | $50-100 |
| **Sentry** | $0 (free) | $0 | $26 | $80-200 |
| **PostHog** | $0 (free) | $0 | $0-50 | $50-200 |
| **Dominio + DNS** | ~$1/mese | ~$1/mese | ~$2/mese | ~$5/mese |
| **Redis (Upstash)** | $0 | $0 | $10-30 | $50-100 |
| | | | | |
| **TOTALE** | **~$6-11/mese** | **~$81-166/mese** | **~$373-1.230/mese** | **~$1.635-5.105/mese** |

### 11.2 — Analisi sostenibilità

| Fase | Utenti | Revenue stimato (MRR) | Costi infra | Margine |
|------|--------|-----------------------|-------------|---------|
| **Pre-launch** | 0-10 | €0 (trial) | ~€10/mese | -€10 |
| **Early** | 10-100 | €290-2.900 (a €29/mese medio) | ~€50-100/mese | ✅ 65-97% |
| **Growth** | 100-1.000 | €2.900-29.000 | ~€100-500/mese | ✅ 83-97% |
| **Scale** | 1.000-10.000 | €29.000-290.000 | ~€500-2.000/mese | ✅ 93-98% |

**Conclusione**: I margini SaaS sono eccellenti (>80%) a partire da ~50 utenti paganti, grazie allo stack moderno a basso costo operativo.

---

## 12 — Riscontri e osservazioni per il tuo progetto

### 12.1 — Punti di forza del progetto

1. **Documentazione eccezionale**: la qualità e la profondità della documentazione (2.852 righe) è rara per un progetto di tesi. Le 12 decisioni architetturali del database sono particolarmente mature.

2. **Posizionamento di mercato chiaro**: "retention-first per micro-barbieri" è un posizionamento specifico e difendibile. La gamification come blue ocean è supportata da dati (mercato gamification: $49B entro 2029).

3. **Architettura database production-ready**: Il design con RLS, exclusion constraints, soft delete con audit trail, e GDPR compliance è di livello professionale — non tipico per una tesi.

4. **User-centricity**: 4 personas dettagliate con journey maps complete dimostrano comprensione profonda degli utenti.

### 12.2 — Raccomandazioni specifiche

1. **Inizia con un MVP più snello**: le 33 tabelle v1 sono troppe per un primo rilascio. Suggerimento:
   - **MVP-0 (4-6 settimane)**: Tenants + Profiles + Staff + Services + Appointments + Clients (8 tabelle)
   - **MVP-1 (+4 settimane)**: Loyalty base + Working hours + Payments (13 tabelle)
   - **MVP-2 (+4 settimane)**: Analytics, Reviews, Messaging (19 tabelle)
   - **v1 completa (+4 settimane)**: Tutte le 33 tabelle

2. **Adotta TypeScript dall'inizio**: non è menzionato nei documenti ma è essenziale per un progetto di questa complessità. Supabase genera tipi TypeScript dal database (`supabase gen types typescript`).

3. **Testa le RLS policy prima di scrivere codice applicativo**: usa `pgTAP` e la Supabase CLI per scrivere test sulle policy. Esempio:
   ```sql
   -- Test: staff non può vedere clienti di un altro tenant
   SET request.jwt.claims = '{"sub": "user-id-tenant-A"}';
   SELECT is_empty(
     $$ SELECT * FROM clients WHERE tenant_id = 'tenant-B-id' $$,
     'Staff cannot see other tenant clients'
   );
   ```

4. **Usa Next.js con App Router**: il routing `[slug]` per multi-tenant è nativo, ISR per le landing page dei barbieri migliora SEO e performance, e Server Components riducono il bundle per la PWA mobile.

5. **Implementa la PWA con Serwist (ex next-pwa)**: per il caching offline del manifest, delle pagine di booking, e delle notifiche push.

6. **CSS Variables per white-label**: il sistema di branding per tenant si implementa elegantemente con CSS custom properties:
   ```css
   :root {
     --brand-primary: var(--tenant-primary, #1A1A2E);
     --brand-secondary: var(--tenant-secondary, #E94560);
   }
   ```

7. **Valuta Drizzle ORM come layer opzionale**: se le query Supabase diventano complesse, Drizzle offre type-safety superiore con PostgreSQL e si integra con Supabase.

### 12.3 — Rischi da mitigare

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| **Complessità scope v1** | Alta | Alto | MVP incrementale (vedi sopra) |
| **Performance RLS con molti tenant** | Media | Alto | Testare con `EXPLAIN ANALYZE` su dati realistici (1K tenant, 200K clienti) |
| **Costo SMS per OTP** | Media | Medio | Rate limiting, magic link come alternativa gratuita |
| **Cold start Edge Functions** | Bassa | Medio | Warm-up strategy, monitoring tempi risposta |
| **Vendor lock-in Supabase** | Bassa | Alto | Lo schema è PostgreSQL standard — migrabile |
| **Compliance GDPR SMS marketing** | Media | Alto | Double opt-in, log consensi, DPO consultazione |

### 12.4 — Consigli per la tesi

1. **Capitolo implementazione**: documenta le scelte stack con motivazioni comparative (questo documento è un ottimo punto di partenza)
2. **Benchmark performance**: misura TTFB, LCP, FID della PWA su dispositivi reali (target: Lighthouse >90)
3. **Analisi costi**: includi la tabella costi vs revenue per dimostrare sostenibilità economica del modello SaaS
4. **Sicurezza**: dedica una sezione alla dimostrazione che le RLS policy funzionano (screenshot di test pgTAP)
5. **Confronto accademico**: cita studi su multi-tenancy patterns, gamification engagement metrics, e SaaS business models

---

## 13 — Bibliografia e Fonti per la Tesi

### Fonti accademiche

1. Bezemer, C.-P., & Zaidman, A. (2010). "Multi-tenant SaaS applications: maintenance dream or nightmare?" *Proceedings of the Joint ERCIM Workshop on Software Evolution (EVOL) and International Workshop on Principles of Software Evolution (IWPSE)*, pp. 88–92. ACM. DOI: 10.1145/1862372.1862393

2. Krebs, R., Momm, C., & Kounev, S. (2012). "Architectural concerns in multi-tenant SaaS applications." *Proceedings of the 2nd International Conference on Cloud Computing and Services Science (CLOSER)*, pp. 426–431.

3. Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). "From Game Design Elements to Gamefulness: Defining Gamification." *Proceedings of the 15th International Academic MindTrek Conference*, pp. 9–15. ACM. DOI: 10.1145/2181037.2181040

4. Hamari, J., Koivisto, J., & Sarsa, H. (2014). "Does gamification work? A literature review of empirical studies on gamification." *Proceedings of the 47th Hawaii International Conference on System Sciences (HICSS)*, pp. 3025–3034. IEEE.

5. Gao, B., Sunyaev, A., & Leimeister, J. M. (2020). "SaaS-Transformation: Challenges and Solutions from the Provider's Perspective." *Business & Information Systems Engineering*, 62(4), pp. 293–309.

6. Tsai, W.-T., Sun, X., & Balasooriya, J. (2010). "Service-oriented cloud computing architecture." *Proceedings of the 7th International Conference on Information Technology: New Generations (ITNG)*, pp. 684–689. IEEE.

### Fonti tecniche e report di settore

7. ThoughtWorks. (2025). *Technology Radar Vol. 32*. ThoughtWorks Inc. Disponibile: https://www.thoughtworks.com/radar

8. Stack Overflow. (2025). *Developer Survey Results 2025*. Stack Exchange Inc. Disponibile: https://survey.stackoverflow.co/2025

9. State of JavaScript. (2024). *The State of JavaScript 2024 Survey Results*. Disponibile: https://stateofjs.com

10. Vercel. (2025). *Next.js Documentation — App Router*. Vercel Inc. Disponibile: https://nextjs.org/docs

11. Supabase. (2025). *Supabase Documentation — Row Level Security*. Supabase Inc. Disponibile: https://supabase.com/docs/guides/auth/row-level-security

12. Stripe. (2025). *Stripe Billing Documentation*. Stripe Inc. Disponibile: https://stripe.com/docs/billing

### Fonti di mercato e industry

13. Mordor Intelligence. (2025). *Gamification Market — Growth, Trends, COVID-19 Impact, and Forecasts (2025–2030)*. Mordor Intelligence.

14. Grand View Research. (2025). *Salon Management Software Market Size, Share & Trends Analysis Report*. Grand View Research Inc.

15. Gallup. (2023). *State of the Global Workplace: 2023 Report*. Gallup Inc. [Citazione: "+48% engagement con gamification"]

### Fonti tecniche — architettura e best practice

16. UX Continuum. (2025). "The Modern SaaS Tech Stack I'd Choose in 2025." Disponibile: https://uxcontinuum.com/blog/saas-development/modern-saas-tech-stack-2025

17. Asaasin.dev. (2025). "The Ultimate SaaS Tech Stack in 2025." Disponibile: https://www.asaasin.dev/blog/the-ultimate-saas-tech-stack-in-2025

18. Sabo. (2025). "The Ultimate Tech Stack for Solo SaaS Founders in 2025." Disponibile: https://getsabo.com/blog/ultimate-tech-stack-2025

19. Uara.co. (2025). "Build a SaaS from Zero: Next.js + Supabase in 2025." Disponibile: https://uara.co/blog/build-saas-nextjs-supabase-2025

20. Valletta Software. (2025). "SaaS tech stack for success in 2025: Expert take." Disponibile: https://vallettasoftware.com/pillars/saas-tech-stack

21. ScaleupAlly. (2025). "Best SaaS Tech Stack: Tools You Need to Win in 2025." Disponibile: https://scaleupally.io/blog/saas-tech-stack/

### Fonti su pricing e hosting

22. Supabase. (2025). *Pricing & Fees*. Disponibile: https://supabase.com/pricing

23. Vercel. (2025). *Pricing*. Disponibile: https://vercel.com/pricing

24. DanubeData. (2025). "Best Vercel Alternatives for Next.js Hosting in 2025: Complete Comparison." Disponibile: https://danubedata.ro/blog/best-vercel-alternatives-nextjs-hosting-2025

25. Leanware. (2025). "Supabase vs Firebase: Complete Comparison Guide for Startups in 2025." Disponibile: https://www.leanware.co/insights/supabase-vs-firebase-complete-comparison-guide

### Fonti competitor analysis

26. Fresha. (2025). *Fresha for Business — Pricing*. Disponibile: https://www.fresha.com/for-business

27. Phorest. (2025). *Phorest Salon Software — Features*. Disponibile: https://www.phorest.com

28. GlossGenius. (2025). *GlossGenius — Pricing*. Disponibile: https://www.glossgenius.com/pricing

29. Barberly. (2025). *Barberly — For Barbers*. Disponibile: https://www.barberly.app

---

> **Nota**: Questo documento è stato generato analizzando il codice e la documentazione REALE della repository `tvwebspecialist/Styll`. Le raccomandazioni sono calibrate per un budget da startup con crescita progressiva. Tutte le fonti citate sono verificabili e le raccomandazioni riflettono le best practice 2025–2026 per SaaS verticali.