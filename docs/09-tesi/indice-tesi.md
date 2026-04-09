> **Progetto:** Styll — Progettazione di una piattaforma SaaS di retention per barbieri indipendenti

> ℹ️ Indice definitivo deciso durante la sessione di audit dell'8 aprile 2026. Le versioni precedenti (10 capitoli progettuali, 6 capitoli academic) sono obsolete. La versione academic a 6 capitoli è archiviata in `ARCHIVED-struttura-tesi-academic-6cap.md`.

---

# Indice della Tesi — Struttura definitiva a 8 capitoli

**Titolo placeholder:** *"Styll — Progettazione di una piattaforma SaaS di retention per barbieri indipendenti"*
**Stile:** progettuale, narrativo, prima persona. NON academic terza persona. NON case study Yin.
**Lunghezza target:** 120-150 pagine escluse appendici e bibliografia.
**Bibliografia:** stile coerente ma non APA 7th rigoroso, target 50-80 fonti.
**Contesto:** tesi ABA (Accademia di Belle Arti) in Web e Comunicazione d'Impresa, focus UX/UI + Front-End.

---

### Introduzione (5-8 pp.)
- Da dove nasce il progetto (storia personale del barbiere singolo)
- Domanda progettuale: "È possibile creare un'unica piattaforma che si adatti a molte realtà diverse senza rifarla ogni volta?"
- Obiettivi della tesi
- Metodo di lavoro
- Come leggere il documento

### Capitolo 1 — Contesto teorico (15-20 pp.)
Fondamenta teoriche. Distilla la literature review esistente concentrandosi sui concetti chiave.
- 1.1 La digitalizzazione dei micro-professionisti locali
- 1.2 Cos'è un SaaS: breve storia, dal software scatolato al cloud, modelli multi-tenant
- 1.3 SaaS orizzontali vs verticali: perché la verticalizzazione sta vincendo
- 1.4 Marketplace vs gestionali brandizzati: due filosofie opposte del rapporto professionista-cliente
- 1.5 Il concetto di retention e perché conta più dell'acquisizione
- 1.6 Cos'è la gamification: definizione, esempi celebri, teoria psicologica (SDT in versione divulgativa)
- 1.7 Il settore barbershop italiano: numeri, frammentazione, digitalizzazione

### Capitolo 2 — Il problema (12-15 pp.)
- 2.1 Come lavora oggi un barbiere indipendente (WhatsApp, agenda, Google Calendar)
- 2.2 Il silent churn: il problema invisibile
- 2.3 I bisogni del barbiere oltre la prenotazione
- 2.4 I bisogni del cliente finale: due mondi opposti (il 22enne e il 54enne)
- 2.5 Voice of Customer: le 7 lamentele universali dalle 2.800 recensioni

### Capitolo 3 — Analisi delle soluzioni esistenti (15-20 pp.)
- 3.1 Le tre categorie: marketplace, tool brandizzati, gestionali premium
- 3.2 I marketplace: Fresha, Booksy, theCut
- 3.3 I tool brandizzati: Barberly, BookedBarber, GlossGenius
- 3.4 Le soluzioni premium: Phorest, Squire
- 3.5 Matrice comparativa completa
- 3.6 I buchi di mercato
- 3.7 La mappa di posizionamento

### Capitolo 4 — Visione e concept del progetto (15-20 pp.)
- 4.1 Dall'analisi al concept
- 4.2 Il posizionamento: non un gestionale, un sistema di retention
- 4.3 La filosofia brand-first
- 4.4 PWA vs app nativa: la scelta tecnica chiave
- 4.5 Le 4 personas (Marco, Sara, Luca, Roberto) e journey map
- 4.6 Il modello di business: i 3 tier
- 4.7 Roadmap v1, v2, v3

### Capitolo 5 — Brand identity (15-20 pp.)
Capitolo dedicato al brand, pensato per la relatrice copywriter.
- 5.1 Dal posizionamento al brand
- 5.2 Il processo di naming: criteri, shortlist, perché Styll (fonte: `docs/05-brand/naming-process.md`)
- 5.3 Mission, vision, valori, archetipo (Creator + Caregiver)
- 5.4 Tone of voice: voice chart, 4 dimensioni NNG, esempi
- 5.5 Il doppio livello verbale: Styll come Styll (B2B) vs Styll come il barbiere (B2C)
- 5.6 Identità visiva: palette, tipografia, logo, iconografia
- 5.7 Applicazione del brand sui touchpoint

### Capitolo 6 — Progettazione UX/UI (25-35 pp. — il più lungo)

> *"Il sistema prevede una terza interfaccia — la Dashboard Admin — destinata alla gestione operativa della piattaforma (creazione tenant, feature toggle, billing). Essendo uno strumento interno di amministrazione, senza implicazioni dirette sull'esperienza del professionista o del suo cliente, è esclusa dall'ambito progettuale di questa tesi. La sua esistenza è descritta a livello architetturale nel Capitolo 7, ma non ne viene progettata l'interfaccia."*

- 6.1 Principi di design: mobile-first, progressive complexity, invisible brand
- 6.2 Architettura dell'informazione: mappa delle schermate per le **2 interfacce utente** (Barbiere, Cliente)
- 6.3 Flussi principali: prenotazione in 3 tap, setup wizard 5-step, loyalty, silent churn → win-back
- 6.4 Design system: griglia, tipografia, spaziature, componenti
- 6.5 Sistema di branding adattivo
- 6.6 Interfacce della gamification: punti, streak, badge, tier
- 6.7 Dashboard barbiere: progressive complexity (Marco 30% vs Sara 70%)
- 6.8 Wireframe low-fi → high-fi → prototipo
- 6.9 Test utente (se effettuati)

### Capitolo 7 — Implementazione tecnica (15-20 pp.)
- 7.1 Architettura del sistema: PWA + Supabase + multi-tenant
- 7.2 Lo stack: Next.js 14+ con App Router + TypeScript, Supabase, PWA
- 7.3 Database schema: panoramica, multi-tenant con RLS
- 7.4 Il prototipo funzionante
- 7.5 Sistema di branding dinamico in codice
- 7.6 **Menzione architetturale della Dashboard Admin** (mezza pagina, solo descrizione concettuale, no UI)
- 7.7 Difficoltà e soluzioni

### Capitolo 8 — Visione futura (10-12 pp.)
- 8.1 Feature innovative per versioni future (AI Coach, No-show Prediction, Slot Filler, After-Visit Story)
- 8.2 Scalabilità: dal barbiere al fisioterapista, tattoo, veterinario
- 8.3 Internazionalizzazione: 9 mercati, PPP pricing
- 8.4 Validazione: test, feedback, prossimi passi

### Conclusioni (4-6 pp.)

### Bibliografia e sitografia

### Appendici
- A — Matrice competitor
- B — Business Model Canvas
- C — Database schema completo
- D — Screenshot prototipo
- E — Risultati Voice of Customer