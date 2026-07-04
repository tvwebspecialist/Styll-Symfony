import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeImageUrl } from '@/lib/safe-image-url'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

async function fetchLogoBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return null
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return `data:${contentType};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

function safeColor(value: string | null | undefined): string {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#1A1A1A'
}

function isLightColorHex(hex: string): boolean {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
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
    .select('business_name, primary_color, splash_color, logo_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  const bgColor = safeColor(data?.splash_color ?? data?.primary_color)
  const name = (data?.business_name ?? 'S').trim()
  const initial = name.charAt(0).toUpperCase()
  const logoUrl = safeImageUrl(data?.logo_url)
  const logoBase64 = logoUrl ? await fetchLogoBase64(logoUrl) : null

  const textColor = isLightColorHex(bgColor) ? '#111111' : '#FFFFFF'
  const subtextColor = isLightColorHex(bgColor) ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'
  const logoDisplaySize = Math.round(w * 0.30)
  const nameFontSize = Math.round(w * 0.052)

  return new ImageResponse(
    (
      <div
        style={{
          width: w,
          height: h,
          background: bgColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Math.round(h * 0.022),
        }}
      >
        {logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoBase64}
            width={logoDisplaySize}
            height={logoDisplaySize}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              fontSize: Math.round(logoDisplaySize * 0.75),
              fontWeight: 800,
              color: textColor,
              lineHeight: 1,
              letterSpacing: '-4px',
            }}
          >
            {initial}
          </span>
        )}

        <span
          style={{
            fontSize: nameFontSize,
            fontWeight: 700,
            color: textColor,
            opacity: 0.92,
            letterSpacing: '-0.02em',
          }}
        >
          {name}
        </span>

        <div
          style={{
            position: 'absolute',
            bottom: Math.round(h * 0.055),
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: Math.round(w * 0.028),
              color: subtextColor,
              fontWeight: 500,
            }}
          >
            Powered by Styll
          </span>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
      },
    }
  )
}

