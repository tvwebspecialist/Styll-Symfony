# ROPA — Registro delle Attività di Trattamento
## Art. 30 GDPR — Versione iniziale

**Data:** 3 luglio 2026
**Versione:** 1.0 (da aggiornare con dati reali post-lancio)

> **Nota:** Styll opera sia come **Titolare** (dati dei barbieri) sia come **Responsabile** (dati dei clienti finali).

---

## Sezione A — Styll come TITOLARE (dati dei barbieri)

| # | Trattamento | Dati | Base giuridica | Conservazione | Destinatari |
|---|---|---|---|---|---|
| 1 | Gestione account barbiere | Nome, email, telefono, dati aziendali | Art. 6(1)(b) esecuzione contratto | Durata contratto + 10 anni (obblighi fiscali) | Supabase, Vercel |
| 2 | Fatturazione e pagamenti *(futura integrazione Stripe)* | Dati di pagamento, fatture | Art. 6(1)(b) + Art. 6(1)(c) obbligo legale | 10 anni (Art. 2220 c.c.) | Stripe *(futuro)* |
| 3 | Comunicazioni di servizio (email transazionali) | Email, nome | Art. 6(1)(b) esecuzione contratto | Durata contratto | Resend |
| 4 | Error tracking e monitoring | Log tecnici (configurati per escludere PII) | Art. 6(1)(f) legittimo interesse | 90 giorni | Sentry |

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
| 7 | Site Analytics — navigazione PWA cliente | ID anonimo (localStorage), URL visitati, user agent, eventi funnel (page_view, booking_started/completed, signup, login). `site_sessions.client_id` collega la sessione al cliente reale solo dopo identificazione volontaria (prenotazione o accesso) | Art. 6(1)(f) legittimo interesse del barbiere (ottimizzazione della propria app) — stesso perimetro LIA del Silent Churn Detector | Raw events 90 gg; rollup giornaliero indefinito (aggregato, non personale) | Supabase, Vercel |
