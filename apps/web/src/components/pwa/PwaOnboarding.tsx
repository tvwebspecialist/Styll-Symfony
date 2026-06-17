'use client'

import * as React from 'react'
import gsap from 'gsap'
import { Bell, Calendar, Award, ChevronRight } from 'lucide-react'
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

function darken(hex: string, f = 0.55): string {
  const c = hex.replace('#', '')
  const n = (s: number) => Math.round(parseInt(c.slice(s, s + 2), 16) * f).toString(16).padStart(2, '0')
  return `#${n(0)}${n(2)}${n(4)}`
}

function hexAlpha(hex: string, a: number): string {
  const h = Math.round(a * 255).toString(16).padStart(2, '0')
  return `${hex}${h}`
}

// ── Calendar constants ────────────────────────────────────────────────────────
const CAL_HEADERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const CAL_HL: [number, number][] = [[1, 2], [2, 4], [3, 1]]
const CAL_DAYS: [number, number, string][] = [
  [0,2,'1'],[0,3,'2'],[0,4,'3'],[0,5,'4'],[0,6,'5'],
  [1,0,'6'],[1,1,'7'],[1,2,'8'],[1,3,'9'],[1,4,'10'],[1,5,'11'],[1,6,'12'],
  [2,0,'13'],[2,1,'14'],[2,2,'15'],[2,3,'16'],[2,4,'17'],[2,5,'18'],[2,6,'19'],
  [3,0,'20'],[3,1,'21'],[3,2,'22'],[3,3,'23'],[3,4,'24'],[3,5,'25'],[3,6,'26'],
  [4,0,'27'],[4,1,'28'],[4,2,'29'],[4,3,'30'],[4,4,'31'],
]

// ── Notification data ─────────────────────────────────────────────────────────
const NOTIF_DATA = [
  { title: 'Prenotazione confermata', body: 'Giovedì alle 10:00',        time: '5m'     },
  { title: 'Streak di 5 visite',      body: 'Continua, sei in serie!',   time: '1m'     },
  { title: 'Premio sbloccato',        body: 'Taglio gratis disponibile', time: 'adesso' },
]

export function PwaOnboarding({ primaryColor, logoUrl, businessName, tenantId }: Props) {
  const [show,          setShow]          = React.useState(false)
  const [step,          setStep]          = React.useState(0)
  const [loading,       setLoading]       = React.useState(false)
  const [transitioning, setTransitioning] = React.useState(false)
  const [userLoggedIn,  setUserLoggedIn]  = React.useState(false)

  const contentRef = React.useRef<HTMLDivElement>(null)
  const tweensRef  = React.useRef<Array<{ kill: () => void }>>([])

  const { subscribe } = usePushSubscription(tenantId)

  const accent   = primaryColor || '#1A1A2E'
  const darker   = darken(accent)
  const gradient = `linear-gradient(135deg, ${accent} 0%, ${darker} 100%)`
  const initial  = businessName.charAt(0).toUpperCase()

  const killTweens = React.useCallback(() => {
    tweensRef.current.forEach(t => { try { t.kill() } catch { /* */ } })
    tweensRef.current = []
  }, [])

  function track<T extends { kill: () => void }>(t: T): T {
    tweensRef.current.push(t)
    return t
  }

  // ── Check show conditions ─────────────────────────────────────────────────
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
          const prefs = res.data?.notification_preferences ?? {}
          if (prefs.onboarding_completed === true) {
            localStorage.setItem(LS_KEY, 'true')
            return
          }
        }
      } catch { /* show anyway */ }
      setShow(true)
    }
    check().catch(console.error)
  }, [tenantId])

  // ── Initial fade-in ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show || !contentRef.current) return
    gsap.fromTo(contentRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [show])

  // ── Step entrance animations ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!show) return
    const delay = step === 0 ? 0.3 : 0.05

    if (step === 0) {
      gsap.set('#ob1-logo', { scale: 0.7, opacity: 0 })
      track(gsap.to('#ob1-logo', { scale: 1, opacity: 1, duration: 0.6, delay: delay + 0.1, ease: 'back.out(1.7)' }))
      track(gsap.fromTo('#ob1-ring1',
        { scale: 1, opacity: 0.55 },
        { scale: 1.55, opacity: 0, duration: 2, repeat: -1, ease: 'power1.out', transformOrigin: '50% 50%', delay: delay + 0.35 },
      ))
      track(gsap.fromTo('#ob1-ring2',
        { scale: 1, opacity: 0.3 },
        { scale: 1.65, opacity: 0, duration: 2.5, repeat: -1, ease: 'power1.out', delay: delay + 1.1, transformOrigin: '50% 50%' },
      ))
      track(gsap.to('#ob1-orbit', { rotation: 360, duration: 12, repeat: -1, ease: 'none', transformOrigin: '50% 50%', delay: delay + 0.3 }))

    } else if (step === 1) {
      gsap.set('#ob2-calendar', { y: -20, opacity: 0 })
      track(gsap.to('#ob2-calendar', { y: 0, opacity: 1, duration: 0.4, delay: 0.05, ease: 'power2.out' }))
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7, delay: 0.5 })
      CAL_HL.forEach((_, j) => {
        tl.to(`#ob2-cal-c${j}`, { fill: accent, scale: 1.12, transformOrigin: 'center', duration: 0.3 })
          .to(`#ob2-cal-c${j}`, { fill: '#EBEBEB', scale: 1, duration: 0.25, delay: 0.3 })
      })
      track(tl)

    } else if (step === 2) {
      ;[0, 1, 2].forEach((i) => {
        gsap.set(`#ob3-badge-${i}`, { y: 32, scale: 0.5, opacity: 0 })
        track(gsap.to(`#ob3-badge-${i}`, { y: 0, scale: 1, opacity: 1, duration: 0.5, delay: 0.05 + i * 0.15, ease: 'back.out(1.7)' }))
        track(gsap.to(`#ob3-badge-${i}`, { y: -5, duration: 1.2 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.65 + i * 0.15 }))
      })
      track(gsap.fromTo('#ob3-bar',    { width: '0%' }, { width: '80%', duration: 1, delay: 0.55, ease: 'power2.out' }))
      track(gsap.fromTo('#ob3-cursor', { left: '0%'  }, { left: '80%', duration: 1, delay: 0.55, ease: 'power2.out' }))
      gsap.set('#ob3-label', { opacity: 0 })
      track(gsap.to('#ob3-label', { opacity: 1, duration: 0.4, delay: 1.3 }))

    } else if (step === 3) {
      const SCALES  = [0.88, 0.94, 1.0]
      const OPACITS = [0.55, 0.78, 1.0]
      NOTIF_DATA.forEach((_, i) => {
        gsap.set(`#ob4-notif-${i}`, { y: -30, scale: SCALES[i], opacity: 0, transformOrigin: 'top center' })
        track(gsap.to(`#ob4-notif-${i}`, {
          y: 0, opacity: OPACITS[i],
          duration: 0.4, delay: 0.05 + i * 0.18, ease: 'power2.out',
        }))
        track(gsap.to(`#ob4-notif-${i}`, {
          y: -4, duration: 2.5 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.65 + i * 0.18,
        }))
      })
    }

    return killTweens
  }, [step, show, accent, killTweens])

  // ── Navigation ────────────────────────────────────────────────────────────
  function goTo(n: number) {
    if (transitioning || n < 0 || n > 3) return
    killTweens()
    if (contentRef.current) {
      setTransitioning(true)
      gsap.to(contentRef.current, {
        opacity: 0, y: -8, duration: 0.2, ease: 'power2.in',
        onComplete: () => {
          setStep(n)
          setTransitioning(false)
          gsap.to(contentRef.current!, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
        },
      })
    } else {
      setStep(n)
    }
  }

  // ── Close handlers ────────────────────────────────────────────────────────
  async function handleActivate() {
    if (loading) return
    setLoading(true)
    try {
      if (!('Notification' in window)) { await saveAndClose(false); return }
      const perm = await Notification.requestPermission()
      if (perm === 'granted') { await subscribe(); await saveAndClose(true) }
      else                    { await saveAndClose(false) }
    } finally {
      setLoading(false)
    }
  }

  async function saveAndClose(accepted: boolean) {
    killTweens()
    localStorage.setItem(LS_KEY, 'true')
    setShow(false)
    if (userLoggedIn) {
      updateNotificationPreferences({
        onboarding_completed: true,
        push_prompted:        true,
        push_accepted:        accepted,
      }).catch(console.error)
    }
  }

  if (!show) return null

  // ── Per-step visual backgrounds ───────────────────────────────────────────
  const VISUAL_BG = [
    gradient,
    'var(--color-background-secondary, #F4F5F7)',
    hexAlpha(accent, 0.05),
    '#FFFFFF',
  ]

  // ── Shared style fragments ────────────────────────────────────────────────
  const tagStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    margin: '0 0 4px', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: accent,
  }
  const headingStyle: React.CSSProperties = {
    margin: '0 0 6px', fontSize: 20, fontWeight: 800,
    color: 'var(--color-text-primary, #111)', lineHeight: 1.22,
  }
  const subStyle: React.CSSProperties = {
    margin: '0 0 18px', fontSize: 14,
    color: 'var(--color-text-secondary, #666)', lineHeight: 1.55,
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
    background: gradient, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      overflowX: 'hidden',
    }}>
      <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Visual area (58vh) ───────────────────────────────────────────── */}
        <div style={{
          height: '58vh', flexShrink: 0, overflow: 'hidden',
          background: VISUAL_BG[step],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>

          {/* Step 0 — Brand splash */}
          {step === 0 && (
            <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div id="ob1-ring1" style={{ position: 'absolute', width: 110, height: 110, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)' }} />
              <div id="ob1-ring2" style={{ position: 'absolute', width: 155, height: 155, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.22)' }} />
              <div id="ob1-orbit" style={{ position: 'absolute', width: 180, height: 180 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{
                    position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.65)',
                    top: '50%', left: '50%', marginTop: -4, marginLeft: -4,
                    transform: `rotate(${i * 90}deg) translateX(90px)`,
                  }} />
                ))}
              </div>
              <div id="ob1-logo" style={{
                position: 'relative', zIndex: 1, width: 84, height: 84, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', overflow: 'hidden',
              }}>
                {logoUrl
                  ? <img src={logoUrl} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 34, fontWeight: 800, color: '#fff' }}>{initial}</span>
                }
              </div>
            </div>
          )}

          {/* Step 1 — Calendar */}
          {step === 1 && (
            <div id="ob2-calendar" style={{ padding: '8px 12px' }}>
              <svg width="266" height="212" viewBox="0 0 266 212" fill="none">
                {/* Month header */}
                <text x="133" y="17" textAnchor="middle" fontSize={13} fontWeight={700} fill="#333" fontFamily="system-ui,-apple-system,sans-serif">Giugno</text>
                {/* Day-of-week labels */}
                {CAL_HEADERS.map((h, col) => (
                  <text key={col} x={4 + col * 38 + 14} y={36} textAnchor="middle" fontSize={11} fontWeight={600} fill="#B8B8B8" fontFamily="system-ui,-apple-system,sans-serif">{h}</text>
                ))}
                {/* Cell rects */}
                {Array.from({ length: 5 }, (_, row) =>
                  Array.from({ length: 7 }, (_, col) => {
                    if (row === 0 && col < 2) return null
                    if (row === 4 && col > 4) return null
                    const hlIdx = CAL_HL.findIndex(([r, c]) => r === row && c === col)
                    const isHl  = hlIdx >= 0
                    return (
                      <rect
                        key={`${row}-${col}`}
                        id={isHl ? `ob2-cal-c${hlIdx}` : undefined}
                        x={4 + col * 38}
                        y={44 + row * 31}
                        width={34}
                        height={26}
                        rx={7}
                        fill={isHl ? '#EBEBEB' : '#F2F2F2'}
                      />
                    )
                  })
                )}
                {/* Day numbers */}
                {CAL_DAYS.map(([row, col, day]) => (
                  <text
                    key={`d${row}${col}`}
                    x={4 + col * 38 + 17}
                    y={44 + row * 31 + 17}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={500}
                    fill="#606060"
                    fontFamily="system-ui,-apple-system,sans-serif"
                  >{day}</text>
                ))}
              </svg>
            </div>
          )}

          {/* Step 2 — Loyalty badges + progress bar */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%', padding: '0 28px' }}>
              <div style={{ display: 'flex', gap: 28 }}>
                {[
                  {
                    label: 'Visite', id: 'ob3-badge-0',
                    icon: (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'Streak', id: 'ob3-badge-1',
                    icon: (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2c0 6-6 7-6 13a6 6 0 0 0 12 0c0-6-6-7-6-13z"/>
                        <path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6z"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'Premi', id: 'ob3-badge-2',
                    icon: (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="8 21 12 17 16 21"/>
                        <line x1="12" y1="17" x2="12" y2="10"/>
                        <path d="M4 7h16"/>
                        <path d="M4 7c0-2.5 2-4 4-4h8c2 0 4 1.5 4 4"/>
                        <path d="M9 7v3a3 3 0 0 0 6 0V7"/>
                      </svg>
                    ),
                  },
                ].map(({ label, id, icon }) => (
                  <div id={id} key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 62, height: 62, borderRadius: '50%', background: accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 8px 20px ${hexAlpha(accent, 0.33)}`,
                    }}>
                      {icon}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#666', letterSpacing: '0.02em' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: '100%' }}>
                <div id="ob3-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>Punti accumulati</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>450 / 500</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ height: 10, background: '#E2E2E2', borderRadius: 100 }}>
                    <div id="ob3-bar" style={{ height: '100%', background: gradient, borderRadius: 100, width: '0%' }} />
                  </div>
                  <div id="ob3-cursor" style={{
                    position: 'absolute', top: -3, left: '0%', marginLeft: -8,
                    width: 16, height: 16, borderRadius: '50%', background: accent,
                    border: '2px solid #fff', boxShadow: `0 2px 8px ${hexAlpha(accent, 0.4)}`,
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — iOS notification stack */}
          {step === 3 && (
            <div style={{ position: 'relative', width: '88%', height: 185 }}>
              {NOTIF_DATA.map((notif, i) => (
                <div
                  key={i}
                  id={`ob4-notif-${i}`}
                  style={{
                    position: 'absolute',
                    left: `${(2 - i) * 5}%`, right: `${(2 - i) * 5}%`,
                    top: (2 - i) * 14,
                    zIndex: i + 1,
                  }}
                >
                  <div style={{
                    background: '#fff', borderRadius: 18, padding: '12px 14px',
                    border: '1px solid #EBEBEB',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: accent,
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bell size={17} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.body}</p>
                    </div>
                    <span style={{ fontSize: 10, color: '#B8B8B8', flexShrink: 0 }}>{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Text + CTA area ──────────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'var(--color-background-primary, #fff)',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '20px 24px 8px', flex: 1 }}>

            {step === 0 && (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary, #111)', lineHeight: 1.18 }}>{businessName}</p>
                <p style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--color-text-secondary, #666)', lineHeight: 1.5 }}>Il tuo barbiere, sempre con te</p>
                <button
                  onClick={() => goTo(1)}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#111', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  Inizia <ChevronRight size={18} />
                </button>
              </>
            )}

            {step === 1 && (
              <>
                <p style={tagStyle}><Calendar size={12} />Prenotazioni</p>
                <p style={headingStyle}>Prenota in 3 tap</p>
                <p style={subStyle}>Scegli servizio, giorno e orario. Conferma istantanea.</p>
                <button onClick={() => goTo(2)} style={btnPrimary}>Avanti</button>
              </>
            )}

            {step === 2 && (
              <>
                <p style={tagStyle}><Award size={12} />Fedeltà</p>
                <p style={headingStyle}>Guadagna punti ad ogni visita</p>
                <p style={subStyle}>Streak, livelli e premi esclusivi per i clienti più fedeli.</p>
                <button onClick={() => goTo(3)} style={btnPrimary}>Avanti</button>
              </>
            )}

            {step === 3 && (
              <>
                <p style={tagStyle}><Bell size={12} />Notifiche</p>
                <p style={headingStyle}>Resta sempre aggiornato</p>
                <p style={subStyle}>Promemoria, punti e offerte direttamente sul tuo telefono.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={handleActivate}
                    disabled={loading}
                    style={{ ...btnPrimary, opacity: loading ? 0.75 : 1, transition: 'opacity 150ms', cursor: loading ? 'default' : 'pointer' }}
                  >
                    <Bell size={18} />
                    {loading ? 'Attivazione…' : 'Attiva notifiche'}
                  </button>
                  <button
                    onClick={() => saveAndClose(false)}
                    disabled={loading}
                    style={{ width: '100%', padding: '11px', border: 'none', background: 'transparent', color: '#AAA', fontSize: 14, cursor: 'pointer', borderRadius: 14 }}
                  >
                    Adesso no
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Dots nav ─────────────────────────────────────────────────── */}
          <div style={{ padding: '6px 24px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {step < 3 ? (
              <button
                onClick={() => goTo(step + 1)}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#BBBBBB', cursor: 'pointer', padding: '4px 0' }}
              >
                Salta
              </button>
            ) : (
              <div style={{ width: 32 }} />
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ height: 6, width: i === step ? 20 : 6, borderRadius: 100, background: i === step ? accent : '#DDDDDD', transition: 'all 250ms ease' }} />
              ))}
            </div>
            <div style={{ width: 32 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
