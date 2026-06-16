# Obiettivo della sessione
Completare il sistema notifiche (badge realtime + churn title) e sistemare l'intera infrastruttura PWA: manifest per-tenant su app e dashboard, favicon per-tenant, icona senza bordo bianco. Audit completo del sistema messaggi/email per capire cosa esiste e cosa manca.

## Stato attuale
Badge campanella realtime: chiuso. Manifest PWA app ({slug}-app): chiuso. Manifest dashboard ({slug}-dashboard): chiuso. Favicon/theme-color per-tenant nel dashboard: chiuso. Icona PWA senza bordo bianco: chiuso. Sistema messaggi/email/SMS: solo audit — niente implementato ancora.

## In lavorazione
Audit messaggi completato — risultato: push funzionano (staff e reminder cliente), email solo per verifica codice e inviti team, zero SMS/WA, marketing UI (toggle automatici + bottone Invia) sono mock completi senza backend. Prossimo passo naturale: scegliere quale canale aggiungere (email reminder cliente via Resend, o altro).

## Cosa è cambiato in questa sessione

**Sistema notifiche badge:**
- `NotificationCountContext.tsx` (nuovo): una sola subscription Realtime `notif-badge:{tenantId}`, stato `count + ring` condiviso
- `TopBar`, `TopBarHome`, `TopBarSimple`: usano context, animazione campanella via Web Animations API su nuova notifica
- `MobileTopBar`: semplificato, rimosse props `unreadCount`/`profileId`
- `useNotificationCount.ts`: eliminato (sostituito da context)
- `layout.tsx` dashboard tenant: aggiunto `<NotificationCountProvider>`
- Migration `20260624000001_notifications_realtime.sql`: `REPLICA IDENTITY FULL` + RLS SELECT policy staff + publication (da applicare)

**Manifest PWA:**
- `src/app/api/pwa-manifest/route.ts` (nuovo): manifest per-tenant per app subdomain, usa `getTenantBySlug`, bypassa problema proxy via API route
- `src/app/api/dashboard-manifest/route.ts` (nuovo): stesso pattern per dashboard, `id: styll-dashboard-{slug}`, `background_color: #F5F5F5`
- `tenant/app/[slug]/layout.tsx`: `manifest` ora punta a `/api/pwa-manifest?slug=`, rimosso import `createTenantPaths`
- `tenant/dashboard/[slug]/layout.tsx`: aggiunti `generateMetadata` (manifest, favicon via `/api/favicon`, apple-touch-icon via `/api/pwa-icon`) e `generateViewport` (themeColor per-tenant)
- `tenant/app/[slug]/manifest.ts`: aggiunto commento che spiega perché esiste ancora (fallback route, non più entry point principale)

**PWA icon:**
- `api/pwa-icon/route.tsx`: sfondo bianco → `bgColor` (primary_color), logo 70% → 100% width/height

**Audit messaggi (solo lettura, nessuna modifica):**
- Provider email: Resend, funzioni `sendVerificationCodeEmail` + `sendInvitationEmail` in `src/lib/email.ts`
- `email_templates` in DB: `reminder`/`welcome`/`win_back` esistono ma nessun codice li usa
- `messages_log` e `message_templates`: non esistono nel DB (confermato SQL)
- Cron reminders: solo push, zero email
- Marketing UI: toggle automatici = mock locale (tabella non esiste), bottone Invia = zero handler, "AI" = array hardcoded
- `clients.preferred_contact_channel`: esiste in DB ma non esposto né modificabile nella PWA cliente

## Strade scartate
- **Opzione A (rimuovere manifest.webmanifest dall'exclusion del proxy)**: avrebbe causato 404 su `{slug}-dashboard.styll.it/manifest.webmanifest` (nessun manifest.ts nel dashboard route). Scartato.
- **Opzione B letterale (`/tenant/app/{slug}/manifest.webmanifest` come href)**: proxy double-nesting → 404. Scartato.
- **Due subscription Realtime separate per badge (desktop + mobile)**: stesso Supabase client singleton, potenziale interferenza tra listener. Sostituito con context condiviso.

## Prossimo step
Implementare email reminder cliente usando Resend: aggiungere a `src/lib/email.ts` una funzione `sendReminderEmail({ appointmentId, clientEmail, ... })` che usa il template `reminder` già in DB, e chiamarla dal cron `/api/cron/reminders` in parallelo alla push esistente.

---
Per riprendere: nella prossima chat allega messaggio.md + handoff.md e scrivi "Continua da qui".
