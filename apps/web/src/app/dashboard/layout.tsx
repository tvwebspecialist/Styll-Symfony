import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveActiveProfile } from '@/lib/tenant-context'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

function selectTenantUrl() {
  return process.env.NODE_ENV === 'development'
    ? '/select-tenant'
    : `https://${ROOT_DOMAIN}/select-tenant`
}

export default async function DashboardRedirectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const db = createAdminClient()
  const { data: staffRows } = await db
    .from('staff_members')
    .select('tenant_id')
    .eq('profile_id', ctx.realUserId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (!staffRows || staffRows.length === 0) redirect('/onboarding/step-1')

  // Multiple tenants → let the user choose
  if (staffRows.length > 1) redirect(selectTenantUrl())

  // Exactly one tenant → redirect directly
  const { data: tenant } = await db
    .from('tenants')
    .select('slug')
    .eq('id', staffRows[0].tenant_id)
    .maybeSingle()

  if (!tenant?.slug) redirect('/onboarding/step-1')

  redirect(`https://${tenant.slug}-dashboard.${ROOT_DOMAIN}`)
}
