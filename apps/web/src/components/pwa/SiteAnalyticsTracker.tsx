'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent, type AppSurface } from '@/lib/site-analytics/track'

interface Props {
  tenantId: string
  appSurface: AppSurface
}

export function SiteAnalyticsTracker({ tenantId, appSurface }: Props) {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    trackEvent({ tenantId, eventType: 'page_view', appSurface })
  }, [tenantId, pathname, appSurface])

  return null
}
