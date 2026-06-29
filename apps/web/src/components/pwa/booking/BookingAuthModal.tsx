'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { EmailOtpForm } from '@/components/pwa/auth/EmailOtpForm'
import { floatingCardShellStyle } from '@/components/pwa/FloatingCard'

interface BookingAuthModalProps {
  primaryColor: string
  logoUrl?: string
  businessName?: string
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

function getNameInitials(name: string | undefined, slug: string): string {
  if (name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => (w[0] ?? '').toUpperCase())
      .join('')
  }
  return slug
    .split('-')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')
}

function TenantAppIcon({
  logoUrl,
  primaryColor,
  initials,
}: {
  logoUrl?: string
  primaryColor: string
  initials: string
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          objectFit: 'cover',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          border: '1px solid rgba(0,0,0,0.06)',
          display: 'block',
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 18,
        backgroundColor: primaryColor,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: '-0.5px',
      }}
    >
      {initials}
    </div>
  )
}

const inputCls =
  'w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors'

export default function BookingAuthModal({
  primaryColor,
  logoUrl,
  businessName,
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

  const returnToBooking =
    `/prenota/conferma` +
    `?location=${pendingBookingData.locationId}` +
    `&services=${pendingBookingData.serviceIds.join(',')}` +
    `&staff=${pendingBookingData.staffId}` +
    `&date=${pendingBookingData.date}` +
    `&time=${pendingBookingData.time}`

  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  const initials = getNameInitials(businessName, tenantSlug)

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
        className="fixed bottom-2 left-2 right-2 z-[70] overflow-hidden"
        style={{ ...floatingCardShellStyle }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        role="dialog"
        aria-label="Accedi per completare la prenotazione"
      >
        {/* Hero gradient block with logo emerging at bottom */}
        <div
          style={{
            height: 100,
            background: heroBg(primaryColor),
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 16,
          }}
        >
          <TenantAppIcon logoUrl={logoUrl} primaryColor={primaryColor} initials={initials} />
        </div>

        <div className="px-5 pb-8 pt-5">

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
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor }}
                >
                  Prenota senza account
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
                  className="text-[24px] font-extrabold text-gray-900 leading-tight"
                  style={{ fontFamily: 'var(--font-tenant, inherit)' }}
                >
                  Quasi fatto.
                </p>
                <p className="mt-1.5 mx-auto max-w-[260px] text-[14px] text-gray-400 leading-relaxed">
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
                className="w-full text-center text-[13px] text-gray-400 underline underline-offset-2 py-1 bg-transparent border-none cursor-pointer"
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
