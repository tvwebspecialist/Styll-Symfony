# Audit di coerenza — 2026-04-08

## Sintesi esecutiva

Eseguiti i Task 6, 7 e 8 dell'audit di coerenza del repository Styll. Documentato il processo di naming, corrette 10 discrepanze numeriche nel business plan (executive summary vs tabelle dettagliate), e aggiornata la checklist di stato con 13 voci di lavoro completato ma non registrato. I Task 1–5 non erano inclusi in questa sessione.

## Decisioni progettuali applicate (non discusse, solo eseguite)

1. Naming Styll confermato, processo documentato in `docs/05-brand/naming-process.md`
2. Tabella dettagliata 6.1 del business plan è la fonte di verità per tutti i numeri finanziari
3. Checklist di stato allineata al contenuto effettivo della cartella `docs/`

## Task eseguiti

### Task 1 — Indice tesi a 8 capitoli
**Non eseguito in questa sessione.** (Task 1–5 non erano inclusi nel prompt.)

### Task 2 — Numero competitor
**Non eseguito in questa sessione.**

### Task 3 — Numero tabelle database
**Non eseguito in questa sessione.**

### Task 4 — Cancellazione progetto/
**Non eseguito in questa sessione.**

### Task 5 — Stack Next.js + TypeScript
**Non eseguito in questa sessione.**

### Task 6 — Naming process
**File creato:** `docs/05-brand/naming-process.md`
**Modifiche collegate:**
- `docs/05-brand/brand-identity.md`: aggiunto rimando al naming-process.md in apertura
- `docs/01-progetto/roadmap.md`: `[ ] Naming definitivo da scegliere` → `[x] Naming definitivo: Styll`
- `docs/09-tesi/indice-tesi.md`: idem
- `docs/03-prodotto/product-roadmap.md`: spostato naming da "Da completare" a "Completato" con nota al file
- `progetto/08-roadmap-e-sviluppo.md`: idem roadmap.md
- `messaggio.md`: aggiunto "naming definitivo (Styll)" nella riga "Stato attuale"

### Task 7 — Discrepanza business plan
**File modificato:** `docs/06-business/business-plan.md`

**Discrepanza principale corretta:** Executive summary (sezione 1) allineato alla tabella dettagliata 6.1.

**Tutte le discrepanze trovate e corrette (10 valori):**

| Metrica | Executive Summary (prima) | Tabella dettagliata (corretto) |
|---------|--------------------------|-------------------------------|
| Mese 6 — clienti | 45 | 54 |
| Mese 6 — MRR | €1.305 | €1.566 |
| Mese 6 — ARR | €15.660 | €18.792 |
| Mese 12 — clienti | 120 | 116 |
| Mese 12 — MRR | €3.480 | €3.364 |
| Mese 12 — ARR | €41.760 | €40.368 |
| Anno 2 — MRR | €10.150 | €11.200 |
| Anno 2 — ARR | €121.800 | €134.400 |
| Anno 3 — MRR | €23.200 | €28.000 |
| Anno 3 — ARR | €278.400 | €336.000 |

**Verifiche di coerenza superate (nessuna discrepanza):**
- Clienti Anno 2 (350) e Anno 3 (800): coerenti in exec summary, sezione 6.2 e scenario 9.2
- Break-even "mese 14–18": coerente tra exec summary e sezione 8.2
- ~160 clienti al break-even cumulativo: interpolazione coerente con la curva di crescita
- Nessun altro file nel repository conteneva i numeri errati

### Task 8 — Checklist di stato
**Voci cambiate da [ ] a [x]:** nessuna voce esistente cambiata (tutte le [x] preesistenti erano verificate)

**Voci nuove aggiunte (lavoro completato ma non registrato):**
1. Business plan completo con proiezioni 12/36 mesi
2. Literature review accademica
3. Analisi di internazionalizzazione (9 mercati, PPP pricing)
4. Voice of Customer su 2.800+ recensioni
5. Pricing strategy comparativa (7 modelli SaaS)
6. Go-to-market plan
7. Legal compliance / GDPR
8. Strategia social e brand
9. KPI framework e metriche SaaS
10. Database schema completo
11. Architettura tecnica dettagliata
12. Analisi strategica completa
13. Struttura tesi definita

**Voci sospette (segnalate per review):** nessuna — tutte le voci [x] preesistenti hanno contenuto corrispondente verificato.

**File aggiornati:**
- `messaggio.md` (sezione "Stato attuale")
- `docs/01-progetto/roadmap.md` (checklist)
- `docs/09-tesi/indice-tesi.md` (checklist)
- `docs/03-prodotto/product-roadmap.md` (tabella "Completato"/"Da completare")
- `progetto/08-roadmap-e-sviluppo.md` (checklist)

## Problemi aperti / richiedono decisione manuale

- **`messaggio.md` non ha una checklist [ ]/[x]** — la checklist di stato vive in `docs/01-progetto/roadmap.md`, `docs/09-tesi/indice-tesi.md` e `progetto/08-roadmap-e-sviluppo.md`. In `messaggio.md` c'è solo una riga di testo "Stato attuale" che è stata aggiornata.
- **Task 1–5 non eseguiti** — non erano inclusi nel prompt di questa sessione. Se servono, vanno richiesti separatamente.

## Altre incongruenze trovate durante l'audit (non risolte automaticamente)

1. **Stack dichiarato incoerente:** `messaggio.md` dichiara "React + Supabase" come stack, ma `docs/07-tecnico/architettura.md` e `docs/06-business/business-plan.md` riportano anch'essi "React". Se il Task 5 (Stack Next.js + TypeScript) è previsto, questa incongruenza verrà risolta da quel task.
2. ~~**Indice tesi a "10 capitoli":** la checklist ancora dice "Indice tesi aggiornato (10 capitoli)" — se il Task 1 prevede una struttura a 8 capitoli, questa voce andrà aggiornata.~~ → **Risolto in Sessione 2 (Task 1 + ritocco Task 8).**
3. **`progetto/` ancora presente:** la cartella `progetto/` contiene 8 file che sembrano essere le fonti originali poi migrate in `docs/`. Se il Task 4 (cancellazione progetto/) è previsto, va fatto il check di completezza prima.
4. **`120 clienti/mese` in `docs/07-tecnico/architettura.md:102` e `progetto/05-tecnologia-e-stack.md:97`:** si riferisce ai clienti *del singolo barbiere* (non ai clienti paganti di Styll), quindi NON è la stessa metrica del business plan. Non corretto perché semanticamente diverso.

## Commit fatti

1. `40c84e3` audit: Task 6 - naming process Styll documentato, checklist aggiornate
2. `6f24e6d` audit: Task 7 - correzione discrepanze numeriche business plan
3. `e39f180` audit: Task 8 - checklist aggiornata con lavoro effettivamente prodotto
