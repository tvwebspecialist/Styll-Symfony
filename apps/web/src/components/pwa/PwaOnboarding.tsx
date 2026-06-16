'use client'

import * as React from 'react'
import gsap from 'gsap'
import {
  Bell, CalendarCheck, PenLine, ShoppingBag, Droplets, Sparkles,
  Flame, Gift, Tag, Trophy, ChevronRight, LogIn,
} from 'lucide-react'
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
  const n = (s: number) =>
    Math.round(parseInt(c.slice(s, s + 2), 16) * f).toString(16).padStart(2, '0')
  return `#${n(0)}${n(2)}${n(4)}`
}

const DEMO_NOTIFS = [
  { title: 'Appuntamento confermato ✅', body: 'Giovedì 19 giugno · 10:00',      time: 'adesso'  },
  { title: 'Hai guadagnato 100 punti 🏆', body: 'Totale: 350 punti',             time: '2 min fa' },
  { title: 'Promemoria ⏰',               body: 'Domani alle 10:00 ti aspettiamo', time: '1h fa'   },
]

export function PwaOnboarding({ primaryColor, logoUrl, businessName, tenantId }: Props) {
  const [show,          setShow]          = React.useState(false)
  const [step,          setStep]          = React.useState(0)
  const [loading,       setLoading]       = React.useState(false)
  const [transitioning, setTransitioning] = React.useState(false)
  const [userLoggedIn,  setUserLoggedIn]  = React.useState(false)

  const cardRef = React.useRef<HTMLDivElement>(null)
  const stepRef = React.useRef<HTMLDivElement>(null)

  const { subscribe } = usePushSubscription(tenantId)

  const accent   = primaryColor || '#1A1A2E'
  const darker   = darken(accent)
  const gradient = `linear-gradient(135deg, ${accent} 0%, ${darker} 100%)`
  const initial  = businessName.charAt(0).toUpperCase()

  // ── Check show conditions (localStorage primary, DB secondary) ──────────────
  React.useEffect(() => {
    async function check() {
      if (typeof window === 'undefined') return
      if (!window.matchMedia('(display-mode: standalone)').matches) return
      if (localStorage.getItem(LS_KEY) === 'true') return

      // Optionally sync with DB if logged in
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
      } catch {
        // getUser() failure → show onboarding anyway, user not logged in
      }

      setShow(true)
    }
    check().catch(console.error)
  }, [tenantId])

  // ── Animate card in ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show || !cardRef.current) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 40, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' },
    )
  }, [show])

  // ── Step entrance animations ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show) return
    const delay = step === 0 ? 0.25 : 0.05

    if (stepRef.current) {
      gsap.set(stepRef.current, { opacity: 0, y: 10 })
      gsap.to(stepRef.current, { opacity: 1, y: 0, duration: 0.3, delay, ease: 'power2.out' })
    }

    if (step === 0) {
      gsap.set('#ob-s0-logo',  { scale: 0.8, opacity: 0 })
      gsap.set('#ob-s0-texts', { y: 8, opacity: 0 })
      gsap.set('#ob-s0-cta',   { y: 6, opacity: 0 })
      gsap.to('#ob-s0-logo',  { scale: 1, opacity: 1, duration: 0.5, delay: delay + 0.1, ease: 'back.out(1.7)' })
      gsap.to('#ob-s0-texts', { y: 0, opacity: 1, duration: 0.4, delay: delay + 0.25, ease: 'power2.out' })
      gsap.to('#ob-s0-cta',   { y: 0, opacity: 1, duration: 0.35, delay: delay + 0.35, ease: 'power2.out' })
    } else if (step === 1) {
      ;[0, 1, 2].forEach((i) => {
        gsap.set(`#ob-s1-c${i}`, { x: -20, opacity: 0 })
        gsap.to(`#ob-s1-c${i}`, { x: 0, opacity: 1, duration: 0.35, delay: 0.05 + i * 0.15, ease: 'power2.out' })
      })
    } else if (step === 2) {
      ;[0, 1, 2].forEach((i) => {
        gsap.set(`#ob-s2-c${i}`, { y: 20, opacity: 0 })
        gsap.to(`#ob-s2-c${i}`, { y: 0, opacity: 1, duration: 0.35, delay: 0.05 + i * 0.12, ease: 'power2.out' })
      })
    } else if (step === 3) {
      gsap.set('#ob-s3-bar-fill', { width: '0%' })
      gsap.to('#ob-s3-bar-fill', { width: '90%', duration: 0.8, delay: 0.1, ease: 'power2.out' })
      ;[0, 1].forEach((i) => {
        gsap.set(`#ob-s3-c${i}`, { y: 16, opacity: 0 })
        gsap.to(`#ob-s3-c${i}`, { y: 0, opacity: 1, duration: 0.35, delay: 0.3 + i * 0.15, ease: 'power2.out' })
      })
    } else if (step === 4) {
      ;[0, 1, 2].forEach((i) => {
        gsap.set(`#ob-s4-n${i}`, { scale: 0.88 + i * 0.06, opacity: 0 })
        gsap.to(`#ob-s4-n${i}`, { scale: 1 - (2 - i) * 0.05, opacity: ([0.4, 0.7, 1])[i], duration: 0.35, delay: 0.05 + i * 0.1, ease: 'power2.out' })
      })
      ;[0, 1, 2].forEach((i) => {
        gsap.set(`#ob-s4-b${i}`, { y: 8, opacity: 0 })
        gsap.to(`#ob-s4-b${i}`, { y: 0, opacity: 1, duration: 0.3, delay: 0.35 + i * 0.08, ease: 'power2.out' })
      })
      gsap.set('#ob-s4-cta', { y: 6, opacity: 0 })
      gsap.to('#ob-s4-cta', { y: 0, opacity: 1, duration: 0.3, delay: 0.6, ease: 'power2.out' })
    }
  }, [step, show])

  // ── Navigation ──────────────────────────────────────────────────────────────
  function goTo(n: number) {
    if (transitioning || n < 0 || n > 4) return
    if (stepRef.current) {
      setTransitioning(true)
      gsap.to(stepRef.current, {
        opacity: 0, y: -8, duration: 0.2, ease: 'power2.in',
        onComplete: () => { setStep(n); setTransitioning(false) },
      })
    } else {
      setStep(n)
    }
  }

  // ── Close handlers ──────────────────────────────────────────────────────────
  async function handleActivate() {
    if (loading) return
    setLoading(true)
    try {
      if (!('Notification' in window)) { await saveAndClose(false); return }
      const perm = await Notification.requestPermission()
      if (perm === 'granted') { await subscribe(); await saveAndClose(true) }
      else                   { await saveAndClose(false) }
    } finally {
      setLoading(false)
    }
  }

  async function saveAndClose(accepted: boolean) {
    localStorage.setItem(LS_KEY, 'true')
    setShow(false)
    // Persist to DB only if logged in
    if (userLoggedIn) {
      updateNotificationPreferences({
        onboarding_completed: true,
        push_prompted:        true,
        push_accepted:        accepted,
      }).catch(console.error)
    }
  }

  if (!show) return null

  // ── Shared styles ───────────────────────────────────────────────────────────
  const accentBg = `${accent}18`

  const cardRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 12, background: '#F7F7F7',
  }

  const iconWrap: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  const stepLabel: React.CSSProperties = {
    margin: '0 0 4px', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: accent,
  }

  const stepHeading: React.CSSProperties = {
    margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#111111', lineHeight: 1.25,
  }

  const stepSub: React.CSSProperties = {
    margin: '0 0 16px', fontSize: 13, color: '#666666', lineHeight: 1.55,
  }

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, minHeight: '100%',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }}>
      <div
        ref={cardRef}
        style={{
          width: '100%', maxWidth: 380, borderRadius: 24, overflow: 'hidden',
          background: '#ffffff', boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 48px)',
        }}
      >
        {/* ── Step content ─────────────────────────────────────────────────── */}
        <div ref={stepRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

          {/* ── Step 0: Benvenuto ─────────────────────────────────────────── */}
          {step === 0 && (
            <div>
              <div style={{ background: gradient, padding: '40px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div id="ob-s0-logo" style={{ position: 'relative', width: 80, height: 80 }}>
                  <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)' }} />
                  <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)' }} />
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{
                      position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.6)', top: '50%', left: '50%',
                      transform: `rotate(${i * 90}deg) translateY(-50px) translateX(-4px)`,
                    }} />
                  ))}
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {logoUrl
                      ? <img src={logoUrl} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 34, fontWeight: 800, color: '#fff' }}>{initial}</span>
                    }
                  </div>
                </div>
              </div>
              <div style={{ padding: '24px 24px 8px' }}>
                <div id="ob-s0-texts">
                  <p style={stepLabel}>Benvenuto</p>
                  <h2 style={stepHeading}>La tua esperienza da {businessName} inizia qui</h2>
                  <p style={stepSub}>Prenota, accumula punti e ricevi aggiornamenti — tutto in un&apos;unica app.</p>
                </div>
                <div id="ob-s0-cta">
                  <button onClick={() => goTo(1)} style={{ width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none', background: gradient, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    Inizia <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Prenotazioni ──────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ padding: '24px 24px 8px' }}>
              <p style={stepLabel}>Prenotazioni</p>
              <h2 style={stepHeading}>Sempre aggiornato sui tuoi appuntamenti</h2>
              <p style={stepSub}>Conferme, promemoria e modifiche direttamente sul tuo telefono.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[
                  { Icon: CalendarCheck, title: 'Prenotazione confermata',  body: 'Giovedì 19 giugno alle 10:00',  badge: 'adesso', id: 'ob-s1-c0' },
                  { Icon: Bell,          title: 'Promemoria appuntamento',   body: 'Domani alle 10:00',             badge: '1h fa',  id: 'ob-s1-c1' },
                  { Icon: PenLine,       title: 'Appuntamento modificato',   body: 'Spostato a venerdì alle 11:30', badge: 'ieri',   id: 'ob-s1-c2' },
                ].map(({ Icon, title, body, badge, id }) => (
                  <div key={id} id={id} style={{ ...cardRow, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={iconWrap}><Icon size={18} color={accent} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{body}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: '#B0B0B0', flexShrink: 0, marginLeft: 8 }}>{badge}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => goTo(2)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: gradient, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Avanti</button>
            </div>
          )}

          {/* ── Step 2: Prodotti ─────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ padding: '24px 24px 8px' }}>
              <p style={stepLabel}>Prodotti</p>
              <h2 style={stepHeading}>Scopri i prodotti del tuo salone</h2>
              <p style={stepSub}>Acquista i prodotti che usano i tuoi barbieri, disponibili direttamente qui.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[
                  { Icon: ShoppingBag, name: 'Matt Clay',            brand: 'American Crew', price: '€18', id: 'ob-s2-c0' },
                  { Icon: Droplets,    name: 'Olio barba',            brand: 'Proraso',       price: '€12', id: 'ob-s2-c1' },
                  { Icon: Sparkles,    name: 'Shampoo professionale', brand: 'Kevin Murphy',  price: '€24', id: 'ob-s2-c2' },
                ].map(({ Icon, name, brand, price, id }) => (
                  <div key={id} id={id} style={{ ...cardRow, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={iconWrap}><Icon size={18} color={accent} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#222' }}>{name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: '#888' }}>{brand}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: accent, background: accentBg, padding: '1px 7px', borderRadius: 100 }}>Disponibile in salone</span>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#222', flexShrink: 0, marginLeft: 8 }}>{price}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => goTo(3)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: gradient, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Avanti</button>
            </div>
          )}

          {/* ── Step 3: Loyalty ──────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ padding: '24px 24px 8px' }}>
              <p style={stepLabel}>Fedeltà</p>
              <h2 style={stepHeading}>Guadagna punti ad ogni visita</h2>
              <p style={stepSub}>Streak, premi e livelli esclusivi per i clienti più fedeli.</p>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>Punti accumulati</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>450 / 500</span>
                </div>
                <div style={{ height: 8, borderRadius: 100, background: '#EEEEEE', overflow: 'hidden' }}>
                  <div id="ob-s3-bar-fill" style={{ height: '100%', borderRadius: 100, background: gradient, width: '0%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <div id="ob-s3-c0" style={{ ...cardRow, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={iconWrap}><Flame size={18} color={accent} /></div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#222' }}>Streak di 5 visite</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Continua così, sei in serie!</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 800, color: accent }}>5</span>
                </div>
                <div id="ob-s3-c1" style={cardRow}>
                  <div style={iconWrap}><Gift size={18} color={accent} /></div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#222' }}>Premio quasi sbloccato</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Ancora 50 punti per il taglio gratis</p>
                  </div>
                </div>
              </div>
              <button onClick={() => goTo(4)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: gradient, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Avanti</button>
            </div>
          )}

          {/* ── Step 4: Notifiche ─────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <div style={{ background: gradient, padding: '32px 24px 20px' }}>
                <div style={{ position: 'relative', height: 100 }}>
                  {DEMO_NOTIFS.map((notif, i) => (
                    <div
                      key={notif.title}
                      id={`ob-s4-n${i}`}
                      style={{
                        position: 'absolute', top: (2 - i) * 7, left: `${(2 - i) * 3}%`, right: `${(2 - i) * 3}%`,
                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)', borderRadius: 12, padding: '10px 12px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transform: `scale(${1 - (2 - i) * 0.05})`, transformOrigin: 'top center',
                        opacity: ([0.4, 0.7, 1])[i], zIndex: i + 1,
                      }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {logoUrl
                          ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{initial}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.body}</p>
                      </div>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>{notif.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '24px 24px 8px' }}>
                <p style={stepLabel}>Novità</p>
                <h2 style={stepHeading}>Resta sempre aggiornato</h2>
                <p style={stepSub}>Ricevi promemoria per i tuoi appuntamenti, aggiornamenti sui punti e offerte dal tuo barbiere.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {[
                    { Icon: CalendarCheck, label: 'Conferme e promemoria prenotazione', id: 'ob-s4-b0' },
                    { Icon: Trophy,        label: 'Punti loyalty e premi sbloccati',    id: 'ob-s4-b1' },
                    { Icon: Tag,           label: 'Offerte esclusive solo per te',       id: 'ob-s4-b2' },
                  ].map(({ Icon, label, id }) => (
                    <div key={id} id={id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={iconWrap}><Icon size={18} color={accent} /></div>
                      <span style={{ fontSize: 14, color: '#333' }}>{label}</span>
                    </div>
                  ))}
                </div>
                <div id="ob-s4-cta" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {userLoggedIn ? (
                    <button
                      onClick={handleActivate}
                      disabled={loading}
                      style={{ width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none', background: gradient, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.75 : 1, transition: 'opacity 150ms' }}
                    >
                      <Bell size={18} />
                      {loading ? 'Attivazione…' : 'Attiva notifiche'}
                    </button>
                  ) : (
                    <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F7F7F7', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <LogIn size={18} color={accent} style={{ flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.4 }}>
                        <strong style={{ color: '#222' }}>Accedi</strong> per attivare le notifiche push su questo dispositivo.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => saveAndClose(false)}
                    disabled={loading}
                    style={{ width: '100%', padding: '12px', borderRadius: 14, border: 'none', background: 'transparent', color: '#999', fontSize: 14, cursor: 'pointer' }}
                  >
                    {userLoggedIn ? 'Adesso no' : 'Continua senza notifiche'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Dots nav ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '8px 24px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {step < 4 ? (
            <button onClick={() => goTo(step + 1)} style={{ background: 'none', border: 'none', fontSize: 13, color: '#B0B0B0', cursor: 'pointer', padding: '4px 0' }}>
              Salta
            </button>
          ) : (
            <div style={{ width: 40 }} />
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 6, width: i === step ? 20 : 6, borderRadius: 100, background: i === step ? accent : '#E0E0E0', transition: 'all 250ms ease' }} />
            ))}
          </div>
          <div style={{ width: 40 }} />
        </div>
      </div>
    </div>
  )
}
