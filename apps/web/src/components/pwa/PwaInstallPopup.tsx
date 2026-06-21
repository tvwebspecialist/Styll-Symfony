'use client'

import * as React from 'react'
import gsap from 'gsap'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Particle {
  x: number; y: number; r: number
  vx: number; vy: number; opacity: number
}

interface Props {
  primaryColor: string
  businessName: string
  delayMs?: number
}

function darken(hex: string, f: number): string {
  const c = hex.replace('#', '')
  const n = (s: number) => Math.round(parseInt(c.slice(s, s + 2), 16) * f).toString(16).padStart(2, '0')
  return `#${n(0)}${n(2)}${n(4)}`
}

function lightenRgba(hex: string, opacity: number): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const lr = Math.min(255, r + Math.round((255 - r) * 0.6))
  const lg = Math.min(255, g + Math.round((255 - g) * 0.6))
  const lb = Math.min(255, b + Math.round((255 - b) * 0.6))
  return `rgba(${lr},${lg},${lb},${opacity})`
}

function getPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { __pwaPrompt: BeforeInstallPromptEvent | null }).__pwaPrompt ?? null
}

function clearPrompt(): void {
  if (typeof window !== 'undefined') {
    ;(window as unknown as { __pwaPrompt: null }).__pwaPrompt = null
  }
}

// iOS Share icon — matches Safari share button shape
function IosShareIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="15"/>
      <polyline points="8 7 12 3 16 7"/>
      <path d="M17 12h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h2"/>
    </svg>
  )
}

// iOS Add to Home Screen icon — rounded square with plus
function IosAddToHomeIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  )
}

// iOS Confirm "Aggiungi" — top-right tap indicator
function IosConfirmIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {/* Phone outline */}
      <rect x="5" y="2" width="14" height="20" rx="3"/>
      {/* Tap at top-right */}
      <circle cx="16" cy="7" r="2.5" fill="white" stroke="none"/>
      <path d="M14.5 5.5L16 7" strokeWidth="1.5"/>
    </svg>
  )
}

// Android three-dot menu icon
function AndroidMenuIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
      <circle cx="12" cy="5" r="1.6"/>
      <circle cx="12" cy="12" r="1.6"/>
      <circle cx="12" cy="19" r="1.6"/>
    </svg>
  )
}

const DOT_ACTIVE_W   = 20
const DOT_INACTIVE_W = 6
const DOT_ACTIVE_O   = 1
const DOT_INACTIVE_O = 0.35

export function PwaInstallPopup({ primaryColor, businessName, delayMs = 700 }: Props) {
  const [showA, setShowA] = React.useState(false)
  const [showB, setShowB] = React.useState(false)
  const [platform, setPlatform] = React.useState<'ios' | 'android'>('android')

  const popupARef    = React.useRef<HTMLDivElement>(null)
  const popupBRef    = React.useRef<HTMLDivElement>(null)
  const canvasRef    = React.useRef<HTMLCanvasElement>(null)
  const rafRef       = React.useRef<number>(0)
  const particlesRef = React.useRef<Particle[]>([])
  const tweensRef    = React.useRef<Array<{ kill: () => void }>>([])

  // Phase containers
  const phase1Ref    = React.useRef<HTMLDivElement>(null)
  const phase2Ref    = React.useRef<HTMLDivElement>(null)
  const phase3Ref    = React.useRef<HTMLDivElement>(null)
  // Share icon wrapper for pulse animation
  const shareIconRef = React.useRef<HTMLDivElement>(null)
  // Step dot indicators
  const dot1Ref      = React.useRef<HTMLDivElement>(null)
  const dot2Ref      = React.useRef<HTMLDivElement>(null)
  const dot3Ref      = React.useRef<HTMLDivElement>(null)

  const accent = primaryColor || '#1A1A1A'

  function killTweens() {
    tweensRef.current.forEach(t => { try { t.kill() } catch {/* */} })
    tweensRef.current = []
  }

  // Mount: detect non-standalone + platform
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    console.log('[PwaInstallPopup] mount check', {
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      primaryColor, businessName
    })
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream: unknown }).MSStream
    setPlatform(isIOS ? 'ios' : 'android')

    const timer = setTimeout(() => setShowA(true), delayMs)
    return () => clearTimeout(timer)
  }, [])

  // Popup A entrance
  React.useEffect(() => {
    if (!showA || !popupARef.current) return
    gsap.fromTo(popupARef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' },
    )
  }, [showA])

  // Popup B entrance
  React.useEffect(() => {
    if (!showB || !popupBRef.current) return
    gsap.fromTo(popupBRef.current,
      { opacity: 0, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' },
    )
  }, [showB])

  // Canvas particles for Popup B
  React.useEffect(() => {
    if (!showB) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const W = canvas.width, H = canvas.height

    particlesRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r:  0.3 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      opacity: 0.12 + Math.random() * 0.4,
    }))

    function animate() {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas!.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = lightenRgba(accent, p.opacity)
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' })

    return () => cancelAnimationFrame(rafRef.current)
  }, [showB, accent])

  // iOS sequential animation loop
  React.useEffect(() => {
    if (!showB || platform !== 'ios') return

    const p1 = phase1Ref.current
    const p2 = phase2Ref.current
    const p3 = phase3Ref.current
    const d1 = dot1Ref.current
    const d2 = dot2Ref.current
    const d3 = dot3Ref.current
    const si = shareIconRef.current
    if (!p1 || !p2 || !p3 || !d1 || !d2 || !d3) return

    // Initial state — GSAP is sole authority (phases hidden, dot 1 active)
    gsap.set([p1, p2, p3], { opacity: 0, scale: 0.85, y: 0 })
    gsap.set(d1, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O })
    gsap.set(d2, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O })
    gsap.set(d3, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O })

    const tl = gsap.timeline({ repeat: -1 })

    // ── Phase 1: Share ─────────────────────────────────────────────────────
    tl.to(p1, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' })
    if (si) {
      // Icon pulse while visible
      tl.to(si, { scale: 1.12, duration: 0.38, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '+=0.2')
    }
    tl.set({}, {}, '+=0.9')   // hold

    // ── Transition 1 → 2 ───────────────────────────────────────────────────
    tl.to(p1, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' })
    tl.to(d1, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O, duration: 0.25 }, '<')
    tl.to(d2, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O,   duration: 0.25 }, '<')

    // ── Phase 2: Add to Home ────────────────────────────────────────────────
    tl.to(p2, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' })
    tl.set({}, {}, '+=1.8')   // hold

    // ── Transition 2 → 3 ───────────────────────────────────────────────────
    tl.to(p2, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' })
    tl.to(d2, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O, duration: 0.25 }, '<')
    tl.to(d3, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O,   duration: 0.25 }, '<')

    // ── Phase 3: Confirm ───────────────────────────────────────────────────
    tl.to(p3, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' })
    tl.set({}, {}, '+=2.0')   // hold

    // ── Reset for loop ─────────────────────────────────────────────────────
    tl.to(p3, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' })
    tl.to(d3, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O, duration: 0.25 }, '<')
    tl.to(d1, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O,   duration: 0.25 }, '<')

    tweensRef.current.push(tl)

    return () => killTweens()
  }, [showB, platform]) // eslint-disable-line react-hooks/exhaustive-deps

  // Global cleanup on unmount
  React.useEffect(() => {
    return () => {
      killTweens()
      cancelAnimationFrame(rafRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    killTweens()
    cancelAnimationFrame(rafRef.current)
    setShowA(false)
    setShowB(false)
  }

  async function handleInstall() {
    if (platform === 'android') {
      const dp = getPrompt()
      if (dp) {
        try {
          await dp.prompt()
          const { outcome } = await dp.userChoice
          clearPrompt()
          close()
          if (outcome === 'accepted') return
        } catch {/* prompt failed — fall through to manual */}
      }
    }
    setShowA(false)
    setShowB(true)
  }

  if (!showA && !showB) return null

  const gradientBg = `linear-gradient(160deg, #0a0a14 0%, ${accent} 50%, ${darken(accent, 0.6)} 100%)`

  // Shared phase icon box style
  const iconBox: React.CSSProperties = {
    width: 76, height: 76, borderRadius: 20,
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }

  return (
    <>
      {/* ── POPUP A — card invito ─────────────────────────────────────────── */}
      {showA && !showB && (
        <div
          ref={popupARef}
          style={{
            position: 'fixed',
            bottom: 20, left: 16, right: 16,
            background: '#fff',
            borderRadius: 20,
            border: '0.5px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            padding: '28px 24px',
            zIndex: 9997,
            fontFamily: 'var(--font-tenant, var(--font-sans, system-ui, -apple-system, sans-serif))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#111', textAlign: 'center', lineHeight: 1.2 }}>
            Prenotazione confermata!
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 1.55 }}>
            Vuoi un accesso più veloce la prossima volta?{' '}
            Installa l'app di {businessName}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleInstall}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none',
                background: accent, color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', lineHeight: 1,
              }}
            >
              Scarica l'app
            </button>
            <button
              onClick={close}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none',
                background: 'transparent', color: '#aaa', fontSize: 15, fontWeight: 500,
                cursor: 'pointer', lineHeight: 1,
              }}
            >
              No grazie
            </button>
          </div>
        </div>
      )}

      {/* ── POPUP B — istruzioni installazione ───────────────────────────── */}
      {showB && (
        <div
          ref={popupBRef}
          style={{
            position: 'fixed', inset: 0,
            background: gradientBg,
            zIndex: 9998,
            fontFamily: 'var(--font-tenant, var(--font-sans, system-ui, -apple-system, sans-serif))',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Particle canvas */}
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          />

          {/* Centered content */}
          <div style={{
            position: 'relative', flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 28px',
            gap: 0,
          }}>
            {platform === 'ios' ? (
              <>
                {/* Title */}
                <p style={{ margin: '0 0 36px', fontSize: 18, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>
                  Installa l'app di {businessName}
                </p>

                {/* Animation phases — stacked absolutely inside a fixed-height container */}
                <div style={{ position: 'relative', width: '100%', height: 200 }}>

                  {/* Phase 1 — Share */}
                  <div
                    ref={phase1Ref}
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 20,
                      opacity: 0,                   // GSAP owns this
                    }}
                  >
                    <div ref={shareIconRef} style={{ ...iconBox, transformOrigin: 'center' }}>
                      <IosShareIcon />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.11em', textTransform: 'uppercase' }}>Passo 1</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>Tocca il tasto Condividi</p>
                      <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.52)', lineHeight: 1.5 }}>L'icona con la freccia in alto,<br/>nella barra di Safari</p>
                    </div>
                  </div>

                  {/* Phase 2 — Add to Home */}
                  <div
                    ref={phase2Ref}
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 20,
                      opacity: 0,
                    }}
                  >
                    <div style={iconBox}>
                      <IosAddToHomeIcon />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.11em', textTransform: 'uppercase' }}>Passo 2</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>Aggiungi alla schermata Home</p>
                      <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.52)', lineHeight: 1.5 }}>Scorri il menu e tocca questa voce</p>
                    </div>
                  </div>

                  {/* Phase 3 — Confirm */}
                  <div
                    ref={phase3Ref}
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 20,
                      opacity: 0,
                    }}
                  >
                    <div style={iconBox}>
                      <IosConfirmIcon />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.11em', textTransform: 'uppercase' }}>Passo 3</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>Aggiungi in alto a destra</p>
                      <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.52)', lineHeight: 1.5 }}>L'app apparirà sulla tua schermata Home</p>
                    </div>
                  </div>

                </div>

                {/* Step dot indicator */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 28 }}>
                  <div ref={dot1Ref} style={{ height: 6, borderRadius: 3, background: '#fff', width: DOT_ACTIVE_W, opacity: DOT_ACTIVE_O }}/>
                  <div ref={dot2Ref} style={{ height: 6, borderRadius: 3, background: '#fff', width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O }}/>
                  <div ref={dot3Ref} style={{ height: 6, borderRadius: 3, background: '#fff', width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O }}/>
                </div>
              </>
            ) : (
              /* Android: static manual instructions */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
                <div style={iconBox}>
                  <AndroidMenuIcon />
                </div>
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                    Installa l'app
                  </p>
                  <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                    Tocca il menu <strong style={{ color: '#fff' }}>⋮</strong> in alto a destra<br/>
                    poi tocca <strong style={{ color: '#fff' }}>"Aggiungi a schermata Home"</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div style={{ position: 'relative', padding: '0 24px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
            <button
              onClick={close}
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                border: '1.5px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 16, fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  )
}
