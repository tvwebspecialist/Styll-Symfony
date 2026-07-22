import { NextRequest, NextResponse } from 'next/server'
import { safeImageUrl } from '@/lib/safe-image-url'
import { fetchSymfonyPublicTenant } from '@/lib/symfony/public-client'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.redirect(new URL('/icon.svg', req.url))
  }

  let tenant:
    | {
        logoUrl: string | null
        primaryColor: string | null
        businessName: string
      }
    | null = null

  try {
    tenant = await fetchSymfonyPublicTenant(slug)
  } catch {
    tenant = null
  }

  const safeLogo = safeImageUrl(tenant?.logoUrl)
  if (safeLogo) {
    return NextResponse.redirect(safeLogo, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  }

  // No logo: generate SVG with first letter
  const letter = (tenant?.businessName ?? 'S').charAt(0).toUpperCase()
  const bg = tenant?.primaryColor ?? '#0A0A0A'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <text x="32" y="45" text-anchor="middle" font-size="36" font-weight="700"
    font-family="system-ui,sans-serif" fill="white">${letter}</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
