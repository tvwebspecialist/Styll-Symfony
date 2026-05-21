import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const w = Math.min(parseInt(searchParams.get('w') ?? '1170', 10), 1290)
  const h = Math.min(parseInt(searchParams.get('h') ?? '2532', 10), 2796)

  if (!slug) return new Response('Missing slug', { status: 400 })

  const db = createAdminClient()
  const { data } = await db
    .from('tenants')
    .select('business_name, primary_color, logo_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  const bgColor = safeColor(data?.primary_color)
  const name = (data?.business_name ?? 'S').trim()
  const initial = name.charAt(0).toUpperCase()
  const logoUrl = data?.logo_url ?? null
  const logoBase64 = logoUrl ? await fetchLogoBase64(logoUrl) : null

  const logoSize = Math.round(w * 0.28)
  const fontSize = Math.round(w * 0.055)

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
          gap: Math.round(h * 0.025),
        }}
      >
        {logoBase64 ? (
          <div
            style={{
              width: logoSize,
              height: logoSize,
              borderRadius: Math.round(logoSize * 0.22),
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoBase64}
              width={Math.round(logoSize * 0.75)}
              height={Math.round(logoSize * 0.75)}
              style={{ objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: logoSize,
              height: logoSize,
              borderRadius: Math.round(logoSize * 0.22),
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: Math.round(logoSize * 0.52),
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {initial}
            </span>
          </div>
        )}

        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: '#FFFFFF',
            opacity: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          {name}
        </span>

        <div
          style={{
            position: 'absolute',
            bottom: Math.round(h * 0.06),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: Math.round(w * 0.03),
              color: 'rgba(255,255,255,0.4)',
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
