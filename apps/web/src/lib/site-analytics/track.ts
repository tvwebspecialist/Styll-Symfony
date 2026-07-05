import { hasAnalyticsConsent } from '@/lib/analytics-consent'

const ANON_KEY = 'styll_anon'

function sanitizeClientReferrer(raw: string): string | null {
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return `${url.origin}${url.pathname}`
  } catch {
    return null
  }
}

export function getCurrentAnonymousId(): string {
  if (typeof window === 'undefined') return ''
  if (!hasAnalyticsConsent()) return ''
  let id = localStorage.getItem(ANON_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ANON_KEY, id)
  }
  return id
}

export type SiteEventType =
  | 'page_view'
  | 'service_view'
  | 'booking_started'
  | 'booking_completed'
  | 'signup_completed'
  | 'login'

export type AppSurface = 'website' | 'pwa'

export interface TrackEventParams {
  tenantId: string
  eventType: SiteEventType
  appSurface: AppSurface
  metadata?: Record<string, unknown>
}

export function trackEvent({ tenantId, eventType, appSurface, metadata }: TrackEventParams): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return

  const anonymousId = getCurrentAnonymousId()
  if (!anonymousId) return
  const payload = JSON.stringify({
    tenant_id: tenantId,
    anonymous_id: anonymousId,
    event_type: eventType,
    app_surface: appSurface,
    page_url: window.location.pathname,
    referrer: sanitizeClientReferrer(document.referrer),
    user_agent: navigator.userAgent,
    metadata: metadata ?? {},
  })

  const url = '/api/site-analytics/track'

  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
  } else {
    fetch(url, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }
}
