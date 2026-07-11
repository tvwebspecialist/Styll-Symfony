# Data Retention Matrix — Styll

**Data:** 10 luglio 2026  
**Versione:** 1.0  
**Stato:** operativo

> Questa matrice traduce in policy eseguibile le retention GDPR del progetto Styll. Va letta insieme a [ROPA](ropa.md), [DPA Styll↔barbiere](dpa-barbieri.md), [Data Breach Runbook](data-breach-runbook.md), [Legal & Compliance](../08-strategia/legal-compliance.md) e [GDPR — approfondimento implementazione](../../gdpr-approfondimento-implementazione.md).

> **Regola di lettura**
> - **DELETE** = rimozione hard del record.
> - **ANONYMIZE** = rimozione/sostituzione dei campi personali, mantenendo solo il minimo necessario.
> - **ARCHIVE** = nessuna cancellazione automatica: il dato resta per obbligo legale, accountability o perché il prodotto non ha ancora una segregazione sufficiente per distruggerlo in sicurezza.
> - **Cleanup automatico = SI** significa che esiste già un job/evento operativo verificabile; **Implementato** indica se il comportamento è già completo, parziale o ancora assente.

---

## Tabelle con dati personali o identificatori persistenti

| Tabella | Contenuto | Dati personali | Base giuridica | Finalità | Retention | Evento di cancellazione | Metodo | Cleanup automatico | Implementato | Owner | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tenants` | Scheda tenant B2B | `business_name`, `slug`, branding, `dpa_*` | Art. 6(1)(b) contratto; Art. 28 GDPR per prova DPA | Gestione rapporto SaaS B2B | Durata contratto; poi segregazione/chiusura con conservazione dei dati necessari a DPA/fisco | Cessazione rapporto B2B | ARCHIVE | NO | PARZIALE | Product + Privacy + Finance | La tabella miscela dati operativi e prova contrattuale; non c’è ancora un workflow di offboarding completo. |
| `locations` | Sedi del tenant | `email`, `phone`, `address`, `city`, `zip_code` | Art. 6(1)(b) contratto | Pubblicazione e gestione sedi | Durata contratto o finché la sede è attiva | Rimozione sede / chiusura tenant | DELETE | NO | PARZIALE | Product Operations | Nessun purge globale: oggi la rimozione è gestita da azione applicativa. |
| `profiles` | Profili auth di staff, barbieri e clienti | `full_name`, `email`, `phone`, avatar, bio, preferenze | Art. 6(1)(b) contratto/account; Art. 6(1)(f) sicurezza account | Accesso, identità, preferenze | Finché l’account è attivo; dopo richiesta di cancellazione o chiusura rapporto si rimuovono i campi non necessari | `deleteAccount()` o offboarding B2B/B2C | ANONYMIZE | SI | PARZIALE | Identity + Privacy | Esiste già anonimizzazione parziale via `deleteAccount()`, ma manca un percorso completo di tenant offboarding. |
| `staff_members` | Membership staff/owner/manager | `profile_id`, bio, foto, ruolo, specializzazione | Art. 6(1)(b) contratto/rapporto di lavoro | Accessi e ruoli sul tenant | Durata del rapporto; dopo disattivazione resta soft delete finché serve per audit operativo | Rimozione membro team / chiusura tenant | ARCHIVE | SI | PARZIALE | Product Operations | Oggi la disattivazione usa `deleted_at`; nessun purge successivo schedulato. |
| `team_invitations` | Inviti staff via email | `email`, `token`, `created_by` | Art. 6(1)(b) precontrattuale/contratto | Onboarding team | 30 giorni dopo accettazione, scadenza o cancellazione | `accepted_at`, `expires_at`, `status=cancelled` | DELETE | SI | SI | Operations + Security | Cleanup schedulato dal job retention. |
| `onboarding_tokens` | Token admin per onboarding | `token`, `barbiere_email`, `used_by_email` | Art. 6(1)(b) precontrattuale | Accesso controllato all’onboarding | 30 giorni dopo uso o scadenza | `used_at` / `expires_at` | DELETE | SI | SI | Growth Ops + Security | Cleanup schedulato; i token sono artefatti temporanei e non devono restare indefinitamente. |
| `platform_leads` | Lead B2B marketing/sales | `email`, `phone`, `business_name`, `posthog_distinct_id`, `consent_*` | Art. 6(1)(f) lead management; Art. 6(1)(a) per marketing se raccolto | Trial/demo/contact funnel | Lead non convertiti: max 12 mesi dall’ultima interazione (`updated_at`); lead convertiti: anonimizzazione dopo 30 giorni dalla conversione | `updated_at`, `status`, `converted_tenant_id` | DELETE / ANONYMIZE | SI | SI | Growth + Privacy | La finalità lead termina alla conversione: il dato operativo vive poi in `tenants/profiles`. |
| `admin_audit_log` | Audit trail superadmin | `actor_id`, `tenant_id`, `details` | Art. 6(1)(f) sicurezza/accountability | Audit amministrativo e investigazioni | Nessuna cancellazione automatica finché non esiste una policy approvata separata | Review manuale policy | ARCHIVE | NO | SI | Security + Privacy | **Non** viene cancellato automaticamente per evitare perdita di accountability. |
| `platform_notifications` | Notifiche piattaforma interne | `related_profile_id`, testo e metadata | Art. 6(1)(f) sicurezza/ops | Centro notifiche admin | 180 giorni | `created_at` | DELETE | SI | SI | Platform Ops | Cleanup schedulato dal job retention. |
| `clients` | CRM clienti finali | nome, email, telefono, DOB, preferenze, marketing/profiling flags | Art. 6(1)(b) servizio; Art. 6(1)(a) marketing; Art. 6(1)(f) churn | CRM, prenotazioni, loyalty, marketing | Finché il rapporto col salone è attivo; dopo richiesta valida vanno rimossi o segregati i dati non coperti da obblighi legali | Cancellazione account / offboarding cliente / chiusura tenant | ANONYMIZE / DELETE | SI | PARZIALE | CRM + Privacy | Oggi esistono alcuni cleanup puntuali, ma non un workflow completo per tutti i casi di cessazione. |
| `client_notes` | Note interne staff sul cliente | testo note, `staff_id`, `client_id` | Art. 6(1)(f) CRM del titolare | Supporto al servizio e memoria operativa | Fino a rapporto attivo; da cancellare quando il profilo cliente viene chiuso o cancellato | Cancellazione account / erasure CRM | DELETE | SI | PARZIALE | CRM | `deleteAccount()` già elimina le note del cliente. |
| `appointments` | Storico appuntamenti | `client_id`, orari, `notes`, token conferma booking | Art. 6(1)(b) servizio; eccezione Art. 17(3)(b) se legato a obblighi contabili | Erogazione servizio, storico operativo, supporto fiscale | Durante il rapporto; dopo richiesta di cancellazione va conservato solo ciò che resta necessario per obblighi legali/fiscali | Erasure workflow / cessazione rapporto | ARCHIVE / ANONYMIZE | NO | PARZIALE | Product + Finance + Privacy | Oggi il prodotto conserva appuntamenti e relativi link fiscali in modo conservativo; manca separazione completa tra CRM e dati da conservare per legge. |
| `appointment_services` | Dettaglio servizi per appuntamento | riferimento a appuntamento e prezzi | Art. 6(1)(b) servizio | Ricostruzione prestazione e importi | Segue `appointments` | Stesso trigger di `appointments` | ARCHIVE / DELETE | NO | PARZIALE | Product + Finance | Tabella dipendente dall’appuntamento. |
| `appointment_products` | Prodotti venduti in appuntamento | riferimento a appuntamento e prezzi | Art. 6(1)(b) servizio | Vendita prodotti e consuntivo | Segue `appointments` | Stesso trigger di `appointments` | ARCHIVE / DELETE | NO | PARZIALE | Product + Finance | Tabella dipendente dall’appuntamento. |
| `payments` | Registrazioni pagamento | `client_id`, importi, metodo, note | Art. 6(1)(b) + Art. 6(1)(c) obbligo legale | Contabilità e riconciliazione | 10 anni per obblighi contabili/fiscali | Scadenza legale futura, non ancora automatizzata | ARCHIVE | NO | SI | Finance + Privacy | Nessun cleanup automatico introdotto: il repo non distingue ancora tutti i casi contabili da quelli solo CRM. |
| `client_product_wishlist` | Wishlist prodotti per cliente | `client_id`, `product_id` | Art. 6(1)(b) / 6(1)(f) esperienza PWA | Preferiti PWA | Finché il cliente li mantiene o finché il profilo è attivo | Rimozione preferito / cancellazione profilo cliente | DELETE | SI | PARZIALE | Product PWA | Delete event-driven già presente; nessun purge per account inattivi non ancora definito. |
| `client_loyalty` | Stato loyalty corrente | `client_id`, punti, tier, streak | Art. 6(1)(b) rapporto loyalty | Programma fedeltà | Fino a rapporto attivo; da rimuovere quando il programma/cliente termina salvo dati fiscalmente necessari altrove | Cancellazione account / chiusura rapporto | DELETE | SI | PARZIALE | Loyalty + Privacy | `deleteAccount()` elimina `client_loyalty`, ma non esiste ancora un workflow completo per tutti i casi di cessazione. |
| `loyalty_transactions` | Storico movimenti punti | `client_id`, `appointment_id`, descrizione | Art. 6(1)(b) loyalty; talvolta collegato a servizio acquistato | Audit loyalty e calcolo saldo | Segue il ciclo di vita cliente/appuntamento; attualmente conservato in modo prudenziale finché non c’è separazione certa dai dati fiscalmente rilevanti | Erasure workflow dedicato | ARCHIVE | NO | PARZIALE | Loyalty + Finance + Privacy | Nessuna cancellazione automatica introdotta per non eliminare dati che potrebbero servire a riconciliazioni o contestazioni. |
| `reward_redemptions` | Riscatti premi | `client_id`, punti, conferma staff | Art. 6(1)(b) loyalty | Storico premi riscattati | Segue il ciclo di vita loyalty/cliente; nessun purge automatico finché manca una policy approvata separata | Erasure workflow dedicato | ARCHIVE | NO | PARZIALE | Loyalty + Privacy | Tabella ancora conservata in modo prudenziale. |
| `client_analytics` | Snapshot churn/visite cliente | `client_id`, `last_visit_date`, `churn_status` | Art. 6(1)(f) Silent Churn | Analisi frequenza visite | Finché il cliente è attivo e non si oppone; da eliminare quando il cliente viene rimosso | Soft delete cliente / opposizione / delete account | DELETE | SI | PARZIALE | Analytics + Privacy | Il record viene già rimosso quando il client sparisce dal perimetro o tramite `deleteAccount()`, ma non c’è purge timer separato. |
| `client_badges` | Badge sbloccati dal cliente | `client_id`, `badge_id`, `unlocked_at` | Art. 6(1)(b) loyalty | Stato gamification | Segue `client_loyalty` / cliente | Cancellazione account / chiusura rapporto | DELETE | SI | PARZIALE | Loyalty | `deleteAccount()` già pulisce i badge. |
| `consent_events` | Storico append-only consensi/opposizioni | `client_id`, testo, IP, user agent, actor | Art. 7(1) GDPR; Art. 6(1)(f) accountability | Prova storica dei consensi | Nessuna cancellazione automatica mentre il rapporto e le esigenze di accountability sono attivi | Review privacy/legal hold | ARCHIVE | NO | SI | Privacy + Security | Fonte primaria di prova; protetta da guard append-only. |
| `analytics_consent_events` | Storico append-only delle scelte analytics/cookie per browser e host | `anonymous_id`, `host`, `surface`, `ip_address`, `user_agent`, versione testo, scelta | Art. 6(1)(a) consenso; Art. 7(1) GDPR per l’onere della prova | Dimostrare opt-in/opt-out analytics e governare il centro preferenze | Nessuna cancellazione automatica mentre serve la prova della scelta e la preferenza resta potenzialmente attiva per quel browser/host | Review privacy/legal hold | ARCHIVE | NO | SI | Privacy + Product Analytics | Non è la fonte dei dati analytics grezzi: prova solo la scelta effettuata. |
| `marketing_unsubscribe_tokens` | Token di unsubscribe email | `client_id`, `token_hash`, `expires_at` | Art. 6(1)(a) gestione revoca consenso | Revoca marketing senza login | Fino a scadenza del token | `expires_at` | DELETE | SI | SI | Marketing + Security | Cleanup schedulato. |
| `email_verification_tokens` | OTP email hashati | email, hash OTP, lockout | Art. 6(1)(b) sicurezza account | Verifica email / anti-abuso | 24 ore dopo uso o scadenza | `used=true` o `expires_at` | DELETE | SI | SI | Identity + Security | Cleanup schedulato; accesso solo service role. |
| `push_subscriptions` | Endpoint push per profilo | endpoint, chiavi web push, `profile_id`, `user_agent` | Art. 6(1)(b) notifiche di servizio; Art. 6(1)(a) se usate per marketing | Consegna push | Fino a unsubscribe, invalidazione endpoint o cancellazione account | DELETE API, 404/410 provider, `deleteAccount()` | DELETE | SI | PARZIALE | Messaging + Product PWA | Esiste cleanup event-driven, ma non ancora un purge per endpoint inattivi non revocati. |
| `notifications` | Centro notifiche in-app tenant/client | testo, titolo, `profile_id`, metadata | Art. 6(1)(b) servizio; Art. 6(1)(f) operatività | Inbox notifiche recenti | 180 giorni | `created_at` | DELETE | SI | SI | Product Ops | Cleanup schedulato dal job retention. |
| `notification_log` | Log idempotenza notifiche inviate | `profile_id`, `appointment_id`, `promotion_id`, `sent_at` | Art. 6(1)(f) sicurezza operativa | Evitare duplicati e troubleshooting breve | 90 giorni | `sent_at` | DELETE | SI | SI | Messaging Ops | Cleanup schedulato; oltre 90 giorni il log perde valore operativo. |
| `site_sessions` | Sessioni anonime/riconciliate analytics | `anonymous_id`, `client_id`, `user_agent`, `last_seen_at` | Art. 6(1)(f) analytics PWA/sito | Funnel analytics tenant | 90 giorni dall’ultima attività | `last_seen_at` | DELETE | SI | SI | Analytics | Cleanup schedulato; stessa finestra dei raw events. |
| `site_events` | Eventi analytics raw | `anonymous_id`, `session_id`, `referrer`, `page_*`, metadata | Art. 6(1)(f) analytics | Eventi grezzi per riconciliazione | 90 giorni | `occurred_at` | DELETE | SI | SI | Analytics | Cleanup già esistente, ora rientra nel job retention centralizzato. |
| `client_import_jobs` | Audit tecnico import clienti | `initiated_by`, `filename`, `errors` | Art. 6(1)(f) supporto import e troubleshooting | Diagnostica import CSV | 90 giorni | `created_at` | DELETE | SI | SI | CRM Ops | Cleanup schedulato; oltre 90 giorni gli errori non sono più necessari al troubleshooting ordinario. |

---

## Tabelle riviste ma fuori scope retention personale operativa

Queste tabelle sono state riesaminate durante F-15 ma non compaiono nella matrice sopra perché, allo stato attuale, non archiviano dati personali oppure conservano solo dati di catalogo/configurazione:

- `services`
- `products`
- `promotions`
- `promotion_services`
- `promotion_products`
- `subscription_plans`
- `tier_configs`
- `badges`
- `website_photos`
- `working_hours`
- `working_hour_overrides`
- `message_automations`
- `loyalty_configs`
- `staff_services`

> **Nota importante:** se in futuro una di queste tabelle inizierà a contenere dati riferibili a una persona fisica (es. note free-text, contatti, identificatori utente, token o telemetry personale), va aggiunta immediatamente a questa matrice.

---

## Automazioni operative attive

Le retention con automazione reale oggi dipendono da:

1. **Job SQL giornaliero** `run_data_retention_cleanup()`
2. **Event-driven cleanup** già presente nel codice:
   - `push_subscriptions` via unsubscribe esplicito, 404/410 provider e `deleteAccount()`
   - `client_notes`, `client_loyalty`, `client_analytics`, `client_badges` via `deleteAccount()`
3. **Vincoli di append-only**:
   - `consent_events` non è soggetta a cancellazione automatica e blocca update/delete diretti

---

## Gaps residui intenzionalmente NON automatizzati

Per non eliminare dati che potrebbero essere necessari per obblighi legali, contabili o accountability, questa versione **non** automatizza la cancellazione di:

- `payments`
- `admin_audit_log`
- `consent_events`
- `appointments` / `appointment_services` / `appointment_products`
- `loyalty_transactions`
- `reward_redemptions`

Per queste tabelle la matrice esplicita comunque:

- finalità;
- base giuridica;
- owner;
- trigger di revisione;
- motivo per cui l’automazione non è ancora lecita o abbastanza sicura.
