'use client'

import * as React from 'react'

interface PwaSplashProps {
  businessName: string
  primaryColor: string
  logoUrl: string | null
}

export function PwaSplash({ businessName, primaryColor, logoUrl }: PwaSplashProps) {
  const [visible, setVisible] = React.useState(true)
  const [fading, setFading] = React.useState(false)

  React.useEffect(() => {
    // Mostra splash solo in modalità standalone (PWA installata)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!isStandalone) {
      setVisible(false)
      return
    }

    const fadeTimer = setTimeout(() => {
      setFading(true)
    }, 600)

    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, 1000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  const initial = businessName.charAt(0).toUpperCase() || 'S'

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
        gap: 20,
        transition: 'opacity 400ms ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {logoUrl ? (
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={businessName}
            style={{ width: 72, height: 72, objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 48,
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
          fontSize: 20,
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '-0.3px',
          opacity: 0.95,
        }}
      >
        {businessName}
      </span>

      <div
        style={{
          position: 'absolute',
          bottom: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2.5px solid rgba(255,255,255,0.3)',
            borderTopColor: '#FFFFFF',
            animation: 'pwa-spin 0.8s linear infinite',
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          Powered by Styll
        </span>
      </div>

      <style>{`
        @keyframes pwa-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
