# Inbound AI Receptionist Runtime

Documento tecnico del primo slice end-to-end inbound per l AI receptionist WhatsApp, implementato il 20 luglio 2026 senza auto-send e senza esecuzione di tool mutanti.

## Obiettivo del batch

Quando un vero messaggio WhatsApp inbound del cliente viene persistito con successo:

1. si carica il contesto receptionist tenant-scoped;
2. si invoca il provider AI configurato solo se le guardie conservative lo consentono;
3. si applica il Decision Engine deterministico;
4. si persistono run, decisione e audit minimo;
5. il risultato diventa visibile all operatore nella Inbox;
6. l esito resta sempre draft-first e human-reviewed.

Vincoli espliciti:

- nessun auto-send WhatsApp;
- nessuna esecuzione di tool mutanti;
- nessun bypass multi-tenant;
- nessuna dipendenza da event bus o workflow engine generici.

## Runtime flow

### 1. Webhook inbound reale

La route `apps/web/src/app/api/webhooks/meta-whatsapp/route.ts` continua a:

- verificare firma e idempotenza evento provider;
- risolvere il tenant da `phone_number_id`;
- persistere `inbox_conversations` e `inbox_messages`;
- rispondere al provider senza attendere l intero ciclo AI.

Solo dopo la persistenza del messaggio inbound, il webhook tenta `enqueueInboundInboxAiRun(...)`.

Se l enqueue fallisce:

- il messaggio cliente resta comunque persistito e visibile all operatore;
- il webhook non perde l acknowledge dell evento Meta;
- il fallimento AI viene loggato separatamente.

### 2. Queue bounded riusando `inbox_ai_runs`

Non viene introdotta una nuova infrastruttura di code.

La coda inbound usa `public.inbox_ai_runs` con:

- `status = queued`;
- `message_id` obbligatorio per i run inbound;
- metadati di provider/prompt salvati gia in enqueue;
- vincolo unico su `(message_id, mode)` per impedire doppie bozze sullo stesso inbound.

Il processamento avviene tramite:

- `apps/web/src/lib/ai/inbound-inbox-ai-runtime.ts`
- `apps/web/src/app/api/cron/inbox-ai-runtime/route.ts`

Il cron claim-a una riga `queued`, la porta a `started` e la processa una sola volta. Non esiste retry automatico infinito.

### 3. Guardie conservative prima del provider

Il runtime inbound verifica prima di invocare Claude:

- tenant AI disabilitata;
- conversazione gia sotto controllo umano;
- AI in pausa;
- provider non configurato;
- messaggio inbound non associato o contesto non caricabile.

In questi casi il run viene chiuso in stato terminale `blocked`, `failed` o `skipped` con `reason_code` esplicito, senza perdere il messaggio inbound.

### 4. Context builder tenant-scoped

Il contesto viene caricato da `prepareInboxDraftRequestSystem(...)` e include:

- profilo tenant;
- servizi attivi con prezzo stored o `null`;
- working hours;
- ultimi messaggi della conversazione;
- configurazione receptionist;
- FAQ personalizzate tenant-scoped.

Le query restano esplicitamente tenant-scoped e non si fidano mai di `tenant_id` client-side.

### 5. Provider structured understanding + knowledge deterministica

Claude resta il provider di language understanding e classificazione, ma l output strutturato non e piu limitato a `intent/confidence/handoff`.

Il provider restituisce ora:

- `draft`
- `reasoning`
- `understanding.intent`
- `understanding.confidence`
- `understanding.handoff`
- `understanding.entities.service`
- `understanding.entities.requestedDate`
- `understanding.entities.requestedTime`
- `understanding.entities.appointmentReference`
- `understanding.entities.customerName`
- `understanding.entities.customerNotes`
- `understanding.corrections`
- `understanding.citedSources`
- `understanding.requestedToolCalls`

Il parsing e rigoroso:

- enum chiusi;
- lunghezze bounded;
- date `YYYY-MM-DD`;
- orari `HH:MM`;
- malformed output chiuso in failure sicura.

Per gli intent low-risk supportati:

- `greeting`
- `pricing`
- `opening_hours`
- `faq` custom tenant

la risposta finale non puo prevalere sui dati autorevoli del tenant.

Il flusso effettivo e:

1. il provider produce draft preliminare e `understanding` strutturato;
2. `inbox-memory-resolver.ts` ricostruisce memoria e segnali deterministici dal transcript;
3. `receptionist-conversation-state.ts` mergea transcript e understanding in uno stato validato;
4. `inbox-deterministic-faq-resolver.ts` prova a risolvere le richieste informative con dati reali tenant-scoped;
5. il decision engine produce solo outcome advisory, mai esecuzione automatica.

### 6. Conversation state puro e portabile

Il contratto `ReceptionistConversationState` vive in un modulo puro, senza dipendenze da React, route Next.js o Supabase:

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

Questo stato viene ricostruito dal transcript e puo essere serializzato in `inbox_ai_runs.input_context`, ma non richiede una nuova infrastruttura di state management.

### 7. Slot filling e advisory tools

Per `booking`:

- `appointment_missing_service`
- `appointment_missing_date`
- `appointment_missing_time`
- `availability_available`
- `availability_unavailable`
- `availability_business_closed`
- `availability_missing_information`

Per `reschedule` e `cancel`:

- si raccolgono `appointmentReference`, nuova data e nuovo orario quando disponibili;
- si fa una sola domanda utile quando manca il dato minimo;
- si preparano solo tool advisory `prepare_reschedule` e `prepare_cancellation`.

Quando `booking` e completo e lo slot e stato verificato in read-only, il sistema prepara solo:

```json
{
  "name": "prepare_booking_sandbox",
  "arguments": {
    "service": "Taglio",
    "requested_date": "2026-07-21",
    "requested_time": "16:00",
    "selected_slot": "16:00",
    "customer_name": "Marco",
    "customer_notes": "Vorrei prenotare un taglio domani alle 16.",
    "conversation_summary": "Richiesta di prenotazione, servizio Taglio, giorno 2026-07-21, orario 16:00, cliente Marco"
  }
}
```

Il tool non viene eseguito e nessuna risposta dichiara mai una prenotazione confermata.

## FAQ autorevoli implementate

### Greeting

- usa `business_name` del tenant;
- usa `greetingStyle` se configurato;
- mantiene risposta corta e naturale.

### Pricing

- usa solo servizi attivi del tenant;
- include solo prezzi memorizzati;
- non inventa importi mancanti;
- fallisce in modo conservativo su servizio non trovato, ambiguo o senza prezzo.

### Opening hours

- usa `working_hours` e timezone del tenant;
- distingue giorni chiusi;
- non dichiara disponibilita live;
- chiarisce che gli orari non equivalgono a slot prenotabili.

### Custom FAQ tenant-scoped

Prima superficie supportata:

- `payment_methods`
- `parking`
- `late_arrival`
- `cancellation_policy`
- `accessibility`
- `location_instructions`

## Formato configurazione tenant

Le FAQ personalizzate vivono in `tenants.settings.ai_receptionist.custom_faqs`.

Formato supportato:

```json
{
  "ai_receptionist": {
    "mode": "supervised",
    "custom_faqs": [
      {
        "topic": "payment_methods",
        "answer": "Accettiamo contanti, bancomat e carte principali.",
        "enabled": true
      },
      {
        "topic": "parking",
        "answer": "Puoi usare il parcheggio coperto di Via Roma 12, a 2 minuti a piedi.",
        "enabled": true
      }
    ]
  }
}
```

Regole:

- `topic` deve appartenere alla lista tipizzata supportata;
- `answer` viene trim-mata e bounded;
- `enabled` defaulta a `true` se omesso;
- se la configurazione e mancante o invalida, il sistema usa default sicuri e non risponde inventando contenuti.

## Decisione, audit e Inbox

Ogni run inbound persiste almeno:

- `tenant_id`
- `conversation_id`
- `message_id`
- `provider_id`
- `prompt_id`
- `prompt_version`
- `intent`
- `confidence`
- `decision_kind`
- `reason_code`
- `understanding`
- `receptionist_state`
- `deterministic_resolver`
- `used_authoritative_knowledge`
- `cited_source_summary`
- `status`
- `error_category`

La Inbox operatore puo mostrare per l ultimo inbound:

- bozza generata;
- provider label;
- decision kind e reason;
- fonti sintetiche;
- badge di risposta deterministica;
- messaggio inbound associato.

Non vengono esposti:

- reasoning interno del modello;
- source ref grezzi;
- segreti o metadata nascosti del provider.

## Demo locale

Il batch include uno harness locale minimo in `scripts/receptionist-demo.ts`.

Comando:

```bash
pnpm demo:receptionist
```

La demo permette:

- selezione tenant fixture;
- invio di un messaggio per volta;
- visualizzazione del transcript completo;
- visualizzazione della risposta;
- visualizzazione di `receptionist_state`;
- visualizzazione di `availability_result`;
- visualizzazione degli `suggested_slots`;
- visualizzazione del tool advisory preparato;
- reset della conversazione.

Supporta:

- provider fake locale;
- gateway availability fake di default per la demo locale;
- Anthropic quando `INBOX_AI_PROVIDER=anthropic` e `ANTHROPIC_API_KEY` sono configurati.

## Idempotenza

Il sistema protegge dalle duplicazioni su piu livelli:

1. `webhook_events_inbox(provider, external_id)` deduplica l evento provider;
2. `inbox_messages.meta_message_id` continua a deduplicare il messaggio Meta;
3. `inbox_ai_runs(message_id, mode)` impedisce doppio processing AI per lo stesso inbound.

Conseguenze:

- duplicate delivery del webhook non creano doppie bozze;
- replay di un evento gia persistito non rompe l ack al provider;
- nessun retry automatico crea draft duplicati.

## Failure behaviour

Gestione conservativa implementata:

- `tenant_mode_disabled` -> run `blocked`, nessun provider call;
- `human_control_active` -> run `skipped`, nessun provider call;
- `ai_paused` -> run `skipped`, nessun provider call;
- provider non configurato -> run `failed` con `provider_not_configured`;
- timeout provider -> run `failed/blocked` auditato con `provider_timeout`;
- structured output malformato -> run `failed` con `provider_malformed_response`;
- deterministic resolver non risolto -> draft di review umana, mai allucinazione;
- persistenza finale fallita -> run `failed`, messaggio inbound comunque preservato;
- duplicate inbound delivery -> nessun nuovo run grazie ai vincoli di idempotenza.

Non e stato introdotto alcun loop di retry automatico che possa generare doppie bozze o doppie reply.

## Stato auto-send

Auto-send resta esplicitamente disabilitato.

Questo slice produce solo:

- classificazione;
- risoluzione deterministica dove autorevole;
- draft operatore;
- decisione auditabile;
- outcome sicuro per revisione umana.

L eventuale reply autonoma futura richiedera un batch separato con:

- metriche affidabili;
- audit approval/edit completi;
- controlli di rollout per tenant;
- osservabilita FAQ e kill switch operativo verificato.

## Portabilita verso Symfony

### Gia framework-agnostic

- resolver deterministico del transcript;
- contratto structured understanding;
- conversation state merger;
- decision engine advisory;
- slot filling e `prepare_*` advisory.

### Ancora specifico del runtime attuale

- webhook e cron route Next.js;
- persistenza e retrieval via `inbox_ai_runs`;
- surface Inbox e approval UI attuali.
