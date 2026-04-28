import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getSubscription, type ProfileData } from '@/lib/actions/profilo'
import { ProfiloClient } from '@/components/dashboard/profilo/ProfiloClient'

export const dynamic = 'force-dynamic'

export default async function ProfiloPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  console.log('profilo user:', user?.id)
  if (!user) redirect('/login')

  const [profile, subscription] = await Promise.all([
    getProfile(user.id),
    getSubscription(),
  ])

  console.log('profilo result:', JSON.stringify(profile))
  console.log('profilo error or null?:', profile === null ? 'NULL' : 'OK')

  const safeProfile: ProfileData = profile ?? {
    id: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    phone: null,
    bio: null,
    language: 'it',
    timezone: 'Europe/Rome',
    notificationPreferences: {},
  }

  return <ProfiloClient profile={safeProfile} subscription={subscription} />
}
