// Shared common types

export interface PaginationParams {
  page?: number
  perPage?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  hasMore: boolean
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
}
