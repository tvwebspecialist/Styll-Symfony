/**
 * GET /api/pwa-manifest?slug={slug}
 *
 * Serves the per-tenant Web App Manifest as application/manifest+json.
 *
 * Why this route exists instead of relying on /tenant/app/[slug]/manifest.ts:
 *   The proxy middleware (proxy.ts) rewrites paths on tenant subdomains, e.g.
 *   barber-tomm-app.styll.it/X → /tenant/app/barber-tomm/X. But the matcher
 *   excludes "manifest.webmanifest" from the proxy, so a request to
 *   barber-tomm-app.styll.it/manifest.webmanifest bypasses the rewrite and
 *   lands on the generic root manifest (app/manifest.ts) — wrong tenant.
 *   Using /tenant/app/{slug}/manifest.webmanifest as href would also fail on
 *   subdomain: the proxy would double-nest it.
 *   API routes are explicitly skipped by the proxy, so this path always resolves
 *   directly to this handler regardless of subdomain or dev-mode routing.
 *
 * Mirrors the logic of src/app/tenant/app/[slug]/manifest.ts exactly,
 * including subdomain detection for start_url / scope.
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

  // Mirror the subdomain detection from manifest.ts so start_url / scope are
  // correct: '/' on subdomain, '/tenant/app/{slug}' on path-based routing (dev).
  const host = req.headers.get('host') ?? ''
  const isSubdomain = host.startsWith(`${slug}-app.`)
  const startUrl = isSubdomain ? '/' : `/tenant/app/${slug}`
  const scope    = isSubdomain ? '/' : `/tenant/app/${slug}`

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
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
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
      id: startUrl,
      name: tenant.business_name,
      short_name: shortName,
      description: `Prenota con ${tenant.business_name}`,
      theme_color: tenant.primary_color ?? '#1a1a1a',
      background_color: tenant.primary_color ?? '#1a1a1a',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'it',
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
