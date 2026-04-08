# Roadmap e Sviluppo — Styll

## Roadmap feature

### v1 — Lancio (MVP)
- Prenotazioni + pagamenti online
- CRM clienti centralizzato
- Loyalty base a punti
- Silent Churn Detector (notifica)
- Promemoria anti no-show
- Richiesta recensioni auto
- Landing page + PWA cliente brandizzata

### v2 — Crescita
- Loyalty gamificata (badge, streak, livelli)
- Campagne win-back automatiche
- QR walk-in + coda digitale
- Abbonamenti e pacchetti
- Reward personalizzati
- Punteggio cliente VIP
- Analytics avanzata

### v3 — AI
- AI Business Coach
- Previsione ricavi
- Last-minute slot filler geolocalizzato
- Prenotazione da WhatsApp
- Story Instagram post-visita
- No-show prediction AI + deposito smart
- Prezzi dinamici

---

## Stato attuale del progetto

- [x] Idea e concept definiti
- [x] Struttura tecnica progettata (multi-tenant, white-label, PWA, 3 interfacce)
- [x] Stack tecnologico scelto (React + Supabase)
- [x] Analisi competitor completata (8 competitor, 2 categorie)
- [x] Learnings e opportunities definiti
- [x] Modello di business definito (3 tier)
- [x] Roadmap feature completa (v1, v2, v3)
- [x] Feature innovative esclusive definite (9 feature)
- [x] Personas creati (4: 2 professionisti + 2 clienti)
- [x] Indice tesi aggiornato (10 capitoli)
- [x] Brand Analysis "Your Company" completata
- [x] User Journey Maps completate (4 journey per le 4 personas)
- [x] Open Questions & spunti di approfondimento documentati (10 temi)
- [x] Open Questions risolte — decisioni progettuali concrete per tutti i 10 temi
- [x] Naming definitivo: Styll (processo documentato in `docs/05-brand/naming-process.md`)
- [ ] Branding e identità visiva
- [ ] Architettura dell'informazione e flussi
- [ ] Wireframe low-fidelity
- [ ] Design system
- [ ] Progettazione UI/UX (high-fidelity)
- [ ] Prototipo interattivo
- [ ] Scrittura tesi (Cap. 1-4 pronti da scrivere)
- [ ] Testing e validazione

---

## Prossimi step

1. ~~**User Journey Maps** — percorso completo di ogni persona con il prodotto~~ ✅ Completato
2. ~~**Open Questions** — spunti di approfondimento su setup, staff, loyalty, migrazione, ecc.~~ ✅ Documentati
3. ~~**Approfondire le Open Questions** — risolvere i 10 temi uno per uno e trasformarli in decisioni~~ ✅ Completato
4. **Architettura dell'informazione** — mappa di tutte le schermate e navigazione
5. **Wireframe low-fidelity** — schizzi strutturali
6. **Design system** — regole visive + componenti (post-branding)
7. **UI high-fidelity** — schermate finali
8. **Prototipo interattivo** — Figma cliccabile

---

## Indice tesi (aggiornato)

### Introduzione
- Contesto e motivazioni del progetto
- Obiettivi della tesi
- Metodo di lavoro e approccio progettuale
- Struttura del documento

### Capitolo 1 — Contesto teorico e di mercato
1.1 La digitalizzazione dei micro-professionisti locali
1.2 Il modello SaaS: definizione, evoluzione e varianti
1.3 SaaS verticali, marketplace e gestionali brandizzati: differenze fondamentali
1.4 Il tema della relazione diretta professionista–cliente
1.5 Il settore barbershop e grooming: dimensione del mercato, trend e proiezioni

### Capitolo 2 — Analisi del problema
2.1 Il professionista locale oggi: come gestisce appuntamenti, clienti e fidelizzazione
2.2 Limiti degli strumenti informali (agenda cartacea, WhatsApp, Google Calendar)
2.3 Il problema invisibile: la perdita silenziosa dei clienti (silent churn)
2.4 Bisogni reali del professionista: oltre la prenotazione
2.5 Bisogni del cliente finale

### Capitolo 3 — Analisi delle soluzioni esistenti
3.1 Panoramica: categorie di soluzioni (marketplace, tool brandizzati, gestionali generici)
3.2 Analisi dei marketplace: Fresha, Booksy, theCut
3.3 Analisi dei tool brandizzati: Barberly, BookedBarber, GlossGenius
3.4 Analisi delle soluzioni premium: Phorest, Squire
3.5 Tavola comparativa e benchmark
3.6 Analisi delle recensioni utenti: pattern di frustrazione e soddisfazione
3.7 Buchi di mercato identificati

### Capitolo 4 — Learnings e opportunità strategiche
4.1 Cosa funziona: lezioni dai competitor (what's worth having)
4.2 Cosa evitare: errori ricorrenti e anti-pattern
4.3 Opportunità di differenziazione: dove il mercato è vuoto
4.4 La retention come territorio inesplorato nel segmento accessibile
4.5 La gamification applicata alla fidelizzazione: stato dell'arte e case study

### Capitolo 5 — Visione e concept del progetto
5.1 Posizionamento: non un gestionale, un sistema di retention
5.2 La filosofia brand-first: l'app è del professionista
5.3 Modello white-label e scelta tecnica: PWA vs app nativa
5.4 Target primario e possibilità di estensione verticale
5.5 Modello di business: struttura dei tier, pricing e monetizzazione
5.6 Roadmap prodotto: v1, v2, v3

### Capitolo 6 — Brand identity
6.1 Strategia di branding e posizionamento percettivo
6.2 Il processo di naming
6.3 Identità visiva: logo, palette colori, tipografia
6.4 Tono di voce e personalità del brand
6.5 Applicazione del brand nell'interfaccia

### Capitolo 7 — Progettazione UX
7.1 Ricerca utenti: personas del professionista e del cliente finale
7.2 Scenari d'uso e user journey
7.3 Architettura dell'informazione
7.4 Flussi principali: prenotazione, loyalty/gamification, win-back, dashboard barbiere
7.5 Principi di usabilità e scelte progettuali
7.6 Il design per due utenti: l'esperienza del barbiere e del suo cliente

### Capitolo 8 — Progettazione UI e prototipazione
8.1 Design system: fondamenta visive e componenti
8.2 Il sistema di branding adattivo: come l'interfaccia cambia per ogni barbiere
8.3 Progettazione delle interfacce principali (lato barbiere)
8.4 Progettazione delle interfacce principali (lato cliente)
8.5 Le interfacce della gamification: streak, badge, livelli, reward
8.6 Prototipo interattivo e walkthrough

### Capitolo 9 — Implementazione tecnica
9.1 Architettura del sistema: PWA, backend, database multi-tenant
9.2 Scelte tecnologiche e stack
9.3 Funzionalità implementate nel prototipo
9.4 Gestione multi-brand: come un'unica piattaforma serve migliaia di barbieri

### Capitolo 10 — Feature innovative e visione futura
10.1 Le feature che nessun competitor offre
10.2 Business Coach AI
10.3 Smart Reward personalizzato
10.4 No-show prediction e deposito intelligente
10.5 Last-minute slot filler geolocalizzato
10.6 After-Visit Story: marketing virale organico
10.7 Scalabilità: dal barbiere al fitness, dal tattoo al veterinario
10.8 Validazione: test, feedback e prossimi passi

### Conclusioni
### Bibliografia e sitografia
### Appendici
