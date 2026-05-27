'use client'

import type { ReactNode } from 'react'
import { useLenis } from '@/hooks/useLenis'

interface Props {
  children: ReactNode
}

export default function LandingLayout({ children }: Props) {
  // Initialises Lenis and exposes the module-level instance used by
  // scrollToSection / pauseLenis / resumeLenis throughout the landing.
  useLenis()

  return (
    <main className="overflow-x-clip">
      {children}
    </main>
  )
}
