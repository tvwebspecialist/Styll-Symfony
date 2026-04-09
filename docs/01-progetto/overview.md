> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `messaggio.md`, `progetto/01-visione-e-idea.md`

---

# Overview del Progetto Styll

# Visione e Idea — Styll

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

## Brand Foundation

**Nome:** Styll

**Mission:**
Il tuo negozio, il tuo brand, i tuoi clienti — e la tecnologia dei migliori per farli crescere. Styll mette il professionista al centro di tutto e lavora al suo fianco perché ogni cliente torni.

**Vision:**
Un futuro dove ogni professionista su appuntamento ha in mano la tecnologia per costruire qualcosa di suo — un brand riconoscibile, una clientela fedele, un business che cresce. Senza dover scegliere tra qualità e prezzo. Senza cedere la propria identità a una piattaforma. Styll esiste per questo: essere lo strumento invisibile che rende possibile tutto il resto.

**Valori:**
- **Premium accessibile** — Funzionalità da leader di mercato, prezzo da indipendente.
- **Trasparenza radicale** — Un prezzo. Niente sorprese. I tuoi dati sono tuoi.
- **Retention come cura** — Non ti vendiamo visibilità. Ti aiutiamo a non perdere chi hai già.
- **Il professionista prima del prodotto** — Il tuo brand è il protagonista. Il nostro lavora in silenzio.

**Brand Personality:**
Competente ma accessibile. Discreto ma presente. Moderno ma caldo. Sicuro ma mai arrogante. Stiloso ma sostanziale.

**Brand Archetype:**
Creator (diamo al professionista il potere di costruire il suo brand) + Caregiver (ci prendiamo cura del suo business in silenzio).

---

## Tone of Voice

**Voice (costante, non cambia mai) — 3 tratti:**
- Diretto
- Caldo
- Sicuro

**Posizionamento sulle 4 dimensioni NNG:**

| Asse | Posizione Styll |
|------|----------------|
| Formale ← → Casual | 7/10 casual — "tu", frasi brevi, zero burocratese, ma niente slang |
| Serio ← → Umoristico | 3/10 umoristico — leggero ma non fa battute, rispetta la serietà del business |
| Rispettoso ← → Irriverente | 2/10 irriverente — decisamente rispettoso, zero sarcasmo, zero provocazioni |
| Entusiasta ← → Fattuale | 6/10 entusiasta — ha energia contenuta, celebra senza esagerare |

**Tone (variabile per contesto):**

| Touchpoint | Registro |
|------------|----------|
| Landing page B2B | Sicuro, ispirazionale, concreto |
| Dashboard barbiere | Operativo, caldo, utile |
| PWA cliente finale | Leggero, immediato, zero frizione |
| Messaggi (SMS/WA/email) | Personale, rispettoso, mai spam |
| Onboarding/setup | Incoraggiante, passo dopo passo |
| Errori/empty states | Umano, mai colpevolizzante, con via d'uscita |

**Doppio livello verbale:**
- **Styll come Styll (B2B)** → voce riconoscibile, brand presente
- **Styll come il barbiere (B2C)** → voce neutra, universale, Styll invisibile

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

## Riepilogo e Contesto del Progetto

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

| Competitor | Tipo | Prezzo | Gap vs Noi |
|-----------|------|--------|-----------|
| **Fresha** | Marketplace | $19.95 + commissioni | Ruba il brand, loyalty +$60/mese extra |
| **Booksy** | Marketplace | $29.99 | Fee nascoste, supporto lento |
| **Barberly** | Brandizzato | ~$20 | Più simile a noi, ma zero retention |
| **GlossGenius** | Brandizzato | $24 | UX bellissima, loyalty nulla, feature bloccate |
| **Phorest** | Brandizzato | $99+ | Retention vera ma caro, contratti annuali |

**Posizionamento:** Phorest per i piccoli, al prezzo di GlossGenius, con la semplicità di Barberly.  
**Blue ocean:** gamification nel settore barber/beauty — nessun competitor la offre.

---

## Roadmap

| Versione | Quando | Cosa include |
|---------|--------|-------------|
| **v1 — MVP** | Lancio | Prenotazioni, CRM, Loyalty base, Silent Churn, PWA brandizzata |
| **v2 — Crescita** | Post-lancio | Gamification completa, Win-back, QR walk-in, Multi-staff |
| **v3 — AI** | Futuro | AI Coach, No-show prediction, Prezzi dinamici, WhatsApp booking |

**Stato attuale:** concept, stack, competitor analysis, personas, user journeys, decisioni progettuali (10 temi) — tutti completati. Prossimi passi: architettura informazione → wireframe → design system → UI high-fidelity → prototipo.

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