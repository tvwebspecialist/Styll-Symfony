import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CookiePolicyPage } from '@/components/legal/CookiePolicyPage'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  return {
    title: tenant ? `Cookie Policy | ${tenant.business_name}` : 'Cookie Policy',
    description: tenant
      ? `Informativa cookie e preferenze analytics per ${tenant.business_name}.`
      : 'Informativa cookie e preferenze analytics.',
  }
}

export default async function TenantAppCookiePage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tenantPath = await createTenantPaths(slug)

  return (
    <CookiePolicyPage
      context={{
        kind: 'tenant',
        businessName: tenant.business_name,
        backHref: tenantPath(''),
        backLabel: '← Torna all’app',
        privacyHref: tenantPath('/privacy'),
      }}
    />
  )
}
