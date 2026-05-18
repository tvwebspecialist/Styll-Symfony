'use client'

import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, updateClientProfile, verifyOtp } from '@/lib/actions/pwa-auth'

interface OtpFlowProps {
  tenantId: string
  businessName: string
  logoUrl?: string | null
  primaryColor?: string | null
  basePath: string
  redirectTo?: string
}

const EMPTY_OTP = ['', '', '', '', '', '']

function getInitials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ST'
  )
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function OtpFlow({
  tenantId,
  businessName,
  logoUrl,
  primaryColor,
  basePath,
  redirectTo,
}: OtpFlowProps) {
  const router = useRouter()
  const brandColor = primaryColor ?? 'var(--brand-primary)'
  const [step, setStep] = useState<'phone' | 'otp' | 'welcome'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [newClientName, setNewClientName] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (step !== 'otp') {
      return
    }

    const timer = window.setTimeout(() => {
      otpRefs.current[0]?.focus()
    }, 100)

    return () => window.clearTimeout(timer)
  }, [step])

  async function handleSendOtp() {
    if (loading || phone.length < 9) {
      return
    }

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
    if (loading || code.length !== 6) {
      return
    }

    setLoading(true)
    setError(null)

    const result = await verifyOtp(`+39${phone}`, code, tenantId)
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Qualcosa è andato storto. Riprova.')
      return
    }

    if (result.isNewClient) {
      setStep('welcome')
      return
    }

    router.push(redirectTo ?? basePath)
    router.refresh()
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const nextOtp = [...otp]
    nextOtp[index] = digit
    setOtp(nextOtp)
    setError(null)

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    if (nextOtp.every(Boolean)) {
      void handleVerifyOtp(nextOtp.join(''))
    }
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')

    if (digits.length === 0) {
      return
    }

    const nextOtp = [...EMPTY_OTP]
    digits.forEach((digit, index) => {
      nextOtp[index] = digit
    })

    setOtp(nextOtp)
    setError(null)

    if (digits.length === 6) {
      void handleVerifyOtp(digits.join(''))
      return
    }

    otpRefs.current[digits.length]?.focus()
  }

  async function handleWelcomeSave() {
    if (loading) {
      return
    }

    setLoading(true)
    setError(null)

    if (newClientName.trim()) {
      const result = await updateClientProfile(tenantId, { fullName: newClientName.trim() })

      if (!result.success) {
        setLoading(false)
        setError(result.error ?? 'Qualcosa è andato storto. Riprova.')
        return
      }
    }

    setLoading(false)
    router.push(basePath)
    router.refresh()
  }

  return (
    <div style={{ width: '100%' }}>
      {step === 'phone' ? (
        <div
          style={{
            padding: '32px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              style={{ width: 56, height: 56, borderRadius: 999, objectFit: 'cover', marginBottom: 18 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: brandColor,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 18,
              }}
            >
              {getInitials(businessName)}
            </div>
          )}

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222222', lineHeight: 1.2 }}>
            <span style={{ display: 'block' }}>Accedi per scoprire</span>
            <span style={{ display: 'block' }}>i tuoi punti e premi</span>
          </h1>
          <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 10, maxWidth: 320 }}>
            📱 Usiamo il tuo numero di telefono — niente password da ricordare.
          </p>

          <div style={{ width: '100%', maxWidth: 360, marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#FFFFFF',
                border: `1.5px solid ${error ? '#FF3B30' : '#E0E0E0'}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  minWidth: 86,
                  padding: '0 14px',
                  height: 54,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid #EAEAEA',
                  color: '#222222',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                🇮🇹 +39
              </div>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="3471234567"
                value={phone}
                maxLength={10}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
                  setError(null)
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  height: 54,
                  padding: '0 16px',
                  fontSize: 16,
                  color: '#222222',
                  background: 'transparent',
                }}
              />
            </div>
            {error ? (
              <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 8, textAlign: 'left' }}>{error}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={phone.length < 9 || loading}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 100,
                border: 'none',
                marginTop: 18,
                background: phone.length < 9 || loading ? '#E0E0E0' : brandColor,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                cursor: phone.length < 9 || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Invio in corso...' : 'Ricevi il codice SMS'}
            </button>
          </div>

          <p style={{ fontSize: 11, color: '#CCCCCC', marginTop: 18 }}>
            Continuando accetti i Termini di servizio
          </p>
        </div>
      ) : null}

      {step === 'otp' ? (
        <div style={{ padding: '32px 20px' }}>
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setOtp(EMPTY_OTP)
              setError(null)
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: brandColor,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Cambia numero
          </button>

          <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 18 }}>Codice inviato a</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#222222', marginTop: 4 }}>+39 {phone}</p>

          <div
            onPaste={handleOtpPaste}
            style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'space-between' }}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  otpRefs.current[index] = element
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                onChange={(event) => handleOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                style={{
                  width: 44,
                  height: 52,
                  borderRadius: 12,
                  border: `1.5px solid ${digit ? brandColor : '#E0E0E0'}`,
                  outline: 'none',
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#222222',
                  background: '#FFFFFF',
                }}
              />
            ))}
          </div>

          {error ? <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 12 }}>{error}</p> : null}

          <button
            type="button"
            onClick={() => void handleVerifyOtp(otp.join(''))}
            disabled={otp.some((digit) => !digit) || loading}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 100,
              border: 'none',
              marginTop: 18,
              background: otp.some((digit) => !digit) || loading ? '#E0E0E0' : brandColor,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              cursor: otp.some((digit) => !digit) || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifica in corso...' : 'Verifica'}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#B0B0B0' }}>Non hai ricevuto il codice?</p>
            {countdown > 0 ? (
              <p style={{ fontSize: 13, color: '#222222', fontWeight: 600, marginTop: 6 }}>
                {formatCountdown(countdown)}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void handleSendOtp()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: brandColor,
                  fontSize: 13,
                  fontWeight: 700,
                  marginTop: 6,
                  cursor: 'pointer',
                }}
              >
                Invia di nuovo
              </button>
            )}
          </div>
        </div>
      ) : null}

      {step === 'welcome' ? (
        <div
          style={{
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 52, lineHeight: 1 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#222222', marginTop: 14 }}>
            Benvenuto da <span style={{ color: brandColor }}>{businessName}</span>!
          </h2>
          <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 10, maxWidth: 320 }}>
            Il tuo profilo è pronto: da ora puoi accumulare punti e scoprire i premi pensati per te.
          </p>

          <div style={{ width: '100%', maxWidth: 360, marginTop: 24, textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#222222', marginBottom: 8 }}>
              Come ti chiami?
            </label>
            <input
              type="text"
              value={newClientName}
              onChange={(event) => {
                setNewClientName(event.target.value)
                setError(null)
              }}
              placeholder="Il tuo nome"
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                border: `1.5px solid ${error ? '#FF3B30' : '#E0E0E0'}`,
                padding: '0 16px',
                outline: 'none',
                fontSize: 15,
                color: '#222222',
                background: '#FFFFFF',
              }}
            />
            {error ? <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 8 }}>{error}</p> : null}

            <button
              type="button"
              onClick={() => void handleWelcomeSave()}
              disabled={loading}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 100,
                border: 'none',
                marginTop: 18,
                background: loading ? '#E0E0E0' : brandColor,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Salvataggio...' : 'Inizia!'}
            </button>

            <button
              type="button"
              onClick={() => {
                router.push(basePath)
                router.refresh()
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#B0B0B0',
                fontSize: 13,
                fontWeight: 600,
                marginTop: 14,
                cursor: 'pointer',
              }}
            >
              Salta →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
