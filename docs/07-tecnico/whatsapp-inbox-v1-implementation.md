# WhatsApp Inbox v1 — Implementazione consigliata

## Obiettivo

Portare Styll da semplice PWA/booking a **sistema conversazionale multi-tenant** senza legare il dominio a un singolo provider o a una singola strategia AI.

La patch iniziale deve costruire:

- foundation database per inbox e transport;
- ownership chiara tra AI e umano;
- idempotenza per webhook e outbound;
- metering costi per tenant;
- contratti server-side per adapter/provider/policy.

## Principi

1. `Meta/BSP` è solo trasporto.
2. `Styll` possiede inbox, stato conversazione, booking, audit e policy.
3. L'AI non chiama mai tool generici e non scrive direttamente su DB.
4. Ogni tenant è risolto da `provider + phone_number_id`, mai da input del modello.
5. I worker server-side usano service role; il browser legge solo viste/tabelle sicure via RLS.

## Schema minimo v1

La migration foundation introduce queste aree:

- `tenant_integrations`
  Stato connessioni per-tenant verso Meta WhatsApp e altri provider futuri.
- `message_templates`
  Template cross-canale con stato provider.
- `messages_log`
  Audit storico di inbound/outbound e costi.
- `messaging_outbox`
  Coda operativa con retry, scheduling e idempotency key.
- `webhook_events_inbox`
  Inbox idempotente degli eventi provider.
- `tenant_usage_counters`
  Metering per messaggi e AI.
- `inbox_conversations`
  Stato conversazionale per tenant/contatto/canale.
- `inbox_messages`
  Timeline normalizzata per la UI operatore.
- `inbox_assignments`
  Presa in carico e handoff umano.
- `inbox_pending_confirmations`
  Conferme single-use per azioni modificative.
- `inbox_ai_runs`
  Audit dei run AI e del costo unitario.

## Rollout prodotto

### Fase 1

- webhook provider;
- normalizzazione inbound/outbound;
- risoluzione tenant;
- inbox umana read-only;
- invio manuale da dashboard via outbox.

### Fase 2

- assegnazione conversazioni;
- pausa AI;
- note operative;
- notifiche interne;
- stati `human_requested`, `human_active`, `ai_paused`.

### Fase 3

- `AI draft-only`;
- routing deterministico prima dell'LLM;
- audit `inbox_ai_runs`;
- feedback operatore su bozza corretta/errata.

### Fase 4

- FAQ automatiche e disponibilità read-only;
- tool `prepare_*` e `confirm_*`;
- pending confirmations;
- idempotency lato booking;
- analytics su conversione e fallimenti.

## Strategia costi API

Il costo basso non si ottiene cambiando solo modello, ma **riducendo il numero di chiamate AI**.

Regole consigliate:

1. Router deterministico prima dell'LLM per intent ricorrenti:
   `orari`, `indirizzo`, `listino`, `stato prenotazione`, `annulla`.
2. Nessun LLM per:
   reminder, template utility, echo umani, delivery/read status, retry outbox.
3. LLM piccolo solo per:
   richieste ambigue, bozza assistita, classificazione, preparazione transazioni.
4. Finestra budget per tenant:
   `remaining_budget_cents >= estimated_run_cost_cents`.
5. Context minimization:
   ultimi messaggi + summary corto + dati strutturati del tenant, mai cronologia completa.

## Struttura codice consigliata

```text
apps/web/src/lib/messaging/
  contracts.ts
  provider-adapter.ts
  policy.ts
  meta-whatsapp-adapter.ts
  orchestrator.ts
  outbox-worker.ts
  tenant-resolution.ts
```

## Passi successivi nel repo

1. Creare un endpoint `api/webhooks/meta-whatsapp`.
2. Implementare `MetaWhatsAppAdapter` con normalizzazione payload reali.
3. Costruire una pagina dashboard inbox per tenant.
4. Spostare la logica booking mutativa in un service condiviso riusabile da PWA, dashboard e inbox.
5. Aggiungere test end-to-end su:
   tenant isolation, webhook dedupe, pending confirmations, race su booking, pause AI.
