/**
 * GET /api/dashboard-manifest?slug={slug}
 *
 * Serves the per-tenant Web App Manifest for the staff dashboard
 * ({slug}-dashboard.styll.it) as application/manifest+json.
 *
 * Same routing rationale as /api/pwa-manifest: API routes are skipped by
 * the proxy middleware, so this path resolves directly to this handler on
 * both the dashboard subdomain and in dev/path-based routing — no double-nesting.
 *
 * Mirrors /api/pwa-manifest exactly, with dashboard-specific:
 *   - start_url / scope: '/' on subdomain, '/tenant/dashboard/{slug}' in dev
 *   - id: 'styll-dashboard-{slug}' (distinct from the client PWA manifest id)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return new NextResponse('Missing slug', { status: 400 })
  }

  const tenant = await getTenantBySlug(slug)

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://styll.it')
  ).replace(/\/$/, '')

  const host = req.headers.get('host') ?? ''
  const isSubdomain = host.startsWith(`${slug}-dashboard.`)
  const startUrl = isSubdomain ? '/' : `/tenant/dashboard/${slug}`
  const scope    = isSubdomain ? '/' : `/tenant/dashboard/${slug}`

  const headers = {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  }

  if (!tenant || tenant.status !== 'active') {
    const fallbackBase = `${baseUrl}/api/pwa-icon?slug=default&v=0`
    return new NextResponse(
      JSON.stringify({
        name: 'Styll',
        short_name: 'Styll',
        theme_color: '#222222',
        background_color: '#F5F5F5',
        display: 'standalone',
        start_url: startUrl,
        scope,
        icons: [
          { src: `${fallbackBase}&size=192`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: `${fallbackBase}&size=512`, sizes: '512x512', type: 'image/png' },
        ],
      }),
      { headers }
    )
  }

  const iconVersion = tenant.logo_url
    ? encodeURIComponent(tenant.logo_url).slice(-8)
    : '0'
  const iconBase = `${baseUrl}/api/pwa-icon?slug=${encodeURIComponent(slug)}&v=${iconVersion}`

  const shortName =
    tenant.business_name.length > 12
      ? tenant.business_name.slice(0, 12).trim()
      : tenant.business_name

  return new NextResponse(
    JSON.stringify({
      id: `styll-dashboard-${slug}`,
      name: tenant.business_name,
      short_name: shortName,
      description: `Dashboard gestionale di ${tenant.business_name}`,
      theme_color: tenant.primary_color ?? '#222222',
      background_color: '#F5F5F5',
      display: 'standalone',
      orientation: 'portrait-primary',
      lang: 'it',
      categories: ['business', 'productivity'],
      start_url: startUrl,
      scope,
      icons: [
        { src: `${iconBase}&size=192`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: `${iconBase}&size=512`, sizes: '512x512', type: 'image/png' },
      ],
    }),
    { headers }
  )
}
