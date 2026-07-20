# DPA — Accordo sul Trattamento dei Dati
## Allegato 1 ai Termini di Servizio Styll
### Styll (Responsabile) ↔ Barbiere (Titolare)

**Data:** 15 luglio 2026
**Versione:** 1.1
**Base normativa:** Art. 28 GDPR, Linee guida EDPB 07/2020, Opinion EDPB 22/2024

> **⚠️ Nota:** Bozza da sottoporre a revisione legale professionale prima dell'attivazione con barbieri reali.

---

## Sezione 1 — Definizioni

| Termine | Definizione |
|---|---|
| **Titolare** | Il barbiere che accetta i ToS di Styll |
| **Responsabile** | Styll (Tommaso Vezzaro, privacy@styll.it) |
| **Interessati** | I clienti finali del barbiere |
| **Dati personali trattati** | Nome, telefono, email, storico appuntamenti, punti loyalty, preferenze, dati comportamentali |

---

## Sezione 2 — Oggetto e durata

Styll tratta i dati dei clienti finali del barbiere esclusivamente per erogare il servizio descritto nei ToS. La durata del presente accordo coincide con quella del contratto di servizio.

---

## Sezione 3 — Obblighi di Styll come Responsabile (Art. 28(3))

- **(a)** Trattare i dati solo su istruzione documentata del Titolare
- **(b)** Garantire la riservatezza del personale autorizzato
- **(c)** Adottare le misure di sicurezza ex Art. 32 GDPR (RLS, cifratura in transito, backup, accessi limitati)
- **(d)** Rispettare le condizioni per il subaffidamento (vedi Sezione 5)
- **(e)** Assistere il Titolare nel rispondere alle richieste degli interessati (accesso, rettifica, cancellazione, portabilità)
- **(f)** Assistere il Titolare negli obblighi di sicurezza e notifica data breach secondo il [runbook operativo data breach](data-breach-runbook.md), con prima comunicazione senza ingiustificato ritardo e aggiornamenti progressivi
- **(g)** Cancellare o restituire tutti i dati a fine rapporto
- **(h)** Fornire tutte le informazioni necessarie a dimostrare la conformità e consentire audit

---

## Sezione 4 — Obblighi del Titolare (il barbiere)

- **(a)** Fornire informativa adeguata ai propri clienti (Styll fornisce template Privacy Policy B2C)
- **(b)** Raccogliere i consensi necessari (marketing, profilazione)
- **(c)** Rispondere alle richieste degli interessati
- **(d)** Non istruire Styll a trattare dati in modo non conforme al GDPR

---

## Sezione 5 — Sub-responsabili

Styll si avvale dei seguenti sub-responsabili e fornitori operativi, allineati alle integrazioni attive del
servizio e alle funzioni opzionali o esplicite richiamate nei ToS e nella pagina pubblica `styll.it/sub-processor`:

| Fornitore | Servizio | Finalità | Ruolo | Localizzazione | Trasferimenti extra-SEE / garanzie | Stato |
|---|---|---|---|---|---|---|
| Supabase Inc. | Database, autenticazione, storage e servizi collegati alla piattaforma dati | Erogazione core della piattaforma, autenticazione, storage, consenso e audit trail | Sub-responsabile | Regione primaria EU (Irlanda); possibili sub-trattamenti extra-SEE dichiarati dal fornitore | Possibili trasferimenti extra-SEE secondo la documentazione del provider; riferimento a DPA/TIA del fornitore | Attivo |
| Vercel Inc. | Hosting, CDN e Vercel Analytics cookieless | Hosting e delivery del servizio; analytics cookieless solo sulle superfici che li attivano | Sub-responsabile | USA / infrastruttura globale | Trasferimenti extra-SEE possibili secondo l'infrastruttura globale del provider; documentazione contrattuale del fornitore, incluse SCC ove applicabili, e DPF ove dichiarato | Attivo (hosting) / condizionale (analytics opzionali) |
| Resend Inc. | Invio email transazionali e operative | Consegna email di verifica, onboarding, notifiche e comunicazioni di servizio | Sub-responsabile | USA | Trasferimenti extra-SEE possibili per l'invio e la consegna email; documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili | Attivo |
| Functional Software Inc. (Sentry) | Monitoraggio errori e diagnostica tecnica su superfici selezionate | Osservabilità applicativa, error tracking e replay su superfici supportate | Sub-responsabile | USA | Trasferimenti extra-SEE possibili verso l'infrastruttura del provider; SCC/DPF ove applicabili secondo la documentazione del fornitore | Condizionale (produzione; esclusa la PWA cliente) |
| PostHog Inc. | Analytics del sito marketing e lead attribution | Misurazione del sito marketing e attribuzione lead solo dopo opt-in analytics | Sub-responsabile | Endpoint EU configurato; fornitore extra-SEE | Possibili trasferimenti extra-SEE in base alla configurazione del workspace; documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili | Condizionale (solo dopo consenso analytics) |
| Anthropic PBC | Funzioni AI assistite per utenti autenticati (es. aiuto chat e magic wand) | Assistenza AI e generazione contenuti su input dell'utente autenticato | Sub-responsabile (AI provider) | USA | Trasferimenti extra-SEE possibili per prompt, contesto e output delle funzioni AI attivate; documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili | Condizionale (solo su richiesta esplicita) |

La lista aggiornata è disponibile su **styll.it/sub-processor**. Il Titolare sarà notificato con almeno **30 giorni di preavviso** in caso di aggiunta di nuovi sub-responsabili.

---

## Sezione 6 — Data breach

In caso di violazione dei dati personali che coinvolga dati trattati per conto del Titolare, Styll attiva il [runbook operativo data breach](data-breach-runbook.md), preserva le evidenze, adotta le misure di contenimento ragionevolmente disponibili e informa il Titolare **senza ingiustificato ritardo**, con una prima comunicazione appena raccolti gli elementi minimi utili. L'obiettivo operativo è mettere il Titolare in condizione di valutare gli obblighi ex Artt. 33-34 GDPR entro 72 ore dalla conoscenza della violazione.

---

## Sezione 7 — Fine del rapporto

Alla cessazione del contratto, Styll cancellerà tutti i dati del Titolare entro **30 giorni**, salvo obblighi di legge. Il Titolare può richiedere l'export completo dei dati prima della cancellazione (funzione già disponibile in dashboard).

---

## Sezione 8 — Accettazione

Questo Allegato è parte integrante dei Termini di Servizio Styll. L'accettazione dei ToS costituisce accettazione del presente DPA. Data e versione del DPA accettato vengono registrate per ogni barbiere al momento dell'onboarding.
