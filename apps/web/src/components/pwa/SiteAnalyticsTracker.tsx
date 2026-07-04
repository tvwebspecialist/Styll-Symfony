'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/site-analytics/track'

interface Props {
  tenantId: string
}

export function SiteAnalyticsTracker({ tenantId }: Props) {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    trackEvent({ tenantId, eventType: 'page_view' })
  }, [tenantId, pathname])

  return null
}
