> ℹ️ Questo è il riassunto del progetto. Per i dettagli completi, consulta la documentazione in [`docs/`](docs/README.md).

# Styll — Riassunto del Progetto

> **Usa questo file all'inizio di ogni nuova chat con Claude Code:**
> *"Leggi il file messaggio.md nel repo tvwebspecialist/Styll"*

---

## Sintesi

Styll è una piattaforma **SaaS verticale per barbieri** con focus sulla **retention**. Non è un marketplace: serve a chi i clienti li ha già, ma vuole gestirli meglio e farli tornare. La piattaforma è white-label al 100% — ogni barbiere ha la propria app brandizzata (PWA), senza passare dagli store. Integra loyalty gamificata, silent churn detection e win-back. Stack: Next.js 14+ (App Router) + TypeScript strict + Supabase. Target primario: barbieri italiani indipendenti (137.730 attività, 82.7% micro-imprenditori). Modello: 3 tier da €19 a €149/mese.

**La promessa:** *"Non ti porto clienti, ti aiuto a gestire i tuoi — e a farli tornare."*

---

## Stato attuale — luglio 2026

**Il prodotto è costruito e funzionante.** ~807 commit, 4 superfici deployate su Vercel, build sempre verde.

### ✅ Completato

#### Infrastruttura
- Architettura multi-tenant completa (RLS su tutte le tabelle, isolamento verificato)
- TypeScript strict end-to-end (no `any`, tipi Supabase generati)
- PWA: service worker, manifest dinamico per tenant, splash screen iOS (16 formati), installazione cross-platform
- Push notifications: onboarding barbiere e cliente, Web Push API
- Shadow mode admin (impersonazione tenant, cookie `shadow_tenant_id`)
- Staff impersonation (barbiere vede la vista di un collaboratore)
- Soft delete su `clients` e `appointments`
- Prezzo snapshot su `appointment_services` e `appointment_products`
- Security audit completo: dead code rimosso, `next/image` migrazione, error.message nascosto da client, no PII nei log Sentry

#### PWA Cliente (`/tenant/app/[slug]/`)
- **Home** con 4 stati condizionali server-side: Guest / Nessun appuntamento / Prossimo imminente (≤2h) / Prossimo futuro
- **Booking flow** in 5 step con FloatingCard: selezione servizi → staff → data/ora → conferma → successo
- **Upselling drawer** post-prenotazione (prodotti consigliati)
- **Appuntamenti** (storico e prossimi)
- **Loyalty** (punti, streak, badge, tier)
- **Punti** (dettaglio transazioni)
- **Offerte** (lista + dettaglio con floating card)
- **Prodotti** (catalogo, dettaglio, wishlist/preferiti)
- **Profilo** (dati, modifica, preferenze privacy incluso toggle churn opt-out)
- **Accesso** OTP via email (passwordless), reset password
- **Privacy policy** dinamica per tenant
- **Pagina offline** (service worker fallback)
- Branding tenant: colori CSS vars, font dinamici (Outfit/Playfair/Montserrat/Poppins/Inter), logo, splash screen

#### Dashboard Barbiere (`/tenant/dashboard/[slug]/`)
- **Home** bento grid: KPI strip giornalieri, agenda timeline, mini calendario, churn alerts, slot vuoti, top clienti, week heatmap
- **Calendario** (vista giornaliera/settimanale, modal nuovo appuntamento, modal dettaglio)
- **Clienti**: lista con ricerca/filtri, scheda dettaglio (storico, loyalty, note private, churn score), import CSV
- **Loyalty**: configurazione template (classic / streak_master / vip_club), premi, storico transazioni
- **Catalogo**: servizi e prodotti (prezzi, durata, attivazione)
- **Team**: gestione staff (ruoli, disponibilità/orari, servizi assegnati, inviti via link)
- **Vendite**: tabs Riepilogo / Appuntamenti / Pagamenti / Prodotti (analytics)
- **Marketing**: tabs Promozioni (offerte) / Messaggi / Retention (churn win-back) / Reputazione / Social
- **App** ("Il mio sito"): editor hero, editor team, anteprima iframe, AI wand, gestione contatti, salvataggio unificato
- **Notifiche**: centro notifiche con badge contatore real-time
- **Impostazioni**: orari, sedi, branding
- **Profilo**: dati personali, abbonamento, notifiche, privacy & sicurezza
- **Aiuto**: documentazione e contatti

#### Admin Superadmin (`/admin/`)
- Dashboard overview piattaforma
- Tenants: lista + dettaglio completo (appointments, audit log, clients, locations, migration, products, services, staff, subscription, working hours)
- Users: gestione profili globali
- Settings: configurazioni piattaforma
- Subscription plans: gestione tier

#### Auth & Onboarding
- Login / Register / Forgot password
- Onboarding barbiere in 4 step (business info, branding, servizi, orari)
- Onboarding staff (invite link → step 1-3 → complete)
- Select tenant (multi-tenant: un utente può essere staff in più saloni)
- Verifica email
- Firewall SSR anti-loop (proxy middleware + layout guard)

#### Landing & Marketing (`styll.it`)
- Landing page styll.it (premium white, redesign completato maggio 2026)
- Landing pubblica barbiere (`/[slug]`)
- Tenant landing alternativa (`/tenant/landing/[slug]`)
- Cookie policy (`/cookie`)
- Sub-processor list (`/sub-processor`)

#### GDPR & Legal
- **Cookie banner** floating card su tutte e 4 le superfici (PWA, dashboard, styll.it, landing) — localStorage persistence, slide-up animation, brandColor per tenant
- **Privacy policy** B2C dinamica per tenant
- **LIA** (Legitimate Interest Assessment) — Silent Churn Detector (`docs/legal/lia-churn-detector.md`)
- **DPIA** (Data Protection Impact Assessment) — Churn + VIP Score (`docs/legal/dpia-churn-vip.md`)
- **DPA** (Accordo Trattamento Dati) — Styll ↔ Barbiere Art. 28 GDPR (`docs/legal/dpa-barbieri.md`)
- **ROPA** (Registro Attività di Trattamento) — Styll come Titolare e come Responsabile (`docs/legal/ropa.md`)
- `clients.churn_profiling_objected_at` — opt-out churn detector effettivo (esclude dai ricalcoli)
- `clients.marketing_consent` — opt-in separato per SMS/WhatsApp win-back

---

## Cosa manca per il lancio (v1 MVP)

| Area | Todo |
|------|------|
| **Pagamenti** | Integrazione Stripe (abbonamenti barbieri) |
| **SMS/WhatsApp** | Integrazione MessageBird o Infobip per reminder e win-back |
| **Silent Churn score** | Algoritmo visibile in dashboard ma calcolo automatico schedulato (cron o Supabase Edge Function) da completare |
| **VIP Score** | Stesso: formula definita, implementazione calcolo da schedulare |
| **Multi-location** | Struttura DB pronta, UI da completare per tier Growth+ |
| **Export dati** | Export completo (menzionato nel DPA, funzione da implementare) |
| **Stripe webhook** | Gestione eventi subscription (upgrade, downgrade, churn) |
| **DPA accettazione** | Registrazione timestamp accettazione DPA al momento onboarding |
| **Test E2E** | Nessuna suite automatizzata (solo build TypeScript) |

---

## Feature principali

| Feature | Descrizione | Stato |
|---------|-------------|-------|
| **Prenotazioni online** | Booking in 5 step con FloatingCard, upselling post-booking | ✅ v1 |
| **CRM clienti** | Storico, preferenze, note private barbiere, import CSV | ✅ v1 |
| **Silent Churn Detector** | Score 🟢🟡🔴 — "Marco non viene da 38 giorni" | ✅ v1 (calcolo da schedulare) |
| **Loyalty base** | Punti per visita, streak, badge, premi configurabili | ✅ v1 |
| **PWA brandizzata** | App installabile dal browser, splash screen iOS, push notification | ✅ v1 |
| **Dashboard barbiere** | Calendario, CRM, analytics, marketing, team | ✅ v1 |
| **Admin panel** | Shadow mode, gestione tenant, audit log | ✅ v1 |
| **GDPR completo** | Cookie banner, LIA, DPIA, DPA, ROPA | ✅ v1 |
| **Offerte/Promozioni** | Creazione offerte, visualizzazione PWA con dettaglio | ✅ v1 |
| **Prodotti** | Catalogo PWA, wishlist, upselling booking | ✅ v1 |
| **Win-back automatico** | Campagne per clienti silenziosi via SMS/WhatsApp | 🔲 v2 (UI ready, invio manca) |
| **QR walk-in + coda digitale** | QR vetrina → coda → SMS "tocca a te" | 🔲 v2 |
| **VIP Score** | Punteggio composito 0-100 per cliente | 🔲 v2 (definito, calcolo da schedulare) |
| **Loyalty gamificata avanzata** | Sfide, livelli tier avanzati, referral | 🔲 v2 |
| **AI Business Coach** | Suggerimenti proattivi basati su dati | 🔲 v3 |
| **No-show Prediction AI** | Deposito solo per clienti a rischio | 🔲 v3 |
| **Last-minute Slot Filler** | Notifica geo-localizzata per riempire buchi | 🔲 v3 |

---

## Architettura superfici

```
styll.it                    → (marketing) landing, cookie, sub-processor
styll.it/[slug]             → landing pubblica barbiere
styll.it/login|register     → auth barbiere
styll.it/onboarding/...     → wizard setup barbiere
styll.it/admin/...          → pannello superadmin
styll.it/tenant/dashboard/[slug]/... → dashboard barbiere
styll.it/tenant/app/[slug]/...      → PWA cliente
```

Middleware proxy gestisce routing multi-tenant, shadow mode e onboarding gating.

---

## Stack tecnologico

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript strict |
| Backend + Auth + DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| App cliente | PWA (Progressive Web App) — no App Store |
| UI | Tailwind CSS + shadcn/ui |
| Font | Outfit (default) + Google Fonts runtime per tenant |
| Architettura | Multi-tenant SaaS, RLS per isolamento |
| Deploy | Vercel (CI/CD automatico da branch dev/main) |
| Error tracking | Sentry (configurato no-PII) |
| Messaggistica | Da integrare: MessageBird / Infobip |

---

## Modello di business

| Tier | Prezzo | Target | Include |
|------|--------|--------|---------|
| **Starter** | ~€19-29/mese | Barbiere singolo | Prenotazioni, CRM, Loyalty base, Churn detector, PWA brandizzata |
| **Growth** | ~€49-69/mese | Salone piccolo | + Loyalty gamificata, Win-back, QR walk-in, Team (fino a 5), Analytics avanzata |
| **Pro/AI** | ~€99-149/mese | Salone che scala | + AI Coach, No-show prediction, Multi-location, Staff illimitato |

**Revenue aggiuntive:** commissione transazioni (2.5-2.9%), SMS extra (€0.05/msg).

---

## Target di riferimento

- **Target primario:** Barbieri italiani indipendenti — 137.730 attività, 82.7% micro-imprenditori
- **Target secondario:** Saloni con piccoli team (2-5 persone)

**Personas chiave:**
- **Marco Ferretti, 28 anni** (barbiere singolo, Napoli) — vuole semplicità, zero costi nascosti, la SUA app
- **Sara Bianchi, 38 anni** (titolare salone, Roma) — viene da Fresha, vuole il suo brand + multi-staff
- **Luca Esposito, 22 anni** (cliente giovane, Milano) — booking in 3 tap e gamification
- **Roberto Marini, 54 anni** (cliente maturo, Verona) — vuole solo un SMS, zero app da scaricare

---

## Roadmap

| Versione | Cosa include | Stato |
|---------|-------------|-------|
| **v1 — MVP** | Prenotazioni, CRM, Loyalty, Churn, PWA, Dashboard, Admin, GDPR | ✅ Costruito |
| **v2 — Crescita** | Win-back SMS/WhatsApp, VIP Score, QR walk-in, Multi-location | 🔲 In pianificazione |
| **v3 — AI** | AI Coach, No-show prediction, Prezzi dinamici, WhatsApp booking | 🔲 Futuro |

---

## File e cartelle importanti

```
apps/web/src/
  app/
    (marketing)/          → styll.it (landing, cookie, sub-processor)
    (auth)/               → login, register, onboarding barbiere
    [slug]/               → landing pubblica barbiere
    admin/                → pannello superadmin
    tenant/
      app/[slug]/         → PWA cliente
      dashboard/[slug]/   → dashboard barbiere
      landing/[slug]/     → landing alternativa
    onboarding/member/    → onboarding staff invitato
  components/
    pwa/                  → componenti PWA (FloatingCard, booking, auth, ui)
    dashboard/            → componenti dashboard barbiere
    admin/                → componenti admin
    shared/               → componenti condivisi (CookieBanner)
    ui/                   → shadcn/ui
  lib/
    supabase/             → client server + client
    hooks/                → custom hooks (useTenantContext, useShadowMode)
    actions/              → Server Actions
docs/
  legal/
    lia-churn-detector.md → LIA Art. 6(1)(f) per Silent Churn
    dpia-churn-vip.md     → DPIA Art. 35 per Churn + VIP Score
    dpa-barbieri.md       → DPA Art. 28 Styll ↔ Barbiere (bozza, revisione legale pendente)
    ropa.md               → ROPA Art. 30 Titolare + Responsabile
  01-progetto/ ... 09-tesi/  → documentazione accademica completa
```

---

## Competitor principali

13 competitor analizzati. Posizionamento: Phorest per i piccoli, al prezzo di GlossGenius, con la semplicità di Barberly. Blue ocean: gamification nel settore barber/beauty — nessun competitor la offre.

> Analisi completa: [`docs/02-mercato/competitor-analysis.md`](docs/02-mercato/competitor-analysis.md)
