# Obiettivo della sessione
Costruire l'intera infrastruttura email/push di Styll: dal building block `sendTemplatedEmail` fino al routing intelligente push-vs-email per ogni evento (reminder, booking, post-visita, loyalty), con popup onboarding notifiche e toggle UI funzionanti.

## Stato attuale
Tutto il sistema notifiche cliente è implementato lato codice. Mancano le SQL migration da eseguire manualmente (vedi sotto) e il test end-to-end su device reale. Win-back automatico e churn alert verso clienti (non staff) non toccati.

## In lavorazione
Nessuna feature a metà — tutto ciò che è stato iniziato è stato chiuso. Le uniche cose "aperte" sono operative: eseguire le SQL, fare smoke test.

## Cosa è cambiato in questa sessione

**Infrastruttura email (`src/lib/email.ts`):**
- `buildEmailHtml(body, tenant?)` — layout HTML email branded, email-safe, header gradient primary_color, footer Styll
- `sendTemplatedEmail({ to, templateSlug, variables, tenant })` — legge template da DB, interpola `{{variabili}}`, invia via Resend. Subject interpolato. Fail-safe: variabile mancante → lascia `{{var}}` visibile.

**SQL manuale (NON ancora eseguito — da fare come prossimo step):**
- `CREATE TABLE message_automations (tenant_id, type, enabled, UNIQUE(tenant_id,type))` con RLS
- INSERT 6 template in `email_templates`: `booking_confirmed`, `post_visit_thanks`, `review_request`, `loyalty_points`, `loyalty_streak`, `loyalty_reward`

**Cron reminders (`/api/cron/reminders/route.ts`):**
- Riscritto: 2 funzioni separate (push + email) → unica `processReminderWindow` per tipo
- `getNotificationChannel` determina canale per ogni cliente — mai push + email per lo stesso evento
- Per-tenant cache per `getAutomationEnabled('reminder_1d')` — rispetta toggle Marketing UI
- Log unificato: type `'reminder_3d'` per entrambi i canali (NOT IN include `'reminder_3d_email'` per migration safety)

**Booking confermato (`create-booking.ts`):**
- `sendBookingConfirmedPush` + `sendBookingConfirmedEmail` → unica `sendBookingConfirmedNotification`
- Guest (profile_id null) → sempre email; utente PWA con push attiva → solo push

**Post-visita + recensione (`calendario.ts`, `sendPostVisitNotifications`):**
- `getNotificationChannel` una volta → `post_visit_thanks` push O email; `review_request` sempre email (nessun push equivalente), solo se `social_links.google_reviews` valorizzato

**Loyalty (`loyalty.ts`, `sendLoyaltyNotifications`):**
- Canale determinato una volta, subs caricati una volta, riusati per punti + streak + reward
- Streak: soglia minima 3; Reward: `points_cost > oldTotal AND <= newTotal ORDER DESC LIMIT 1`

**Marketing automations (`src/lib/actions/marketing-automations.ts` nuovo):**
- `getAutomationEnabled(tenantId, type)` — default `true` se riga assente

**Marketing UI (`marketing.ts` + `Messaggi.tsx`):**
- `getMessagesData` legge da `message_automations` + `notification_log`; 6 toggle (3 messaggi + 3 loyalty)
- `toggleAutomation` fa upsert reale; `Messaggi.tsx` rimosso DEFAULT_CARDS e defaultToggles

**`getNotificationChannel` (`src/lib/notifications-channel.ts` nuovo):**
- `'push'` se `push_accepted: true` + subscription attiva; `'none'` se esplicitamente rifiutato; `'email'` altrimenti
- Usato in cron, booking, calendario, loyalty

**Popup onboarding notifiche:**
- `NotificationOnboarding.tsx` (PWA): standalone mode + `push_prompted !== true` + ≥1 appuntamento → popup GSAP, salva `push_prompted`/`push_accepted` in `profiles.notification_preferences`
- `NotificationOnboardingDashboard.tsx` (dashboard): stesso pattern, contenuto per staff, senza check appuntamenti
- PWA layout: wrapper `position: relative; min-height: 100dvh` → popup usa `position: absolute`
- Dashboard layout: popup con `position: fixed`
- GSAP da CDN con graceful degradation

## Strade scartate
- **Due log separati per push/email (`reminder_3d` + `reminder_3d_email`)**: eliminati a favore di log unificato per tipo — evita doppio invio, più pulito
- **`position: fixed` nel popup PWA**: evitato (rompe iframe height nel preview shell) — usato `position: absolute` dentro wrapper `relative`
- **Tabler Icons**: non installato, usato lucide-react (già in codebase) per i bullet del popup
- **Server action `updateNotificationPreferences` per dashboard popup**: usa session cookie che non è disponibile nel browser client dashboard — aggiornamento diretto via `createClient()` browser

## Prossimo step
Eseguire le due SQL migration pendenti (CREATE TABLE `message_automations` + INSERT 6 template in `email_templates`), poi fare smoke test: booking da PWA → verificare ricezione push O email (non entrambe) a seconda dello stato subscription del cliente.

---
Per riprendere: nella prossima chat allega messaggio.md + handoff.md e scrivi "Continua da qui".
