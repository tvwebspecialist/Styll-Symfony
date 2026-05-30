'use client'

import { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import type { LandingTenant } from '@/types/landing'

interface Props {
  tenant: LandingTenant
}

function detectPlatform(): 'ios' | 'android' | 'generic' {
  if (typeof navigator === 'undefined') return 'generic'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'generic'
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return '26, 26, 26'
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
}

// ── Store buttons ─────────────────────────────────────────────────────────────

function StoreButton({
  type,
  onClick,
}: {
  type: 'appstore' | 'googleplay'
  onClick: () => void
}) {
  const isApple = type === 'appstore'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 22px',
        background: isApple ? '#ffffff' : 'transparent',
        color: isApple ? '#000000' : '#ffffff',
        border: isApple ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.82'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {isApple ? (
        <svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor" aria-hidden="true">
          <path d="M14.94 11.44c-.02-2.38 1.95-3.52 2.04-3.58-1.11-1.63-2.84-1.85-3.46-1.88-1.47-.15-2.88.87-3.63.87-.75 0-1.9-.85-3.12-.83C5.1 6.04 3.5 6.97 2.6 8.45c-1.83 3.17-.47 7.85 1.3 10.42.87 1.25 1.9 2.66 3.25 2.61 1.31-.05 1.8-.84 3.38-.84 1.58 0 2.03.84 3.4.81 1.41-.02 2.3-1.27 3.15-2.53.99-1.45 1.4-2.86 1.43-2.93-.03-.01-2.74-1.05-2.77-4.15zm-2.6-7.62c.72-.88 1.21-2.1 1.07-3.32-1.04.04-2.29.69-3.03 1.56-.66.77-1.25 2.01-1.09 3.19 1.16.09 2.34-.59 3.05-1.43z" />
        </svg>
      ) : (
        <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true">
          <path d="M.5 19.5c.26.14.57.17.87.1L10.56 10 7.96 7.4.5 19.5z" fill="#4285F4" />
          <path d="M17 8.77l-2.29-1.34-2.69 2.69 2.69 2.69 2.3-1.34c.66-.38.66-1.32-.01-1.7z" fill="#FBBC04" />
          <path d="M.5.5l.06.07L10.56 10l-2.6 2.6L.5.5z" fill="#EA4335" />
          <path d="M.5.5L7.96 12.6 10.56 10 1.37.6A.97.97 0 00.5.5z" fill="#34A853" />
        </svg>
      )}
      <div style={{ textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: 9, opacity: 0.65, lineHeight: 1, fontWeight: 400 }}>
          {isApple ? 'Download on the' : 'Get it on'}
        </p>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
          {isApple ? 'App Store' : 'Google Play'}
        </p>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPWACta({ tenant }: Props) {
  const { canInstall, isInstalled, install } = usePWAInstall()
  const [showModal, setShowModal] = useState(false)
  const [modalPlatform, setModalPlatform] = useState<'ios' | 'android' | 'generic'>('generic')

  if (isInstalled) return null

  async function handleInstall() {
    if (canInstall) {
      await install()
    } else {
      setModalPlatform(detectPlatform())
      setShowModal(true)
    }
  }

  const primary = tenant.primary_color || '#1a1a1a'
  const rgb = hexToRgb(primary)

  const initials = tenant.business_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      {/* ── CTA Section ── */}
      <section
        aria-label="Installa l'app"
        style={{ padding: '0 24px 80px', background: 'transparent' }}
      >
        {/* Card rettangolare */}
        <div
          className="flex-col-reverse md:flex-row"
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            borderRadius: 24,
            background: '#111111',
            padding: 'clamp(40px, 5vw, 64px) clamp(32px, 6vw, 72px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 48,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Glow decorativo dietro l'icona */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -60,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${rgb}, 0.22) 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          {/* ── Colonna sinistra: testo + bottoni ── */}
          <div className="w-full md:w-auto" style={{ flex: '0 1 60%', position: 'relative', zIndex: 1 }}>
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: 'clamp(28px, 3.5vw, 48px)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
              }}
            >
              Porta{' '}
              <span style={{ color: primary }}>{tenant.business_name}</span>
              <br />
              sempre con te.
            </h2>

            <p
              style={{
                margin: '0 0 36px',
                fontSize: 16,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.65,
                maxWidth: 440,
              }}
            >
              Prenota, accumula punti fedeltà e ricevi offerte esclusive — tutto dal tuo telefono.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StoreButton type="appstore" onClick={handleInstall} />
              <StoreButton type="googleplay" onClick={handleInstall} />
            </div>
          </div>

          {/* ── Colonna destra: icona ── */}
          <div
            className="w-full md:w-auto"
            style={{
              flex: '0 0 auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 32,
                overflow: 'hidden',
                transform: 'rotate(6deg)',
                flexShrink: 0,
                boxShadow: [
                  `0 0 60px 20px rgba(${rgb}, 0.45)`,
                  `0 0 120px 40px rgba(${rgb}, 0.2)`,
                  `0 0 200px 80px rgba(${rgb}, 0.08)`,
                ].join(', '),
              }}
            >
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt={tenant.business_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 48,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Install modal ── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Come installare l'app"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: '#FFFFFF',
              borderRadius: 24,
              padding: 28,
              boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontWeight: 800, fontSize: 18, color: '#111', margin: '0 0 24px' }}>
              Installa l&apos;app
            </p>

            {(modalPlatform === 'ios' || modalPlatform === 'generic') && (
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: primary,
                    margin: '0 0 8px',
                  }}
                >
                  Su iPhone
                </p>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: 0 }}>
                  Apri con <strong>Safari</strong> → tocca <strong>Condividi ↑</strong> →{' '}
                  <strong>&ldquo;Aggiungi alla schermata Home&rdquo;</strong>
                </p>
              </div>
            )}

            {(modalPlatform === 'android' || modalPlatform === 'generic') && (
              <div style={{ marginBottom: 28 }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: primary,
                    margin: '0 0 8px',
                  }}
                >
                  Su Android
                </p>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: 0 }}>
                  In Chrome, tocca <strong>⋮</strong> →{' '}
                  <strong>&ldquo;Installa app&rdquo;</strong> o{' '}
                  <strong>&ldquo;Aggiungi a schermata Home&rdquo;</strong>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                fontWeight: 700,
                fontSize: 15,
                color: '#FFFFFF',
                background: primary,
                border: 'none',
                borderRadius: 99,
                padding: '14px 0',
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
