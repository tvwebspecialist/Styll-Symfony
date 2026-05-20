import type { MetadataRoute } from 'next'
import { getTenantBySlug } from '@/lib/tenant'

export default async function manifest(
  { params }: { params: Promise<{ slug: string }> }
): Promise<MetadataRoute.Manifest> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  const startUrl = `/tenant/app/${slug}`
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://styll.it')
  ).replace(/\/$/, '')
  const iconBase = `${baseUrl}/api/pwa-icon?slug=${encodeURIComponent(slug)}`

  if (!tenant || tenant.status !== 'active') {
    return {
      name: 'Styll',
      short_name: 'Styll',
      display: 'standalone',
      start_url: startUrl,
      scope: startUrl,
      icons: [
        {
          src: `${baseUrl}/api/pwa-icon?slug=default&size=192`,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: `${baseUrl}/api/pwa-icon?slug=default&size=512`,
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    }
  }

  return {
    id: startUrl,
    name: tenant.business_name,
    short_name: tenant.business_name.length > 12
      ? tenant.business_name.slice(0, 12).trim()
      : tenant.business_name,
    description: `Prenota con ${tenant.business_name}`,
    theme_color: tenant.primary_color ?? '#1a1a1a',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'it',
    start_url: startUrl,
    scope: startUrl,
    icons: [
      {
        src: `${iconBase}&size=192`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `${iconBase}&size=512`,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: `${iconBase}&size=512`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${iconBase}&size=180`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
