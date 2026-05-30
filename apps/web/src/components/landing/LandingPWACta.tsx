'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import type { LandingTenant } from '@/types/landing'

interface Props {
  tenant: LandingTenant
}

type Platform = 'android' | 'ios' | 'desktop'
type Modal = 'ios' | 'qr' | null

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return '26, 26, 26'
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
}

// ── iOS guide modal ───────────────────────────────────────────────────────────

function IOSModal({ onClose, primary }: { onClose: () => void; primary: string }) {
  const steps = [
    {
      icon: (
        // Safari Share button (box + arrow up)
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect x="2" y="10" width="24" height="16" rx="3" stroke="white" strokeWidth="2" />
          <path d="M14 2v14M9 7l5-5 5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Tocca il tasto Condividi',
      sub: 'Icona ↑ in basso nella barra di Safari',
    },
    {
      icon: (
        // Square with plus
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="20" height="20" rx="4" stroke="white" strokeWidth="2" />
          <path d="M14 9v10M9 14h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      label: 'Aggiungi alla schermata Home',
      sub: 'Scorri in basso nel menu e tocca questa voce',
    },
    {
      icon: (
        // Checkmark
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="11" stroke="white" strokeWidth="2" />
          <path d="M8.5 14l4 4 7-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Tocca "Aggiungi" in alto a destra',
      sub: "L'app apparirà sulla tua schermata Home",
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
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#1a1a1a',
          borderRadius: 28,
          padding: '28px 28px 36px',
          boxShadow: '0 -4px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <p style={{ fontWeight: 800, fontSize: 18, color: '#fff', margin: 0 }}>
            Installa su iPhone
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            style={{
              background: 'rgba(255,255,255,0.1)',
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
            }}
          >
            ×
          </button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Circle number */}
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
              <div style={{ paddingTop: 2 }}>
                <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                  {step.label}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  {step.sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Safari warning */}
        <div
          style={{
            marginTop: 28,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            ⚠️ Assicurati di usare <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Safari</strong>,
            non Chrome o altri browser, altrimenti il tasto Condividi non apparirà.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── QR code modal ─────────────────────────────────────────────────────────────

function QRModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR code per installare l'app"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: 28,
          padding: '36px 40px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
          maxWidth: 340,
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.1)',
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
          }}
        >
          ×
        </button>

        <p style={{ fontWeight: 800, fontSize: 18, color: '#fff', margin: '0 0 6px' }}>
          Scarica sul telefono
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.5 }}>
          Scansiona con la fotocamera del telefono
        </p>

        {/* QR code */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: 16,
            display: 'inline-block',
            marginBottom: 20,
          }}
        >
          <QRCodeSVG value={url} size={180} level="M" />
        </div>

        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
          Apri Safari sul telefono → visita la pagina → installa
        </p>
      </div>
    </div>
  )
}

// ── Install button ────────────────────────────────────────────────────────────

function InstallButton({
  label,
  onClick,
  primary,
  variant = 'primary',
}: {
  label: string
  onClick: () => void
  primary: string
  variant?: 'primary' | 'outline'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 28px',
        background: variant === 'primary' ? primary : 'transparent',
        color: '#ffffff',
        border: variant === 'primary' ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        letterSpacing: '-0.01em',
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
      {label}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPWACta({ tenant }: Props) {
  const { canInstall, isInstalled, install } = usePWAInstall()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [pwaUrl, setPwaUrl] = useState('')

  useEffect(() => {
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios')
    } else if (/Android/.test(ua)) {
      setPlatform('android')
    } else {
      setPlatform('desktop')
    }
    setPwaUrl(window.location.href)
  }, [])

  // Already running as standalone PWA → hide the CTA
  if (isInstalled) return null

  // Wait for client-side platform detection
  if (platform === null) return null

  const primary = tenant.primary_color || '#1a1a1a'
  const rgb = hexToRgb(primary)

  const initials = tenant.business_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  async function handleAndroidInstall() {
    if (canInstall) {
      await install()
    } else {
      // Already installed or browser doesn't support it — nothing to do
    }
  }

  return (
    <>
      {/* ── CTA Section ── */}
      <section
        aria-label="Installa l'app"
        style={{ padding: '0 24px 80px', background: 'transparent' }}
      >
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

          {/* ── Colonna sinistra: testo + bottone ── */}
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

            {/* Bottone smart per piattaforma */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {platform === 'android' && (
                <InstallButton
                  label="Aggiungi alla Home"
                  onClick={handleAndroidInstall}
                  primary={primary}
                />
              )}

              {platform === 'ios' && (
                <InstallButton
                  label="Installa su iPhone"
                  onClick={() => setModal('ios')}
                  primary={primary}
                />
              )}

              {platform === 'desktop' && (
                <InstallButton
                  label="Scarica sul telefono"
                  onClick={() => setModal('qr')}
                  primary={primary}
                />
              )}
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

      {/* ── Modals ── */}
      {modal === 'ios' && (
        <IOSModal onClose={() => setModal(null)} primary={primary} />
      )}
      {modal === 'qr' && pwaUrl && (
        <QRModal url={pwaUrl} onClose={() => setModal(null)} />
      )}
    </>
  )
}
