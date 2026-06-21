'use client'

import * as React from 'react'
import gsap from 'gsap'

interface Props {
  primaryColor: string
  businessName: string
  platform: 'ios' | 'android'
  onDone: () => void
}

const DOT_ACTIVE_W   = 20
const DOT_INACTIVE_W = 6
const DOT_ACTIVE_O   = 1
const DOT_INACTIVE_O = 0.35

function IosShareIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="15"/>
      <polyline points="8 7 12 3 16 7"/>
      <path d="M17 12h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h2"/>
    </svg>
  )
}

function IosAddToHomeIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  )
}

function IosConfirmIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <rect x="5" y="2" width="14" height="20" rx="3" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="16" cy="7" r="2.5" fill={color}/>
    </svg>
  )
}

function AndroidMenuIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="5" r="1.6"/>
      <circle cx="12" cy="12" r="1.6"/>
      <circle cx="12" cy="19" r="1.6"/>
    </svg>
  )
}

export function InstallInstructions({ primaryColor, businessName, platform, onDone }: Props) {
  const phase1Ref    = React.useRef<HTMLDivElement>(null)
  const phase2Ref    = React.useRef<HTMLDivElement>(null)
  const phase3Ref    = React.useRef<HTMLDivElement>(null)
  const shareIconRef = React.useRef<HTMLDivElement>(null)
  const dot1Ref      = React.useRef<HTMLDivElement>(null)
  const dot2Ref      = React.useRef<HTMLDivElement>(null)
  const dot3Ref      = React.useRef<HTMLDivElement>(null)
  const tweensRef    = React.useRef<Array<{ kill: () => void }>>([])

  const accent = primaryColor || '#1A1A1A'

  function killTweens() {
    tweensRef.current.forEach(t => { try { t.kill() } catch {/* */} })
    tweensRef.current = []
  }

  React.useEffect(() => {
    if (platform !== 'ios') return

    const p1 = phase1Ref.current
    const p2 = phase2Ref.current
    const p3 = phase3Ref.current
    const d1 = dot1Ref.current
    const d2 = dot2Ref.current
    const d3 = dot3Ref.current
    const si = shareIconRef.current
    if (!p1 || !p2 || !p3 || !d1 || !d2 || !d3) return

    gsap.set([p1, p2, p3], { opacity: 0, scale: 0.85 })
    gsap.set(d1, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O })
    gsap.set(d2, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O })
    gsap.set(d3, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O })

    const tl = gsap.timeline({ repeat: -1 })

    tl.to(p1, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' })
    if (si) tl.to(si, { scale: 1.12, duration: 0.38, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '+=0.2')
    tl.set({}, {}, '+=0.9')
    tl.to(p1, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' })
    tl.to(d1, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O, duration: 0.25 }, '<')
    tl.to(d2, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O,   duration: 0.25 }, '<')

    tl.to(p2, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' })
    tl.set({}, {}, '+=1.8')
    tl.to(p2, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' })
    tl.to(d2, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O, duration: 0.25 }, '<')
    tl.to(d3, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O,   duration: 0.25 }, '<')

    tl.to(p3, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' })
    tl.set({}, {}, '+=2.0')
    tl.to(p3, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' })
    tl.to(d3, { width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O, duration: 0.25 }, '<')
    tl.to(d1, { width: DOT_ACTIVE_W,   opacity: DOT_ACTIVE_O,   duration: 0.25 }, '<')

    tweensRef.current.push(tl)
    return () => killTweens()
  }, [platform]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => () => killTweens(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const iconBox: React.CSSProperties = {
    width: 60, height: 60, borderRadius: 14,
    background: `${accent}14`,
    border: `1.5px solid ${accent}28`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }

  const doneBtn = (
    <button
      onClick={onDone}
      className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
      style={{ backgroundColor: accent }}
    >
      Ho capito
    </button>
  )

  if (platform === 'android') {
    return (
      <div className="w-full flex flex-col items-center gap-5 pt-1">
        <p
          className="text-[17px] font-bold text-gray-900 text-center leading-snug"
          style={{ fontFamily: 'var(--font-tenant, inherit)' }}
        >
          Installa l'app di {businessName}
        </p>
        <div style={iconBox}>
          <AndroidMenuIcon color={accent} />
        </div>
        <p className="text-[14px] text-gray-500 text-center leading-relaxed">
          Tocca il menu <strong className="text-gray-800">⋮</strong> in alto a destra,<br />
          poi <strong className="text-gray-800">"Aggiungi a schermata Home"</strong>
        </p>
        {doneBtn}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 pt-1">
      <p
        className="text-[17px] font-bold text-gray-900 text-center leading-snug"
        style={{ fontFamily: 'var(--font-tenant, inherit)' }}
      >
        Installa l'app di {businessName}
      </p>

      <div style={{ position: 'relative', width: '100%', height: 185 }}>
        <div
          ref={phase1Ref}
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0 }}
        >
          <div ref={shareIconRef} style={{ ...iconBox, transformOrigin: 'center' }}>
            <IosShareIcon color={accent} />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-0.5" style={{ color: `${accent}70` }}>Passo 1</p>
            <p className="text-[16px] font-bold text-gray-900">Tocca il tasto Condividi</p>
            <p className="text-[13px] text-gray-500 mt-1 leading-snug">L'icona con la freccia in alto,<br/>nella barra di Safari</p>
          </div>
        </div>

        <div
          ref={phase2Ref}
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0 }}
        >
          <div style={iconBox}>
            <IosAddToHomeIcon color={accent} />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-0.5" style={{ color: `${accent}70` }}>Passo 2</p>
            <p className="text-[16px] font-bold text-gray-900">Aggiungi alla schermata Home</p>
            <p className="text-[13px] text-gray-500 mt-1 leading-snug">Scorri il menu e tocca questa voce</p>
          </div>
        </div>

        <div
          ref={phase3Ref}
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0 }}
        >
          <div style={iconBox}>
            <IosConfirmIcon color={accent} />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-0.5" style={{ color: `${accent}70` }}>Passo 3</p>
            <p className="text-[16px] font-bold text-gray-900">Aggiungi in alto a destra</p>
            <p className="text-[13px] text-gray-500 mt-1 leading-snug">L'app apparirà sulla tua schermata Home</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div ref={dot1Ref} style={{ height: 6, borderRadius: 3, backgroundColor: accent, width: DOT_ACTIVE_W, opacity: DOT_ACTIVE_O }} />
        <div ref={dot2Ref} style={{ height: 6, borderRadius: 3, backgroundColor: accent, width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O }} />
        <div ref={dot3Ref} style={{ height: 6, borderRadius: 3, backgroundColor: accent, width: DOT_INACTIVE_W, opacity: DOT_INACTIVE_O }} />
      </div>

      {doneBtn}
    </div>
  )
}
