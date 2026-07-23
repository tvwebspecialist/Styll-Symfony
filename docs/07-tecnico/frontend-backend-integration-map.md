# Mappa integrazione frontend Next.js -> backend Symfony

Data ricognizione: 2026-07-21.

Questa mappa e basata sullo stato corrente del working tree, inclusi file non committati gia presenti in `apps/web/src`. Non sono state fatte verifiche runtime contro Supabase o `api.styll.it`: e una analisi statica dei punti in cui il frontend usa Supabase e di cio che oggi risulta modellato/esposto in `symfony-app`.

Numeri chiave:

- `apps/web/src`: 211 file con uso diretto di Supabase (`createClient`, `supabase.auth`, `.from()`, `.storage.from()`, `.rpc()`).
- Tabelle Supabase referenziate dal frontend: 67.
- Bucket Storage referenziati: `avatars`, `products`, `promotions`, `tenants`.
- RPC Supabase/Postgres referenziate: `apply_client_consent_events`, `consume_pending_legal_acceptance`, `create_email_verification_otp`, `decrement_product_inventory`, `get_client_import_candidates`, `get_my_tenant_id`, `get_sales_appointments`, `get_sales_products`, `get_sales_summary`, `recompute_all_client_analytics`.
- `symfony-app/src/Entity`: 55 entity Doctrine.
- API Platform esposta oggi: solo `GetCollection` per `clients`, `client_import_jobs`, `gallery_photos`, `messages_log`, `message_templates`, `notifications`, `portfolio_photos`, `promotion_products`, `promotion_services`, `promotions`, `team_invitations`, `website_photos`.
- Controller manuali Symfony trovati: `BackupController`; auth staff via `/api/login` con JWT Lexik.

## 1. Inventario chiamate Supabase in `apps/web/`

Nota: "Accesso" indica se il file fa solo letture o anche scritture/mutazioni. La classificazione e volutamente funzionale: molti file pagina usano Supabase solo per recuperare sessione/tenant e delegano la logica vera alle server action.

### Auth staff/onboarding (17 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/(auth)/onboarding/actions.ts` | onboarding owner/staff: crea tenant, sedi, servizi, staff, orari | Dashboard staff | lettura+scrittura |
| `app/(auth)/onboarding/complete/page.tsx` | completamento onboarding e redirect dashboard | Dashboard staff | lettura |
| `app/(auth)/onboarding/layout.tsx` | guard SSR onboarding staff | Dashboard staff | lettura |
| `app/(auth)/register/actions.ts` | registrazione staff e reset/verifica email Supabase | Dashboard staff | lettura+scrittura |
| `app/(auth)/select-tenant/page.tsx` | selezione tenant per staff multi-tenant | Dashboard staff | lettura+scrittura |
| `app/auth/callback/route.ts` | callback OAuth/email staff, exchange code, self-heal profilo/staff | Dashboard staff | lettura+scrittura |
| `app/dashboard/layout.tsx` | shell dashboard: risoluzione tenant/sessione | Dashboard staff | lettura |
| `app/invite/page.tsx` | accettazione invito team | Dashboard staff | lettura |
| `app/onboarding/member/actions.ts` | onboarding membro invitato: profilo, sedi, servizi, orari | Dashboard staff | lettura+scrittura |
| `app/onboarding/member/layout.tsx` | guard layout onboarding membro | Dashboard staff | lettura |
| `components/auth/google-button.tsx` | login OAuth Google Supabase | Dashboard staff | scrittura auth |
| `components/auth/login-form.tsx` | login staff email+password Supabase | Dashboard staff | scrittura auth |
| `components/auth/register-form.tsx` | registrazione staff, profilo e avatar | Dashboard staff | lettura+scrittura |
| `lib/admin-shadow-cookie.ts` | cookie shadow mode admin -> tenant | Admin/dashboard | lettura |
| `lib/tenant-context.ts` | risoluzione tenant corrente da sessione/staff/shadow | Shared/API | lettura |
| `lib/tenant-role-guard.ts` | guard ruoli tenant lato server | Shared/API | lettura |
| `proxy.ts` | middleware auth/onboarding/PWA routing | Dashboard staff/PWA | lettura |

### Admin/platform (28 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/admin/actions-content.ts` | gestione contenuti tenant: sedi, servizi, staff, orari | Admin | lettura+scrittura |
| `app/admin/actions-data.ts` | strumenti dati/admin: export, import, reset/cleanup tenant | Admin | lettura+scrittura |
| `app/admin/actions-onboarding.ts` | gestione token onboarding | Admin | lettura+scrittura |
| `app/admin/actions-plans.ts` | piani e sottoscrizioni tenant | Admin | lettura+scrittura |
| `app/admin/actions-system.ts` | settings globali, template email, audit, tenant | Admin | lettura+scrittura |
| `app/admin/actions-tenants.ts` | CRUD tenant e dati collegati | Admin | lettura+scrittura |
| `app/admin/actions-users.ts` | gestione utenti/profili/staff | Admin | lettura+scrittura |
| `app/admin/actions.ts` | sessione superadmin e logout | Admin | lettura+scrittura |
| `app/admin/analytics/page.tsx` | dashboard analytics piattaforma | Admin | lettura |
| `app/admin/layout.tsx` | layout admin, guard superadmin, notifiche piattaforma | Admin | lettura |
| `app/admin/page.tsx` | home admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/analytics/page.tsx` | analytics tenant per admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/layout.tsx` | layout dettaglio tenant admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/locations/page.tsx` | sedi tenant lato admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/page.tsx` | overview tenant admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/products/actions.ts` | prodotti e inventario tenant via admin | Admin | lettura+scrittura |
| `app/admin/tenants/[tenantId]/products/page.tsx` | vista prodotti tenant admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/services/page.tsx` | vista servizi tenant admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/staff/page.tsx` | vista staff tenant admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/subscription/page.tsx` | abbonamento tenant admin | Admin | lettura |
| `app/admin/tenants/[tenantId]/whatsapp/actions.ts` | configurazione integrazione WhatsApp tenant | Admin | lettura+scrittura |
| `app/admin/tenants/[tenantId]/whatsapp/page.tsx` | monitor inbox/webhook WhatsApp tenant | Admin | lettura |
| `app/admin/tenants/[tenantId]/working-hours/page.tsx` | orari tenant lato admin | Admin | lettura |
| `app/admin/tenants/page.tsx` | lista tenant admin | Admin | lettura |
| `app/admin/users/page.tsx` | lista utenti admin | Admin | lettura |
| `components/admin/notification-bell.tsx` | notifiche realtime admin | Admin | lettura |
| `components/admin/skeleton.tsx` | skeleton admin con dipendenza client Supabase | Admin | lettura |
| `lib/admin/site-analytics-queries.ts` | query analytics sito/tenant activity | Admin | lettura |

### Dashboard staff shell (25 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/dashboard/actions/staff-impersonation.ts` | shadow/impersonificazione staff | Dashboard staff | lettura+scrittura |
| `app/dashboard/calendario/CalendarioMobileGiorno.tsx` | calendario mobile, azioni appuntamento | Dashboard staff | lettura+scrittura |
| `app/dashboard/calendario/loading.tsx` | loading calendario con preload dati | Dashboard staff | lettura |
| `app/dashboard/calendario/page.tsx` | pagina calendario dashboard | Dashboard staff | lettura |
| `app/dashboard/catalogo/page.tsx` | pagina catalogo dashboard | Dashboard staff | lettura |
| `app/dashboard/clienti/[id]/page.tsx` | dettaglio cliente dashboard | Dashboard staff | lettura |
| `app/dashboard/clienti/page.tsx` | lista clienti dashboard | Dashboard staff | lettura |
| `app/dashboard/marketing/page.tsx` | pagina marketing dashboard | Dashboard staff | lettura |
| `app/dashboard/page.tsx` | home dashboard | Dashboard staff | lettura |
| `app/dashboard/profilo/page.tsx` | profilo staff dashboard | Dashboard staff | lettura |
| `app/dashboard/vendite/page.tsx` | pagina vendite dashboard | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/analytics/page.tsx` | analytics dashboard su slug tenant | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/calendario/loading.tsx` | loading calendario tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/calendario/page.tsx` | calendario tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/catalogo/page.tsx` | catalogo tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/clienti/[id]/page.tsx` | dettaglio cliente tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/clienti/page.tsx` | lista clienti tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/layout.tsx` | layout dashboard tenant slug, notifiche e profilo | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/marketing/page.tsx` | marketing tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/page.tsx` | home dashboard tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/profilo/page.tsx` | profilo staff tenant slug | Dashboard staff | lettura |
| `app/tenant/dashboard/[slug]/vendite/page.tsx` | vendite tenant slug | Dashboard staff | lettura |
| `components/dashboard/NotificationOnboardingDashboard.tsx` | preferenza/notifica onboarding dashboard | Dashboard staff | lettura+scrittura |
| `components/dashboard/TopBar.tsx` | topbar dashboard e dati sessione | Dashboard staff | lettura |
| `contexts/NotificationCountContext.tsx` | conteggio notifiche realtime | Dashboard staff | lettura |

### Calendario/booking (19 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/tenant/app/[slug]/prenota/data/page.tsx` | step data prenotazione PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/prenota/servizi/page.tsx` | step servizi prenotazione PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/prenota/successo/page.tsx` | successo prenotazione e upsell prodotti | PWA cliente | lettura |
| `components/dashboard/calendario/CalendarioClient.tsx` | UI calendario dashboard | Dashboard staff | lettura |
| `components/dashboard/calendario/CalendarioSubComponents.tsx` | sotto-componenti calendario | Dashboard staff | lettura |
| `components/dashboard/calendario/calendario-utils.ts` | utility calendario con client realtime | Dashboard staff | lettura |
| `components/dashboard/home/CalendarPanel.tsx` | pannello calendario home dashboard | Dashboard staff | lettura |
| `components/dashboard/home/MiniCalendar.tsx` | mini calendario home | Dashboard staff | lettura |
| `components/dashboard/home/TodayCalendarView.tsx` | vista appuntamenti oggi | Dashboard staff | lettura |
| `components/dashboard/home/WeekHeatmap.tsx` | heatmap settimana appuntamenti | Dashboard staff | lettura |
| `components/dashboard/home/WeekStats.tsx` | statistiche settimana calendario | Dashboard staff | lettura |
| `hooks/useRealtimeAppointments.ts` | subscription realtime appuntamenti | Dashboard staff | lettura |
| `lib/actions/appointments.ts` | CRUD appuntamenti dashboard | Shared/API | lettura+scrittura |
| `lib/actions/booking-public.ts` | dati pubblici booking | PWA cliente | lettura |
| `lib/actions/booking-slots.ts` | calcolo slot disponibili | PWA cliente/dashboard | lettura |
| `lib/actions/calendario.ts` | gestione calendario, prodotti appuntamento, decremento inventario | Shared/API | lettura+scrittura |
| `lib/actions/create-booking.ts` | creazione prenotazione PWA/dashboard e notifiche | PWA cliente/dashboard | lettura+scrittura |
| `lib/actions/public-booking.ts` | dati pubblici per booking e landing tenant | PWA cliente | lettura |
| `lib/ai/current-availability-gateway.ts` | disponibilita calendario per AI receptionist | Shared/API | lettura |

### CRM/clienti/privacy (11 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/tenant/app/[slug]/profilo/dati/_components/DataRightsClient.tsx` | richiesta cancellazione/export e logout PWA | PWA cliente | scrittura |
| `app/tenant/app/[slug]/profilo/dati/page.tsx` | pagina dati personali PWA, storico e privacy requests | PWA cliente | lettura |
| `app/tenant/app/[slug]/profilo/modifica/page.tsx` | modifica profilo cliente PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/profilo/preferenze/page.tsx` | preferenze comunicazione/privacy PWA | PWA cliente | lettura |
| `components/clienti/import/ImportWizard.tsx` | import clienti CSV | Dashboard staff | lettura |
| `components/dashboard/clienti/ClientiClient.tsx` | UI lista clienti | Dashboard staff | lettura |
| `lib/actions/client-auth.ts` | auth cliente email/password legacy, merge profilo/CRM | PWA cliente | lettura+scrittura |
| `lib/actions/clienti.ts` | CRUD clienti, note, import, analytics cliente, loyalty | Dashboard staff | lettura+scrittura |
| `lib/actions/dashboard-search.ts` | ricerca dashboard su clienti/appuntamenti/prodotti | Dashboard staff | lettura |
| `lib/actions/pwa-client-actions.ts` | azioni profilo cliente PWA | PWA cliente | lettura+scrittura |
| `lib/client-privacy-rights.ts` | export/cancellazione dati cliente e storage avatar | PWA cliente/admin | lettura+scrittura |

### Loyalty/wishlist (5 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/tenant/app/[slug]/punti/page.tsx` | pagina punti, rewards e transazioni PWA | PWA cliente | lettura |
| `lib/actions/loyalty-settings.ts` | configurazione loyalty, badge, premi, tier | Dashboard staff | lettura+scrittura |
| `lib/actions/loyalty.ts` | calcolo/aggiornamento punti, premi, badge, redemption | Dashboard staff/PWA | lettura+scrittura |
| `lib/actions/wishlist.ts` | wishlist prodotti cliente | PWA cliente | lettura+scrittura |
| `lib/hooks/use-favorite-products.ts` | hook preferiti prodotti | PWA cliente | scrittura |

### Catalogo/prodotti/vendite (11 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/api/promotions/[id]/notify/route.ts` | invio push per promozione | Shared/API | lettura |
| `app/tenant/app/[slug]/prodotti/[productId]/page.tsx` | dettaglio prodotto PWA e wishlist | PWA cliente | lettura |
| `app/tenant/app/[slug]/prodotti/page.tsx` | lista prodotti PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/prodotti/preferiti/page.tsx` | prodotti preferiti PWA | PWA cliente | lettura |
| `components/dashboard/catalogo/CatalogoClient.tsx` | UI catalogo e upload foto prodotto | Dashboard staff | lettura+scrittura |
| `components/dashboard/marketing/OfferForm.tsx` | form promozioni/offerte | Dashboard staff | lettura |
| `lib/actions/catalogo.ts` | CRUD servizi, prodotti, inventario | Dashboard staff | lettura+scrittura |
| `lib/actions/offers.ts` | CRUD promozioni, associazioni prodotti/servizi, upload immagini | Dashboard staff | lettura+scrittura |
| `lib/actions/upsell-action.ts` | upsell prodotti post-booking | PWA cliente | lettura |
| `lib/actions/vendite.ts` | report vendite via RPC | Dashboard staff | lettura |
| `lib/push/promotion-push.ts` | fan-out push notifiche promozione | Shared/API | lettura+scrittura |

### Messaging/marketing/push/AI inbox (27 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/api/push/subscribe/route.ts` | registrazione push subscription staff/cliente | PWA cliente/dashboard | lettura+scrittura |
| `app/api/webhooks/meta-whatsapp/route.ts` | webhook WhatsApp, conversazioni, messaggi, log | Shared/API | lettura+scrittura |
| `app/tenant/app/[slug]/notifiche/page.tsx` | notifiche PWA cliente | PWA cliente | lettura |
| `components/dashboard/marketing/tabs/InboxConversazioni.tsx` | UI inbox conversazioni | Dashboard staff | lettura |
| `components/dashboard/marketing/tabs/Reputazione.tsx` | tab reputazione marketing | Dashboard staff | lettura |
| `lib/actions/client-notifications.ts` | notifiche cliente: lettura e mark-read | PWA cliente | lettura+scrittura |
| `lib/actions/inbox.ts` | query inbox dashboard | Dashboard staff | lettura |
| `lib/actions/marketing-automations.ts` | automazioni marketing | Dashboard staff | lettura |
| `lib/actions/marketing.ts` | campagne/automazioni marketing | Dashboard staff | lettura+scrittura |
| `lib/actions/notifiche.ts` | notifiche staff | Dashboard staff | lettura+scrittura |
| `lib/actions/platform-notifiche.ts` | notifiche piattaforma admin | Admin | lettura+scrittura |
| `lib/actions/send-campaign.ts` | invio campagna e logging notifiche | Dashboard staff | lettura+scrittura |
| `lib/ai/inbound-inbox-ai-runtime.ts` | runtime AI receptionist inbound, persistenza run | Shared/API | lettura+scrittura |
| `lib/ai/inbox-draft-context.ts` | contesto draft AI da inbox/CRM | Shared/API | lettura |
| `lib/ai/inbox-draft-orchestrator.ts` | orchestrazione draft AI e logging run | Shared/API | lettura+scrittura |
| `lib/hooks/use-push-subscription.ts` | hook iscrizione push | PWA cliente/dashboard | lettura |
| `lib/marketing-unsubscribe.ts` | token unsubscribe marketing | PWA cliente/public | lettura+scrittura |
| `lib/messaging/conversation-state-service.ts` | stato conversazioni inbox | Dashboard staff | lettura+scrittura |
| `lib/messaging/db.ts` | client DB messaging | Shared/API | lettura |
| `lib/messaging/inbox-queries.ts` | query conversazioni/messaggi/inbox AI | Dashboard staff | lettura |
| `lib/messaging/internal-inbox-note.ts` | note interne su conversazioni | Dashboard staff | lettura+scrittura |
| `lib/messaging/manual-whatsapp-reply.ts` | risposta manuale WhatsApp e outbox | Dashboard staff | lettura+scrittura |
| `lib/messaging/meta-whatsapp-signature.ts` | verifica firma webhook | Shared/API | scrittura/log |
| `lib/messaging/tenant-resolution.ts` | risoluzione tenant WhatsApp | Shared/API | lettura |
| `lib/notifications-channel.ts` | canale realtime notifiche | Dashboard staff/PWA | lettura |
| `lib/notifications.ts` | helper notifiche | Shared/API | lettura+scrittura |
| `lib/push/send-notification.ts` | invio push e cleanup subscription invalide | Shared/API | lettura+scrittura |

### PWA cliente/auth/home (22 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/api/pwa/privacy/erasure/route.ts` | richiesta cancellazione account PWA e sign-out | PWA cliente | scrittura |
| `app/api/pwa-icon/route.tsx` | icona PWA tenant | PWA cliente | lettura |
| `app/api/pwa-splash/route.tsx` | splash PWA tenant | PWA cliente | lettura |
| `app/tenant/app/[slug]/appuntamenti/page.tsx` | appuntamenti cliente PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/auth/callback/route.ts` | callback OAuth PWA e setup profilo cliente | PWA cliente | lettura+scrittura |
| `app/tenant/app/[slug]/auth/session-transfer/route.ts` | trasferimento sessione PWA/cookie | PWA cliente | lettura |
| `app/tenant/app/[slug]/offerte/[id]/page.tsx` | dettaglio offerta PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/offerte/page.tsx` | lista offerte PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/preferiti/page.tsx` | preferiti PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/privacy/page.tsx` | privacy pubblica tenant | PWA cliente | lettura |
| `app/tenant/app/[slug]/profilo/_components/ProfiloAuthGuard.tsx` | guard profilo PWA con sessione localStorage | PWA cliente | lettura |
| `app/tenant/app/[slug]/profilo/_components/SettingsList.tsx` | menu profilo e logout PWA | PWA cliente | scrittura |
| `app/tenant/app/[slug]/profilo/page.tsx` | home profilo cliente PWA | PWA cliente | lettura |
| `app/tenant/app/[slug]/termini/page.tsx` | termini pubblici tenant | PWA cliente | lettura |
| `components/pwa/PwaOnboarding.tsx` | onboarding PWA installata, preferenze notifiche | PWA cliente | lettura+scrittura |
| `components/pwa/PwaSessionRestorer.tsx` | sync sessione PWA localStorage <-> cookie | PWA cliente | lettura+scrittura |
| `components/pwa/PwaTopBar.tsx` | topbar PWA, tenant e notifiche | PWA cliente | lettura |
| `components/pwa/auth/EmailOtpForm.tsx` | login/signup PWA via email OTP e Google | PWA cliente | scrittura auth |
| `components/pwa/auth/ResetPasswordForm.tsx` | reset password cliente | PWA cliente | scrittura auth |
| `lib/actions/pwa-auth.ts` | OTP telefono/email, verifica, link/creazione cliente | PWA cliente | lettura+scrittura |
| `lib/actions/pwa-home.ts` | home PWA cliente: appuntamenti, loyalty, prodotti | PWA cliente | lettura |
| `lib/supabase/pwa-client.ts` | client Supabase PWA con sessione localStorage | PWA cliente | lettura |

### Media/branding/settings/public site (11 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/api/favicon/route.ts` | favicon dinamica tenant | Public/PWA | lettura |
| `app/api/og/route.tsx` | immagine OpenGraph tenant | Public/PWA | lettura |
| `app/sitemap.ts` | sitemap tenant/public | Public | lettura |
| `components/dashboard/impostazioni/ImpostazioniClient.tsx` | impostazioni branding tenant e upload logo | Dashboard staff | lettura+scrittura |
| `components/dashboard/profilo/ProfiloClient.tsx` | logout/profilo dashboard | Dashboard staff | scrittura auth |
| `hooks/useLandingData.ts` | landing pubblica tenant: sedi, staff, prodotti, servizi, foto | Public/PWA | lettura |
| `lib/actions/app-settings.ts` | settings app/landing e upload media tenant | Dashboard staff | lettura+scrittura |
| `lib/actions/impostazioni.ts` | impostazioni tenant, locations, subscription | Dashboard staff | lettura+scrittura |
| `lib/actions/profilo.ts` | profilo staff, avatar, portfolio, privacy cleanup | Dashboard staff | lettura+scrittura |
| `lib/portfolio-storage.ts` | helper storage portfolio | Dashboard staff | lettura |
| `lib/tenant.ts` | helper tenant pubblico | Public/PWA | lettura |

### Legal/analytics (10 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/api/auth/register/legal-acceptance/consume/route.ts` | consumo accettazione legale registrazione B2B | Dashboard staff | lettura |
| `app/api/cron/recalculate-analytics/handler.ts` | ricalcolo analytics cliente via RPC | Shared/API | lettura |
| `app/api/site-analytics/track/route.ts` | tracking anonimo sessioni/eventi sito | Public/PWA | lettura+scrittura |
| `lib/analytics-consent-server.ts` | consenso analytics lato server | Shared/API | lettura+scrittura |
| `lib/consent-events.ts` | eventi consenso cliente | Shared/API | lettura/RPC |
| `lib/legal/b2b-register-acceptance.ts` | pending/legal acceptance B2B | Dashboard staff | lettura+scrittura |
| `lib/legal/dpa.ts` | DPA/contratti legali | Dashboard staff/admin | lettura+scrittura |
| `lib/legal/public-b2b.ts` | dati legali pubblici B2B | Public | lettura |
| `lib/site-analytics/daily.ts` | analytics giornaliere | Admin/dashboard | lettura |
| `lib/site-analytics/link-session.ts` | link sessione analytics ad auth user | PWA cliente | lettura+scrittura |

### AI/cron/internal (5 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/api/aiuto-chat/route.ts` | endpoint chat aiuto con auth user | Shared/API | lettura |
| `app/api/cron/reminders/route.ts` | cron promemoria appuntamenti/notifiche | Shared/API | lettura+scrittura |
| `app/api/magic-wand/route.ts` | endpoint AI magic wand con auth user | Dashboard staff | lettura |
| `app/api/symfony/backups/[id]/verify/route.ts` | proxy Next verso backup verify Symfony | Admin | lettura |
| `app/api/symfony/backups/route.ts` | proxy Next verso lista backup Symfony | Admin | lettura |

### Shared infra/tests (20 file)

| File | Cosa fa concettualmente | Lato | Accesso |
|---|---|---|---|
| `app/api/admin/onboarding-tokens/generate/route.ts` | generazione token onboarding admin | Admin | lettura+scrittura |
| `app/suspended/page.tsx` | pagina tenant sospeso con sessione | Shared/API | lettura |
| `components/dashboard/team/StaffAvailabilityEditor.tsx` | editor disponibilita staff | Dashboard staff | lettura |
| `components/onboarding/onboarding-shell.tsx` | shell onboarding | Dashboard staff | lettura |
| `lib/actions/dashboard-home.ts` | dati home dashboard | Dashboard staff | lettura |
| `lib/actions/email-verification.ts` | verifica email custom | Shared/API | lettura+scrittura |
| `lib/actions/invitations.ts` | inviti team | Dashboard staff | lettura+scrittura |
| `lib/actions/onboarding-data.ts` | dati di supporto onboarding/PWA | Dashboard/PWA | lettura |
| `lib/actions/platform-leads.ts` | lead piattaforma | Public/admin | lettura+scrittura |
| `lib/actions/team.ts` | team, sedi, servizi, orari staff | Dashboard staff | lettura+scrittura |
| `lib/email-verification.ts` | token/verifica email | Shared/API | lettura+scrittura |
| `lib/email.ts` | invio email con dati tenant/profilo | Shared/API | lettura+scrittura |
| `lib/proxy-auth-guard.test.ts` | test helper auth proxy | Test | lettura |
| `lib/security/bearer-secret.ts` | guard bearer secret | Shared/API | lettura |
| `lib/security/csp.ts` | CSP/security helper | Shared/API | scrittura/logica |
| `lib/supabase/admin.ts` | factory Supabase service-role/admin | Shared/API | lettura |
| `lib/supabase/client.ts` | factory client browser Supabase | Shared/API | lettura |
| `lib/supabase/server.ts` | factory server Supabase cookie-based | Shared/API | lettura |
| `lib/utils/client-import-core.test.ts` | test import clienti | Test | lettura |
| `types/database.types.ts` | tipi generati schema Supabase | Shared/API | lettura |

## 2. Confronto con quello che esiste gia in `symfony-app/`

Sintesi backend:

- Auth: configurazione Symfony `security.yaml` con `/api/login`, `json_login`, provider `App\Entity\User`, JWT Lexik. Questo copre solo email+password su `users.email/password`.
- Multi-tenancy: presenti `TenantFilter`, `TenantContext`, `TenantFilterSubscriber`; il tenant viene risolto dall'utente autenticato/JWT e applicato come filtro Doctrine. Questo e corretto come base server-side, ma non sostituisce ancora i molti helper frontend (`tenant-context`, shadow mode, select-tenant).
- API Platform: le ApiResource rilevate sono solo collection read (`GetCollection`). Non ci sono operazioni `Post`, `Patch`, `Delete`, endpoint custom di comando, endpoint `me`, endpoint booking, endpoint OTP cliente.
- Controller manuali: `BackupController` per report/lista/verifica backup; non copre le aree prodotto.

| Area frontend | Symfony oggi | Completezza reale |
|---|---|---|
| Auth staff/onboarding | `User`, `Profile`, `StaffMember`, `Tenant`, `TeamInvitation`, `/api/login` JWT. `TeamInvitation` e solo `GetCollection`. | Parziale. Login staff base esiste; mancano register, OAuth callback, onboarding tenant/staff, select-tenant, `/me`, cambio password/email, inviti con mutazioni. |
| Admin/platform | Entity presenti per `AdminAuditLog`, `AdminSetting`, `OnboardingToken`, `PlatformNotification`, `Tenant`, `Profile`, `StaffMember`, `BackupRun`; `BackupController` espone backup. | Molto parziale. Backup e isolato; la maggior parte dell'admin non ha endpoint esposti. Mancano entity per `subscription_plans` e `tenant_subscriptions`, usate dall'admin frontend. |
| Dashboard staff shell | Entity di base presenti (`Profile`, `StaffMember`, `Tenant`, `Notification`). | Parziale. Manca un contratto API per tenant context, ruoli, shadow mode, notifiche realtime/mark-read e navigazione multi-tenant. |
| Calendario/booking | Entity presenti: `Appointment`, `AppointmentService`, `AppointmentProduct`, `Location`, `Service`, `StaffMember`, `StaffService`, `WorkingHour`, `WorkingHourOverride`, `ProductInventory`, `Notification`, `NotificationLog`. | Schema quasi tutto presente, endpoint assenti. Mancano API di slot, creazione booking transazionale, update status, soft delete, decremento inventory. Mancano `staff_locations` e `inventory_movements`. |
| CRM/clienti/privacy | `Client` e `ClientImportJob` esposti solo `GetCollection`; entity presenti per `ClientNote`, `ClientPrivacyRequest`, `ClientProductWishlist`, `ClientLoyalty`, `LoyaltyTransaction`, `RewardRedemption`, `Payment`, `AnalyticsConsentEvent`. | Parziale. Lettura collection clienti/import job esiste; mancano detail, create/update/soft-delete clienti, import, note private, privacy export/erasure, link profilo cliente. `client_analytics` e `consent_events` non risultano modellate. |
| Loyalty/wishlist | Entity presenti: `LoyaltyConfig`, `ClientLoyalty`, `LoyaltyTransaction`, `Reward`, `RewardRedemption`, `Badge`, `ClientBadge`, `TierConfig`, `ClientProductWishlist`. | Schema presente ma nessun endpoint/API business. Mancano calcolo punti, redeem, configurazione tenant, wishlist cliente. |
| Catalogo/prodotti/vendite | Entity presenti: `Product`, `ProductInventory`, `Service`, `ServiceCategory`, `Promotion`, `PromotionProduct`, `PromotionService`, `Payment`. `Promotion*` solo `GetCollection`. | Parziale. Promozioni leggibili come collection; prodotti/servizi/inventario/pagamenti non hanno endpoint esposti. Mancano RPC vendite (`get_sales_*`) e API storage/media upload. |
| Messaging/marketing/push/AI inbox | Entity presenti: `MessageLog` e `MessageTemplate` solo `GetCollection`; `MessagingOutbox`, `Notification`, `NotificationLog`, `PushSubscription`, `MarketingUnsubscribeToken` presenti; `Notification` solo `GetCollection`. | Fortemente incompleta. Mancano tabelle/entity ed endpoint per `inbox_conversations`, `inbox_messages`, `inbox_assignments`, `tenant_integrations`, `webhook_events_inbox`, `message_automations`, `inbox_ai_runs`. Nessun webhook Meta/WhatsApp Symfony e nessun runtime AI. |
| PWA cliente/auth/home | Entity `Client`, `Profile`, `Appointment`, `ClientLoyalty`, `Product`, `Reward`, `Promotion`, `Notification` esistono in parte. | Bloccata dall'auth cliente. Non esiste modello OTP cliente ne sessione cliente JWT. Anche le letture PWA richiedono un modo sicuro di mappare JWT cliente -> `clients.profile_id` e tenant. |
| Media/branding/settings/public site | Entity `WebsitePhoto`, `PortfolioPhoto`, `GalleryPhoto` solo `GetCollection`; `Tenant`, `Location`, `Service`, `StaffMember`, `Product` presenti ma quasi non esposti. | Parziale read-only. Mancano upload, signed/public URL strategy, update branding, settings tenant, storage replacement per bucket Supabase. |
| Legal/analytics | Entity presenti per `LegalAcceptanceEvent`, `LegalAcceptancePending`, `AnalyticsConsentEvent`; `EmailVerificationToken`; alcune mancanti per site analytics. | Molto parziale. Mancano endpoint di accettazione legale, DPA, consent-event RPC, tracking site events/sessions/daily. |
| AI/cron/internal | `BackupController` esiste; backup proxy Next gia punta a Symfony. | Solo backup pronto. Cron reminder, magic wand, aiuto chat, inbox AI non hanno equivalenti Symfony. |

Tabelle Supabase usate dal frontend ma non trovate come entity Symfony:

`avatars` (anche bucket Storage), `client_analytics`, `consent_events`, `inbox_ai_runs`, `inbox_assignments`, `inbox_conversations`, `inbox_messages`, `inventory_movements`, `message_automations`, `site_analytics_daily`, `site_events`, `site_sessions`, `staff_locations`, `subscription_plans`, `tenant_activity_log`, `tenant_integrations`, `tenant_subscriptions`, `webhook_events_inbox`.

Bucket Storage Supabase da sostituire o mantenere temporaneamente:

`avatars`, `products`, `promotions`, `tenants`.

## 3. Il problema dell'autenticazione cliente PWA

Il gap principale non e solo "login diverso": e un cambio di identita applicativa.

Oggi la PWA cliente usa Supabase Auth per creare/verificare utenti finali via:

- OTP telefono: `supabase.auth.signInWithOtp({ phone })` e `verifyOtp({ type: 'sms' })`.
- OTP email: `supabase.auth.signInWithOtp({ email, shouldCreateUser: true })` e verifica codice.
- OAuth Google: redirect Supabase e `exchangeCodeForSession`.
- Sessione persistita in localStorage separata (`styll-pwa-session`) piu sync nei cookie per Server Components.
- Link tra auth user e CRM tramite `profiles.id = auth.users.id` e `clients.profile_id = user.id`.

Il backend Symfony, invece, espone solo `/api/login` email+password per `App\Entity\User`, con JWT. Non c'e ancora:

- endpoint per invio/verifica OTP telefono;
- endpoint per invio/verifica OTP email cliente;
- modello token OTP/attempt/rate limit persistente;
- modello refresh token/sessione PWA;
- endpoint Google/OAuth cliente;
- contratto per creare/linkare `Profile` e `Client` dopo verifica;
- distinzione JWT staff vs JWT cliente;
- tenant resolution sicura per cliente PWA (`tenantId` non deve essere trusted dal client);
- meccanismo equivalente al sync localStorage/cookie PWA per i Server Components Next.

### File con dipendenza diretta dal meccanismo OTP/sessione PWA

| File | Dipendenza |
|---|---|
| `lib/actions/pwa-auth.ts` | cuore OTP: `sendOtp`, `verifyOtp`, `sendEmailOtp`, `verifyEmailOtp`, `completeEmailOtpProfile`, creazione/link `clients`, update `profiles`, seed consensi. |
| `components/pwa/auth/EmailOtpForm.tsx` | UI login/signup email OTP, inserimento codice, creazione sessione cookie+localStorage, Google sign-in. |
| `lib/supabase/pwa-client.ts` | client Supabase PWA con sessione persistita in localStorage (`styll-pwa-session`). |
| `components/pwa/PwaSessionRestorer.tsx` | copia sessione PWA localStorage nei cookie e viceversa, gestisce sign-out locale. |
| `app/tenant/app/[slug]/auth/callback/route.ts` | callback OAuth PWA, `exchangeCodeForSession`, setup profilo Google cliente. |
| `app/tenant/app/[slug]/auth/session-transfer/route.ts` | verifica sessione dopo trasferimento cookie. |
| `components/pwa/PwaOnboarding.tsx` | legge user PWA e aggiorna preferenze onboarding/notifiche. |
| `components/pwa/PwaTopBar.tsx` | legge user PWA, tenant e notifiche. |
| `app/tenant/app/[slug]/profilo/_components/ProfiloAuthGuard.tsx` | guard client-side basato su `pwa.auth.getSession()`. |
| `app/tenant/app/[slug]/profilo/_components/SettingsList.tsx` | logout PWA su sessione cookie e localStorage. |
| `app/tenant/app/[slug]/profilo/dati/_components/DataRightsClient.tsx` | cancellazione/export dati e sign-out PWA. |
| `components/pwa/auth/ResetPasswordForm.tsx` | reset password Supabase Auth cliente. |
| `lib/actions/client-auth.ts` | flusso alternativo email+password cliente: `generateLink`, `signInWithPassword`, reset password, merge CRM. |

### File PWA che dipendono a valle da `auth.getUser()`/sessione cliente

Questi non implementano OTP, ma si basano sul fatto che Supabase Auth restituisca un utente cliente valido e che `clients.profile_id` punti a quell'utente:

- `app/tenant/app/[slug]/appuntamenti/page.tsx`
- `app/tenant/app/[slug]/notifiche/page.tsx`
- `app/tenant/app/[slug]/punti/page.tsx`
- `app/tenant/app/[slug]/profilo/page.tsx`
- `app/tenant/app/[slug]/profilo/modifica/page.tsx`
- `app/tenant/app/[slug]/profilo/preferenze/page.tsx`
- `app/tenant/app/[slug]/profilo/dati/page.tsx`
- `app/tenant/app/[slug]/prodotti/page.tsx`
- `app/tenant/app/[slug]/prodotti/[productId]/page.tsx`
- `app/tenant/app/[slug]/prodotti/preferiti/page.tsx`
- `app/tenant/app/[slug]/preferiti/page.tsx`
- `app/tenant/app/[slug]/offerte/page.tsx`
- `app/tenant/app/[slug]/offerte/[id]/page.tsx`
- `app/tenant/app/[slug]/prenota/servizi/page.tsx`
- `app/tenant/app/[slug]/prenota/successo/page.tsx`
- `lib/actions/pwa-home.ts`
- `lib/actions/pwa-client-actions.ts`
- `lib/actions/wishlist.ts`
- `lib/actions/client-notifications.ts`
- `app/api/push/subscribe/route.ts`
- `lib/site-analytics/link-session.ts`

Portata del problema: non basta sostituire una chiamata `signInWithOtp`. Serve progettare un dominio auth cliente completo o mantenere Supabase Auth temporaneamente per la PWA finche Symfony non avra OTP, sessioni e mapping cliente equivalenti.

## 4. Proposta di ordine di migrazione

| Ordine | Area | Complessita | Perche in questo punto | Rischi principali |
|---:|---|---|---|---|
| 0 | Adapter HTTP frontend + convenzioni API | Bassa | Prima di migrare feature serve un client Symfony unico con gestione JWT, errori, base URL e mapping DTO. | Divergenza tipi frontend/backend; doppia gestione token Supabase/JWT durante transizione. |
| 1 | Backup/admin Symfony gia isolato | Bassa | Esistono gia endpoint Symfony backup e proxy Next dedicati; area poco connessa al dominio prodotto. | Solo auth admin/proxy token; basso rischio tenant. |
| 2 | Public tenant/branding/catalogo read-only | Bassa-media | Letture pubbliche PWA/landing hanno poche dipendenze da auth cliente: tenant, sedi, servizi, staff, prodotti visibili, foto, promozioni. | Mancano endpoint per molte entity (`Product`, `Service`, `Location`, `StaffMember`, `Tenant`); serve decidere media/storage. |
| 3 | Auth staff JWT + `/me`/tenant context | Media | Necessario per dashboard. Symfony ha `/api/login`, ma manca il contratto applicativo staff/tenant/ruoli. | Multi-tenancy, shadow mode, select-tenant, refresh token e compatibilita con middleware Next. |
| 4 | Dashboard read-only: home, clienti, calendario, catalogo, loyalty | Media | Dopo auth staff si possono sostituire query di sola lettura senza cambiare workflow. | Filtri tenant/ruoli, shape DTO, performance query aggregate oggi fatte in Supabase/RPC. |
| 5 | Scritture dashboard core: clienti, appuntamenti, catalogo, team, impostazioni | Alta | Sono le operazioni gestionali principali e devono diventare transazionali in Symfony. | Soft delete, snapshot prezzi, decremento inventario, audit, notifiche, concorrenza slot. |
| 6 | Loyalty e vendite business logic | Alta | Dipende da appuntamenti completati, pagamenti, catalogo e clienti gia migrati. | Regole punti/premi, storico immutabile, RPC vendite da sostituire con query/API dedicate. |
| 7 | PWA cliente auth | Alta | E il blocco piu delicato: OTP telefono/email, OAuth, sessione PWA, mapping `Client/Profile`. | Account takeover, SMS pumping, rate limit distribuito, tenant spoofing, migrazione utenti Supabase Auth. |
| 8 | PWA cliente autenticata: profilo, wishlist, appuntamenti, notifiche | Alta | Da fare solo dopo auth cliente o con bridge temporaneo Supabase Auth -> Symfony. | Privacy cliente, `client_notes` mai esposte, data rights, push subscription per utente corretto. |
| 9 | Booking PWA con scrittura Symfony | Alta | Richiede auth cliente opzionale/guest, slot affidabili e transazioni calendario. | Race condition slot, doppie prenotazioni, notifiche, rollback su errori, tenant isolation. |
| 10 | Messaging/WhatsApp/push/AI inbox | Molto alta | E l'area piu incompleta lato Symfony: molte tabelle mancano e il frontend e in evoluzione. | Webhook idempotency, outbox, provider tokens, privacy, AI tool safety, stato conversazione. |
| 11 | Admin completo: piani, sottoscrizioni, system settings, audit | Media-alta | Meglio dopo aver stabilizzato dominio e auth; molte entity/API mancano ma e meno time-critical per cliente finale. | Privilegi superadmin, audit, subscription source of truth. |

Raccomandazione operativa: partire da **public tenant/branding/catalogo read-only** dopo aver creato un piccolo adapter API Symfony. E l'area con rischio minore perche non richiede OTP cliente e non muta dati critici; al tempo stesso obbliga a definire contratti DTO, CORS/cache, gestione errori e media strategy senza toccare subito booking o auth PWA.

