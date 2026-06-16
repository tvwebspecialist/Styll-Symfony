'use client'

import * as React from 'react'
import { Bell, CalendarCheck, Trophy, Tag } from 'lucide-react'
import { usePushSubscription } from '@/lib/hooks/use-push-subscription'
import { updateNotificationPreferences } from '@/lib/actions/pwa-client-actions'
import { createPwaClient } from '@/lib/supabase/pwa-client'

interface Props {
  primaryColor: string
  logoUrl?: string | null
  businessName: string
  tenantId: string
}

type GsapInstance = {
  fromTo: (targets: unknown, from: unknown, to: unknown) => void
  to:     (targets: unknown, vars: unknown) => void
}

function getGsap(): GsapInstance | undefined {
  return (window as unknown as { gsap?: GsapInstance }).gsap
}

function darkenHex(hex: string, factor = 0.55): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const h = (n: number) => Math.round(n * factor).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

const DEMO_NOTIFS = [
  { title: 'Appuntamento confermato ✅', body: 'Venerdì 20 giugno · 10:00',   time: 'adesso' },
  { title: 'Hai guadagnato 100 punti 🏆', body: 'Totale: 350 punti',           time: '2 min fa' },
  { title: 'Promemoria ⏰',               body: 'Domani alle 15:00 ti aspettiamo', time: '1h fa' },
]

const BULLETS = [
  { Icon: CalendarCheck, label: 'Conferme e promemoria prenotazione' },
  { Icon: Trophy,         label: 'Punti loyalty e premi sbloccati' },
  { Icon: Tag,            label: 'Offerte esclusive solo per te' },
]

export function NotificationOnboarding({ primaryColor, logoUrl, businessName, tenantId }: Props) {
  const [show,    setShow]    = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const cardRef               = React.useRef<HTMLDivElement>(null)
  const { subscribe }         = usePushSubscription(tenantId)

  const accent   = primaryColor || '#1A1A2E'
  const darker   = darkenHex(accent)
  const gradient = `linear-gradient(135deg, ${accent} 0%, ${darker} 100%)`
  const initial  = businessName.charAt(0).toUpperCase()

  // ── Load GSAP from CDN ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (typeof window === 'undefined' || getGsap()) return
    const s = document.createElement('script')
    s.src   = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'
    s.async = true
    document.head.appendChild(s)
    return () => { try { document.head.removeChild(s) } catch { /* removed */ } }
  }, [])

  // ── Check conditions ───────────────────────────────────────────────────────
  React.useEffect(() => {
    async function check() {
      if (typeof window === 'undefined') return
      if (!window.matchMedia('(display-mode: standalone)').matches) return

      const pwa = createPwaClient()
      const { data: { user } } = await pwa.auth.getUser()
      if (!user) return

      const profileRes = await pwa
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .maybeSingle() as unknown as { data: { notification_preferences: Record<string, boolean> } | null }

      const prefs = profileRes.data?.notification_preferences ?? {}
      if (prefs.push_prompted === true) return

      const clientRes = await pwa
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('profile_id', user.id)
        .is('deleted_at', null)
        .maybeSingle() as unknown as { data: { id: string } | null }

      if (!clientRes.data) return
      const clientId = clientRes.data.id

      const { count } = await pwa
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .in('status', ['confirmed', 'completed'])
        .is('deleted_at', null)

      if ((count ?? 0) < 1) return

      setShow(true)
    }
    check().catch(console.error)
  }, [tenantId])

  // ── Animate in ─────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show || !cardRef.current) return
    const gsap = getGsap()
    if (gsap) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 60, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' },
      )
    }
  }, [show])

  async function animateOut(): Promise<void> {
    return new Promise<void>((resolve) => {
      const gsap = getGsap()
      if (!cardRef.current || !gsap) { resolve(); return }
      gsap.to(cardRef.current, {
        opacity: 0, y: 40, scale: 0.94, duration: 0.3, ease: 'power2.in',
        onComplete: () => resolve(),
      })
    })
  }

  async function handleActivate() {
    setLoading(true)
    try {
      if (!('Notification' in window)) { await persistAndClose(false); return }
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        await subscribe()
        await persistAndClose(true)
      } else {
        await persistAndClose(false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function persistAndClose(accepted: boolean) {
    await animateOut()
    setShow(false)
    updateNotificationPreferences({ push_prompted: true, push_accepted: accepted }).catch(console.error)
  }

  if (!show) return null

  return (
    <div
      style={{
        position:           'absolute',
        top:                0,
        left:               0,
        right:              0,
        minHeight:          '100%',
        zIndex:             9999,
        display:            'flex',
        alignItems:         'center',
        justifyContent:     'center',
        padding:            '24px 16px',
        background:         'rgba(0,0,0,0.72)',
        backdropFilter:     'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={cardRef}
        style={{
          width:        '100%',
          maxWidth:     360,
          borderRadius: 24,
          overflow:     'hidden',
          background:   '#ffffff',
          boxShadow:    '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            background:     gradient,
            padding:        '32px 24px 20px',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            20,
          }}
        >
          {/* Logo with ring */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <div
              style={{
                position:     'absolute',
                inset:        -8,
                borderRadius: '50%',
                border:       '2px solid rgba(255,255,255,0.3)',
              }}
            />
            {/* Orbital dots */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position:     'absolute',
                  width:        7,
                  height:       7,
                  borderRadius: '50%',
                  background:   'rgba(255,255,255,0.65)',
                  top:          '50%',
                  left:         '50%',
                  transform:    `rotate(${i * 90}deg) translateY(-44px) translateX(-3.5px)`,
                }}
              />
            ))}
            <div
              style={{
                width:        72,
                height:       72,
                borderRadius: '50%',
                background:   'rgba(255,255,255,0.2)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                overflow:     'hidden',
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 30, fontWeight: 800, color: '#ffffff' }}>{initial}</span>
              )}
            </div>
          </div>

          {/* Stacked notification preview */}
          <div style={{ width: '100%', position: 'relative', height: 88 }}>
            {DEMO_NOTIFS.map((notif, i) => {
              const fromTop = i * 0
              const scale   = 1 - i * 0.05
              const offsetY = i * 8
              const opacity = 1 - i * 0.3
              return (
                <div
                  key={notif.title}
                  style={{
                    position:        'absolute',
                    top:             fromTop,
                    left:            `${i * 3}%`,
                    right:           `${i * 3}%`,
                    background:      'rgba(255,255,255,0.15)',
                    backdropFilter:  'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius:    12,
                    padding:         '10px 12px',
                    display:         'flex',
                    alignItems:      'center',
                    gap:             10,
                    transform:       `scale(${scale}) translateY(${offsetY}px)`,
                    opacity,
                    transformOrigin: 'top center',
                    zIndex:          DEMO_NOTIFS.length - i,
                  }}
                >
                  <div
                    style={{
                      width:          32,
                      height:         32,
                      borderRadius:   '50%',
                      background:     'rgba(255,255,255,0.25)',
                      flexShrink:     0,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      overflow:       'hidden',
                    }}
                  >
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{initial}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {notif.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {notif.body}
                    </p>
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>{notif.time}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 24px 28px' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>
            Novità
          </p>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#111111', lineHeight: 1.25 }}>
            Resta sempre aggiornato
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#666666', lineHeight: 1.55 }}>
            Attiva le notifiche per non perderti nulla da {businessName}.
          </p>

          {/* Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {BULLETS.map(({ Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width:          36,
                    height:         36,
                    borderRadius:   10,
                    flexShrink:     0,
                    background:     `${accent}18`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={accent} />
                </div>
                <span style={{ fontSize: 14, color: '#333333' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleActivate}
            disabled={loading}
            style={{
              width:          '100%',
              padding:        '14px 24px',
              borderRadius:   14,
              border:         'none',
              background:     gradient,
              color:          '#ffffff',
              fontSize:       15,
              fontWeight:     700,
              cursor:         loading ? 'default' : 'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            8,
              marginBottom:   10,
              opacity:        loading ? 0.75 : 1,
              transition:     'opacity 150ms',
            }}
          >
            <Bell size={18} />
            {loading ? 'Attivazione…' : 'Attiva notifiche'}
          </button>

          <button
            onClick={() => persistAndClose(false)}
            disabled={loading}
            style={{
              width:      '100%',
              padding:    '12px',
              borderRadius: 14,
              border:     'none',
              background: 'transparent',
              color:      '#999999',
              fontSize:   14,
              cursor:     'pointer',
            }}
          >
            Adesso no
          </button>
        </div>
      </div>
    </div>
  )
}
