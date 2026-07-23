# WhatsApp AI Implementation Roadmap

Roadmap tecnica eseguibile per evolvere Styll verso una WhatsApp AI Receptionist verticale, partendo dal codice reale auditato il 19 luglio 2026. Questo documento traduce la visione di `styll-whatsapp-ai-receptionist-research-v2.md` in epiche e task implementabili.

Documenti collegati:

- [Product Engineering Manifesto](PRODUCT_ENGINEERING_MANIFESTO.md)
- [Autonomous Execution Playbook](AUTONOMOUS_EXECUTION_PLAYBOOK.md)
- [Definition of Done](DEFINITION_OF_DONE.md)
- [Decision Log Template](DECISION_LOG_TEMPLATE.md)
- [Conversation Memory e Slot Filling Deterministici](2026-07-20-conversation-memory-slot-filling.md)
- [Inbound AI Receptionist Runtime](2026-07-20-inbound-ai-receptionist-runtime.md)
- `docs/07-tecnico/whatsapp-inbox-v1-implementation.md`

## Legenda

- `Stato corrente`: presente nel codice o nella migration auditata
- `Target`: comportamento desiderato di prodotto/architettura
- `Proposta`: soluzione suggerita dal presente documento
- `Requisito esterno`: dipendenza da Meta, BSP, approvazioni legali o credenziali reali

Stati task:

- `done`
- `partial`
- `todo`
- `blocked`

Priorita:

- `P0`: blocca stabilita, sicurezza o progresso sostanziale
- `P1`: importante per passare di fase
- `P2`: utile ma non bloccante nell'immediato

## Stato corrente rilevato

### Foundation e schema

- `done` - migration `supabase/migrations/20260717093000_messaging_inbox_foundation.sql` introduce `tenant_integrations`, `message_templates`, `messages_log`, `messaging_outbox`, `webhook_events_inbox`, `inbox_conversations`, `inbox_messages`, `inbox_assignments`, `inbox_pending_confirmations`, `inbox_ai_runs`.
- `done` - RLS di lettura staff same-tenant per inbox, messages, templates, assignments, pending confirmations, AI runs.
- `done` - trigger DB per aggiornare preview, unread count e `last_message_at` su `inbox_conversations`, verificato da `apps/web/tests/integration/inbox-db.test.sql`.

### Webhook inbound e sicurezza provider

- `done` - route `apps/web/src/app/api/webhooks/meta-whatsapp/route.ts` con `GET` challenge e `POST` webhook.
- `done` - verifica firma Meta in `apps/web/src/lib/messaging/meta-whatsapp-signature.ts`.
- `done` - uso del raw body prima del parse JSON.
- `done` - normalizzazione payload Meta in `apps/web/src/lib/messaging/meta-whatsapp-adapter.ts`.
- `done` - deduplica eventi via unique constraint su `webhook_events_inbox(provider, external_id)` e gestione `23505` nel route handler.

### Tenant resolution e autorizzazioni

- `done` - risoluzione tenant da `phone_number_id` tramite `tenant_integrations.external_account_id`.
- `done` - role guard tenant-side in `apps/web/src/lib/tenant-role-guard.ts`.
- `done` - inbox read per ruoli `owner`, `manager`, `receptionist`, `staff`.
- `done` - binding Meta WhatsApp gestito lato admin in `apps/web/src/app/admin/tenants/[tenantId]/whatsapp/actions.ts`.

### Inbox, outbound e status

- `partial` - inbox UI esiste in area dashboard (`InboxConversazioni.tsx`) e in admin tenant WhatsApp page; manca stabilizzazione completa operatore.
- `partial` - reply manuale implementata in `apps/web/src/lib/messaging/manual-whatsapp-reply.ts` con draft su `messages_log` + `messaging_outbox`, invio diretto a Meta, persistenza coerente e nuovo worker locale per retry/reconciliation bounded.
- `partial` - outbound reale dipende da env `META_WHATSAPP_ACCESS_TOKEN` e `META_WHATSAPP_GRAPH_API_VERSION`; non esiste evidenza nel repo di E2E con account Meta reale.
- `done` - delivery status persistiti letti dalla timeline inbox via `messages_log`, con progressione monotona, fallback sicuro per storico privo di status e replay webhook idempotente coperto da test unitari.
- `partial` - retry worker server-side dell'outbox implementato localmente con cron route autenticata, retry bounded e reconciliation locale; restano da aggiungere prove integration/SQL e gestione esplicita di stale `processing`.
- `todo` - template enforcement per finestra 24 ore non implementato.
- `todo` - allegati outbound/inbound oltre il payload minimale non completati.

### Realtime, handoff e AI

- `partial` - inbox realtime tenant-scoped implementato via sottoscrizioni Supabase su `inbox_conversations`, `inbox_messages` e `messages_log`, con refetch server-side conservativo; restano da aggiungere test realtime end-to-end su reconnessione e doppio evento.
- `done` - state machine server-side centralizzata per `status`, `ownership_mode`, `assigned_staff_id` e `ai_paused_at`, con transizioni validate, audit append-only e route dedicate per la presa in carico.
- `partial` - esiste una policy conservativa in `apps/web/src/lib/messaging/policy.ts` per handoff, sensitive data, tool policy e dispatch AI.
- `done` - Inbox operatore mostra assegnatario, stato AI pausata, autore umano, note interne e controlli `take_control` / `release_control` / `return_to_ai`; i `message echoes` umani del provider riallineano ownership e pausa AI tramite la stessa state machine.
- `partial` - esistono contratti `draft-only`, tool registry tipizzato, prompt registry versionato e un runtime con persistenza `inbox_ai_runs`, provider selezionabile `fake|anthropic`, output strutturato nested `understanding`, decision engine deterministico e approval UI minima; dal 20 luglio 2026 il webhook inbound reale puo accodare un run AI idempotente per ogni messaggio WhatsApp persistito, con FAQ deterministiche tenant-scoped, memoria conversazionale ibrida (`resolver deterministico + understanding provider + merger puro`), planner appointment multi-turn (`service`, `requested_date`, `requested_time`), gestione `reschedule/cancel` advisory e `prepare_appointment` preparato solo in modalita advisory; il risultato e visibile in Inbox, un harness locale `pnpm demo:receptionist` consente la demo conversazionale e auto-send resta disabilitato; restano aperti feedback loop operatore persistiti, approval/send linking completo, disponibilita live e abilitazione di future reply autonome.

## Dipendenze esterne gia note

- `Requisito esterno` - credenziali Meta reali e webhook pubblico
- `Requisito esterno` - eventuale BSP / Solution Partner / Embedded Signup
- `Requisito esterno` - template approvati e regole finestra 24 ore
- `Requisito esterno` - conferme legali su disclosure, consenti e retention definitiva

## Epic 1 - Stabilizzazione Inbox

### Task 1.1 - Stabilizzare inbox operatore con stato delivery persistito

- Obiettivo: mostrare nella UI inbox lo stato reale `pending/sent/delivered/read/failed` per i messaggi outbound e renderlo coerente dopo refresh.
- Dipendenze: `messages_log`, `inbox_messages`, `message-delivery.ts`.
- Aree probabili: `apps/web/src/lib/messaging/inbox-queries.ts`, `apps/web/src/lib/actions/inbox.ts`, `apps/web/src/components/dashboard/marketing/tabs/InboxConversazioni.tsx`.
- Rischi: mismatch tra timeline inbox e `messages_log`; regressioni su timeline esistente.
- Test richiesti: unit test query mapping; test UI mirato; replay status webhook.
- Definition of done: la timeline carica stati delivery persistiti anche dopo reload e non solo da optimistic update.
- Priorita: `P0`
- Stato: `done`

Aggiornamento 2026-07-19:

- la query timeline mergea `inbox_messages` con `messages_log` per status delivery persistiti e audit sintetici;
- la UI inbox renderizza `pending`, `sent`, `delivered`, `read`, `failed` anche dopo refresh;
- i test coprono mapping DB -> UI, fallback su status assente e monotonicita degli update webhook.

### Task 1.2 - Realtime inbox e visual refresh coerente

- Obiettivo: aggiornare lista conversazioni e timeline senza refresh manuale.
- Dipendenze: schema inbox, policy RLS, pattern realtime gia presenti nel repo.
- Aree probabili: `InboxConversazioni.tsx`, helper realtime in Supabase client, eventuale route di sync.
- Rischi: leakage cross-tenant via channel errato; duplicati UI; race con optimistic reply.
- Test richiesti: cross-tenant realtime test, test di doppio evento, test di reconnessione.
- Definition of done: nuovi messaggi e status aggiornano conversazione e timeline senza ricaricare pagina e senza mostrare dati di tenant diversi.
- Priorita: `P0`
- Stato: `partial`

Aggiornamento 2026-07-20:

- `InboxConversazioni.tsx` apre un canale realtime tenant-scoped e ascolta `inbox_conversations`, `inbox_messages` e `messages_log`;
- gli eventi rilevanti ricaricano lista conversazioni e timeline tramite le query server-side esistenti, evitando merge client-side non autorizzati;
- helper dedicati limitano il refresh ai tipi `conversation_audit`, `internal_note` e `whatsapp_status`;
- restano da coprire con test integration/E2E la reconnessione, il doppio evento e la verifica realtime cross-tenant con Supabase locale.

### Task 1.3 - Retry e reconciliation outbound

- Obiettivo: spostare l'outbound da invio one-shot a processo robusto con retry, dead-letter e riconciliazione.
- Dipendenze: `messaging_outbox`, `messages_log`, webhook status, policy di idempotenza.
- Aree probabili: nuovo worker server-side, `apps/web/src/lib/messaging/`, cron o job route, tabelle outbox/dead-letter se gia presenti o da proporre senza migration distruttive.
- Rischi: doppio invio, inconsistenza tra Meta e DB, spam accidentale.
- Test richiesti: failure simulation, retry bounded, idempotency regression.
- Definition of done: un fallimento transiente non richiede intervento manuale immediato e non produce falsi successi.
- Priorita: `P0`
- Stato: `partial`

Aggiornamento 2026-07-20:

- `messaging_outbox` mantiene ora payload tipizzato, contesto attore e stato provider necessario alla riconciliazione locale;
- nuova route autenticata `api/cron/messaging-outbox` processa la coda con retry bounded, dead-letter locale e claim condizionale;
- i fallimenti di persistenza dopo un `send` provider accettato non reinviano il messaggio: il worker usa il `provider_result` salvato nel payload per riconciliare `inbox_messages`;
- restano da coprire test integration/SQL su stale `processing`, replay completo con Supabase locale e validazione end-to-end con provider reale.

### Task 1.4 - E2E outbound reale, error UX e fallback operatore

- Obiettivo: verificare un invio reale end-to-end e gestire errori utente in modo esplicito.
- Dipendenze: credenziali Meta reali, endpoint pubblico, tenant binding valido.
- Aree probabili: Playwright, route manual reply, UI inbox, admin binding page.
- Rischi: test non ripetibile localmente; rate limit provider; falsa fiducia senza account reale.
- Test richiesti: smoke E2E reale controllato, test locale mockato, error-path UI.
- Definition of done: esiste una prova documentata di invio reale e una UX chiara per configurazione mancante, provider error, persistenza fallita.
- Priorita: `P0`
- Stato: `blocked`

### Task 1.5 - Assegnazione, presa in carico, note interne, audit autore

- Obiettivo: completare la superficie umana minima prima di altra automazione.
- Dipendenze: `inbox_assignments`, `assigned_staff_id`, campi autore in `inbox_messages`.
- Aree probabili: dashboard inbox, service layer per assignment, eventuale nuova tabella note se non gia esistente o riuso controllato.
- Rischi: ownership ambigua, race umano/AI, audit incompleto.
- Test richiesti: authorization test per assignment, audit trail test, cross-tenant UI test.
- Definition of done: un operatore puo prendere in carico, lasciare note operative, rilasciare la conversazione e vedere l'autore dei messaggi umani.
- Priorita: `P0`
- Stato: `done`

Aggiornamento 2026-07-20:

- presa in carico, rilascio, ritorno all'AI e autore outbound umano sono implementati nella Inbox esistente;
- audit ownership e autore sono persistiti e visibili nella timeline;
- le note interne tenant-scoped vengono persistite in `messages_log` con `type = internal_note`, autore strutturato e visibilita `tenant_staff_only`;
- la UI offre composizione dedicata, loading/error state e rollback conservativo senza creare una seconda Inbox.

### Task 1.6 - Template fuori finestra 24 ore e allegati

- Obiettivo: impedire invii free-text fuori policy e gestire media in modo esplicito.
- Dipendenze: `message_templates`, campi `service_window_expires_at`, supporto media adapter.
- Aree probabili: policy engine, UI invio, adapter Meta, outbox payload.
- Rischi: violazione policy WhatsApp, UX confusa, storage/media incomplete.
- Test richiesti: service-window tests, template selection tests, media payload tests.
- Definition of done: fuori dalla finestra consentita l'operatore puo usare solo template validi; gli allegati sono trattati con path sicuro e auditabile.
- Priorita: `P1`
- Stato: `todo`

## Epic 2 - Human handoff e ownership

### Task 2.1 - State machine server-side della conversazione

- Obiettivo: rendere i cambi stato espliciti e validati lato server.
- Dipendenze: stati gia presenti in schema e contratti TypeScript.
- Aree probabili: `contracts.ts`, nuovo service `conversation-state`, route/actions inbox.
- Rischi: transizioni incoerenti, stati morti, race tra webhook e UI.
- Test richiesti: unit test su transizioni, regression test su transizioni vietate.
- Definition of done: nessuna route aggiorna `status` con stringhe arbitrarie; tutte passano da un service con guardie.
- Priorita: `P0`
- Stato: `done`

Aggiornamento 2026-07-19:

- nuovo core `conversation-state` con transizioni pure, idempotenza locale e race detection via conditional update;
- route `api/inbox/conversations/[conversationId]/ownership` centralizza le mutazioni di ownership;
- la manual reply sincronizza `HUMAN_ACTIVE` tramite lo stesso service server-side.

### Task 2.2 - Controlli operatore: AI paused, human assigned, take control, return to AI

- Obiettivo: dare all'operatore un controllo chiaro sul possesso della conversazione.
- Dipendenze: task 2.1, `ownership_mode`, `assigned_staff_id`, `ai_paused_at`.
- Aree probabili: UI inbox, server actions dedicate, audit events.
- Rischi: AI che risponde mentre l'umano sta scrivendo; ownership non persistita.
- Test richiesti: authorization, race tests, optimistic UI rollback.
- Definition of done: lo stato operativo e sempre visibile e modificabile solo da ruoli autorizzati.
- Priorita: `P0`
- Stato: `done`

Aggiornamento 2026-07-19:

- la Inbox esistente mostra assegnatario, stato AI pausata e controlli `Prendi in carico`, `Rilascia`, `Rimetti in AI`;
- i controlli usano optimistic update con rollback su errore;
- cross-tenant e membership inattiva restano bloccati dal service server-side e dai test del core.

### Task 2.3 - Message echoes e gestione race AI/human

- Obiettivo: trattare messaggi umani da app Business o altra superficie come eventi che bloccano immediatamente l'AI.
- Dipendenze: supporto provider a echoes, task 2.1 e 2.2.
- Aree probabili: adapter provider, webhook normalizer, policy engine, assignment logic.
- Rischi: doppia risposta, miss sync, mancato blocco AI.
- Test richiesti: replay test con echo, race test AI/human.
- Definition of done: un echo umano aggiorna ownership e impedisce output AI concorrente.
- Priorita: `P0`
- Stato: `done`

Aggiornamento 2026-07-20:

- l'adapter Meta normalizza `smb_message_echoes` come eventi outbound umani idempotenti;
- il webhook passa gli echo dalla stessa state machine server-side con azione `human_message_echo`, che porta la conversazione in `human_active`, forza `ownership_mode = human` e mette in pausa l'AI;
- la persistenza locale usa `messages_log` e `inbox_messages` con dedupe su `meta_message_id`, senza downgrade degli stati gia acquisiti;
- se l'assegnazione interna non e ricavabile dal payload provider, viene preservato l'assegnatario esistente oppure la conversazione resta human-owned non assegnata.

### Task 2.4 - Audit handoff e ownership

- Obiettivo: tracciare chi ha preso controllo, chi ha restituito ad AI e perche.
- Dipendenze: state machine, note interne, audit model.
- Aree probabili: `messages_log.metadata`, nuova audit table o reuse controllato, export admin.
- Rischi: accountability debole, post-mortem impossibili.
- Test richiesti: audit persistence tests, visibility tests.
- Definition of done: ogni passaggio di ownership e motivato, timestampato e attribuito.
- Priorita: `P1`
- Stato: `done`

Aggiornamento 2026-07-19:

- ogni mutazione ownership scrive un audit append-only in `messages_log` con `type = conversation_audit`;
- il payload audit conserva attore, motivo, stato/ownership da -> a, assignee e timestamp;
- la timeline inbox espone questi eventi come messaggi di sistema senza richiedere nuove tabelle.

## Epic 3 - AI draft-only

### Task 3.1 - Consolidare provider abstraction per AI e tool registry tipizzato

- Obiettivo: usare gli adapter esistenti come base per un layer AI tipizzato e sostituibile.
- Dipendenze: `contracts.ts`, `policy.ts`, futuro orchestratore.
- Aree probabili: `apps/web/src/lib/messaging/`, eventuale `apps/web/src/lib/ai/`.
- Rischi: lock-in provider, tool call non verificabili.
- Test richiesti: unit test su contracts, parsing e validation.
- Definition of done: esiste un confine netto fra LLM provider, prompt, tool registry e policy gate.
- Priorita: `P0`
- Stato: `done`

Aggiornamento 2026-07-20:

- aggiunto un contratto `AiDraftProvider` tipizzato in `apps/web/src/lib/ai/draft-provider.ts`;
- aggiunto `tool-registry.ts` con metadata esaustivi per `InboxToolName`, categorie, conferme richieste e allineamento automatico con il policy gate;
- aggiunto `prompt-registry.ts` per fissare prompt id/versione e istruzioni `draft-only` stabili;
- il confine tra provider abstraction, prompt, tool registry e policy gate e ora esplicito; resta da costruire solo l orchestratore runtime delle bozze.

### Task 3.2 - Prompt registry, context builder e knowledge tenant

- Obiettivo: costruire bozze usando contesto minimo e versionato.
- Dipendenze: task 3.1, policy data minimization.
- Aree probabili: nuovo registry prompt, service context builder, mapping dati tenant.
- Rischi: prompt drift, leakage PII, contesto eccessivo.
- Test richiesti: unit test su sanitizzazione contesto, fixture prompt versions.
- Definition of done: ogni bozza indica versione prompt e fonti dati usate.
- Priorita: `P0`
- Stato: `done`

Aggiornamento 2026-07-20:

- aggiunto `apps/web/src/lib/ai/prompt-registry.ts` con prompt versionato `whatsapp_inbox_draft_only@2026-07-20.v6`;
- aggiunto `apps/web/src/lib/ai/inbox-draft-context-core.ts` con sanitizzazione deterministica del transcript, redazione minima di email/telefono, finestra messaggi limitata e sezioni di contesto ordinate;
- aggiunto `apps/web/src/lib/ai/inbox-draft-context.ts` per caricare tenant profile, servizi, orari e messaggi recenti con guardia `requireInboxTenantContext` e query sempre tenant-scoped;
- il context builder include ora anche FAQ personalizzate tenant-scoped da `tenants.settings.ai_receptionist.custom_faqs`, con parsing tipizzato, default sicuri e source attribution dedicata;
- il contesto include ora una sezione esplicita `conversation_memory` con ultimo intent, intent appointment attivo, ultimo servizio/data/orario/riferimento appuntamento risolti, slot mancanti, prossima domanda utile e riassunto conversazione;
- il contesto include anche `receptionist_state` ricostruito dal transcript, cosi il provider riceve uno stato conversazionale gia validato e portabile;
- il prompt aggiornato impone tono receptionist umano, risposte brevi e naturali, una sola domanda di slot filling per volta, interpretazione dei follow-up nel contesto e divieto di richiedere di nuovo informazioni gia note;
- ogni richiesta draft-only preparata ora espone `promptId`, `promptVersion`, `systemPrompt`, `contextSections`, `allowedTools`, `sources`, `serviceCatalog` e `customFaqCatalog` tracciati per l attribution futura delle bozze;
- l audit successivo ha corretto un difetto reale del loader messaggi: il contesto ora legge la finestra piu recente in ordine deterministico (`created_at desc`, `id desc`) e usa gli stessi limiti del prompt registry per DB e costruzione pura;
- nessuna chiamata LLM reale e stata introdotta in questa fase.

### Task 3.3 - Draft response, sources e approval UI

- Obiettivo: generare solo bozze, mai invii automatici in questa fase.
- Dipendenze: task 3.2, inbox UI stabile.
- Aree probabili: inbox UI, `inbox_ai_runs`, query sources, approvazione operatore.
- Rischi: bozza scambiata per invio reale, fonti non visibili.
- Test richiesti: UI approval flow, no-send invariant tests.
- Definition of done: l'operatore vede bozza, fonti sintetiche e puo approvare/modificare/scartare.
- Priorita: `P0`
- Stato: `partial`

Aggiornamento 2026-07-20:

- aggiunto `inbox-draft-orchestrator-core.ts` come orchestratore esplicito della bozza: prepara il contesto, invoca un provider, valida la risposta, normalizza fonti/tool advisory e non invia mai messaggi;
- aggiunto `deterministic-fake-draft-provider.ts` come provider locale deterministico per test e harness offline, senza dipendenze esterne e senza esecuzione automatica dei tool richiesti;
- aggiunto `anthropic-draft-provider.ts` come primo provider reale via SDK ufficiale Anthropic, con selezione configurabile tramite env `INBOX_AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`, modello `claude-sonnet-5` e output JSON strutturato nested;
- aggiunto `apps/web/src/lib/ai/inbox-memory-resolver.ts` come resolver deterministico che estrae dal transcript ultimo intent, ultimo servizio, ultima data, ultimo orario, slot mancante e stato planner senza usare il modello;
- aggiunto `apps/web/src/lib/ai/receptionist-conversation-state.ts` come merger puro e framework-agnostic che combina transcript, resolver deterministico e understanding provider in uno stato conversazionale validato;
- il provider espone ora `understanding.intent`, `understanding.entities`, `understanding.corrections`, `understanding.citedSources` e `understanding.requestedToolCalls`, mentre il codice valida servizio, data, ora e riferimento appuntamento contro il contesto autorevole tenant-scoped;
- il planner appointment supporta ora `appointment_missing_service`, `appointment_missing_date`, `appointment_missing_time` e `appointment_complete`, mentre `reschedule` e `cancel` usano lo stesso stato conversazionale per raccolta progressiva dei chiarimenti;
- il decision engine usa memoria ibrida e stato conversazionale validato per non chiedere due volte gli stessi dati, fare una sola domanda utile per turno e preparare `prepare_appointment` solo quando `service`, `requested_date` e `requested_time` sono completi;
- `prepare_appointment` advisory riceve ora `service`, `requested_date`, `requested_time`, `customer_name`, `customer_notes` e `conversation_summary`, ma non viene eseguito automaticamente;
- `prepare_reschedule` e `prepare_cancellation` vengono preparati solo in modalita advisory, mai eseguiti;
- riusato `inbox_ai_runs` per audit/persistenza dei run `draft_only` con `status started/completed/failed`, `final_policy_decision`, `input_context` e `output_summary`, senza introdurre modelli paralleli;
- aggiunta route `api/inbox/conversations/[conversationId]/draft` e una prima approval surface nella Inbox esistente: genera bozza, mostra fonti sintetiche, consente edit locale, scarto e approvazione esplicita nel box di risposta manuale;
- il provider reale classifica ora `intent`, `handoff` e `confidence`, mantiene `requested_tools` solo advisory e non espone il reasoning interno agli operatori;
- la UI non espone `sourceRef` interni, non esegue tool, non invia messaggi automaticamente e riusa il path manual-send gia esistente solo dopo approvazione esplicita dell operatore;
- il runtime ora applica un decision engine deterministico che consuma `intent`, `confidence`, `handoff`, fonti citate, requested tools advisory, stato conversazione e config tenant-scoped senza delegare la decisione finale al modello;
- il risultato pubblico della bozza espone decisione, motivo, suggerimento handoff e completezza delle richieste appointment, cosi l operatore puo distinguere draft review, handoff consigliato, FAQ candidate e action prepare candidate senza auto-send;
- `inbox_ai_runs` registra ora anche esito decisionale, missing fields e `handoff_reason`, mentre la Inbox riusa la state machine esistente per accettare il suggerimento di handoff tramite `take_control`;
- aggiunto `apps/web/src/lib/ai/inbound-inbox-ai-runtime.ts` come entrypoint bounded per l inbound reale: il webhook Meta accoda un run solo dopo persistenza del messaggio, il cron `api/cron/inbox-ai-runtime` lo processa fuori dal path di ack e nessun auto-send viene mai eseguito;
- l idempotenza del runtime inbound usa il vincolo unico `inbox_ai_runs(message_id, mode)` lato DB oltre alla deduplica gia esistente del webhook, cosi duplicate delivery o replay non generano doppie bozze;
- la Inbox recupera ora l ultimo run inbound associato al messaggio, anche dopo refresh, con provider label, decision kind/reason, stato planner, prossima domanda utile, dati preparati e riferimento esplicito al messaggio cliente;
- aggiunto `scripts/receptionist-demo.ts` per provare localmente la conversazione completa con tenant fixture, stato conversazionale e tool advisory visibili turno per turno;
- restano aperti audit di discard/edit, collegamento esplicito `approval -> inbox_ai_run -> send manuale` e surface piu ricca per requested tools/feedback.

### Task 3.4 - Feedback loop, safety gate ed evaluation dataset

- Obiettivo: trasformare correzioni umane in segnali verificabili.
- Dipendenze: task 3.3, audit store.
- Aree probabili: `inbox_ai_runs`, dataset fixtures locali, harness di valutazione offline.
- Rischi: feedback non strutturato, impossibilita di misurare miglioramenti.
- Test richiesti: regression suite su dataset, safety scenarios, red-team prompts.
- Definition of done: esiste un dataset locale versionato e un modo ripetibile di misurare regressioni.
- Priorita: `P1`
- Stato: `partial`

Aggiornamento 2026-07-20:

- aggiunta una suite offline locale con 81 conversazioni realistiche complessive tra continuita receptionist e availability read-only per `greeting`, `pricing`, `opening_hours`, `booking`, `reschedule`, `cancel`, `faq`, `complaint`, `human_request`, `conversational_followup`, correzioni esplicite, follow-up contestuali, messaggi brevi, emoji, errori ortografici, dialetto leggero, prompt injection, slot disponibili, slot non disponibili, business closed, selezione della seconda/ultima proposta, timezone e multi-staff;
- i test di evaluation verificano memoria conversazionale, continuita multi-turn, slot filling, planner appointment, structured understanding validato, requested tools advisory, assenza di tool execution, assenza di auto-send e assenza di false conferme di prenotazione;
- aggiunti test mirati per `conversation_memory`, `receptionist-conversation-state`, follow-up contestuali come `domani`, `alle 16`, `16:30 va bene`, `la seconda va bene`, `l ultima` o `alle quattro`, availability result, business closed, completamento `prepare_booking_sandbox`, casi `reschedule/cancel` e regressioni del prompt `v6`;
- resta da collegare il dataset ai futuri feedback operatori persistiti e a metriche comparative tra provider/versioni prompt.

## Epic 4 - FAQ automatiche

### Task 4.1 - Deterministic FAQ engine per business info, servizi, prezzi, orari, policy

- Obiettivo: rispondere senza LLM alle richieste ripetitive piu comuni.
- Dipendenze: policy engine, dati tenant disponibili.
- Aree probabili: `policy.ts`, nuovo FAQ router, query read-only catalogo/orari.
- Rischi: risposte stale, routing fragile, confusione con prezzi/promozioni.
- Test richiesti: intent fixtures, cross-tenant data tests, policy tests.
- Definition of done: le FAQ definite vengono servite da logica deterministica con fallback chiaro.
- Priorita: `P0`
- Stato: `partial`

Aggiornamento 2026-07-20:

- aggiunto `apps/web/src/lib/ai/inbox-deterministic-faq-resolver.ts` per `greeting`, `pricing`, `opening_hours` e una prima superficie `faq` personalizzata del tenant;
- Claude resta usato per classificazione e language understanding, ma la risposta finale per questi intent viene sostituita da dati autorevoli tenant-scoped quando il resolver riesce;
- i prezzi usano solo servizi attivi del tenant, non inferiscono importi mancanti e falliscono in modo conservativo su servizio non trovato, ambiguo o senza prezzo configurato;
- gli orari usano `working_hours` e timezone del tenant, distinguono i giorni chiusi e dichiarano esplicitamente che non rappresentano disponibilita live di appuntamento;
- il resolver restituisce `resolved`, `answerText`, `supportingSources`, `reasonCode`, `missingInformation`, `ambiguousInformation` e `operatorNote`, cosi il decision engine puo produrre `draft_review` o handoff sicuri senza allucinazioni.

### Task 4.2 - Availability read-only e escalation automatica

- Obiettivo: dare disponibilita consultiva senza creare appuntamenti.
- Dipendenze: funzioni read-only calendario, guardie multi-tenant.
- Aree probabili: servizi calendario esistenti, adapter FAQ/inbox.
- Rischi: suggerire slot non piu disponibili, leak cross-location, timezone mismatch.
- Test richiesti: slot read-only tests, tenant isolation tests, timezone tests.
- Definition of done: il sistema propone solo disponibilita lette da fonte autorevole e scala a umano quando serve.
- Priorita: `P1`
- Stato: `partial`

Aggiornamento 2026-07-20:

- introdotto un contratto puro `AvailabilityGateway` con lookup typed e `AvailabilityResult` chiuso su `available`, `slot_unavailable`, `business_closed`, `service_unavailable`;
- aggiunti due adapter: `deterministicFakeAvailabilityGateway` per demo/test e `currentAvailabilityGateway` che riusa il runtime read-only esistente dei booking slots senza introdurre nuove pipeline;
- il decision engine distingue ora `availability_available`, `availability_unavailable`, `availability_business_closed` e `availability_missing_information`, mantenendo nessuna mutazione, nessun auto-send e nessun booking reale;
- le richieste complete di booking eseguono solo una verifica read-only e producono al massimo `prepare_booking_sandbox`, mai `confirm_appointment`;
- il runtime propone al massimo 3 slot reali ordinati cronologicamente e supporta follow-up contestuali come `16:30 va bene`, `la seconda va bene`, `l ultima` e `va bene quella` quando il contesto lo consente;
- `scripts/receptionist-demo.ts` mostra ora transcript, conversation state, availability result, suggested slots, prepared tool e draft a ogni turno, con gateway fake di default per la demo locale;
- restano fuori dallo scope il booking reale, l allocazione definitiva su calendario, la scrittura di appuntamenti e qualsiasi reply autonoma in produzione.

### Task 4.3 - Kill switch e configurazione per tenant

- Obiettivo: poter spegnere FAQ automatiche per tenant o globalmente.
- Dipendenze: config store, state machine o policy dispatch.
- Aree probabili: `tenants.settings` o config dedicata, UI impostazioni.
- Rischi: rollout incontrollato, support burden.
- Test richiesti: config precedence tests, tenant override tests.
- Definition of done: il comportamento automatico e attivabile/disattivabile senza deploy.
- Priorita: `P1`
- Stato: `partial`

Aggiornamento 2026-07-20:

- il kill switch operativo continua a usare `tenants.settings.ai_receptionist.mode`, gia rispettato sia nel runtime manuale sia nel nuovo runtime inbound;
- la stessa configurazione ospita ora `custom_faqs`, una lista compatta e tipizzata di topic/answer/enabled usata dal context builder e dal resolver deterministico senza introdurre un knowledge framework generico;
- manca ancora una surface admin dedicata per modificare queste FAQ senza agire direttamente sulla configurazione tenant esistente.

### Task 4.4 - Observability FAQ

- Obiettivo: sapere quante FAQ sono state servite, con esito e fallback.
- Dipendenze: task 4.1-4.3.
- Aree probabili: `inbox_ai_runs`, `messages_log`, analytics evento dedicato.
- Rischi: zero visibilita su errori e costi.
- Test richiesti: event logging tests, dashboard query tests.
- Definition of done: FAQ automatiche hanno metriche di volume, fallback, errore e costo.
- Priorita: `P2`
- Stato: `todo`

## Epic 5 - Booking assistito

### Task 5.1 - Tool tipizzati con separazione read/write

- Obiettivo: costruire tool di prenotazione sicuri senza usare query libere.
- Dipendenze: service condivisi booking, task 3.1.
- Aree probabili: `apps/web/src/lib/actions/create-booking.ts`, nuovi adapter tool, contratti typed.
- Rischi: modifiche non autorizzate, logica duplicata, side effect nascosti.
- Test richiesti: unit test tool contracts, authorization tests.
- Definition of done: ogni tool dichiara input/output tipizzato, tenant scope e natura read-only o mutativa.
- Priorita: `P0`
- Stato: `todo`

### Task 5.2 - Flusso prepare/confirm e pending confirmation single-use

- Obiettivo: nessuna azione mutativa deve eseguire direttamente al primo output AI.
- Dipendenze: `inbox_pending_confirmations`, state machine, task 5.1.
- Aree probabili: messaging services, booking services, UI conferma.
- Rischi: doppia conferma, token riusabili, conferme non scadute.
- Test richiesti: single-use tests, expiry tests, replay tests.
- Definition of done: ogni prenotazione, spostamento o cancellazione passa da `prepare_*` a `confirm_*` con conferma one-shot.
- Priorita: `P0`
- Stato: `partial`

### Task 5.3 - Slot locking, idempotency e concurrency tests

- Obiettivo: impedire doppie prenotazioni e successi allucinati.
- Dipendenze: task 5.2, booking core.
- Aree probabili: DB transaction boundaries, booking service, optimistic locking o unique constraint esistenti.
- Rischi: overbooking, race tra operatore e AI, race multi-tab.
- Test richiesti: concurrency tests, repeat confirm test, no-hallucinated-success tests.
- Definition of done: l'esito utente deriva solo dal risultato DB autorevole.
- Priorita: `P0`
- Stato: `todo`

### Task 5.4 - Reschedule, cancellation e failure compensation

- Obiettivo: completare i flussi mutativi con rollback o compensazione esplicita.
- Dipendenze: task 5.3.
- Aree probabili: booking services, notifications, messages_log/outbox.
- Rischi: stato appuntamento incoerente, messaggi inviati con esito errato.
- Test richiesti: failure path, rollback/compensation tests, audit tests.
- Definition of done: ogni fallimento lascia sistema e messaggistica in stato riconciliabile.
- Priorita: `P1`
- Stato: `todo`

## Epic 6 - AI receptionist controllata

### Task 6.1 - Intent routing e risk classification

- Obiettivo: decidere prima se rispondere deterministicamente, generare bozza, chiedere conferma o fare handoff.
- Dipendenze: epiche 2, 3, 4, 5.
- Aree probabili: `policy.ts`, orchestratore inbox, registry intent.
- Rischi: over-automation, costi inutili, rischio legale.
- Test richiesti: routing fixtures, high-risk scenarios, false positive/negative review.
- Definition of done: ogni messaggio inbound passa in una pipeline di classificazione esplicita.
- Priorita: `P0`
- Stato: `partial`

Aggiornamento 2026-07-20:

- introdotto `apps/web/src/lib/ai/inbox-draft-decision.ts` come layer deterministico esplicito sopra l output provider;
- il routing ora distingue `draft_review`, `human_handoff`, `auto_reply_candidate`, `action_prepare_candidate` e `blocked` usando codice applicativo tipizzato, non autorizzazioni delegate al modello;
- le regole conservative coprono `complaint`, `human_request`, `unknown`, bassa confidenza, fonti insufficienti, AI pausata e ownership umana;
- restano da collegare i futuri ingressi inbound automatici a questa pipeline prima di qualunque auto-reply reale.

### Task 6.2 - Automatic reply policy, cost quotas, fallback e handoff

- Obiettivo: limitare quando l'automazione puo parlare da sola.
- Dipendenze: task 6.1, config tenant, observability.
- Aree probabili: policy engine, tenant settings, analytics cost.
- Rischi: costi incontrollati, risposte in contesti non sicuri.
- Test richiesti: budget exhaustion tests, kill-switch tests, service-window tests.
- Definition of done: le reply automatiche si spengono o scalano a umano in modo prevedibile.
- Priorita: `P0`
- Stato: `partial`

Aggiornamento 2026-07-20:

- il decision engine applica gia gate espliciti per `auto_reply_candidate` solo su intent low-risk (`greeting`, `pricing`, `opening_hours`, `faq`) con soglia dedicata, fonti coerenti, nessun tool mutativo e nessun blocco ownership/AI pause;
- l handoff e sempre deterministico e spiegabile, con suggerimento UI e persistenza audit su `inbox_ai_runs`, ma senza trasferimenti silenziosi o reply automatiche;
- l automazione reale resta disabilitata: nessun invio WhatsApp automatico e nessuna esecuzione tool mutativa sono stati abilitati in questa fase;
- restano aperti kill-switch globale esplicito, quote/costi runtime e fallback sull orchestratore inbound prima di consentire `faq_auto`.

### Task 6.3 - Gradual rollout e configurazione per tenant

- Obiettivo: evitare rollout globale non governato.
- Dipendenze: task 6.2.
- Aree probabili: configurazione tenant, admin/superadmin control plane, audit.
- Rischi: tenant pilota e tenant normali trattati allo stesso modo.
- Test richiesti: config matrix tests, rollout gating tests.
- Definition of done: si puo abilitare per tenant, ambiente e fase funzionale.
- Priorita: `P1`
- Stato: `partial`

Aggiornamento 2026-07-20:

- riusato `tenants.settings.ai_receptionist` come superficie minima di rollout, senza nuove tabelle o framework settings dedicati;
- supportate modalita server-side `disabled`, `draft_only`, `supervised` e `autonomous_faq`, con default sicuro `draft_only`;
- supportate soglie tenant-scoped, allowed autonomous intents e primi input di personalizzazione (`preferred_tone`, `greeting_style`, `escalation_instructions`) consumati da context builder/prompt;
- resta aperta una surface amministrativa dedicata piu guidata rispetto all attuale editor JSON raw.

## Epic 7 - Compliance e governance

### Task 7.1 - AI disclosure, consenso, retention e privacy controls

- Obiettivo: rendere espliciti i controlli utente e operatore su automazione e dati.
- Dipendenze: docs legal esistenti, product copy, config retention.
- Aree probabili: UI inbox, impostazioni tenant, docs legal, schema se servono campi aggiuntivi non distruttivi.
- Rischi: violazioni policy, disclosure insufficiente, retention non difendibile.
- Test richiesti: copy review, privacy flow tests, retention policy tests se implementati.
- Definition of done: disclosure e controlli sono visibili, configurabili e coerenti con i documenti legal.
- Priorita: `P0`
- Stato: `todo`

### Task 7.2 - DPIA support, audit export e data deletion

- Obiettivo: supportare richieste privacy e audit senza lavoro manuale fragile.
- Dipendenze: audit data consistente, mapping dati WhatsApp/AI.
- Aree probabili: export admin, docs/legal, delete workflows.
- Rischi: export incompleto, cancellazioni parziali, impossibilita di rispondere a incidenti.
- Test richiesti: export fixtures, delete workflow tests, traceability tests.
- Definition of done: si puo estrarre audit e cancellare dati secondo policy senza query ad-hoc arbitrarie.
- Priorita: `P1`
- Stato: `todo`

### Task 7.3 - Incident runbook e documentazione subprocessor

- Obiettivo: collegare l'operativita WhatsApp AI ai runbook gia presenti.
- Dipendenze: partner/provider scelti, documentazione contrattuale.
- Aree probabili: `docs/legal/`, incident playbook, sub-processor page.
- Rischi: incident response incompleta, lock-in non documentato.
- Test richiesti: docs consistency review, tabletop exercise documentata.
- Definition of done: esiste runbook specifico per incidenti WhatsApp AI e lista subprocessor aggiornata.
- Priorita: `P2`
- Stato: `partial`

## Next autonomous batch

Questi task sono adatti a una lunga sessione autonoma senza sistemi esterni:

1. Rafforzare la suite SQL/integration su assignment state, note interne, audit visibility, realtime tenant isolation e worker `messaging_outbox`, quando Supabase locale e disponibile.
2. Completare `Task 3.3` con audit approval/discard/edit, collegamento esplicito della bozza approvata al send manuale e cron hardening del runtime `inbox-ai-runtime`.
3. Rafforzare `Task 3.4` collegando feedback operatore, scoring comparativo e replay delle bozze persistite al dataset offline.
4. Gestire recovery esplicito delle righe `messaging_outbox` stale in `processing` e aggiungere regression test dedicati.
5. Estendere `Task 4.1` con disponibilita consultiva read-only e osservabilita FAQ prima di qualunque enablement di reply autonome.

Task non adatti a batch autonomo non presidiato:

- deploy production
- migration distruttive
- invio campagne
- modifiche account Meta o BSP
- decisioni legali definitive
- gestione di credenziali reali

## Sequenza consigliata

Ordine pragmatico di esecuzione:

1. Epic 1
2. Epic 2
3. Epic 3
4. Epic 4
5. Epic 5
6. Epic 6
7. Epic 7

Ragione: senza inbox stabile, ownership chiara e audit, tutta l'automazione successiva resta fragile o rischiosa.
