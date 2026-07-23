# Availability Read-Only e Sandbox Booking

- Data: 2026-07-20
- Stato: accepted

## Contesto

Dopo la milestone di structured understanding e conversation state, il receptionist era in grado di:

- capire intent e follow-up;
- mantenere continuita multi-turn;
- raccogliere slot mancanti;
- preparare booking advisory.

Mancava pero il tassello che rende la demo credibile: verificare disponibilita reali senza creare appuntamenti e senza introdurre nuova infrastruttura difficile da portare in Symfony.

## Decisione

Il runtime usa ora un gateway read-only puro:

- `AvailabilityGateway.findAvailableSlots(...)`
- `AvailabilityResult`

Il lookup availability resta separato dal provider AI e viene risolto dal codice applicativo dopo:

`transcript -> resolver deterministico -> understanding provider -> conversation state -> availability check -> decision engine`

Quando il booking ha:

- servizio validato;
- data normalizzata;
- orario normalizzato;

il runtime verifica la disponibilita in sola lettura e produce uno di questi esiti:

- `availability_available`
- `availability_unavailable`
- `availability_business_closed`
- `availability_missing_information`

Se e disponibile, il sistema prepara solo:

- `prepare_booking_sandbox`

con:

- `service`
- `requested_date`
- `requested_time`
- `selected_slot`
- `customer_name`
- `customer_notes`
- `conversation_summary`

## Motivazione

Questa scelta mantiene:

- nessuna scrittura DB per il booking;
- nessun auto-send;
- nessuna conferma finale al cliente;
- nessuna dipendenza da framework agentici o workflow engine;
- portabilita elevata verso Symfony, perche contratti e merger restano puri.

## Conseguenze

- `domani alle 16` puo restituire indisponibilita reale con proposte verificate;
- `domani alle 22` puo essere distinto da uno slot occupato e classificato come `business_closed`;
- follow-up come `16:30 va bene`, `la seconda va bene`, `l ultima` o `va bene quella` aggiornano lo stato senza richiedere di nuovo servizio o giorno;
- la demo locale puo mostrare transcript, stato, availability result, suggested slots e tool advisory per ogni turno.

## Sicurezza

- il modello non inventa slot, operatori, durate o disponibilita;
- tutte le disponibilita arrivano solo dal gateway;
- i tool args restano sanificati da `tenant_id` e flag di auto-send;
- nessun tool mutativo viene eseguito;
- i suggerimenti availability restano tenant-scoped.

## Multi-tenancy

- il gateway riceve sempre `tenantId` dal codice, mai dal modello;
- il servizio estratto dal modello viene ri-validato sul catalogo del tenant prima del lookup;
- le suite di regressione verificano che fixture e suggested slots non trapelino tra tenant.

## Portabilita

### Riutilizzabile in Symfony

- contratto `AvailabilityGateway`;
- `AvailabilityResult` e sua risoluzione pura;
- merger availability + conversation state;
- selezione dei suggested slots dal transcript;
- `prepare_booking_sandbox` advisory.

### Specifico del runtime attuale

- adapter `currentAvailabilityGateway` che riusa `getAvailableSlots`;
- persistenza di `availability` dentro `inbox_ai_runs.input_context`;
- demo CLI locale attuale.

## Rollback

Se il lookup availability introducesse regressioni, il runtime puo:

- saltare il check read-only;
- tornare a `availability_missing_information`;
- forzare `draft_review`;

senza cambiare contratti DB o workflow di approvazione umano.
