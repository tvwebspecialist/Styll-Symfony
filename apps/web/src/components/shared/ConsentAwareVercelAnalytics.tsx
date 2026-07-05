'use client'

import { Analytics } from '@vercel/analytics/next'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'

export function ConsentAwareVercelAnalytics() {
  const { hasConsent } = useAnalyticsConsent()

  return hasConsent ? <Analytics /> : null
}
