> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri
> **Fonti originali:** `progetto/01-visione-e-idea.md`

---

# Brand Identity — Styll

> Per il processo di scelta del nome Styll vedi [`naming-process.md`](naming-process.md) nella stessa cartella.
> Per il contesto completo del progetto vedere anche: [`docs/01-progetto/overview.md`](../01-progetto/overview.md)

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