'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Props {
  tenantName: string
  logoUrl: string | null
  primaryColor: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function LandingInstallBanner({ tenantName, logoUrl, primaryColor }: Props) {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa_banner_dismissed')) return

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    const timer = setTimeout(() => setVisible(true), 3000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  function dismiss() {
    localStorage.setItem('pwa_banner_dismissed', '1')
    setVisible(false)
  }

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setVisible(false)
      }
    } else {
      setShowInstructions(true)
    }
  }

  if (!visible) return null

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-4"
        style={{
          background: 'var(--landing-surface, #141414)',
          borderColor: 'var(--landing-border, rgba(255,255,255,0.08))',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={tenantName}
              width={40}
              height={40}
              className="shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white"
              style={{ background: primaryColor }}
            >
              {tenantName[0]}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--landing-text-primary, #fff)' }}
            >
              Aggiungi l'app di {tenantName}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--landing-text-muted, rgba(255,255,255,0.55))' }}
            >
              Prenota in 1 tap, sempre
            </p>
          </div>

          <button
            onClick={install}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: primaryColor }}
          >
            Aggiungi →
          </button>

          <button
            onClick={dismiss}
            className="shrink-0 p-1 text-xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--landing-text-muted, rgba(255,255,255,0.55))' }}
            aria-label="Chiudi banner"
          >
            ×
          </button>
        </div>
      </div>

      {showInstructions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4"
          onClick={() => setShowInstructions(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Istruzioni installazione"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--landing-surface, #141414)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="mb-5 text-base font-bold"
              style={{ color: 'var(--landing-text-primary, #fff)' }}
            >
              Installa l'app
            </p>
            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--landing-text-muted, rgba(255,255,255,0.55))' }}>
              <span className="font-semibold text-white">iPhone:</span> Apri con Safari → tocca il bottone Condividi → "Aggiungi alla schermata Home"
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-muted, rgba(255,255,255,0.55))' }}>
              <span className="font-semibold text-white">Android:</span> Menu Chrome (⋮) → "Installa app" oppure "Aggiungi a schermata Home"
            </p>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full rounded-full py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: primaryColor }}
            >
              Capito
            </button>
          </div>
        </div>
      )}
    </>
  )
}
