export const TRIAL_INTENT = 'trial'

export type TrialIntent = typeof TRIAL_INTENT

export function normalizeTrialIntent(value: string | null | undefined): TrialIntent | null {
  const normalized = value?.trim().toLowerCase()
  return normalized === TRIAL_INTENT ? TRIAL_INTENT : null
}

export function readTrialIntent(
  value: string | string[] | null | undefined
): TrialIntent | null {
  if (Array.isArray(value)) {
    return normalizeTrialIntent(value[0] ?? null)
  }

  return normalizeTrialIntent(value)
}

export function buildPathWithTrialIntent(
  path: string,
  intent: string | null | undefined
): string {
  const normalizedIntent = normalizeTrialIntent(intent)
  if (!normalizedIntent) {
    return path
  }

  const url = new URL(path, 'http://styll.local')
  url.searchParams.set('intent', normalizedIntent)

  return `${url.pathname}${url.search}${url.hash}`
}
