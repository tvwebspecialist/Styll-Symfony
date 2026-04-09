> ℹ️ Questo è il riassunto del progetto. Per i dettagli completi, consulta i file nella cartella `progetto/`.

# Styll — Riassunto del Progetto

> **Usa questo file all'inizio di ogni nuova chat con Copilot:**
> *"Leggi il file messaggio.md nel repo tvwebspecialist/Styll"*

---

## Sintesi

Styll è una piattaforma **SaaS verticale per barbieri** con focus sulla **retention**. Non è un marketplace: serve a chi i clienti li ha già, ma vuole gestirli meglio e farli tornare. La piattaforma è white-label al 100% — ogni barbiere ha la propria app brandizzata (PWA), senza passare dagli store. Integra loyalty gamificata, silent churn detection e win-back automatico. Stack: Next.js 14+ (App Router) + TypeScript + Supabase. Target primario: barbieri italiani indipendenti (137.730 attività, 82.7% micro-imprenditori). Modello: 3 tier da €19 a €149/mese.

**La promessa:** *"Non ti porto clienti, ti aiuto a gestire i tuoi — e a farli tornare."*

---

## Problema risolto

I micro-professionisti locali (barbieri, parrucchieri) gestiscono clienti su WhatsApp e agende cartacee. Perdono clienti senza accorgersene (silent churn). I software esistenti sono o marketplace che rubano il brand (Fresha, Booksy) o troppo cari e complessi per piccoli (Phorest, $99+). Nessuno nel segmento accessibile offre retention reale + gamification.

---

## Soluzione proposta

Una piattaforma multi-tenant con 3 interfacce:

1. **Dashboard Admin** — gestione professionisti, feature toggle, branding per tenant
2. **Dashboard Barbiere** — calendario, CRM clienti, churn alert, loyalty, analytics
3. **PWA Cliente** — booking in 3 tap, profilo loyalty (punti, streak, badge), reminder

Ogni barbiere ha un sottodominio dedicato (`nome.Styll.app`) con colori, logo e nome personalizzati. Il cliente percepisce l'app come proprietà del barbiere, non di una piattaforma esterna.

---

## Feature principali

| Feature | Descrizione | Fase |
|---------|-------------|------|
| **Prenotazioni online** | Booking in 3 tap, zero registrazione obbligatoria | v1 |
| **CRM clienti** | Storico, preferenze, note private barbiere | v1 |
| **Silent Churn Detector** | "Marco non viene da 38 giorni" — notifica al barbiere | v1 |
| **Loyalty base** | Punti per visita, ricompense configurabili | v1 |
| **Promemoria anti no-show** | Push, SMS, WhatsApp | v1 |
| **PWA brandizzata** | App installabile dal browser, icona col brand del barbiere | v1 |
| **Loyalty gamificata** | Streak, badge, livelli (4 tier), sfide | v2 |
| **Win-back automatico** | Campagne per clienti silenziosi | v2 |
| **QR walk-in + coda digitale** | QR vetrina → coda → SMS "tocca a te" | v2 |
| **VIP Score** | Punteggio composito per ogni cliente | v2 |
| **AI Business Coach** | Suggerimenti proattivi basati su dati | v3 |
| **No-show Prediction AI** | Deposito solo per clienti a rischio | v3 |
| **Last-minute Slot Filler** | Notifica geo-localizzata per riempire buchi | v3 |
| **After-Visit Story** | Template Instagram Story brandizzato post-taglio | v3 |

---

## Target di riferimento

- **Target primario:** Barbieri italiani indipendenti — 137.730 attività, 82.7% micro-imprenditori individuali
- **Target secondario:** Saloni parrucchieri con piccoli team (2-5 persone)
- **Scalabilità futura:** Fitness, tattoo, fisioterapia — qualsiasi micro-professionista su appuntamento

**Personas chiave:**
- **Marco Ferretti, 28 anni** (barbiere singolo, Napoli) — vuole semplicità, zero costi nascosti, la SUA app
- **Sara Bianchi, 38 anni** (titolare salone, Roma) — viene da Fresha, vuole il suo brand + gestione multi-staff
- **Luca Esposito, 22 anni** (cliente giovane, Milano) — vuole booking in 3 tap e gamification
- **Roberto Marini, 54 anni** (cliente maturo, Verona) — vuole solo un SMS, zero app da scaricare

---

## Modello di business

| Tier | Prezzo | Target | Include |
|------|--------|--------|---------|
| **Starter** | ~€19-29/mese | Barbiere singolo | Prenotazioni, CRM, Loyalty base, Churn detector, PWA brandizzata |
| **Growth** | ~€49-69/mese | Salone piccolo | + Loyalty gamificata, Win-back, QR walk-in, Team (fino a 5), Analytics avanzata |
| **Pro/AI** | ~€99-149/mese | Salone che scala | + AI Coach, No-show prediction, Multi-location, Staff illimitato |

**Revenue aggiuntive:** commissione sulle transazioni (2.5-2.9%), SMS extra (€0.05/msg), hardware (card reader).

---

## Stack tecnologico

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript |
| Backend + Auth + DB | Supabase |
| App cliente | PWA (Progressive Web App) — no App Store |
| Architettura | Multi-tenant SaaS, sempre online |
| Subdomini | `nome.Styll.app` (v1) → dominio custom (v2) |
| Messaggistica | MessageBird / Infobip (WhatsApp + SMS unificati) |
| Template social | Sharp/Canvas API (Node.js), generati server-side |

---

## Competitor principali

13 competitor analizzati in dettaglio, suddivisi in 3 categorie: marketplace (Fresha, Booksy, theCut), tool brandizzati (Barberly, BookedBarber, GlossGenius), soluzioni premium (Phorest, Squire, Vagaro, Zenoti, Timely, Goldie, Boulevard).

**Posizionamento:** Phorest per i piccoli, al prezzo di GlossGenius, con la semplicità di Barberly.  
**Blue ocean:** gamification nel settore barber/beauty — nessun competitor la offre.

> Per l'analisi completa vedere [`docs/02-mercato/competitor-analysis.md`](docs/02-mercato/competitor-analysis.md).

---

## Roadmap

| Versione | Quando | Cosa include |
|---------|--------|-------------|
| **v1 — MVP** | Lancio | Prenotazioni, CRM, Loyalty base, Silent Churn, PWA brandizzata |
| **v2 — Crescita** | Post-lancio | Gamification completa, Win-back, QR walk-in, Multi-staff |
| **v3 — AI** | Futuro | AI Coach, No-show prediction, Prezzi dinamici, WhatsApp booking |

**Stato attuale:** concept, stack, competitor analysis, personas, user journeys, decisioni progettuali (10 temi), naming definitivo (Styll), business plan (12/36 mesi), literature review, internazionalizzazione (9 mercati), Voice of Customer (2.800+ recensioni), pricing strategy, go-to-market, legal/GDPR, strategia social, KPI framework, database schema, architettura tecnica, analisi strategica, struttura tesi — tutti completati. Prossimi passi: branding e identità visiva → architettura informazione → wireframe → design system → UI high-fidelity → prototipo.

---

## Indice dei file dettagliati

| File | Contenuto |
|------|-----------|
| [`progetto/01-visione-e-idea.md`](progetto/01-visione-e-idea.md) | Perché nasce il progetto, l'idea, posizionamento, brand foundation, tone of voice, note e decisioni |
| [`progetto/02-funzionalita-e-feature.md`](progetto/02-funzionalita-e-feature.md) | Le 3 interfacce, feature esclusive, sistema gamification completo (4 layer, 3 template, tier, soglie), prodotti & inventario |
| [`progetto/03-modello-di-business.md`](progetto/03-modello-di-business.md) | I 3 tier nel dettaglio, revenue aggiuntive, pricing staff, pricing messaggi, riepilogo decisioni |
| [`progetto/04-target-e-utenti.md`](progetto/04-target-e-utenti.md) | Target, 4 personas complete, 4 user journey maps dettagliate |
| [`progetto/05-tecnologia-e-stack.md`](progetto/05-tecnologia-e-stack.md) | Stack, architettura multi-tenant, database schema SQL, API prezzi messaggistica, GDPR |
| [`progetto/06-design-e-ux.md`](progetto/06-design-e-ux.md) | Dashboard (progressive complexity), CRM profilo avanzato, ruoli staff, brand-first, setup wizard |
| [`progetto/07-competitor-e-mercato.md`](progetto/07-competitor-e-mercato.md) | Analisi completa 13 competitor analizzati in dettaglio, tabella comparativa, 7 lamentele universali, learnings, opportunities, dati di mercato |
| [`progetto/08-roadmap-e-sviluppo.md`](progetto/08-roadmap-e-sviluppo.md) | Roadmap v1/v2/v3, stato attuale checklist, prossimi step, indice tesi definito (8 capitoli, struttura ABA) |
