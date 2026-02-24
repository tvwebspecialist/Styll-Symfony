# Amity — Contesto del Progetto di Tesi

> **Usa questo file all'inizio di ogni nuova chat con Copilot:**
> *"Leggi il file messaggio.md nel repo tvwebspecialist/Amity"*

---

## Perché nasce questo progetto

Questo progetto nasce da un problema reale vissuto in prima persona.
Inizialmente è stata sviluppata un'app per un singolo barbiere, per semplificare la gestione degli appuntamenti e dei clienti. L'idea funzionava, ma il limite era evidente: ogni nuova attività avrebbe richiesto un progetto da rifare da zero.

Da questa riflessione nasce la domanda centrale:
> È possibile creare un'unica app lato utente e un unico gestionale lato professionista, capaci di adattarsi a realtà diverse senza ripartire da zero?

La risposta è questo progetto di tesi.

---

## L'idea

Una piattaforma **SaaS verticale per barbieri** che:
- Non è un marketplace e non serve a portare nuovi clienti
- Serve a chi i clienti li ha già, ma vuole gestirli meglio
- È sempre online, non si installa, non complica la vita

**La promessa del prodotto:**
> *"Non ti porto clienti, ti aiuto a gestire i tuoi."*

Il professionista rimane sempre al centro. La tecnologia lavora in silenzio, dietro le quinte.

---

## A chi è rivolto

Il focus principale è il mondo dei **barbieri**, un contesto dove il rapporto umano, la continuità e la fiducia con il cliente sono fondamentali.

---

## Struttura tecnica

### Architettura Multi-Tenant
Un'unica piattaforma centrale che ospita più barbieri contemporaneamente, mantenendo separati dati, impostazioni e identità visiva di ciascuno.

### Le 3 interfacce del sistema

1. **Dashboard Amministratore**
   - Creazione e gestione dei professionisti (barbieri)
   - Attivazione/disattivazione accessi in base all'abbonamento
   - Configurazione nome, colori, logo e stile del brand
   - Abilitazione/disabilitazione funzionalità (feature toggle)

2. **Dashboard del Professionista (Barbiere)**
   - Gestione calendario
   - Visualizzazione e organizzazione appuntamenti
   - Configurazione servizi offerti
   - Gestione clienti

3. **Landing Page + App Cliente (PWA)**
   - Landing page dedicata per ogni barbiere
   - Il cliente installa l'app direttamente dal browser (nessuno store)
   - Sul telefono del cliente appare l'app del barbiere (non una piattaforma esterna)

### White-Label e Branding Esterno
Ogni professionista dispone di:
- Indirizzo web dedicato
- Nome app personalizzato
- Icona personalizzata
- Colori e logo coerenti con il proprio brand

L'esperienza percepita dal cliente è quella di un'app proprietaria del barbiere, non di una piattaforma esterna.

### Stack Tecnologico
- **Frontend:** React
- **Backend / Database / Auth:** Supabase
- **Architettura:** SaaS online, sempre accessibile, aggiornabile centralmente

---

## Naming e Branding

- Il brand è volutamente **generale, pulito e premium** (non settoriale nel nome)
- Il prodotto è verticale sui barbieri, ma il naming deve essere neutro e internazionale
- Vibe di riferimento: **Amity** — premium, minimale, english-sounding
- Il nome Amity è già usato (amity.co e altri), quindi si stanno valutando alternative

### Nomi già valutati
Amity, Cutzen, Hairmony, Barbient, Groomly, Grommity, Unshave, Openbarb, Trimi, Hairtask, Hairpact, Reshares, Kreap, Trimlok, Cutto, Hairoo

### Criteri per il nome ideale
- 4–6 lettere
- English-sounding
- Morbido, facile da pronunciare
- Non un mashup evidente
- Premium e minimale
- Non troppo descrittivo del settore

---

## Competitor principali

| Nome | Categoria | Da studiare per |
|------|-----------|-----------------|
| **Fresha** | SaaS verticale beauty/saloni | Modello di diffusione e acquisizione utenti globali |
| **GlossGenius** | All-in-one per parrucchieri | UX/UI per freelance e piccoli saloni |
| **Mangomint** | SaaS gestione saloni e spa | Automazione e flusso di lavoro completo |
| **Phorest** | SaaS gestione salon enterprise | Gestione multi-location e customer retention |
| **Meevo** | SaaS saloni e spa scalabile | Funzionalità avanzate di reporting |
| **Acuity Scheduling** | SaaS specializzato in booking | UX di scheduling puro |

---

## Stato attuale del progetto

- [x] Idea e concept definiti
- [x] Struttura tecnica progettata (multi-tenant, white-label, PWA, 3 interfacce)
- [x] Stack tecnologico scelto (React + Supabase)
- [x] Analisi competitor completata
- [x] Naming in fase di definizione (nome preferito: Amity, già usato)
- [ ] Naming definitivo da scegliere
- [ ] Branding e identità visiva
- [ ] Progettazione UI/UX (wireframe e mockup)
- [ ] Sviluppo del codice
- [ ] Testing
- [ ] Documentazione tesi

---

## Note e decisioni importanti

- Il prodotto è **verticale sui barbieri**, ma il brand è **generale e premium**
- La tecnologia deve restare **invisibile**: il barbiere e il suo brand sono protagonisti
- **Non è un marketplace**: nessuna competizione tra barbieri, nessuna acquisizione clienti
- La PWA permette di avere un'app "installabile" senza passare dagli store (App Store / Google Play)
- L'architettura multi-tenant permette di gestire tutti i barbieri con un solo sistema centrale
