import type {
  AnalyticsConsentChoiceSource,
  AnalyticsConsentSurface,
} from './analytics-consent-copy'

export type AnalyticsConsentState = 'accepted' | 'rejected' | 'unknown'

export interface AnalyticsConsentSnapshot {
  anonymousId: string | null
  occurredAt: string | null
  policyVersion: string
  source: AnalyticsConsentChoiceSource | null
  state: AnalyticsConsentState
  surface: AnalyticsConsentSurface | null
}

export function normalizeAnalyticsConsentState(value: string | null | undefined): AnalyticsConsentState {
  if (!value) return 'unknown'
  const normalized = value.trim().toLowerCase()
  if (normalized === 'accepted' || normalized === '1' || normalized === 'true') return 'accepted'
  if (normalized === 'rejected' || normalized === '0' || normalized === 'false') return 'rejected'
  return 'unknown'
}
