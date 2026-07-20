// Questo file serve /tenant/app/{slug}/manifest.webmanifest via Next.js metadata route.
// Su subdomain ({slug}-app.styll.it), il layout referenzia invece /api/pwa-manifest?slug={slug}
// che è escluso dal proxy e raggiungibile senza doppio-nesting.
// La logica qui è il riferimento canonico — /api/pwa-manifest usa getTenantBySlug (allineato).
import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getTenantBySlug } from '@/lib/tenant'

// Web Manifest supports space-separated purpose tokens; Next's type is stricter.
const ANY_MASKABLE = 'any maskable' as 'any'

export default async function manifest(
  { params }: { params: Promise<{ slug: string }> }
): Promise<MetadataRoute.Manifest> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  // On subdomain routing (e.g. tommy-app.styll.it) the browser URL root is '/'.
  // The manifest scope must match — otherwise iOS exits standalone when navigating.
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const isSubdomain = host.startsWith(`${slug}-app.`)
  const startUrl = isSubdomain ? '/' : `/tenant/app/${slug}`
  const scope = isSubdomain ? '/' : `/tenant/app/${slug}`

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://styll.it')
  ).replace(/\/$/, '')
  const iconBase = `${baseUrl}/api/pwa-icon?slug=${encodeURIComponent(slug)}`

  if (!tenant || tenant.status !== 'active') {
    const defaultIconBase = `${baseUrl}/api/pwa-icon?slug=default&v=0`

    return {
      name: 'App del salone',
      short_name: 'App',
      theme_color: '#1a1a1a',
      background_color: '#1a1a1a',
      display: 'standalone',
      start_url: startUrl,
      scope,
      icons: [
        {
          src: `${defaultIconBase}&size=192`,
          sizes: '192x192',
          type: 'image/png',
          purpose: ANY_MASKABLE,
        },
        {
          src: `${defaultIconBase}&size=512`,
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    }
  }

  const iconVersion = tenant.logo_url
    ? encodeURIComponent(tenant.logo_url).slice(-8)
    : '0'
  const versionedIconBase = `${iconBase}&v=${iconVersion}`

  return {
    id: startUrl,
    name: tenant.business_name,
    short_name: tenant.business_name.length > 12
      ? tenant.business_name.slice(0, 12).trim()
      : tenant.business_name,
    description: `Prenota con ${tenant.business_name}`,
    theme_color: tenant.splash_color ?? tenant.primary_color ?? '#1a1a1a',
    background_color: tenant.splash_color ?? tenant.primary_color ?? '#1a1a1a',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'it',
    start_url: startUrl,
    scope,
    icons: [
      {
        src: `${versionedIconBase}&size=192`,
        sizes: '192x192',
        type: 'image/png',
        purpose: ANY_MASKABLE,
      },
      {
        src: `${versionedIconBase}&size=512`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
