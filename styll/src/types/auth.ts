import type { User, Session } from '@supabase/supabase-js'
import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type StaffMember = Database['public']['Tables']['staff_members']['Row']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']

export type UserType = 'staff' | 'client' | 'admin'
export type UserRole = 'owner' | 'manager' | 'staff' | 'receptionist'

export interface AuthUser {
  id: string
  email: string | null
  phone: string | null
}

export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  staffMember: StaffMember | null
  tenantId: string | null
  role: UserRole | null
  userType: UserType | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  fullName: string
  businessName: string
  phone: string
  timezone?: string
}
