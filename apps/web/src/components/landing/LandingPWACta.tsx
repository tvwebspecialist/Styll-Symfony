'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { LandingTenant } from '@/types/landing'

interface Props {
  tenant: LandingTenant
}

type Platform = 'android' | 'ios' | 'desktop'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

function getPwaInstallUrl(slug: string): string {
  if (ROOT_DOMAIN.includes('localhost')) {
    return `http://localhost:3000/?_tenant_slug=${slug}&_tenant_type=app&install=true`
  }
  return `https://${slug}-app.${ROOT_DOMAIN}?install=true`
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return '26, 26, 26'
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
}

// ── QR code modal (desktop only) ─────────────────────────────────────────────

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
          position: 'relative',
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
          Scansiona col telefono
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.5 }}>
          Apri la fotocamera e inquadra il codice — verrà aperta l&apos;app nel browser
        </p>

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
          Su iPhone usa Safari → installa l&apos;app dalla pagina che si apre
        </p>
      </div>
    </div>
  )
}

// ── Install button ────────────────────────────────────────────────────────────

function InstallButton({ label, onClick, primary }: { label: string; onClick: () => void; primary: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 28px',
        background: primary,
        color: '#ffffff',
        border: 'none',
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
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [showQR, setShowQR] = useState(false)
  const pwaUrl = getPwaInstallUrl(tenant.slug)

  useEffect(() => {
    // Check standalone — if already installed as PWA, hide CTA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPlatform(null)
      return
    }
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios')
    } else if (/Android/.test(ua)) {
      setPlatform('android')
    } else {
      setPlatform('desktop')
    }
  }, [])

  // Hidden before hydration and when already installed
  if (platform === null) return null

  const primary = tenant.primary_color || '#1a1a1a'
  const rgb = hexToRgb(primary)

  const initials = tenant.business_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  function handleInstallClick() {
    if (platform === 'desktop') {
      setShowQR(true)
    } else {
      // Android + iOS: redirect to PWA on the correct origin with ?install=true
      window.location.href = pwaUrl
    }
  }

  const buttonLabel =
    platform === 'android' ? 'Aggiungi alla Home' :
    platform === 'ios'     ? 'Installa su iPhone' :
                             'Scarica sul telefono'

  return (
    <>
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
          {/* Glow decorativo */}
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

          {/* Testo + bottone */}
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

            <InstallButton label={buttonLabel} onClick={handleInstallClick} primary={primary} />
          </div>

          {/* Icona */}
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

      {showQR && <QRModal url={pwaUrl} onClose={() => setShowQR(false)} />}
    </>
  )
}
