# Definition of Done

Checklist riusabili per feature e modifiche ad alto impatto nel repository Styll. Usare insieme a [AGENTS.md](../../AGENTS.md), al [Product Engineering Manifesto](PRODUCT_ENGINEERING_MANIFESTO.md), al [Playbook](AUTONOMOUS_EXECUTION_PLAYBOOK.md) e alla [Roadmap WhatsApp AI](WHATSAPP_AI_IMPLEMENTATION_ROADMAP.md).

## Feature generica

- [ ] Requisiti funzionali e non funzionali chiariti.
- [ ] Stato corrente, target e assunzioni documentati.
- [ ] UX coerente con la superficie esistente.
- [ ] Tipi TypeScript stretti, niente `any` nuovo non giustificato.
- [ ] Errori gestiti con messaggi utente e logging tecnico separati.
- [ ] Test aggiornati o aggiunti per happy path e error path.
- [ ] Accessibilita verificata per controlli, label, focus e feedback.
- [ ] Logging senza PII o secret non necessari.
- [ ] Documentazione aggiornata se cambia flusso, policy o comando operativo.
- [ ] Compatibilita retroattiva verificata o breaking change documentata.

## Endpoint multi-tenant

- [ ] Autenticazione richiesta dove previsto.
- [ ] Tenant risolto lato server, non fidato dal client.
- [ ] Ownership verificata su risorsa e attore.
- [ ] Ruolo e stato membership verificati (`is_active`, `deleted_at`, ruolo consentito).
- [ ] Input validation esplicita.
- [ ] Query con tenant scope anche se RLS e attiva.
- [ ] Uso di service role giustificato e confinato.
- [ ] Rate limit o mitigazione abuso valutata.
- [ ] Idempotenza prevista per richieste ripetibili o provider callback.
- [ ] Payload errore coerente e privo di leakage.
- [ ] Nessun secret in risposta, header o log.
- [ ] Test cross-tenant presenti.

## Migration Supabase

- [ ] Forward migration esplicita e leggibile.
- [ ] Backward compatibility valutata.
- [ ] Indici coerenti con query e cardinalita.
- [ ] Constraint applicati dove il dominio lo richiede.
- [ ] RLS rivista o aggiunta quando necessaria.
- [ ] Policy nominate in modo coerente e verificabile.
- [ ] Eventuale backfill documentato e sicuro.
- [ ] Dry-run locale eseguito.
- [ ] Strategia di rollback descritta.
- [ ] History migration coerente, senza edit distruttivi di file gia applicati.
- [ ] Test locale o query di verifica eseguiti.
- [ ] Nessuna modifica manuale produzione fuori dal flusso autorizzato.

## Webhook

- [ ] Challenge provider gestita, se richiesta.
- [ ] Firma verificata con raw body.
- [ ] JSON parse avviene solo dopo la verifica.
- [ ] Deduplica evento presente.
- [ ] Idempotenza di persistenza verificata.
- [ ] Retry o fallimento riconciliabile previsto.
- [ ] Outbox o equivalente usato per side effect asincroni, se rilevante.
- [ ] Logging utile senza esporre payload sensibili in eccesso.
- [ ] Status persistito in modo coerente.
- [ ] Replay test disponibile.

## AI feature

- [ ] Disclosure AI definita per la superficie utente.
- [ ] Prompt versioning presente.
- [ ] Contesto minimo e tenant-scoped.
- [ ] Isolamento tenant verificato anche nel context builder.
- [ ] Tool allowlist esplicita.
- [ ] Output strutturato e validato.
- [ ] Policy gate prima di ogni azione sensibile.
- [ ] Handoff umano disponibile.
- [ ] Audit di run, decisioni e fonti disponibile.
- [ ] Red-team o scenari avversariali coperti.
- [ ] Evaluation set o regression harness presente.
- [ ] Cost control o quota presente.
- [ ] Kill switch presente.

## Booking tool

- [ ] Separazione netta read/write.
- [ ] Flusso `prepare` / `confirm` usato per azioni mutative.
- [ ] Conferma single-use e scaduta correttamente.
- [ ] Concurrency gestita o testata.
- [ ] Idempotency key o equivalente disponibile.
- [ ] Esito comunicato solo da risultato DB autorevole.
- [ ] Rollback o compensazione definita.
- [ ] Nessun successo "allucinato" se provider o DB falliscono.
