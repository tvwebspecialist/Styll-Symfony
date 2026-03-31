import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../config/supabase'
import type { AuthState, UserRole, UserType } from '../types/auth'
import type { Profile, StaffMember } from '../types/auth'

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUserData = async (currentUser: User) => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        // If staff, load staff member record
        if (profileData.user_type === 'staff') {
          const { data: staffData } = await supabase
            .from('staff_members')
            .select('*')
            .eq('profile_id', currentUser.id)
            .is('deleted_at', null)
            .eq('is_active', true)
            .limit(1)
            .single()

          if (staffData) {
            setStaffMember(staffData)
          }
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadUserData(s.user)
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, s: Session | null) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          await loadUserData(s.user)
        } else {
          setProfile(null)
          setStaffMember(null)
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setStaffMember(null)
  }

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: 'Non autenticato' }
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
    if (!error && profile) {
      setProfile({ ...profile, ...data })
    }
    return { error: error?.message ?? null }
  }

  const tenantId = staffMember?.tenant_id ?? null
  const role = staffMember?.role as UserRole | null
  const userType = profile?.user_type as UserType | null

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        staffMember,
        tenantId,
        role,
        userType,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
