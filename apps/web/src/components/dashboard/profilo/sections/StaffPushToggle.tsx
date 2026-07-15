'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushSubscription } from '@/lib/hooks/use-push-subscription'

interface Props {
  tenantId: string
}

export function StaffPushToggle({ tenantId }: Props) {
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 16px',
        border: '1px solid #F0F0F0',
        borderRadius: 12,
        background: '#FFFFFF',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isLoading ? (
          <Loader2
            size={20}
            style={{ color: '#B0B0B0', flexShrink: 0, animation: 'spin 1s linear infinite' }}
          />
        ) : isSubscribed ? (
          <Bell size={20} style={{ color: '#22C55E', flexShrink: 0 }} />
        ) : (
          <BellOff size={20} style={{ color: '#B0B0B0', flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>
            {isUnavailable
              ? 'Notifiche push non disponibili'
              : isDenied
              ? 'Notifiche push bloccate'
              : isSubscribed
              ? 'Notifiche push attive'
              : 'Attiva notifiche push'}
          </div>
          <div style={{ fontSize: 13, color: '#B0B0B0', marginTop: 2 }}>
            {isUnavailable
              ? 'Questa installazione non espone il canale push'
              : isDenied
              ? 'Abilita nelle impostazioni del browser'
              : isSubscribed
              ? 'Ricevi alert in tempo reale su questo dispositivo'
              : 'Prenotazioni, cancellazioni e alert churn su questo dispositivo'}
          </div>
        </div>
      </div>

      {!isDenied && !isLoading && !isUnavailable && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isLoading}
          aria-label={isSubscribed ? 'Disattiva notifiche push' : 'Attiva notifiche push'}
          style={{
            position: 'relative',
            width: 44,
            height: 24,
            borderRadius: 100,
            background: isSubscribed ? '#222222' : '#E9E9E9',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 150ms ease',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: isSubscribed ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: 100,
              background: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              transition: 'left 150ms ease',
            }}
          />
        </button>
      )}
    </div>
  )
}
