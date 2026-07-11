'use client'

import { Analytics, type BeforeSend } from '@vercel/analytics/next'
import { useCallback, useEffect, useState } from 'react'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'

export function ConsentAwareVercelAnalytics() {
  const { hasConsent, ready } = useAnalyticsConsent()
  const [hasMountedAnalytics, setHasMountedAnalytics] = useState(false)

  useEffect(() => {
    if (hasConsent) {
      setHasMountedAnalytics(true)
    }
  }, [hasConsent])

  const beforeSend = useCallback<BeforeSend>((event) => {
    return hasConsent ? event : null
  }, [hasConsent])

  if (!ready) return null
  if (!hasConsent && !hasMountedAnalytics) return null

  return <Analytics beforeSend={beforeSend} />
}
