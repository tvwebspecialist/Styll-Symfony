import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeImageUrl } from '@/lib/safe-image-url'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('business_name, logo_url, primary_color')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  const bgColor = tenant?.primary_color ?? '#0A0A0A'
  const businessName = tenant?.business_name ?? 'Barbiere'

  // Try to load logo with 2s timeout
  let logoSrc: string | null = null
  const safeLogo = safeImageUrl(tenant?.logo_url)
  if (safeLogo) {
    try {
      const logoFetch = fetch(safeLogo).then(async (r) => {
        if (!r.ok) throw new Error('failed')
        const buf = await r.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
        const ext = safeLogo.split('.').pop()?.toLowerCase()
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
        return `data:${mime};base64,${base64}`
      })
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 2000),
      )
      logoSrc = await Promise.race([logoFetch, timeout])
    } catch {
      // fallback to text avatar
    }
  }

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${bgColor} 0%, #0a0a0a 100%)`,
          padding: '60px 80px',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -60,
            width: 450,
            height: 450,
            borderRadius: '50%',
            background: `${bgColor}33`,
            display: 'flex',
          }}
        />

        {/* Logo or initial avatar */}
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={businessName}
            width={100}
            height={100}
            style={{ borderRadius: 20, objectFit: 'cover', marginBottom: 36 }}
          />
        ) : (
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 52,
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: 36,
            }}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Business name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: 20,
          }}
        >
          {businessName}
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)' }}>
          Prenota il tuo appuntamento online ✂️
        </div>

        {/* Powered by */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            fontSize: 18,
            color: 'rgba(255,255,255,0.3)',
            display: 'flex',
          }}
        >
          styll.it
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  )

  return response
}
