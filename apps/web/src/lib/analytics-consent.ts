import {
  type AnalyticsConsentSnapshot,
  type AnalyticsConsentState,
  normalizeAnalyticsConsentState,
} from '@/lib/analytics-consent-shared'
import {
  ANALYTICS_CONSENT_COPY,
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_CONSENT_SOURCE,
  ANALYTICS_CONSENT_SURFACE,
  type AnalyticsConsentChoiceSource,
  type AnalyticsConsentSurface,
} from '@/lib/analytics-consent-copy'

export const ANALYTICS_CONSENT_KEY = 'styll_cookie_consent_v1'
export const ANALYTICS_CONSENT_VERSION_KEY = 'styll_cookie_consent_version_v1'
export const ANALYTICS_CONSENT_CONFIRMED_KEY = 'styll_cookie_consent_confirmed_v1'
export const ANALYTICS_CONSENT_OCCURRED_AT_KEY = 'styll_cookie_consent_occurred_at_v1'
export const ANALYTICS_CONSENT_SOURCE_KEY = 'styll_cookie_consent_source_v1'
export const ANALYTICS_CONSENT_SURFACE_KEY = 'styll_cookie_consent_surface_v1'
export const ANALYTICS_CONSENT_ANON_KEY = 'styll_anon'
export const ANALYTICS_CONSENT_EVENT = 'styll:analytics-consent-changed'

type CacheableAnalyticsConsentState = Exclude<AnalyticsConsentState, 'unknown'>

let syncPromise: Promise<AnalyticsConsentSnapshot> | null = null

function getStoredValue(key: string): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

function setStoredValue(key: string, value: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

function removeStoredValue(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

function dispatchAnalyticsConsentEvent(state: AnalyticsConsentState): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<AnalyticsConsentState>(ANALYTICS_CONSENT_EVENT, {
      detail: state,
    }),
  )
}

function getStoredAnalyticsConsentState(): AnalyticsConsentState {
  return normalizeAnalyticsConsentState(getStoredValue(ANALYTICS_CONSENT_KEY))
}

function isCurrentPolicyVersion(version: string | null): boolean {
  return version === ANALYTICS_CONSENT_POLICY_VERSION
}

function isServerConfirmedCache(): boolean {
  return getStoredValue(ANALYTICS_CONSENT_CONFIRMED_KEY) === '1'
}

function normalizeStoredSource(value: string | null): AnalyticsConsentChoiceSource | null {
  if (!value) return null
  return Object.values(ANALYTICS_CONSENT_SOURCE).includes(value as AnalyticsConsentChoiceSource)
    ? value as AnalyticsConsentChoiceSource
    : null
}

function normalizeStoredSurface(value: string | null): AnalyticsConsentSurface | null {
  if (!value) return null
  return Object.values(ANALYTICS_CONSENT_SURFACE).includes(value as AnalyticsConsentSurface)
    ? value as AnalyticsConsentSurface
    : null
}

function readCachedSnapshot(): AnalyticsConsentSnapshot | null {
  const state = getStoredAnalyticsConsentState()
  const policyVersion = getStoredValue(ANALYTICS_CONSENT_VERSION_KEY)
  if (state === 'unknown' || !isCurrentPolicyVersion(policyVersion) || !isServerConfirmedCache()) {
    return null
  }

  return {
    anonymousId: getStoredValue(ANALYTICS_CONSENT_ANON_KEY),
    occurredAt: getStoredValue(ANALYTICS_CONSENT_OCCURRED_AT_KEY),
    policyVersion: policyVersion ?? ANALYTICS_CONSENT_POLICY_VERSION,
    source: normalizeStoredSource(getStoredValue(ANALYTICS_CONSENT_SOURCE_KEY)),
    state,
    surface: normalizeStoredSurface(getStoredValue(ANALYTICS_CONSENT_SURFACE_KEY)),
  }
}

function cacheAnalyticsConsentSnapshot(
  snapshot: AnalyticsConsentSnapshot,
  {
    confirmed,
  }: {
    confirmed: boolean
  },
): void {
  setAnalyticsConsentCache(snapshot.state, {
    anonymousId: snapshot.anonymousId,
    confirmed,
    occurredAt: snapshot.occurredAt,
    policyVersion: snapshot.policyVersion,
    source: snapshot.source,
    surface: snapshot.surface,
  })
}

function buildUnknownSnapshot(
  anonymousId: string | null,
  {
    occurredAt = null,
    source = null,
    surface = null,
  }: {
    occurredAt?: string | null
    source?: AnalyticsConsentChoiceSource | null
    surface?: AnalyticsConsentSurface | null
  } = {},
): AnalyticsConsentSnapshot {
  return {
    anonymousId,
    occurredAt,
    policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
    source,
    state: 'unknown',
    surface,
  }
}

export function getAnalyticsConsentState(): AnalyticsConsentState {
  return readCachedSnapshot()?.state ?? 'unknown'
}

export function getAnalyticsConsentVersion(): string | null {
  return getStoredValue(ANALYTICS_CONSENT_VERSION_KEY)
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsentState() === 'accepted'
}

export function getAnalyticsAnonymousId(): string {
  if (typeof window === 'undefined') return ''

  let id = window.localStorage.getItem(ANALYTICS_CONSENT_ANON_KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(ANALYTICS_CONSENT_ANON_KEY, id)
  }
  return id
}

function setAnalyticsConsentCache(
  state: AnalyticsConsentState,
  {
    anonymousId,
    confirmed,
    occurredAt,
    policyVersion,
    source,
    surface,
  }: {
    anonymousId?: string | null
    confirmed?: boolean
    occurredAt?: string | null
    policyVersion?: string
    source?: AnalyticsConsentChoiceSource | null
    surface?: AnalyticsConsentSurface | null
  } = {},
): void {
  if (anonymousId) {
    setStoredValue(ANALYTICS_CONSENT_ANON_KEY, anonymousId)
  }

  if (state === 'unknown') {
    removeStoredValue(ANALYTICS_CONSENT_KEY)
    removeStoredValue(ANALYTICS_CONSENT_VERSION_KEY)
    removeStoredValue(ANALYTICS_CONSENT_CONFIRMED_KEY)
    removeStoredValue(ANALYTICS_CONSENT_OCCURRED_AT_KEY)
    removeStoredValue(ANALYTICS_CONSENT_SOURCE_KEY)
    removeStoredValue(ANALYTICS_CONSENT_SURFACE_KEY)
    dispatchAnalyticsConsentEvent('unknown')
    return
  }

  setStoredValue(ANALYTICS_CONSENT_KEY, state)
  setStoredValue(ANALYTICS_CONSENT_VERSION_KEY, policyVersion ?? ANALYTICS_CONSENT_POLICY_VERSION)

  if (confirmed) {
    setStoredValue(ANALYTICS_CONSENT_CONFIRMED_KEY, '1')
  } else {
    removeStoredValue(ANALYTICS_CONSENT_CONFIRMED_KEY)
  }

  if (occurredAt) {
    setStoredValue(ANALYTICS_CONSENT_OCCURRED_AT_KEY, occurredAt)
  } else {
    removeStoredValue(ANALYTICS_CONSENT_OCCURRED_AT_KEY)
  }

  if (source) {
    setStoredValue(ANALYTICS_CONSENT_SOURCE_KEY, source)
  } else {
    removeStoredValue(ANALYTICS_CONSENT_SOURCE_KEY)
  }

  if (surface) {
    setStoredValue(ANALYTICS_CONSENT_SURFACE_KEY, surface)
  } else {
    removeStoredValue(ANALYTICS_CONSENT_SURFACE_KEY)
  }

  dispatchAnalyticsConsentEvent(state)
}

function normalizeServerSnapshot(payload: Partial<AnalyticsConsentSnapshot> | null | undefined): AnalyticsConsentSnapshot {
  return {
    anonymousId: typeof payload?.anonymousId === 'string' ? payload.anonymousId : null,
    occurredAt: typeof payload?.occurredAt === 'string' ? payload.occurredAt : null,
    policyVersion:
      typeof payload?.policyVersion === 'string'
        ? payload.policyVersion
        : ANALYTICS_CONSENT_POLICY_VERSION,
    source: payload?.source ?? null,
    state: normalizeAnalyticsConsentState(payload?.state ?? null),
    surface: payload?.surface ?? null,
  }
}

function getCurrentPathname(): string {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname || '/'
}

async function fetchAnalyticsConsentSnapshot(): Promise<AnalyticsConsentSnapshot | null> {
  if (typeof window === 'undefined') return null

  try {
    const pathname = getCurrentPathname()
    const searchParams = new URLSearchParams({ pathname })
    const response = await fetch(`/api/analytics-consent?${searchParams.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    })

    if (!response.ok) return null
    return normalizeServerSnapshot((await response.json()) as Partial<AnalyticsConsentSnapshot>)
  } catch {
    return null
  }
}

export async function persistAnalyticsConsentChoice(
  state: CacheableAnalyticsConsentState,
  {
    pathname,
    source,
  }: {
    pathname?: string
    source: AnalyticsConsentChoiceSource
  },
): Promise<AnalyticsConsentSnapshot> {
  const anonymousId = getAnalyticsAnonymousId()
  const payload = {
    anonymousId,
    pathname: pathname || getCurrentPathname(),
    source,
    status: state,
  }

  try {
    const response = await fetch('/api/analytics-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`analytics consent save failed: ${response.status}`)
    }

    const snapshot = normalizeServerSnapshot((await response.json()) as Partial<AnalyticsConsentSnapshot>)
    cacheAnalyticsConsentSnapshot(snapshot, { confirmed: true })

    return snapshot
  } catch (error) {
    throw new Error(ANALYTICS_CONSENT_COPY.saveError)
  }
}

export async function syncAnalyticsConsentState(): Promise<AnalyticsConsentSnapshot> {
  if (typeof window === 'undefined') {
    return buildUnknownSnapshot(null)
  }

  if (!syncPromise) {
    syncPromise = (async () => {
      const cachedSnapshot = readCachedSnapshot()
      const localState = getStoredAnalyticsConsentState()
      const localVersion = getAnalyticsConsentVersion()
      const localAnonymousId = getStoredValue(ANALYTICS_CONSENT_ANON_KEY)
      const serverSnapshot = await fetchAnalyticsConsentSnapshot()

      if (serverSnapshot && serverSnapshot.state !== 'unknown') {
        cacheAnalyticsConsentSnapshot(serverSnapshot, { confirmed: true })
        return serverSnapshot
      }

      if (cachedSnapshot) {
        return cachedSnapshot
      }

      if (localVersion && localVersion !== ANALYTICS_CONSENT_POLICY_VERSION) {
        setAnalyticsConsentCache('unknown', { anonymousId: localAnonymousId })
        return buildUnknownSnapshot(localAnonymousId)
      }

      const canBackfillLocalChoice =
        localState !== 'unknown'
        && !isServerConfirmedCache()
        && (localVersion === null || localVersion === ANALYTICS_CONSENT_POLICY_VERSION)

      if (canBackfillLocalChoice) {
        try {
          return await persistAnalyticsConsentChoice(localState, {
            pathname: getCurrentPathname(),
            source: ANALYTICS_CONSENT_SOURCE.LOCAL_STORAGE_MIGRATION,
          })
        } catch {
        }
      }

      if (serverSnapshot) {
        setAnalyticsConsentCache('unknown', {
          anonymousId: serverSnapshot.anonymousId ?? localAnonymousId,
        })
        return serverSnapshot
      }

      setAnalyticsConsentCache('unknown', { anonymousId: localAnonymousId })
      return buildUnknownSnapshot(localAnonymousId)
    })().finally(() => {
      syncPromise = null
    })
  }

  return syncPromise as Promise<AnalyticsConsentSnapshot>
}

export function subscribeAnalyticsConsent(
  listener: (state: AnalyticsConsentState) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleConsentChange = (event: Event) => {
    const detail = (event as CustomEvent<AnalyticsConsentState>).detail
    listener(detail ?? getAnalyticsConsentState())
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== ANALYTICS_CONSENT_KEY) return
    listener(normalizeAnalyticsConsentState(event.newValue))
  }

  window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange)
    window.removeEventListener('storage', handleStorage)
  }
}

export type { AnalyticsConsentState }
