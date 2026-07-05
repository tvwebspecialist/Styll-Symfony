'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getAnalyticsConsentState,
  setAnalyticsConsentState,
} from '@/lib/analytics-consent'

interface CookieBannerProps {
  privacyPath: string
  brandColor?: string
}

export function CookieBanner({ privacyPath, brandColor = '#1A1A1A' }: CookieBannerProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getAnalyticsConsentState() !== 'unknown') return

    setMounted(true)
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (!mounted) return null

  const dismiss = (state: 'accepted' | 'rejected') => {
    setAnalyticsConsentState(state)
    setVisible(false)
    setTimeout(() => setMounted(false), 350)
  }

  return (
    <div
      className={[
        'fixed bottom-3 left-1/2 -translate-x-1/2 z-50',
        'w-[calc(100%-24px)] max-w-[480px]',
        'bg-white rounded-[20px] shadow-xl',
        'p-5',
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      ].join(' ')}
    >
      <p className="font-semibold text-gray-900 text-sm mb-1">Usiamo i cookie 🍪</p>
      <p className="text-gray-500 text-sm mb-4 leading-relaxed">
        Usiamo sempre i cookie tecnici necessari. Solo se accetti attiviamo analytics per migliorare
        il servizio. Nessuna pubblicità.{' '}
        <Link href={privacyPath} className="underline hover:text-gray-700 transition-colors">
          Scopri di più
        </Link>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => dismiss('rejected')}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          Continua senza analytics
        </button>
        <button
          type="button"
          onClick={() => dismiss('accepted')}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: brandColor }}
        >
          Accetta analytics
        </button>
      </div>
    </div>
  )
}
