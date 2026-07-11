'use client'

import { useEffect, useState } from 'react'
import {
  getAnalyticsConsentState,
  syncAnalyticsConsentState,
  subscribeAnalyticsConsent,
  type AnalyticsConsentState,
} from '@/lib/analytics-consent'

export function useAnalyticsConsent(): {
  state: AnalyticsConsentState
  hasConsent: boolean
  ready: boolean
} {
  const [state, setState] = useState<AnalyticsConsentState>('unknown')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setState(getAnalyticsConsentState())

    const unsubscribe = subscribeAnalyticsConsent((nextState) => {
      if (!cancelled) {
        setState(nextState)
      }
    })

    syncAnalyticsConsentState()
      .then((snapshot) => {
        if (!cancelled) {
          setState(snapshot.state)
          setReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState(getAnalyticsConsentState())
          setReady(true)
        }
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return {
    state,
    hasConsent: ready && state === 'accepted',
    ready,
  }
}
