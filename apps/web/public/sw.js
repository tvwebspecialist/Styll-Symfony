/* ─── Styll PWA Service Worker ──────────────────────────────────────────────
 * Gestisce:
 *  - Ricezione notifiche push
 *  - Click sulle notifiche (apertura app)
 *  - Installazione e attivazione (passthrough)
 * ─────────────────────────────────────────────────────────────────────────── */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/* ─── Push received ─────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Styll', body: event.data.text() }
  }

  const title = payload.title ?? 'Styll'
  const options = {
    body:    payload.body   ?? '',
    icon:    payload.icon   ?? '/icon-192.png',
    badge:   payload.badge  ?? '/icon-192.png',
    tag:     payload.tag    ?? 'styll-notification',
    renotify: true,
    data: {
      url: payload.url ?? '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/* ─── Notification click ────────────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Se la PWA è già aperta, portala in primo piano e naviga
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(targetUrl)
            return
          }
        }
        // Altrimenti apri una nuova finestra
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})
