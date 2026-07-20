# Partnership & Ecosystem Strategy — Styll

> Documento strategico per la tesi di laurea.
> Analisi completa delle partnership, integrazioni e strategie di ecosistema per Styll, piattaforma SaaS verticale di retention per barbieri.

---

## 1. Mappa dell'ecosistema del target

### "Un giorno nella vita" di Marco Ferretti (barbiere indipendente)

**Mattina (7:30–9:00)**
- Controlla WhatsApp per messaggi dei clienti
- Apre Google Calendar per vedere gli appuntamenti
- Scorre Instagram per ispirazione e per rispondere ai DM
- Ordina prodotti via WhatsApp al rappresentante

**Giornata lavorativa (9:00–19:00)**
- Accoglie clienti, controlla orari su calendario cartaceo o digitale
- Incassa con POS (SumUp/Nexi) o contanti
- Scatta foto ai tagli per Instagram Stories
- Risponde a messaggi WhatsApp tra un cliente e l'altro

**Sera (19:00–21:00)**
- Controlla i conti su foglio Excel o app bancaria
- Pubblica contenuti su Instagram/TikTok
- Gestisce la contabilità con il commercialista (email/WhatsApp)

### Tool utilizzati quotidianamente dal barbiere italiano

| Categoria | Tool | Frequenza | Dove si inserisce Styll |
|-----------|------|-----------|------------------------|
| Comunicazione clienti | WhatsApp, SMS | Ogni giorno | Styll sostituisce la gestione manuale con booking + reminder automatici |
| Calendario | Google Calendar, agenda cartacea | Ogni giorno | Styll diventa il calendario principale con sync bidirezionale |
| Social media | Instagram, TikTok, Facebook | Ogni giorno | Styll fornisce template brandizzati e deep link alla PWA |
| Pagamenti | SumUp, Nexi, Satispay, contanti | Ogni giorno | Styll traccia i pagamenti (v1 offline, v2 gateway integrato) |
| Contabilità | Excel, commercialista, Fatture in Cloud | Settimanale | Styll esporta dati per il commercialista |
| Prodotti/Forniture | Rappresentanti, e-commerce B2B | Mensile | Styll gestisce inventario e alert scorta bassa |
| Recensioni | Google Business Profile | Sporadica | Styll automatizza le richieste di recensione |
| Formazione | YouTube, corsi in presenza, fiere | Mensile | Partnership con accademie e formatori |

### Grafo dell'ecosistema

```
                    ┌──────────────┐
                    │   CLIENTE    │
                    │  (Luca/Roberto)│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   PWA STYLL   │
                    │  (Booking,    │
                    │   Loyalty,    │
                    │   Reminder)   │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  WhatsApp/  │ │   Google    │ │  Instagram/ │
    │    SMS      │ │  Calendar   │ │   TikTok    │
    │ (MessageBird│ │   (Sync)    │ │  (Template  │
    │  /Infobip)  │ │             │ │   social)   │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
    ┌──────▼───────────────▼───────────────▼──────┐
    │              DASHBOARD STYLL                 │
    │  (CRM, Calendario, Loyalty, Analytics,       │
    │   Churn Detection, Inventario)               │
    └──────┬───────────────┬───────────────┬──────┘
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Pagamenti  │ │  Contabilità│ │  Fornitori  │
    │  (SumUp,    │ │  (Export    │ │  prodotti   │
    │   Stripe,   │ │   CSV,      │ │  (Proraso,  │
    │   Nexi)     │ │   Fatture   │ │   Bullfrog) │
    │             │ │   in Cloud) │ │             │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
    ┌──────▼───────────────▼───────────────▼──────┐
    │           GOOGLE BUSINESS PROFILE            │
    │  (Recensioni, Visibilità locale, Import      │
    │   dati al setup)                             │
    └─────────────────────────────────────────────┘
```

---

## 2. Tipi di partnership

### 2.1 Technology Partnership
**Definizione:** Collaborazioni centrate sull'integrazione tecnica tra prodotti complementari.

**Esempi rilevanti per Styll:**
- **Google** — Google Calendar API per sync bidirezionale, Google Business Profile API per import dati e gestione recensioni
- **SumUp/Nexi** — Integrazione POS per tracciamento pagamenti
- **MessageBird/Infobip** — API unificate per WhatsApp Business + SMS
- **Stripe** — Gateway di pagamento per prenotazioni online

**Valore:** Aumenta la stickiness del prodotto. I clienti che connettono 3+ integrazioni hanno tassi di retention significativamente più alti.

### 2.2 Co-Marketing Partnership
**Definizione:** Collaborazioni su attività promozionali congiunte (webinar, contenuti, eventi).

**Esempi rilevanti per Styll:**
- **Brand di prodotti grooming** (Proraso, Bullfrog, Depot, STMNT) — Co-creazione di contenuti educativi, sponsorship di eventi
- **Accademie barbieri** (Barber Academy Italia, BarberShop Academy) — Webinar, workshop, contenuti formativi
- **Influencer/barber educator** su Instagram/TikTok — Collaborazione su contenuti, beta testing

**Valore:** Accesso al pubblico target senza costo di acquisizione diretto. Credibilità per associazione.

### 2.3 Affiliate Partnership
**Definizione:** Partner esterni che promuovono Styll in cambio di una commissione su ogni conversione.

**Esempi rilevanti per Styll:**
- **Barbieri influencer** con seguito social (10K+ follower)
- **Blogger/YouTuber** del settore grooming e business per barbieri
- **Consulenti di settore** che aiutano barbieri ad aprire/gestire il negozio
- **Rappresentanti di prodotti** che visitano i barbershop regolarmente

**Valore:** Canale di acquisizione a performance (paghi solo se converti). Scala naturalmente.

### 2.4 Channel Partnership
**Definizione:** Rivenditori, consulenti o distributori che vendono/implementano Styll per conto nostro.

**Esempi rilevanti per Styll:**
- **Distributori di prodotti barbiere** (visitano 50-200 barbieri al mese)
- **Commercialisti specializzati** nel settore beauty/servizi alla persona
- **Associazioni di categoria** (CNA, Confartigianato — sezione benessere)

**Valore:** Penetrazione capillare del territorio senza forza vendita interna. Il distributore è già un contatto fidato del barbiere.

### 2.5 Strategic Partnership
**Definizione:** Alleanze a lungo termine con obiettivi strategici condivisi.

**Esempi rilevanti per Styll:**
- **Supabase** — Partner tecnologico core, case study reciproco
- **Associazioni di categoria** — Accesso a database di contatti, credibilità istituzionale
- **Scuole di barbiere** — Pipeline di nuovi professionisti che nascono già con Styll

**Valore:** Posizionamento di mercato, accesso a risorse e canali altrimenti inaccessibili.

### Matrice di priorità partnership

| Tipo | Impatto revenue | Effort | Tempo per ROI | Priorità Styll |
|------|----------------|--------|---------------|----------------|
| Technology | ★★★★★ | Alto | 3-6 mesi | 🔴 Critica |
| Affiliate | ★★★★☆ | Basso | 1-3 mesi | 🔴 Critica |
| Co-Marketing | ★★★☆☆ | Medio | 2-4 mesi | 🟡 Alta |
| Channel | ★★★★☆ | Alto | 6-12 mesi | 🟡 Alta |
| Strategic | ★★★★★ | Molto alto | 6-18 mesi | 🟢 Media (lungo termine) |

---

## 3. Top 5 integrazioni tecniche prioritarie

### 3.1 Google Calendar — Sync bidirezionale

| Campo | Dettaglio |
|-------|----------|
| **Prodotto** | Google Calendar API v3 |
| **Tipo integrazione** | Sync bidirezionale (appuntamenti Styll ↔ Google Calendar del barbiere) |
| **Valore per il barbiere** | Non deve abbandonare Google Calendar. Vede tutto in un posto. Transizione graduale |
| **Valore per Styll** | Riduce la barriera all'adozione. Il barbiere non deve "scegliere" — usa entrambi |
| **Effort stimato** | Medio (2-3 settimane di sviluppo) |
| **API disponibile** | Sì — Google Calendar API v3, REST, ben documentata |
| **Prerequisiti** | OAuth 2.0 configurato (già previsto per GBP import), gestione token refresh |
| **Fase roadmap** | v1 |

**Flusso tecnico:**
1. Il barbiere collega Google Calendar via OAuth 2.0
2. Gli appuntamenti creati in Styll vengono scritti su Google Calendar
3. Gli eventi creati su Google Calendar vengono importati in Styll come "blocchi"
4. Webhook/polling per aggiornamenti in tempo reale

### 3.2 MessageBird/Infobip — WhatsApp Business + SMS

| Campo | Dettaglio |
|-------|----------|
| **Prodotto** | MessageBird Conversations API / Infobip Omnichannel API |
| **Tipo integrazione** | API per invio messaggi transazionali e marketing |
| **Valore per il barbiere** | Reminder automatici, win-back, richiesta recensioni — senza fare nulla |
| **Valore per Styll** | Core della proposta di valore retention. Senza messaggi, niente win-back |
| **Effort stimato** | Medio (2-3 settimane) |
| **API disponibile** | Sì — REST API, SDK Node.js, webhook per delivery status |
| **Prerequisiti** | Account business WhatsApp, template approvati da Meta, numero dedicato |
| **Fase roadmap** | v1 |

**Dettaglio costi (già analizzato):**
- Reminder WhatsApp: €0.0248/msg
- Win-back WhatsApp: €0.0572/msg
- SMS Italia: €0.04-0.055/msg
- Budget mensile per barbiere singolo: ~€6.50/mese

### 3.3 Google Business Profile — Import dati + recensioni

| Campo | Dettaglio |
|-------|----------|
| **Prodotto** | Google Business Profile API (ex Google My Business) |
| **Tipo integrazione** | Import dati al setup + redirect per recensioni |
| **Valore per il barbiere** | Setup in < 8 minuti. Nome, indirizzo, orari, telefono, foto pre-compilati |
| **Valore per Styll** | Riduce drasticamente il drop-off al setup (punto critico della journey di Marco) |
| **Effort stimato** | Basso-medio (1-2 settimane) |
| **API disponibile** | Sì — gratuita con limiti di quota, OAuth 2.0, endpoint `locations.get` |
| **Prerequisiti** | Il barbiere deve avere un profilo Google Business verificato |
| **Fase roadmap** | v1 |

### 3.4 SumUp / Stripe — Pagamenti

| Campo | Dettaglio |
|-------|----------|
| **Prodotto** | SumUp Partner API / Stripe Connect |
| **Tipo integrazione** | Tracciamento pagamenti (v1 offline), gateway integrato (v2) |
| **Valore per il barbiere** | Vede quanto ha incassato senza fare conti a mano. Il cliente paga al booking |
| **Valore per Styll** | Abilita analytics revenue, calcolo punti loyalty su €1 speso, commissione % |
| **Effort stimato** | Alto (4-6 settimane per integrazione completa) |
| **API disponibile** | SumUp: REST API per merchant. Stripe Connect: API matura, onboarding per piattaforme |
| **Prerequisiti** | Stripe: KYC per ogni barbiere (onboarding Stripe Connect). SumUp: partnership agreement |
| **Fase roadmap** | v1 (tracking offline) → v2 (gateway integrato) |

**Nota Italia:** SumUp è il POS più diffuso tra micro-professionisti italiani. Stripe Connect è l'opzione migliore per pagamenti online (commissione 1.4% + €0.25 per transazione EU).

### 3.5 Instagram Graph API — Condivisione social

| Campo | Dettaglio |
|-------|----------|
| **Prodotto** | Instagram Graph API / Facebook Marketing API |
| **Tipo integrazione** | Pubblicazione automatica di template social brandizzati |
| **Valore per il barbiere** | Un tap nella dashboard → Story pubblicata col suo brand + link alla PWA |
| **Valore per Styll** | Viralità organica. Ogni Story è marketing gratuito per il barbiere E per Styll |
| **Effort stimato** | Medio (2-3 settimane) |
| **API disponibile** | Sì — Instagram Graph API (richiede Facebook Business account + app review) |
| **Prerequisiti** | Account Instagram Business del barbiere, app Facebook approvata |
| **Fase roadmap** | v2 |

### Matrice integrazioni: impatto vs effort

```
    IMPATTO ↑
         │
    ★★★★★│  Google Calendar    MessageBird/Infobip
         │       ●                    ●
    ★★★★ │               SumUp/Stripe
         │                    ●
    ★★★  │  Google Business        Instagram API
         │       ●                    ●
         │
         └────────────────────────────────→
              BASSO          MEDIO         ALTO
                         EFFORT →
```

---

## 4. Marketplace strategy

### 4.1 Fase 1 — Zapier/Make (Mese 4-6)

**Perché Zapier:** Permette a Styll di connettersi a 7.000+ app senza sviluppare ogni integrazione. Un barbiere potrebbe collegare Styll a strumenti che non prevediamo.

**Trigger Zapier da implementare:**
- `Nuovo appuntamento creato`
- `Appuntamento confermato/cancellato`
- `Nuovo cliente registrato`
- `Punti loyalty assegnati`
- `Alert churn attivato`

**Azioni Zapier da implementare:**
- `Crea appuntamento`
- `Aggiungi/aggiorna cliente`
- `Assegna punti loyalty`
- `Invia messaggio`

**Esempi di automazioni utili:**
- Nuovo appuntamento → crea evento in Google Calendar (pre-integrazione nativa)
- Cliente a rischio churn → notifica Slack al barbiere
- Nuovo cliente → aggiungi a lista Mailchimp per newsletter
- Appuntamento completato → riga in Google Sheets per contabilità

**Dati di riferimento:** Jotform ha riportato un tasso di retention 1.5x più alto tra gli utenti che automatizzano con Zapier.

**Effort:** 2-3 settimane per il connettore base Zapier.

### 4.2 Fase 2 — Marketplace di settore (Mese 6-12)

**Directory e marketplace rilevanti:**
- **Capterra / G2 / GetApp** — Listing nella categoria "Barbershop Software" e "Salon Management"
- **Product Hunt** — Lancio per awareness nella community tech
- **AppSumo** — Deal per early adopter (lifetime deal come leva di acquisizione iniziale)
- **AlternativeTo** — Listing come alternativa a Fresha/Booksy/Barberly

**Azione concreta:**
1. Creare profilo su Capterra con screenshot, video demo, pricing
2. Raccogliere 20+ recensioni verificate nei primi 3 mesi post-lancio
3. Lanciare su Product Hunt con una narrativa forte ("Phorest per i piccoli barbieri")

### 4.3 Fase 3 — Verso il proprio marketplace (Mese 12-18)

**Vision:** Un "App Store" interno a Styll dove partner terzi possono pubblicare estensioni.

**Esempi di estensioni future:**
- **Plugin contabilità** — Integrazione con Fatture in Cloud per fatturazione automatica
- **Plugin e-commerce** — Vendita prodotti online dal sito del barbiere
- **Plugin prenotazione WhatsApp** — Chatbot per prenotazione conversazionale
- **Plugin AI Analytics** — Dashboard predittiva avanzata

**Prerequisiti:**
- API pubblica stabile (vedi sezione 5)
- Documentazione developer completa
- Sistema di autenticazione OAuth per app terze
- Review process per qualità e sicurezza

---

## 5. API strategy

### Fase 1 — API interna (v1, Mese 1-6)

**Obiettivo:** API RESTful interna usata dal frontend Next.js e dalla PWA.

**Approccio:** Supabase fornisce automaticamente API REST (PostgREST) e Realtime per ogni tabella. Le RLS policy gestiscono l'autorizzazione per tenant.

**Endpoint principali:**
```
GET    /api/v1/appointments        → Lista appuntamenti
POST   /api/v1/appointments        → Crea appuntamento
GET    /api/v1/clients             → Lista clienti CRM
GET    /api/v1/clients/:id/loyalty → Stato loyalty cliente
POST   /api/v1/loyalty/redeem      → Riscatta reward
GET    /api/v1/analytics/churn     → Clienti a rischio
GET    /api/v1/services            → Catalogo servizi
```

### Fase 2 — Webhook (v1.5, Mese 6-9)

**Obiettivo:** Notificare sistemi esterni di eventi in tempo reale.

**Eventi webhook:**
```json
{
  "event": "appointment.created",
  "data": {
    "appointment_id": "uuid",
    "client_id": "uuid",
    "service": "Taglio + Barba",
    "datetime": "2026-04-15T10:00:00Z",
    "staff_id": "uuid"
  },
  "tenant_id": "uuid",
  "timestamp": "2026-04-15T09:00:00Z"
}
```

**Implementazione:** Supabase Realtime + Edge Functions per dispatch webhook verso URL configurati dal barbiere.

### Fase 3 — API pubblica + SDK (v2, Mese 9-15)

**Obiettivo:** Permettere a sviluppatori terzi di costruire integrazioni.

**Componenti:**
- **API Key management** — Generazione e revoca chiavi API dalla dashboard
- **Rate limiting** — 1.000 req/ora per chiave (Tier 1), 5.000 (Tier 2), 10.000 (Tier 3)
- **SDK JavaScript/TypeScript** — Wrapper per le API REST
- **Documentazione interattiva** — Swagger/OpenAPI spec con playground

**Developer Experience:**
```javascript
// SDK futuro
import { Styll } from '@styll/sdk';

const styll = new Styll({ apiKey: 'sk_live_...' });

// Crea appuntamento
const appointment = await styll.appointments.create({
  clientId: 'uuid',
  serviceIds: ['uuid-taglio', 'uuid-barba'],
  datetime: '2026-04-15T10:00:00Z',
  staffId: 'uuid'
});

// Assegna punti loyalty
await styll.loyalty.addPoints({
  clientId: 'uuid',
  points: 250,
  reason: 'appointment_completed'
});
```

### Fase 4 — Marketplace API (v3, Mese 15-24)

**Obiettivo:** Abilitare il marketplace interno.

**Componenti aggiuntivi:**
- OAuth 2.0 per app terze
- Sistema di permessi granulari (scopes)
- Review process automatizzato
- Dashboard sviluppatore con analytics

---

## 6. Design del programma di affiliazione

### Struttura commissioni

| Tipo affiliato | Commissione | Struttura | Durata |
|---------------|-------------|-----------|--------|
| **Barbiere referral** | 1 mese gratis per referrer + referito | Credito account | Una tantum |
| **Influencer/Content Creator** | 20% del primo anno di abbonamento | Revenue share | 12 mesi |
| **Consulente/Formatore** | 15% ricorrente per tutta la durata del cliente | Revenue share ricorrente | Lifetime |
| **Distributore prodotti** | 25% del primo anno + €5/mese ricorrente | Ibrido | Lifetime |

### Target affiliati per Styll

**Tier 1 — Barbieri ambassador (volume alto, effort basso)**
- Barbieri già clienti Styll soddisfatti
- Meccanismo: "Invita un collega → entrambi avete 1 mese gratis"
- Target: 20% dei clienti attivi diventa referrer
- Costo: €19-29 per referral (1 mese di abbonamento)

**Tier 2 — Micro-influencer barber (volume medio, effort medio)**
- Barbieri con 5K-50K follower su Instagram
- Meccanismo: codice sconto personalizzato + commissione 20%
- Target: 10-20 influencer nel primo anno
- Costo: 20% revenue per 12 mesi

**Tier 3 — Formatori e accademie (volume basso, valore alto)**
- Docenti di accademie barbiere, consulenti di business per barbieri
- Meccanismo: commissione ricorrente 15% + materiale co-brandizzato
- Target: 5-10 formatori nel primo anno
- Costo: 15% revenue lifetime (alto, ma CLV di questi clienti è superiore)

**Tier 4 — Rappresentanti/Distributori prodotti (volume alto, valore alto)**
- Agenti commerciali che visitano 50-200 barbieri al mese
- Meccanismo: 25% primo anno + €5/mese ricorrente + kit demo dedicato
- Target: 3-5 distributori nel primo anno
- Costo: il più alto, ma il canale con il ROI potenziale più alto

### Template email outreach per influencer barbiere

**Oggetto:** Collaborazione Styll × [Nome Barbiere] — l'app col TUO brand

**Corpo:**

> Ciao [Nome],
>
> Seguo il tuo lavoro su Instagram da un po' e ammiro quello che hai costruito con [Nome Negozio].
>
> Sto lavorando a Styll, una piattaforma che dà ai barbieri come te un'app col proprio brand — non quella di una piattaforma esterna. Prenotazioni, loyalty gamificata (tipo Duolingo, ma per il barbiere), e un sistema che ti avvisa quando un cliente sta per smettere di venire.
>
> Mi piacerebbe farti provare Styll in anteprima e, se ti piace, proporti una collaborazione: codice sconto personalizzato per i tuoi follower + commissione del 20% per ogni barbiere che si iscrive tramite te.
>
> Posso mandarti una demo di 5 minuti?
>
> [Nome], Styll

### Proiezione revenue affiliazione (Anno 1)

| Canale | Affiliati attivi | Clienti/mese | Conv. rate | Nuovi clienti/anno | Revenue affiliazione |
|--------|-----------------|-------------|-----------|-------------------|---------------------|
| Barbieri referral | 50 | 0.5 | 60% | 180 | €0 (credito) |
| Influencer | 15 | 3 | 25% | 135 | ~€8.100 costo |
| Formatori | 8 | 2 | 40% | 77 | ~€3.500 costo |
| Distributori | 4 | 10 | 30% | 144 | ~€12.960 costo |
| **Totale** | **77** | — | — | **~536** | **~€24.560 costo** |

**Revenue generata:** 536 clienti × €24/mese (media) × 12 mesi = ~€154.000
**Costo affiliazione:** ~€24.560
**ROI affiliazione:** ~6.3x

---

## 7. Strategia co-marketing

### Tipi di attività co-marketing

| Attività | Partner ideale | Costo | Impatto | Fase |
|----------|---------------|-------|---------|------|
| **Webinar co-hosted** | Accademie barbiere, brand grooming | Basso (€0-500) | Medio-alto | Mese 3-6 |
| **Guida co-branded** | Brand prodotti (Proraso, Depot) | Basso (€0-200) | Medio | Mese 4-8 |
| **Workshop in fiera** | Associazioni categoria, fiere settore | Medio (€500-2.000) | Alto | Mese 6-12 |
| **Case study congiunto** | Barbiere ambassador + brand | Basso (€0) | Alto | Mese 3-6 |
| **Social takeover** | Influencer barbiere | Basso (€200-500) | Medio | Mese 2-4 |
| **Newsletter cross-promo** | Blog/magazine settore | Basso (€0-300) | Medio | Mese 4-8 |

### Pipeline partner co-marketing — Primi 12 mesi

**Q1 (Mese 1-3):**
1. Identificare 5 barbieri ambassador per case study di lancio
2. Contattare 3 micro-influencer per social takeover al lancio
3. Creare 1 guida co-branded con un brand prodotti

**Q2 (Mese 4-6):**
4. Organizzare 2 webinar co-hosted con accademie barbiere
5. Partecipare a 1 fiera di settore (es. Cosmoprof Bologna, Salone del Mobile del Barbiere)
6. Lanciare newsletter cross-promo con 2 blog di settore

**Q3 (Mese 7-9):**
7. Pubblicare 3 case study congiunti barbiere + Styll
8. Organizzare workshop in presenza in 2 città (Milano, Napoli)
9. Lanciare challenge social congiunta con brand grooming

**Q4 (Mese 10-12):**
10. Evento annuale "Styll Summit" — conferenza online per barbieri
11. Report annuale co-branded "Stato del barbiere italiano" con dati aggregati
12. Partnership esclusiva con 1 accademia per inserire Styll nel curriculum

### Template proposta co-marketing

**Oggetto:** Proposta di collaborazione — [Styll] × [Partner]

> **A:** [Nome Responsabile Marketing/Partnership]
> **Da:** Team Styll
>
> **Contesto:**
> Styll è una piattaforma SaaS per barbieri italiani focalizzata sulla retention dei clienti. Il nostro target primario sono i 137.730 barbieri indipendenti in Italia, l'82.7% dei quali sono micro-imprenditori individuali.
>
> **Proposta:**
> Vorremmo esplorare una collaborazione di co-marketing con [Partner] per [tipo di attività specifica]. Crediamo che i nostri pubblici siano altamente complementari: voi raggiungete i barbieri attraverso [canale del partner], noi li raggiungiamo attraverso la nostra piattaforma e community.
>
> **Cosa offriamo:**
> - Accesso alla nostra base utenti per promozione congiunta
> - Co-creazione di contenuti di valore per il settore
> - Visibilità sulla nostra piattaforma e canali social
> - [Altro specifico per il partner]
>
> **Cosa chiediamo:**
> - Promozione congiunta attraverso i vostri canali
> - [Altro specifico]
>
> **Metriche condivise:**
> - Lead generati per entrambi
> - Engagement sui contenuti co-creati
> - Conversioni tracciate con UTM dedicati
>
> **Prossimo step:**
> Una call di 20 minuti per esplorare l'allineamento. Disponibili [date].

---

## 8. Channel partnership

### Struttura programma a tier

#### Tier 1 — Partner Certificato

| Aspetto | Dettaglio |
|---------|----------|
| **Requisiti** | Completare la certificazione online (2h), avere almeno 10 barbieri nella propria rete |
| **Benefici** | Badge "Styll Certified Partner", materiale marketing, supporto email dedicato |
| **Commissione** | 15% primo anno per ogni cliente portato |
| **Target** | Consulenti individuali, commercialisti, piccoli distributori |
| **Obiettivo Q1-Q2** | 20 partner certificati |

#### Tier 2 — Partner Silver

| Aspetto | Dettaglio |
|---------|----------|
| **Requisiti** | 10+ clienti attivi portati, certificazione avanzata (4h), 6 mesi nel programma |
| **Benefici** | Tutto Tier 1 + co-branding, lead sharing, accesso anticipato feature, account manager dedicato |
| **Commissione** | 20% primo anno + 5% ricorrente |
| **Target** | Distributori regionali, accademie barbiere, agenzie marketing locali |
| **Obiettivo Q3-Q4** | 10 partner Silver |

#### Tier 3 — Partner Gold

| Aspetto | Dettaglio |
|---------|----------|
| **Requisiti** | 50+ clienti attivi portati, certificazione completa (8h + esame), 12 mesi nel programma |
| **Benefici** | Tutto Tier 2 + speaker a eventi Styll, input su roadmap prodotto, revenue share custom |
| **Commissione** | 25% primo anno + 10% ricorrente + bonus trimestrali |
| **Target** | Distributori nazionali, grandi accademie, partner strategici |
| **Obiettivo Anno 2** | 5 partner Gold |

### Certificazione partner

**Modulo 1 — Fondamenti (1h):**
- Cos'è Styll e perché esiste
- Posizionamento vs competitor
- Il concetto di retention-first
- Demo della piattaforma

**Modulo 2 — Vendita e onboarding (1h):**
- Come presentare Styll a un barbiere
- Obiezioni comuni e risposte
- Il processo di migrazione concierge
- Setup guidato: come accompagnare il barbiere

**Modulo 3 — Avanzato (2h, solo Tier 2+):**
- Gamification e loyalty: configurazione e best practice
- Analytics e churn detection: come leggere i dati
- Multi-staff e multi-sede: gestione avanzata
- Troubleshooting e supporto di primo livello

**Modulo 4 — Strategia (4h, solo Tier 3):**
- Business development e upselling
- Gestione portfolio clienti
- Co-marketing avanzato
- Contributo alla roadmap prodotto

---

## 9. Metriche di partnership con target trimestrali

### KPI principali

| Metrica | Q1 | Q2 | Q3 | Q4 |
|---------|-----|-----|-----|-----|
| **Partner attivi totali** | 10 | 30 | 55 | 80 |
| **Clienti portati da partner** | 15 | 60 | 130 | 250 |
| **% revenue da partner** | 5% | 12% | 20% | 25% |
| **Integrazioni attive (Zapier/native)** | 2 | 4 | 6 | 8 |
| **Partner certificati** | 5 | 20 | 35 | 50 |
| **NPS partner** | — | 40+ | 45+ | 50+ |
| **Costo acquisizione via partner (CAP)** | — | <€50 | <€40 | <€35 |
| **Churn rate clienti da partner** | — | <8% | <6% | <5% |

### Metriche per tipo di partnership

| Tipo | Metrica primaria | Metrica secondaria | Target Anno 1 |
|------|-----------------|-------------------|---------------|
| **Technology** | Adoption rate integrazione | Retention uplift | 30% clienti con 1+ integrazione |
| **Affiliate** | Clienti referiti/mese | Conversion rate | 15 clienti/mese da Q3 |
| **Co-Marketing** | Lead generati | Brand awareness (impressions) | 500 lead qualificati |
| **Channel** | Revenue da partner | Partner attivi | 25% revenue da channel |
| **Strategic** | Deal strategici chiusi | Market positioning | 2-3 partnership chiave |

### Dashboard partnership (da implementare)

Metriche da tracciare nella dashboard admin:
- Revenue per partner (top 10)
- Funnel conversione per canale partner
- Tempo medio da referral a primo pagamento
- Retention clienti per fonte (partner vs organico vs paid)
- Engagement partner (login dashboard partner, materiali scaricati)

---

## 10. Case study di partnership SaaS di successo

### Case Study 1 — CallRail × HubSpot
**Contesto:** CallRail, piattaforma di call tracking, ha costruito una partnership strategica con HubSpot basata sull'integrazione tecnologica e l'Ecosystem-Led Growth.
**Risultati:** L'adozione dell'integrazione HubSpot è cresciuta del 167%, le opportunità provenienti da HubSpot sono triplicate anno su anno, e il tasso di conversione da trial gratuito a cliente pagante è aumentato del 42%.
**Lezione per Styll:** Un'integrazione tecnologica profonda con un partner strategico (nel nostro caso Google Calendar o un POS come SumUp) può diventare un moltiplicatore di crescita se supportata da co-marketing e referral reciproco.

### Case Study 2 — Jungle Scout — Programma affiliazione
**Contesto:** Jungle Scout, tool per venditori Amazon, ha costruito un programma affiliazione con migliaia di partner, ma le commissioni complesse e i processi manuali ne limitavano la crescita.
**Risultati:** Dopo l'ottimizzazione con payout automatizzati e commissioni a livelli, il 30% del revenue netto annuale proveniva dal programma affiliati.
**Lezione per Styll:** Il programma affiliazione deve essere semplice da gestire fin dall'inizio. Automatizzare i payout e usare commissioni chiare evita l'attrito che blocca la crescita.

### Case Study 3 — Glide — Programma partner
**Contesto:** Glide, piattaforma no-code, ha lanciato un programma partner strutturato con incentivi basati sui dati.
**Risultati:** Il programma partner è diventato responsabile del 30% del revenue totale di Glide, grazie a operazioni semplificate e incentivi mirati.
**Lezione per Styll:** Anche per una startup early-stage, strutturare il programma partner con metriche chiare e incentivi trasparenti fin dall'inizio ripaga nel medio termine.

### Case Study 4 — Bolt Business — Crescita tramite partner
**Contesto:** Bolt Business ha lanciato un programma partnership completo puntando sulla velocità di onboarding dei partner e sulla scalabilità.
**Risultati:** Il revenue generato dai partner è cresciuto del 30% mese su mese dalla data di lancio del programma.
**Lezione per Styll:** La velocità di onboarding dei partner è un fattore critico. Se un distributore può iniziare a referire barbieri in 24 ore (non in 2 settimane), il programma scala naturalmente.

### Case Study 5 — Breezy — Marketplace come leva di crescita
**Contesto:** Breezy, software HR, ha usato il marketplace PartnerStack per attrarre nuovi partner in modalità self-service, senza gestione interna pesante.
**Risultati:** Crescita del 45% anno su anno nel revenue generato dalle partnership, guidata principalmente dal modello self-service del marketplace.
**Lezione per Styll:** In fase iniziale, un modello self-service per affiliati (landing page con form, dashboard automatica, materiali scaricabili) è più efficace di un programma gestito manualmente. Il distributore si iscrive, ottiene il link e il kit, e comincia subito.

---

## 11. Roadmap partnership 12 mesi

### Fase 1 — Foundation (Mese 1-4)

**Obiettivo:** Costruire le basi tecniche e i primi 10 partner.

| Mese | Azione | Owner | Output |
|------|--------|-------|--------|
| 1 | Implementare Google Calendar sync | Dev | Integrazione live |
| 1 | Implementare MessageBird/Infobip API | Dev | SMS + WhatsApp funzionanti |
| 2 | Implementare Google Business Profile import | Dev | Auto-fill al setup |
| 2 | Creare landing page "Diventa Partner" | Marketing | Pagina live |
| 2 | Definire commissioni e contratto affiliazione | Business | Documento legale |
| 3 | Reclutare 5 barbieri beta come ambassador | Business | 5 ambassador attivi |
| 3 | Contattare 10 micro-influencer barbiere | Marketing | 3-5 accordi |
| 4 | Creare materiale certificazione partner (Modulo 1-2) | Marketing | Corso online |
| 4 | Contattare 3 distributori prodotti regionali | Business | 1-2 accordi |

**Milestone:** 10 partner attivi, 3 integrazioni live, programma affiliazione operativo.

### Fase 2 — Growth (Mese 5-8)

**Obiettivo:** Scalare i canali che funzionano, lanciare Zapier, primo co-marketing.

| Mese | Azione | Owner | Output |
|------|--------|-------|--------|
| 5 | Lanciare integrazione Zapier (5 trigger + 4 azioni) | Dev | Connettore Zapier live |
| 5 | Listing su Capterra, G2, GetApp | Marketing | Profili attivi |
| 6 | Primo webinar co-hosted con accademia barbiere | Marketing | 50+ registrazioni |
| 6 | Lanciare programma certificazione Tier 1 | Business | 10+ certificati |
| 7 | Partecipare a 1 fiera di settore | Marketing/Business | 30+ lead qualificati |
| 7 | Contattare 2 associazioni di categoria (CNA, Confartigianato) | Business | 1 accordo |
| 8 | Pubblicare 3 case study barbiere + Styll | Marketing | Contenuti live |
| 8 | Lanciare programma Tier 2 (Silver) | Business | 5 partner Silver |

**Milestone:** 30 partner attivi, 15% revenue da partner, Zapier live, prima fiera.

### Fase 3 — Scale (Mese 9-12)

**Obiettivo:** Industrializzare, espandere geograficamente, preparare il marketplace.

| Mese | Azione | Owner | Output |
|------|--------|-------|--------|
| 9 | Implementare SumUp/Stripe integration | Dev | Pagamenti integrati |
| 9 | Lanciare API pubblica v1 + documentazione | Dev | API docs live |
| 10 | "Styll Summit" — evento online annuale | Marketing | 200+ partecipanti |
| 10 | Report co-branded "Stato del barbiere italiano" | Marketing | Report pubblicato |
| 11 | Espandere a 3 regioni italiane con partner locali | Business | Copertura 5 regioni |
| 11 | Lanciare programma Tier 3 (Gold) per top partner | Business | 2 partner Gold |
| 12 | Preparare marketplace strategy per Anno 2 | Product/Dev | Roadmap definita |
| 12 | Review annuale partnership e planning Anno 2 | Business | Report + piano |

**Milestone:** 80 partner attivi, 25% revenue da partner, API pubblica, presenza in 5+ regioni.

---

## 12. Riscontri e osservazioni

### Top 3 partner da contattare immediatamente

**1. Distributore regionale di prodotti barbiere (es. Barber Brands Europe, agente locale Proraso/Depot)**
- **Perché:** Visita 50-200 barbieri al mese. È già un contatto fidato. Può presentare Styll durante le visite commerciali normali.
- **Next step:** Identificare il distributore più attivo nella regione Campania (mercato target primario — Napoli, persona Marco). Proporre un pilot di 3 mesi con 10 barbieri.
- **Timeline:** Settimana 1-2

**2. Accademia barbiere italiana (es. Italian Barber Academy, BarberShop Academy Milano)**
- **Perché:** Ogni studente che esce dall'accademia è un potenziale cliente Styll. Se Styll diventa parte del curriculum, si crea una pipeline organica permanente.
- **Next step:** Contattare il direttore didattico con una proposta: "Styll gratis per tutti gli studenti durante il corso + demo in aula + webinar trimestrale congiunto".
- **Timeline:** Mese 1-2

**3. SumUp Italia**
- **Perché:** SumUp è il POS più diffuso tra i micro-professionisti italiani. Un'integrazione nativa Styll × SumUp creerebbe un'offerta combinata molto attraente per il barbiere.
- **Next step:** Contattare il team partnership di SumUp Italia (partnership@sumup.com) con una proposta di integrazione tecnica + co-marketing.
- **Timeline:** Mese 2-3

### Quick wins (implementabili in < 30 giorni)

1. **Programma "Invita un collega"** — Meccanismo referral barbiere-a-barbiere nel prodotto. 1 mese gratis per entrambi. Costo: solo il mese gratuito. Implementazione: 1 settimana.

2. **Landing page "Diventa Partner"** — Pagina sul sito Styll con form, FAQ e commissioni. Permette di raccogliere lead di potenziali partner organicamente. Implementazione: 2-3 giorni.

3. **Kit social per ambassador** — Pacchetto scaricabile con 5 template Instagram, 3 template WhatsApp e 1 video di 60 secondi per barbieri ambassador. Costo: €0 (generato internamente). Implementazione: 1 settimana.

4. **Listing su Capterra/G2** — Creare profilo con screenshot, pricing e descrizione. Gratuito. Genera lead inbound di barbieri che cercano software. Implementazione: 1-2 giorni.

5. **First partner onboarding kit** — Documento PDF con pitch deck, FAQ, pricing, e processo di referral. Tutto ciò che serve a un partner per cominciare. Implementazione: 3-4 giorni.

### Prerequisiti tecnici (bloccanti)

| Prerequisito | Perché è bloccante | Stato | Priorità |
|-------------|-------------------|-------|----------|
| API REST stabile (Supabase PostgREST) | Senza API non ci sono integrazioni | Da implementare | 🔴 Critica |
| OAuth 2.0 per Google | Necessario per Calendar sync e GBP import | Da implementare | 🔴 Critica |
| Account WhatsApp Business API | Necessario per messaggistica | Da richiedere | 🔴 Critica |
| Sistema di tracking referral | Senza tracking non c'è programma affiliazione | Da implementare | 🔴 Critica |
| Dashboard partner (anche minimale) | I partner devono vedere i loro referral e commissioni | Da implementare | 🟡 Alta |
| Webhook system (Supabase Realtime) | Necessario per Zapier e integrazioni asincrone | Da implementare | 🟡 Alta |
| Documentazione API pubblica | Necessaria per developer e partner tecnici | Da creare | 🟢 Media |

---

## 13. Bibliografia e fonti per la tesi

### Articoli accademici e report di ricerca

1. Gallup (2023). *The Impact of Gamification on Employee and Customer Engagement*. Gallup Workplace Report. Disponibile online. [Citato per il dato +48% engagement con gamification]

2. MarketResearchIntellect (2024). *Barber Software Market Size and Forecast*. Market Research Intellect Report. URL: https://www.marketresearchintellect.com/ [Citato per dimensione mercato software barbiere ~$1.8 miliardi]

3. IBISWorld (2024). *Barber Shops in the US — Market Size*. IBISWorld Industry Report. URL: https://www.ibisworld.com/ [Citato per mercato barbershop US $5.8 miliardi]

### Fonti su partnership e ecosistemi SaaS

4. Bellaert, R. (2025). "B2B SaaS Partnerships Guide: How to Scale and Win with the Right Partner Program". *Introw Blog*, 29 gennaio 2025. URL: https://www.introw.io/blog/b2b-saas-partnerships

5. Delta Sales App (2025). "How Strategic Partnerships Drive SaaS Growth". *Delta Sales App Blog*, 8 luglio 2025. URL: https://deltasalesapp.com/blog/how-strategic-partnerships-are-driving-growth-in-saas [Citato per case study CallRail × HubSpot: +167% adozione integrazione, 3x opportunità, +42% conversione trial]

6. PartnerStack (2025). "Revenue-Driving Partnerships in Action: Real-World Case Studies". *PartnerStack Articles*. URL: https://partnerstack.com/articles/partnerships-case-studies-2025 [Citato per case study Jungle Scout (30% revenue da affiliati), Glide (30% revenue da partner), Bolt Business (+30% MoM), Breezy (+45% YoY)]

7. Channel as a Service (2025). "Channel Partner SaaS Program Models in 2025: Trends & Strategies". 5 giugno 2025. URL: https://channelasservice.com/channel-partner-saas-program-models-in-2025-trends-strategies-and-future-predictions/

8. Impartner (2026). "How to Build the Best SaaS Partner Program". *Impartner Resources*, 6 febbraio 2026. URL: https://impartner.com/resources/blog/best-saas-partner-programs

9. Webstacks (2026). "How to Build an Effective SaaS Partnership Strategy". *Webstacks Blog*, 14 gennaio 2026. URL: https://www.webstacks.com/blog/saas-partnership-strategy

### Fonti su Zapier e integrazioni

10. Zapier (2025). "Zapier Integration Partner Program". URL: https://zapier.com/developer-platform/partner-program [Citato per dato Jotform: retention 1.5x più alta con utenti che automatizzano tramite Zapier]

11. Zapier (2021). "A deep-dive into Zapier's Partner API". *Zapier Blog*. URL: https://zapier.com/blog/zapier-partner-api-overview/

### Fonti su affiliate marketing e programmi partner

12. Shopify (2025). "Shopify Affiliate Marketing Program". URL: https://www.shopify.com/affiliates [Citato per struttura commissioni Shopify Affiliate Program]

13. Shopify (2025). "Retail Affiliate Programs: The Complete Guide for 2026". *Shopify Blog*, 20 agosto 2025. URL: https://www.shopify.com/blog/affiliate-programs-for-retailers [Citato per trend AI in affiliate marketing e strutture commissioni]

### Fonti su competitor e settore barbiere

14. Proraso (2024). Sito ufficiale. URL: https://proraso.com/en/ [Citato come potenziale partner co-marketing nel settore grooming italiano]

15. Barber Brands Europe (2025). Sito ufficiale. URL: https://www.barberbrandseurope.com/ [Citato come potenziale partner di distribuzione europeo]

16. Suplery (2025). "Best Wholesale Barber Supplies". URL: https://suplery.com/industry/barbershop/ [Citato come esempio di piattaforma B2B per forniture barbiere]

17. WWD (2025). "Italian Barbershop Chain Barberino's Raises $1.2 Million for U.S. Push". *Women's Wear Daily*, 14 luglio 2025. URL: https://wwd.com/beauty-industry-news/beauty-features/barberinos-capital-increase-usa-expansion-store-openings-1237969297/ [Citato per contesto mercato barbershop italiano e internazionale]

### Fonti su integrazioni tecniche

18. Google (2025). *Google Calendar API v3 Documentation*. URL: https://developers.google.com/calendar/api

19. Google (2025). *Google Business Profile API Documentation*. URL: https://developers.google.com/my-business/

20. MessageBird (2025). *Conversations API Documentation*. URL: https://developers.messagebird.com/

21. Stripe (2025). *Stripe Connect Documentation*. URL: https://stripe.com/docs/connect

22. Supabase (2025). *Supabase Documentation*. URL: https://supabase.com/docs

23. Meta (2025). *WhatsApp Business Platform — Pricing*. URL: https://business.whatsapp.com/products/platform-pricing [Citato per costi messaggistica WhatsApp Business API in Italia]

---

> **Nota:** Questo documento è parte del progetto di tesi per Styll. Le proiezioni finanziarie sono stime basate su benchmark di settore e case study documentati. I dati di mercato sono aggiornati alle fonti più recenti disponibili (2024-2026).