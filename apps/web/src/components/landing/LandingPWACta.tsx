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

// Decorative squares data
const SQUARES = [
  { top: 14,  right: 96,  size: 44, r: 10 },
  { top: 56,  right: 46,  size: 24, r:  6 },
  { top: 110, right: 76,  size: 14, r:  4 },
  { top: 22,  right: 162, size: 16, r:  4 },
  { top: 42,  left:  84,  size: 20, r:  5 },
  { top: 90,  left:  44,  size: 12, r:  3 },
  { bottom: 30, left: 58, size: 30, r:  8 },
  { bottom: 80, left: 26, size: 16, r:  4 },
] as const

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

  return (
    <>
      <section
        aria-label="Installa l'app"
        style={{ background: '#F5F5F5', padding: '80px 20px 100px' }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Gradient card */}
          <div
            style={{
              position: 'relative',
              borderRadius: 28,
              overflow: 'hidden',
              padding: 'clamp(48px, 7vw, 72px) clamp(24px, 6vw, 64px)',
              background: `linear-gradient(145deg, ${primary} 0%, rgba(0,0,0,0.92) 100%)`,
              textAlign: 'center',
            }}
          >
            {/* Decorative squares */}
            {SQUARES.map((s, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top:    'top'    in s ? s.top    : undefined,
                  bottom: 'bottom' in s ? s.bottom : undefined,
                  left:   'left'   in s ? s.left   : undefined,
                  right:  'right'  in s ? s.right  : undefined,
                  width:  s.size,
                  height: s.size,
                  borderRadius: s.r,
                  background: 'rgba(255,255,255,0.08)',
                }}
              />
            ))}

            {/* Logo badge */}
            {tenant.logo_url && (
              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.20)',
                  borderRadius: 18,
                  padding: 10,
                  marginBottom: 28,
                }}
              >
                <Image
                  src={tenant.logo_url}
                  alt={tenant.business_name}
                  width={52}
                  height={52}
                  style={{ borderRadius: 10, objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Headline */}
            <h2
              style={{
                position: 'relative',
                margin: '0 0 16px',
                fontSize: 'clamp(26px, 4.5vw, 46px)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
              }}
            >
              Prenota, accumula punti,<br />non aspettare.
            </h2>

            {/* Subtitle */}
            <p
              style={{
                position: 'relative',
                margin: '0 auto 40px',
                maxWidth: 460,
                fontSize: 16,
                color: 'rgba(255,255,255,0.60)',
                lineHeight: 1.65,
              }}
            >
              Installa l&apos;app di{' '}
              <span style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
                {tenant.business_name}
              </span>{' '}
              sul tuo telefono. Gratis, senza App Store.
            </p>

            {/* CTA */}
            <button
              onClick={handleInstall}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#FFFFFF',
                color: '#111111',
                border: 'none',
                borderRadius: 99,
                padding: '15px 36px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
              }}
            >
              Installa l&apos;app gratis
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>

            {/* Fine print */}
            <p
              style={{
                position: 'relative',
                margin: '18px 0 0',
                fontSize: 12,
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              Nessun download richiesto — funziona dal browser
            </p>
          </div>
        </div>
      </section>

      {/* Install modal */}
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
                <p style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: primary, margin: '0 0 8px' }}>
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
                <p style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: primary, margin: '0 0 8px' }}>
                  Su Android
                </p>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: 0 }}>
                  In Chrome, tocca <strong>⋮</strong> → <strong>&ldquo;Installa app&rdquo;</strong>{' '}
                  o <strong>&ldquo;Aggiungi a schermata Home&rdquo;</strong>
                </p>
              </div>
            )}

            <button
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
