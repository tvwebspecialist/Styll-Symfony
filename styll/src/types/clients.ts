import type { Database } from './database'

export type Client = Database['public']['Tables']['clients']['Row']
export type ClientNote = Database['public']['Tables']['client_notes']['Row']
export type ClientConsent = Database['public']['Tables']['client_consents']['Row']
export type ClientAnalytics = Database['public']['Tables']['client_analytics']['Row']

export type ChurnStatus = 'green' | 'yellow' | 'red'

export interface ClientWithAnalytics extends Client {
  analytics?: ClientAnalytics | null
  loyalty?: {
    total_points: number
    available_points: number
    current_tier: string
    current_streak: number
  } | null
}

export interface ClientProfile extends Client {
  analytics?: ClientAnalytics | null
  notes?: ClientNote[]
  consents?: ClientConsent[]
  loyalty?: {
    total_points: number
    available_points: number
    current_tier: string
    current_streak: number
    longest_streak: number
    tier_points_this_year: number
    last_visit_date: string | null
  } | null
  appointmentCount?: number
  lastAppointments?: Array<{
    id: string
    start_time: string
    status: string
    services?: Array<{ name: string; price: number }>
  }>
}

export interface NewClient {
  full_name: string
  phone: string
  email?: string
  date_of_birth?: string
  preferred_contact_channel?: 'push' | 'whatsapp' | 'sms' | 'email'
  tags?: string[]
}
