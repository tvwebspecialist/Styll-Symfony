'use client'

import * as React from 'react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

// ─── CSS keyframes (scoped via class prefix "bs-") ────────────────────────────
// Easings chosen to match PwaOnboarding GSAP easings:
//   back.out(1.8)  → cubic-bezier(0.34, 1.56, 0.64, 1)   (overshoot bounce)
//   power3.out     → cubic-bezier(0.215, 0.61, 0.355, 1)
//   sine.inOut     → cubic-bezier(0.45, 0.05, 0.55, 0.95)
//   power2.in      → cubic-bezier(0.55, 0, 1, 0.45)

const KEYFRAMES = `
  @keyframes bs-bounce-in {
    0%   { opacity: 0; transform: scale(0.62); }
    60%  { opacity: 1; transform: scale(1.07); }
    80%  { transform: scale(0.96); }
    100% { opacity: 1; transform: scale(1);    }
  }
  @keyframes bs-float {
    0%, 100% { transform: translateY(0px);  }
    50%       { transform: translateY(-7px); }
  }
  @keyframes bs-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes bs-exit {
    from { opacity: 1; transform: scale(1);    }
    to   { opacity: 0; transform: scale(1.08); }
  }
  @keyframes bs-ring {
    0%   { transform: scale(1);   opacity: 0;    }
    12%  { opacity: 0.18; }
    100% { transform: scale(2.1); opacity: 0;    }
  }
  @keyframes bs-ring2 {
    0%   { transform: scale(1);   opacity: 0;    }
    12%  { opacity: 0.10; }
    100% { transform: scale(2.8); opacity: 0;    }
  }
  @keyframes bs-inline-pulse {
    0%, 100% { opacity: 0.85; transform: scale(1);    }
    50%       { opacity: 1;    transform: scale(1.08); }
  }
  @keyframes bs-inline-ring {
    0%   { transform: scale(1);   opacity: 0;    }
    10%  { opacity: 0.22; }
    100% { transform: scale(2.4); opacity: 0;    }
  }
`

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullscreenProps {
  variant: 'fullscreen'
  businessName: string
  primaryColor: string
  splashColor?: string | null
  logoUrl: string | null
}

interface InlineProps {
  variant: 'inline'
}

export type BrandedSplashProps = FullscreenProps | InlineProps

// ─── Fullscreen variant ───────────────────────────────────────────────────────
// Phases:
//   'cover'      — initial SSR render + hydration: opaque bgColor only (no content).
//                  Prevents page content flash. Bridges iOS native → JS splash by
//                  matching background color before animations fire.
//   'preloading' — standalone confirmed, logo preloading via new Image().
//                  Still shows opaque cover; logo fallback never shown as transient state.
//   'visible'    — logo ready (or definitively failed), full animated splash.
//   'exit'       — exit animation playing.
//   'gone'       — unmounted (non-standalone browser OR animation complete).

type SplashPhase = 'cover' | 'preloading' | 'visible' | 'exit' | 'gone'

function FullscreenSplash({
  businessName,
  primaryColor,
  splashColor,
  logoUrl,
}: Omit<FullscreenProps, 'variant'>) {
  const bgColor = splashColor ?? primaryColor

  const [phase, setPhase] = React.useState<SplashPhase>('cover')
  const [logoOk, setLogoOk] = React.useState(false)

  React.useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (!isStandalone) {
      setPhase('gone')
      return
    }

    setPhase('preloading')

    let exitTimer: ReturnType<typeof setTimeout>
    let goneTimer: ReturnType<typeof setTimeout>

    const enterVisible = (hasLogo: boolean) => {
      setLogoOk(hasLogo)
      setPhase('visible')
      exitTimer = setTimeout(() => setPhase('exit'), 1600)
      goneTimer = setTimeout(() => setPhase('gone'), 2100)
    }

    if (!logoUrl) {
      enterVisible(false)
      return () => { clearTimeout(exitTimer); clearTimeout(goneTimer) }
    }

    const img = new window.Image()
    // 1 s cap: if logo takes longer, show text initial rather than blocking indefinitely
    const fallbackTimer = setTimeout(() => enterVisible(false), 1000)

    img.onload  = () => { clearTimeout(fallbackTimer); enterVisible(true) }
    img.onerror = () => { clearTimeout(fallbackTimer); enterVisible(false) }
    img.src = logoUrl

    return () => {
      clearTimeout(fallbackTimer)
      clearTimeout(exitTimer)
      clearTimeout(goneTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null

  const isLight      = isLightColor(bgColor)
  const textColor    = isLight ? '#111111'                    : '#FFFFFF'
  const subtextColor = isLight ? 'rgba(0,0,0,0.38)'          : 'rgba(255,255,255,0.38)'
  const glassBg      = isLight ? 'rgba(0,0,0,0.06)'          : 'rgba(255,255,255,0.09)'
  const glassBorder  = isLight ? '1px solid rgba(0,0,0,0.10)': '1px solid rgba(255,255,255,0.18)'
  const ringColor    = isLight ? 'rgba(0,0,0,1)'             : 'rgba(255,255,255,1)'
  const initial      = businessName.charAt(0).toUpperCase() || 'S'
  const isExiting    = phase === 'exit'
  const showContent  = phase === 'visible' || phase === 'exit'

  // Outer div always present across all non-gone phases → same DOM node → no flash.
  // During cover/preloading: opaque bgColor, no content (bridges SSR gap + logo preload).
  // During visible/exit: same bgColor background, content animates in on top.
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        animation: isExiting ? 'bs-exit 500ms cubic-bezier(0.55,0,1,0.45) forwards' : 'none',
      }}
    >
      {showContent && (
        <>
          <style>{KEYFRAMES}</style>

          {/* Logo zone: rings + float wrapper + glass box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Pulse ring 1 — starts after logo entry lands */}
            <div style={{
              position: 'absolute',
              width: 120, height: 120,
              borderRadius: '50%',
              background: ringColor,
              animation: 'bs-ring 2.4s cubic-bezier(0.215,0.61,0.355,1) 0.85s infinite both',
              pointerEvents: 'none',
            }} />
            {/* Pulse ring 2 — offset for organic feel */}
            <div style={{
              position: 'absolute',
              width: 120, height: 120,
              borderRadius: '50%',
              background: ringColor,
              animation: 'bs-ring2 3.4s cubic-bezier(0.215,0.61,0.355,1) 1.55s infinite both',
              pointerEvents: 'none',
            }} />

            {/* Float wrapper — translateY runs independently from scale */}
            <div style={{
              animation: 'bs-float 2.5s cubic-bezier(0.45,0.05,0.55,0.95) 0.92s infinite',
            }}>
              {/* Glass container — matches PwaOnboarding s1-logo / s5-logo */}
              <div style={{
                width: 120, height: 120,
                borderRadius: 28,
                background: glassBg,
                border: glassBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                animation: 'bs-bounce-in 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.22s both',
              }}>
                {logoOk ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl!}
                    alt={businessName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.10))',
                    }}
                  />
                ) : (
                  <span style={{
                    fontSize: 56, fontWeight: 800,
                    color: textColor,
                    lineHeight: 1,
                    letterSpacing: '-2px',
                  }}>
                    {initial}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Business name — fade up after logo entry */}
          <span style={{
            marginTop: 24,
            fontSize: 22, fontWeight: 700,
            color: textColor,
            letterSpacing: '-0.4px',
            opacity: 0.92,
            animation: 'bs-fade-up 0.6s cubic-bezier(0.215,0.61,0.355,1) 0.84s both',
          }}>
            {businessName}
          </span>

          {/* Powered by Styll */}
          <div style={{
            position: 'absolute',
            bottom: 52,
            animation: 'bs-fade-up 0.6s cubic-bezier(0.215,0.61,0.355,1) 1.0s both',
          }}>
            <span style={{ fontSize: 12, color: subtextColor, fontWeight: 500, letterSpacing: '0.01em' }}>
              Powered by Styll
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Inline variant ───────────────────────────────────────────────────────────
// Used in Next.js loading.tsx files inside the PWA shell. Reads brand color
// from --brand-primary CSS variable (set server-side by the tenant app layout).
// No JS props needed — works as a plain server-importable client component.

function InlineSplash() {
  return (
    <div style={{
      minHeight: 'calc(100dvh - 120px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--brand-primary, #1A1A1A)',
    }}>
      <style>{KEYFRAMES}</style>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Expanding ring */}
        <div style={{
          position: 'absolute',
          width: 72, height: 72,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          animation: 'bs-inline-ring 1.8s cubic-bezier(0.215,0.61,0.355,1) 0.2s infinite both',
        }} />
        {/* Second ring offset */}
        <div style={{
          position: 'absolute',
          width: 72, height: 72,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          animation: 'bs-inline-ring 2.6s cubic-bezier(0.215,0.61,0.355,1) 0.9s infinite both',
        }} />
        {/* Glass logo dot */}
        <div style={{
          width: 52, height: 52,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.09)',
          border: '1px solid rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'bs-inline-pulse 1.6s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFFFFF', opacity: 0.82 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BrandedSplash(props: BrandedSplashProps) {
  if (props.variant === 'inline') return <InlineSplash />
  return <FullscreenSplash {...props} />
}
