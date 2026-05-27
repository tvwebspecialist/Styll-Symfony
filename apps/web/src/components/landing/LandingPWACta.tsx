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

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.18 1.27-2.15 3.8.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.78M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  )
}

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

  return (
    <>
      <section
        aria-label="Installa l'app"
        className="w-full"
        style={{ background: '#111' }}
      >
        <div className="w-full max-w-[1120px] mx-auto px-5 py-20 sm:py-28">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">

            {/* Text side */}
            <div className="flex-1 max-w-xl">
              {tenant.logo_url && (
                <div className="mb-6">
                  <Image
                    src={tenant.logo_url}
                    alt={tenant.business_name}
                    width={52}
                    height={52}
                    className="rounded-2xl object-cover"
                  />
                </div>
              )}

              <h2
                className="font-black text-white mb-4 leading-tight"
                style={{
                  fontSize: 'clamp(26px, 4vw, 44px)',
                  letterSpacing: '-0.025em',
                }}
              >
                Prenota, accumula punti,<br />non aspettare.
              </h2>

              <p className="text-white/55 text-base mb-8 leading-relaxed">
                Installa l&apos;app di <span className="text-white/80 font-medium">{tenant.business_name}</span>{' '}
                sul tuo telefono. Gratis, senza App Store.
              </p>

              <div className="flex flex-wrap gap-3 mb-5">
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-2.5 font-semibold text-sm rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors"
                  style={{ padding: '11px 20px' }}
                >
                  <AppleIcon />
                  Aggiungi su iPhone
                </button>
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-2.5 font-semibold text-sm rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors"
                  style={{ padding: '11px 20px' }}
                >
                  <AndroidIcon />
                  Aggiungi su Android
                </button>
              </div>

              <p className="text-white/30 text-xs">Nessun download richiesto — funziona dal browser</p>
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
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-black text-[#111] text-lg mb-6">Installa l&apos;app</p>

            {(modalPlatform === 'ios' || modalPlatform === 'generic') && (
              <div className="mb-5">
                <p
                  className="font-bold uppercase tracking-wider text-xs mb-2"
                  style={{ color: tenant.primary_color }}
                >
                  Su iPhone
                </p>
                <p className="text-sm text-[#555] leading-relaxed">
                  Apri con <strong>Safari</strong> → tocca <strong>Condividi ↑</strong> →{' '}
                  <strong>&ldquo;Aggiungi alla schermata Home&rdquo;</strong>
                </p>
              </div>
            )}

            {(modalPlatform === 'android' || modalPlatform === 'generic') && (
              <div className="mb-7">
                <p
                  className="font-bold uppercase tracking-wider text-xs mb-2"
                  style={{ color: tenant.primary_color }}
                >
                  Su Android
                </p>
                <p className="text-sm text-[#555] leading-relaxed">
                  In Chrome, tocca <strong>⋮</strong> → <strong>&ldquo;Installa app&rdquo;</strong>{' '}
                  o <strong>&ldquo;Aggiungi a schermata Home&rdquo;</strong>
                </p>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full font-bold text-sm text-white rounded-full"
              style={{ background: tenant.primary_color, padding: '13px 0' }}
            >
              Capito
            </button>
          </div>
        </div>
      )}
    </>
  )
}
