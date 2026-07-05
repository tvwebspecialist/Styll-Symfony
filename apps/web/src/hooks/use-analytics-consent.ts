'use client'

import { useEffect, useState } from 'react'
import {
  getAnalyticsConsentState,
  subscribeAnalyticsConsent,
  type AnalyticsConsentState,
} from '@/lib/analytics-consent'

export function useAnalyticsConsent(): {
  state: AnalyticsConsentState
  hasConsent: boolean
} {
  const [state, setState] = useState<AnalyticsConsentState>('unknown')

  useEffect(() => {
    setState(getAnalyticsConsentState())
    return subscribeAnalyticsConsent(setState)
  }, [])

  return {
    state,
    hasConsent: state === 'accepted',
  }
}
