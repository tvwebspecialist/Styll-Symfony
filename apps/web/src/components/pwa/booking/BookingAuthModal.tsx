'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { EmailOtpForm } from '@/components/pwa/auth/EmailOtpForm'

interface BookingAuthModalProps {
  primaryColor: string
  logoUrl?: string
  tenantId: string
  tenantSlug: string
  pendingBookingData: {
    slug: string
    locationId: string
    staffId: string
    serviceIds: string[]
    productIds?: string[]
    date: string
    time: string
  }
  prefillEmail?: string
  prefillFullName?: string
  prefillPhone?: string
  onSuccess: (contactData: { fullName: string; phone: string; email: string }) => void
  onGuestContinue: (guestData: { fullName: string; phone: string; email: string }) => void
  onDismiss: () => void
}

type ModalView = 'auth' | 'guest'

function heroBg(color: string): string {
  try {
    let hex = color.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `linear-gradient(to bottom, rgba(${r},${g},${b},0.18), transparent)`
  } catch {
    return 'linear-gradient(to bottom, rgba(0,0,0,0.10), transparent)'
  }
}

function ScissorsIcon({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

const inputCls =
  'w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors'

export default function BookingAuthModal({
  primaryColor,
  logoUrl,
  tenantId,
  tenantSlug,
  pendingBookingData,
  prefillEmail = '',
  prefillFullName = '',
  prefillPhone = '',
  onSuccess,
  onGuestContinue,
  onDismiss,
}: BookingAuthModalProps) {
  const [view, setView] = useState<ModalView>('auth')
  const [error, setError] = useState<string | null>(null)

  // Reconstruct the booking confirmation URL so that after Google OAuth the
  // callback can redirect straight back here instead of going to /profilo.
  // Email OTP uses onSuccess inline (no page navigation), so returnTo only
  // matters for the Google OAuth path inside EmailOtpForm.handleGoogleSignIn.
  const returnToBooking =
    `/prenota/conferma` +
    `?location=${pendingBookingData.locationId}` +
    `&services=${pendingBookingData.serviceIds.join(',')}` +
    `&staff=${pendingBookingData.staffId}` +
    `&date=${pendingBookingData.date}` +
    `&time=${pendingBookingData.time}`

  // Guest state
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  function handleGuestSubmit() {
    if (!guestFirstName.trim() || !guestPhone.trim()) {
      setError('Nome e telefono sono obbligatori')
      return
    }
    const fullName = `${guestFirstName.trim()} ${guestLastName.trim()}`.trim()
    onGuestContinue({ fullName, phone: guestPhone.trim(), email: guestEmail.trim() })
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 z-[70] bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Floating panel */}
      <motion.div
        className="fixed bottom-6 left-4 right-4 z-[70] rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        role="dialog"
        aria-label="Accedi per completare la prenotazione"
      >
        {/* Hero gradient block */}
        <div
          style={{
            height: 80,
            background: heroBg(primaryColor),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
          ) : (
            <ScissorsIcon color={primaryColor} />
          )}
        </div>
        <div className="px-5 pb-8 pt-4">

          {/* ── GUEST VIEW ────────────────────────────────────────────────── */}
          {view === 'guest' && (
            <>
              <div className="mb-5">
                <p
                  className="text-[22px] font-bold text-gray-900 leading-snug"
                  style={{ fontFamily: 'var(--font-tenant, inherit)' }}
                >
                  Prenota come ospite
                </p>
                <p className="mt-1 text-[13px] text-gray-400">
                  Inserisci i tuoi dati per confermare la prenotazione.
                </p>
              </div>

              {error && <p className="mb-3 px-1 text-[12px] text-red-500">{error}</p>}

              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nome"
                    value={guestFirstName}
                    onChange={(e) => setGuestFirstName(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="Cognome"
                    value={guestLastName}
                    onChange={(e) => setGuestLastName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Telefono"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="email"
                  placeholder="Email (opzionale)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={handleGuestSubmit}
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor }}
                >
                  Prenota senza account →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('auth')
                    setError(null)
                  }}
                  className="mt-1 text-center text-[12px] text-gray-400 underline underline-offset-2"
                >
                  ← Torna al login
                </button>
              </div>
            </>
          )}

          {/* ── AUTH VIEW ─────────────────────────────────────────────────── */}
          {view === 'auth' && (
            <>
              <div className="mb-5 text-center">
                <p
                  className="text-[26px] font-black text-gray-900 leading-tight"
                  style={{ fontFamily: 'var(--font-tenant, inherit)' }}
                >
                  Quasi fatto.
                </p>
                <p className="mt-1.5 text-[12px] text-gray-400 leading-relaxed">
                  Accedi per salvare la prenotazione e guadagnare punti fedeltà.
                </p>
              </div>

              <EmailOtpForm
                tenantId={tenantId}
                tenantSlug={tenantSlug}
                mode="modal"
                prefillEmail={prefillEmail}
                prefillFullName={prefillFullName}
                prefillPhone={prefillPhone}
                returnTo={returnToBooking}
                onSuccess={(data) => {
                  onSuccess({
                    fullName: data.fullName || prefillFullName,
                    phone: data.phone || prefillPhone,
                    email: data.email,
                  })
                }}
              />

              {/* Divisore */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #e5e7eb)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">oppure</span>
                <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, #e5e7eb)' }} />
              </div>

              <button
                type="button"
                onClick={() => {
                  setView('guest')
                  setError(null)
                }}
                className="w-full text-center text-[13px] font-medium text-gray-400 transition-colors hover:text-gray-600 active:opacity-70 py-1"
              >
                Continua senza account
              </button>
            </>
          )}

        </div>
      </motion.div>
    </>
  )
}
