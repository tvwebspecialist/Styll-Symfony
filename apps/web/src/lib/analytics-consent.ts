import {
  ANALYTICS_CONSENT_ANON_COOKIE,
  ANALYTICS_CONSENT_CACHE_COOKIE,
  ANALYTICS_CONSENT_CACHE_VERSION_COOKIE,
  ANALYTICS_CONSENT_COOKIE_MAX_AGE_SECONDS,
  type AnalyticsConsentSnapshot,
  type AnalyticsConsentState,
  normalizeAnalyticsConsentState,
} from '@/lib/analytics-consent-server'
import {
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_CONSENT_SOURCE,
  type AnalyticsConsentChoiceSource,
} from '@/lib/analytics-consent-copy'

export const ANALYTICS_CONSENT_KEY = 'styll_cookie_consent_v1'
export const ANALYTICS_CONSENT_VERSION_KEY = 'styll_cookie_consent_version_v1'
export const ANALYTICS_CONSENT_PENDING_SYNC_KEY = 'styll_cookie_consent_pending_sync_v1'
export const ANALYTICS_CONSENT_ANON_KEY = 'styll_anon'
export const ANALYTICS_CONSENT_EVENT = 'styll:analytics-consent-changed'

type CacheableAnalyticsConsentState = Exclude<AnalyticsConsentState, 'unknown'>

type SyncResult = AnalyticsConsentSnapshot & {
  pendingSync: boolean
}

let syncPromise: Promise<SyncResult> | null = null

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

export function getAnalyticsConsentState(): AnalyticsConsentState {
  return normalizeAnalyticsConsentState(getStoredValue(ANALYTICS_CONSENT_KEY))
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
    pendingSync,
    policyVersion,
  }: {
    anonymousId?: string | null
    pendingSync?: boolean
    policyVersion?: string
  } = {},
): void {
  if (state === 'unknown') {
    removeStoredValue(ANALYTICS_CONSENT_KEY)
    removeStoredValue(ANALYTICS_CONSENT_VERSION_KEY)
    removeStoredValue(ANALYTICS_CONSENT_PENDING_SYNC_KEY)
    dispatchAnalyticsConsentEvent('unknown')
    return
  }

  setStoredValue(ANALYTICS_CONSENT_KEY, state)
  setStoredValue(ANALYTICS_CONSENT_VERSION_KEY, policyVersion ?? ANALYTICS_CONSENT_POLICY_VERSION)

  if (anonymousId) {
    setStoredValue(ANALYTICS_CONSENT_ANON_KEY, anonymousId)
  }

  if (pendingSync) {
    setStoredValue(ANALYTICS_CONSENT_PENDING_SYNC_KEY, '1')
  } else {
    removeStoredValue(ANALYTICS_CONSENT_PENDING_SYNC_KEY)
  }

  dispatchAnalyticsConsentEvent(state)
}

function readPendingSyncFlag(): boolean {
  return getStoredValue(ANALYTICS_CONSENT_PENDING_SYNC_KEY) === '1'
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

async function fetchAnalyticsConsentSnapshot(): Promise<AnalyticsConsentSnapshot | null> {
  if (typeof window === 'undefined') return null

  try {
    const response = await fetch('/api/analytics-consent', {
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
): Promise<SyncResult> {
  const anonymousId = getAnalyticsAnonymousId()
  const payload = {
    anonymousId,
    pathname:
      pathname
      || (typeof window !== 'undefined' ? window.location.pathname : '/'),
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
    setAnalyticsConsentCache(snapshot.state, {
      anonymousId: snapshot.anonymousId,
      pendingSync: false,
      policyVersion: snapshot.policyVersion,
    })

    return {
      ...snapshot,
      pendingSync: false,
    }
  } catch {
    setAnalyticsConsentCache(state, {
      anonymousId,
      pendingSync: true,
      policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
    })

    return {
      anonymousId,
      occurredAt: null,
      policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
      source,
      state,
      surface: null,
      pendingSync: true,
    }
  }
}

export async function syncAnalyticsConsentState(): Promise<SyncResult> {
  if (typeof window === 'undefined') {
    return {
      anonymousId: null,
      occurredAt: null,
      pendingSync: false,
      policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
      source: null,
      state: 'unknown',
      surface: null,
    }
  }

  if (!syncPromise) {
    syncPromise = (async () => {
      const localState = getAnalyticsConsentState()
      const localVersion = getAnalyticsConsentVersion()
      const localAnonymousId = getStoredValue(ANALYTICS_CONSENT_ANON_KEY)
      const pendingSync = readPendingSyncFlag()
      const serverSnapshot = await fetchAnalyticsConsentSnapshot()

      if (serverSnapshot && serverSnapshot.state !== 'unknown') {
        setAnalyticsConsentCache(serverSnapshot.state, {
          anonymousId: serverSnapshot.anonymousId,
          pendingSync: false,
          policyVersion: serverSnapshot.policyVersion,
        })

        return {
          ...serverSnapshot,
          pendingSync: false,
        }
      }

      const canBackfillLocalChoice =
        localState !== 'unknown'
        && (localVersion === null || localVersion === ANALYTICS_CONSENT_POLICY_VERSION || pendingSync)

      if (canBackfillLocalChoice) {
        return persistAnalyticsConsentChoice(localState, {
          pathname: window.location.pathname,
          source: ANALYTICS_CONSENT_SOURCE.LOCAL_STORAGE_MIGRATION,
        })
      }

      if (localVersion && localVersion !== ANALYTICS_CONSENT_POLICY_VERSION) {
        setAnalyticsConsentCache('unknown')
      }

      return {
        anonymousId: serverSnapshot?.anonymousId ?? localAnonymousId ?? null,
        occurredAt: serverSnapshot?.occurredAt ?? null,
        pendingSync: false,
        policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
        source: serverSnapshot?.source ?? null,
        state: 'unknown' as AnalyticsConsentState,
        surface: serverSnapshot?.surface ?? null,
      }
    })().finally(() => {
      syncPromise = null
    })
  }

  return syncPromise as Promise<SyncResult>
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

export {
  ANALYTICS_CONSENT_ANON_COOKIE,
  ANALYTICS_CONSENT_CACHE_COOKIE,
  ANALYTICS_CONSENT_CACHE_VERSION_COOKIE,
  ANALYTICS_CONSENT_COOKIE_MAX_AGE_SECONDS,
}
export type { AnalyticsConsentState }
