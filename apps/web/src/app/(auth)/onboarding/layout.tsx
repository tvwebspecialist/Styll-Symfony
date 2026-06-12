import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Superadmin accounts have no staff_members row — send them to admin panel,
  // not the barbier onboarding wizard.
  const { data: profileMeta } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()

  if ((profileMeta as { is_superadmin?: boolean } | null)?.is_superadmin) {
    redirect('/admin')
  }

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

  // If the user already owns an active tenant, send them to their dashboard.
  // This guards against scenarios where onboarding_completed is null/false for
  // tenants set up before the flag existed, or where a partial run left the flag unset.
  const db = createAdminClient()
  const { data: staffRow } = await db
    .from('staff_members')
    .select('tenant_id')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (staffRow?.tenant_id) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
