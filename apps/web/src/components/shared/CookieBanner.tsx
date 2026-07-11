'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  persistAnalyticsConsentChoice,
} from '@/lib/analytics-consent'
import {
  ANALYTICS_CONSENT_COPY,
  ANALYTICS_CONSENT_SOURCE,
  appendAnalyticsPreferencesHash,
} from '@/lib/analytics-consent-copy'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'

interface CookieBannerProps {
  cookiePath: string
  brandColor?: string
}

export function CookieBanner({ cookiePath, brandColor = '#1A1A1A' }: CookieBannerProps) {
  const [visible, setVisible] = useState(false)
  const [savingState, setSavingState] = useState<'accepted' | 'rejected' | null>(null)
  const { ready, state } = useAnalyticsConsent()
  const infoHref = cookiePath
  const manageHref = appendAnalyticsPreferencesHash(cookiePath)

  useEffect(() => {
    if (!ready) return
    if (state !== 'unknown') {
      setVisible(false)
      return
    }

    const timer = window.setTimeout(() => setVisible(true), 50)
    return () => window.clearTimeout(timer)
  }, [ready, state])

  if (!ready || state !== 'unknown') return null

  const dismiss = async (nextState: 'accepted' | 'rejected') => {
    setSavingState(nextState)
    try {
      await persistAnalyticsConsentChoice(nextState, {
        source: ANALYTICS_CONSENT_SOURCE.BANNER,
      })
      setVisible(false)
    } finally {
      setSavingState(null)
    }
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
      <p className="font-semibold text-gray-900 text-sm mb-1">
        {ANALYTICS_CONSENT_COPY.bannerTitle} 🍪
      </p>
      <p className="text-gray-500 text-sm mb-4 leading-relaxed">
        {ANALYTICS_CONSENT_COPY.bannerBody}{' '}
        <Link href={infoHref} className="underline hover:text-gray-700 transition-colors">
          Scopri di più
        </Link>
      </p>
      <div className="mb-4">
        <Link
          href={manageHref}
          className="text-sm font-medium underline text-gray-600 hover:text-gray-800 transition-colors"
        >
          {ANALYTICS_CONSENT_COPY.manageLabel}
        </Link>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void dismiss('rejected')}
          disabled={savingState !== null}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          {savingState === 'rejected'
            ? 'Salvataggio…'
            : ANALYTICS_CONSENT_COPY.rejectLabel}
        </button>
        <button
          type="button"
          onClick={() => void dismiss('accepted')}
          disabled={savingState !== null}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: brandColor }}
        >
          {savingState === 'accepted'
            ? 'Salvataggio…'
            : ANALYTICS_CONSENT_COPY.acceptLabel}
        </button>
      </div>
    </div>
  )
}
