'use client'

const ANON_KEY = 'styll_anon'

export function getCurrentAnonymousId(): string {
  if (typeof window === 'undefined') return ''
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

export interface TrackEventParams {
  tenantId: string
  eventType: SiteEventType
  metadata?: Record<string, unknown>
}

export function trackEvent({ tenantId, eventType, metadata }: TrackEventParams): void {
  if (typeof window === 'undefined') return

  const anonymousId = getCurrentAnonymousId()
  const payload = JSON.stringify({
    tenant_id: tenantId,
    anonymous_id: anonymousId,
    event_type: eventType,
    page_url: window.location.pathname,
    referrer: document.referrer || null,
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
