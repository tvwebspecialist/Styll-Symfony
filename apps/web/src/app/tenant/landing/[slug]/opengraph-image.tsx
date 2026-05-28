import { ImageResponse } from 'next/og'
import { getTenantBySlug } from '@/lib/tenant'

export const runtime = 'edge'
export const alt = 'Prenota online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function TenantOgImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug).catch(() => null)

  // Fallback to generic Styll image if tenant not found
  if (!tenant || tenant.status !== 'active') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            background: '#0A0A0A',
            padding: '72px 80px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              background: '#FFFFFF',
              borderRadius: 16,
              marginBottom: 48,
              color: '#0A0A0A',
              fontSize: 40,
              fontWeight: 700,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#FFFFFF',
              fontFamily: 'Arial, sans-serif',
              marginBottom: 20,
            }}
          >
            Styll
          </div>
          <div style={{ fontSize: 28, color: '#888888', fontFamily: 'Arial, sans-serif' }}>
            Prenota su Styll
          </div>
        </div>
      ),
      { ...size },
    )
  }

  const primary = tenant.primary_color ?? '#0A0A0A'
  const businessName = tenant.business_name

  // Try to load logo with 2s timeout
  let logoData: string | null = null
  if (tenant.logo_url) {
    try {
      const logoFetch = fetch(tenant.logo_url).then((r) => {
        if (!r.ok) throw new Error('logo fetch failed')
        return r.arrayBuffer()
      })
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 2000),
      )
      const buf = await Promise.race([logoFetch, timeout])
      const base64 = Buffer.from(buf as ArrayBuffer).toString('base64')
      // detect content type from URL extension
      const ext = tenant.logo_url.split('.').pop()?.toLowerCase()
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      logoData = `data:${mime};base64,${base64}`
    } catch {
      // logo load failed — fall through to text avatar
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: `linear-gradient(135deg, ${primary}CC 0%, #0a0a0a 100%)`,
          padding: '72px 80px',
          position: 'relative',
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -40,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `${primary}22`,
          }}
        />

        {/* Logo or initial avatar */}
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoData}
            alt={businessName}
            width={100}
            height={100}
            style={{ borderRadius: 20, objectFit: 'cover', marginBottom: 40 }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 100,
              height: 100,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              color: '#FFFFFF',
              fontSize: 52,
              fontWeight: 700,
              fontFamily: 'Arial, sans-serif',
              marginBottom: 40,
            }}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Business name */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontFamily: 'Arial, sans-serif',
            marginBottom: 20,
          }}
        >
          {businessName}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Prenota su Styll
        </div>
      </div>
    ),
    { ...size },
  )
}
