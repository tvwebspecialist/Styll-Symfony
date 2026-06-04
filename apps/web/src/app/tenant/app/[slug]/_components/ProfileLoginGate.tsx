'use client'

import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scissors, Star, Trophy } from 'lucide-react'
import { sendOtp, verifyOtp } from '@/lib/actions/pwa-auth'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface ProfileLoginGateProps {
  slug: string
  tenantId: string
}

type Step = 'phone' | 'otp'

const EMPTY_OTP = ['', '', '', '', '', '']

function maskPhone(raw: string): string {
  if (raw.length <= 4) return `+39 ${raw}`
  const last4 = raw.slice(-4)
  const masked = '●'.repeat(Math.max(0, raw.length - 4))
  const maskedFmt =
    masked.length <= 3
      ? masked
      : masked.length <= 6
        ? `${masked.slice(0, 3)} ${masked.slice(3)}`
        : `${masked.slice(0, 3)} ${masked.slice(3, 6)} ${masked.slice(6)}`
  return `+39 ${maskedFmt} ${last4.slice(0, 2)} ${last4.slice(2)}`
}

export function ProfileLoginGate({ slug, tenantId }: ProfileLoginGateProps) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  // Auto-focus first OTP cell when step changes
  useEffect(() => {
    if (step !== 'otp') return
    const timer = window.setTimeout(() => otpRefs.current[0]?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [step])

  async function handleSendOtp() {
    if (loading || phone.length < 9) return
    setLoading(true)
    setError(null)
    setOtp(EMPTY_OTP)

    const result = await sendOtp(`+39${phone}`)
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

    const result = await verifyOtp(`+39${phone}`, code, tenantId)

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

    router.replace(tenantPath('/profilo'))
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

  // ── Step: phone ─────────────────────────────────────────────────────────────
  if (step === 'phone') {
    return (
      <main className="flex min-h-[calc(100dvh-164px)] flex-col items-center bg-[#F7F7F7] px-5 pb-10 pt-10">
        {/* Hero illustration */}
        <div className="relative mb-8 mt-2">
          <div className="flex size-28 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
            <Scissors
              className="size-12 text-[var(--brand-primary)]"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
          <div className="absolute -right-2 -top-2 flex size-11 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.10)]">
            <Trophy className="size-5 text-amber-500" aria-hidden="true" />
          </div>
          <div className="absolute -bottom-1 -left-3 flex size-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.10)]">
            <Star
              className="size-4 text-[var(--brand-primary)]"
              fill="currentColor"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Headline */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-neutral-950">Il tuo spazio fedeltà</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-neutral-500">
            Accedi con il tuo numero per vedere i punti, la streak e i premi che ti aspettano.
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <label htmlFor="phone-input" className="mb-2 block text-sm font-medium text-neutral-700">
            Il tuo numero di telefono
          </label>
          <div
            className={`flex h-[54px] w-full items-center overflow-hidden rounded-2xl border bg-white transition focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/30 ${
              error ? 'border-red-400' : 'border-neutral-200 focus-within:border-[var(--brand-primary)]'
            }`}
          >
            <div className="flex h-full min-w-[86px] shrink-0 items-center justify-center border-r border-neutral-100 px-3 text-[15px] font-semibold text-neutral-900">
              🇮🇹 +39
            </div>
            <input
              id="phone-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="333 123 4567"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && phone.length >= 9) void handleSendOtp()
              }}
              className="h-full flex-1 bg-transparent px-4 text-neutral-950 outline-none"
              style={{ fontSize: 16 }}
              aria-describedby={error ? 'phone-error' : undefined}
            />
          </div>

          {error && (
            <p id="phone-error" className="mt-2 text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={phone.length < 9 || loading}
            className="mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-neutral-950 text-base font-semibold text-white transition disabled:opacity-40"
            aria-label="Invia il codice OTP via SMS"
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

        <Link
          href={tenantPath('/prenota')}
          className="mt-6 text-sm text-neutral-500 underline-offset-2 hover:underline"
        >
          Prenota senza accesso →
        </Link>
      </main>
    )
  }

  // ── Step: otp ───────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-[calc(100dvh-164px)] flex-col items-center bg-[#F7F7F7] px-5 pb-10 pt-10">
      <div className="w-full max-w-[440px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-neutral-950">Controlla i messaggi</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Codice inviato al{' '}
            <span className="font-semibold text-neutral-800">{maskPhone(phone)}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setOtp(EMPTY_OTP)
              setError(null)
            }}
            className="mt-2 text-sm font-bold text-[var(--brand-primary)]"
          >
            Cambia numero
          </button>
        </div>

        {/* OTP card */}
        <div className="rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <p className="mb-4 text-sm font-medium text-neutral-700">Inserisci il codice a 6 cifre</p>

          {/* 6-cell grid */}
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

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500">Non hai ricevuto il codice?</p>
          {countdown > 0 ? (
            <p className="mt-1.5 text-sm font-semibold text-neutral-600">
              Reinvia tra {countdown}s
            </p>
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
