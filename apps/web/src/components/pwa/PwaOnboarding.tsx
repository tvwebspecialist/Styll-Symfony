'use client'

import * as React from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { Star, Flame, Trophy, Zap } from 'lucide-react'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { usePushSubscription } from '@/lib/hooks/use-push-subscription'
import { FloatingCard } from '@/components/pwa/FloatingCard'
import { getOnboardingData } from '@/lib/actions/onboarding-data'

interface Props {
  primaryColor: string
  logoUrl?:     string | null
  businessName: string
  tenantId:     string
}

interface Particle {
  x: number; y: number; r: number
  vx: number; vy: number; opacity: number
}

const LS_KEY = 'pwa_onboarding_done'

const ORBIT_DOTS = [
  { id: 's1-orbit-0', size: 8, top: 28,  left: 116, opacity: 0.55, dur: 8,  cw: true  },
  { id: 's1-orbit-1', size: 5, top: 129, left: 184, opacity: 0.38, dur: 12, cw: false },
  { id: 's1-orbit-2', size: 7, top: 206, left: 101, opacity: 0.45, dur: 10, cw: true  },
  { id: 's1-orbit-3', size: 5, top: 98,  left: 42,  opacity: 0.30, dur: 15, cw: false },
] as const

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

// step 3 notification data — order matches spec (N1 first/bottom, N3 last/top)
const NOTIF_DATA = [
  { icon: 'calendar', text: 'Prenotazione confermata', sub: 'Giovedì 19 · ore 10:00', time: 'adesso' },
  { icon: 'flame',    text: 'Streak di 5 visite!',      sub: 'Continua così, sei in serie', time: '1m' },
  { icon: 'gift',     text: 'Premio sbloccato',         sub: 'Taglio gratis disponibile',   time: '5m' },
]

const BARBERS = ['M', 'L', 'A']
const DATES   = [
  { dow: 'Mar', day: '16' }, { dow: 'Mer', day: '17' },
  { dow: 'Gio', day: '18' }, { dow: 'Ven', day: '19' }, { dow: 'Sab', day: '20' },
]

function NotifIcon({ name }: { name: string }) {
  if (name === 'gift') return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5" rx="1"/>
      <line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  )
  if (name === 'flame') return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 6-6 7-6 13a6 6 0 0 0 12 0c0-6-6-7-6-13z"/>
      <path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6z"/>
    </svg>
  )
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

export function PwaOnboarding({ primaryColor, logoUrl, businessName, tenantId }: Props) {
  // step: 0=welcome, 1=booking, 2=loyalty, 3=notif, 4=closing
  const [show,         setShow]         = React.useState(false)
  const [step,         setStep]         = React.useState(0)
  const [loading,      setLoading]      = React.useState(false)
  const [userLoggedIn, setUserLoggedIn] = React.useState(false)
  const [tenantData,   setTenantData]   = React.useState<{
    locations: Array<{ name: string; address: string | null; photo_url: string | null }>
    staff:     Array<{ full_name: string; photo_url: string | null; specialization: string | null }>
  } | null>(null)

  const contentRef   = React.useRef<HTMLDivElement>(null)
  const canvasRef    = React.useRef<HTMLCanvasElement>(null)
  const rafRef       = React.useRef<number>(0)
  const particlesRef = React.useRef<Particle[]>([])

  const s1LogoRef = React.useRef<HTMLDivElement>(null)
  const s1TextRef = React.useRef<HTMLDivElement>(null)

  const trackRef     = React.useRef<HTMLDivElement>(null)
  const thumbRef     = React.useRef<HTMLDivElement>(null)
  const fillRef      = React.useRef<HTMLDivElement>(null)
  const labelRef     = React.useRef<HTMLDivElement>(null)
  const thumbPosRef  = React.useRef(0)
  const draggingRef  = React.useRef(false)
  const dragStartRef = React.useRef(0)
  const idleRef      = React.useRef<{ kill: () => void } | null>(null)
  const goToRef      = React.useRef<(n: number) => void>(() => {})

  const tweensRef    = React.useRef<Array<{ kill: () => void }>>([])
  const pointsRef    = React.useRef<HTMLSpanElement>(null)
  const flowForceRef = React.useRef(0)

  const { subscribe } = usePushSubscription(tenantId)

  const accent  = primaryColor || '#1A1A2E'
  const initial = businessName.charAt(0).toUpperCase()

  const killTweens = React.useCallback(() => {
    tweensRef.current.forEach(t => { try { t.kill() } catch {/* */} })
    tweensRef.current = []
  }, [])

  function track<T extends { kill: () => void }>(t: T): T {
    tweensRef.current.push(t); return t
  }

  // ── Check show ──────────────────────────────────────────────────────────
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

  // ── Fetch tenant data for booking animation ──────────────────────────────
  React.useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => setTenantData(d => d ?? { locations: [], staff: [] }), 3000)
    getOnboardingData(tenantId).then(({ locations, staff }) => {
      clearTimeout(timer)
      setTenantData({ locations, staff })
    }).catch(() => { clearTimeout(timer); setTenantData({ locations: [], staff: [] }) })
    return () => clearTimeout(timer)
  }, [show, tenantId])

  // ── Canvas particles (step 0 and 4) ─────────────────────────────────────
  React.useEffect(() => {
    if (!show || (step !== 0 && step !== 4)) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const W = canvas.width, H = canvas.height
    const count  = step === 4 ? 80 : 60
    const oScale = step === 4 ? 0.7 : 1

    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r:  0.3 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      opacity: (0.15 + Math.random() * 0.45) * oScale,
    }))

    function animate() {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      for (const p of particlesRef.current) {
        p.x += p.vx + flowForceRef.current * 0.8; p.y += p.vy
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
  }, [show, step, accent])

  // ── Slider drag system (step 0 only) ────────────────────────────────────
  React.useEffect(() => {
    if (!show || step !== 0) return

    function getMaxX(): number { return (trackRef.current?.offsetWidth ?? 320) - 62 }

    function setPos(rawX: number) {
      const maxX = getMaxX()
      const x = Math.max(0, Math.min(rawX, maxX))
      thumbPosRef.current = x
      flowForceRef.current = x / maxX
      gsap.set(thumbRef.current,  { x })
      if (fillRef.current)  fillRef.current.style.width  = `${x + 62}px`
      if (labelRef.current) labelRef.current.style.opacity = String(Math.max(0, 1 - (x / maxX) * 2))
    }

    function startIdleHint() {
      idleRef.current?.kill()
      gsap.set(thumbRef.current, { x: 0 })
      idleRef.current = gsap.to(thumbRef.current, { x: 8, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }

    function onDragEnd() {
      if (!draggingRef.current) return
      draggingRef.current = false
      const maxX = getMaxX()

      if (thumbPosRef.current / maxX >= 0.98) {
        idleRef.current?.kill()
        const proxy = { x: thumbPosRef.current }
        gsap.to(proxy, {
          x: maxX, duration: 0.15, ease: 'power2.out',
          onUpdate: () => setPos(proxy.x),
          onComplete: () => {
            if (fillRef.current)  fillRef.current.style.width = '100%'
            if (labelRef.current) labelRef.current.style.opacity = '0'
            gsap.to(thumbRef.current, { scale: 0, opacity: 0, duration: 0.3, delay: 0.1, ease: 'back.in(2)' })
            gsap.to(fillRef.current,  { backgroundColor: 'rgba(255,255,255,0.2)', duration: 0.2, delay: 0.1 })
            setTimeout(() => goToRef.current(1), 420)
          },
        })
      } else {
        const from = { x: thumbPosRef.current }
        gsap.to(from, {
          x: 0, duration: 0.65, ease: 'elastic.out(1, 0.6)',
          onUpdate: () => setPos(from.x),
          onComplete: () => { thumbPosRef.current = 0; startIdleHint() },
        })
      }
    }

    const onMouseMove = (e: MouseEvent) => { if (draggingRef.current) setPos(e.clientX - dragStartRef.current) }
    const onTouchMove = (e: TouchEvent) => { if (draggingRef.current) { e.preventDefault(); setPos(e.touches[0].clientX - dragStartRef.current) } }
    const onUp = () => onDragEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchend',  onUp)

    const t = setTimeout(startIdleHint, 900)
    return () => {
      clearTimeout(t)
      idleRef.current?.kill()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchend',  onUp)
    }
  }, [show, step])

  // ── GSAP step animations ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!show) return

    // ── Step 0 — Welcome ─────────────────────────────────────────────────
    if (step === 0) {
      const d = 0.25

      gsap.set('#s1-logo', { scale: 0.6, opacity: 0 })
      track(gsap.to('#s1-logo', { scale: 1, opacity: 1, duration: 0.65, delay: d, ease: 'back.out(1.8)' }))
      track(gsap.to('#s1-logo', { y: -6, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: d + 0.8 }))

      ORBIT_DOTS.forEach(({ id, dur, cw }) =>
        track(gsap.to(`#${id}`, { rotation: cw ? '+=360' : '-=360', duration: dur, repeat: -1, ease: 'none', transformOrigin: '50% 50%', delay: d + 0.2 }))
      )

      gsap.set('#s1-text', { opacity: 0, y: 16 })
      track(gsap.to('#s1-text', { opacity: 1, y: 0, duration: 0.6, delay: d + 0.6, ease: 'power3.out' }))

    // ── Step 1 — Booking (cinematic 4-phase loop) ────────────────────────
    } else if (step === 1) {
      const locCount   = displayLocations.length
      const staffCount = Math.min(displayStaff.length, 4)

      gsap.set(['#bk-ph-loc', '#bk-ph-staff', '#bk-ph-cal', '#bk-ph-confirm'], { opacity: 0 })

      function runBookingLoop() {
        const tl = gsap.timeline({ onComplete: runBookingLoop })

        // ── PHASE 1: Location ──────────────────────────────────────────
        tl.call(() => {
          gsap.set('#bk-ph-loc',     { opacity: 1 })
          gsap.set('#bk-ph-staff',   { opacity: 0 })
          gsap.set('#bk-ph-cal',     { opacity: 0 })
          gsap.set('#bk-ph-confirm', { opacity: 0 })
        })
        gsap.set('#bk-loc-glow', { scale: 0.2, opacity: 0 })
        tl.to('#bk-loc-glow', { scale: 1.5, opacity: 1, duration: 1.1, ease: 'power2.out' }, 0.05)

        const locIds = Array.from({ length: locCount }, (_, i) => `#bk-loc-card-${i}`)
        gsap.set(locIds, { y: 55, opacity: 0, scale: 0.9 })
        tl.to(locIds, { y: 0, opacity: 1, scale: 1, duration: 0.58, stagger: 0.13, ease: 'power3.out' }, 0.15)

        gsap.set('#bk-loc-ring',  { opacity: 0, scale: 0.88 })
        gsap.set('#bk-loc-check', { scale: 0, opacity: 0 })
        tl.to('#bk-loc-ring',  { opacity: 0.85, scale: 1,  duration: 0.32, ease: 'power2.out' }, 0.8)
        tl.to('#bk-loc-ring',  { opacity: 0.38, duration: 0.45, ease: 'power2.in' }, 0.95)
        tl.to('#bk-loc-check', { scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(2.8)' }, 0.82)
        tl.to('#bk-loc-glow',  { opacity: 0.25, duration: 0.6, ease: 'power2.in' }, 1.3)

        tl.set({}, {}, '+=1.0')
        tl.to('#bk-ph-loc', { opacity: 0, duration: 0.38, ease: 'power2.in' })

        // ── PHASE 2: Staff ─────────────────────────────────────────────
        tl.call(() => gsap.set('#bk-ph-staff', { opacity: 1 }))
        const staffIds = Array.from({ length: staffCount }, (_, i) => `#bk-staff-${i}`)
        gsap.set(staffIds, { filter: 'blur(12px)', scale: 0.82, opacity: 0, y: 20 })
        gsap.set('#bk-staff-halo', { scale: 1.7, opacity: 0 })

        tl.to(staffIds, { filter: 'blur(0px)', scale: 1, opacity: 1, y: 0, duration: 0.62, stagger: 0.11, ease: 'power3.out' }, '+=0.06')
        tl.to('#bk-staff-halo', { scale: 1, opacity: 1, duration: 0.55, ease: 'power3.out' }, '+=0.32')
        tl.to('#bk-staff-halo', { scale: 1.09, duration: 0.55, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '+=0.18')

        tl.set({}, {}, '+=0.85')
        tl.to('#bk-ph-staff', { opacity: 0, duration: 0.38, ease: 'power2.in' })

        // ── PHASE 3: Calendar ──────────────────────────────────────────
        tl.call(() => gsap.set('#bk-ph-cal', { opacity: 1 }))
        gsap.set('#bk-cal-strip',  { x: 110, opacity: 0 })
        gsap.set('#bk-cal-inner',  { x: 0 })
        gsap.set('#bk-time-row',   { y: 16, opacity: 0 })
        gsap.set('#bk-time-pill',  { scale: 1, backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' })
        gsap.set('#bk-cal-day-sel', { backgroundColor: 'rgba(255,255,255,0.15)' })

        tl.to('#bk-cal-strip',   { x: 0, opacity: 1, duration: 0.52, ease: 'power3.out' }, '+=0.06')
        // strip scrolls past then settles on selected day
        tl.to('#bk-cal-inner',  { x: -220, duration: 0.82, ease: 'power2.out' }, '+=0.12')
        tl.to('#bk-cal-inner',  { x: -180, duration: 0.48, ease: 'power1.inOut' })
        // select day
        tl.to('#bk-cal-day-sel', { backgroundColor: accent, scale: 1.1, duration: 0.26, ease: 'back.out(2)' }, '+=0.12')
        tl.to('#bk-cal-day-sel', { scale: 1, duration: 0.16, ease: 'power2.out' })
        // time row emerges
        tl.to('#bk-time-row',  { y: 0, opacity: 1, duration: 0.42, ease: 'power3.out' }, '+=0.2')
        // time pill tap
        tl.to('#bk-time-pill', { scale: 0.88, duration: 0.09 }, '+=0.38')
        tl.to('#bk-time-pill', { scale: 1.08, backgroundColor: accent, duration: 0.22, ease: 'back.out(2)' })
        tl.to('#bk-time-pill', { scale: 1, duration: 0.14, ease: 'power2.out' })

        tl.set({}, {}, '+=1.0')
        tl.to('#bk-ph-cal', { opacity: 0, duration: 0.38, ease: 'power2.in' })

        // ── PHASE 4: Confirmed ─────────────────────────────────────────
        tl.call(() => gsap.set('#bk-ph-confirm', { opacity: 1 }))
        gsap.set('#bk-confirm-ring',  { scale: 0 })
        gsap.set('#bk-confirm-ring2', { scale: 0.45, opacity: 0.7 })
        gsap.set(['#bk-confirm-title', '#bk-confirm-sub'], { y: 16, opacity: 0 })

        tl.to('#bk-confirm-ring',  { scale: 1, duration: 0.65, ease: 'back.out(1.6)' }, '+=0.05')
        tl.to('#bk-confirm-ring2', { scale: 2.5, opacity: 0, duration: 1.05, ease: 'power2.out' }, '<+0.15')
        tl.fromTo('#bk-confirm-path',
          { attr: { strokeDashoffset: 40 } },
          { attr: { strokeDashoffset: 0 }, duration: 0.52, ease: 'power2.out' },
          '<+0.1')
        tl.to('#bk-confirm-title', { y: 0, opacity: 1, duration: 0.44, ease: 'power3.out' }, '<+0.22')
        tl.to('#bk-confirm-sub',   { y: 0, opacity: 1, duration: 0.44, ease: 'power3.out' }, '<+0.1')
        tl.to('#bk-confirm-ring',  {
          boxShadow: `0 0 0 14px ${accent}1a, 0 20px 56px ${accent}44`,
          duration: 0.9, yoyo: true, repeat: 1, ease: 'sine.inOut',
        }, '+=0.25')

        tl.set({}, {}, '+=1.0')
        tl.to('#bk-ph-confirm', { opacity: 0, scale: 1.06, duration: 0.5, ease: 'power2.in' })
        tl.set('#bk-ph-confirm', { scale: 1 })
        tl.set({}, {}, '+=0.2')

        track(tl)
      }
      runBookingLoop()

    // ── Step 2 — Loyalty ─────────────────────────────────────────────────
    } else if (step === 2) {
      const d = 0.05
      ;[0, 1, 2].forEach(i => {
        const rot = i === 0 ? -15 : i === 2 ? 15 : -8
        gsap.set(`#s3-badge-${i}`, { scale: 0.3, opacity: 0, rotation: rot })
        track(gsap.to(`#s3-badge-${i}`, { scale: 1, opacity: 1, rotation: 0, duration: 0.55, delay: d + i * 0.15, ease: 'back.out(2)' }))
        track(gsap.to(`#s3-badge-${i}`, { y: -5, duration: 1.8 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: d + 0.6 + i * 0.3 }))
      })
      // Badge pulse
      track(gsap.to('#s3-badge-0 .badge-icon', { scale: 1.2, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.8 }))
      track(gsap.to('#s3-badge-1 .badge-icon', { scaleY: 1.15, duration: 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.9 }))
      track(gsap.fromTo('#s3-bar', { width: '0%' }, { width: '78%', duration: 1.2, delay: d + 0.55, ease: 'power2.out' }))
      track(gsap.fromTo('#s3-cursor', { left: '0%' }, { left: '78%', duration: 1.2, delay: d + 0.55, ease: 'power2.out' }))
      gsap.set('#s3-shimmer', { x: -80 })
      track(gsap.to('#s3-shimmer', { x: 260, duration: 0.7, delay: d + 1.85, ease: 'power2.inOut' }))
      const obj = { val: 0 }
      track(gsap.to(obj, {
        val: 450, duration: 1.2, delay: d + 0.55, ease: 'power2.out',
        onUpdate: () => { if (pointsRef.current) pointsRef.current.textContent = `${Math.round(obj.val)} punti` },
        onComplete: () => { if (pointsRef.current) gsap.fromTo(pointsRef.current, { scale: 1 }, { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }) },
      }))
      gsap.set('#s3-streak', { y: 12, x: -8, opacity: 0 })
      track(gsap.to('#s3-streak', { y: 0, x: 0, opacity: 1, duration: 0.45, delay: d + 1.4, ease: 'power3.out' }))
      // Glow pulse
      track(gsap.to('#s3-glow', { opacity: 0.35, scale: 1.1, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.5 }))

    // ── Step 3 — Notifications ───────────────────────────────────────────
    } else if (step === 3) {
      // Notifications arrive sequentially from top
      const animateNotifs = () => {
        NOTIF_DATA.forEach((_, i) => {
          gsap.set(`#s4-notif-${i}`, { y: -80, opacity: 0, x: 0 })
        })

        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 })

        NOTIF_DATA.forEach((_, i) => {
          // Previous cards scale down
          if (i > 0) {
            for (let j = 0; j < i; j++) {
              tl.to(`#s4-notif-${j}`, { scale: 0.92 - (i - j - 1) * 0.03, y: `+=${8 + j * 2}`, duration: 0.25, ease: 'power2.out' }, `notif${i}`)
            }
          }
          // New card arrives
          tl.fromTo(`#s4-notif-${i}`,
            { y: -80, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.45, ease: 'elastic.out(1, 0.7)' },
            i === 0 ? 0 : `notif${i}`
          )
          // Subtle vibrate
          tl.to(`#s4-notif-${i}`, { x: 3, duration: 0.05, yoyo: true, repeat: 3, ease: 'power1.inOut' }, `>-0.1`)
          tl.set({}, {}, '+=1.0')
        })

        // All exit up
        tl.set({}, {}, '+=1.5')
        tl.to([`#s4-notif-0`, `#s4-notif-1`, `#s4-notif-2`], { y: -40, opacity: 0, duration: 0.4, stagger: 0.06, ease: 'power2.in' })
        tl.call(() => {
          NOTIF_DATA.forEach((_, i) => gsap.set(`#s4-notif-${i}`, { y: -80, opacity: 0, x: 0, scale: 1 }))
        })

        track(tl)
      }
      animateNotifs()

      // Icon scale entrance
      NOTIF_DATA.forEach((_, i) => {
        gsap.set(`#s4-icon-${i}`, { scale: 0.5 })
        track(gsap.to(`#s4-icon-${i}`, { scale: 1, duration: 0.38, delay: 0.45 + i * 0.55, ease: 'back.out(2.5)' }))
      })

      // Floating glow pulse
      track(gsap.to('#s4-glow', { opacity: 0.25, scale: 1.15, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }))

    // ── Step 4 — Closing ─────────────────────────────────────────────────
    } else if (step === 4) {
      const tl = gsap.timeline()
      gsap.set('#s5-logo', { scale: 0.3, opacity: 0 })
      tl.to('#s5-logo', { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2)' }, 0)
      // Logo glow pulse
      tl.to('#s5-logo', { boxShadow: `0 0 40px 10px ${accent}66`, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }, 0.7)

      gsap.set(['#s5-heading', '#s5-sub'], { opacity: 0, y: 24 })
      tl.to('#s5-heading', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.5)
      tl.to('#s5-sub',     { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.7)

      // Hold then zoom out
      tl.set({}, {}, '+=1.6')
      tl.to('#s5-logo',              { scale: 12, opacity: 0, duration: 0.7, ease: 'power3.in' })
      tl.to(['#s5-heading','#s5-sub'], { opacity: 0, duration: 0.3, ease: 'power2.in' }, '<')
      tl.to(canvasRef.current,       { opacity: 0, duration: 0.5, ease: 'power2.in' }, '<')
      tl.to('#s5-flash',             { opacity: 1, duration: 0.4, ease: 'power2.in' }, '<+0.3')
      tl.call(() => { closeOnboarding().catch(console.error) })
      track(tl)
    }

    return killTweens
  }, [step, show, accent, killTweens, tenantData]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ───────────────────────────────────────────────────────────
  const goTo = React.useCallback((n: number) => {
    if (n < 0 || n > 4) return
    killTweens()

    if (step === 0) {
      const targets = [canvasRef.current, s1LogoRef.current, s1TextRef.current, trackRef.current].filter(Boolean)
      gsap.to(targets, {
        y: -30, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.in',
        onComplete: () => {
          setStep(n)
          if (contentRef.current) gsap.fromTo(contentRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' })
        },
      })
      return
    }

    gsap.to(contentRef.current, {
      scale: 0.94, opacity: 0, duration: 0.22, ease: 'power2.in',
      onComplete: () => {
        setStep(n)
        gsap.fromTo(contentRef.current,
          { scale: 1.04, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.28, ease: 'power2.out' },
        )
      },
    })
  }, [step, killTweens])

  React.useEffect(() => { goToRef.current = goTo }, [goTo])

  // ── Push notification CTA ────────────────────────────────────────────────
  async function handleActivate() {
    if (loading) return
    setLoading(true)
    try {
      if (!('Notification' in window)) { goTo(4); return }
      const perm = await Notification.requestPermission()
      if (perm === 'granted') await subscribe()
    } finally {
      setLoading(false)
      goTo(4)
    }
  }

  // ── Close / cleanup ──────────────────────────────────────────────────────
  async function closeOnboarding() {
    killTweens()
    localStorage.setItem(LS_KEY, 'true')
    setShow(false)
    if (userLoggedIn) {
      try {
        const pwa = createPwaClient()
        const { data: { user } } = await pwa.auth.getUser()
        if (user) {
          const res = await pwa.from('profiles').select('notification_preferences').eq('id', user.id).maybeSingle() as unknown as { data: { notification_preferences: Record<string, boolean> } | null }
          const prev = res.data?.notification_preferences ?? {}
          await pwa.from('profiles').update({ notification_preferences: { ...prev, onboarding_completed: true } }).eq('id', user.id)
        }
      } catch {/* ignore */}
    }
  }

  // ── Global unmount cleanup ───────────────────────────────────────────────
  React.useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      gsap.killTweensOf('*')
    }
  }, [])

  if (!show) return null

  // ── Shared card styles ───────────────────────────────────────────────────
  const headSt: React.CSSProperties = {
    margin: '0 0 10px', fontSize: 32, fontWeight: 800,
    lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0a0a0a',
    textAlign: 'center', whiteSpace: 'pre-line',
  }
  const subSt: React.CSSProperties = {
    margin: '0 0 24px', fontSize: 16, lineHeight: 1.6, opacity: 0.6,
    color: '#1a1a2e', textAlign: 'center', whiteSpace: 'pre-line',
  }
  const btnSt: React.CSSProperties = {
    width: '100%', padding: '16px', borderRadius: 16, border: 'none',
    background: accent, color: '#fff', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }
  const stepLabelSt: React.CSSProperties = {
    margin: '0 0 5px 2px', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9BA3AF',
  }
  const bookCardSt: React.CSSProperties = {
    background: '#fff', borderRadius: 14, padding: '11px 14px',
    boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', gap: 11,
  }

  const displayLocations = tenantData?.locations?.length
    ? tenantData.locations
    : [{ name: businessName, address: null, photo_url: null }]

  const displayStaff = tenantData?.staff?.length
    ? tenantData.staff
    : [
        { full_name: 'Il tuo barbiere', photo_url: null, specialization: 'Barbiere' },
        { full_name: 'Staff',           photo_url: null, specialization: 'Barbiere' },
      ]

  const isFullScreen = step === 0 || step === 4
  const gradientBg   = `linear-gradient(160deg, #0a0a14 0%, ${accent} 50%, ${darken(accent, 0.6)} 100%)`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: gradientBg,
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      overflow: 'hidden',
    }}>
      <div ref={contentRef} style={{ height: '100%', position: 'relative' }}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STEP 0 — Welcome, full-screen                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Particle canvas */}
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}/>

            {/* Centered content: logo + text */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, paddingBottom: 100 }}>
              {/* Logo orbit system — 240×240 */}
              <div ref={s1LogoRef} style={{ position: 'relative', width: 240, height: 240, flexShrink: 0 }}>
                {ORBIT_DOTS.map(({ id, size, top, left, opacity }) => (
                  <div key={id} id={id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top, left, width: size, height: size, borderRadius: '50%', background: '#fff', opacity }}/>
                  </div>
                ))}
                <div id="s1-logo" style={{
                  position: 'absolute', top: 60, left: 60, width: 120, height: 120,
                  borderRadius: 28, background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {logoUrl
                    ? <Image src={logoUrl} alt={businessName} fill style={{ objectFit: 'contain' }} />
                    : <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{initial}</span>
                  }
                </div>
              </div>

              {/* Text block */}
              <div id="s1-text" ref={s1TextRef} style={{ textAlign: 'center', padding: '0 28px' }}>
                <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                  Benvenuto<br/>da {businessName}
                </h1>
                <p style={{ margin: '10px 0 0', fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  Il tuo barbiere di fiducia,<br/>ora sempre con te.
                </p>
              </div>
            </div>

            {/* Slider CTA */}
            <div ref={trackRef} style={{
              position: 'absolute', bottom: 24, left: 24, right: 24,
              height: 62, borderRadius: 31, background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden', cursor: 'grab',
            }}
              onMouseDown={e => { idleRef.current?.kill(); draggingRef.current = true; dragStartRef.current = e.clientX - thumbPosRef.current }}
              onTouchStart={e => { idleRef.current?.kill(); draggingRef.current = true; dragStartRef.current = e.touches[0].clientX - thumbPosRef.current }}
            >
              <div ref={fillRef} style={{ position: 'absolute', inset: 0, width: 62, borderRadius: 31, background: 'rgba(255,255,255,0.15)', transition: 'none' }}/>
              <div ref={thumbRef} style={{ position: 'absolute', left: 4, top: 4, width: 54, height: 54, borderRadius: 27, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
              <div ref={labelRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', pointerEvents: 'none' }}>
                Scorri per iniziare →
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STEP 4 — Closing, full-screen                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}/>
            {/* White flash overlay */}
            <div id="s5-flash" style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, pointerEvents: 'none' }}/>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 32px' }}>
              <div id="s5-logo" style={{ width: 100, height: 100, borderRadius: 26, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {logoUrl
                  ? <Image src={logoUrl} alt={businessName} fill style={{ objectFit: 'contain' }} />
                  : <span style={{ fontSize: 38, fontWeight: 800, color: '#fff' }}>{initial}</span>
                }
              </div>
              <div>
                <p id="s5-heading" style={{ margin: 0, fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', textAlign: 'center', lineHeight: 1.1 }}>Sei pronto.</p>
                <p id="s5-sub" style={{ margin: '14px 0 0', fontSize: 18, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.55 }}>
                  Buona esperienza<br/>da {businessName}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STEPS 1-3 — Visual area (transparent) + floating card          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!isFullScreen && (
          <>
            {/* Visual area — full screen transparent, padded to stay above bottom card */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingBottom: 460 }}>

              {/* ── Step 1 — Booking cinematic animation ───────────────── */}
              {step === 1 && (
                <div style={{ position: 'absolute', inset: 0 }}>

                  {/* ── PHASE 1: Location ─────────────────────────────── */}
                  <div id="bk-ph-loc" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                    <div id="bk-loc-glow" style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${accent}44 0%, transparent 68%)`, pointerEvents: 'none' }}/>
                    <div style={{ display: 'flex', gap: 12, padding: '0 16px', justifyContent: 'center', width: '100%' }}>
                      {displayLocations.map((loc, i) => (
                        <div
                          key={i}
                          id={`bk-loc-card-${i}`}
                          style={{
                            position: 'relative',
                            borderRadius: 20,
                            overflow: 'hidden',
                            flex: displayLocations.length === 1 ? '0 0 280px' : '0 0 200px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                          }}
                        >
                          {loc.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={loc.photo_url}
                              alt={loc.name}
                              style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{
                              width: '100%', height: 180,
                              background: `linear-gradient(135deg, ${accent} 0%, rgba(0,0,0,0.6) 100%)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                                stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                            </div>
                          )}
                          <div style={{
                            position: 'absolute', bottom: 8, left: 8, right: 8,
                            background: 'white', borderRadius: 16, padding: '10px 14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#222', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {loc.name}
                              </p>
                              {loc.address && (
                                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#71717A', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {loc.address}
                                </p>
                              )}
                            </div>
                          </div>
                          {i === 0 && <>
                            <div id="bk-loc-ring" style={{ position: 'absolute', inset: 0, borderRadius: 20, border: `2px solid ${accent}`, opacity: 0, pointerEvents: 'none' }}/>
                            <div id="bk-loc-check" style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── PHASE 2: Staff ─────────────────────────────────── */}
                  <div id="bk-ph-staff" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, padding: '0 24px', maxWidth: 320 }}>
                      {displayStaff.slice(0, 4).map((s, i) => {
                        const sz = i === 0 ? 88 : 72
                        const initials = s.full_name.split(' ').map((n: string) => n[0] ?? '').slice(0, 2).join('').toUpperCase()
                        return (
                          <div key={i} id={`bk-staff-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: sz, opacity: 0 }}>
                            <div style={{ position: 'relative' }}>
                              {i === 0 && (
                                <div id="bk-staff-halo" style={{
                                  position: 'absolute', inset: -4, borderRadius: '50%',
                                  border: `2px solid ${accent}`, opacity: 0,
                                  boxShadow: `0 0 20px ${accent}44`,
                                }}/>
                              )}
                              <div style={{ width: sz, height: sz, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.30)', flexShrink: 0, position: 'relative' }}>
                                {s.photo_url
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={s.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                                  : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${accent}, rgba(0,0,0,0.4))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: 'white', fontWeight: 700, fontSize: i === 0 ? 26 : 20 }}>{initials}</span>
                                    </div>
                                }
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: i === 0 ? 14 : 12, fontWeight: i === 0 ? 700 : 500, color: 'white', textAlign: 'center', opacity: i === 0 ? 1 : 0.85, lineHeight: 1.2, maxWidth: sz, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.full_name?.split(' ')[0] ?? 'Barbiere'}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── PHASE 3: Calendar ──────────────────────────────── */}
                  <div id="bk-ph-cal" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0 }}>
                    <div id="bk-cal-strip" style={{ width: '100%', overflow: 'hidden', padding: '0 16px' }}>
                      <div id="bk-cal-inner" style={{ display: 'flex', gap: 8 }}>
                        {Array.from({ length: 14 }, (_, di) => {
                          const d = new Date(); d.setDate(d.getDate() - 3 + di)
                          const isSelected = di === 7
                          const isPast = di < 3
                          const dow = d.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3)
                          return (
                            <div key={di} id={isSelected ? 'bk-cal-day-sel' : undefined} style={{
                              flexShrink: 0, width: 56, borderRadius: 16, padding: '14px 0',
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                              opacity: isPast ? 0.3 : 1,
                            }}>
                              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: isSelected ? '#fff' : 'rgba(255,255,255,0.45)' }}>{dow}</span>
                              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}>{d.getDate()}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div id="bk-time-row" style={{ display: 'flex', gap: 8, opacity: 0 }}>
                      {['09:00', '10:00', '11:00', '15:00'].map((t, i) => (
                        <div key={i} id={i === 1 ? 'bk-time-pill' : undefined} style={{
                          borderRadius: 20, padding: '12px 22px',
                          backgroundColor: i === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                          border: `0.5px solid ${i === 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
                          fontSize: 15, fontWeight: 700,
                          color: i === 1 ? '#fff' : 'rgba(255,255,255,0.38)',
                        }}>{t}</div>
                      ))}
                    </div>
                  </div>

                  {/* ── PHASE 4: Confirmed ─────────────────────────────── */}
                  <div id="bk-ph-confirm" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, gap: 20 }}>
                    <div id="bk-confirm-ring2" style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)' }}/>
                    <div id="bk-confirm-ring" style={{
                      width: 96, height: 96, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${accent} 0%, ${accent}aa 100%)`,
                      boxShadow: `0 20px 56px ${accent}66`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', zIndex: 1,
                    }}>
                      <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          id="bk-confirm-path"
                          d="M12 23L19 30L34 15"
                          stroke="#FFFFFF"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="40"
                          strokeDashoffset="40"
                        />
                      </svg>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0 32px' }}>
                      <p id="bk-confirm-title" style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', opacity: 0 }}>Sei nel calendario.</p>
                      <p id="bk-confirm-sub" style={{ margin: '6px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.80)', opacity: 0 }}>{businessName} ti aspetta.</p>
                    </div>
                  </div>

                </div>
              )}

              {/* ── Step 2 — Loyalty ──────────────────────────────────── */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '0 24px', width: '100%' }}>
                  {/* Glow under badges */}
                  <div id="s3-glow" style={{ position: 'absolute', width: 200, height: 80, borderRadius: '50%', background: accent, opacity: 0.2, filter: 'blur(40px)', pointerEvents: 'none' }}/>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, position: 'relative' }}>
                    <div id="s3-badge-0" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 70, height: 70, borderRadius: 20, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${accent}55` }}>
                        <Star className="badge-icon" size={28} color="white" fill="white" />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Visite</span>
                    </div>
                    <div id="s3-badge-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 90, height: 90, borderRadius: 24, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 32px ${accent}66` }}>
                        <Flame className="badge-icon" size={34} color="white" />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Streak</span>
                    </div>
                    <div id="s3-badge-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 70, height: 70, borderRadius: 20, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${accent}55` }}>
                        <Trophy size={28} color="white" />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Premi</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', padding: '0 4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>Punti accumulati</span>
                      <span ref={pointsRef} style={{ fontSize: 11, fontWeight: 700, color: '#fff', display: 'inline-block' }}>0 punti</span>
                    </div>
                    <div style={{ position: 'relative', height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}>
                      <div id="s3-bar" style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, ${lightenRgba(accent, 1).replace('rgba','rgb').replace(/,[\d.]+\)$/,')')})`, borderRadius: 6, width: '0%', position: 'relative', overflow: 'hidden' }}>
                        <div id="s3-shimmer" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: 70, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', borderRadius: 6 }}/>
                      </div>
                      <div id="s3-cursor" style={{ position: 'absolute', top: -2, left: '0%', marginLeft: -8, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: `0 0 8px ${accent}` }}/>
                    </div>
                  </div>
                  <div id="s3-streak" style={{ background: 'rgba(255,255,255,0.1)', border: `0.5px solid rgba(255,255,255,0.2)`, borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1 }}>5</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>visite consecutive</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Continua, sei in serie</p>
                    </div>
                    <div style={{ background: accent, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={11} color="white" fill="white" /> In serie</div>
                  </div>
                </div>
              )}

              {/* ── Step 3 — Notifications ────────────────────────────── */}
              {step === 3 && (
                <div style={{ width: '88%', maxWidth: 320, position: 'relative' }}>
                  {/* Floating glow */}
                  <div id="s4-glow" style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', width: 260, height: 80, borderRadius: '50%', background: accent, opacity: 0.12, filter: 'blur(30px)', pointerEvents: 'none' }}/>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
                    {NOTIF_DATA.map((notif, i) => (
                      <div key={i} id={`s4-notif-${i}`} style={{
                        background: 'rgba(255,255,255,0.08)', borderRadius: 16,
                        border: '0.5px solid rgba(255,255,255,0.12)',
                        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%',
                      }}>
                        <div id={`s4-icon-${i}`} style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: accent, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <NotifIcon name={notif.icon}/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.text}</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.sub}</p>
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{notif.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Floating bottom card ──────────────────────────────────── */}
            <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0 }}>
              <FloatingCard style={{ padding: '28px 24px' }}>
                {/* 4-dot indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 22 }}>
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} style={{
                      height: 4, width: s === step ? 20 : 4, borderRadius: 100,
                      background: s === step ? accent : 'rgba(0,0,0,0.2)',
                      transition: 'all 280ms ease',
                    }}/>
                  ))}
                </div>

                {step === 1 && (
                  <>
                    <p style={headSt}>{"Prenota in\n3 tap."}</p>
                    <p style={subSt}>{"Scegli il barbiere, il giorno e l'orario.\nConferma istantanea."}</p>
                    <button onClick={() => goTo(2)} style={btnSt}>Avanti →</button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p style={headSt}>{"Ogni visita\nvale di più."}</p>
                    <p style={subSt}>{"Punti, streak e premi esclusivi\nper i clienti più fedeli."}</p>
                    <button onClick={() => goTo(3)} style={btnSt}>Avanti →</button>
                  </>
                )}

                {step === 3 && (
                  <>
                    <p style={headSt}>{"Non perderti\nnulla."}</p>
                    <p style={subSt}>{"Promemoria, punti e offerte esclusive.\nSempre in tempo reale."}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={handleActivate} disabled={loading} style={{ ...btnSt, opacity: loading ? 0.75 : 1, cursor: loading ? 'default' : 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        {loading ? 'Attivazione…' : 'Attiva notifiche'}
                      </button>
                      <button onClick={() => goTo(4)} disabled={loading} style={{ width: '100%', border: 'none', background: 'transparent', color: '#aaa', fontSize: 14, cursor: 'pointer', padding: '10px 0', borderRadius: 16 }}>
                        Adesso no
                      </button>
                    </div>
                  </>
                )}
              </FloatingCard>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
