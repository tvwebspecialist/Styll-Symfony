import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

function safeColor(value: string | null | undefined): string {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#1A1A1A'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const w = Math.min(parseInt(searchParams.get('w') ?? '1170', 10), 1290)
  const h = Math.min(parseInt(searchParams.get('h') ?? '2532', 10), 2796)

  if (!slug) return new Response('Missing slug', { status: 400 })

  const db = createAdminClient()
  const { data } = await db
    .from('tenants')
    .select('primary_color, splash_color')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  const bgColor = safeColor(data?.splash_color ?? data?.primary_color)

  // Plain solid-color background — no logo, no text.
  // iOS shows this image before the JS splash (BrandedSplash) loads.
  // Matching bgColor to BrandedSplash's splash_color creates a seamless
  // transition: solid color → animated logo appears (no visible "jump").
  return new ImageResponse(
    <div style={{ width: w, height: h, background: bgColor, display: 'flex' }} />,
    {
      width: w,
      height: h,
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
      },
    }
  )
}

