'use client'

import { useState } from 'react'
import Image from 'next/image'
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

// ── iPhone mockup ─────────────────────────────────────────────────────────────

function IPhoneMockup({ tenant, primary }: { tenant: LandingTenant; primary: string }) {
  return (
    <div
      style={{
        width: 210,
        height: 420,
        background: '#FFFFFF',
        borderRadius: 46,
        border: '8px solid #1A1A1A',
        position: 'relative',
        overflow: 'hidden',
        boxShadow:
          '0 40px 80px rgba(0,0,0,0.26), 0 12px 28px rgba(0,0,0,0.14)',
        flexShrink: 0,
      }}
    >
      {/* Dynamic Island */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 88,
          height: 26,
          background: '#1A1A1A',
          borderRadius: 13,
          zIndex: 10,
        }}
      />

      {/* Screen */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#F7F7F7',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Status area */}
        <div style={{ height: 46 }} />

        {/* App content */}
        <div
          style={{
            flex: 1,
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            padding: '14px 14px 0',
            overflow: 'hidden',
          }}
        >
          {/* Greeting */}
          <p style={{ margin: '0 0 1px', fontSize: 10, color: '#AAAAAA', fontWeight: 400 }}>
            Ciao 👋
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#111111' }}>
            {tenant.business_name}
          </p>

          {/* Appointment card */}
          <div
            style={{
              background: primary + '1A',
              borderRadius: 12,
              padding: '10px 12px',
              marginBottom: 10,
            }}
          >
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 8,
                fontWeight: 700,
                color: primary,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Prossimo appuntamento
            </p>
            <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#111111' }}>
              Taglio + Barba
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#888888' }}>
              Lun 3 Mar · 10:30
            </p>
          </div>

          {/* Points row */}
          <div
            style={{
              background: '#F4F4F4',
              borderRadius: 12,
              padding: '9px 12px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              ⭐
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#111111' }}>
                240 punti
              </p>
              <p style={{ margin: 0, fontSize: 9, color: '#888888' }}>fedeltà</p>
            </div>
          </div>

          {/* Prenota button */}
          <div
            style={{
              background: primary,
              borderRadius: 10,
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>
              Prenota ora
            </p>
          </div>
        </div>

        {/* Home indicator */}
        <div
          style={{
            background: '#FFFFFF',
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0 10px',
          }}
        >
          <div
            style={{
              width: 80,
              height: 4,
              background: '#1A1A1A',
              borderRadius: 2,
              opacity: 0.25,
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Store buttons ─────────────────────────────────────────────────────────────

function StoreButton({
  type,
  onClick,
}: {
  type: 'appstore' | 'googleplay'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: '#000000',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 12,
        padding: '11px 20px',
        cursor: 'pointer',
        minWidth: 148,
        transition: 'opacity 0.18s ease, transform 0.18s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.88'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {type === 'appstore' ? (
        <svg width="18" height="22" viewBox="0 0 18 22" fill="white" aria-hidden="true">
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
        <p style={{ margin: 0, fontSize: 9, opacity: 0.72, lineHeight: 1, fontWeight: 400 }}>
          {type === 'appstore' ? 'Download on the' : 'Get it on'}
        </p>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
          {type === 'appstore' ? 'App Store' : 'Google Play'}
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

  return (
    <>
      {/* ── CTA Section ── */}
      <section
        aria-label="Installa l'app"
        style={{ padding: '0 24px 80px', background: 'transparent' }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            paddingTop: 80, // space for phone overflow above card
          }}
        >
          {/* Card — overflow visible so phone can poke out on top */}
          <div style={{ position: 'relative', borderRadius: 32 }}>

            {/* Background layer — overflow hidden so circles are clipped */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 32,
                background: `rgba(${rgb}, 0.12)`,
                border: `1px solid rgba(${rgb}, 0.22)`,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              {/* Decorative circle 1 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '22%',
                  transform: 'translate(50%, -50%)',
                  width: 320,
                  height: 320,
                  borderRadius: '50%',
                  background: `rgba(${rgb}, 0.12)`,
                }}
              />
              {/* Decorative circle 2 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '28%',
                  transform: 'translate(50%, -50%)',
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: `rgba(${rgb}, 0.09)`,
                }}
              />
            </div>

            {/* Content grid */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 items-center"
              style={{
                position: 'relative',
                zIndex: 1,
                padding: 'clamp(40px, 5vw, 64px)',
              }}
            >
              {/* ── Left: text ── */}
              <div>
                <h2
                  style={{
                    margin: '0 0 16px',
                    fontSize: 'clamp(28px, 3.5vw, 40px)',
                    fontWeight: 800,
                    color: '#111111',
                    lineHeight: 1.15,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Porta {tenant.business_name},<br />
                  <em
                    style={{
                      fontStyle: 'italic',
                      fontWeight: 700,
                      color: `rgba(${rgb}, 0.85)`,
                    }}
                  >
                    il tuo barbiere di fiducia
                  </em>
                  <br />
                  sempre con te.
                </h2>

                <p
                  style={{
                    margin: '0 0 32px',
                    fontSize: 15,
                    color: '#6F6F6F',
                    lineHeight: 1.65,
                    maxWidth: 420,
                  }}
                >
                  Prenota, accumula punti fedeltà e ricevi offerte esclusive —
                  tutto dal tuo telefono.
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <StoreButton type="appstore" onClick={handleInstall} />
                  <StoreButton type="googleplay" onClick={handleInstall} />
                </div>
              </div>

              {/* ── Right: phone mockup (desktop) — overflows card top ── */}
              <div
                className="hidden md:flex"
                style={{ justifyContent: 'center', alignItems: 'flex-end' }}
              >
                <div
                  style={{
                    marginTop: -80,
                    transform: 'rotate(3deg)',
                    transformOrigin: 'bottom center',
                  }}
                >
                  <IPhoneMockup tenant={tenant} primary={primary} />
                </div>
              </div>
            </div>

            {/* Mobile: phone shown centered above card (optional, hidden by default) */}
            <div
              className="flex md:hidden"
              style={{ justifyContent: 'center', marginTop: -80, position: 'relative', zIndex: 2 }}
            >
              <div style={{ transform: 'rotate(0deg)', transformOrigin: 'bottom center' }}>
                <IPhoneMockup tenant={tenant} primary={primary} />
              </div>
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
