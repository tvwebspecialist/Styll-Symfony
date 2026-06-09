'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { EmailOtpForm } from '@/components/pwa/auth/EmailOtpForm'

interface BookingAuthModalProps {
  primaryColor: string
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

const inputCls =
  'w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors'

export default function BookingAuthModal({
  primaryColor,
  tenantId,
  tenantSlug,
  prefillEmail = '',
  prefillFullName = '',
  prefillPhone = '',
  onSuccess,
  onGuestContinue,
  onDismiss,
}: BookingAuthModalProps) {
  const [view, setView] = useState<ModalView>('auth')
  const [error, setError] = useState<string | null>(null)

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
        className="fixed bottom-6 left-4 right-4 z-[70] rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        role="dialog"
        aria-label="Accedi per completare la prenotazione"
      >
        <div className="px-5 pb-8 pt-6">

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
                  className="text-[22px] font-bold text-gray-900 leading-snug"
                  style={{ fontFamily: 'var(--font-tenant, inherit)' }}
                >
                  Quasi fatto.
                </p>
                <p className="mt-1 text-[13px] text-gray-400">
                  Accedi per salvare la tua prenotazione e guadagnare punti fedeltà.
                </p>
              </div>

              <EmailOtpForm
                tenantId={tenantId}
                tenantSlug={tenantSlug}
                mode="modal"
                prefillEmail={prefillEmail}
                prefillFullName={prefillFullName}
                prefillPhone={prefillPhone}
                onSuccess={(data) => {
                  onSuccess({
                    fullName: data.fullName || prefillFullName,
                    phone: data.phone || prefillPhone,
                    email: data.email,
                  })
                }}
              />

              {/* Divisore + guest */}
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[11px] uppercase tracking-wider text-gray-400">oppure</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setView('guest')
                  setError(null)
                }}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-gray-200 bg-white text-[14px] font-medium text-gray-600 transition-all active:scale-[0.98]"
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
