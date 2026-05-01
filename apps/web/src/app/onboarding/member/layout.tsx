import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createClient } from '@/lib/supabase/server'

export default async function MemberOnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Tenant validation will be done in each page
  return <>{children}</>
}
