'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

import { NavFooter, OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { ShopSignIllustration } from '@/components/illustrations'
import { onboardingStorage, type OnboardingState } from '@/lib/onboarding-storage'
import { buildPathWithTrialIntent, normalizeTrialIntent } from '@/lib/trial-intent'
import type { BusinessType } from '@/types/database'

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'barbiere', label: 'Barbiere' },
  { value: 'parrucchiere', label: 'Parrucchiere' },
  { value: 'salone_misto', label: 'Salone Misto' },
  { value: 'beauty_center', label: 'Beauty Center' },
  { value: 'altro', label: 'Altro' },
]

export default function OnboardingStep1Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<OnboardingState['step1']>({
    name: '',
    business_type: '',
    phone: '',
    address: '',
    city: '',
  })
  const [hydrated, setHydrated] = useState(false)
  const [showGmb, setShowGmb] = useState(false)
  const intent = normalizeTrialIntent(searchParams.get('intent'))

  useEffect(() => {
    const persisted = onboardingStorage.read().step1
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(persisted)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
  }, [])

  const isValid =
    state.name.trim().length >= 2 &&
    state.address.trim().length >= 2 &&
    state.city.trim().length >= 2

  function handleChange<K extends keyof OnboardingState['step1']>(
    key: K,
    value: OnboardingState['step1'][K]
  ) {
    setState((s) => ({ ...s, [key]: value }))
  }

  function handleNext() {
    if (!isValid) return
    onboardingStorage.set('step1', state)
    router.push(buildPathWithTrialIntent('/onboarding/step-2', intent))
  }

  if (!hydrated) return null

  return (
    <OnboardingShell
      stepNumber={1}
      totalSteps={5}
      stepLabel="Il tuo negozio"
      title="Come si chiama il tuo negozio?"
      subtitle="Puoi importare tutto da Google in un click."
      illustration={<ShopSignIllustration />}
      footer={
        <NavFooter
          nextDisabled={!isValid}
          onNext={handleNext}
          backHref={undefined}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => setShowGmb(true)}
          className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-dashed bg-white px-4 py-3.5 text-sm font-medium transition-colors active:scale-[0.97] hover:bg-[color:var(--color-bg-secondary)]"
          style={{ borderColor: 'var(--color-fg-muted)', color: 'var(--color-fg)' }}
        >
          <GoogleIcon className="h-4 w-4" />
          Importa da Google Business Profile
        </button>

        <Field
          id="name"
          label="Nome attività"
          required
          value={state.name}
          onChange={(v) => handleChange('name', v)}
          placeholder="es. Marco's Barbershop"
          autoComplete="organization"
          autoCapitalize="words"
        />

        <div>
          <label
            htmlFor="business_type"
            className="mb-1.5 block text-xs font-semibold"
            style={{ color: 'var(--color-fg)' }}
          >
            Tipo di attività
          </label>
          <select
            id="business_type"
            value={state.business_type}
            onChange={(e) => handleChange('business_type', e.target.value as BusinessType)}
            className="styll-input w-full px-4 py-3 text-sm"
          >
            <option value="">Seleziona…</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="city"
            label="Città"
            required
            value={state.city}
            onChange={(v) => handleChange('city', v)}
            placeholder="Milano"
            autoComplete="address-level2"
            autoCapitalize="words"
          />
          <Field
            id="phone"
            label="Telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={state.phone}
            onChange={(v) => handleChange('phone', v)}
            placeholder="+39 ..."
          />
        </div>

        <Field
          id="address"
          label="Indirizzo"
          required
          value={state.address}
          onChange={(v) => handleChange('address', v)}
          placeholder="Via Roma 12"
          autoComplete="street-address"
          autoCapitalize="words"
        />
      </div>

      {showGmb && <GmbModal onClose={() => setShowGmb(false)} />}
    </OnboardingShell>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
  autoCapitalize,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
  autoCapitalize?: string
  required?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold"
        style={{ color: 'var(--color-fg)' }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: 'var(--color-danger)' }}>
            *
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        className="styll-input w-full px-4 py-3.5 text-base"
      />
    </div>
  )
}

function GmbModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="styll-card w-full max-w-md p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--color-fg)' }}
          >
            Importa da Google
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-md p-1 hover:bg-[color:var(--color-bg-secondary)]"
            style={{ color: 'var(--color-fg-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Per importare nome, indirizzo, orari e foto dal tuo profilo Google
          Business, ti chiederemo di accedere con Google. Useremo solo i dati
          della tua attività — niente altro.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-3 rounded-[12px] bg-black px-4 py-3 text-sm font-semibold text-white opacity-60"
          >
            <GoogleIcon className="h-4 w-4" /> Continua con Google (presto)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--color-fg-secondary)' }}
          >
            Compila manualmente
          </button>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.55C16.83 3.4 14.66 2.4 12 2.4 6.92 2.4 2.8 6.52 2.8 11.6S6.92 20.8 12 20.8c6.93 0 9.2-4.86 9.2-7.36 0-.5-.05-.86-.12-1.24H12z"
      />
      <path
        fill="#4285F4"
        d="M21.08 12.2c0-.5-.05-.86-.12-1.24H12v3.94h5.5c-.22 1.27-1.5 3.74-5.5 3.74v.06l3.6 2.79c2.31-2.13 3.48-5.27 3.48-9.29z"
      />
      <path fill="#FBBC05" d="M5.83 13.94a6.13 6.13 0 0 1 0-3.88L2.2 7.27a9.6 9.6 0 0 0 0 9.46l3.63-2.79z" />
      <path
        fill="#34A853"
        d="M12 20.8c2.66 0 4.83-.88 6.44-2.4l-3.6-2.79c-.96.66-2.25 1.13-2.84 1.13-3.84 0-5.26-2.7-5.5-4.1l-3.63 2.79C4.41 18.49 7.86 20.8 12 20.8z"
      />
    </svg>
  )
}
