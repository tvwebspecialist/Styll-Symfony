'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushSubscription } from '@/lib/hooks/use-push-subscription'

interface Props {
  tenantId: string
}

export function PushNotificationToggle({ tenantId }: Props) {
  const { status, subscribe, unsubscribe } = usePushSubscription(tenantId)

  if (status === 'unsupported') return null

  const isLoading    = status === 'loading'
  const isSubscribed = status === 'subscribed'
  const isDenied     = status === 'denied'
  const isUnavailable = status === 'unavailable'

  async function handleToggle() {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading || isDenied || isUnavailable}
      className="flex w-full items-center justify-between px-5 py-4 disabled:opacity-60"
      aria-label={isSubscribed ? 'Disattiva notifiche' : 'Attiva notifiche'}
    >
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Loader2 className="size-5 animate-spin text-neutral-400" aria-hidden="true" />
        ) : isSubscribed ? (
          <Bell className="size-5 text-green-500" aria-hidden="true" />
        ) : (
          <BellOff className="size-5 text-neutral-400" aria-hidden="true" />
        )}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-neutral-700">
            {isUnavailable
              ? 'Notifiche non disponibili'
              : isDenied
              ? 'Notifiche bloccate'
              : isSubscribed
              ? 'Notifiche attive'
              : 'Attiva notifiche'}
          </span>
          {isUnavailable && (
            <span className="text-xs text-neutral-400">Non attive in questo ambiente</span>
          )}
          {isDenied && (
            <span className="text-xs text-neutral-400">Abilita nelle impostazioni del browser</span>
          )}
          {isSubscribed && (
            <span className="text-xs text-neutral-400">Reminder appuntamenti e conferme</span>
          )}
          {status === 'not_subscribed' && (
            <span className="text-xs text-neutral-400">Ricevi reminder e conferme prenotazioni</span>
          )}
        </div>
      </div>

      {/* Toggle pill */}
      {!isDenied && !isLoading && !isUnavailable && (
        <div
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            isSubscribed ? 'bg-green-500' : 'bg-neutral-200'
          }`}
          aria-hidden="true"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              isSubscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      )}
    </button>
  )
}
