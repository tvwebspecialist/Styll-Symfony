import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActiveProfile } from '@/lib/tenant-context'

export default async function DashboardRedirectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('staff_members')
    .select('tenant_id')
    .eq('profile_id', ctx.realUserId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data?.tenant_id) redirect('/onboarding/step-1')

  const { data: tenant } = await db
    .from('tenants')
    .select('slug')
    .eq('id', data.tenant_id)
    .maybeSingle()

  if (!tenant?.slug) redirect('/onboarding/step-1')

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
  redirect(`https://${tenant.slug}-dashboard.${rootDomain}`)
}
