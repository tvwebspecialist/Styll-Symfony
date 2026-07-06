'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { verifyEmailOTP, resendEmailOTP } from '@/lib/actions/email-verification'
import { buildPathWithTrialIntent } from '@/lib/trial-intent'

interface Props {
  email: string
  intent?: string | null
}

export function VerifyEmailForm({ email, intent = null }: Props) {
  const router = useRouter()

  const ref0 = useRef<HTMLInputElement>(null)
  const ref1 = useRef<HTMLInputElement>(null)
  const ref2 = useRef<HTMLInputElement>(null)
  const ref3 = useRef<HTMLInputElement>(null)
  const ref4 = useRef<HTMLInputElement>(null)
  const ref5 = useRef<HTMLInputElement>(null)
  const inputRefs = [ref0, ref1, ref2, ref3, ref4, ref5]

  const [values, setValues] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [isResending, startResendTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ref0.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startCooldown(seconds = 60) {
    if (timerRef.current) clearInterval(timerRef.current)
    setCooldown(seconds)
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  function submitCode(code: string) {
    setError(null)
    startTransition(async () => {
      const result = await verifyEmailOTP(email, code)
      if (result.success) {
        router.push(buildPathWithTrialIntent('/onboarding/step-1', intent))
        router.refresh()
      } else {
        setError(result.error ?? 'Codice non valido.')
        setValues(['', '', '', '', '', ''])
        ref0.current?.focus()
      }
    })
  }

  function handleChange(index: number, raw: string) {
    const char = raw.replace(/\D/g, '').slice(-1)
    const next = [...values]
    next[index] = char
    setValues(next)

    if (char && index < 5) {
      inputRefs[index + 1].current?.focus()
    }

    if (char && index === 5) {
      const code = next.join('')
      if (code.length === 6) submitCode(code)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = Array(6).fill('') as string[]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setValues(next)
    const lastIdx = Math.min(pasted.length - 1, 5)
    inputRefs[lastIdx].current?.focus()
    if (pasted.length === 6) submitCode(pasted)
  }

  function handleResend() {
    setError(null)
    startResendTransition(async () => {
      const result = await resendEmailOTP(email)
      if (result.success) {
        startCooldown(60)
        setValues(['', '', '', '', '', ''])
        ref0.current?.focus()
      } else {
        setError(result.error ?? 'Errore durante il reinvio.')
      }
    })
  }

  const code = values.join('')
  const canSubmit = code.length === 6 && !isPending

  return (
    <div className="flex flex-col gap-6">
      {/* OTP input boxes */}
      <div className="flex justify-between gap-2">
        {values.map((val, i) => (
          <input
            key={i}
            ref={inputRefs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            disabled={isPending}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`Cifra ${i + 1} di 6`}
            className="styll-input flex-1 text-center font-bold"
            style={{
              aspectRatio: '1',
              fontSize: 22,
              padding: '0',
              minWidth: 0,
              letterSpacing: 0,
            }}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => submitCode(code)}
        className="styll-btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
        style={{ minHeight: 52 }}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifica in corso…
          </>
        ) : (
          'Verifica email'
        )}
      </button>

      <p className="text-center text-sm" style={{ color: 'var(--color-fg-secondary)' }}>
        Non hai ricevuto l&apos;email?{' '}
        {cooldown > 0 ? (
          <span style={{ color: 'var(--color-fg-muted)' }}>Riprova tra {cooldown}s</span>
        ) : (
          <button
            type="button"
            disabled={isResending}
            onClick={handleResend}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--color-fg)' }}
          >
            {isResending ? (
              <>
                <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                Invio…
              </>
            ) : (
              'Reinvia il codice'
            )}
          </button>
        )}
      </p>
    </div>
  )
}
