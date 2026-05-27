import { redirect } from 'next/navigation'
import { getProfile, getSubscription, type ProfileData } from '@/lib/actions/profilo'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfiloClient } from '@/components/dashboard/profilo/ProfiloClient'

export const dynamic = 'force-dynamic'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

function selectTenantUrl() {
  return process.env.NODE_ENV === 'development'
    ? '/select-tenant'
    : `https://${ROOT_DOMAIN}/select-tenant`
}

export default async function ProfiloPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const db = createAdminClient()
  const [profile, subscription, staffResult] = await Promise.all([
    getProfile(ctx.profileId),
    getSubscription(),
    db
      .from('staff_members')
      .select('tenant_id')
      .eq('profile_id', ctx.realUserId)
      .eq('is_active', true)
      .is('deleted_at', null),
  ])

  const hasMultipleTenants = (staffResult.data?.length ?? 0) > 1
  const tenantHref = hasMultipleTenants ? selectTenantUrl() : undefined

  let safeProfile: ProfileData
  if (profile) {
    safeProfile = profile
  } else {
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

  return (
    <ProfiloClient
      profile={safeProfile}
      subscription={subscription}
      hasMultipleTenants={hasMultipleTenants}
      selectTenantHref={tenantHref}
    />
  )
}
