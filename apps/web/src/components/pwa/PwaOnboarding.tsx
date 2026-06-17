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

// ── Step 1: booking flow data ────────────────────────────────────────────────
const BARBERS = ['M', 'L', 'A'] // Marco, Luca, Andrea — L (index 1) gets selected
const DATES   = [
  { dow: 'Mar', day: '16' },
  { dow: 'Mer', day: '17' },
  { dow: 'Gio', day: '18' }, // index 2 — gets selected
  { dow: 'Ven', day: '19' },
  { dow: 'Sab', day: '20' },
]

// ── Notifications ─────────────────────────────────────────────────────────────
const NOTIF_DATA = [
  { text: 'Prenotazione confermata', sub: 'Giovedì 19 · 10:00',        time: '5m'     },
  { text: 'Streak di 5 visite',      sub: 'Continua, sei in serie',    time: '1m'     },
  { text: 'Premio sbloccato',        sub: 'Taglio gratis disponibile', time: 'adesso' },
]
const NOTIF_X = [18, -12, 8]

export function PwaOnboarding({ primaryColor, logoUrl, businessName, tenantId }: Props) {
  const [show,          setShow]          = React.useState(false)
  const [step,          setStep]          = React.useState(0)
  const [loading,       setLoading]       = React.useState(false)
  const [transitioning, setTransitioning] = React.useState(false)
  const [userLoggedIn,  setUserLoggedIn]  = React.useState(false)

  const contentRef = React.useRef<HTMLDivElement>(null)
  const cardRef    = React.useRef<HTMLDivElement>(null)
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
    gsap.fromTo(cardRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
  }, [show])

  // ── Step animations ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show) return
    const d = step === 0 ? 0.25 : 0.05

    if (step === 0) {
      // Spotlight glow expands first, then logo appears through it
      gsap.set('#s0-glow', { scale: 0.2, opacity: 0 })
      track(gsap.to('#s0-glow', { scale: 1, opacity: 1, duration: 0.85, delay: d, ease: 'power2.out' }))
      track(gsap.to('#s0-glow', { scale: 1.14, opacity: 0.8, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: d + 1.1 }))

      // Logo: scale + y + slight rotation entrance, then gentle float loop
      gsap.set('#s0-logo', { scale: 0.58, opacity: 0, y: 20, rotation: -6 })
      track(gsap.to('#s0-logo', { scale: 1, opacity: 1, y: 0, rotation: 0, duration: 0.72, delay: d + 0.2, ease: 'back.out(1.9)' }))
      track(gsap.to('#s0-logo', { y: -6, scale: 1.03, duration: 3.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: d + 1.1 }))

      // Subtle halo ring — expands and fades in loop (sonar but just 1 ring, understated)
      track(gsap.fromTo('#s0-ring',
        { scale: 1, opacity: 0.28 },
        { scale: 1.9, opacity: 0, duration: 2.6, repeat: -1, ease: 'power1.out', transformOrigin: '50% 50%', delay: d + 0.5 },
      ))

      // Swipe pill slides right, snaps back, repeats
      gsap.set('#s0-swipe-pill', { x: 0 })
      const swipeTl = gsap.timeline({ repeat: -1, delay: d + 1.0 })
      swipeTl
        .to('#s0-swipe-pill', { x: 144, duration: 1.55, ease: 'power2.inOut' })
        .set('#s0-swipe-pill', { x: 0 })
        .set({}, {}, '+=0.3')
      track(swipeTl)

    } else if (step === 1) {
      // Init all 3 rows hidden
      gsap.set(['#s1-step-salone', '#s1-step-barber', '#s1-step-date'], { y: 16, opacity: 0 })
      gsap.set('#s1-salone-checkpath', { attr: { strokeDashoffset: 22 } })
      gsap.set('#s1-barber-sel',      { backgroundColor: '#ebebeb' })
      gsap.set('#s1-barber-sel-txt',  { color: '#999' })
      gsap.set('#s1-date-sel',        { backgroundColor: '#dde5ff' })
      gsap.set(['#s1-date-sel-dow','#s1-date-sel-num'], { color: '#4a5c9a' })

      const tl = gsap.timeline({ repeat: -1, delay: d + 0.3, repeatDelay: 0.5 })
      tl
        // ① Salone appears
        .to('#s1-step-salone', { y: 0, opacity: 1, duration: 0.38, ease: 'power2.out' })
        .set({}, {}, '+=0.18')
        // Checkmark draws
        .fromTo('#s1-salone-checkpath',
          { attr: { strokeDashoffset: 22 } },
          { attr: { strokeDashoffset: 0 }, duration: 0.38, ease: 'power2.out' },
        )
        .set({}, {}, '+=0.18')

        // ② Barber row appears
        .to('#s1-step-barber', { y: 0, opacity: 1, duration: 0.38, ease: 'power2.out' })
        .set({}, {}, '+=0.2')
        // Middle avatar selected: fill + bounce
        .to('#s1-barber-sel', { backgroundColor: accent, scale: 1.14, duration: 0.28, ease: 'back.out(2.2)' })
        .to('#s1-barber-sel-txt', { color: '#fff', duration: 0.1 }, '<')
        .to('#s1-barber-sel', { scale: 1, duration: 0.2, ease: 'power2.out' })
        .set({}, {}, '+=0.18')

        // ③ Date row appears
        .to('#s1-step-date', { y: 0, opacity: 1, duration: 0.38, ease: 'power2.out' })
        .set({}, {}, '+=0.2')
        // "Gio" date selected: fill + bounce
        .to('#s1-date-sel', { backgroundColor: accent, scale: 1.12, duration: 0.28, ease: 'back.out(2.2)' })
        .to(['#s1-date-sel-dow', '#s1-date-sel-num'], { color: '#fff', duration: 0.1 }, '<')
        .to('#s1-date-sel', { scale: 1, duration: 0.2, ease: 'power2.out' })

        // Hold all 3 complete
        .set({}, {}, '+=1.1')

        // Fade all out
        .to(['#s1-step-salone', '#s1-step-barber', '#s1-step-date'],
          { opacity: 0, y: 10, duration: 0.28, ease: 'power2.in', stagger: 0.07 },
        )
        // Reset for next loop
        .call(() => {
          gsap.set(['#s1-step-salone', '#s1-step-barber', '#s1-step-date'], { y: 16, opacity: 0 })
          gsap.set('#s1-salone-checkpath', { attr: { strokeDashoffset: 22 } })
          gsap.set('#s1-barber-sel',     { backgroundColor: '#ebebeb', scale: 1 })
          gsap.set('#s1-barber-sel-txt', { color: '#999' })
          gsap.set('#s1-date-sel',       { backgroundColor: '#dde5ff', scale: 1 })
          gsap.set(['#s1-date-sel-dow','#s1-date-sel-num'], { color: '#4a5c9a' })
        })
      track(tl)

    } else if (step === 2) {
      ;[0, 1, 2].forEach(i => {
        const rot = i === 0 ? -18 : i === 2 ? 14 : -8
        gsap.set(`#s2-badge-${i}`, { scale: 0.35, opacity: 0, rotation: rot })
        track(gsap.to(`#s2-badge-${i}`, { scale: 1, opacity: 1, rotation: 0, duration: 0.55, delay: d + i * 0.15, ease: 'back.out(2.2)' }))
        track(gsap.to(`#s2-badge-${i}`, { y: -6, duration: 1.5 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: d + 0.65 + i * 0.28 }))
      })
      track(gsap.fromTo('#s2-bar',    { width: '0%' }, { width: '78%', duration: 1.25, delay: d + 0.55, ease: 'power2.out' }))
      track(gsap.fromTo('#s2-cursor', { left: '0%'  }, { left: '78%', duration: 1.25, delay: d + 0.55, ease: 'power2.out' }))
      gsap.set('#s2-shimmer', { x: -80 })
      track(gsap.to('#s2-shimmer', { x: 260, duration: 0.7, delay: d + 1.9, ease: 'power2.inOut' }))
      const obj = { val: 0 }
      track(gsap.to(obj, {
        val: 450, duration: 1.25, delay: d + 0.55, ease: 'power2.out',
        onUpdate: () => { if (pointsRef.current) pointsRef.current.textContent = `${Math.round(obj.val)} punti` },
        onComplete: () => {
          if (pointsRef.current) gsap.fromTo(pointsRef.current, { scale: 1 }, { scale: 1.22, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' })
        },
      }))
      gsap.set('#s2-streak', { y: 16, x: -8, opacity: 0 })
      track(gsap.to('#s2-streak', { y: 0, x: 0, opacity: 1, duration: 0.45, delay: d + 1.55, ease: 'power3.out' }))
      track(gsap.to('#s2-streak', { boxShadow: `0 0 0 3px ${accent}55`, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: d + 2.1 }))

    } else if (step === 3) {
      NOTIF_DATA.forEach((_, i) => {
        gsap.set(`#s3-notif-${i}`, { x: NOTIF_X[i], y: -22, opacity: 0 })
        track(gsap.to(`#s3-notif-${i}`, { x: 0, y: 0, opacity: 1, duration: 0.45, delay: 0.18 + i * 0.18, ease: 'power3.out' }))
        gsap.set(`#s3-icon-${i}`, { scale: 0.5 })
        track(gsap.to(`#s3-icon-${i}`, { scale: 1, duration: 0.38, delay: 0.42 + i * 0.18, ease: 'back.out(2.5)' }))
        track(gsap.to(`#s3-notif-${i}`, { y: -3 - i, duration: 2.5 + i * 0.45, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.85 + i * 0.38 }))
      })
      track(gsap.to('#s3-notif-2', { boxShadow: '0 0 0 2px rgba(255,255,255,0.25)', duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.4 }))
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

  const tagSt: React.CSSProperties = {
    margin: '0 0 8px', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, color: accent,
  }
  const headSt: React.CSSProperties = {
    margin: '0 0 8px', fontSize: 28, fontWeight: 700,
    lineHeight: 1.15, letterSpacing: '-0.02em', color: '#0a0a0a', whiteSpace: 'pre-line',
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

  // Step 1 helper styles
  const stepLabelSt: React.CSSProperties = {
    margin: '0 0 5px 2px', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9BA3AF',
  }
  const bookCardSt: React.CSSProperties = {
    background: '#fff', borderRadius: 14, padding: '11px 14px',
    boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', gap: 11,
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

          {/* ─── Step 0 — Hero logo + swipe ─────────────────────────────── */}
          {step === 0 && (
            <>
              {/* Spotlight glow */}
              <div id="s0-glow" style={{
                position: 'absolute', width: 280, height: 280, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.20) 0%, transparent 72%)',
                filter: 'blur(18px)', pointerEvents: 'none',
              }}/>

              {/* Single halo ring (sonar) */}
              <div id="s0-ring" style={{
                position: 'absolute',
                width: 160, height: 160, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.25)',
                pointerEvents: 'none',
              }}/>

              {/* Logo — the full hero */}
              <div id="s0-logo" style={{
                position: 'relative', zIndex: 1,
                width: 128, height: 128, borderRadius: 34,
                background: '#fff', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 28px 70px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.10)',
              }}>
                {logoUrl
                  ? <img src={logoUrl} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <span style={{ fontSize: 56, fontWeight: 800, color: accent, lineHeight: 1 }}>{initial}</span>
                }
              </div>

              {/* Swipe-to-continue pill — iOS lock-screen style */}
              <div style={{
                position: 'absolute', bottom: 28,
                width: 200, height: 42, borderRadius: 21,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.13)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', padding: '0 5px',
              }}>
                <div id="s0-swipe-pill" style={{
                  width: 32, height: 32, borderRadius: 16, flexShrink: 0,
                  background: 'rgba(255,255,255,0.88)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                <span style={{
                  flex: 1, textAlign: 'center', paddingRight: 6,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
                }}>Inizia</span>
              </div>
            </>
          )}

          {/* ─── Step 1 — 3-step booking flow ───────────────────────────── */}
          {step === 1 && (
            <div style={{ width: '88%', maxWidth: 310, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* ① Salone */}
              <div id="s1-step-salone">
                <p style={stepLabelSt}>Dove</p>
                <div style={bookCardSt}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{businessName}</span>
                  {/* Animated checkmark */}
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        id="s1-salone-checkpath"
                        d="M2.5 7 L5.5 10 L11.5 4"
                        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        strokeDasharray="22" strokeDashoffset="22"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* ② Barbiere */}
              <div id="s1-step-barber">
                <p style={stepLabelSt}>Con chi</p>
                <div style={{ ...bookCardSt, gap: 8 }}>
                  {BARBERS.map((b, i) => (
                    <div
                      key={i}
                      id={i === 1 ? 's1-barber-sel' : undefined}
                      style={{
                        width: 46, height: 46, borderRadius: 23,
                        backgroundColor: '#ebebeb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        id={i === 1 ? 's1-barber-sel-txt' : undefined}
                        style={{ fontSize: 16, fontWeight: 700, color: '#999' }}
                      >{b}</span>
                    </div>
                  ))}
                  <span style={{ flex: 1, fontSize: 12, color: '#bbb', paddingLeft: 4 }}>Scegli il tuo stylist</span>
                </div>
              </div>

              {/* ③ Data */}
              <div id="s1-step-date">
                <p style={stepLabelSt}>Quando</p>
                <div style={{ ...bookCardSt, gap: 6 }}>
                  {DATES.map((d, i) => (
                    <div
                      key={i}
                      id={i === 2 ? 's1-date-sel' : undefined}
                      style={{
                        flex: 1,
                        backgroundColor: '#dde5ff',
                        borderRadius: 10, padding: '7px 0',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      }}
                    >
                      <span
                        id={i === 2 ? 's1-date-sel-dow' : undefined}
                        style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', color: '#4a5c9a' }}
                      >{d.dow}</span>
                      <span
                        id={i === 2 ? 's1-date-sel-num' : undefined}
                        style={{ fontSize: 15, fontWeight: 800, color: '#4a5c9a', lineHeight: 1 }}
                      >{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2 — Loyalty ───────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '0 24px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                <div id="s2-badge-0" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.04em' }}>Visite</span>
                </div>
                <div id="s2-badge-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 88, height: 88, borderRadius: 24, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2c0 6-6 7-6 13a6 6 0 0 0 12 0c0-6-6-7-6-13z"/>
                      <path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6z"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.04em' }}>Streak</span>
                </div>
                <div id="s2-badge-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
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
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#888' }}>Punti accumulati</span>
                  <span ref={pointsRef} style={{ fontSize: 11, fontWeight: 700, color: accent, display: 'inline-block' }}>0 punti</span>
                </div>
                <div style={{ position: 'relative', height: 10, background: 'rgba(26,26,46,0.06)', borderRadius: 8 }}>
                  <div id="s2-bar" style={{ height: '100%', background: accent, borderRadius: 8, width: '0%', position: 'relative', overflow: 'hidden' }}>
                    <div id="s2-shimmer" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: 70, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', borderRadius: 8 }}/>
                  </div>
                  <div id="s2-cursor" style={{ position: 'absolute', top: -3, left: '0%', marginLeft: -8, width: 16, height: 16, borderRadius: '50%', background: accent, border: '2.5px solid #fafafa' }}/>
                </div>
              </div>
              <div id="s2-streak" style={{ background: accent, borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>5</span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>visite consecutive</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Sei in una serie perfetta</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3 — Notifications ─────────────────────────────────── */}
          {step === 3 && (
            <div style={{ width: '88%', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 260, height: 160, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.09) 0%, transparent 70%)', filter: 'blur(18px)', pointerEvents: 'none' }}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
                {NOTIF_DATA.map((notif, i) => (
                  <div key={i} id={`s3-notif-${i}`} style={{ background: `rgba(255,255,255,${0.06 + i * 0.03})`, borderRadius: 14, border: `0.5px solid rgba(255,255,255,${0.10 + i * 0.04})`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div id={`s3-icon-${i}`} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'rgba(255,255,255,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            </div>
          )}
        </div>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 12px', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
          <div ref={cardRef} style={{ background: '#fff', borderRadius: 24, padding: '20px 20px 16px', boxShadow: '0 -4px 40px rgba(0,0,0,0.12)' }}>
            {/* Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ height: 4, width: i === step ? 20 : 4, borderRadius: 100, background: '#000', opacity: i === step ? 1 : 0.15, transition: 'all 280ms ease' }}/>
              ))}
            </div>

            {step === 0 && (
              <>
                <p style={tagSt}>Benvenuto</p>
                <p style={headSt}>{"Il tuo barbiere,\nsempre con te."}</p>
                <p style={subSt}>Prenota, guadagna punti, ricevi offerte esclusive. Tutto in un posto.</p>
                <button onClick={() => goTo(1)} style={btnSt}>Inizia</button>
                <button onClick={() => goTo(3)} style={skipSt}>Salta intro</button>
              </>
            )}

            {step === 1 && (
              <>
                <p style={tagSt}>Prenotazioni</p>
                <p style={headSt}>{"Prenota in\n3 tap."}</p>
                <p style={subSt}>Scegli il salone, il tuo stylist e il giorno. Conferma istantanea.</p>
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
                  <button onClick={handleActivate} disabled={loading} style={{ ...btnSt, opacity: loading ? 0.75 : 1, cursor: loading ? 'default' : 'pointer' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {loading ? 'Attivazione…' : 'Attiva notifiche'}
                  </button>
                  <button onClick={() => saveAndClose(false)} disabled={loading} style={{ width: '100%', border: 'none', background: 'transparent', color: '#aaa', fontSize: 14, cursor: 'pointer', padding: '10px 0', borderRadius: 14 }}>
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
