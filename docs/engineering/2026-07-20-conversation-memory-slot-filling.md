# Conversation Memory Ibrida e Slot Filling Portabile

- Data: 2026-07-20
- Stato: accepted

## Contesto

La milestone corrente richiede una prima conversazione completa da receptionist AI, non altra infrastruttura.

Il runtime esistente aveva gia:

- provider AI tipizzati;
- prompt/context builder tenant-scoped;
- decision engine deterministico;
- audit `inbox_ai_runs`;
- FAQ deterministiche per i casi low-risk.

Mancavano pero tre comportamenti chiave:

- memoria conversazionale reale tra piu turni;
- interpretazione affidabile di follow-up brevi come `domani`, `alle 16`, `va bene`;
- raccolta progressiva degli slot appointment senza handoff prematuro.

Vincoli operativi della sessione:

- nessun auto-send;
- nessuna esecuzione automatica di tool;
- nessun framework AI generico, state machine generica o pipeline nuova;
- nessun affidamento al modello come autorita sui dati;
- tenant isolation, ownership, audit e approval flow invarianti.

## Decisione

Introdurre un approccio ibrido composto da:

1. resolver deterministico del transcript in `apps/web/src/lib/ai/inbox-memory-resolver.ts`;
2. output strutturato del provider AI;
3. merger puro e framework-agnostic in `apps/web/src/lib/ai/receptionist-conversation-state.ts`.

Il resolver deterministico estrae senza usare il modello:

- ultimo intent rilevante;
- intent appointment attivo;
- ultimo servizio citato;
- ultima data richiesta;
- ultimo orario richiesto;
- ultimo riferimento appuntamento;
- ultimo slot mancante;
- stato planner `appointment_missing_service|appointment_missing_date|appointment_missing_time|appointment_complete`.

Il provider AI aggiunge solo understanding strutturato:

- `intent`
- `confidence`
- `handoff`
- `entities.service`
- `entities.requestedDate`
- `entities.requestedTime`
- `entities.appointmentReference`
- `entities.customerName`
- `entities.customerNotes`
- `corrections.replacesService`
- `corrections.replacesDate`
- `corrections.replacesTime`

Il merger produce uno stato conversazionale puro:

- `activeGoal`
- `service`
- `requestedDate`
- `requestedTime`
- `appointmentReference`
- `customerName`
- `customerNotes`
- `missingFields`
- `nextQuestion`
- `lastIntent`
- `updatedFromMessageId`

Il decision engine e il prompt usano poi questa memoria per:

- non richiedere due volte informazioni gia note;
- fare una sola domanda utile per turno;
- trattare `conversational_followup` come continuazione del contesto precedente;
- applicare correzioni esplicite del cliente ai valori piu recenti validati;
- distinguere `booking`, `reschedule` e `cancel` senza eseguire tool;
- preparare `prepare_appointment` solo quando `service`, `requested_date` e `requested_time` sono completi.

`prepare_appointment` resta solo advisory e riceve:

- `service`
- `requested_date`
- `requested_time`
- `customer_name`
- `customer_notes`
- `conversation_summary`

## Alternative considerate

1. Demandare memoria, correzioni e slot filling interamente a Claude.
2. Introdurre una state machine conversazionale generica o un workflow engine.
3. Chiudere i casi incompleti con handoff umano invece di fare la domanda successiva.

## Motivazione

L approccio ibrido e coerente con il runtime gia esistente:

- riusa transcript, catalogo servizi, timezone tenant e decision engine gia presenti;
- evita un nuovo layer infrastrutturale o un framework AI generico;
- mantiene le decisioni spiegabili e testabili;
- lascia al modello la comprensione linguistica ma non l autorita sui dati;
- riduce i casi in cui il modello ripete domande o perde il filo della prenotazione;
- preserva il principio per cui il modello non e autorita su slot, tenant o dati strutturati.

## Conseguenze

- la conversazione puo proseguire in modo naturale su piu turni per pricing, booking, reschedule, cancel e follow-up;
- l Inbox puo mostrare stato planner, slot mancanti e payload preparato anche dopo refresh;
- il prompt puo restare piu semplice: tono umano e una sola domanda utile, mentre validazione e completezza restano lato codice.

## Rischi

- il resolver resta limitato alle forme linguistiche supportate dal parser locale;
- la comprensione del provider resta utile ma non perfetta su linguaggio colloquiale o date implicite;
- date relative e richieste vaghe restano conservative se il transcript non e sufficiente;
- il planner non verifica ancora disponibilita live o conflitti calendario;
- booking, reschedule e cancel restano advisory e non eseguono mutazioni.

## Sicurezza

- nessun secret o token provider viene esposto al browser;
- nessun tool viene eseguito automaticamente;
- i dati strutturati preparati derivano solo da transcript tenant-scoped e cataloghi autorevoli;
- il modello non riceve autorita su `tenant_id`, query arbitrarie, auto-send o scritture DB.

## Multi-tenancy

- il resolver opera solo su messaggi gia caricati nel contesto della conversazione tenant-scoped;
- catalogo servizi, working hours e timezone restano filtrati dal tenant lato server;
- il payload advisory preparato resta associato al tenant e alla conversazione che lo ha generato.

## Migrazione

Nessuna migration obbligatoria per la memoria o il planner.

La persistenza riusa `inbox_ai_runs.input_context` e la superficie Inbox gia esistente.

Il contratto `ReceptionistConversationState` puo essere ricostruito dal transcript e riusato in Symfony senza dipendenze da React, route Next.js o Supabase.

## Rollback

Se il resolver introducesse regressioni, il runtime puo tornare a:

- ignorare `conversation_memory`;
- forzare `draft_review` per booking incompleti;
- mantenere provider, schema e UI di approval invariati.

## Test

- unit test su `inbox-memory-resolver.ts` e `receptionist-conversation-state.ts`;
- regression suite multi-turn con 60 conversazioni realistiche;
- test su continuity, follow-up, correzioni, slot filling, planner appointment e regressioni prompt;
- `pnpm --filter web test:inbox:unit`;
- `pnpm test:security:unit`;
- `pnpm type-check`;
- `pnpm lint`;
- `pnpm build`.

## Osservabilita

- `inbox_ai_runs.input_context` conserva `conversation_memory`, `receptionist_state`, understanding strutturato e payload advisory preparato;
- la Inbox espone solo dati operativi sicuri come stato planner, prossima domanda e campi preparati;
- non viene esposto reasoning interno del modello.

## Follow-up

1. Collegare lookup read-only di disponibilita live prima di qualsiasi automazione booking reale.
2. Rafforzare parser date/orario e riferimenti appuntamento con piu fixture reali di reschedule/cancel.
3. Collegare feedback operatore e metriche comparative alle conversation evaluations gia versionate.
