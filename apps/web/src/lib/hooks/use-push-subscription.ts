'use client'

/**
 * Hook per gestire la subscription alle notifiche push nella PWA.
 *
 * Uso:
 *   const { status, subscribe, unsubscribe } = usePushSubscription(tenantId)
 *
 * status: 'loading' | 'unsupported' | 'unavailable' | 'denied' | 'subscribed' | 'not_subscribed'
 */

import { useCallback, useEffect, useState } from 'react'

type PushStatus = 'loading' | 'unsupported' | 'unavailable' | 'denied' | 'subscribed' | 'not_subscribed'

interface PushBootstrapResponse {
  vapidPublicKey?: string
  code?: string
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function fetchPushBootstrap(): Promise<PushBootstrapResponse | null> {
  const res = await fetch('/api/push/subscribe', { cache: 'no-store' })
  const body = await res.json().catch(() => null) as PushBootstrapResponse | null

  if (!res.ok) {
    if (body?.code === 'PUSH_DISABLED' || body?.code === 'PUSH_MISCONFIGURED') {
      return body
    }
    throw new Error('push bootstrap failed')
  }

  return body
}

export function usePushSubscription(tenantId: string | null) {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [sw, setSw] = useState<ServiceWorkerRegistration | null>(null)
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    const perm = Notification.permission
    if (perm === 'denied') {
      setStatus('denied')
      return
    }

    // Registra il service worker e controlla se già subscribed
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (registration) => {
        setSw(registration)
        const bootstrap = await fetchPushBootstrap()
        if (bootstrap?.code === 'PUSH_DISABLED' || bootstrap?.code === 'PUSH_MISCONFIGURED') {
          setStatus('unavailable')
          return
        }

        setVapidPublicKey(bootstrap?.vapidPublicKey ?? null)
        const existing = await registration.pushManager.getSubscription()
        setStatus(existing ? 'subscribed' : 'not_subscribed')
      })
      .catch(() => setStatus('unsupported'))
  }, [tenantId])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!tenantId || !sw) return false

    try {
      const bootstrap = vapidPublicKey
        ? { vapidPublicKey }
        : await fetchPushBootstrap()
      if (!bootstrap?.vapidPublicKey) {
        setStatus('unavailable')
        return false
      }

      // Richiedi il permesso e crea la subscription
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(bootstrap.vapidPublicKey) as unknown as BufferSource,
      })

      // Salva la subscription sul server
      const saveRes = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tenantId, subscription }),
      })

      if (saveRes.ok) {
        setStatus('subscribed')
        return true
      }

      const saveBody = await saveRes.json().catch(() => null) as PushBootstrapResponse | null
      if (saveBody?.code === 'PUSH_DISABLED' || saveBody?.code === 'PUSH_MISCONFIGURED') {
        setStatus('unavailable')
      }

      return false
    } catch {
      const perm = Notification.permission
      if (perm === 'denied') setStatus('denied')
      return false
    }
  }, [tenantId, sw, vapidPublicKey])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!sw) return false

    try {
      const subscription = await sw.pushManager.getSubscription()
      if (!subscription) {
        setStatus('not_subscribed')
        return true
      }

      // Rimuovi dal server
      await fetch('/api/push/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: subscription.endpoint }),
      })

      await subscription.unsubscribe()
      setStatus('not_subscribed')
      return true
    } catch {
      return false
    }
  }, [sw])

  return { status, subscribe, unsubscribe }
}
