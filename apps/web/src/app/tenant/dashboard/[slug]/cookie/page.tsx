import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CookiePolicyPage } from '@/components/legal/CookiePolicyPage'
import { createTenantSurfacePaths } from '@/lib/pwa-redirect'
import { getTenantBySlug } from '@/lib/tenant'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  return {
    title: tenant ? `Cookie Policy dashboard | ${tenant.business_name}` : 'Cookie Policy dashboard',
    description: tenant
      ? `Informativa cookie e preferenze analytics per la dashboard di ${tenant.business_name}.`
      : 'Informativa cookie e preferenze analytics per la dashboard.',
  }
}

export default async function TenantDashboardCookiePage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const dashboardPath = await createTenantSurfacePaths('dashboard', slug)
  const privacyHref =
    process.env.NODE_ENV === 'development'
      ? '/privacy'
      : `https://${ROOT_DOMAIN}/privacy`

  return (
    <CookiePolicyPage
      context={{
        kind: 'tenant',
        businessName: tenant.business_name,
        backHref: dashboardPath(''),
        backLabel: '← Torna alla dashboard',
        privacyHref,
      }}
    />
  )
}
