'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'
import { trackEvent, type AppSurface } from '@/lib/site-analytics/track'

interface Props {
  tenantId: string
  appSurface: AppSurface
}

export function SiteAnalyticsTracker({ tenantId, appSurface }: Props) {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)
  const { hasConsent } = useAnalyticsConsent()

  useEffect(() => {
    if (!hasConsent) return
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    trackEvent({ tenantId, eventType: 'page_view', appSurface })
  }, [tenantId, pathname, appSurface, hasConsent])

  return null
}
