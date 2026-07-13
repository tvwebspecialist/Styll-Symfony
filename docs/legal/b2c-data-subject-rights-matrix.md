# B2C Data Subject Rights Matrix — F-08

**Data:** 13 luglio 2026  
**Versione:** 1.0  
**Scope:** clienti finali (B2C) autenticati nella PWA del singolo tenant

> Questa matrice descrive il workflow reale dei diritti GDPR lato cliente finale nella PWA Styll. Va letta insieme a [ROPA](ropa.md), [data retention matrix](data-retention-matrix.md) e alla privacy policy tenant pubblicata su `/tenant/app/[slug]/privacy`.

## 1. Categorie di dati personali censite dal codice

| Categoria | Tabelle / sorgenti principali | Note |
|---|---|---|
| Profilo e contatti | `profiles`, `clients`, storage `avatars` | nome, email, telefono, avatar, DOB, canale preferito, preferenze contatto |
| Appuntamenti e storico servizio | `appointments`, `appointment_services`, `appointment_products` | include note appuntamento e riferimenti a staff/sede |
| Pagamenti | `payments` | importi, metodo, note, stato |
| Loyalty e gamification | `client_loyalty`, `loyalty_transactions`, `reward_redemptions`, `client_badges` | punti, streak, premi, riscatti, badge |
| Preferiti / wishlist | `client_product_wishlist` | collegata ai prodotti del tenant |
| Consensi e opposizioni | `clients.marketing_consent`, `clients.churn_profiling_objected_at`, `consent_events` | fonte di verità append-only per marketing/churn |
| Notifiche e push | `profiles.notification_preferences`, `notifications`, `notification_log`, `push_subscriptions` | cronologia notifiche e subscription browser |
| Analytics collegati al cliente | `site_sessions`, `site_events`, `analytics_consent_events` | solo sessioni del tenant corrente collegate volontariamente al cliente |
| Analytics churn | `client_analytics` | snapshot frequenza visite / churn |
| Note interne staff | `client_notes` | dato personale sul cliente, ma **non esposto in self-service** |
| Audit richieste privacy | `client_privacy_requests` | log dedicato di export, rettifiche, cancellazioni e richieste manuali |

## 2. Matrice unica dei diritti

| Diritto | Stato | Workflow reale | Note |
|---|---|---|---|
| Accesso | **Supportato** | Export JSON self-service tenant-scoped + richiesta manuale “accesso esteso” per dati non auto-esportabili | Le `client_notes` restano fuori dal download automatico e richiedono review del Titolare |
| Rettifica | **Supportato** | Pagina PWA `/profilo/modifica` con update profilo e audit `rectification` | Aggiorna solo il tenant corrente lato `clients`; il profilo globale viene aggiornato in modo compatibile |
| Cancellazione | **Supportato** | Endpoint/PWA self-service con conferma, cleanup selettivo, anonimizzazione record cliente, logout | Rimuove dati cancellabili del tenant corrente; non tocca altri tenant |
| Limitazione | **Parzialmente supportato** | Preferenze self-service per marketing / churn / analytics / push + richiesta manuale tracciata “restriction” | I dati che restano per obblighi legali/accountability non possono essere congelati oltre la sola conservazione |
| Opposizione al marketing | **Supportato** | Toggle marketing in-app + unsubscribe email tenant-specifico | Storico in `consent_events` |
| Portabilità | **Supportato** | Stesso export JSON self-service dell’accesso | Solo dati del cliente corrente nel tenant corrente |

## 3. Dati preservati dopo la cancellazione e motivazione

| Dato preservato | Comportamento | Motivazione |
|---|---|---|
| Record `clients` | anonimizzato + `profile_id` rimosso + `deleted_at` valorizzato | integrità referenziale verso record storici che non possono essere distrutti subito |
| `appointments`, `appointment_services`, `appointment_products` | conservati, ma con note/token booking rimossi | storico prestazioni, supporto fiscale/operativo, contestazioni |
| `payments` | conservati | obblighi fiscali e contabili |
| `loyalty_transactions`, `reward_redemptions` | conservati | accountability del programma loyalty, riconciliazione, contestazioni |
| `consent_events` | conservati append-only | prova GDPR del consenso / revoca / opposizione |
| `client_privacy_requests` | conservati | accountability sulla gestione delle richieste privacy |

## 4. Dati rimossi o scollegati durante la cancellazione self-service

- `client_notes`
- `client_product_wishlist`
- `client_loyalty`
- `client_badges`
- `client_analytics`
- `notifications` personali del cliente nel tenant
- `notification_log` collegato al profilo cliente nel tenant
- `push_subscriptions` del tenant
- `marketing_unsubscribe_tokens`
- `site_sessions` e `site_events` collegati al cliente nel tenant
- campi sensibili di `appointments` (`notes`, token conferma booking, eventuale `booked_by` auto-riferito)

## 5. Auditabilità minima garantita

Ogni workflow privacy B2C crea o aggiorna traccia auditabile con almeno:

- `created_at`
- `tenant_id`
- `client_id` / `profile_id`
- `action`
- `status`
- `details` con esito o categorie coinvolte

La tabella dedicata è `client_privacy_requests`; marketing/churn continuano inoltre ad avere prova append-only in `consent_events`.
