'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { identifyLead } from '@/components/marketing/PostHogProvider'
import { GoogleButton } from '@/components/auth/google-button'
import { savePlatformLead } from '@/lib/actions/platform-leads'
import { buildRootAppUrl } from '@/lib/auth/urls'
import { cn } from '@/lib/utils'
import type { BusinessType } from '@/types/database'

const BUSINESS_TYPES: Array<{ value: BusinessType; label: string }> = [
  { value: 'barbiere', label: 'Barbiere' },
  { value: 'parrucchiere', label: 'Parrucchiere' },
  { value: 'salone_misto', label: 'Salone misto' },
  { value: 'beauty_center', label: 'Beauty center' },
  { value: 'altro', label: 'Altro' },
]

type RegisterStep = 'identity' | 'activity'
type RegisterMethod = 'credentials' | 'google'

function validateIdentity(
  fullName: string,
  email: string,
  password: string,
  password2: string,
): string[] {
  const errors: string[] = []

  if (fullName.trim().length < 2) errors.push('Inserisci il tuo nome completo')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email non valida')
  if (password.length < 8) errors.push('La password deve avere almeno 8 caratteri')
  if (password !== password2) errors.push('Le password non corrispondono')

  return errors
}

function validateActivity(
  businessName: string,
  acceptedTerms: boolean,
): string[] {
  const errors: string[] = []

  if (businessName.trim().length < 2) errors.push('Inserisci il nome della tua attività')
  if (!acceptedTerms) errors.push('Devi accettare i Termini di Servizio per continuare')

  return errors
}

interface RegisterFormProps {
  initialStep?: RegisterStep
  initialMethod?: RegisterMethod
  initialFullName?: string
  initialEmail?: string
}

export function RegisterForm({
  initialStep = 'identity',
  initialMethod = 'credentials',
  initialFullName = '',
  initialEmail = '',
}: RegisterFormProps) {
  const router = useRouter()
  const privacyHref = buildRootAppUrl('/privacy')
  const termsHref = buildRootAppUrl('/termini')
  const [step, setStep] = useState<RegisterStep>(initialStep)
  const [method, setMethod] = useState<RegisterMethod>(initialMethod)
  const [fullName, setFullName] = useState(initialFullName)
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('barbiere')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isIdentityStep = step === 'identity'
  const isGoogleFlow = method === 'google'

  function handleIdentitySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const errors = validateIdentity(fullName, email, password, password2)
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    setMethod('credentials')
    setStep('activity')
  }

  function handleBackToIdentity() {
    if (isPending) {
      return
    }

    if (isGoogleFlow) {
      router.push('/register')
      router.refresh()
      return
    }

    setStep('identity')
  }

  function handleActivitySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const errors = validateActivity(businessName, acceptedTerms)
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    startTransition(async () => {
      const cleanFullName = fullName.trim()
      const cleanEmail = email.trim().toLowerCase()
      const cleanBusinessName = businessName.trim()
      const endpoint = isGoogleFlow
        ? '/api/auth/google/staff/register/finalize'
        : '/api/auth/staff/register'
      const requestBody = isGoogleFlow
        ? {
            businessName: cleanBusinessName,
            businessType,
            acceptedTerms,
          }
        : {
            fullName: cleanFullName,
            email: cleanEmail,
            password,
            businessName: cleanBusinessName,
            businessType,
            acceptedTerms,
          }

      if (cleanEmail) {
        await savePlatformLead({ email: cleanEmail, source: 'trial_signup' }).catch(() => {})
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        toast.error(payload?.error || 'Impossibile completare la registrazione.')
        return
      }

      if (cleanEmail) {
        identifyLead(cleanEmail, {
          full_name: cleanFullName || undefined,
          business_name: cleanBusinessName,
          business_type: businessType,
          registration_method: isGoogleFlow ? 'google' : 'credentials',
          source: 'trial_signup',
        })
      }

      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'identity', index: '1', title: 'Identità' },
          { key: 'activity', index: '2', title: 'Attività' },
        ].map((item) => {
          const isActive = step === item.key

          return (
            <div
              key={item.key}
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: isActive ? 'var(--color-fg)' : 'var(--color-border)',
                backgroundColor: isActive ? 'rgba(13,13,26,0.04)' : 'transparent',
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'var(--color-fg-secondary)' }}
              >
                Step {item.index}
              </div>
              <div
                className="mt-1 text-sm font-semibold"
                style={{ color: 'var(--color-fg)' }}
              >
                {item.title}
              </div>
            </div>
          )
        })}
      </div>

      {isIdentityStep ? (
        <form onSubmit={handleIdentitySubmit} className="flex flex-col gap-4">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--color-fg)' }}
            >
              Crea le tue credenziali
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-fg-secondary)' }}
            >
              Inserisci i dati di accesso oppure continua direttamente con Google.
            </p>
          </div>

          <label htmlFor="fullName" className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-fg)' }}>
              Nome completo
            </span>
            <input
              id="fullName"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Marco Rossi"
              disabled={isPending}
              className="styll-input w-full px-4 py-3 text-sm"
              style={{ fontSize: 16 }}
            />
          </label>

          <label htmlFor="email" className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-fg)' }}>
              Email
            </span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@esempio.com"
              disabled={isPending}
              className="styll-input w-full px-4 py-3 text-sm"
              style={{ fontSize: 16 }}
            />
          </label>

          <label htmlFor="password" className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-fg)' }}>
              Password
            </span>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 8 caratteri"
                disabled={isPending}
                className="styll-input w-full px-4 py-3 pr-11 text-sm"
                style={{ fontSize: 16 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
                className="absolute inset-y-0 right-0 px-3"
                disabled={isPending}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label htmlFor="password2" className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-fg)' }}>
              Conferma password
            </span>
            <input
              id="password2"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Ripeti la password"
              disabled={isPending}
              className="styll-input w-full px-4 py-3 text-sm"
              style={{ fontSize: 16 }}
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'styll-btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm',
            )}
            style={{ fontWeight: 600 }}
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            <span>Continua</span>
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-xs font-medium"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg-secondary)' }}
              >
                Oppure
              </span>
            </div>
          </div>

          <GoogleButton
            mode="staff_register"
            label="Continua con Google"
            loadingLabel="Reindirizzamento a Google..."
            fullName={fullName}
            className="w-full"
          />
        </form>
      ) : (
        <form onSubmit={handleActivitySubmit} className="flex flex-col gap-4">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--color-fg)' }}
            >
              Completa la tua attività
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-fg-secondary)' }}
            >
              {isGoogleFlow
                ? 'Google ha già fornito i tuoi dati personali. Qui ci serve solo il contesto del negozio.'
                : 'Ultimo step: definiamo il negozio che verrà creato in dashboard.'}
            </p>
          </div>

          <div
            className="rounded-2xl border px-4 py-3"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'rgba(13,13,26,0.03)',
            }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-fg-secondary)' }}
            >
              Metodo scelto
            </div>
            <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
              {isGoogleFlow ? 'Continua con Google' : 'Email e password'}
            </div>
            {fullName ? (
              <div className="mt-2 text-sm" style={{ color: 'var(--color-fg-secondary)' }}>
                {fullName}
              </div>
            ) : null}
            {email ? (
              <div className="text-sm" style={{ color: 'var(--color-fg-secondary)' }}>
                {email}
              </div>
            ) : null}
          </div>

          <label htmlFor="businessName" className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-fg)' }}>
              Nome attività
            </span>
            <input
              id="businessName"
              autoComplete="organization"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Marco's Barbershop"
              disabled={isPending}
              className="styll-input w-full px-4 py-3 text-sm"
              style={{ fontSize: 16 }}
            />
          </label>

          <label htmlFor="businessType" className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-fg)' }}>
              Tipo di attività
            </span>
            <select
              id="businessType"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              disabled={isPending}
              className="styll-input w-full px-4 py-3 text-sm"
              style={{ fontSize: 16 }}
            >
              {BUSINESS_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300"
            />
            <span
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-fg-secondary)' }}
            >
              Accetto i{' '}
              <Link href={termsHref} target="_blank" rel="noreferrer" className="font-semibold underline">
                Termini di Servizio
              </Link>{' '}
              e dichiaro di aver preso visione della{' '}
              <Link href={privacyHref} target="_blank" rel="noreferrer" className="font-semibold underline">
                Privacy Policy
              </Link>
              . Le condizioni economiche applicabili ti vengono mostrate prima dell&apos;attivazione.
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleBackToIdentity}
              disabled={isPending}
              className="styll-btn-secondary w-full px-4 py-3 text-sm sm:w-auto"
              style={{ fontWeight: 600 }}
            >
              Indietro
            </button>

            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'styll-btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm',
              )}
              style={{ fontWeight: 600 }}
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              <span>Crea il mio negozio</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
