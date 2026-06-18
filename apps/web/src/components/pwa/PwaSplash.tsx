'use client'

import * as React from 'react'

interface PwaSplashProps {
  businessName: string
  primaryColor: string
  logoUrl: string | null
}

export function PwaSplash({ businessName, primaryColor, logoUrl }: PwaSplashProps) {
  const [phase, setPhase] = React.useState<'visible' | 'exit' | 'gone'>('visible')
  const [logoLoaded, setLogoLoaded] = React.useState(false)
  const [useTextFallback, setUseTextFallback] = React.useState(!logoUrl)

  React.useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (!isStandalone) {
      setPhase('gone')
      return
    }

    // If logo hasn't loaded within 400ms, fall back to initial letter so
    // the splash never shows a blank box for extended periods.
    const logoFallbackTimer = logoUrl
      ? setTimeout(() => { if (!logoLoaded) setUseTextFallback(true) }, 400)
      : undefined

    const exitTimer = setTimeout(() => setPhase('exit'), 600)
    const goneTimer = setTimeout(() => setPhase('gone'), 1000)

    return () => {
      clearTimeout(logoFallbackTimer)
      clearTimeout(exitTimer)
      clearTimeout(goneTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null

  const isExiting = phase === 'exit'
  const initial = businessName.charAt(0).toUpperCase() || 'S'
  const textColor = isLightColor(primaryColor) ? '#111111' : '#FFFFFF'
  const subtextColor = isLightColor(primaryColor) ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: primaryColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: isExiting
          ? 'opacity 500ms cubic-bezier(0.4,0,0.2,1), transform 500ms cubic-bezier(0.4,0,0.2,1)'
          : 'none',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.08)' : 'scale(1)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          animation: 'splashEntry 500ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {logoUrl && !useTextFallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={businessName}
            fetchPriority="high"
            onLoad={() => setLogoLoaded(true)}
            onError={() => setUseTextFallback(true)}
            style={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.10))',
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 96,
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
            fontSize: 22,
            fontWeight: 700,
            color: textColor,
            letterSpacing: '-0.4px',
            opacity: 0.92,
          }}
        >
          {businessName}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: subtextColor,
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          Powered by Styll
        </span>
      </div>

      <style>{`
        @keyframes splashEntry {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}
