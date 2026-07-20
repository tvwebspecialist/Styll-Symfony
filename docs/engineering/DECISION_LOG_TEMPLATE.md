# Decision Log Template

Template ADR leggero per decisioni tecniche operative. Usare quando una scelta modifica sicurezza, multi-tenancy, schema, integrazione provider, AI o flussi di prenotazione.

Documenti collegati:

- [AGENTS.md](../../AGENTS.md)
- [Product Engineering Manifesto](PRODUCT_ENGINEERING_MANIFESTO.md)
- [Autonomous Execution Playbook](AUTONOMOUS_EXECUTION_PLAYBOOK.md)
- [Definition of Done](DEFINITION_OF_DONE.md)

## Template

```md
# Titolo

- Data: YYYY-MM-DD
- Stato: proposed | accepted | rejected | superseded

## Contesto

Problema, vincoli, file coinvolti, evidenze dal repository e trigger della decisione.

## Decisione

Scelta presa in forma breve e verificabile.

## Alternative considerate

1. Alternativa A
2. Alternativa B
3. Alternativa C

## Motivazione

Perche la decisione e coerente con architettura esistente, sicurezza e roadmap.

## Conseguenze

Effetti attesi su codice, UX, operativita, costi o manutenzione.

## Rischi

Rischi residui, trade-off e dipendenze esterne.

## Sicurezza

Impatto su segreti, autenticazione, autorizzazione, PII, webhook o provider.

## Multi-tenancy

Come viene preservato l'isolamento tenant.

## Migrazione

Migrazioni richieste, compatibilita e backfill eventuale.

## Rollback

Come annullare o mitigare la decisione se fallisce.

## Test

Test richiesti per convalidare la decisione.

## Osservabilita

Log, metriche, audit trail, alert o dashboard necessari.

## Follow-up

Task successivi, proprietari e prerequisiti.
```

## Esempio breve

```md
# L'AI non scrive direttamente nel database

- Data: 2026-07-19
- Stato: accepted

## Contesto

Styll deve supportare automazione WhatsApp senza compromettere isolamento tenant, audit e correttezza delle prenotazioni.

## Decisione

L'AI non esegue query o scritture dirette. Usa solo tool tipizzati e passa sempre da un policy gate server-side.

## Alternative considerate

1. Dare al modello accesso SQL diretto.
2. Lasciare il modello comporre direttamente mutation applicative.
3. Usare solo suggerimenti manuali senza tool.

## Motivazione

I tool tipizzati preservano validazione, idempotenza, audit e controllo dei permessi. SQL arbitrario o mutation libere sono incompatibili con il modello multi-tenant del repository.

## Conseguenze

Serve piu lavoro iniziale su contratti, ma si riduce il rischio operativo e si migliora la testabilita.

## Rischi

Un registry tool incompleto rallenta le prime iterazioni AI.

## Sicurezza

Nessun secret o accesso DB diretto viene esposto al modello.

## Multi-tenancy

Il tenant viene risolto lato server; il modello non riceve autorita su `tenant_id`.

## Migrazione

Nessuna migration obbligatoria per adottare il principio; eventuali tabelle audit possono essere aggiunte dopo.

## Rollback

Se la soluzione draft-only non basta, si puo ampliare il numero di tool senza aprire accesso generico al DB.

## Test

Unit test sui tool, test cross-tenant, test di policy gate, test di esito DB autorevole.

## Osservabilita

Ogni tool call AI deve essere loggata in audit dedicato con esito e motivo di blocco eventuale.

## Follow-up

Implementare tool registry, state machine conversazione e evaluation harness locale.
```
