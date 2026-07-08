export const DEFAULT_CLIENTI_PAGE_SIZE = 25
export const MAX_CLIENTI_PAGE_SIZE = 100

export type ClientiFilter = 'all' | 'active' | 'warning' | 'danger' | 'inactive'

export interface ClientiCounts {
  all: number
  active: number
  warning: number
  danger: number
  inactive: number
}
