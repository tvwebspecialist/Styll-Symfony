'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
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

function validate(
  fullName: string,
  businessName: string,
  email: string,
  password: string,
  password2: string,
  acceptedTerms: boolean,
): string[] {
  const errors: string[] = []

  if (fullName.trim().length < 2) errors.push('Inserisci il tuo nome completo')
  if (businessName.trim().length < 2) errors.push('Inserisci il nome della tua attività')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email non valida')
  if (password.length < 8) errors.push('La password deve avere almeno 8 caratteri')
  if (password !== password2) errors.push('Le password non corrispondono')
  if (!acceptedTerms) errors.push('Devi accettare i Termini di Servizio per continuare')

  return errors
}

export function RegisterForm({
  acceptedTerms: controlledAcceptedTerms,
  onAcceptedTermsChange,
}: {
  acceptedTerms?: boolean
  onAcceptedTermsChange?: (nextValue: boolean) => void
}) {
  const router = useRouter()
  const privacyHref = buildRootAppUrl('/privacy')
  const termsHref = buildRootAppUrl('/termini')
  const fullNameRef = useRef<HTMLInputElement>(null)
  const businessNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const password2Ref = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('barbiere')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [uncontrolledAcceptedTerms, setUncontrolledAcceptedTerms] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [isPending, startTransition] = useTransition()

  const acceptedTerms = controlledAcceptedTerms ?? uncontrolledAcceptedTerms
  const setAcceptedTerms = onAcceptedTermsChange ?? setUncontrolledAcceptedTerms

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const effectiveFullName = fullNameRef.current?.value || fullName
    const effectiveBusinessName = businessNameRef.current?.value || businessName
    const effectiveEmail = emailRef.current?.value || email
    const effectivePassword = passwordRef.current?.value || password
    const effectivePassword2 = password2Ref.current?.value || password2

    const errors = validate(
      effectiveFullName,
      effectiveBusinessName,
      effectiveEmail,
      effectivePassword,
      effectivePassword2,
      acceptedTerms,
    )

    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    startTransition(async () => {
      const cleanFullName = effectiveFullName.trim()
      const cleanBusinessName = effectiveBusinessName.trim()
      const cleanEmail = effectiveEmail.trim().toLowerCase()

      await savePlatformLead({ email: cleanEmail, source: 'trial_signup' }).catch(() => {})

      const response = await fetch('/api/auth/staff/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fullName: cleanFullName,
          businessName: cleanBusinessName,
          businessType,
          email: cleanEmail,
          password: effectivePassword,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        toast.error(payload?.error || 'Impossibile completare la registrazione.')
        return
      }

      identifyLead(cleanEmail, {
        full_name: cleanFullName,
        business_name: cleanBusinessName,
        business_type: businessType,
        source: 'trial_signup',
      })

      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="fullName" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Nome completo
        </span>
        <input
          id="fullName"
          autoComplete="name"
          required
          ref={fullNameRef}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Marco Rossi"
          disabled={isPending}
          className="styll-input w-full px-4 py-3 text-sm"
          style={{ fontSize: 16 }}
        />
      </label>

      <label htmlFor="businessName" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Nome attività
        </span>
        <input
          id="businessName"
          autoComplete="organization"
          required
          ref={businessNameRef}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Marco's Barbershop"
          disabled={isPending}
          className="styll-input w-full px-4 py-3 text-sm"
          style={{ fontSize: 16 }}
        />
      </label>

      <label htmlFor="businessType" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
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

      <label htmlFor="email" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Email
        </span>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          ref={emailRef}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@esempio.com"
          disabled={isPending}
          className="styll-input w-full px-4 py-3 text-sm"
          style={{ fontSize: 16 }}
        />
      </label>

      <label htmlFor="password" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Password
        </span>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            ref={passwordRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Almeno 8 caratteri"
            disabled={isPending}
            className="styll-input w-full px-4 py-3 pr-11 text-sm"
            style={{ fontSize: 16 }}
          />
          <button
            type="button"
            onClick={() => setShowPw((value) => !value)}
            aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
            disabled={isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 styll-hover-color-bg-secondary"
            style={{ color: 'var(--color-fg-secondary)', minWidth: 44, minHeight: 44 }}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label htmlFor="password2" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Conferma password
        </span>
        <input
          id="password2"
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          required
          ref={password2Ref}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="Ripeti la password"
          disabled={isPending}
          className="styll-input w-full px-4 py-3 text-sm"
          style={{ fontSize: 16 }}
        />
        {password2 && password !== password2 && (
          <span
            className="text-xs"
            style={{ color: 'var(--color-danger)' }}
          >
            Le password non corrispondono
          </span>
        )}
      </label>

      <label className="flex items-start gap-3 text-sm leading-6" style={{ color: 'var(--color-fg-muted)' }}>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          disabled={isPending}
          className="mt-1 h-4 w-4 rounded border"
          style={{ accentColor: 'var(--color-fg)' }}
        />
        <span>
          Accetto i{' '}
          <Link
            href={termsHref}
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--color-fg)' }}
          >
            Termini di Servizio
          </Link>{' '}
          e dichiaro di aver preso visione della{' '}
          <Link
            href={privacyHref}
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--color-fg)' }}
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'styll-btn-primary mt-2 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm'
        )}
        style={{ minHeight: 52 }}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creazione negozio...
          </>
        ) : (
          'Crea account e accedi'
        )}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border, #e5e7eb)' }} />
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-fg-secondary)' }}>
          oppure
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border, #e5e7eb)' }} />
      </div>

      <GoogleButton
        mode="staff_register"
        acceptedTerms={acceptedTerms}
        fullName={fullName}
        businessName={businessName}
        businessType={businessType}
        variant="secondary"
        loadingLabel="Reindirizzamento a Google..."
      />
    </form>
  )
}
