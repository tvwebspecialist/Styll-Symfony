import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Styll — La piattaforma per barbieri e parrucchieri'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
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
          position: 'relative',
        }}
      >
        {/* Background decorative circle */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 120,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />

        {/* Logo mark */}
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

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontFamily: 'Arial, sans-serif',
            marginBottom: 20,
          }}
        >
          Styll
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#888888',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 400,
            lineHeight: 1.4,
          }}
        >
          Il tuo negozio. La tua app. I tuoi clienti che tornano.
        </div>

        {/* Bottom tag */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            right: 80,
            fontSize: 18,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          styll.it
        </div>
      </div>
    ),
    { ...size },
  )
}
