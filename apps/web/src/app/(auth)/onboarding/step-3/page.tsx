'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { NavFooter, OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { MenuIllustration } from '@/components/illustrations'
import {
  SERVICE_PRESETS,
  type ServicePresetKey,
  onboardingStorage,
  totalSteps,
  type OnboardingServiceItem,
} from '@/lib/onboarding-storage'
import { cn } from '@/lib/utils'
import type { WorkMode } from '@/types/database'

const TYPE_TABS: { key: ServicePresetKey; label: string }[] = [
  { key: 'barbiere', label: 'Barbiere' },
  { key: 'parrucchiere', label: 'Parrucchiere' },
  { key: 'salone_misto', label: 'Salone Misto' },
  { key: 'altro', label: 'Altro' },
]

function presetKeyForBusiness(value: string): ServicePresetKey {
  if (value === 'parrucchiere') return 'parrucchiere'
  if (value === 'salone_misto' || value === 'beauty_center') return 'salone_misto'
  if (value === 'barbiere') return 'barbiere'
  return 'altro'
}

export default function OnboardingStep3Page() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [workMode, setWorkMode] = useState<WorkMode>('solo')
  const [presetKey, setPresetKey] = useState<ServicePresetKey>('barbiere')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const s = onboardingStorage.read()
    if (!s.step1.name.trim()) {
      router.replace('/onboarding/step-1')
      return
    }
    const initialPreset = presetKeyForBusiness(s.step1.business_type || 'barbiere')
    const persistedIds = new Set(s.step3.services.map((x) => x.id))
    const ids = persistedIds.size > 0
      ? persistedIds
      : new Set(SERVICE_PRESETS[initialPreset].filter((x) => x.preselected).map((x) => x.id))
    /* eslint-disable react-hooks/set-state-in-effect */
    setWorkMode(s.step2.work_mode)
    setPresetKey(initialPreset)
    setSelectedIds(ids)
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router])

  const presets = useMemo(() => SERVICE_PRESETS[presetKey], [presetKey])

  function togglePresetTab(key: ServicePresetKey) {
    setPresetKey(key)
    setSelectedIds(new Set(SERVICE_PRESETS[key].filter((x) => x.preselected).map((x) => x.id)))
  }

  function toggleService(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleNext() {
    const services: OnboardingServiceItem[] = presets
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        duration_minutes: p.duration_minutes,
      }))
    onboardingStorage.set('step3', { services })
    router.push('/onboarding/step-4')
  }

  if (!hydrated) return null

  return (
    <OnboardingShell
      stepNumber={3}
      totalSteps={totalSteps(workMode)}
      stepLabel="I tuoi servizi"
      title="Quali servizi offri?"
      subtitle="Seleziona — prezzi e durate già inseriti. Modifica tutto dopo."
      illustration={<MenuIllustration />}
      footer={
        <NavFooter
          backHref="/onboarding/step-2"
          nextDisabled={selectedIds.size === 0}
          onNext={handleNext}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((t) => {
          const active = presetKey === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => togglePresetTab(t.key)}
              className={cn(
                'rounded-full border px-4 py-2 text-xs font-semibold transition-colors active:scale-[0.97]'
              )}
              style={{
                backgroundColor: active ? '#000000' : '#ffffff',
                color: active ? '#ffffff' : 'var(--color-fg)',
                borderColor: active ? '#000000' : 'var(--color-border)',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = selectedIds.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleService(p.id)}
              aria-pressed={active}
              className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors active:scale-[0.97]"
              style={{
                backgroundColor: active ? '#000000' : '#ffffff',
                color: active ? '#ffffff' : 'var(--color-fg)',
                borderColor: active ? '#000000' : 'var(--color-border)',
              }}
            >
              {active && <Check className="h-3 w-3" />}
              <span>{p.name}</span>
              <span style={{ opacity: 0.6 }}>
                €{p.price} · {p.duration_minutes}m
              </span>
            </button>
          )
        })}
      </div>

      <p
        className="mt-6 text-xs"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        Puoi aggiungere, rimuovere e modificare prezzi in qualsiasi momento.
      </p>
    </OnboardingShell>
  )
}
