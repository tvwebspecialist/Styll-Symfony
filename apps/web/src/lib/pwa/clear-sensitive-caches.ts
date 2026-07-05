'use client'

const CLEAR_SENSITIVE_CACHES = { type: 'CLEAR_SENSITIVE_CACHES' } as const

export async function clearSensitivePwaCaches(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  let registration: ServiceWorkerRegistration | null = null
  try {
    registration = await navigator.serviceWorker.ready
  } catch {
    return
  }

  const target =
    navigator.serviceWorker.controller ??
    registration.active ??
    registration.waiting ??
    registration.installing

  if (!target) return

  await new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    const timer = window.setTimeout(resolve, 1500)

    channel.port1.onmessage = () => {
      window.clearTimeout(timer)
      resolve()
    }

    try {
      target.postMessage(CLEAR_SENSITIVE_CACHES, [channel.port2])
    } catch {
      window.clearTimeout(timer)
      resolve()
    }
  })
}
