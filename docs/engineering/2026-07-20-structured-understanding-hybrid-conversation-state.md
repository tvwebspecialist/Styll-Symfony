# Structured Understanding e Conversation State Ibrido

- Data: 2026-07-20
- Stato: accepted

## Contesto

La milestone del 20 luglio 2026 richiede una prima demo reale del receptionist AI, ma il progetto e in parallelo verso una futura migrazione da Next.js/Supabase a Symfony/VPS.

Serviva quindi una soluzione che:

- migliorasse davvero la comprensione linguistica del provider;
- mantenesse validazione, sicurezza e decisioni lato codice;
- non introducesse nuovi framework AI o orchestratori astratti;
- producesse contratti facilmente portabili fuori dal runtime attuale.

## Decisione

Il provider AI restituisce ora un output JSON strutturato nested `understanding`, mentre il codice applicativo mantiene il controllo su validazione, merge e decisione finale.

Contratto semantico adottato:

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
- `citedSources`
- `requestedToolCalls`

Lo stato conversazionale centrale viene costruito in un modulo puro e framework-agnostic:

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

Il flusso operativo e:

`transcript -> resolver deterministico -> understanding provider -> merger puro -> validated conversation state -> decision engine`

## Alternative considerate

1. Lasciare tutto al provider AI, inclusi slot filling e merge delle correzioni.
2. Introdurre una state machine conversazionale generica.
3. Aggiungere una nuova infrastruttura di memoria persistente dedicata.

## Motivazione

Questa scelta separa bene le responsabilita:

- il provider interpreta linguaggio naturale, typo, follow-up brevi e correzioni;
- il codice valida servizio, data, ora e riferimento appuntamento;
- il merger applica regole deterministiche e testabili;
- il decision engine continua a bloccare tool execution e auto-send.

## Conseguenze

- booking multi-turn, reschedule e cancel diventano piu naturali;
- le correzioni esplicite del cliente possono sostituire valori precedenti;
- uno slot ambiguo non cancella uno slot gia valido;
- la stessa logica centrale puo essere estratta o riscritta in Symfony con attrito basso.

## Rischi

- il provider puo ancora restituire entita parziali o troppo ottimistiche;
- il parser locale di date e orari resta limitato ai pattern coperti dai test;
- senza disponibilita live il sistema puo solo preparare richieste, non confermare prenotazioni.

## Sicurezza

- output provider con enum chiusi e parsing rigoroso;
- nessun campo arbitrario accettato nel contratto strutturato;
- tool advisory sanificati da `tenant_id`, flag `auto_send` e varianti equivalenti;
- nessun reasoning interno esposto alla UI;
- nessun tool viene eseguito automaticamente.

## Multi-tenancy

- i servizi estratti dal provider vengono sempre ri-validati sul catalogo tenant-scoped;
- il provider non decide mai `tenant_id`;
- transcript, FAQ, orari e servizi restano caricati solo dal contesto del tenant corrente.

## Migrazione

### Riutilizzabile in Symfony

- `AiConversationUnderstanding` come contratto semantico;
- `ReceptionistConversationState` come stato puro;
- resolver deterministico del transcript;
- merger e logica di slot filling;
- decision engine advisory e prepare-only.

### Specifico del runtime attuale

- caricamento contesto da `inbox-draft-context*.ts`;
- persistenza in `inbox_ai_runs`;
- cron route e webhook Next.js;
- surface Inbox attuale.

## Rollback

Se l understanding strutturato introducesse regressioni, il runtime puo tornare a usare solo il resolver deterministico e forzare `draft_review`, senza cambiare i contratti DB o il flusso di approvazione umano.

## Test

- unit test su parser provider strutturato;
- unit test su merger `receptionist-conversation-state.ts`;
- test security su tenant validation e strip dei tool args;
- evaluation suite con 60 conversazioni realistiche;
- harness locale `pnpm demo:receptionist`.

## Osservabilita

- `inbox_ai_runs.input_context` conserva understanding strutturato e `receptionist_state`;
- `output_summary` conserva solo outcome operativi e advisory;
- la demo locale stampa risposta, stato e tool advisory a ogni turno senza side effect.

## Follow-up

1. Consolidare il lookup availability read-only gia collegato al conversation state con una futura fonte live di calendario.
2. Mantenere `prepare_booking_sandbox` advisory finche non esiste un execute path sandboxato e approvabile.
3. Allineare il contratto structured a un futuro servizio Symfony senza trascinare dipendenze Next.js.
