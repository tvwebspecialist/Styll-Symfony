'use server'

import { redirect } from 'next/navigation'

import { buildRootAppUrl } from '@/lib/auth/urls'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: buildRootAppUrl('/auth/callback'),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data?.url) {
    redirect(data.url)
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Email non valida' }
  }
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildRootAppUrl('/auth/reset-password'),
  })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function checkOnboardingStatus(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return null
  return data as unknown as Profile | null
}
