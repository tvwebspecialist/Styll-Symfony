'use client'

import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  completeEmailOtpProfile,
  sendEmailOtp,
  verifyEmailOtp,
} from '@/lib/actions/pwa-auth'
import {
  MARKETING_SIGNUP_PREFIX,
  MARKETING_SIGNUP_SUFFIX,
} from '@/lib/consent-copy'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { hasAnalyticsConsent } from '@/lib/analytics-consent'
import { trackEvent, getCurrentAnonymousId, type AppSurface } from '@/lib/site-analytics/track'
import { linkSessionByAuthUser } from '@/lib/site-analytics/link-session'
import { buildRootAppUrl } from '@/lib/auth/urls'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

interface Props {
  tenantId: string
  tenantSlug: string
  mode: 'page' | 'modal'
  businessName?: string
  prefillEmail?: string
  prefillFullName?: string
  prefillPhone?: string
  returnTo?: string
  onSuccess?: (data: { email: string; fullName: string; phone: string }) => void
  appSurface?: AppSurface
}

type Step = 'email' | 'profile-data' | 'otp'

const EMPTY_OTP = ['', '', '', '', '', '']

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function SignupLegalNotice({
  privacyHref,
  termsHref,
}: {
  privacyHref: string
  termsHref: string
}) {
  return (
    <p className="text-[11px] leading-relaxed text-gray-500">
      Continuando confermi di aver letto la{' '}
      <Link href={privacyHref} className="font-medium underline underline-offset-2 text-gray-700">
        Privacy Policy
      </Link>{' '}
      e i{' '}
      <Link href={termsHref} className="font-medium underline underline-offset-2 text-gray-700">
        Termini e condizioni
      </Link>
      .
    </p>
  )
}

export function EmailOtpForm({
  tenantId,
  tenantSlug,
  mode,
  businessName,
  prefillEmail = '',
  prefillFullName = '',
  prefillPhone = '',
  returnTo,
  onSuccess,
  appSurface = 'pwa',
}: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(tenantSlug)
  const privacyHref = tenantPath('/privacy')
  const termsHref = tenantPath('/termini')
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(prefillEmail)
  const [fullName, setFullName] = useState(prefillFullName)
  const [phone, setPhone] = useState(prefillPhone)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [otpStatus, setOtpStatus] = useState<'normal' | 'success' | 'error'>('normal')
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)
  const [recentlyFilledIdx, setRecentlyFilledIdx] = useState<number | null>(null)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const otpContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (step !== 'otp') return
    const timer = window.setTimeout(() => otpRefs.current[0]?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [step])

  async function handleEmailContinue() {
    if (loading || !isValidEmail(email)) return
    setLoading(true)
    setError(null)

    const result = await sendEmailOtp(email)
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Qualcosa è andato storto. Riprova.')
      return
    }
    setOtp(EMPTY_OTP)
    setOtpStatus('normal')
    setStep('otp')
    setCountdown(60)
  }

  async function handleResendOtp() {
    if (loading) return
    setLoading(true)
    setError(null)
    setOtp(EMPTY_OTP)
    setOtpStatus('normal')

    const result = await sendEmailOtp(email)
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Qualcosa è andato storto. Riprova.')
      return
    }
    setCountdown(60)
  }

  async function finalizeAuthenticatedAccess(isSignup: boolean) {
    if (hasAnalyticsConsent()) {
      trackEvent({ tenantId, eventType: isSignup ? 'signup_completed' : 'login', appSurface })
      const anonymousId = getCurrentAnonymousId()
      if (anonymousId) {
        linkSessionByAuthUser(tenantId, anonymousId).catch(() => {})
      }
    }

    if (onSuccess) {
      onSuccess({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        phone: phone.trim(),
      })
      return
    }

    window.location.replace(tenantPath(returnTo ?? '/profilo'))
  }

  const triggerShake = useCallback(() => {
    const el = otpContainerRef.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetHeight
    el.style.animation = 'otp-shake 0.45s ease'
  }, [])

  async function handleVerifyOtp(code: string) {
    if (loading || code.length !== 6) return
    setLoading(true)
    setError(null)

    const normalizedEmail = email.trim().toLowerCase()
    const result = await verifyEmailOtp(normalizedEmail, code, tenantId)

    if (!result.success) {
      setLoading(false)
      setOtpStatus('error')
      triggerShake()
      setError(result.error ?? 'Codice non valido. Riprova.')
      setTimeout(() => {
        setOtpStatus('normal')
        setOtp(EMPTY_OTP)
        otpRefs.current[0]?.focus()
      }, 600)
      return
    }

    try {
      const cookieClient = createClient()
      const pwaClient = createPwaClient()
      if (result.session) {
        const sessionPayload = {
          access_token: result.session.accessToken,
          refresh_token: result.session.refreshToken,
        }

        await Promise.all([
          cookieClient.auth.setSession(sessionPayload),
          pwaClient.auth.setSession(sessionPayload),
        ])
      }
    } catch {
      // Non-blocking — session works via cookies
    }

    if (result.isNewClient) {
      setLoading(false)
      setStep('profile-data')
      return
    }

    setLoading(false)
    await finalizeAuthenticatedAccess(false)
  }

  async function handleProfileDataContinue() {
    if (loading || !fullName.trim()) {
      setError('Il nome è obbligatorio.')
      return
    }
    if (!phone.trim()) {
      setError('Il numero di telefono è obbligatorio.')
      return
    }
    setLoading(true)
    setError(null)

    const result = await completeEmailOtpProfile(tenantId, {
      fullName,
      phone,
      marketingConsent,
    })

    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Qualcosa è andato storto. Riprova.')
      return
    }

    await finalizeAuthenticatedAccess(true)
  }

  async function handleGoogleSignIn() {
    if (googleLoading) return
    setGoogleLoading(true)
    setError(null)

    try {
      const callbackUrl = new URL(buildRootAppUrl('/auth/callback'))
      callbackUrl.searchParams.set('next', 'pwa')
      callbackUrl.searchParams.set('tenantSlug', tenantSlug)
      callbackUrl.searchParams.set('tenantId', tenantId)
      if (returnTo) callbackUrl.searchParams.set('return_to', returnTo)

      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
          // skipBrowserRedirect: navigate manually AFTER document.cookie is committed
          // — same iOS Safari ITP fix as google-button.tsx
          skipBrowserRedirect: true,
        },
      })
      if (error || !data.url) {
        setError('Accesso con Google non disponibile. Prova con email.')
        setGoogleLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setGoogleLoading(false)
      setError('Accesso con Google non disponibile. Prova con email.')
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    setError(null)

    if (digit) {
      setRecentlyFilledIdx(index)
      setTimeout(() => setRecentlyFilledIdx(null), 220)
    }

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
    if (next.every(Boolean)) {
      setOtpStatus('success')
      void handleVerifyOtp(next.join(''))
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    if (!digits.length) return

    const next = [...EMPTY_OTP]
    digits.forEach((d, i) => {
      next[i] = d
    })
    setOtp(next)
    setError(null)

    if (digits.length === 6) {
      void handleVerifyOtp(digits.join(''))
      return
    }
    otpRefs.current[digits.length]?.focus()
  }

  // ── Modal mode ───────────────────────────────────────────────────────────────

  if (mode === 'modal') {
    if (step === 'email') {
      return (
        <div className="flex flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="La tua email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleEmailContinue()
            }}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 transition-colors"
          />
          {error && <p className="px-1 text-[12px] text-red-500">{error}</p>}
          <button
            type="button"
            onClick={() => void handleEmailContinue()}
            disabled={!isValidEmail(email) || loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand-primary, #222222)' }}
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                Caricamento…
              </>
            ) : (
              'Continua'
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] uppercase tracking-wider text-gray-400">o</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-gray-200 bg-white text-[14px] font-medium text-gray-700 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            Continua con Google
          </button>
        </div>
      )
    }

    if (step === 'profile-data') {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-gray-500">
            Ti chiediamo questi dati solo per completare il tuo primo accesso.
          </p>
          <input
            type="text"
            autoComplete="name"
            placeholder="Nome e cognome"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && fullName.trim()) void handleProfileDataContinue()
            }}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 transition-colors"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <input
            type="tel"
            autoComplete="tel"
            placeholder="+39 333 123 4567"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              setError(null)
            }}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 transition-colors"
          />
          {error && <p className="px-1 text-[12px] text-red-500">{error}</p>}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded"
              style={{ accentColor: 'var(--brand-primary, #222222)' }}
            />
            <span className="text-[11px] leading-relaxed text-gray-500">
              {MARKETING_SIGNUP_PREFIX}{' '}
              <span className="font-semibold">{businessName ?? 'il salone'}</span>.{' '}
              {MARKETING_SIGNUP_SUFFIX}
            </span>
          </label>
          <SignupLegalNotice privacyHref={privacyHref} termsHref={termsHref} />
          <button
            type="button"
            onClick={() => void handleProfileDataContinue()}
            disabled={!fullName.trim() || !phone.trim() || loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand-primary, #222222)' }}
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                Invio in corso…
              </>
            ) : (
              'Completa accesso'
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError(null)
            }}
            className="text-center text-[12px] text-gray-400 underline underline-offset-2"
          >
            ← Cambia email
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <p className="text-[13px] text-gray-500">
            Codice inviato a{' '}
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtp(EMPTY_OTP)
              setError(null)
            }}
            className="mt-1 text-[12px] font-bold"
            style={{ color: 'var(--brand-primary, #222222)' }}
          >
            Cambia email
          </button>
        </div>

        <style>{`
          @keyframes digit-pop { 0%{transform:scale(1.15)} 100%{transform:scale(1)} }
          @keyframes otp-shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-5px)} 30%{transform:translateX(5px)} 45%{transform:translateX(-5px)} 60%{transform:translateX(5px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)} }
          @keyframes otp-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        `}</style>
        <div
          ref={otpContainerRef}
          className="flex w-full justify-between"
          onPaste={handleOtpPaste}
          aria-label="Inserimento codice OTP"
        >
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                otpRefs.current[idx] = el
              }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              onFocus={() => setFocusedIdx(idx)}
              onBlur={() => setFocusedIdx(null)}
              disabled={loading}
              className="h-12 w-11 rounded-xl text-center text-[22px] font-black outline-none transition-all disabled:opacity-50"
              style={{
                borderWidth: focusedIdx === idx ? 2 : 1.5,
                borderStyle: 'solid',
                borderColor:
                  otpStatus === 'error'
                    ? '#ef4444'
                    : otpStatus === 'success'
                    ? 'var(--brand-primary, #222222)'
                    : focusedIdx === idx || digit
                    ? 'var(--brand-primary, #222222)'
                    : '#e5e7eb',
                color:
                  otpStatus === 'error'
                    ? '#ef4444'
                    : otpStatus === 'success'
                    ? 'var(--brand-primary, #222222)'
                    : '#111827',
                boxShadow:
                  otpStatus === 'error'
                    ? '0 0 0 3px rgba(239,68,68,0.18)'
                    : otpStatus === 'success'
                    ? '0 0 0 3px color-mix(in srgb, var(--brand-primary, #222222) 18%, transparent)'
                    : focusedIdx === idx
                    ? '0 0 0 3px rgba(0,0,0,0.08)'
                    : 'none',
                animation:
                  otpStatus === 'success'
                    ? 'otp-pulse 0.45s ease'
                    : recentlyFilledIdx === idx && digit
                    ? 'digit-pop 0.2s ease forwards'
                    : undefined,
              }}
              aria-label={`Cifra ${idx + 1}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-[12px] text-red-500" role="alert">
            {error}
          </p>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center gap-2 text-[13px] text-gray-500">
            <span className="size-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800" aria-hidden="true" />
            Verifica in corso…
          </div>
        )}

        <div className="text-center">
          <p className="text-[12px] text-gray-400">Non hai ricevuto il codice?</p>
          {countdown > 0 ? (
            <p className="mt-1 text-[12px] font-semibold text-gray-600">Reinvia tra {countdown}s</p>
          ) : (
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={loading}
              className="mt-1 text-[12px] font-bold disabled:opacity-40"
              style={{ color: 'var(--brand-primary, #222222)' }}
            >
              Reinvia il codice
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Page mode ────────────────────────────────────────────────────────────────

  if (step === 'email') {
    return (
      <main className="flex min-h-[calc(100dvh-164px)] flex-col items-center bg-white px-5 pb-10 pt-10">
        <div className="relative mb-8 mt-2">
          <div className="flex size-28 items-center justify-center rounded-full styll-bg-brand-primary-soft">
            <Mail className="size-12 text-[var(--brand-primary)]" strokeWidth={1.5} aria-hidden="true" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-neutral-950">Accedi con la tua email</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-neutral-500">
            Niente password da ricordare — se l&apos;indirizzo è valido, riceverai un codice a 6 cifre direttamente in email.
          </p>
        </div>

        <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <label htmlFor="email-otp-input" className="mb-2 block text-sm font-medium text-neutral-700">
            La tua email
          </label>
          <input
            id="email-otp-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@esempio.it"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValidEmail(email)) void handleEmailContinue()
            }}
            className={`h-[54px] w-full rounded-2xl border px-4 text-neutral-950 outline-none styll-focus-brand-primary-ring ${
              error
                ? 'border-red-400'
                : 'border-neutral-200'
            }`}
            style={{ fontSize: 16 }}
            aria-describedby={error ? 'email-otp-error' : undefined}
          />
          {error && (
            <p id="email-otp-error" className="mt-2 text-xs text-red-500" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleEmailContinue()}
            disabled={!isValidEmail(email) || loading}
            className="mt-4 flex h-[52px] w-full items-center justify-center rounded-full text-base font-semibold text-white transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-primary, #1a1a1a)' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden="true"
                />
                Caricamento…
              </span>
            ) : (
              'Continua'
            )}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs uppercase tracking-wider text-neutral-400">oppure</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading}
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            Continua con Google
          </button>
        </div>
      </main>
    )
  }

  if (step === 'profile-data') {
    return (
      <main className="flex min-h-[calc(100dvh-164px)] flex-col items-center bg-white px-5 pb-10 pt-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-neutral-950">Completa il tuo profilo</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-neutral-500">
            Ti chiediamo questi dati solo per completare il tuo primo accesso nell&apos;app del salone.
          </p>
        </div>

        <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-neutral-700">
                Nome e cognome
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                placeholder="Mario Rossi"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && fullName.trim()) void handleProfileDataContinue()
                }}
                className="h-[54px] w-full rounded-2xl border border-neutral-200 px-4 text-neutral-950 outline-none styll-focus-brand-primary-ring"
                style={{ fontSize: 16 }}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium text-neutral-700">
                Numero di telefono
              </label>
              <input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+39 333 123 4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setError(null)
                }}
                className="h-[54px] w-full rounded-2xl border border-neutral-200 px-4 text-neutral-950 outline-none styll-focus-brand-primary-ring"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500" role="alert">
              {error}
            </p>
          )}
          <label className="mt-1 flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded"
              style={{ accentColor: 'var(--brand-primary, #1a1a1a)' }}
            />
            <span className="text-xs leading-relaxed text-neutral-500">
              {MARKETING_SIGNUP_PREFIX}{' '}
              <span className="font-semibold">{businessName ?? 'il salone'}</span>.{' '}
              {MARKETING_SIGNUP_SUFFIX}
            </span>
          </label>
          <div className="mt-3">
            <SignupLegalNotice privacyHref={privacyHref} termsHref={termsHref} />
          </div>
          <button
            type="button"
            onClick={() => void handleProfileDataContinue()}
            disabled={!fullName.trim() || !phone.trim() || loading}
            className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full text-base font-semibold text-white transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-primary, #1a1a1a)' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden="true"
                />
                Invio in corso…
              </span>
            ) : (
              'Completa accesso'
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError(null)
            }}
            className="mt-3 w-full text-center text-sm font-medium text-[var(--brand-primary)]"
          >
            ← Cambia email
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100dvh-164px)] flex-col items-center bg-white px-5 pb-10 pt-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-neutral-950">Controlla la tua email</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Codice inviato a{' '}
            <span className="font-semibold text-neutral-800">{email}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtp(EMPTY_OTP)
              setError(null)
            }}
            className="mt-2 text-sm font-bold text-[var(--brand-primary)]"
          >
            Cambia email
          </button>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <p className="mb-4 text-sm font-medium text-neutral-700">Inserisci il codice a 6 cifre</p>

          <style>{`
            @keyframes digit-pop { 0%{transform:scale(1.15)} 100%{transform:scale(1)} }
            @keyframes otp-shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-5px)} 30%{transform:translateX(5px)} 45%{transform:translateX(-5px)} 60%{transform:translateX(5px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)} }
            @keyframes otp-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
          `}</style>
          <div
            ref={otpContainerRef}
            className="flex w-full justify-between"
            onPaste={handleOtpPaste}
            aria-label="Inserimento codice OTP"
          >
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  otpRefs.current[idx] = el
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                onFocus={() => setFocusedIdx(idx)}
                onBlur={() => setFocusedIdx(null)}
                disabled={loading}
                className="h-12 w-12 rounded-xl text-center text-2xl font-black outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderWidth: focusedIdx === idx ? 2.5 : 2,
                  borderStyle: 'solid',
                  borderColor:
                    otpStatus === 'error'
                      ? '#ef4444'
                      : otpStatus === 'success'
                      ? 'var(--brand-primary, #1a1a1a)'
                      : focusedIdx === idx || digit
                      ? 'var(--brand-primary, #1a1a1a)'
                      : '#e5e7eb',
                  color:
                    otpStatus === 'error'
                      ? '#ef4444'
                      : otpStatus === 'success'
                      ? 'var(--brand-primary, #1a1a1a)'
                      : '#0a0a0a',
                  background:
                    otpStatus === 'success' && digit
                      ? 'color-mix(in srgb, var(--brand-primary, #1a1a1a) 6%, transparent)'
                      : digit
                      ? 'color-mix(in srgb, var(--brand-primary, #1a1a1a) 4%, transparent)'
                      : 'white',
                  boxShadow:
                    otpStatus === 'error'
                      ? '0 0 0 3px rgba(239,68,68,0.18)'
                      : otpStatus === 'success'
                      ? '0 0 0 3px color-mix(in srgb, var(--brand-primary, #1a1a1a) 18%, transparent)'
                      : focusedIdx === idx
                      ? '0 0 0 3px rgba(0,0,0,0.07)'
                      : 'none',
                  animation:
                    otpStatus === 'success'
                      ? 'otp-pulse 0.45s ease'
                      : recentlyFilledIdx === idx && digit
                      ? 'digit-pop 0.2s ease forwards'
                      : undefined,
                }}
                aria-label={`Cifra ${idx + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="mt-3 text-center text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          {loading && !error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500">
              <span
                className="size-4 animate-spin rounded-full border-2 border-neutral-200 border-t-[var(--brand-primary)]"
                aria-hidden="true"
              />
              Verifica in corso…
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500">Non hai ricevuto il codice?</p>
          {countdown > 0 ? (
            <p className="mt-1.5 text-sm font-semibold text-neutral-600">Reinvia tra {countdown}s</p>
          ) : (
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={loading}
              className="mt-1.5 text-sm font-bold text-[var(--brand-primary)] disabled:opacity-40"
            >
              Reinvia il codice
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
