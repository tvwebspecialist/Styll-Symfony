'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
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

// Subtle decorative squares for background texture
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

const FEATURES = [
  { icon: '⚡', text: 'Prenota in 30 secondi' },
  { icon: '🏆', text: 'Punti fedeltà ad ogni visita' },
  { icon: '📱', text: 'Zero download — dal browser' },
]

// ── Phone mockup visual ───────────────────────────────────────────────────────

function PhoneMockup({ tenant, primary }: { tenant: LandingTenant; primary: string }) {
  return (
    <div
      style={{
        width: 200,
        height: 340,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(255,255,255,0.14)',
        borderRadius: 38,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        flexShrink: 0,
      }}
    >
      {/* Notch */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 72,
          height: 22,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 11,
        }}
      />

      {/* App icon */}
      {tenant.logo_url ? (
        <Image
          src={tenant.logo_url}
          alt={tenant.business_name}
          width={68}
          height={68}
          style={{ borderRadius: 16, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 16,
            background: `${primary}99`,
            border: '2px solid rgba(255,255,255,0.18)',
          }}
        />
      )}

      {/* Business name */}
      <p
        style={{
          margin: 0,
          color: 'rgba(255,255,255,0.88)',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          padding: '0 18px',
          lineHeight: 1.3,
        }}
      >
        {tenant.business_name}
      </p>

      <p
        style={{
          margin: 0,
          color: 'rgba(255,255,255,0.38)',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        App installata
      </p>

      {/* Home indicator */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 14,
          width: 88,
          height: 4,
          background: 'rgba(255,255,255,0.22)',
          borderRadius: 2,
        }}
      />
    </div>
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

  return (
    <>
      {/* ── Section ── */}
      <section
        aria-label="Installa l'app"
        className="bg-white"
        style={{ padding: '80px 24px' }}
      >
        <motion.div
          className="max-w-[1120px] mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          viewport={{ once: true, amount: 0.3 }}
        >
          {/* Card */}
          <div
            style={{
              position: 'relative',
              borderRadius: 32,
              overflow: 'hidden',
              background: `linear-gradient(135deg, ${primary}CC 0%, #0a0a0a 100%)`,
              minHeight: 420,
            }}
          >
            {/* Background glow blob */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: -80,
                right: -60,
                width: 360,
                height: 360,
                borderRadius: '50%',
                background: `${primary}2A`,
                filter: 'blur(80px)',
                pointerEvents: 'none',
              }}
            />

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
                  background: 'rgba(255,255,255,0.06)',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* 2-column grid: text left, phone mockup right */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              style={{
                position: 'relative',
                padding: 'clamp(40px, 6vw, 72px) clamp(28px, 6vw, 64px)',
              }}
            >
              {/* ── Left: text content ── */}
              <div>
                {/* Logo badge */}
                {tenant.logo_url && (
                  <div
                    style={{
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
                    margin: '0 0 14px',
                    fontSize: 'clamp(26px, 4vw, 44px)',
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
                    margin: '0 0 28px',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.58)',
                    lineHeight: 1.65,
                  }}
                >
                  Installa l&apos;app di{' '}
                  <span style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
                    {tenant.business_name}
                  </span>{' '}
                  sul tuo telefono. Gratis, senza App Store.
                </p>

                {/* Feature pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 36 }}>
                  {FEATURES.map((f) => (
                    <div
                      key={f.text}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 9,
                        background: 'rgba(255,255,255,0.09)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 99,
                        padding: '7px 16px 7px 12px',
                        width: 'fit-content',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.80)',
                        lineHeight: 1,
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{f.icon}</span>
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={handleInstall}
                  style={{
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
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.30)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.22)'
                  }}
                >
                  Installa l&apos;app gratis
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Fine print */}
                <p style={{ margin: '14px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
                  Nessun download richiesto — funziona dal browser
                </p>
              </div>

              {/* ── Right: phone mockup (desktop only) ── */}
              <div
                className="hidden md:flex"
                style={{ justifyContent: 'center', alignItems: 'center' }}
              >
                <PhoneMockup tenant={tenant} primary={primary} />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Install modal (unchanged) ── */}
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
