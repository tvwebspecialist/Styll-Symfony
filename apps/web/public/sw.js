/* ─── Styll PWA Service Worker ──────────────────────────────────────────────
 * Gestisce:
 *  - Offline-first runtime caching (app shell, API Supabase, asset, font)
 *  - Ricezione notifiche push
 *  - Click sulle notifiche (apertura app)
 *  - Installazione e attivazione
 *
 * NOTA: il caching è DISATTIVATO in sviluppo (localhost) per evitare problemi
 * di cache durante lo sviluppo; le push restano attive anche in dev.
 * Le Cache Storage sono per-origin → ogni sottodominio tenant (slug-app.styll.it)
 * ha cache isolate, nessun leakage cross-tenant.
 * ─────────────────────────────────────────────────────────────────────────── */

const IS_DEV =
  self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

const OFFLINE_URL = '/offline'
const PRECACHE = 'styll-offline-v2'
const PAGES_CACHE = 'styll-pages'

// Runtime caches (nomi allineati alle strategie richieste).
const RUNTIME_CACHE_NAMES = [
  PRECACHE,
  PAGES_CACHE,
  'next-static',
  'supabase-api',
  'tenant-assets',
  'google-fonts-css',
  'google-fonts-files',
]

/* ─── Install: skipWaiting + precache pagina offline ────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (!IS_DEV) {
        try {
          const cache = await caches.open(PRECACHE)
          await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))
        } catch {
          /* offline durante l'install: la pagina verrà cachata alla prima visita */
        }
      }
      await self.skipWaiting()
    })(),
  )
})

/* ─── Activate: clients.claim + navigation preload + cleanup cache vecchie ──── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (!IS_DEV && 'navigationPreload' in self.registration) {
        try {
          await self.registration.navigationPreload.enable()
        } catch {
          /* non supportato: si procede senza preload */
        }
      }
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => !RUNTIME_CACHE_NAMES.includes(k)).map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

/* ─── Helpers caching ───────────────────────────────────────────────────────── */

// Salva la response aggiungendo un timestamp per l'expiration (solo per response
// leggibili: le opaque/non-ok vengono salvate as-is senza controllo età).
async function putWithTimestamp(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  if (response.type === 'opaque' || !response.ok) {
    try {
      await cache.put(request, response.clone())
    } catch {
      /* ignore */
    }
    return
  }
  try {
    const cloned = response.clone()
    const headers = new Headers(cloned.headers)
    headers.set('x-sw-cached-at', Date.now().toString())
    const body = await cloned.blob()
    await cache.put(
      request,
      new Response(body, { status: cloned.status, statusText: cloned.statusText, headers }),
    )
  } catch {
    try {
      await cache.put(request, response.clone())
    } catch {
      /* ignore */
    }
  }
}

function isExpired(response, maxAgeSeconds) {
  if (!maxAgeSeconds) return false
  const ts = response.headers.get('x-sw-cached-at')
  if (!ts) return false
  return Date.now() - Number(ts) > maxAgeSeconds * 1000
}

async function trimCache(cacheName, maxEntries) {
  if (!maxEntries) return
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  // FIFO: cache.keys() conserva l'ordine di inserimento.
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)))
}

async function getFreshFromCache(cacheName, request, maxAgeSeconds) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (!cached) return null
  if (isExpired(cached, maxAgeSeconds)) {
    cache.delete(request)
    return null
  }
  return cached
}

function fetchWithTimeout(request, timeoutSeconds) {
  if (!timeoutSeconds) return fetch(request)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network-timeout')), timeoutSeconds * 1000)
    fetch(request).then(
      (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function cacheFirst(event, cfg) {
  const { request } = event
  const cached = await getFreshFromCache(cfg.cacheName, request, cfg.maxAgeSeconds)
  if (cached) return cached
  const network = await fetch(request)
  if (network && (network.ok || network.type === 'opaque')) {
    event.waitUntil(
      putWithTimestamp(cfg.cacheName, request, network).then(() =>
        trimCache(cfg.cacheName, cfg.maxEntries),
      ),
    )
  }
  return network
}

async function networkFirst(event, cfg) {
  const { request } = event
  try {
    const network = await fetchWithTimeout(request, cfg.networkTimeoutSeconds)
    if (network && network.ok) {
      event.waitUntil(
        putWithTimestamp(cfg.cacheName, request, network).then(() =>
          trimCache(cfg.cacheName, cfg.maxEntries),
        ),
      )
      return network
    }
    const cached = await getFreshFromCache(cfg.cacheName, request, cfg.maxAgeSeconds)
    return cached ?? network
  } catch {
    const cached = await getFreshFromCache(cfg.cacheName, request, cfg.maxAgeSeconds)
    if (cached) return cached
    return Response.error()
  }
}

async function staleWhileRevalidate(event, cfg) {
  const { request } = event
  const cache = await caches.open(cfg.cacheName)
  const cached = await cache.match(request)
  const revalidate = fetch(request)
    .then(async (network) => {
      if (network && (network.ok || network.type === 'opaque')) {
        await putWithTimestamp(cfg.cacheName, request, network)
        await trimCache(cfg.cacheName, cfg.maxEntries)
      }
      return network
    })
    .catch(() => null)

  if (cached && !isExpired(cached, cfg.maxAgeSeconds)) {
    event.waitUntil(revalidate)
    return cached
  }
  const network = await revalidate
  return network ?? cached ?? Response.error()
}

// Navigazioni (HTML): NetworkFirst con fallback alla pagina cachata, poi /offline.
// Permette al cliente di rivedere offline l'ultima pagina visitata (es. i suoi
// appuntamenti) e, in mancanza, una pagina di cortesia brandizzata.
async function handleNavigation(event) {
  try {
    const preload = await event.preloadResponse
    const network = preload || (await fetch(event.request))
    if (network && network.ok) {
      event.waitUntil(
        putWithTimestamp(PAGES_CACHE, event.request, network).then(() =>
          trimCache(PAGES_CACHE, 50),
        ),
      )
    }
    return network
  } catch {
    const pages = await caches.open(PAGES_CACHE)
    const cachedPage = await pages.match(event.request)
    if (cachedPage) return cachedPage
    const precache = await caches.open(PRECACHE)
    const fallback = await precache.match(OFFLINE_URL)
    return fallback || Response.error()
  }
}

/* ─── Fetch router ──────────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  if (IS_DEV) return // nessun caching in sviluppo

  const { request } = event

  // Solo GET: mutazioni (POST/PUT/DELETE), server actions e auth restano sempre
  // sulla rete e non vengono mai cachate.
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return

  const isSupabase = url.hostname.endsWith('.supabase.co')

  // Le risposte di autenticazione non devono MAI venire dalla cache.
  if (isSupabase && url.pathname.startsWith('/auth/v1/')) return

  // Navigazioni (documenti HTML).
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
    return
  }

  // App shell: asset statici Next.js — CacheFirst (filename con hash → immutabili).
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/')) {
    event.respondWith(
      cacheFirst(event, {
        cacheName: 'next-static',
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    )
    return
  }

  // API Supabase REST — NetworkFirst, timeout 3s, fallback cache 5 min.
  if (isSupabase && url.pathname.startsWith('/rest/')) {
    event.respondWith(
      networkFirst(event, {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 3,
        maxEntries: 50,
        maxAgeSeconds: 60 * 5,
      }),
    )
    return
  }

  // Asset tenant (logo/immagini Supabase Storage) — StaleWhileRevalidate.
  if (isSupabase && url.pathname.startsWith('/storage/')) {
    event.respondWith(
      staleWhileRevalidate(event, {
        cacheName: 'tenant-assets',
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    )
    return
  }

  // Google Fonts CSS (Playfair/Montserrat) — StaleWhileRevalidate.
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(event, { cacheName: 'google-fonts-css' }))
    return
  }

  // Google Fonts file binari — CacheFirst, 1 anno.
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      cacheFirst(event, {
        cacheName: 'google-fonts-files',
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    )
    return
  }

  // Tutto il resto: passthrough (nessun respondWith → comportamento di rete normale).
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
