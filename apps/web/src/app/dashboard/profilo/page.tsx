import { redirect } from 'next/navigation'
import { getProfile, getSubscription, type ProfileData } from '@/lib/actions/profilo'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfiloClient } from '@/components/dashboard/profilo/ProfiloClient'

export const dynamic = 'force-dynamic'

export default async function ProfiloPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const [profile, subscription] = await Promise.all([
    getProfile(ctx.profileId),
    getSubscription(),
  ])

  let safeProfile: ProfileData
  if (profile) {
    safeProfile = profile
  } else {
    const db = createAdminClient()
    const { data: fallback } = await db
      .from('profiles')
      .select('email, full_name, avatar_url')
      .eq('id', ctx.profileId)
      .maybeSingle()
    safeProfile = {
      id: ctx.profileId,
      email: fallback?.email ?? null,
      fullName: fallback?.full_name ?? null,
      avatarUrl: fallback?.avatar_url ?? null,
      phone: null,
      bio: null,
      language: 'it',
      timezone: 'Europe/Rome',
      notificationPreferences: {},
    }
  }

  return <ProfiloClient profile={safeProfile} subscription={subscription} />
}
