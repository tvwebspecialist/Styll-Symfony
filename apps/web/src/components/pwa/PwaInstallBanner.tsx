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

type Intent = 'install' | 'booking' | null

const INTENT_KEY = 'pwa_intent'

// ── iOS install guide (shown immediately on install intent) ───────────────────

function IOSInstallGuide({ onClose, primary, businessName }: { onClose: () => void; primary: string; businessName: string }) {
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
      label: '"Aggiungi" in alto a destra',
      sub: "L'app apparirà sulla tua schermata Home",
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Come installare ${businessName}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 12px 12px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#1c1c1e',
          borderRadius: 24,
          padding: '28px 24px 36px',
          boxShadow: '0 -4px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>
              Come installare
            </p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 19, color: '#fff' }}>
              {businessName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
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
              <div style={{ paddingTop: 4 }}>
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
            padding: '10px 14px',
            background: 'rgba(255,200,0,0.08)',
            borderRadius: 12,
            border: '1px solid rgba(255,200,0,0.15)',
            marginBottom: 20,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            ⚠️ Funziona solo con{' '}
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Safari</strong>
            {' '}— non con Chrome o altri browser.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px 0',
            background: primary,
            color: '#fff',
            border: 'none',
            borderRadius: 99,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Ho capito ✓
        </button>
      </div>
    </div>
  )
}

// ── Thin banner (shown after 4s on booking intent) ────────────────────────────

function BookingBanner({
  businessName,
  logoUrl,
  primaryColor,
  onInstall,
  onDismiss,
}: {
  businessName: string
  logoUrl: string | null
  primaryColor: string
  onInstall: () => void
  onDismiss: () => void
}) {
  const initials = businessName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
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
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>
            Aggiungi {businessName} alla Home
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
            Prenota in 1 tap, sempre con te
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
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
          onClick={onInstall}
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
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Installa →
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PwaInstallBanner({ businessName, logoUrl, primaryColor }: Props) {
  const searchParams = useSearchParams()
  const [intent, setIntent] = useState<Intent>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showBanner, setShowBanner] = useState(false)       // booking flow: thin banner
  const [showIOSGuide, setShowIOSGuide] = useState(false)   // install flow iOS: full guide
  const [androidTriggered, setAndroidTriggered] = useState(false)

  // Effect 1: read intent from URL or sessionStorage (once on mount)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const urlInstall  = searchParams.get('install') === 'true'
    const urlBooking  = searchParams.get('source') === 'booking'
    const storedIntent = sessionStorage.getItem(INTENT_KEY) as Intent

    const resolvedIntent: Intent =
      urlInstall ? 'install' :
      urlBooking ? 'booking' :
      storedIntent

    if (!resolvedIntent) return

    // Persist in sessionStorage to survive any auth redirect
    sessionStorage.setItem(INTENT_KEY, resolvedIntent)

    // Clean URL params
    const url = new URL(window.location.href)
    url.searchParams.delete('install')
    url.searchParams.delete('source')
    window.history.replaceState({}, '', url.toString())

    // Consume storage after reading (one-shot)
    sessionStorage.removeItem(INTENT_KEY)

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setIntent(resolvedIntent)

    if (resolvedIntent === 'booking') {
      setTimeout(() => setShowBanner(true), 4000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect 2: capture beforeinstallprompt (runs independently of intent detection)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Prompt may have been captured by the inline layout script before hydration
    const earlyPrompt = (window as unknown as Record<string, unknown>).__pwaPrompt as BeforeInstallPromptEvent | null
    if (earlyPrompt) setDeferredPrompt(earlyPrompt)

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Effect 3: install intent → act immediately once we have all the pieces
  useEffect(() => {
    if (intent !== 'install') return

    if (isIOS) {
      // iOS: show the guide right away
      setShowIOSGuide(true)
      return
    }

    // Android: trigger native dialog as soon as deferredPrompt is available
    if (!deferredPrompt || androidTriggered) return
    setAndroidTriggered(true)

    void (async () => {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    })()
  }, [intent, isIOS, deferredPrompt, androidTriggered])

  // Booking intent: banner button handler
  async function handleBannerInstall() {
    if (isIOS) {
      setShowIOSGuide(true)
      setShowBanner(false)
      return
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShowBanner(false)
      setDeferredPrompt(null)
    }
  }

  return (
    <>
      {showBanner && (
        <BookingBanner
          businessName={businessName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          onInstall={handleBannerInstall}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {showIOSGuide && (
        <IOSInstallGuide
          businessName={businessName}
          primary={primaryColor}
          onClose={() => setShowIOSGuide(false)}
        />
      )}
    </>
  )
}
