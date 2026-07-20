# Retry e Reconciliation Outbound su `messaging_outbox`

- Data: 2026-07-20
- Stato: accepted

## Contesto

L'invio manuale WhatsApp usava gia `messages_log` e `messaging_outbox`, ma il flusso restava sostanzialmente one-shot:

- un errore provider o di persistenza locale lasciava l'operatore con recupero manuale;
- non esisteva un worker locale per bounded retry;
- un messaggio accettato da Meta ma non persistito in `inbox_messages` rischiava di essere reinviato invece che riconciliato.

Vincoli del repository:

- nessuna migration distruttiva;
- nessun invio automatico non verificabile;
- multi-tenancy e audit devono restare espliciti;
- il sistema non deve dichiarare successo se la persistenza locale non e coerente.

## Decisione

Riutilizzare `messaging_outbox` come coda unica locale per l'outbound manuale WhatsApp, senza nuove tabelle, introducendo:

1. payload outbox tipizzato con attore, testo, `phone_number_id` e, quando serve, `provider_result`;
2. cron route autenticata `api/cron/messaging-outbox`;
3. retry bounded nello stesso record (`pending` -> `processing` -> `sent` / `failed`);
4. dead-letter locale rappresentato da `status = failed` + metadata espliciti;
5. reconciliation locale che inserisce `inbox_messages` senza reinviare se il provider ha gia accettato il messaggio.

## Motivazione

Questa soluzione:

- evita una nuova tabella `dead_letter` non indispensabile;
- preserva l'outbox come fonte operativa unica;
- separa chiaramente fallimento di dispatch da fallimento di persistenza;
- impedisce falsi successi UI mantenendo comunque il recupero automatico;
- resta retrocompatibile con schema, trigger e query esistenti.

## Conseguenze

- le reply manuali salvano ora un payload outbox piu ricco e un primo tentativo gia conteggiato;
- `markDispatchFailure` puo rischedulare tentativi retryable invece di terminalizzare sempre;
- `markPersistenceFailure` conserva `provider_result` per riconciliare localmente senza doppio invio;
- `persistSentMessage` e idempotente rispetto a `meta_message_id`, cosi il worker puo recuperare senza creare duplicati.

## Sicurezza

- la route cron richiede `CRON_SECRET` via bearer token;
- i lookup server-side del worker restano tenant-scoped dove il tenant e noto;
- il payload outbox non introduce accesso diretto AI al database e resta sotto controllo server-side;
- le azioni ristrette continuano a passare dal policy gate, non dal worker.

## Multi-tenancy

- ogni riga `messaging_outbox` mantiene `tenant_id`;
- il worker processa e aggiorna righe tenant-scoped;
- la riconciliazione usa `tenant_id`, `conversation_id` e `meta_message_id` per evitare cross-tenant leakage.

## Rischi

- una riga rimasta `processing` per crash hard prima dei failure handler non ha ancora una recovery dedicata;
- senza Supabase locale attivo non sono ancora stati eseguiti test SQL/integration end-to-end del worker;
- la validazione reale con account Meta resta esterna al repository.

## Migrazione

Nessuna migration richiesta.

Si riusano:

- `messages_log`
- `messaging_outbox`
- `inbox_messages`
- `tenant_integrations`

## Test

- `tests/unit/manual-whatsapp-outbox-core.test.mjs`
- `tests/unit/messaging-outbox-route.test.mjs`
- `pnpm --filter web test:inbox:unit`
- `pnpm --filter web type-check`
- `pnpm --filter web build`

## Follow-up

1. Gestire recovery di righe stale in `processing`.
2. Aggiungere test SQL/integration con Supabase locale su retry, replay e reconciliation.
3. Validare il comportamento con webhook/provider reali quando le credenziali saranno disponibili.
