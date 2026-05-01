import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createClient } from '@/lib/supabase/server'

// The proxy middleware already handles the "onboarding_completed → /dashboard"
// redirect for all paths except /onboarding/complete. This layout only needs
// to guard against unauthenticated access.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <>{children}</>
}
