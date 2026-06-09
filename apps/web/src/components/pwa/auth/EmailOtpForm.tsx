'use client'

import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { sendEmailOtp, verifyEmailOtp } from '@/lib/actions/pwa-auth'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface Props {
  tenantId: string
  tenantSlug: string
  mode: 'page' | 'modal'
  prefillEmail?: string
  returnTo?: string
  onSuccess?: (email: string) => void
}

const EMPTY_OTP = ['', '', '', '', '', '']

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function EmailOtpForm({
  tenantId,
  tenantSlug,
  mode,
  prefillEmail = '',
  returnTo,
  onSuccess,
}: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(tenantSlug)

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState(prefillEmail)
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

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

  async function handleSendOtp() {
    if (loading || !isValidEmail(email)) return
    setLoading(true)
    setError(null)
    setOtp(EMPTY_OTP)

    const result = await sendEmailOtp(email)
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Qualcosa è andato storto. Riprova.')
      return
    }

    setStep('otp')
    setCountdown(60)
  }

  async function handleVerifyOtp(code: string) {
    if (loading || code.length !== 6) return
    setLoading(true)
    setError(null)

    const normalizedEmail = email.trim().toLowerCase()
    const result = await verifyEmailOtp(normalizedEmail, code, tenantId)

    if (!result.success) {
      setLoading(false)
      setError(result.error ?? 'Codice non valido. Riprova.')
      return
    }

    // Persist session to localStorage for iOS PWA cold-launch resistance
    try {
      const cookieClient = createClient()
      const pwaClient = createPwaClient()
      const {
        data: { session },
      } = await cookieClient.auth.getSession()
      if (session) {
        await pwaClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
      }
    } catch {
      // Non-blocking — session works via cookies
    }

    if (onSuccess) {
      onSuccess(normalizedEmail)
      return
    }

    router.push(tenantPath(returnTo ?? '/profilo'))
    router.refresh()
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    setError(null)

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
    if (next.every(Boolean)) {
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
              if (e.key === 'Enter') void handleSendOtp()
            }}
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 transition-colors"
          />
          {error && <p className="px-1 text-[12px] text-red-500">{error}</p>}
          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={!isValidEmail(email) || loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand-primary, #222222)' }}
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                Invio in corso…
              </>
            ) : (
              'Invia codice →'
            )}
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

        <div
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
              disabled={loading}
              className="h-12 w-11 rounded-xl border-[1.5px] text-center text-[22px] font-black text-gray-900 outline-none transition disabled:opacity-50"
              style={{ borderColor: digit ? 'var(--brand-primary, #222222)' : '#e5e7eb' }}
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
              onClick={() => void handleSendOtp()}
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
      <main className="flex min-h-[calc(100dvh-164px)] flex-col items-center bg-[#F7F7F7] px-5 pb-10 pt-10">
        {/* Hero */}
        <div className="relative mb-8 mt-2">
          <div className="flex size-28 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
            <Mail className="size-12 text-[var(--brand-primary)]" strokeWidth={1.5} aria-hidden="true" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-neutral-950">Accedi con la tua email</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-neutral-500">
            Niente password da ricordare — ti inviamo un codice a 6 cifre direttamente in email.
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
              if (e.key === 'Enter' && isValidEmail(email)) void handleSendOtp()
            }}
            className={`h-[54px] w-full rounded-2xl border px-4 text-neutral-950 outline-none transition focus:ring-2 focus:ring-[var(--brand-primary)]/30 ${
              error
                ? 'border-red-400'
                : 'border-neutral-200 focus:border-[var(--brand-primary)]'
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
            onClick={() => void handleSendOtp()}
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
                Invio in corso…
              </span>
            ) : (
              'Invia codice'
            )}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100dvh-164px)] flex-col items-center bg-[#F7F7F7] px-5 pb-10 pt-10">
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

          <div
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
                disabled={loading}
                className={[
                  'h-12 w-12 rounded-xl border-2 text-center text-2xl font-black text-neutral-950',
                  'outline-none transition disabled:cursor-not-allowed disabled:opacity-50',
                  digit
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                    : 'border-neutral-200 bg-white',
                ]
                  .filter(Boolean)
                  .join(' ')}
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
              onClick={() => void handleSendOtp()}
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
