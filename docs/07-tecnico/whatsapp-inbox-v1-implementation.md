# WhatsApp Inbox v1 — Implementazione consigliata

> _Aggiornato: luglio 2026. L'inbox è implementata nel layer Next.js (`apps/web/`). Questo documento descrive l'architettura e i principi; i riferimenti a Supabase Realtime sono stati aggiornati per riflettere la migrazione a Symfony + Mercure SSE come backend alternativo futuro._

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
5. I worker server-side usano service role; il browser legge solo viste/tabelle sicure via isolamento tenant (TenantFilter lato Symfony; RLS sul layer Next.js/Supabase esistente).

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

### Env server-side per reply manuale

Per l'invio manuale WhatsApp dalla Inbox servono variabili solo server-side:

- `META_WHATSAPP_ACCESS_TOKEN`
  Access token usato dal route handler server-side per chiamare la WhatsApp Cloud API.
- `META_WHATSAPP_GRAPH_API_VERSION`
  Versione Graph API usata per l'endpoint `/PHONE_NUMBER_ID/messages`.
- `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  Token per la challenge del webhook.
- `META_APP_SECRET`
  Secret usato per verificare la firma `x-hub-signature-256`.

Note operative minime:

1. `PHONE_NUMBER_ID` non arriva mai dal client: viene risolto lato server dalla conversazione e dalla binding `tenant_integrations`.
2. Il browser non riceve mai l'access token Meta.
3. Se Meta accetta il messaggio ma il salvataggio DB fallisce, il server restituisce errore esplicito e marca l'outbox come `failed` senza fingere successo.

### Fase 2

- assegnazione conversazioni;
- pausa AI;
- note operative;
- notifiche interne;
- stati `human_requested`, `human_active`, `ai_paused`.

### Stato locale al 20 luglio 2026

Nel repository attuale la fase 2 è stata portata avanti con queste scelte implementate localmente:

- state machine server-side centralizzata per `inbox_conversations.status`, `ownership_mode`, `assigned_staff_id` e `ai_paused_at`;
- route dedicata `api/inbox/conversations/[conversationId]/ownership` per `take_control`, `release_control` e `return_to_ai`;
- transizione automatica a `human_active` quando una reply manuale umana viene persistita con successo;
- audit append-only in `messages_log` con `type = conversation_audit`, payload strutturato `from -> to`, attore, motivo e timestamp;
- timeline inbox che mergea `inbox_messages` con gli eventi audit e legge il delivery status persistito da `messages_log`;
- fallback sicuro per messaggi outbound storici privi di status persistito: la UI degrada a `sent`.

Con questa base restano aperti:

- suite SQL/integration locale per ownership, note interne e race webhook/operatori;
- test realtime end-to-end su tenant isolation, doppio evento e reconnessione (Mercure SSE nella futura architettura Symfony; Supabase Realtime nel layer Next.js attuale);
- enforcement template fuori finestra e validazione integration del worker outbox.

Aggiornamento locale 2026-07-20:

- le note interne operative tenant-scoped sono implementate nella Inbox esistente e riusano `messages_log` con `type = internal_note`, autore strutturato e visibilità `tenant_staff_only`;
- i `message echoes` umani del provider vengono normalizzati dal webhook Meta, persistiti in timeline e instradati nella stessa state machine che forza `human_active` e pausa l'AI;
- la Inbox apre sottoscrizioni realtime tenant-scoped su `inbox_conversations`, `inbox_messages` e `messages_log`, con refetch server-side conservativo dei dati autorizzati;
- l'outbound manuale usa ora un worker locale su `messaging_outbox` con route cron autenticata, retry bounded e riconciliazione senza doppio invio quando il provider ha già accettato il messaggio;
- esistono un contratto `AiDraftProvider`, un tool registry tipizzato e un prompt registry versionato per la fase `draft-only`, usati sia da un provider fake deterministico sia da un provider Anthropic reale configurabile;
- il loader `prepareInboxDraftRequest` costruisce richieste bozza tenant-scoped con `promptId`, `promptVersion`, fonti tracciate, servizi, orari e transcript recenti minimizzati e sanificati;
- la bozza `draft-only` passa da un orchestratore esplicito che seleziona il provider via env (`INBOX_AI_PROVIDER=fake|anthropic`), persiste il run in `inbox_ai_runs` e restituisce solo testo bozza + fonti sintetiche senza eseguire tool o inviare messaggi;
- il provider Anthropic usa l'SDK ufficiale con `claude-sonnet-4-6`, output strutturato (`draft`, `intent`, `confidence`, `handoff`, `requested_tools`, `cited_sources`) e reasoning interno non esposto agli operatori;
- la Inbox mostra una card di approvazione minima che permette di generare, modificare, scartare e copiare la bozza nel composer manuale esistente, senza auto-send e senza esporre `sourceRef` interni;
- esiste una suite offline di evaluation locale con scenari rappresentativi di receptionist (`booking`, `pricing`, `orari`, `reschedule`, `cancellation`, `complaint`, greeting, informazioni mancanti e messaggi poco chiari);
- sopra l'output provider gira un decision engine deterministico che decide fra `draft_review`, `human_handoff`, `auto_reply_candidate`, `action_prepare_candidate` e `blocked` usando solo codice applicativo tipizzato, fonti tracciate, stato conversazione e policy esistenti;
- l'handoff resta esplicito e umano: la bozza espone motivo e suggerimento, ma l'operatore deve usare il controllo esistente di `take_control`; nessun passaggio di ownership avviene in silenzio;
- le richieste appointment (`booking`, `reschedule`, `cancellation`) vengono valutate con completezza deterministica lato applicazione: campi completi, campi mancanti, prossima domanda consigliata ed eleggibilità del `prepare_*` vengono calcolati senza eseguire alcuna mutazione;
- la personalizzazione tenant-scoped del receptionist riusa `tenants.settings.ai_receptionist` con default sicuri: `mode = draft_only`, soglie conservative, allowed autonomous intents e input di tono (`preferred_tone`, `greeting_style`, `escalation_instructions`).

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

1. Router deterministico prima dell'LLM per intent ricorrenti: `orari`, `indirizzo`, `listino`, `stato prenotazione`, `annulla`.
2. Nessun LLM per: reminder, template utility, delivery/read status, note interne, retry outbox.
3. LLM piccolo solo per: richieste ambigue, bozza assistita, classificazione, preparazione transazioni.
4. Finestra budget per tenant: `remaining_budget_cents >= estimated_run_cost_cents`.
5. Context minimization: ultimi messaggi + summary corto + dati strutturati del tenant, mai cronologia completa.

## Modalità receptionist AI

- `disabled`: il runtime genera esito `blocked`; nessuna bozza dovrebbe essere usata operativamente finché il tenant non riabilita il receptionist.
- `draft_only`: default attuale. L'AI può solo produrre una bozza da revisionare e non può promuovere la risposta oltre `draft_review`.
- `supervised`: il decision engine può etichettare una bozza come `auto_reply_candidate` o `action_prepare_candidate`, ma non viene comunque inviato alcun messaggio automatico e nessun tool viene eseguito.
- `autonomous_faq`: modalità preparatoria per il rollout futuro delle FAQ automatiche. In questo repository rimane solo una classificazione potenziale: l'invio automatico resta disabilitato.

Regole operative attuali:

- nessun messaggio WhatsApp viene inviato automaticamente;
- nessun tool richiesto dal provider viene eseguito automaticamente;
- `confidence` da sola non autorizza nulla;
- ownership umana e `ai_paused_at` bloccano ogni promozione oltre la revisione/handoff;
- fonti mancanti o incoerenti forzano handoff umano.

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
5. Aggiungere test end-to-end su: tenant isolation, webhook dedupe, pending confirmations, race su booking, pause AI.
