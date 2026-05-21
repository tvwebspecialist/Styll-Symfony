import sharp from 'sharp'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_ICON_SIZE = 192
const MAX_ICON_SIZE = 1024
const FALLBACK_COLOR = '#1A1A1A'
const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800'

type TenantIconRow = {
  business_name: string | null
  primary_color: string | null
  logo_url: string | null
}

function getIconSize(value: string | null) {
  const requestedSize = Number.parseInt(value ?? String(DEFAULT_ICON_SIZE), 10)
  if (!Number.isFinite(requestedSize) || requestedSize <= 0) return DEFAULT_ICON_SIZE
  return Math.min(requestedSize, MAX_ICON_SIZE)
}

function getSafeColor(value: string | null | undefined) {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : FALLBACK_COLOR
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function getTenantIconData(slug: string): Promise<TenantIconRow | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('tenants')
    .select('business_name, primary_color, logo_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  return (data as TenantIconRow | null) ?? null
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return null

    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function renderLogoIcon(logoBuffer: Buffer, size: number) {
  return sharp(logoBuffer)
    .resize(Math.round(size * 0.70), Math.round(size * 0.70), {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .extend({
      top: Math.round(size * 0.15),
      bottom: Math.round(size * 0.15),
      left: Math.round(size * 0.15),
      right: Math.round(size * 0.15),
      background: { r: 255, g: 255, b: 255, alpha: 255 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer()
}

async function renderFallbackIcon(initial: string, size: number, background: string) {
  const fontSize = Math.round(size * 0.48)
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${background}" />
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="800"
        fill="#FFFFFF"
      >${escapeSvgText(initial)}</text>
    </svg>
  `

  return sharp(Buffer.from(svg)).png().toBuffer()
}

function pngResponse(buffer: Buffer) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': CACHE_CONTROL,
    },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const size = getIconSize(searchParams.get('size'))

  if (!slug) {
    return new NextResponse('Missing slug', { status: 400 })
  }

  const tenant = await getTenantIconData(slug)
  const background = getSafeColor(tenant?.primary_color)
  const name = tenant?.business_name?.trim() || 'S'
  const initial = name.charAt(0).toUpperCase()
  const logoBuffer = tenant?.logo_url ? await fetchLogoBuffer(tenant.logo_url) : null

  if (logoBuffer) {
    try {
      return pngResponse(await renderLogoIcon(logoBuffer, size))
    } catch {
      return pngResponse(await renderFallbackIcon(initial, size, background))
    }
  }

  return pngResponse(await renderFallbackIcon(initial, size, background))
}
