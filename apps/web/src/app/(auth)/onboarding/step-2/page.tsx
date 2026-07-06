'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, User, Users } from 'lucide-react'

import { NavFooter, OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { ForkIllustration } from '@/components/illustrations'
import { onboardingStorage, totalSteps } from '@/lib/onboarding-storage'
import { buildPathWithTrialIntent, normalizeTrialIntent } from '@/lib/trial-intent'
import type { WorkMode } from '@/types/database'

export default function OnboardingStep2Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [workMode, setWorkMode] = useState<WorkMode>('solo')
  const [hydrated, setHydrated] = useState(false)
  const intent = normalizeTrialIntent(searchParams.get('intent'))

  useEffect(() => {
    const s = onboardingStorage.read()
    if (!s.step1.name.trim()) {
      router.replace(buildPathWithTrialIntent('/onboarding/step-1', intent))
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkMode(s.step2.work_mode)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
  }, [intent, router])

  function handleNext() {
    onboardingStorage.set('step2', { work_mode: workMode })
    router.push(buildPathWithTrialIntent('/onboarding/step-3', intent))
  }

  if (!hydrated) return null

  return (
    <OnboardingShell
      stepNumber={2}
      totalSteps={totalSteps(workMode)}
      stepLabel="Come lavori"
      title="Come lavori?"
      subtitle="Scegli il tuo setup — l'onboarding si adatta."
      illustration={<ForkIllustration />}
      footer={<NavFooter backHref={buildPathWithTrialIntent('/onboarding/step-1', intent)} onNext={handleNext} />}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ModeCard
          selected={workMode === 'solo'}
          onSelect={() => setWorkMode('solo')}
          icon={<User className="h-6 w-6" />}
          title="Lavoro da solo"
          description="Un barbiere, un calendario, massima semplicità."
        />
        <ModeCard
          selected={workMode === 'team'}
          onSelect={() => setWorkMode('team')}
          icon={<Users className="h-6 w-6" />}
          title="Ho un team"
          description="Più barbieri, più calendari, staff invitabile."
        />
      </div>
      <p
        className="mt-4 text-xs"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        Puoi cambiare in seguito dalle impostazioni.
      </p>
    </OnboardingShell>
  )
}

function ModeCard({
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="relative flex flex-col gap-3 rounded-[12px] border p-6 text-left transition-all active:scale-[0.97] hover:border-black"
      style={{
        backgroundColor: selected ? '#000000' : '#ffffff',
        color: selected ? '#ffffff' : 'var(--color-fg)',
        borderColor: selected ? '#000000' : 'var(--color-border)',
      }}
    >
      {selected && (
        <span
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: '#ffffff', color: '#000000' }}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      <span style={{ color: selected ? '#ffffff' : 'var(--color-fg)' }}>{icon}</span>
      <span className="text-base font-bold">{title}</span>
      <span
        className="text-sm leading-relaxed"
        style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'var(--color-fg-secondary)' }}
      >
        {description}
      </span>
    </button>
  )
}
