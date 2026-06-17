'use client'

import * as React from 'react'
import gsap from 'gsap'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { usePushSubscription } from '@/lib/hooks/use-push-subscription'
import { updateNotificationPreferences } from '@/lib/actions/pwa-client-actions'

interface Props {
  primaryColor: string
  logoUrl?:     string | null
  businessName: string
  tenantId:     string
}

const LS_KEY = 'pwa_onboarding_done'

function darken(hex: string, f: number): string {
  const c = hex.replace('#', '')
  const n = (s: number) => Math.round(parseInt(c.slice(s, s + 2), 16) * f).toString(16).padStart(2, '0')
  return `#${n(0)}${n(2)}${n(4)}`
}

// ── Calendar ─────────────────────────────────────────────────────────────────
const CAL_HEADERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const CAL_DAYS: [number, number, string][] = [
  [0,2,'1'],[0,3,'2'],[0,4,'3'],[0,5,'4'],[0,6,'5'],
  [1,0,'6'],[1,1,'7'],[1,2,'8'],[1,3,'9'],[1,4,'10'],[1,5,'11'],[1,6,'12'],
  [2,0,'13'],[2,1,'14'],[2,2,'15'],[2,3,'16'],[2,4,'17'],[2,5,'18'],[2,6,'19'],
  [3,0,'20'],[3,1,'21'],[3,2,'22'],[3,3,'23'],[3,4,'24'],[3,5,'25'],[3,6,'26'],
  [4,0,'27'],[4,1,'28'],[4,2,'29'],[4,3,'30'],[4,4,'31'],
]
const BOOKING_CELLS = [
  { row: 1, col: 2, label: "l'8 giugno"   },
  { row: 2, col: 4, label: "il 17 giugno" },
  { row: 3, col: 1, label: "il 21 giugno" },
  { row: 1, col: 5, label: "l'11 giugno"  },
]

// ── Notifications ─────────────────────────────────────────────────────────────
const NOTIF_DATA = [
  { text: 'Prenotazione confermata', sub: 'Giovedì 19 · 10:00',        time: '5m'     },
  { text: 'Streak di 5 visite',      sub: 'Continua, sei in serie',    time: '1m'     },
  { text: 'Premio sbloccato',        sub: 'Taglio gratis disponibile', time: 'adesso' },
]

export function PwaOnboarding({ primaryColor, logoUrl, businessName, tenantId }: Props) {
  const [show,          setShow]          = React.useState(false)
  const [step,          setStep]          = React.useState(0)
  const [loading,       setLoading]       = React.useState(false)
  const [transitioning, setTransitioning] = React.useState(false)
  const [userLoggedIn,  setUserLoggedIn]  = React.useState(false)

  const contentRef = React.useRef<HTMLDivElement>(null)
  const cardRef    = React.useRef<HTMLDivElement>(null)
  const pillRef    = React.useRef<HTMLDivElement>(null)
  const pointsRef  = React.useRef<HTMLSpanElement>(null)
  const tweensRef  = React.useRef<Array<{ kill: () => void }>>([])

  const { subscribe } = usePushSubscription(tenantId)

  const accent      = primaryColor || '#1A1A2E'
  const accentDark  = darken(accent, 0.45)
  const accentDeep  = darken(accent, 0.68)
  const bgGrad      = `linear-gradient(160deg, ${accentDark} 0%, ${accent} 55%, ${accentDeep} 100%)`
  const initial     = businessName.charAt(0).toUpperCase()

  const visualBg = [bgGrad, '#f0f4ff', '#fafafa', bgGrad]

  const killTweens = React.useCallback(() => {
    tweensRef.current.forEach(t => { try { t.kill() } catch {/* */} })
    tweensRef.current = []
  }, [])

  function track<T extends { kill: () => void }>(t: T): T {
    tweensRef.current.push(t); return t
  }

  // ── Check show ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function check() {
      if (typeof window === 'undefined') return
      if (new URLSearchParams(window.location.search).get('reset_onboarding') === '1') {
        localStorage.removeItem(LS_KEY)
      }
      if (!window.matchMedia('(display-mode: standalone)').matches) return
      if (localStorage.getItem(LS_KEY) === 'true') return
      try {
        const pwa = createPwaClient()
        const { data: { user } } = await pwa.auth.getUser()
        if (user) {
          setUserLoggedIn(true)
          const res = await pwa
            .from('profiles')
            .select('notification_preferences')
            .eq('id', user.id)
            .maybeSingle() as unknown as { data: { notification_preferences: Record<string, boolean> } | null }
          if (res.data?.notification_preferences?.onboarding_completed === true) {
            localStorage.setItem(LS_KEY, 'true'); return
          }
        }
      } catch {/* show anyway */}
      setShow(true)
    }
    check().catch(console.error)
  }, [tenantId])

  // ── Mount animation ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show || !cardRef.current) return
    gsap.fromTo(cardRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
  }, [show])

  // ── Step animations ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show) return
    const d = step === 0 ? 0.3 : 0.05

    if (step === 0) {
      gsap.set('#s0-logo', { scale: 0.8, opacity: 0 })
      track(gsap.to('#s0-logo', { scale: 1, opacity: 1, duration: 0.5, delay: d, ease: 'back.out(1.5)' }))
      ;[0, 1, 2].forEach(i =>
        track(gsap.to(`#s0-ring-${i}`, {
          scale: 1.045, duration: 1.4 + i * 0.35, yoyo: true, repeat: -1,
          ease: 'sine.inOut', transformOrigin: '50% 50%', delay: d + 0.3 + i * 0.4,
        }))
      )
      track(gsap.to('#s0-orbit', {
        rotation: 360, duration: 20, repeat: -1, ease: 'none',
        transformOrigin: '50% 50%', delay: d + 0.2,
      }))
      gsap.set('#s0-label', { opacity: 0 })
      track(gsap.to('#s0-label', { opacity: 1, duration: 0.4, delay: d + 0.55 }))

    } else if (step === 1) {
      gsap.set('#s1-cal', { y: 16, opacity: 0 })
      track(gsap.to('#s1-cal', { y: 0, opacity: 1, duration: 0.35, delay: d, ease: 'power2.out' }))
      if (pillRef.current) gsap.set(pillRef.current, { opacity: 0, y: 8 })

      const tl = gsap.timeline({ repeat: -1, delay: d + 0.5 })
      BOOKING_CELLS.forEach((cell, i) => {
        tl
          .to(`#s1-rect-${i}`, { attr: { fill: accent }, duration: 0.25, ease: 'power2.out' })
          .to(`#s1-txt-${i}`,  { attr: { fill: '#ffffff' }, duration: 0.1 }, '<')
          .call(() => { if (pillRef.current) pillRef.current.textContent = `Prenotato per ${cell.label}` })
          .to(pillRef.current, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' })
          .to(pillRef.current, { opacity: 0, y: 6, duration: 0.22, ease: 'power2.in', delay: 0.85 })
          .to(`#s1-rect-${i}`, { attr: { fill: '#f0f4ff' }, duration: 0.25 }, '<+=0.05')
          .to(`#s1-txt-${i}`,  { attr: { fill: '#606060' }, duration: 0.1 }, '<')
          .set({}, {}, '+=0.35')
      })
      track(tl)

    } else if (step === 2) {
      ;[0, 1, 2].forEach(i => {
        gsap.set(`#s2-badge-${i}`, { scale: 0.4, opacity: 0 })
        track(gsap.to(`#s2-badge-${i}`, { scale: 1, opacity: 1, duration: 0.5, delay: d + i * 0.15, ease: 'back.out(2)' }))
        track(gsap.to(`#s2-badge-${i}`, { y: -5, duration: 1.4 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: d + 0.6 + i * 0.3 }))
      })
      track(gsap.fromTo('#s2-bar',    { width: '0%' }, { width: '78%', duration: 1.2, delay: d + 0.5, ease: 'power2.out' }))
      track(gsap.fromTo('#s2-cursor', { left: '0%'  }, { left: '78%', duration: 1.2, delay: d + 0.5, ease: 'power2.out' }))
      const obj = { val: 0 }
      track(gsap.to(obj, {
        val: 450, duration: 1.2, delay: d + 0.5, ease: 'power2.out',
        onUpdate: () => { if (pointsRef.current) pointsRef.current.textContent = `${Math.round(obj.val)} punti` },
      }))
      gsap.set('#s2-streak', { y: 12, opacity: 0 })
      track(gsap.to('#s2-streak', { y: 0, opacity: 1, duration: 0.4, delay: d + 1.5, ease: 'power2.out' }))

    } else if (step === 3) {
      NOTIF_DATA.forEach((_, i) => {
        gsap.set(`#s3-notif-${i}`, { y: -20, opacity: 0 })
        track(gsap.to(`#s3-notif-${i}`, { y: 0, opacity: 1, duration: 0.4, delay: 0.2 + i * 0.18, ease: 'power2.out' }))
        track(gsap.to(`#s3-notif-${i}`, { y: -3, duration: 2.4 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.8 + i * 0.4 }))
      })
    }

    return killTweens
  }, [step, show, accent, killTweens])

  // ── Navigation ───────────────────────────────────────────────────────────
  function goTo(n: number) {
    if (transitioning || n < 0 || n > 3) return
    killTweens()
    setTransitioning(true)
    gsap.to(contentRef.current, {
      opacity: 0, duration: 0.18, ease: 'power2.in',
      onComplete: () => {
        setStep(n)
        setTransitioning(false)
        gsap.to(contentRef.current, { opacity: 1, duration: 0.25, ease: 'power2.out' })
      },
    })
  }

  // ── Close ────────────────────────────────────────────────────────────────
  async function handleActivate() {
    if (loading) return
    setLoading(true)
    try {
      if (!('Notification' in window)) { await saveAndClose(false); return }
      const perm = await Notification.requestPermission()
      if (perm === 'granted') { await subscribe(); await saveAndClose(true) }
      else                    { await saveAndClose(false) }
    } finally { setLoading(false) }
  }

  async function saveAndClose(accepted: boolean) {
    killTweens()
    localStorage.setItem(LS_KEY, 'true')
    setShow(false)
    if (userLoggedIn) {
      updateNotificationPreferences({ onboarding_completed: true, push_prompted: true, push_accepted: accepted }).catch(console.error)
    }
  }

  if (!show) return null

  // ── Shared card styles ───────────────────────────────────────────────────
  const tagSt: React.CSSProperties = {
    margin: '0 0 8px', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5,
    color: accent,
  }
  const headSt: React.CSSProperties = {
    margin: '0 0 8px', fontSize: 28, fontWeight: 700,
    lineHeight: 1.15, letterSpacing: '-0.02em',
    color: '#0a0a0a', whiteSpace: 'pre-line',
  }
  const subSt: React.CSSProperties = {
    margin: '0 0 20px', fontSize: 15, lineHeight: 1.55, opacity: 0.6, color: '#1a1a2e',
  }
  const btnSt: React.CSSProperties = {
    width: '100%', padding: '16px', borderRadius: 14, border: 'none',
    background: accent, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }
  const skipSt: React.CSSProperties = {
    marginTop: 10, width: '100%', border: 'none', background: 'transparent',
    color: '#aaa', fontSize: 14, cursor: 'pointer', padding: '8px 0',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: visualBg[step],
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
    }}>
      <div ref={contentRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ── Visual area ─────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>

          {/* Step 0 — Brand splash (dark gradient bg) */}
          {step === 0 && (
            <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="220" height="220" viewBox="0 0 220 220" fill="none" style={{ position: 'absolute', inset: 0 }}>
                <circle id="s0-ring-0" cx="110" cy="110" r="52"  stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
                <circle id="s0-ring-1" cx="110" cy="110" r="76"  stroke="rgba(255,255,255,0.07)" strokeWidth="1.5"/>
                <circle id="s0-ring-2" cx="110" cy="110" r="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5"/>
                <g id="s0-orbit">
                  <circle cx="110" cy="9"   r="3.5" fill="rgba(255,255,255,0.50)"/>
                  <circle cx="211" cy="110" r="3"   fill="rgba(255,255,255,0.35)"/>
                  <circle cx="110" cy="211" r="4"   fill="rgba(255,255,255,0.45)"/>
                  <circle cx="9"   cy="110" r="3"   fill="rgba(255,255,255,0.30)"/>
                </g>
              </svg>
              <div id="s0-logo" style={{
                position: 'relative', zIndex: 1,
                width: 64, height: 64, borderRadius: 18,
                background: '#fff', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {logoUrl
                  ? <img src={logoUrl} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <span style={{ fontSize: 26, fontWeight: 800, color: accent }}>{initial}</span>
                }
              </div>
              <div id="s0-label" style={{
                position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap',
              }}>
                BENVENUTO
              </div>
            </div>
          )}

          {/* Step 1 — Calendar (light blue bg) */}
          {step === 1 && (
            <div id="s1-cal" style={{ position: 'relative' }}>
              <svg width="260" height="214" viewBox="0 0 260 214" fill="none">
                {/* Month header bar */}
                <rect x="0" y="0" width="260" height="36" rx="10" fill={accent}/>
                <text x="130" y="23" textAnchor="middle" fontSize={13} fontWeight={700} fill="white" fontFamily="system-ui,-apple-system,sans-serif">Giugno 2026</text>
                {/* Day-of-week */}
                {CAL_HEADERS.map((h, col) => (
                  <text key={col} x={4 + col * 37 + 14} y={54} textAnchor="middle" fontSize={10} fontWeight={600} fill="#9BA3AF" fontFamily="system-ui,-apple-system,sans-serif">{h}</text>
                ))}
                {/* Cells */}
                {CAL_DAYS.map(([row, col, day]) => {
                  const bi = BOOKING_CELLS.findIndex(b => b.row === row && b.col === col)
                  return (
                    <React.Fragment key={`${row}-${col}`}>
                      <rect
                        id={bi >= 0 ? `s1-rect-${bi}` : undefined}
                        x={4 + col * 37} y={62 + row * 30}
                        width={33} height={24} rx={7}
                        fill="#f0f4ff"
                      />
                      <text
                        id={bi >= 0 ? `s1-txt-${bi}` : undefined}
                        x={4 + col * 37 + 16} y={62 + row * 30 + 16}
                        textAnchor="middle" fontSize={10} fontWeight={500}
                        fill="#606060" fontFamily="system-ui,-apple-system,sans-serif"
                      >{day}</text>
                    </React.Fragment>
                  )
                })}
              </svg>
              {/* Booking confirm pill */}
              <div ref={pillRef} style={{
                position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                background: accent, color: '#fff', fontSize: 11, fontWeight: 600,
                padding: '6px 16px', borderRadius: 100, whiteSpace: 'nowrap',
                opacity: 0,
              }}/>
            </div>
          )}

          {/* Step 2 — Loyalty (#fafafa bg) */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '0 24px', width: '100%' }}>
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                <div id="s2-badge-0" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.04em' }}>Visite</span>
                </div>
                <div id="s2-badge-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 88, height: 88, borderRadius: 24, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2c0 6-6 7-6 13a6 6 0 0 0 12 0c0-6-6-7-6-13z"/>
                      <path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6z"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.04em' }}>Streak</span>
                </div>
                <div id="s2-badge-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="8 21 12 17 16 21"/>
                      <line x1="12" y1="17" x2="12" y2="10"/>
                      <path d="M4 7h16"/>
                      <path d="M4 7c0-2.5 2-4 4-4h8c2 0 4 1.5 4 4"/>
                      <path d="M9 7v3a3 3 0 0 0 6 0V7"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.04em' }}>Premi</span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#888' }}>Punti accumulati</span>
                  <span ref={pointsRef} style={{ fontSize: 11, fontWeight: 700, color: accent }}>0 punti</span>
                </div>
                <div style={{ position: 'relative', height: 10, background: 'rgba(26,26,46,0.06)', borderRadius: 8 }}>
                  <div id="s2-bar" style={{ height: '100%', background: accent, borderRadius: 8, width: '0%' }}/>
                  <div id="s2-cursor" style={{ position: 'absolute', top: -3, left: '0%', marginLeft: -8, width: 16, height: 16, borderRadius: '50%', background: accent, border: '2.5px solid #fafafa' }}/>
                </div>
              </div>
              {/* Streak card */}
              <div id="s2-streak" style={{
                background: accent, borderRadius: 16, padding: '12px 20px',
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>5</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', lineHeight: 1.35 }}>visite<br/>consecutive</span>
              </div>
            </div>
          )}

          {/* Step 3 — Notifications (dark gradient bg) */}
          {step === 3 && (
            <div style={{ width: '88%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {NOTIF_DATA.map((notif, i) => (
                <div key={i} id={`s3-notif-${i}`} style={{
                  background: `rgba(255,255,255,${0.06 + i * 0.03})`,
                  borderRadius: 14,
                  border: `0.5px solid rgba(255,255,255,${0.10 + i * 0.04})`,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.text}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.sub}</p>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{notif.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 12px', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
          <div ref={cardRef} style={{
            background: '#fff', borderRadius: 24, padding: '20px 20px 16px',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
          }}>
            {/* Dots indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  height: 4, width: i === step ? 20 : 4, borderRadius: 100,
                  background: '#000',
                  opacity: i === step ? 1 : 0.15,
                  transition: 'all 250ms ease',
                }}/>
              ))}
            </div>

            {step === 0 && (
              <>
                <p style={tagSt}>Benvenuto</p>
                <p style={headSt}>{"Il tuo barbiere,\nsempre con te."}</p>
                <p style={subSt}>Prenota, guadagna punti, ricevi offerte esclusive. Tutto in un posto.</p>
                <button onClick={() => goTo(1)} style={btnSt}>Scopri come →</button>
                <button onClick={() => goTo(3)} style={skipSt}>Salta intro</button>
              </>
            )}

            {step === 1 && (
              <>
                <p style={tagSt}>Prenotazioni</p>
                <p style={headSt}>{"Prenota in\n3 tap."}</p>
                <p style={subSt}>Scegli servizio, scegli il giorno. Conferma istantanea, zero attese.</p>
                <button onClick={() => goTo(2)} style={btnSt}>Avanti →</button>
                <button onClick={() => goTo(3)} style={skipSt}>Salta</button>
              </>
            )}

            {step === 2 && (
              <>
                <p style={tagSt}>Fedeltà</p>
                <p style={headSt}>{"Ogni visita\nvale di più."}</p>
                <p style={subSt}>Accumula punti, scala i livelli, sblocca premi esclusivi riservati a te.</p>
                <button onClick={() => goTo(3)} style={btnSt}>Avanti →</button>
                <button onClick={() => goTo(3)} style={skipSt}>Salta</button>
              </>
            )}

            {step === 3 && (
              <>
                <p style={tagSt}>Notifiche</p>
                <p style={headSt}>{"Non perderti\nnulla."}</p>
                <p style={subSt}>Promemoria, punti guadagnati e offerte esclusive. Sempre in tempo reale.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={handleActivate}
                    disabled={loading}
                    style={{ ...btnSt, opacity: loading ? 0.75 : 1, cursor: loading ? 'default' : 'pointer' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {loading ? 'Attivazione…' : 'Attiva notifiche'}
                  </button>
                  <button
                    onClick={() => saveAndClose(false)}
                    disabled={loading}
                    style={{ width: '100%', border: 'none', background: 'transparent', color: '#aaa', fontSize: 14, cursor: 'pointer', padding: '10px 0', borderRadius: 14 }}
                  >
                    Adesso no
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
