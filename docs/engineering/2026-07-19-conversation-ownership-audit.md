# State Machine Conversazione e Audit Ownership in `messages_log`

- Data: 2026-07-19
- Stato: accepted

## Contesto

L'Inbox WhatsApp richiede presa in carico umana, rilascio, ritorno all'AI e stato delivery persistito senza permettere update arbitrari di `inbox_conversations`.

Vincoli rilevati dal repository:

- lo schema foundation ha gia `status`, `ownership_mode`, `assigned_staff_id`, `ai_paused_at` e `inbox_assignments`;
- `inbox_messages` alimenta preview e timeline operatore;
- `messages_log` e gia la sorgente di verita per audit cross-canale e delivery status;
- non era desiderabile introdurre subito nuove tabelle o migrazioni additive solo per ownership audit.

## Decisione

Centralizzare tutte le mutazioni di ownership/stato conversazione in un service server-side con state machine esplicita e persistere l'audit ownership come eventi append-only in `messages_log` con `type = conversation_audit`.

Per gli eventi operativi correlati:

- le note interne tenant-scoped vengono persistite nello stesso `messages_log` con `type = internal_note` e metadati autore/visibilita;
- i `message echoes` umani del provider passano dalla stessa state machine tramite un attore sintetico di sistema e vengono persistiti in timeline come outbound umani;
- il realtime inbox non muta stato client-side dai payload del canale, ma ricarica dati autorizzati tramite query server-side tenant-scoped.

La timeline operatore legge:

1. `inbox_messages` per i messaggi normalizzati;
2. `messages_log` per delivery status persistito, audit ownership sintetico e note interne.

## Alternative considerate

1. Scrivere audit ownership direttamente in una nuova tabella dedicata.
2. Scrivere audit ownership come righe di `inbox_messages` di sistema.
3. Continuare con update diretti di `inbox_conversations` da route/UI senza state machine centrale.

## Motivazione

La soluzione scelta:

- evita una migration non indispensabile;
- mantiene `inbox_conversations` come snapshot mutabile e `messages_log` come audit append-only;
- rende visibili audit e note interne in timeline senza alterare `last_message_preview`;
- permette transizioni validate, idempotenza locale e race detection via conditional update;
- consente di riallineare ownership anche quando il messaggio umano nasce fuori dashboard;
- mantiene il realtime conservativo, evitando di fidarsi di payload raw lato browser;
- resta retrocompatibile con schema e query esistenti.

## Conseguenze

- le route di ownership non possono piu aggiornare `status` e `ownership_mode` arbitrariamente;
- `take_control`, `release_control`, `return_to_ai` e `human_reply` passano da un core puro testato;
- `human_message_echo` passa dallo stesso core e forza il passaggio controllato a `human_active`;
- la UI inbox puo ricaricare stato ownership e delivery dopo refresh senza dipendere dall'optimistic update;
- le note interne sono append-only, tenant-scoped e separate dai messaggi utente reali;
- il realtime inbox usa solo refetch autorizzati per conversazioni, timeline e cambi stato.

## Rischi

- gli audit ownership dipendono dal merge applicativo della timeline e non da una tabella dedicata/export nativo;
- il payload provider degli echo non identifica sempre lo specifico `staff_member`, quindi in assenza di un assegnatario gia noto la conversazione passa a ownership umana non assegnata;
- i test SQL/integration locali del nuovo flusso restano bloccati se Docker/Supabase locale non e disponibile.

## Sicurezza

- il tenant non arriva dal client: viene risolto dal contesto server-side e validato contro la conversazione;
- membership inattiva o cross-tenant resta bloccata prima di qualsiasi update;
- nessun secret o token provider viene esposto alla UI;
- il service usa update condizionati per mitigare race tra operatori.

## Multi-tenancy

- ogni lookup server-side applica `tenant_id`;
- `staff_members` viene risolto nel tenant della conversazione;
- note, audit e timeline usano query tenant-scoped su `messages_log` e `inbox_messages`;
- il realtime filtra i canali per `tenant_id` e rilegge i dati tramite server action gia tenant-scoped.

## Migrazione

Nessuna migration richiesta per questa decisione.

Si riusano:

- `inbox_conversations`
- `inbox_assignments`
- `messages_log`
- `inbox_messages`

## Rollback

Se la timeline sintetica da `messages_log` non risultasse sufficiente, si puo introdurre in seguito una tabella audit dedicata o un export specifico senza cambiare la state machine centrale.

## Test

- unit test del core `conversation-state` su happy path, transizioni vietate, ruoli non autorizzati, membership inattiva, cross-tenant e conflict;
- unit test query inbox su merge timeline, fallback status assente, note interne e filtri tenant;
- unit test del normalizer `smb_message_echoes` e del realtime helper tenant-scoped;
- suite `pnpm --filter web test:inbox:unit`;
- `pnpm test:security:unit`;
- `pnpm --filter web build`;
- `pnpm type-check`.

## Osservabilita

- ogni evento ownership scrive `actor`, `reason`, `from`, `to` e `timestamp` in `messages_log.metadata`;
- la timeline inbox rende questi eventi visibili come messaggi di sistema e mostra le note interne con autore;
- il delivery status outbound continua a essere letto da `messages_log`.

## Follow-up

1. Aggiungere test SQL/integration del nuovo flusso quando Supabase locale e disponibile.
2. Valutare un mapping piu forte tra `message echoes` provider e `staff_member` interno se il prodotto richiede attribution puntuale fuori dashboard.
3. Aggiungere test realtime end-to-end su riconnessione e duplicazione eventi.
