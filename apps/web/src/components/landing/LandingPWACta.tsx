'use client'

import type { CSSProperties } from 'react'
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

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.523 15.341c-.551 0-.999-.448-.999-1s.448-.999.999-.999c.551 0 .999.448.999.999 0 .552-.448 1-.999 1m-11.046 0c-.551 0-.999-.448-.999-1s.448-.999.999-.999c.551 0 .999.448.999.999 0 .552-.448 1-.999 1m11.405-6.02l1.997-3.459a.416.416 0 00-.152-.568.416.416 0 00-.568.152l-2.022 3.503C15.59 8.244 13.853 7.851 12 7.851s-3.59.393-5.137 1.073L4.841 5.421a.416.416 0 00-.568-.152.416.416 0 00-.152.568l1.997 3.459C2.689 11.187.343 14.659 0 18.761h24c-.344-4.102-2.689-7.574-6.118-9.44" />
    </svg>
  )
}

function PhoneMockup({ primaryColor }: { primaryColor: string }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 200,
        height: 400,
        borderRadius: 36,
        border: '7px solid rgba(255,255,255,0.18)',
        background: '#0a0a0a',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.06)',
        transform: 'rotate(6deg)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Screen gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 120% 80% at 20% 80%, ${primaryColor}55 0%, transparent 60%), #0f0f0f`,
        }}
      />
      {/* Notch */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 18,
          borderRadius: 99,
          background: '#0a0a0a',
          zIndex: 2,
        }}
      />
      {/* Fake app UI */}
      <div style={{ position: 'relative', zIndex: 1, padding: '48px 16px 16px' }}>
        {/* Header bar */}
        <div
          style={{
            height: 8,
            width: '60%',
            borderRadius: 99,
            background: 'rgba(255,255,255,0.15)',
            marginBottom: 6,
          }}
        />
        <div
          style={{
            height: 6,
            width: '40%',
            borderRadius: 99,
            background: 'rgba(255,255,255,0.08)',
            marginBottom: 20,
          }}
        />
        {/* Calendar-like card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '12px',
            marginBottom: 10,
          }}
        >
          <div style={{ height: 6, width: '70%', borderRadius: 99, background: 'rgba(255,255,255,0.15)', marginBottom: 8 }} />
          <div style={{ height: 5, width: '50%', borderRadius: 99, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        {/* Service rows */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: i === 1 ? primaryColor : 'rgba(255,255,255,0.07)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ height: 5, width: '60%', borderRadius: 99, background: 'rgba(255,255,255,0.13)', marginBottom: 4 }} />
              <div style={{ height: 4, width: '40%', borderRadius: 99, background: 'rgba(255,255,255,0.07)' }} />
            </div>
          </div>
        ))}
        {/* CTA button mockup */}
        <div
          style={{
            marginTop: 16,
            height: 36,
            borderRadius: 99,
            background: primaryColor,
            opacity: 0.9,
          }}
        />
      </div>
      {/* Home indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 48,
          height: 4,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.3)',
        }}
      />
    </div>
  )
}

export default function LandingPWACta({ tenantName, logoUrl, primaryColor }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [modalPlatform, setModalPlatform] = useState<'ios' | 'android' | 'generic'>('generic')

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
      return
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function detectPlatform(): 'ios' | 'android' | 'generic' {
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
    if (/Android/.test(ua)) return 'android'
    return 'generic'
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    } else {
      setModalPlatform(detectPlatform())
      setShowModal(true)
    }
  }

  // Don't render if already installed
  if (isStandalone) return null

  return (
    <>
      <section
        aria-label="Installa l'app"
        style={{ background: '#0a0a0a', padding: 'clamp(3rem, 6vw, 5rem) 0' } as CSSProperties}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
          <div
            style={{
              borderRadius: 28,
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#111111',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
              padding: 'clamp(2.5rem, 5vw, 4rem)',
              overflow: 'hidden',
              position: 'relative',
            } as CSSProperties}
          >
            {/* Subtle radial glow */}
            <div
              style={{
                position: 'absolute',
                top: '-40%',
                left: '-10%',
                width: '60%',
                height: '180%',
                borderRadius: '50%',
                background: `radial-gradient(ellipse, ${primaryColor}18 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            />

            <div
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10"
              style={{ position: 'relative', zIndex: 1 }}
            >
              {/* Left — text content */}
              <div style={{ maxWidth: 520 }}>
                {/* Tenant logo */}
                {logoUrl && (
                  <div style={{ marginBottom: 24 }}>
                    <Image
                      src={logoUrl}
                      alt={tenantName}
                      width={48}
                      height={48}
                      className="rounded-2xl object-cover"
                    />
                  </div>
                )}

                {/* Label */}
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.22em',
                    color: primaryColor,
                    marginBottom: 16,
                  }}
                >
                  App gratuita
                </span>

                {/* Headline */}
                <h2
                  style={{
                    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: 1.1,
                    letterSpacing: '-0.03em',
                    marginBottom: 16,
                  }}
                >
                  Prenota, accumula punti,
                  <br />
                  non aspettare.
                </h2>

                {/* Subtitle */}
                <p
                  style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.52)',
                    marginBottom: 32,
                  }}
                >
                  Installa l&apos;app di <strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{tenantName}</strong> sul tuo telefono.
                  <br />
                  Gratis, senza App Store.
                </p>

                {/* Install buttons */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <button
                    onClick={handleInstall}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 12,
                      padding: '12px 20px',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      transition: 'background 0.2s, border-color 0.2s',
                      whiteSpace: 'nowrap',
                    } as CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.16)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                    }}
                  >
                    <AppleIcon />
                    Aggiungi su iPhone
                  </button>

                  <button
                    onClick={handleInstall}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 12,
                      padding: '12px 20px',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#111111',
                      background: '#FFFFFF',
                      border: '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                      whiteSpace: 'nowrap',
                    } as CSSProperties}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                  >
                    <AndroidIcon />
                    Aggiungi su Android
                  </button>
                </div>

                {/* Hint */}
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  Nessun download richiesto — funziona dal browser
                </p>
              </div>

              {/* Right — phone mockup */}
              <div
                className="hidden lg:flex"
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 220,
                  paddingRight: 32,
                }}
              >
                <PhoneMockup primaryColor={primaryColor} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Install instructions modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Come installare l'app"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24,
              padding: '28px 24px 24px',
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#FFFFFF',
                marginBottom: 20,
                letterSpacing: '-0.02em',
              }}
            >
              Installa l&apos;app
            </p>

            {(modalPlatform === 'ios' || modalPlatform === 'generic') && (
              <div style={{ marginBottom: 18 }}>
                <p
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: primaryColor,
                    marginBottom: 8,
                  }}
                >
                  <AppleIcon /> &nbsp;Su iPhone
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
                  Apri questa pagina con{' '}
                  <strong style={{ color: '#fff' }}>Safari</strong> → tocca il bottone{' '}
                  <strong style={{ color: '#fff' }}>Condividi ↑</strong> → seleziona{' '}
                  <strong style={{ color: '#fff' }}>&ldquo;Aggiungi alla schermata Home&rdquo;</strong>
                </p>
              </div>
            )}

            {(modalPlatform === 'android' || modalPlatform === 'generic') && (
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: primaryColor,
                    marginBottom: 8,
                  }}
                >
                  <AndroidIcon /> &nbsp;Su Android
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
                  In Chrome, tocca il menu{' '}
                  <strong style={{ color: '#fff' }}>⋮</strong> → seleziona{' '}
                  <strong style={{ color: '#fff' }}>&ldquo;Installa app&rdquo;</strong> oppure{' '}
                  <strong style={{ color: '#fff' }}>&ldquo;Aggiungi a schermata Home&rdquo;</strong>
                </p>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 99,
                background: primaryColor,
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Capito
            </button>
          </div>
        </div>
      )}
    </>
  )
}
