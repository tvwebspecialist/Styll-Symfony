# Obiettivo della sessione
Costruire l'intero sistema notifiche di Styll: in-app (centro notifiche), push Web Push lato staff, e cron ricalcolo churn. Partendo da zero dati reali, arrivare a notifiche funzionanti su tutti e 5 gli eventi (new_booking, cancellation, reschedule, new_client, churn_alert).

## Stato attuale
Sistema notifiche quasi completo. Chiuso: tabella `notifications` alimentata su tutti i 5 eventi, centro notifiche dashboard collegato ai dati reali, badge TopBar reale, cron `recalculate-analytics` (06:00 UTC), infrastruttura push staff (subscribe endpoint, StaffPushToggle, preferenze). Aperto: **verifica push staff su dispositivo reale** — ultimo fix (await diretto vs after()) ancora da testare con deploy su Vercel.

## In lavorazione
Debug push staff non recapitata. Il problema era fire-and-forget in Vercel Lambda: `sendPushToStaff` veniva lanciata senza await e la Lambda veniva congelata prima che completasse. Fix applicato: `insertStaffNotification` ora `async/await` diretto in tutti i caller (create-booking.ts, pwa-client-actions.ts, recalculate-analytics/route.ts). I log diagnostici `[push/staff] start/done` sono ancora nel codice per verificare il primo run post-deploy.

## Cosa è cambiato in questa sessione

**Sistema notifiche in-app:**
- `src/lib/notifications.ts`: `insertStaffNotification` + `abbrevName` + mapping type→pref key + `sendPushToStaff`
- `src/lib/actions/notifiche.ts` (nuovo): `getNotifications`, `getUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`
- `NotificheClient.tsx`: dati reali, mock rimossi, tipi aggiornati (reschedule icon ArrowRightLeft)
- `notifiche/page.tsx`: ora carica dati server-side e passa a client
- `TopBar.tsx`, `TopBarHome.tsx`, `TopBarSimple.tsx`, `MobileTopBar.tsx`: badge reale da layout (admin client count query), `MOCK_UNREAD_COUNT` rimosso ovunque

**Push staff:**
- `/api/push/subscribe`: validazione estesa a staff_members (non solo clienti)
- `StaffPushToggle.tsx` (nuovo): toggle push nella sezione Notifiche del profilo
- `Notifiche.tsx`: aggiunta voce `appt_reschedule`, embed `StaffPushToggle`, prop `tenantId`
- `ProfiloClient.tsx`: legge `tenantId` da `useTenantContext()`, lo passa a Notifiche
- `send-notification.ts`: error logging migliorato (statusCode + body FCM)

**Cron analytics + churn:**
- `src/app/api/cron/recalculate-analytics/route.ts` (nuovo): riusa `recompute_all_client_analytics()` SQL esistente
- `vercel.json`: aggiunto schedule `0 6 * * *` (prima del reminder alle 7:00)
- `DATABASE.md`: sezione "Calcolo Silent Churn Detector" + soglie 1.0x/1.5x + nota scalabilità sendPushToStaff

**Notifiche generate su eventi:**
- `create-booking.ts`: new_booking, new_client, reschedule (Path B con IIFE await)
- `pwa-client-actions.ts`: cancellation, reschedule (Path A in-place)
- `recalculate-analytics/route.ts`: churn_alert su peggioramenti (green/unknown→yellow/red, yellow→red)

**Fix fire-and-forget Lambda:**
- `insertStaffNotification` ora `async` + `await sendPushToStaff()` in try/catch
- `after()` da next/server tentato ma rimosso (log mostravano `[push/staff] start` senza `done` → Lambda congelata prima del completamento)
- Tutti i caller aggiornati con `await`

## Strade scartate
- **`after()` da `next/server`**: loggava `[push/staff] start` ma mai `done` — Vercel Lambda congelava prima che after() completasse il lavoro registrato. Rimosso.
- **`@vercel/functions` waitUntil**: non installato, non percorso.
- **`recalculate_client_analytics()` funzione custom**: creata per errore prima di scoprire `recompute_all_client_analytics()` già esistente con soglie 1.0x/1.5x. Droppata via migration.
- **Loop riga-per-riga JS per churn analytics**: scartato in favore di RPC SQL esistente.

## Prossimo step
Deploya su Vercel, attiva il push toggle dalla dashboard staff, crea una prenotazione di test dalla PWA cliente, e verifica nei Function log di Vercel la sequenza completa: `[push/staff] start` → `[push/staff] done { sent: 1 }` → push ricevuta sul dispositivo. Se `sent: 0` → fare re-subscribe (il vecchio token FCM potrebbe essere scaduto).

---
Per riprendere: nella prossima chat allega messaggio.md + handoff.md e scrivi "Continua da qui".
