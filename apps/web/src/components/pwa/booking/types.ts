export type BookingStep = 'location' | 'staff' | 'service' | 'datetime' | 'confirm' | 'success'

export interface BookingState {
  step: BookingStep
  selectedLocationId: string | null
  selectedStaffId: string | null
  selectedServiceIds: string[]
  selectedDate: string | null
  selectedSlot: string | null
  guestName: string | null
  guestPhone: string | null
}

export interface PublicBookingLocation {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  cover_image_url: string | null
}

export interface PublicBookingStaffMember {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string
  bio: string | null
  service_count: number
  next_available: string | null
}

export interface PublicBookingTenant {
  id: string
  business_name: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  font_family: string | null
  settings: Record<string, unknown> | null
}
