'use client'

import { useEffect } from 'react'

export default function LenisInit() {
  useEffect(() => {
    let rafId: number
    let lenisDestroy: (() => void) | null = null
    let cancelled = false

    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return

      const lenis = new Lenis({ lerp: 0.1 })
      lenisDestroy = () => lenis.destroy()

      function raf(time: number) {
        lenis.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      lenisDestroy?.()
    }
  }, [])

  return null
}
