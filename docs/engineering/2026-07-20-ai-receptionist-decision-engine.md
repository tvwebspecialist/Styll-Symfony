# Decision Engine Deterministico per AI Receptionist

- Data: 2026-07-20
- Stato: accepted

## Contesto

La Inbox WhatsApp aveva gia:

- provider AI tipizzati (`fake` e Anthropic) con output strutturato;
- prompt/context builder tenant-scoped;
- tool registry e policy metadata;
- state machine ownership/handoff gia centralizzata;
- persistenza audit su `inbox_ai_runs`.

Mancava pero il livello esplicito che decidesse, in modo verificabile e senza delegare al modello, se una bozza dovesse restare sotto revisione umana, suggerire handoff, diventare candidata FAQ futura o preparare un azione di business senza eseguirla.

Vincoli della sessione:

- nessun auto-send WhatsApp;
- nessuna esecuzione automatica di tool;
- nessuna migrazione distruttiva;
- multi-tenancy, audit e ownership umana devono restare prioritari;
- l architettura AI esistente non doveva essere ridisegnata.

## Decisione

Introdurre un modulo esplicito `apps/web/src/lib/ai/inbox-draft-decision.ts` che consuma:

1. output provider gia normalizzato (`intent`, `confidence`, `handoff`, `requestedToolCalls`, fonti citate, draft);
2. stato conversazione tenant-scoped;
3. configurazione minima tenant-scoped in `tenants.settings.ai_receptionist`;
4. policy e metadata dei tool gia esistenti.

Il modulo restituisce una decisione tipizzata tra:

- `draft_review`
- `human_handoff`
- `auto_reply_candidate`
- `action_prepare_candidate`
- `blocked`

senza inviare messaggi e senza eseguire mutazioni.

## Alternative considerate

1. Lasciare il modello decidere direttamente handoff o auto-reply.
2. Introdurre un framework generico di rule engine o pipeline AI.
3. Bloccare tutto in `draft_review` senza classificazione esplicita.

## Motivazione

La scelta preserva il runtime corrente ma aggiunge:

- decisioni spiegabili e testabili;
- rollout graduale per tenant senza nuove tabelle;
- riuso della state machine ownership esistente per accettare l handoff;
- un percorso coerente verso FAQ automatiche e action preparation, senza abilitare automazioni premature.

## Conseguenze

- ogni run `draft_only` produce ora anche un esito deterministico e motivato;
- la UI Inbox puo mostrare handoff consigliato, candidate FAQ e completezza delle richieste appointment;
- `inbox_ai_runs` conserva il risultato decisionale in audit senza introdurre un modello parallelo.

## Rischi

- la completezza appointment e ancora euristica sul transcript recente e non usa lookup autorevoli di calendario/appuntamenti;
- l editor admin del tenant espone ancora `settings` come JSON raw e non una surface guidata;
- il retrieval delle bozze persistite dopo refresh resta un follow-up separato.

## Sicurezza

- nessun secret viene esposto al client;
- il tenant resta risolto server-side;
- la decisione finale non e delegata al provider;
- handoff e ownership restano espliciti e umani;
- tool mutativi e invii automatici restano disabilitati.

## Multi-tenancy

- la config receptionist riusa `tenants.settings` gia tenant-scoped;
- il context loader continua a leggere solo risorse filtrate per `tenant_id`;
- audit, handoff e ownership restano legati al tenant della conversazione.

## Migrazione

Nessuna migration richiesta.

Si riusano:

- `tenants.settings`
- `inbox_ai_runs`
- `inbox_conversations`
- tool registry e policy esistenti

## Rollback

Se il decision engine introducesse regressioni, puo essere bypassato tornando a forzare `draft_review` nel solo orchestratore, senza cambiare provider, schema o UI base di approvazione.

## Test

- unit test su parser config tenant-scoped;
- unit test su decision engine;
- evaluation suite offline con scenari greeting, pricing, opening hours, booking, reschedule, cancellation, complaint, low confidence, fonti invalide, denied tool, AI pausa e ownership umana;
- suite `pnpm --filter web test:inbox:unit`;
- `pnpm test:security:unit`;
- `pnpm --filter web type-check`;
- `pnpm --filter web build`.

## Osservabilita

- `inbox_ai_runs.input_context` conserva decisione, reason code, missing fields e config runtime rilevante;
- `handoff_reason` viene valorizzato quando il run suggerisce passaggio a umano;
- la UI mostra solo dati operativi sicuri, non reasoning interno o identificatori nascosti.

## Follow-up

1. Collegare la pipeline decisionale ai futuri ingressi inbound prima di qualsiasi auto-reply reale.
2. Recuperare le bozze persistite da `inbox_ai_runs` dopo refresh con audit approval/discard.
3. Sostituire le euristiche transcript-only con lookup autorevoli di disponibilita/appuntamenti quando Epic 5 sara pronta.
