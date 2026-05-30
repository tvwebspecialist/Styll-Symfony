'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface Props {
  businessName: string
  logoUrl: string | null
  primaryColor: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Modal = 'ios' | null

// ── iOS guide modal ───────────────────────────────────────────────────────────

function IOSGuide({ onClose, primary }: { onClose: () => void; primary: string }) {
  const steps = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="9" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8" />
          <path d="M12 3v10M8 7l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Tocca il tasto Condividi',
      sub: 'Icona ↑ nella barra in basso di Safari',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="white" strokeWidth="1.8" />
          <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      label: 'Aggiungi alla schermata Home',
      sub: 'Scorri il menu e tocca questa voce',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.8" />
          <path d="M7.5 12l3.5 3.5 6-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Tocca "Aggiungi" in alto a destra',
      sub: "L'app comparirà sulla schermata Home",
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Come installare l'app su iPhone"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 12px 12px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#1c1c1e',
          borderRadius: 24,
          padding: '24px 24px 32px',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#fff' }}>
            Installa su iPhone
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              color: '#fff',
              fontSize: 17,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <div style={{ paddingTop: 2 }}>
                <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                  {step.label}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  {step.sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            ⚠️ Funziona solo con{' '}
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Safari</strong> — non con Chrome o altri browser.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main banner ───────────────────────────────────────────────────────────────

export default function PwaInstallBanner({ businessName, logoUrl, primaryColor }: Props) {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Already installed as PWA — skip
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Only show when install=true is in the URL
    if (searchParams.get('install') !== 'true') return

    // Clean the param from the URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.delete('install')
    window.history.replaceState({}, '', url.toString())

    // Detect iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))

    // Pick up prompt captured by the inline script (fires before React hydration)
    const earlyPrompt = (window as unknown as Record<string, unknown>).__pwaPrompt as BeforeInstallPromptEvent | null
    if (earlyPrompt) {
      setDeferredPrompt(earlyPrompt)
    }

    // Also listen in case it fires after hydration
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Show banner after 1s
    const timer = setTimeout(() => setVisible(true), 1000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  // searchParams intentionally not in deps — read once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInstall() {
    if (isIOS) {
      setModal('ios')
      return
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      }
      setDeferredPrompt(null)
    }
  }

  if (!visible) return null

  const initials = businessName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      {/* Bottom sheet banner */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: '#1c1c1e',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px 20px 0 0',
          padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Logo */}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={businessName}
              style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>
              Installa {businessName}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
              Aggiungi alla schermata Home per accesso rapido
            </p>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={() => setVisible(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px 4px',
              flexShrink: 0,
            }}
          >
            Non ora
          </button>
          <button
            type="button"
            onClick={handleInstall}
            style={{
              background: primaryColor,
              border: 'none',
              borderRadius: 99,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '9px 18px',
              flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Installa →
          </button>
        </div>
      </div>

      {modal === 'ios' && (
        <IOSGuide onClose={() => setModal(null)} primary={primaryColor} />
      )}
    </>
  )
}
