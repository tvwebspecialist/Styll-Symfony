import type { MetadataRoute } from 'next'
import { getTenantBySlug } from '@/lib/tenant'

export default async function manifest({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<MetadataRoute.Manifest> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  const startUrl = `/tenant/landing/${slug}`

  if (!tenant || tenant.status !== 'active') {
    return {
      name: 'Sito del salone',
      short_name: 'Salone',
      display: 'standalone',
      start_url: startUrl,
      scope: startUrl,
      icons: [],
    }
  }

  const shortName =
    tenant.business_name.length > 12
      ? `${tenant.business_name.slice(0, 11)}…`
      : tenant.business_name

  return {
    id: startUrl,
    name: tenant.business_name,
    short_name: shortName,
    theme_color: tenant.primary_color ?? '#1a1a1a',
    background_color: tenant.primary_color ?? '#1a1a1a',
    display: 'standalone',
    start_url: startUrl,
    scope: startUrl,
    icons: tenant.logo_url
      ? [{ src: tenant.logo_url, sizes: '192x192', type: 'image/png' }]
      : [],
  }
}
