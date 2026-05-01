export type ChurnStatus = 'unknown' | 'green' | 'yellow' | 'red'

export interface ClientAnalyticsRow {
  client_id: string
  tenant_id: string
  total_visits: number
  avg_frequency_days: number | null
  last_visit_date: string | null
  days_since_last_visit: number | null
  churn_status: ChurnStatus
  computed_at: string
  updated_at: string
}

/**
 * Calcolo client-side equivalente alla SQL `recompute_client_analytics`.
 * Usalo SOLO come fallback (es. preview UI) — la verità sta in client_analytics.
 */
export function computeChurnStatus(
  avgFrequencyDays: number | null,
  daysSinceLastVisit: number | null,
): ChurnStatus {
  if (avgFrequencyDays == null || daysSinceLastVisit == null) return 'unknown'
  if (daysSinceLastVisit <= avgFrequencyDays) return 'green'
  if (daysSinceLastVisit <= avgFrequencyDays * 1.5) return 'yellow'
  return 'red'
}

export const CHURN_LABEL: Record<ChurnStatus, string> = {
  unknown: 'Nuovo',
  green:   'Attivo',
  yellow:  'In ritardo',
  red:     'A rischio',
}

export const CHURN_COLOR: Record<ChurnStatus, string> = {
  unknown: '#9ca3af',
  green:   '#10b981',
  yellow:  '#f59e0b',
  red:     '#ef4444',
}

export function churnMessage(
  fullName: string,
  a: Pick<ClientAnalyticsRow, 'churn_status' | 'days_since_last_visit' | 'avg_frequency_days'>,
): string {
  const days = a.days_since_last_visit ?? 0
  const avg = a.avg_frequency_days ? Math.round(a.avg_frequency_days) : null
  switch (a.churn_status) {
    case 'red':
      return `${fullName} non viene da ${days} giorni${avg ? ` (di solito ogni ${avg})` : ''}.`
    case 'yellow':
      return `${fullName} sta tardando: ${days} giorni${avg ? ` vs ${avg} di media` : ''}.`
    case 'green':
      return `${fullName} è in regola con la sua frequenza.`
    default:
      return `${fullName} è un cliente nuovo, dati insufficienti.`
  }
}
