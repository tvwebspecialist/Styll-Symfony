import type { Database } from './database'

export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentService = Database['public']['Tables']['appointment_services']['Row']
export type AppointmentProduct = Database['public']['Tables']['appointment_products']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type WorkingHour = Database['public']['Tables']['working_hours']['Row']
export type WorkingHourOverride = Database['public']['Tables']['working_hour_overrides']['Row']

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type BookingSource = 'pwa' | 'dashboard_staff' | 'dashboard_receptionist' | 'dashboard_owner' | 'walk_in'

export interface AppointmentWithDetails extends Appointment {
  client?: {
    full_name: string
    phone: string
  }
  staff?: {
    id: string
    profile?: {
      full_name: string
      avatar_url: string | null
    }
  }
  services?: Array<AppointmentService & {
    service?: { name: string; duration_minutes: number }
  }>
  products?: Array<AppointmentProduct & {
    product?: { name: string }
  }>
  payment?: Payment | null
}

export interface NewAppointment {
  client_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  service_ids: string[]
  product_ids?: Array<{ product_id: string; quantity: number }>
  notes?: string
  booking_source?: BookingSource
}

export interface TimeSlot {
  start: string
  end: string
  available: boolean
}
