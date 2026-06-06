import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Email/password users must verify their email before onboarding
  const provider = user.app_metadata?.provider as string | undefined
  if (provider === 'email') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified, email')
      .eq('id', user.id)
      .maybeSingle()

    if (profile && !profile.email_verified) {
      const email = encodeURIComponent(profile.email ?? user.email ?? '')
      redirect(`/verifica-email?email=${email}`)
    }
  }

  return <>{children}</>
}
