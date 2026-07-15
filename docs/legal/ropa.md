# ROPA — Registro delle Attività di Trattamento
## Art. 30 GDPR — Versione iniziale

**Data:** 15 luglio 2026
**Versione:** 1.1 (allineata ai provider attivi rilevati nel repository al 15 luglio 2026)

> **Nota:** Styll opera sia come **Titolare** (dati dei barbieri) sia come **Responsabile** (dati dei clienti finali).
>
> **Retention operativa:** i tempi di conservazione e i cleanup automatici/non automatici per singola tabella sono governati dalla [data retention matrix](data-retention-matrix.md). Le righe sotto restano la sintesi ROPA per finalità di trattamento, non il runbook tecnico di cancellazione.

---

## Sezione A — Styll come TITOLARE (dati dei barbieri)

| # | Trattamento | Dati | Base giuridica | Conservazione | Destinatari |
|---|---|---|---|---|---|
| 1 | Gestione account barbiere | Nome, email, telefono, dati aziendali | Art. 6(1)(b) esecuzione contratto | Durata contratto + 10 anni (obblighi fiscali) | Supabase, Vercel |
| 2 | Fatturazione e pagamenti *(futura integrazione Stripe)* | Dati di pagamento, fatture | Art. 6(1)(b) + Art. 6(1)(c) obbligo legale | 10 anni (Art. 2220 c.c.) | Stripe *(futuro)* |
| 3 | Comunicazioni di servizio (email transazionali) | Email, nome | Art. 6(1)(b) esecuzione contratto | Durata contratto | Resend |
| 4 | Error tracking e monitoring | Log tecnici (configurati per escludere PII) | Art. 6(1)(f) legittimo interesse | 90 giorni | Sentry |
| 5 | Gestione del consenso analytics opzionale sulle superfici web Styll | ID browser/host, superficie, stato scelta, versione testo, timestamp, IP/user agent se disponibili; eventuale cache locale nel browser usata solo come copia UI dell’ultima scelta confermata lato server | Art. 6(1)(a) consenso; Art. 7(1) prova del consenso | Finché la preferenza resta rilevante per quella superficie/host e per accountability, secondo la retention matrix | Supabase |

---

## Sezione B — Styll come RESPONSABILE (dati dei clienti finali)

> Il **Titolare** di questi trattamenti è il singolo barbiere. Styll tratta per suo conto come Responsabile ex Art. 28 GDPR.

| # | Trattamento | Dati | Base giuridica (del Titolare) | Conservazione | Sub-responsabili |
|---|---|---|---|---|---|
| 1 | Gestione prenotazioni e CRM | Nome, telefono, email, storico appuntamenti | Art. 6(1)(b) esecuzione contratto | Durata rapporto + obblighi fiscali barbiere | Supabase, Vercel |
| 2 | Programma loyalty e gamification | Punti, streak, badge, tier, transazioni | Art. 6(1)(b) esecuzione contratto | Durata rapporto cliente con il barbiere | Supabase, Vercel |
| 3 | Analisi frequenza visite — Silent Churn Detector | Date appuntamenti, frequenza calcolata, stato churn | Art. 6(1)(f) legittimo interesse (LIA: [docs/legal/lia-churn-detector.md](lia-churn-detector.md)) | Aggiornato in tempo reale; nessuno storico score | Supabase, Vercel |
| 4 | VIP Score | Frequenza, spesa, puntualità, punteggio composito | Art. 6(1)(f) legittimo interesse (LIA: [docs/legal/dpia-churn-vip.md](dpia-churn-vip.md)) | Ricalcolato periodicamente; nessuno storico score | Supabase, Vercel |
| 5 | Push notification e reminder | Endpoint dispositivo, subscription key | Art. 6(1)(a) consenso (raccolto via browser Notification API) | Fino a revoca consenso | Supabase |
| 6 | Comunicazioni marketing (opt-in) | Telefono o email, preferenza canale | Art. 6(1)(a) consenso esplicito (`marketing_consent = true`, opt-in separato) | Fino a revoca consenso | Supabase, Resend, futuro provider SMS |
| 7 | Site Analytics — navigazione PWA cliente | ID anonimo browser, URL visitati, user agent, eventi funnel (page_view, booking_started/completed, signup, login). `site_sessions.client_id` collega la sessione al cliente reale solo dopo identificazione volontaria (prenotazione o accesso) | Art. 6(1)(a) consenso per analytics opzionali; prova della scelta registrata in `analytics_consent_events`, con cache locale usata solo come supporto UI | Raw events 90 gg; rollup giornaliero indefinito (aggregato, non personale); prova del consenso governata dalla retention matrix | Supabase, Vercel |

> **Workflow diritti B2C:** la matrice operativa dei diritti (accesso, rettifica, cancellazione, limitazione, marketing, portabilità) è documentata in [b2c-data-subject-rights-matrix.md](b2c-data-subject-rights-matrix.md) e riflette il centro self-service PWA `/profilo/dati`.

## Sezione C — Inventario fornitori e trasferimenti rilevanti

| Fornitore | Servizio | Finalità operative coperte | Ruolo | Localizzazione | Trasferimenti extra-SEE | Garanzia di trasferimento | Stato |
|---|---|---|---|---|---|---|---|
| Supabase Inc. | Database, autenticazione, storage e servizi collegati alla piattaforma dati | Erogazione core della piattaforma, autenticazione, storage, consenso e audit trail | Sub-responsabile | Regione primaria EU (Irlanda); possibili sub-trattamenti extra-SEE dichiarati dal fornitore | Possibili trasferimenti extra-SEE secondo la documentazione del provider | DPA/TIA del fornitore; la regione EU riduce l'esposizione ma non esclude automaticamente trasferimenti extra-SEE | Attivo |
| Vercel Inc. | Hosting, CDN e Vercel Analytics cookieless | Hosting e delivery del servizio; analytics cookieless solo sulle superfici che li attivano | Sub-responsabile | USA / infrastruttura globale | Trasferimenti extra-SEE possibili secondo l'infrastruttura globale del provider | Documentazione contrattuale del fornitore, incluse SCC ove applicabili; DPF ove dichiarato dal provider | Attivo (hosting) / condizionale (analytics opzionali) |
| Resend Inc. | Invio email transazionali e operative | Consegna email di verifica, onboarding, notifiche e comunicazioni di servizio | Sub-responsabile | USA | Trasferimenti extra-SEE possibili per l'invio e la consegna email | Documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili | Attivo |
| Functional Software Inc. (Sentry) | Monitoraggio errori e diagnostica tecnica su superfici selezionate | Osservabilità applicativa, error tracking e replay su superfici supportate | Sub-responsabile | USA | Trasferimenti extra-SEE possibili verso l'infrastruttura del provider | SCC/DPF ove applicabili secondo la documentazione del fornitore | Condizionale (produzione; esclusa la PWA cliente) |
| PostHog Inc. | Analytics del sito marketing e lead attribution | Misurazione del sito marketing e attribuzione lead solo dopo opt-in analytics | Sub-responsabile | Endpoint EU configurato; fornitore extra-SEE | Possibili trasferimenti extra-SEE in base alla configurazione del workspace | Documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili in base alla configurazione del workspace | Condizionale (solo dopo consenso analytics) |
| Anthropic PBC | Funzioni AI assistite per utenti autenticati (es. aiuto chat e magic wand) | Assistenza AI e generazione contenuti su input dell'utente autenticato | Sub-responsabile (AI provider) | USA | Trasferimenti extra-SEE possibili per prompt, contesto e output delle funzioni AI attivate | Documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili alle funzionalità AI attivate | Condizionale (solo su richiesta esplicita) |
