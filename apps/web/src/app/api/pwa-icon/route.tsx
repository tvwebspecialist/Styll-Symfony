import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const DEFAULT_SIZE = 512
const MAX_SIZE = 1024
const FALLBACK_COLOR = '#1A1A1A'

function getSize(value: string | null): number {
  const n = parseInt(value ?? String(DEFAULT_SIZE), 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_SIZE) : DEFAULT_SIZE
}

function safeColor(value: string | null | undefined): string {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : FALLBACK_COLOR
}

async function fetchLogoBase64(url: string): Promise<{ src: string; type: string } | null> {
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
    const base64 = btoa(binary)
    return { src: `data:${contentType};base64,${base64}`, type: contentType }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const size = getSize(searchParams.get('size'))

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

  const logo = logoUrl ? await fetchLogoBase64(logoUrl) : null
  const logoSize = Math.round(size * 0.70)

  return new ImageResponse(
    logo ? (
      <div
        style={{
          width: size,
          height: size,
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          width={logoSize}
          height={logoSize}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ) : (
      <div
        style={{
          width: size,
          height: size,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: Math.round(size * 0.48),
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  )
}
