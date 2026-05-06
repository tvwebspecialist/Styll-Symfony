import type { MetadataRoute } from 'next'
import { getTenantBySlug } from '@/lib/tenant'

export default async function manifest(
  { params }: { params: Promise<{ slug: string }> }
): Promise<MetadataRoute.Manifest> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant) {
    return {
      name: 'Styll',
      short_name: 'Styll',
      display: 'standalone',
      start_url: '/',
      icons: [],
    }
  }

  return {
    name: tenant.business_name,
    short_name: tenant.business_name,
    theme_color: tenant.primary_color,
    background_color: tenant.primary_color,
    display: 'standalone',
    start_url: '/',
    icons: tenant.logo_url
      ? [
          { src: tenant.logo_url, sizes: '192x192', type: 'image/png' },
          { src: tenant.logo_url, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      : [],
  }
}
