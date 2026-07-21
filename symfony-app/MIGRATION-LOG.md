# Migration Log — Styll: Next.js+Supabase → Symfony+PostgreSQL

**Data:** 2026-07-20  
**Branch:** symfony-scaffold  
**Autore:** Claude (scaffold automatico, revisione manuale richiesta)

---

## Sessione fix precisione timestamp PostgreSQL/Doctrine — 2026-07-21

**Branch:** `fix/doctrine-timestamp-precision`

### Bug

Letture Doctrine su righe scritte da PostgreSQL con `now()`/trigger `set_updated_at()` fallivano con:

```text
Doctrine\DBAL\Types\Exception\InvalidFormat:
Could not convert database value "... .123456+00" to Doctrine Type Doctrine\DBAL\Types\DateTimeTzImmutableType.
Expected format "Y-m-d H:i:sO"
```

### Causa

PostgreSQL `TIMESTAMPTZ` preserva microsecondi per valori generati da `now()`.
Doctrine DBAL 4/ORM 3, nel tipo standard `datetimetz_immutable`, prova a parsare solo il formato della piattaforma senza frazioni di secondo (`Y-m-d H:i:sO`). Il bug quindi non è legato a una singola tabella: qualunque entity con `datetimetz_immutable` può fallire quando il valore arriva dal database con microsecondi.

### Portata quantificata

Ricognizione su `symfony-app/docker/postgres/init/*.sql` e `symfony-app/migrations/*.php`:

- **19 tabelle con trigger `*_updated_at`:**
  - `appointments`
  - `client_analytics`
  - `client_loyalty`
  - `clients`
  - `email_templates`
  - `locations`
  - `loyalty_configs`
  - `message_templates`
  - `platform_leads`
  - `product_inventory`
  - `products`
  - `profiles`
  - `promotions`
  - `rewards`
  - `services`
  - `staff_members`
  - `tenant_subscriptions`
  - `tenants`
  - `users`
- **56 tabelle con almeno un timestamp `DEFAULT now()` / `DEFAULT NOW()` / `DEFAULT CURRENT_TIMESTAMP` o equivalente nei DDL/migration esistenti.**

Conclusione: il problema riguarda sia righe aggiornate da trigger sia righe create con default PostgreSQL, incluse tabelle senza trigger esplicito.

### Confronto opzioni

**Opzione A — normalizzare PostgreSQL a secondi (`date_trunc('second', now())`)**

- Pro: dati sempre compatibili col parser standard Doctrine.
- Contro: richiede modifiche diffuse a trigger, default storici e migration; perde precisione nativa e può degradare audit/event ordering futuro.

**Opzione B — custom type Doctrine per `datetimetz_immutable`**

- Pro: risolve tutte le entity in un punto solo, non richiede riscrittura dati, mantiene precisione PostgreSQL nativa e accetta dati già sporchi.
- Contro: introduce un tipo DBAL applicativo da mantenere.

### Decisione presa

Scelta **Opzione B**: nuovo `App\Doctrine\PostgresDateTimeTzImmutableType`, registrato in `config/packages/doctrine.yaml` come override globale di `datetimetz_immutable`.

Motivo: per un backend production-ready è più corretto accettare il formato valido prodotto da PostgreSQL invece di ridurre la precisione dello schema e normalizzare a mano ogni tabella presente/futura.

### Implementato

- `src/Doctrine/PostgresDateTimeTzImmutableType.php`
  - scrive valori PHP preservando microsecondi (`Y-m-d H:i:s.uO`);
  - legge prima col parser standard Doctrine;
  - in fallback usa `DateTimeImmutable` nativo, che accetta timestamp PostgreSQL con microsecondi e timezone.
- `config/packages/doctrine.yaml`
  - override globale `datetimetz_immutable: App\Doctrine\PostgresDateTimeTzImmutableType`.
- `tests/Integration/PostgresTimestampPrecisionIntegrationTest.php`
  - crea `Tenant`, `StaffMember`, `Client`;
  - aggiorna le righe via SQL per far scattare i trigger PostgreSQL;
  - svuota l'EntityManager e rilegge da Doctrine verificando che non fallisca l'hydration.

### Verifiche

Test mirato:

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --colors=never tests/Integration/PostgresTimestampPrecisionIntegrationTest.php
```

Risultato: **OK** — 1 test, 12 assertion.

Verifica dati locali già esistenti (`barbiere-di-prova`) dopo cache clear Symfony:

```bash
curl http://localhost:8080/api/public/tenants/barbiere-di-prova
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/staff-members
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/locations
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/services
curl http://localhost:8080/api/public/tenants/barbiere-di-prova/service-categories
```

Risultato: tutti **200**, senza normalizzare manualmente i dati esistenti.

---

## Sessione public API landing tenant — 2026-07-21

**Branch:** `feat/public-api-readonly`

## Sessione landing Symfony full migration — 2026-07-21

**Branch:** `feat/symfony-landing-full-migration`

### Obiettivo

Rendere la landing pubblica tenant completamente servita da Symfony, eliminando il fallback Supabase usato dal frontend per alcuni campi mancanti.

### Decisioni

- **DECISIONE PRESA — i campi landing del tenant restano in `tenants.settings` JSONB.**
  Non e stata introdotta una nuova tabella o nuove colonne dedicate su `tenants`: i campi `tagline`, `bio/description`, `hero_image_url`, `about.*`, `google_rating`, `google_reviews_count`, `team_description`, `locations_description`, `contact_phone`, `contact_email`, `social_links` sono configurazione editoriale, non richiedono query/filtering relazionale, e hanno gia un contenitore persistente coerente nello schema Symfony.
- **DECISIONE PRESA — aggiungere colonne solo dove mancava struttura reale.**
  Sono state aggiunte solo le colonne assenti necessarie a esprimere media/visibilita o metadata catalogo pubblici: `locations.photo_url`, `locations.photos`, `locations.show_on_website`, `staff_members.show_on_website`, `services.show_on_website`, `products.description`, `products.display_order`, `products.show_on_site`.
- **DECISIONE PRESA — `products.available` e derivato, non persistito.**
  Il flag pubblico viene calcolato da `product_inventory.quantity > 0` tramite relazione Doctrine `Product -> ProductInventory`.

### Implementato

- Migration Doctrine `Version20260721133000`:
  - `locations.photo_url`
  - `locations.photos` (`JSONB`)
  - `locations.show_on_website`
  - `staff_members.show_on_website`
  - `services.show_on_website`
  - `products.description`
  - `products.display_order`
  - `products.show_on_site`
  - indici pubblici tenant-scoped per locations, staff, services, products
- `Tenant` espone nei serializer group `public:read` i campi landing derivati da `settings`, senza esporre il JSON completo.
- `Location` espone `photoUrl` e `photos`; `StaffMember` espone `role`; `Product` espone `description` e `available`.
- `PublicTenantResourceProvider` filtra ora anche `show_on_website` / `show_on_site` per resources pubbliche e promozioni collegate.
- Bootstrap SQL `docker/postgres/init/*.sql` allineato al nuovo schema per fresh volumes locali.
- Fixture/test funzionali aggiornati per verificare:
  - esposizione dei nuovi campi pubblici;
  - esclusione record hidden;
  - disponibilita prodotto derivata da inventario.

### Implementato

- API Platform pubbliche read-only, senza JWT, sotto path tenant-scoped:
  - `GET /api/public/tenants/{slug}`
  - `GET /api/public/tenants/{slug}/tenant`
  - `GET /api/public/tenants/{slug}/locations`
  - `GET /api/public/tenants/{slug}/locations/{id}`
  - `GET /api/public/tenants/{slug}/service-categories`
  - `GET /api/public/tenants/{slug}/service-categories/{id}`
  - `GET /api/public/tenants/{slug}/services`
  - `GET /api/public/tenants/{slug}/services/{id}`
  - `GET /api/public/tenants/{slug}/staff-members`
  - `GET /api/public/tenants/{slug}/staff-members/{id}`
  - `GET /api/public/tenants/{slug}/products`
  - `GET /api/public/tenants/{slug}/products/{id}`
  - `GET /api/public/tenants/{slug}/gallery-photos`
  - `GET /api/public/tenants/{slug}/gallery-photos/{id}`
  - `GET /api/public/tenants/{slug}/portfolio-photos`
  - `GET /api/public/tenants/{slug}/portfolio-photos/{id}`
  - `GET /api/public/tenants/{slug}/website-photos`
  - `GET /api/public/tenants/{slug}/website-photos/{id}`
  - `GET /api/public/tenants/{slug}/promotions`
  - `GET /api/public/tenants/{slug}/promotions/{id}`
  - `GET /api/public/tenants/{slug}/promotion-services`
  - `GET /api/public/tenants/{slug}/promotion-services/{id}`
  - `GET /api/public/tenants/{slug}/promotion-products`
  - `GET /api/public/tenants/{slug}/promotion-products/{id}`
- Nuovo provider `App\State\PublicTenantResourceProvider`:
  - risolve tenant attivo da `{slug}`;
  - imposta esplicitamente `tenant_filter` anche senza JWT;
  - applica filtri pubblici (`isActive`, `deletedAt IS NULL`, `isVisible`, promozioni attive e `showOnLanding`);
  - restituisce 404 per item non appartenenti allo slug tenant richiesto.
- Nuovo serializer group `public:read`, separato dai gruppi interni già presenti.
- `config/packages/security.yaml`: `^/api/public` aperto con `PUBLIC_ACCESS`.
- `config/packages/api_platform.yaml`: abilitato anche `application/json`, mantenendo `application/ld+json`.
- Test funzionale `PublicTenantResourcesEndpointTest` per:
  - accesso senza JWT;
  - scoping per slug;
  - blocco cross-tenant sugli item;
  - assenza di campi sensibili nei JSON pubblici.

### Decisioni

- **DECISIONE PRESA — tenant pubblico da slug nel path.** Le API pubbliche non accettano `tenant_id` dal client. Il tenant viene risolto da `{slug}` nel path e il provider applica il `TenantFilter` con l'id server-side del tenant attivo.
- **DECISIONE PRESA — nessuna collection globale tenant.** `Tenant` espone `GET /api/public/tenants/{slug}` e una collection scoped a singolo tenant (`/tenant`) per rispettare il requisito `GetCollection` senza aprire una lista pubblica di tenant.

### Nota storica

- La necessità di `products.show_on_site` è stata chiusa nella sessione `feat/symfony-landing-full-migration` del 2026-07-21, con migration Doctrine dedicata e filtro pubblico applicato anche ai prodotti/promozioni collegate.

### Verifiche

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --colors=never tests/Functional/PublicTenantResourcesEndpointTest.php
```

Risultato: **OK** — 35 test, 372 assertion. PHPUnit segnala 3 deprecation preesistenti/di suite.

```bash
docker compose exec -T php env APP_ENV=test php bin/console doctrine:schema:validate --skip-sync
```

Risultato: mapping Doctrine **OK**, sync DB saltato intenzionalmente.

```bash
docker compose exec -T php env APP_ENV=test php bin/phpunit --colors=never
```

Risultato: **OK** — 72 test, 515 assertion. PHPUnit segnala 3 deprecation.

---

## FASE 2 — Growth extras: promotions — 2026-07-21

**Commit:** `feat(promotions): add promotion tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721120654` per:
  - `promotions`
  - `promotion_services`
  - `promotion_products`
- Entità Doctrine + repository:
  - `Promotion` / `PromotionRepository`
  - `PromotionService` / `PromotionServiceRepository`
  - `PromotionProduct` / `PromotionProductRepository`
- API Platform read-only `GetCollection` per consultazione dashboard, senza operazioni di scrittura finché non sono definiti Voter/permessi di ruolo.
- Test `PromotionTenantIsolationIntegrationTest` per verificare che `TenantFilter` isoli promozioni e righe ponte per tenant.

### Note di mapping

- La migration è nata da `doctrine:migrations:diff` e poi ridotta al solo gruppo logico, perché il diff Doctrine continua a vedere drift storico tra DDL bootstrap e mapping baseline.
- I vincoli `CHECK` Supabase su `discount_type` sono preservati nella migration.
- `promotions.updated_at` usa trigger PostgreSQL `set_updated_at()` e lifecycle callback Doctrine.

---

## FASE 2 — Growth extras: import/onboarding/auth tokens — 2026-07-21

**Commit:** `feat(import): add import and onboarding tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721120852` per:
  - `client_import_jobs`
  - `team_invitations`
  - `onboarding_tokens`
  - `email_verification_tokens`
- Entità Doctrine + repository:
  - `ClientImportJob` / `ClientImportJobRepository`
  - `TeamInvitation` / `TeamInvitationRepository`
  - `OnboardingToken` / `OnboardingTokenRepository`
  - `EmailVerificationToken` / `EmailVerificationTokenRepository`
- API Platform read-only `GetCollection` per `ClientImportJob` e `TeamInvitation`; token sensibili non sono inclusi nei gruppi serializer.
- Test `ImportAuthTenantIsolationIntegrationTest` per verificare isolamento tenant su `client_import_jobs` e `team_invitations`.

### Note di mapping

- `initiated_by` e `created_by` sono mappati a `Profile`, coerentemente con le altre entità Symfony che sostituiscono `auth.users` con `profiles`/`users`.
- `onboarding_tokens` ed `email_verification_tokens` non hanno `tenant_id` nella specifica e restano tabelle interne non esposte via API Platform.
- `client_import_jobs.merged_count` include la patch Supabase successiva `20260706000002_client_import_jobs_merge_count.sql`.

---

## FASE 2 — Growth extras: notifications/push — 2026-07-21

**Commit:** `feat(notifications): add notification tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721121015` per:
  - `notifications`
  - `notification_log`
  - `push_subscriptions`
- Entità Doctrine + repository:
  - `Notification` / `NotificationRepository`
  - `NotificationLog` / `NotificationLogRepository`
  - `PushSubscription` / `PushSubscriptionRepository`
- API Platform read-only `GetCollection` per `Notification`.
- Test `NotificationTenantIsolationIntegrationTest` per verificare isolamento tenant su notifiche, log invii e push subscription.

### Note di mapping

- `notifications` usa `profile_id` nullable e `meta` JSONB, coerente con le migrazioni Supabase operative più recenti e con il codice legacy che legge notifiche staff/client.
- `push_subscriptions` segue la specifica infrastrutturale archiviata con `tenant_id` nullable, `p256dh_key`, `auth_key`, `device_label`, `last_used_at`.
- `notification_log` include `promotion_id`, aggiunto dalla patch Supabase `20260625000001_notification_log_promotion_id.sql`.

---

## FASE 2 — Growth extras: messaging — 2026-07-21

**Commit:** `feat(messaging): add messaging tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721121146` per:
  - `message_templates`
  - `messages_log`
  - `messaging_outbox`
- Entità Doctrine + repository:
  - `MessageTemplate` / `MessageTemplateRepository`
  - `MessageLog` / `MessageLogRepository`
  - `MessagingOutbox` / `MessagingOutboxRepository`
- API Platform read-only `GetCollection` per `MessageTemplate` e `MessageLog`; `MessagingOutbox` resta interna/worker-side.
- Test `MessagingTenantIsolationIntegrationTest` per verificare isolamento tenant su template, log e outbox.

### Note di mapping

- Lo schema segue la specifica v1 archiviata in `docs/_archivio-supabase/database-schema-supabase.md`, non il sottosistema inbox WhatsApp AI v2/v3.
- `message_templates.updated_at` usa trigger PostgreSQL `set_updated_at()` e lifecycle callback Doctrine.
- `messaging_outbox` mantiene `payload` JSONB e `idempotency_key` univoca come coda operativa server-side.

---

## FASE 3 — Legal / Privacy / GDPR: privacy and consent proof — 2026-07-21

**Commit:** `feat(privacy): add GDPR privacy consent tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721123103` per:
  - `client_privacy_requests`
  - `marketing_unsubscribe_tokens`
  - `analytics_consent_events`
- Entità Doctrine + repository:
  - `ClientPrivacyRequest` / `ClientPrivacyRequestRepository`
  - `MarketingUnsubscribeToken` / `MarketingUnsubscribeTokenRepository`
  - `AnalyticsConsentEvent` / `AnalyticsConsentEventRepository`
- Nessuna entità del gruppo espone `ApiResource`: letture/scritture API GDPR richiedono una sessione dedicata di autorizzazione.
- Test `PrivacyConsentTenantIsolationIntegrationTest` per verificare isolamento tenant su `client_privacy_requests` e `marketing_unsubscribe_tokens`.

### Note di mapping

- I valori enum Supabase sono mappati come stringhe con `CHECK` constraint in migration, coerentemente con le convenzioni Symfony del progetto.
- `analytics_consent_events` mantiene `ip_address INET` e il trigger append-only `trg_guard_analytics_consent_events_append_only` della specifica Supabase.
- `client_privacy_requests` resta un audit trail append-only a livello di modello applicativo; la migrazione Supabase originale non definiva un trigger DB di immutabilità per questa tabella.

---

## FASE 3 — Legal / Privacy / GDPR: legal acceptance — 2026-07-21

**Commit:** `feat(legal): add legal acceptance tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721123319` per:
  - `legal_acceptance_events`
  - `legal_acceptance_pending`
- Entità Doctrine + repository:
  - `LegalAcceptanceEvent` / `LegalAcceptanceEventRepository`
  - `LegalAcceptancePending` / `LegalAcceptancePendingRepository`
- Nessuna entità del gruppo espone `ApiResource`: letture/scritture API legal richiedono una sessione dedicata di autorizzazione.
- Test `LegalAcceptanceTenantIsolationIntegrationTest` per verificare isolamento tenant su `legal_acceptance_events`.

### Note di mapping

- `legal_acceptance_events.tenant_id` resta nullable come nello schema Supabase: gli eventi possono nascere prima del backfill tenant e diventare tenant-scoped dopo.
- Il trigger `legal_acceptance_events_guard_immutability` replica la regola Supabase: righe immutabili salvo un solo backfill `tenant_id` da `NULL` a valore.
- `legal_acceptance_pending` è globale/interna e non ha `tenant_id`; contiene hash token one-shot e non viene esposta via API.

---

## FASE 4 — Admin/Platform: admin global — 2026-07-21

**Commit:** `feat(admin): add global admin tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721125231` per:
  - `admin_audit_log`
  - `admin_settings`
  - `email_templates`
- Entità Doctrine + repository:
  - `AdminAuditLog` / `AdminAuditLogRepository`
  - `AdminSetting` / `AdminSettingRepository`
  - `EmailTemplate` / `EmailTemplateRepository`
- Nessuna `ApiResource` per queste tabelle: audit/settings/template globali sono superfici admin sensibili.
- `TenantFilter::EXCLUDED_ENTITIES` aggiornato per le tre entità globali/admin.
- Test `AdminGlobalTenantFilterIntegrationTest` per verificare che queste tabelle non vengano filtrate dal tenant corrente.

### Note di mapping

- `admin_audit_log.tenant_id` resta nullable come da schema Supabase: è un log piattaforma con riferimento opzionale a tenant, non ownership tenant-scoped.
- `admin_settings` usa primary key testuale `key`.
- `email_templates` sono globali e includono seed idempotente dei template base nella migration.

---

## FASE 4 — Admin/Platform: platform notifications/leads/metering — 2026-07-21

**Commit:** `feat(platform): add platform notification and metering tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721125402` per:
  - `platform_notifications`
  - `platform_leads`
  - `tenant_usage_counters`
- Entità Doctrine + repository:
  - `PlatformNotification` / `PlatformNotificationRepository`
  - `PlatformLead` / `PlatformLeadRepository`
  - `TenantUsageCounter` / `TenantUsageCounterRepository`
- `TenantFilter::EXCLUDED_ENTITIES` aggiornato per `PlatformNotification` e `PlatformLead`; `TenantUsageCounter` resta tenant-scoped.
- Test `PlatformMeteringTenantFilterIntegrationTest`: platform notifications/leads non sono filtrate per tenant, tenant usage counters sì.

### Note di mapping

- `platform_notifications.tenant_id` è nullable e rappresenta contesto, non ownership tenant-scoped: la tabella è visibile solo a superadmin lato autorizzazione futura.
- I trigger Supabase automatici su `tenants`/`profiles` non sono stati portati: la versione Symfony corrente di `profiles` non ha una colonna `email`, mentre il trigger legacy `fn_platform_notif_user_registered()` la referenzia.
- `tenant_usage_counters` usa primary key composta `(tenant_id, period_month, metric)` e metriche della migrazione Supabase messaging foundation (`sms_sent`, `whatsapp_sent`, `email_sent`, `push_sent`, `ai_requests`, `ai_input_tokens`, `ai_output_tokens`).

---

## FASE 4 — Admin/Platform: tenant media — 2026-07-21

**Commit:** `feat(media): add tenant media tables`  
**Branch:** `feat/backend-fase-0`

### Implementato

- Migration Doctrine `Version20260721125554` per:
  - `gallery_photos`
  - `website_photos`
  - `portfolio_photos`
- Entità Doctrine + repository:
  - `GalleryPhoto` / `GalleryPhotoRepository`
  - `WebsitePhoto` / `WebsitePhotoRepository`
  - `PortfolioPhoto` / `PortfolioPhotoRepository`
- API Platform read-only `GetCollection` per le tre entità media, con gruppo serializer `media:read`.
- Test `MediaTenantIsolationIntegrationTest` per verificare isolamento tenant su tutte le tabelle media.

### Note di mapping

- `gallery_photos` e `portfolio_photos` seguono le migrazioni Supabase legacy.
- `website_photos` non ha un DDL Supabase archiviato trovato; è stato ricostruito dai tipi/schema legacy (`id`, `tenant_id`, `url`, `sort_order`, `created_at`) e mantenuto tenant-scoped.
- `portfolio_photos.service_tags` resta `TEXT[]` lato database; l'entità lo espone come stringa array-literal per evitare mapping custom DBAL.

---

## Sessione Doctrine entities Area 6 + Area 3 — 2026-07-20

Obiettivo: estendere le entità Doctrine mancanti per `symfony-app`, mantenendo il pattern esistente di mapping ORM e la compatibilità con `TenantFilter`.

### Vincoli operativi emersi nella sessione

- `git pull --ff-only` non eseguibile in questa sessione: `error: cannot open '.git/FETCH_HEAD': Operation not permitted`
- `git checkout -b symfony-entities-loyalty` non eseguibile in questa sessione: `.git` è montato in sola lettura e Git non può creare `refs/heads/...lock`
- Di conseguenza i commit richiesti non sono materialmente eseguibili dall'ambiente corrente, anche se i file applicativi sono stati aggiornati

### DECISIONE DA CONFERMARE — conteggio totale tabelle

Nel contesto utente il totale dichiarato è **39 tabelle**, ma il DDL presente in `symfony-app/docker/postgres/init/*.sql` contiene attualmente **32** `CREATE TABLE IF NOT EXISTS`.

Scelta operativa presa il **20 luglio 2026**: usare il DDL reale nel repository come fonte di verità, coerentemente con `AGENTS.md`.

Tabelle rilevate dal DDL corrente:

- Area 1: `subscription_plans`, `tenants`, `locations`, `tenant_subscriptions`
- Area 2: `staff_members`, `staff_locations`
- Area 3: `service_categories`, `services`, `staff_services`, `products`, `product_inventory`, `client_product_wishlist`
- Area 5: `clients`, `client_notes`, `client_consents`, `client_analytics`
- Area 4: `working_hours`, `working_hour_overrides`, `appointments`, `appointment_services`, `appointment_products`, `payments`
- Area 6: `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions`, `tier_configs`, `badges`, `client_badges`
- Area auth/shared: `users`, `profiles`

### FASE 1 — Area 6: Loyalty & Gamification

**Commit previsto:** `feat: entità Doctrine Area 6 - Loyalty & Gamification`  
**Stato commit:** non eseguibile nell'ambiente corrente (`.git` read-only)

#### Implementato

Entità Doctrine aggiunte:

- `src/Entity/LoyaltyConfig.php`
- `src/Entity/Reward.php`
- `src/Entity/ClientLoyalty.php`
- `src/Entity/LoyaltyTransaction.php`
- `src/Entity/RewardRedemption.php`
- `src/Entity/TierConfig.php`
- `src/Entity/Badge.php`
- `src/Entity/ClientBadge.php`

Repository aggiunti:

- `src/Repository/LoyaltyConfigRepository.php`
- `src/Repository/RewardRepository.php`
- `src/Repository/ClientLoyaltyRepository.php`
- `src/Repository/LoyaltyTransactionRepository.php`
- `src/Repository/RewardRedemptionRepository.php`
- `src/Repository/TierConfigRepository.php`
- `src/Repository/BadgeRepository.php`
- `src/Repository/ClientBadgeRepository.php`

Test di integrazione aggiunto:

- `tests/Integration/LoyaltyTenantIsolationIntegrationTest.php`

#### Scelte di mapping

- Tutte le tabelle tenant-scoped usano lo stesso pattern già presente nelle entità di Area 4/5:
  relazione `ManyToOne` verso `Tenant` con join column esplicita `tenant_id`, così `TenantFilter` continua a intercettarle senza modifiche infrastrutturali.
- Le tabelle con `updated_at` e trigger SQL (`loyalty_configs`, `rewards`, `client_loyalty`) usano anche `#[ORM\HasLifecycleCallbacks]` con `onPreUpdate()` coerente al pattern corrente.
- `reward_redemptions.confirmed_by` è stato mappato verso `StaffMember`, coerentemente con il DDL.

#### Verifica Area 6

Comando eseguito il **20 luglio 2026**:

```bash
cd symfony-app && php bin/console doctrine:schema:validate --skip-sync
```

Risultato:

```text
Mapping
-------

 [OK] The mapping files are correct.

Database
--------

 [SKIPPED] The database was not checked for synchronicity.
```

Test mirato eseguito:

```bash
cd symfony-app && ./bin/phpunit tests/Integration/LoyaltyTenantIsolationIntegrationTest.php
```

Risultato: **non eseguibile fino in fondo nell'ambiente corrente** perché la connessione PostgreSQL test verso `127.0.0.1:5432` viene bloccata dal sandbox:

```text
SQLSTATE[08006] [7] connection to server at "127.0.0.1", port 5432 failed: Operation not permitted
```

### FASE 2 — Completamento Area 3: Catalogo

**Commit previsto:** `feat: completa entità Doctrine Area 3 - Catalogo`  
**Stato commit:** non eseguibile nell'ambiente corrente (`.git` read-only)

#### Implementato

Entità Doctrine aggiunte:

- `src/Entity/ServiceCategory.php`
- `src/Entity/StaffService.php`
- `src/Entity/ProductInventory.php`
- `src/Entity/ClientProductWishlist.php`

Repository aggiunti:

- `src/Repository/ServiceCategoryRepository.php`
- `src/Repository/StaffServiceRepository.php`
- `src/Repository/ProductInventoryRepository.php`
- `src/Repository/ClientProductWishlistRepository.php`

Ritocchi di allineamento allo schema esistente:

- `src/Entity/Service.php`
  - aggiunta relazione opzionale `category_id` → `ServiceCategory`
  - aggiunta relazione opzionale `created_by` → `Profile`
- `src/Entity/Product.php`
  - aggiunta relazione opzionale `created_by` → `Profile`

#### DECISIONE PRESA — doppio concetto di categoria su `services`

Il DDL di `services` contiene sia:

- `category_id` verso `service_categories`
- `category` testuale legacy

Scelta presa il **20 luglio 2026**: mantenere **entrambi** nel mapping Doctrine.

Motivo: il repository già esponeva la colonna testuale `category`; aggiungere anche la relazione `serviceCategory` preserva retrocompatibilità e riallinea l'entità al DDL reale senza rimuovere comportamento esistente.

#### Verifica Area 3

Comando eseguito il **20 luglio 2026**:

```bash
cd symfony-app && php bin/console doctrine:schema:validate --skip-sync
```

Risultato:

```text
Mapping
-------

 [OK] The mapping files are correct.

Database
--------

 [SKIPPED] The database was not checked for synchronicity.
```

Controllo sintattico locale eseguito sui file nuovi/modificati:

```bash
cd symfony-app && php -l <file>
```

Risultato: nessun errore di sintassi nei file aggiunti o aggiornati per Area 6 e Area 3.

### FASE 3 — Verifica finale

#### PHPUnit completo richiesto

Comando richiesto dall'istruzione:

```bash
cd symfony-app && docker compose exec php php bin/phpunit --testdox
```

Risultato il **20 luglio 2026**:

```text
permission denied while trying to connect to the docker API at unix:///Users/tommasovezzaro/.docker/run/docker.sock
```

Fallback locale eseguito:

```bash
cd symfony-app && ./bin/phpunit --testdox
```

Risultato:

- **19 test totali rilevati**
- **18 assertion eseguite**
- **7 errori**
- nessun fallimento logico del mapping Doctrine
- tutti gli errori derivano dal medesimo blocco infrastrutturale: impossibilità di aprire la connessione PostgreSQL di test su `127.0.0.1:5432`

Messaggio ricorrente:

```text
SQLSTATE[08006] [7] connection to server at "127.0.0.1", port 5432 failed: Operation not permitted
```

#### Conteggio aggiornato entità Doctrine ↔ tabelle DDL

Conteggio basato sul DDL reale presente il **20 luglio 2026** in `symfony-app/docker/postgres/init/*.sql`:

- **27 entità Doctrine mappate**
- **32 tabelle SQL rilevate**

Copertura attuale: **27 / 32**

Tabelle ancora senza entità Doctrine dedicata:

- `subscription_plans`
- `tenant_subscriptions`
- `staff_locations`
- `client_consents`
- `client_analytics`

Se il totale atteso di prodotto resta davvero **39**, questo va riallineato con il DDL del repository prima di usare il conteggio come KPI.

---

## Sessione end-to-end scheletro backend — 2026-07-20

Obiettivo: passare da componenti Symfony testati singolarmente a scheletro end-to-end verificato su PostgreSQL reale.

### FASE 1 — Ambiente test PostgreSQL reale + integrazione TenantFilter ⚠️

**Commit:** `test: integrazione TenantFilter su PostgreSQL reale`
**Data:** 2026-07-20

#### Implementato

| File | Modifica |
|---|---|
| `docker/postgres/init/00_create_test_database.sql` | Crea `${POSTGRES_DB}_test` al primo avvio del container e applica gli stessi DDL `01..09` anche al DB di test |
| `.env.test` | Configura Symfony test su PostgreSQL reale (`styll` con suffix Doctrine `_test`, quindi `styll_test`) |
| `src/EventListener/TenantFilterSubscriber.php` | Abilita sempre `tenant_filter` sulle request principali; se manca tenant_id il filtro resta senza parametro e `TenantFilter` ritorna `1 = 0` |
| `tests/Integration/TenantIsolationIntegrationTest.php` | Test reali su DB: 2 tenant, 2 set clienti/appuntamenti, token Symfony per tenant A/B, query Doctrine reali, caso senza autenticazione |

#### DECISIONE PRESA — DB test separato

**Scelta:** usare un database sibling `${POSTGRES_DB}_test` nello stesso container PostgreSQL e mantenere `dbname_suffix: _test` in Doctrine.
**Motivo:** isola i dati dei test dal database di sviluppo senza introdurre SQLite o un secondo container. Gli init script applicano lo stesso DDL pulito a entrambi i database al primo bootstrap.

#### DECISIONE PRESA — TenantFilter fail-closed anche senza autenticazione

**Scelta:** il subscriber abilita il filtro anche quando `TenantContext` non risolve un tenant.
**Motivo:** una query Doctrine eseguita in request senza tenant non deve mai degradare in fail-open. Con filtro abilitato e parametro assente, `TenantFilter` produce `1 = 0` e ritorna zero righe senza errore.

#### Risultati test

Comando eseguito contro PostgreSQL reale locale (`127.0.0.1:5432`, database `styll_test` preparato con gli stessi DDL):

```bash
cd symfony-app && DATABASE_URL='postgresql://tommasovezzaro@127.0.0.1:5432/styll?serverVersion=16&charset=utf8' ./bin/phpunit tests/Integration/TenantIsolationIntegrationTest.php tests/Doctrine/TenantFilterTest.php tests/Security/TenantContextTest.php
```

Output:

```text
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.2.30
Configuration: /Users/tommasovezzaro/Desktop/Styll-Symfony/symfony-app/phpunit.dist.xml

...............                                                   15 / 15 (100%)

Time: 00:00.935, Memory: 58.50 MB

OK (15 tests, 29 assertions)
```

#### Verifica Docker

La verifica richiesta con `docker-compose up -d postgres` **non è stata eseguibile in questa sessione** perché nell'ambiente CLI non sono disponibili né `docker-compose` né `docker`:

```text
/bin/bash: docker-compose: command not found
/bin/bash: docker: command not found
```

Il comportamento del database è stato comunque verificato su PostgreSQL reale locale caricando tutti i DDL in `styll_test`. Prima del deploy scheletro su VPS resta da rieseguire il bootstrap Docker/Compose su una macchina con Docker installato.

### FASE 2 — JWT keypair dev/test + fixture utente staff ✅

**Commit:** `auth: keypair JWT ambiente test + fixture utente`
**Data:** 2026-07-20

#### Implementato

| File / area | Modifica |
|---|---|
| `config/jwt/private.pem`, `config/jwt/public.pem` | Keypair generata con `php bin/console lexik:jwt:generate-keypair --overwrite --no-interaction`; file locali ignorati da Git |
| `.gitignore` | Già presente `/config/jwt/*.pem`, nessuna modifica necessaria |
| `tests/Support/TestTenantFixture.php` | Fixture test-only che crea due tenant, due staff user e due clienti per tenant; password nota solo per ambiente test: `styll-test-password-only` |

#### Verifica sicurezza chiavi

```bash
git log --all --full-history -- "**/jwt/*" --oneline
```

Risultato: nessun file sotto `config/jwt/` risulta committato nella history del branch.

```bash
git status --short --ignored -- symfony-app/config/jwt symfony-app/tests/Support/TestTenantFixture.php
```

Risultato rilevante:

```text
!! symfony-app/config/jwt/
```

La private key locale è stata lasciata fuori da Git e i permessi locali sono stati corretti a `600` per `private.pem` e `644` per `public.pem`.

#### Risultati verifica

```bash
cd symfony-app && php -l tests/Support/TestTenantFixture.php
```

```text
No syntax errors detected in tests/Support/TestTenantFixture.php
```

### FASE 3 — Primo endpoint end-to-end GET /api/clients ✅

**Commit:** `feat: primo endpoint end-to-end (GET /api/clients) con test funzionale multi-tenant`
**Data:** 2026-07-20

#### Implementato

| File | Modifica |
|---|---|
| `config/packages/security.yaml` | Aggiunto `json_login` su firewall `api` per emettere JWT reali da `/api/login` |
| `config/routes/security.yaml` | Aggiunta route `POST /api/login` come `check_path` del firewall |
| `src/Entity/Client.php` | Esposta collection API Platform `GET /api/clients` con gruppi serializer `client:read` |
| `src/Doctrine/TenantFilter.php` | Rimosso accesso deprecated ArrayAccess ai metadata Doctrine; compatibile con mapping object ORM 3 e array dei test unit |
| `config/services.yaml` | Registrata fixture test-only `App\Tests\Support\TestTenantFixture` in `when@test` |
| `tests/Functional/ClientsEndpointTest.php` | Test funzionale: login JWT vero, `GET /api/clients`, isolamento tenant A/B, 401 senza JWT |

#### DECISIONE PRESA — endpoint minimo

**Scelta:** esporre solo `GetCollection` su `Client` via API Platform e serializzare solo `id`, `fullName`, `phone`, `email`.
**Motivo:** è il minimo necessario per dimostrare auth JWT + TenantFilter + query Doctrine reale senza esporre mutazioni o relazioni tenant/staff non ancora hardenizzate.

#### Risultato test funzionale richiesto

Comando eseguito contro PostgreSQL reale locale (`styll_test`):

```bash
cd symfony-app && DATABASE_URL='postgresql://tommasovezzaro@127.0.0.1:5432/styll?serverVersion=16&charset=utf8' ./bin/phpunit tests/Functional/ClientsEndpointTest.php
```

Risultato finale dopo correzione della deprecazione Doctrine:

```text
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.2.30
Configuration: /Users/tommasovezzaro/Desktop/Styll-Symfony/symfony-app/phpunit.dist.xml

...                                                                 3 / 3 (100%)

OK (3 tests, 28 assertions)
```

Suite Symfony completa:

```bash
cd symfony-app && DATABASE_URL='postgresql://tommasovezzaro@127.0.0.1:5432/styll?serverVersion=16&charset=utf8' ./bin/phpunit
```

```text
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.2.30
Configuration: /Users/tommasovezzaro/Desktop/Styll-Symfony/symfony-app/phpunit.dist.xml

..................                                                18 / 18 (100%)

Time: 00:00.573, Memory: 40.50 MB

OK (18 tests, 57 assertions)
```

### FASE 4 — Template env produzione + checklist deploy ✅

**Commit:** `docs: template env produzione + checklist deploy`
**Data:** 2026-07-20

#### Implementato

| File | Modifica |
|---|---|
| `.env.prod.example` | Template produzione Symfony/Docker con soli placeholder `CHANGE_ME_*` per DB, JWT, Mercure, CORS, proxy e provider opzionali |
| `docs/DEPLOY-CHECKLIST.md` | Checklist comandi VPS per generare segreti reali, keypair JWT produzione, file env non committati, bootstrap Docker e check sicurezza |

#### DECISIONE PRESA — nessun segreto produzione generato localmente

**Scelta:** la sessione genera solo keypair dev/test locale ignorata da Git; tutti i segreti produzione sono documentati come comandi da eseguire sulla VPS.
**Motivo:** evita di creare o trasferire segreti reali fuori dal contesto di deploy e rende ripetibile la procedura sotto pressione.

#### Verifica

Nessun valore reale di produzione è stato scritto nei template. Tutti i campi sensibili usano placeholder espliciti `CHANGE_ME_*` o variabili shell generate al momento del deploy.

### Stato: pronto per primo deploy scheletro?

**SÌ — bootstrap Docker verificato il 2026-07-20.**

Bootstrap Docker `fresh` eseguito su macchina locale con Docker Desktop (macOS). Tutti i container avviati, tutti gli script `docker/postgres/init/00..09` eseguiti senza `ERROR` su `styll` e `styll_test`. Suite PHPUnit eseguita dentro il container `php`: **18/18 test passanti, 57 assertions**. Inclusi i test di integrazione TenantFilter su PostgreSQL reale (`TenantIsolationIntegration`) che in precedenza erano "non verificabili per mancanza di Docker".

Bug trovati e corretti durante il bootstrap:
- `docker/php/Dockerfile`: mancava `ENV APP_ENV=prod` prima di `composer install --no-dev`; la symfony-app `/.env` interna ha `APP_ENV=dev` come default, causando `ClassNotFoundError: MakerBundle` durante `cache:clear` nella build.
- `docker/php/Dockerfile`: fix committato su branch `symfony-schema-and-docs`.

Rischi/approvazioni prima del deploy reale:

| Area | Stato |
|---|---|
| Docker bootstrap fresh | ✅ Verificato 2026-07-20: `18/18 tests, 57 assertions` passanti su PostgreSQL reale |
| Segreti produzione | Da generare solo sulla VPS seguendo `docs/DEPLOY-CHECKLIST.md` |
| Dominio, DNS, TLS, reverse proxy | Richiedono scelta/approvazione umana prima del go-live |
| CORS browser finale | Placeholder documentato; va cablato/verificato quando il frontend chiamerà l'API cross-origin |

---

## Riepilogo sessione — 2026-07-20

Sessione a tre fasi. FASE 1 e FASE 2 già committate su branch `symfony-schema-and-docs` nella sessione precedente. FASE 3 completata in questa sessione.

| Fase | Commit | Stato |
|---|---|---|
| FASE 1 — Schema DDL + entità pilota | `migration: import schema Supabase + entità pilota` | ✅ |
| FASE 2 — Isolamento multi-tenant (TenantFilter + test) | `security: isolamento multi-tenant via Doctrine filter + test` | ✅ |
| FASE 3 — Riscrittura documentazione tecnica | `docs: riscrittura documentazione tecnica per stack Symfony` | ✅ |

### FASE 3 — riepilogo file

**Archiviati** (spostati con `git mv` in `docs/_archivio-supabase/`, history conservata):

| File originale | Archiviato come |
|---|---|
| `docs/07-tecnico/architettura.md` | `architettura-supabase.md` |
| `docs/07-tecnico/database-mvp.md` | `database-mvp-supabase.md` |
| `docs/07-tecnico/database-schema.md` | `database-schema-supabase.md` |
| `docs/07-tecnico/whatsapp-inbox-v1-implementation.md` | `whatsapp-inbox-v1-implementation-supabase.md` |
| `docs/08-strategia/analisi-strategica.md` | `analisi-strategica-supabase.md` |
| `docs/08-strategia/internazionalizzazione.md` | `internazionalizzazione-supabase.md` |
| `docs/08-strategia/legal-compliance.md` | `legal-compliance-supabase.md` |
| `docs/08-strategia/partnership-ecosistem.md` | `partnership-ecosistem-supabase.md` |

**Riscritti** (nuovi file con stack Symfony, stesso path dei file originali):

| File | Principali aggiornamenti |
|---|---|
| `docs/07-tecnico/architettura.md` | Stack Symfony 7.4+API Platform, Docker Compose 4 servizi, tabella costi Hetzner (€8-€38/mo), Mercure SSE, TenantFilter |
| `docs/07-tecnico/database-mvp.md` | 24 tabelle MVP, Doctrine entities, DDL in `symfony-app/docker/postgres/init/`, confronto Supabase vs Symfony |
| `docs/07-tecnico/database-schema.md` | Decisioni architetturali DA-1–DA-9, schema per area, confronto RLS vs TenantFilter, checklist go-live |
| `docs/07-tecnico/whatsapp-inbox-v1-implementation.md` | Riferimento Supabase Realtime → Mercure SSE (layer Next.js attuale), auth.uid() → TenantFilter |
| `docs/08-strategia/analisi-strategica.md` | Stack FASE 0, tabella concorrenti, analisi criticità VPS/Symfony, budget VPS €8-18/mo |
| `docs/08-strategia/internazionalizzazione.md` | Sub-processors (Hetzner sostituisce Supabase), i18n Symfony Translation, GDPR data residency EU |
| `docs/08-strategia/legal-compliance.md` | Sub-processors (Hetzner), tabella GDPR, nota VPS EU advantage |
| `docs/08-strategia/partnership-ecosistem.md` | API Platform v4 sostituisce PostgREST, Symfony Messenger+Mercure sostituisce Supabase Realtime+Edge Functions, prerequisiti table aggiornata |

### DECISIONI DA CONFERMARE ancora aperte

| ID | Decisione | Stato |
|---|---|---|
| D2 | Nginx vs Caddy per HTTPS su VPS | ⚠️ Aperta |
| D4 | Mercure SSE vs WebSocket bidirezionale per WhatsApp inbox live | ⚠️ Aperta |
| D7 | OTP SMS per clienti: bundle esistente vs implementazione custom | ⚠️ Aperta |

---

## FASE 3 — Riscrittura documentazione tecnica ✅

**Commit:** `docs: riscrittura documentazione tecnica per stack Symfony, archivio Supabase in docs/_archivio-supabase/`  
**Data:** 2026-07-20

8 documenti archiviati con `git mv` (history git preservata). 8 documenti riscritti per stack Symfony 7.4 + API Platform + PostgreSQL VPS Hetzner. Nessun file in `apps/`, `packages/`, `docs/01-09` (escluso `07-`, `08-`) è stato toccato.

---

## FASE 2 — Isolamento multi-tenant (risolve D6) ✅

**Commit:** `security: isolamento multi-tenant via Doctrine filter + test`  
**Data:** 2026-07-20

### Componenti implementati

| File | Ruolo |
|---|---|
| `src/Security/TenantContext.php` | Risolve `tenant_id` dal JWT → StaffMember → Tenant |
| `src/Doctrine/TenantFilter.php` | SQLFilter globale: aggiunge `WHERE tenant_id = ?` |
| `src/EventListener/TenantFilterSubscriber.php` | Abilita il filter dopo JWT auth (priority 0) |
| `config/packages/doctrine.yaml` | Registra `tenant_filter` (disabled per default) |
| `tests/Doctrine/TenantFilterTest.php` | 7 test unit del filter |
| `tests/Security/TenantContextTest.php` | 5 test unit del TenantContext |

### Risultati test

```
PHPUnit 11.5.56 — PHP 8.2.30

............                                    12 / 12 (100%)

Tenant Context (App\Tests\Security\TenantContext)
 ✔ Returns null when no token
 ✔ Returns null when user has no staff member
 ✔ Returns tenant id for authenticated staff
 ✔ Tenant id is cached after first call
 ✔ Reset clears cached tenant id

Tenant Filter (App\Tests\Doctrine\TenantFilter)
 ✔ Filter adds where clause for client entity
 ✔ Filter adds where clause for appointment entity
 ✔ Tenant a and b get different constraints
 ✔ Filter without tenant id blocks all rows
 ✔ User entity is not filtered
 ✔ Profile entity is not filtered
 ✔ Client note entity is filtered

OK (12 tests, 18 assertions)
```

### Garanzie di sicurezza verificate

| Scenario | Comportamento atteso | Test |
|---|---|---|
| Tenant A legge dati Tenant B | Bloccato (`WHERE tenant_id = A`) | `testTenantAAndBGetDifferentConstraints` |
| Request non autenticata | Zero righe (`1 = 0`, fail-closed) | `testFilterWithoutTenantIdBlocksAllRows` |
| Entità globali (User, Profile) | Non filtrate (no tenant_id) | `testUserEntityIsNotFiltered`, `testProfileEntityIsNotFiltered` |
| Cache tenant_id | Solo 1 query DB per request | `testTenantIdIsCachedAfterFirstCall` |

### Note tecniche (soluzioni ai problemi incontrati)

- `SQLFilter::__construct()` è `final` in Doctrine ORM 3 — impossibile usare `getMockBuilder`. Soluzione: costruire `TenantFilter` reale con `EntityManagerInterface` mockato (chain `getFilters()->setFiltersStateDirty()` + `getConnection()->quote()`)
- `SQLFilter::getParameter()` è `final` — impossibile override. L'approccio precedente con `onlyMethods(['getParameter'])` non funziona. Soluzione: usare la vera `setParameter()` per iniettare valori nel test
- `QueryBuilder::getQuery()` tipizza il ritorno come `Doctrine\ORM\Query` (non `AbstractQuery`). Il mock di `AbstractQuery` fallisce la type check PHPUnit 11 strict. Soluzione: mock `Doctrine\ORM\Query::class`
- `ClassMetadata::$columnNames` e `::$associationMappings` sono public properties con default `[]` — il mock non le popola. Eliminata la early-exit che accedeva alle property direttamente; la logica usa solo method calls (`getAssociationMappings()`, `getColumnNames()`)

**D6 risolto.** Il filter è production-ready; integration tests su DB reale sono raccomandati prima del go-live.

---

## FASE 1 — Migrazione schema (risolve D5) ✅

**Commit:** `migration: import schema Supabase + entità pilota (Clienti+Appuntamenti)`  
**Data:** 2026-07-20

### Schema DDL pulito (senza Supabase/RLS)

Creati in `symfony-app/docker/postgres/init/` (eseguiti in ordine al primo avvio del container):

| File | Contenuto |
|---|---|
| `01_extensions.sql` | `pgcrypto`, `btree_gist` |
| `02_helpers.sql` | Trigger `set_updated_at()` |
| `03_auth.sql` | `users`, `profiles` (sostituisce `auth.users` Supabase) |
| `04_business.sql` | `subscription_plans`, `tenants`, `locations`, `tenant_subscriptions` |
| `05_staff.sql` | `staff_members`, `staff_locations` |
| `06_catalog.sql` | `service_categories`, `services`, `staff_services`, `products`, `product_inventory`, `client_product_wishlist` |
| `07_crm.sql` | `clients` (UNIQUE tenant_id+phone), `client_notes`, `client_consents`, `client_analytics` |
| `08_calendar.sql` | `working_hours`, `working_hour_overrides`, `appointments` (exclusion constraint + optimistic lock), `appointment_services`, `appointment_products`, `payments` |
| `09_loyalty.sql` | `loyalty_configs`, `rewards`, `client_loyalty`, `loyalty_transactions`, `reward_redemptions`, `tier_configs`, `badges`, `client_badges` |

Le RLS originali sono archiviate in `supabase/migrations-rls-legacy.sql` (356 righe, solo riferimento).

### Entità Doctrine (15 entity + 15 repository)

Pilota Area 4 (Calendar): `Appointment`, `AppointmentService`, `AppointmentProduct`, `Payment`, `WorkingHour`, `WorkingHourOverride`  
Pilota Area 5 (CRM): `Client`, `ClientNote`  
Dipendenze: `User`, `Profile`, `Tenant`, `Location`, `StaffMember`, `Service`, `Product`

**Validazione mapping:**
```
doctrine:schema:validate --skip-sync
[OK] The mapping files are correct.
```

**D5 risolto.** Strategia scelta: DDL clean importato come init scripts Docker (approccio ibrido).

---

## Cosa è stato fatto in questo scaffold

### 1. Progetto Symfony 7.4 LTS
- Creato con `symfony new symfony-app --version=lts --no-git`
- Versione Symfony: **7.4** (LTS più recente al luglio 2026, supportata fino a novembre 2029)
- PHP: 8.2 (versione disponibile su host; 8.3+ richiesto da doctrine/doctrine-bundle 3.x, non ancora installabile)

### 2. Pacchetti installati
| Pacchetto | Versione | Ruolo |
|---|---|---|
| `api-platform/core` | v4.3 | Generazione REST API da entità Doctrine |
| `doctrine/orm` | 3.x | ORM per PostgreSQL |
| `doctrine/doctrine-bundle` | 2.x | Integrazione Symfony (2.x per compatibilità PHP 8.2) |
| `doctrine/doctrine-migrations-bundle` | 3.x | Gestione migrazioni schema |
| `lexik/jwt-authentication-bundle` | v3.2 | JWT auth (sostituisce Supabase Auth) |
| `symfony/mercure-bundle` | v0.4 | Realtime SSE (sostituisce Supabase Realtime) |
| `symfony/security-bundle` | v7.4 | RBAC, firewall, password hashing |
| `symfony/serializer` | v7.4 | Serializzazione API Platform |

### 3. Configurazione Doctrine
- Driver: **PostgreSQL** (pdo_pgsql)
- `server_version: '16'` abilitato in `config/packages/doctrine.yaml`
- Naming strategy: `underscore_number_aware` (compatibile con lo schema esistente)
- Identity generation: `PostgreSQLPlatform: identity` (usa `SERIAL`/`GENERATED ALWAYS AS IDENTITY`)

### 4. Docker Compose (`docker-compose.yml` alla radice del repo)
Quattro servizi:
- **postgres**: PostgreSQL 16 Alpine — dati persistenti in volume `postgres_data`
- **php**: PHP-FPM 8.2 Alpine — build da `docker/php/Dockerfile`
- **nginx**: Nginx 1.27 Alpine — reverse proxy per PHP-FPM, esposto su porta 8080
- **mercure**: `dunglas/mercure` — hub SSE per realtime, esposto su porta 3001

### 5. File di configurazione ausiliari
- `docker/php/Dockerfile` — build PHP-FPM con estensioni pgsql, intl, zip, opcache
- `docker/nginx/default.conf` — config Nginx minimal per Symfony
- `symfony-app/.env.symfony.example` — template variabili d'ambiente senza valori reali

---

## Cosa NON è stato toccato
- `apps/` — codebase Next.js invariata
- `packages/` — packages condivisi invariati
- `supabase/` — migrazioni SQL invariate (servono come riferimento per le entità Doctrine)

---

## Decisioni prese

### D1 — Symfony 7.4 (non 6.4)
**Scelta:** 7.4 LTS (supportata fino a nov 2029).  
**Perché:** `symfony new --version=lts` installa automaticamente l'LTS più recente. Con PHP 8.2 è pienamente compatibile.  
**Alternativa scartata:** 6.4 LTS (ancora supportata ma più vecchia, scadrà nov 2027).

### D2 — PHP-FPM + Nginx (non Caddy)
**Scelta:** PHP-FPM + Nginx.  
**Perché:** Stack più documentato per Symfony su VPS, Nginx è lo standard de facto, configurazione minimale e prevedibile.  
**Alternativa:** Caddy sarebbe stata più semplice da configurare (HTTPS automatico), ma meno diffusa negli howto Symfony esistenti.  
**DECISIONE DA CONFERMARE:** se il VPS deve gestire HTTPS direttamente via Docker, Caddy è preferibile (TLS auto). Nginx richiede Certbot o un load balancer esterno.

### D3 — JWT per autenticazione (non sessioni)
**Scelta:** `lexik/jwt-authentication-bundle` con RSA key pair.  
**Perché:** L'app è un'API stateless consumata da frontend Next.js e PWA. JWT è lo standard per API Platform.  
**Conseguenza:** Le RLS di Supabase (`auth.uid()`, `get_my_tenant_id()`) non possono essere replicate 1:1 — vanno riscritte come:
- Middleware Symfony che inietta `tenant_id` dal JWT claim
- Doctrine filter globale che aggiunge `WHERE tenant_id = :current_tenant` a ogni query

### D4 — Mercure per Realtime
**Scelta:** `dunglas/mercure` (hub SSE).  
**Perché:** È il componente realtime ufficiale dell'ecosistema Symfony/API Platform. Sostituisce Supabase Realtime (websocket).  
**Nota:** Mercure usa SSE (Server-Sent Events), non WebSocket bidirezionale. Per il caso d'uso (notifiche in-app per il barbiere, churn alert, nuove prenotazioni) SSE è sufficiente.  
**DECISIONE DA CONFERMARE:** Se serve bidirezionale (chat, WhatsApp inbox live), valutare Mercure + polling o RabbitMQ + WebSocket.

### D5 — Migrazioni DB: Supabase vs Doctrine
**Scelta attuale:** Le migrazioni Supabase in `supabase/migrations/` restano come riferimento.  
**Problema:** Doctrine genera le proprie migrazioni in `symfony-app/migrations/`. Le due serie NON sono sincronizzate.  
**DECISIONE DA CONFERMARE:** Per la migrazione effettiva, scegliere una di tre strade:
1. **Import diretto** — eseguire le migrazioni Supabase su PostgreSQL self-hosted, poi usare `doctrine:schema:update --dump-sql` per allineare Doctrine allo schema esistente (approccio più rapido)
2. **Doctrine-first** — riscrivere ogni tabella come entità Doctrine, generare migrazioni da zero (più manutenibile a lungo termine)
3. **Ibrido** — importare schema Supabase, generare entità con `doctrine:mapping:import` (deprecato in Doctrine ORM 3, non raccomandato)

### D6 — RLS: da PostgreSQL a livello applicativo
**Scelta attuale:** Nessuna RLS attiva su PostgreSQL self-hosted (Doctrine non usa `auth.uid()`).  
**DECISIONE DA CONFERMARE:** L'isolamento multi-tenant va reimplementato a livello Symfony:
- `TenantAwareListener` che legge `tenant_id` dal JWT e lo setta come parametro globale
- `DoctrineExtension` (API Platform) che filtra ogni query per `tenant_id`
- **OBBLIGATORIO prima del go-live in produzione**

### D7 — Supabase Auth → Symfony Security
**Cosa sostituisce:** Supabase Auth (OTP SMS per clienti, email+password per staff).  
**Con cosa:**
- Staff: email+password → JWT via `lexik/jwt-authentication-bundle`
- Clienti: OTP SMS → **DECISIONE DA CONFERMARE** — serve un bundle SMS OTP o implementazione custom (es. codice random + hash in Redis con TTL)

---

## Cosa manca (prossimi step)

| Priorità | Step | Note |
|---|---|---|
| 🔴 Critico | Entità Doctrine per le 39 tabelle v1 | Da creare in `symfony-app/src/Entity/` |
| 🔴 Critico | Multi-tenant filter (DoctrineExtension) | Isola i dati per `tenant_id` a livello ORM |
| 🔴 Critico | Generazione JWT keypair | `symfony console lexik:jwt:generate-keypair` |
| 🟡 Alto | Implementare OTP SMS per clienti | Sostituisce Supabase Auth OTP |
| 🟡 Alto | API Platform resources e operations | Annotare le entità, configurare RBAC per ruolo |
| 🟡 Alto | Mercure publisher nelle mutation API | Notifiche realtime su create/update appointment |
| 🟡 Alto | Migrazione schema: strategia definitiva (D5) | Decidere Supabase-import vs Doctrine-first |
| 🟢 Medio | Aggiungere MinIO al docker-compose | Sostituisce Supabase Storage (upload logo, foto) |
| 🟢 Medio | CI/CD con GitHub Actions | Build Docker, test, deploy su VPS |
| 🟢 Medio | `doctrine:schema:validate` + pgTAP equivalente | Testing RLS applicativa e policy multi-tenant |
| 🟢 Medio | Stripe webhook endpoint | Per v2 pagamenti online |

---

## Struttura cartelle creata

```
symfony-app/           ← progetto Symfony 7.4
├── config/
│   ├── packages/
│   │   ├── doctrine.yaml       (PostgreSQL 16 configurato)
│   │   ├── api_platform.yaml   (generato da recipe)
│   │   ├── lexik_jwt_authentication.yaml
│   │   └── mercure.yaml
│   └── jwt/                   (vuoto — keypair da generare)
├── src/
│   ├── Entity/                (vuoto — entità da creare)
│   ├── ApiResource/           (vuoto — API Platform resources)
│   └── ...
├── .env                       (DATABASE_URL → PostgreSQL)
├── .env.symfony.example       (template sicuro per tutti gli env)
└── MIGRATION-LOG.md           (questo file)

docker/
├── php/Dockerfile             ← PHP-FPM 8.2 Alpine
└── nginx/default.conf         ← Nginx reverse proxy

docker-compose.yml             ← alla radice del repo (postgres + php + nginx + mercure)
```
