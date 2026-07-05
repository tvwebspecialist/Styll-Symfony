export const ANALYTICS_CONSENT_KEY = 'styll_cookie_consent_v1'
export const ANALYTICS_CONSENT_EVENT = 'styll:analytics-consent-changed'

export type AnalyticsConsentState = 'accepted' | 'rejected' | 'unknown'

function normalizeAnalyticsConsent(value: string | null): AnalyticsConsentState {
  if (!value) return 'unknown'

  const normalized = value.trim().toLowerCase()

  if (normalized === 'accepted' || normalized === '1' || normalized === 'true') {
    return 'accepted'
  }

  if (normalized === 'rejected' || normalized === '0' || normalized === 'false') {
    return 'rejected'
  }

  return 'unknown'
}

export function getAnalyticsConsentState(): AnalyticsConsentState {
  if (typeof window === 'undefined') return 'unknown'
  return normalizeAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_KEY))
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsentState() === 'accepted'
}

export function setAnalyticsConsentState(
  state: Exclude<AnalyticsConsentState, 'unknown'>
): void {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, state)
  window.dispatchEvent(
    new CustomEvent<Exclude<AnalyticsConsentState, 'unknown'>>(
      ANALYTICS_CONSENT_EVENT,
      { detail: state }
    )
  )
}

export function subscribeAnalyticsConsent(
  listener: (state: AnalyticsConsentState) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleConsentChange = (
    event: Event
  ) => {
    const detail = (event as CustomEvent<AnalyticsConsentState>).detail
    listener(detail ?? getAnalyticsConsentState())
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== ANALYTICS_CONSENT_KEY) return
    listener(normalizeAnalyticsConsent(event.newValue))
  }

  window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange)
    window.removeEventListener('storage', handleStorage)
  }
}
