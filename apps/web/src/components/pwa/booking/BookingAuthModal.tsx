'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import {
  mergeClientProfile,
  registerClient,
  requestPasswordReset,
  resendVerificationEmail,
} from '@/lib/actions/client-auth'
import { savePendingBooking } from '@/lib/pwa-pending-booking'

type Tab = 'register' | 'login'

interface PendingBookingData {
  slug: string
  locationId: string
  staffId: string
  serviceIds: string[]
  productIds?: string[]
  date: string
  time: string
}

interface BookingAuthModalProps {
  primaryColor: string
  tenantId: string
  tenantSlug: string
  pendingBookingData: PendingBookingData
  onSuccess: (contactData: { fullName: string; phone: string; email: string }) => void
  onGuestContinue: (guestData: { fullName: string; phone: string; email: string }) => void
  onDismiss: () => void
}

type GuestStep = 'form'
type ModalView = 'auth' | 'verify-email' | 'guest'

function mapLoginError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid') || m.includes('credentials')) return 'Email o password non corretti.'
  if (m.includes('email not confirmed')) return "Controlla la tua email per verificare l'account."
  if (m.includes('too many') || m.includes('rate')) return 'Troppe richieste. Riprova tra qualche minuto.'
  return 'Qualcosa è andato storto. Riprova.'
}

const inputCls =
  'w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors'

export default function BookingAuthModal({
  primaryColor,
  tenantId,
  tenantSlug,
  pendingBookingData,
  onSuccess,
  onGuestContinue,
  onDismiss,
}: BookingAuthModalProps) {
  const [tab, setTab] = useState<Tab>('register')
  const [view, setView] = useState<ModalView>('auth')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register state
  const [regData, setRegData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
  })

  // Guest state
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setResetSent(false)
    setShowPassword(false)
  }

  // ── LOGIN — identical logic to ClientAccessForm.handleLogin ──────────────
  function handleLogin() {
    setError(null)
    startTransition(async () => {
      const pwa = createPwaClient()
      const { data, error: authError } = await pwa.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      })

      if (authError) { setError(mapLoginError(authError.message)); return }
      if (!data.user || !data.session) { setError('Qualcosa è andato storto. Riprova.'); return }

      const cookieClient = createClient()
      await cookieClient.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      const { data: profile } = await cookieClient
        .from('profiles')
        .select('user_type')
        .eq('id', data.user.id)
        .single()

      if (profile?.user_type !== 'client') {
        setError('Questo portale è riservato ai clienti.')
        await pwa.auth.signOut({ scope: 'local' })
        await cookieClient.auth.signOut({ scope: 'local' })
        return
      }

      const meta = data.user.user_metadata ?? {}
      const fullName = typeof meta.full_name === 'string' ? meta.full_name : ''
      const phone = typeof meta.phone === 'string' ? meta.phone : ''

      try {
        await mergeClientProfile({
          tenantId,
          profileId: data.user.id,
          email: data.user.email ?? loginEmail,
          phone,
          fullName,
          marketingConsent: Boolean(meta.marketing_consent),
        })
      } catch { /* non-blocking */ }

      onSuccess({
        fullName: fullName || (data.user.email ?? loginEmail),
        phone,
        email: data.user.email ?? loginEmail,
      })
    })
  }

  // ── REGISTER — identical logic to ClientAccessForm.handleRegister ─────────
  function handleRegister() {
    setError(null)

    if (regData.password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }
    if (!regData.fullName.trim()) { setError('Inserisci il tuo nome.'); return }
    if (!regData.email.trim()) { setError('Inserisci la tua email.'); return }
    if (!regData.phone.trim()) { setError('Inserisci il tuo numero di telefono.'); return }

    startTransition(async () => {
      // Save pending booking so it completes after email verification
      savePendingBooking({
        slug: pendingBookingData.slug,
        tenantId,
        locationId: pendingBookingData.locationId,
        staffId: pendingBookingData.staffId,
        serviceIds: pendingBookingData.serviceIds,
        productIds: pendingBookingData.productIds ?? [],
        date: pendingBookingData.date,
        time: pendingBookingData.time,
        fullName: regData.fullName.trim(),
        phone: regData.phone.trim(),
        email: regData.email.trim().toLowerCase(),
        pendingAuth: true,
      })

      const result = await registerClient({
        tenantId,
        email: regData.email.trim(),
        password: regData.password,
        fullName: regData.fullName.trim(),
        phone: regData.phone.trim(),
        tenantSlug,
        marketingConsent: false,
      })

      if (!result.success) {
        if (result.type === 'already_exists') {
          switchTab('login')
          setLoginEmail(regData.email.trim())
          setError("Hai già un account con questa email. Accedi per procedere.")
          return
        }
        setError(result.error)
        return
      }

      setVerificationEmail(regData.email.trim())
      setView('verify-email')
    })
  }

  // ── PASSWORD RESET ─────────────────────────────────────────────────────────
  function handlePasswordReset() {
    const email = tab === 'login' ? loginEmail : regData.email
    if (!email) { setError('Inserisci la tua email per ricevere il reset password.'); return }
    setError(null)
    startTransition(async () => {
      const result = await requestPasswordReset({ email: email.trim(), tenantSlug })
      if (!result.success) { setError(result.error); return }
      setResetSent(true)
    })
  }

  // ── GUEST SUBMIT ───────────────────────────────────────────────────────────
  function handleGuestSubmit() {
    if (!guestFirstName.trim() || !guestPhone.trim()) {
      setError('Nome e telefono sono obbligatori')
      return
    }
    const fullName = `${guestFirstName.trim()} ${guestLastName.trim()}`.trim()
    onGuestContinue({ fullName, phone: guestPhone.trim(), email: guestEmail.trim() })
  }

  const loading = isPending

  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black/45 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Floating panel — staccato dai bordi, rounded su tutti i lati */}
      <motion.div
        className="fixed bottom-6 left-4 right-4 z-50 bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        role="dialog"
        aria-label="Accedi per completare la prenotazione"
      >
        <div className="px-5 pt-6 pb-8">

          {/* ── VERIFY EMAIL VIEW ─────────────────────────────────────────── */}
          {view === 'verify-email' && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✉️</div>
              <p className="text-[18px] font-bold text-gray-900 mb-2">Controlla la tua email</p>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
                Abbiamo inviato un link di verifica a{' '}
                <span className="font-semibold text-gray-900">{verificationEmail}</span>.{' '}
                Clicca il link per attivare il tuo account e completare la prenotazione.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  startTransition(async () => {
                    await resendVerificationEmail({ email: verificationEmail, tenantSlug })
                  })
                }}
                className="w-full h-11 rounded-xl text-[14px] font-semibold border flex items-center justify-center gap-2 mb-3 transition-opacity disabled:opacity-60"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reinvia email'}
              </button>
              <button
                type="button"
                onClick={() => { setView('auth'); setError(null) }}
                className="text-[12px] text-gray-400 underline underline-offset-2"
              >
                ← Cambia email
              </button>
            </div>
          )}

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
                <p className="text-[13px] text-gray-400 mt-1">
                  Inserisci i tuoi dati per confermare la prenotazione.
                </p>
              </div>

              {error && <p className="text-[12px] text-red-500 mb-3 px-1">{error}</p>}

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
                  className="w-full h-12 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 mt-1 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor }}
                >
                  Prenota senza account →
                </button>
                <button
                  type="button"
                  onClick={() => { setView('auth'); setError(null) }}
                  className="text-[12px] text-gray-400 underline underline-offset-2 text-center mt-1"
                >
                  ← Torna al login
                </button>
              </div>
            </>
          )}

          {/* ── AUTH VIEW ─────────────────────────────────────────────────── */}
          {view === 'auth' && (
            <>
              {/* Heading */}
              <div className="mb-5 text-center">
                <p
                  className="text-[22px] font-bold text-gray-900 leading-snug"
                  style={{ fontFamily: 'var(--font-tenant, inherit)' }}
                >
                  Quasi fatto.
                </p>
                <p className="text-[13px] text-gray-400 mt-1">
                  Accedi per salvare la tua prenotazione e guadagnare punti fedeltà.
                </p>
              </div>

              {/* Tab switcher */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                {(['register', 'login'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchTab(t)}
                    className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-200"
                    style={
                      tab === t
                        ? { backgroundColor: primaryColor, color: '#ffffff' }
                        : { color: '#9ca3af', backgroundColor: 'transparent' }
                    }
                  >
                    {t === 'register' ? 'Registrati' : 'Accedi'}
                  </button>
                ))}
              </div>

              {error && <p className="text-[12px] text-red-500 mb-3 px-1">{error}</p>}

              {/* ── REGISTER FORM ── */}
              {tab === 'register' && (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Nome completo"
                    autoComplete="name"
                    value={regData.fullName}
                    onChange={(e) => setRegData((d) => ({ ...d, fullName: e.target.value }))}
                    className={inputCls}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={regData.email}
                    onChange={(e) => setRegData((d) => ({ ...d, email: e.target.value }))}
                    className={inputCls}
                  />
                  <input
                    type="tel"
                    placeholder="Telefono"
                    autoComplete="tel"
                    value={regData.phone}
                    onChange={(e) => setRegData((d) => ({ ...d, phone: e.target.value }))}
                    className={inputCls}
                  />
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password (min. 8 caratteri)"
                      autoComplete="new-password"
                      value={regData.password}
                      onChange={(e) => setRegData((d) => ({ ...d, password: e.target.value }))}
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 text-gray-400"
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crea account e prenota →'}
                  </button>
                </div>
              )}

              {/* ── LOGIN FORM ── */}
              {tab === 'login' && (
                <div className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={inputCls}
                  />
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 text-gray-400"
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={loading || resetSent}
                    className="text-[13px] font-semibold text-left disabled:opacity-60"
                    style={{ color: primaryColor }}
                  >
                    {resetSent ? 'Email inviata ✓' : 'Password dimenticata?'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accedi e prenota →'}
                  </button>
                </div>
              )}

              {/* Divisore + guest */}
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[11px] text-gray-400 uppercase tracking-wider">oppure</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={() => { setView('guest'); setError(null) }}
                className="w-full h-11 rounded-xl text-[14px] font-medium text-gray-600 border border-gray-200 bg-white flex items-center justify-center transition-all active:scale-[0.98]"
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
