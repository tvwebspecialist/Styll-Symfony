export type WorkMode = 'solo' | 'team'

export type BusinessType =
  | 'barbiere'
  | 'parrucchiere'
  | 'salone_misto'
  | 'beauty_center'
  | 'altro'

export type StaffRole = 'staff' | 'manager' | 'receptionist'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  work_mode: WorkMode | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>>

// Forma usata in localStorage durante l'onboarding (non rispecchia 1:1 working_hours).
// day_of_week locale: 0=Lun … 6=Dom. Convertito al salvataggio DB.
export interface OpeningHourRow {
  day_of_week: number
  is_open: boolean
  open_time: string // HH:MM
  close_time: string // HH:MM
}
