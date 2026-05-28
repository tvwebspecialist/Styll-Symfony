import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.redirect(new URL('/icon.svg', req.url))
  }

  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('logo_url, primary_color, business_name')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (tenant?.logo_url) {
    return NextResponse.redirect(tenant.logo_url, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  }

  // No logo: generate SVG with first letter
  const letter = (tenant?.business_name ?? 'S').charAt(0).toUpperCase()
  const bg = tenant?.primary_color ?? '#0A0A0A'
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
