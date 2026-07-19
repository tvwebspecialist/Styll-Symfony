# WhatsApp AI Implementation Roadmap

Roadmap tecnica eseguibile per evolvere Styll verso una WhatsApp AI Receptionist verticale, partendo dal codice reale auditato il 19 luglio 2026. Questo documento traduce la visione di `styll-whatsapp-ai-receptionist-research-v2.md` in epiche e task implementabili.

Documenti collegati:

- [Product Engineering Manifesto](PRODUCT_ENGINEERING_MANIFESTO.md)
- [Autonomous Execution Playbook](AUTONOMOUS_EXECUTION_PLAYBOOK.md)
- [Definition of Done](DEFINITION_OF_DONE.md)
- [Decision Log Template](DECISION_LOG_TEMPLATE.md)
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
- `partial` - reply manuale implementata in `apps/web/src/lib/messaging/manual-whatsapp-reply.ts` con draft su `messages_log` + `messaging_outbox`, invio diretto a Meta e persistenza coerente.
- `partial` - outbound reale dipende da env `META_WHATSAPP_ACCESS_TOKEN` e `META_WHATSAPP_GRAPH_API_VERSION`; non esiste evidenza nel repo di E2E con account Meta reale.
- `partial` - delivery status gestiti in `message-delivery.ts` e dal webhook status; la UI inbox non legge ancora uno stato delivery persistito per tutta la timeline.
- `todo` - retry worker server-side dell'outbox non implementato.
- `todo` - template enforcement per finestra 24 ore non implementato.
- `todo` - allegati outbound/inbound oltre il payload minimale non completati.

### Realtime, handoff e AI

- `todo` - nessuna sottoscrizione realtime inbox dedicata rilevata; realtime esiste altrove nel repo ma non nell'inbox WhatsApp.
- `partial` - esistono stati conversazione e `ownership_mode` nello schema e nei contratti TypeScript.
- `partial` - esiste una policy conservativa in `apps/web/src/lib/messaging/policy.ts` per handoff, sensitive data, tool policy e dispatch AI.
- `todo` - nessun orchestratore AI draft-only, nessun prompt registry, nessun provider LLM astratto per inbox, nessuna UI di approvazione bozza.

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
- Stato: `todo`

### Task 1.2 - Realtime inbox e visual refresh coerente

- Obiettivo: aggiornare lista conversazioni e timeline senza refresh manuale.
- Dipendenze: schema inbox, policy RLS, pattern realtime gia presenti nel repo.
- Aree probabili: `InboxConversazioni.tsx`, helper realtime in Supabase client, eventuale route di sync.
- Rischi: leakage cross-tenant via channel errato; duplicati UI; race con optimistic reply.
- Test richiesti: cross-tenant realtime test, test di doppio evento, test di reconnessione.
- Definition of done: nuovi messaggi e status aggiornano conversazione e timeline senza ricaricare pagina e senza mostrare dati di tenant diversi.
- Priorita: `P0`
- Stato: `todo`

### Task 1.3 - Retry e reconciliation outbound

- Obiettivo: spostare l'outbound da invio one-shot a processo robusto con retry, dead-letter e riconciliazione.
- Dipendenze: `messaging_outbox`, `messages_log`, webhook status, policy di idempotenza.
- Aree probabili: nuovo worker server-side, `apps/web/src/lib/messaging/`, cron o job route, tabelle outbox/dead-letter se gia presenti o da proporre senza migration distruttive.
- Rischi: doppio invio, inconsistenza tra Meta e DB, spam accidentale.
- Test richiesti: failure simulation, retry bounded, idempotency regression.
- Definition of done: un fallimento transiente non richiede intervento manuale immediato e non produce falsi successi.
- Priorita: `P0`
- Stato: `todo`

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
- Stato: `partial`

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
- Stato: `todo`

### Task 2.2 - Controlli operatore: AI paused, human assigned, take control, return to AI

- Obiettivo: dare all'operatore un controllo chiaro sul possesso della conversazione.
- Dipendenze: task 2.1, `ownership_mode`, `assigned_staff_id`, `ai_paused_at`.
- Aree probabili: UI inbox, server actions dedicate, audit events.
- Rischi: AI che risponde mentre l'umano sta scrivendo; ownership non persistita.
- Test richiesti: authorization, race tests, optimistic UI rollback.
- Definition of done: lo stato operativo e sempre visibile e modificabile solo da ruoli autorizzati.
- Priorita: `P0`
- Stato: `todo`

### Task 2.3 - Message echoes e gestione race AI/human

- Obiettivo: trattare messaggi umani da app Business o altra superficie come eventi che bloccano immediatamente l'AI.
- Dipendenze: supporto provider a echoes, task 2.1 e 2.2.
- Aree probabili: adapter provider, webhook normalizer, policy engine, assignment logic.
- Rischi: doppia risposta, miss sync, mancato blocco AI.
- Test richiesti: replay test con echo, race test AI/human.
- Definition of done: un echo umano aggiorna ownership e impedisce output AI concorrente.
- Priorita: `P0`
- Stato: `todo`

### Task 2.4 - Audit handoff e ownership

- Obiettivo: tracciare chi ha preso controllo, chi ha restituito ad AI e perche.
- Dipendenze: state machine, note interne, audit model.
- Aree probabili: `messages_log.metadata`, nuova audit table o reuse controllato, export admin.
- Rischi: accountability debole, post-mortem impossibili.
- Test richiesti: audit persistence tests, visibility tests.
- Definition of done: ogni passaggio di ownership e motivato, timestampato e attribuito.
- Priorita: `P1`
- Stato: `todo`

## Epic 3 - AI draft-only

### Task 3.1 - Consolidare provider abstraction per AI e tool registry tipizzato

- Obiettivo: usare gli adapter esistenti come base per un layer AI tipizzato e sostituibile.
- Dipendenze: `contracts.ts`, `policy.ts`, futuro orchestratore.
- Aree probabili: `apps/web/src/lib/messaging/`, eventuale `apps/web/src/lib/ai/`.
- Rischi: lock-in provider, tool call non verificabili.
- Test richiesti: unit test su contracts, parsing e validation.
- Definition of done: esiste un confine netto fra LLM provider, prompt, tool registry e policy gate.
- Priorita: `P0`
- Stato: `partial`

### Task 3.2 - Prompt registry, context builder e knowledge tenant

- Obiettivo: costruire bozze usando contesto minimo e versionato.
- Dipendenze: task 3.1, policy data minimization.
- Aree probabili: nuovo registry prompt, service context builder, mapping dati tenant.
- Rischi: prompt drift, leakage PII, contesto eccessivo.
- Test richiesti: unit test su sanitizzazione contesto, fixture prompt versions.
- Definition of done: ogni bozza indica versione prompt e fonti dati usate.
- Priorita: `P0`
- Stato: `todo`

### Task 3.3 - Draft response, sources e approval UI

- Obiettivo: generare solo bozze, mai invii automatici in questa fase.
- Dipendenze: task 3.2, inbox UI stabile.
- Aree probabili: inbox UI, `inbox_ai_runs`, query sources, approvazione operatore.
- Rischi: bozza scambiata per invio reale, fonti non visibili.
- Test richiesti: UI approval flow, no-send invariant tests.
- Definition of done: l'operatore vede bozza, fonti sintetiche e puo approvare/modificare/scartare.
- Priorita: `P0`
- Stato: `todo`

### Task 3.4 - Feedback loop, safety gate ed evaluation dataset

- Obiettivo: trasformare correzioni umane in segnali verificabili.
- Dipendenze: task 3.3, audit store.
- Aree probabili: `inbox_ai_runs`, dataset fixtures locali, harness di valutazione offline.
- Rischi: feedback non strutturato, impossibilita di misurare miglioramenti.
- Test richiesti: regression suite su dataset, safety scenarios, red-team prompts.
- Definition of done: esiste un dataset locale versionato e un modo ripetibile di misurare regressioni.
- Priorita: `P1`
- Stato: `todo`

## Epic 4 - FAQ automatiche

### Task 4.1 - Deterministic FAQ engine per business info, servizi, prezzi, orari, policy

- Obiettivo: rispondere senza LLM alle richieste ripetitive piu comuni.
- Dipendenze: policy engine, dati tenant disponibili.
- Aree probabili: `policy.ts`, nuovo FAQ router, query read-only catalogo/orari.
- Rischi: risposte stale, routing fragile, confusione con prezzi/promozioni.
- Test richiesti: intent fixtures, cross-tenant data tests, policy tests.
- Definition of done: le FAQ definite vengono servite da logica deterministica con fallback chiaro.
- Priorita: `P0`
- Stato: `todo`

### Task 4.2 - Availability read-only e escalation automatica

- Obiettivo: dare disponibilita consultiva senza creare appuntamenti.
- Dipendenze: funzioni read-only calendario, guardie multi-tenant.
- Aree probabili: servizi calendario esistenti, adapter FAQ/inbox.
- Rischi: suggerire slot non piu disponibili, leak cross-location, timezone mismatch.
- Test richiesti: slot read-only tests, tenant isolation tests, timezone tests.
- Definition of done: il sistema propone solo disponibilita lette da fonte autorevole e scala a umano quando serve.
- Priorita: `P1`
- Stato: `todo`

### Task 4.3 - Kill switch e configurazione per tenant

- Obiettivo: poter spegnere FAQ automatiche per tenant o globalmente.
- Dipendenze: config store, state machine o policy dispatch.
- Aree probabili: `tenants.settings` o config dedicata, UI impostazioni.
- Rischi: rollout incontrollato, support burden.
- Test richiesti: config precedence tests, tenant override tests.
- Definition of done: il comportamento automatico e attivabile/disattivabile senza deploy.
- Priorita: `P1`
- Stato: `todo`

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
- Stato: `todo`

### Task 6.2 - Automatic reply policy, cost quotas, fallback e handoff

- Obiettivo: limitare quando l'automazione puo parlare da sola.
- Dipendenze: task 6.1, config tenant, observability.
- Aree probabili: policy engine, tenant settings, analytics cost.
- Rischi: costi incontrollati, risposte in contesti non sicuri.
- Test richiesti: budget exhaustion tests, kill-switch tests, service-window tests.
- Definition of done: le reply automatiche si spengono o scalano a umano in modo prevedibile.
- Priorita: `P0`
- Stato: `todo`

### Task 6.3 - Gradual rollout e configurazione per tenant

- Obiettivo: evitare rollout globale non governato.
- Dipendenze: task 6.2.
- Aree probabili: configurazione tenant, admin/superadmin control plane, audit.
- Rischi: tenant pilota e tenant normali trattati allo stesso modo.
- Test richiesti: config matrix tests, rollout gating tests.
- Definition of done: si puo abilitare per tenant, ambiente e fase funzionale.
- Priorita: `P1`
- Stato: `todo`

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

1. Implementare un service server-side di state machine conversazione che centralizzi `status` e `ownership_mode`.
2. Estendere query/UI inbox per leggere lo stato delivery persistito dai `messages_log`.
3. Aggiungere assegnazione e presa in carico con test di autorizzazione e cross-tenant.
4. Aggiungere note interne e audit minimo autore/azione senza introdurre SQL arbitrario o integrazioni esterne.
5. Consolidare `contracts.ts`, `policy.ts` e un registry tipizzato per tool AI draft-only.
6. Costruire un evaluation harness locale con fixture e dataset per draft-only, senza chiamate LLM reali.
7. Aggiungere sottoscrizione realtime inbox scoped per tenant con test di isolamento.
8. Rafforzare la suite SQL/unit per dedupe, race e idempotenza booking-adjacent.

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
