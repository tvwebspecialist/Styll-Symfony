'use client'

import { useEffect, useRef } from 'react'
import type Lenis from 'lenis'
import type { ScrollToOptions } from 'lenis'

// Module-level instance — set once on mount, cleared on destroy.
// All modules that import scrollToSection / pauseLenis / resumeLenis
// share the same reference via this singleton.
let _lenis: Lenis | null = null

export function scrollToSection(id: string, offset = -68) {
  const el = document.getElementById(id)
  if (!el) return
  if (_lenis) {
    _lenis.scrollTo(el, { offset } as ScrollToOptions)
  } else {
    // Graceful fallback when Lenis hasn't initialised yet
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function pauseLenis() {
  _lenis?.stop()
}

export function resumeLenis() {
  _lenis?.start()
}

export function useLenis() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // Respect the user's OS motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    let rafId: number

    // Dynamic import keeps Lenis out of the server bundle
    import('lenis').then(({ default: LenisClass }) => {
      const lenis = new LenisClass({
        lerp: 0.1,
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
      })

      lenisRef.current = lenis
      _lenis = lenis

      function raf(time: number) {
        lenis.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)
    })

    return () => {
      cancelAnimationFrame(rafId)
      lenisRef.current?.destroy()
      lenisRef.current = null
      _lenis = null
    }
  }, [])

  return { lenis: lenisRef }
}
