import { redirect } from 'next/navigation'
import {
  getOptionalSymfonyStaffMe,
  listSymfonyStaffMemberships,
} from '@/lib/symfony/staff-context'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

function selectTenantUrl() {
  return process.env.NODE_ENV === 'development'
    ? '/select-tenant'
    : `https://${ROOT_DOMAIN}/select-tenant`
}

function dashboardUrl(slug: string) {
  return process.env.NODE_ENV === 'development'
    ? `/?_tenant_slug=${slug}&_tenant_type=dashboard`
    : `https://${slug}-dashboard.${ROOT_DOMAIN}`
}

export default async function DashboardRedirectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const me = await getOptionalSymfonyStaffMe()
  if (!me) redirect('/login')

  const memberships = listSymfonyStaffMemberships(me)
  if (memberships.length === 0) redirect('/onboarding/step-1')

  // Multiple tenants → let the user choose
  if (memberships.length > 1) redirect(selectTenantUrl())

  redirect(dashboardUrl(memberships[0].tenant.slug))
}
