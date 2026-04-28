'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { NavFooter, OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { CalendarIllustration } from '@/components/illustrations'
import {
  DAY_LABELS,
  DEFAULT_HOURS,
  onboardingStorage,
  totalSteps,
} from '@/lib/onboarding-storage'
import { finalizeOnboarding } from '@/app/(auth)/onboarding/actions'
import type { OpeningHourRow, WorkMode } from '@/types/database'

export default function OnboardingStep4Page() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [workMode, setWorkMode] = useState<WorkMode>('solo')
  const [hours, setHours] = useState<OpeningHourRow[]>(DEFAULT_HOURS)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const s = onboardingStorage.read()
    if (!s.step1.name.trim() || s.step3.services.length === 0) {
      router.replace(s.step1.name.trim() ? '/onboarding/step-3' : '/onboarding/step-1')
      return
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setWorkMode(s.step2.work_mode)
    setHours(s.step4.hours.length === 7 ? s.step4.hours : DEFAULT_HOURS)
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router])

  function updateRow(idx: number, patch: Partial<OpeningHourRow>) {
    setHours((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function handleNext() {
    onboardingStorage.set('step4', { hours })
    if (workMode === 'team') {
      router.push('/onboarding/staff')
      return
    }
    startTransition(async () => {
      const state = onboardingStorage.read()
      const res = await finalizeOnboarding({
        step1: state.step1,
        step2: state.step2,
        step3: { services: state.step3.services.map(({ name, price, duration_minutes }) => ({ name, price, duration_minutes })) },
        step4: state.step4,
        staff: state.staff,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Impossibile completare. Riprova.')
        return
      }
      onboardingStorage.clear()
      router.push('/onboarding/complete')
      router.refresh()
    })
  }

  if (!hydrated) return null

  return (
    <OnboardingShell
      stepNumber={4}
      totalSteps={totalSteps(workMode)}
      stepLabel="Orari"
      title="Quando sei aperto?"
      subtitle="Template Lun–Sab 9:00–19:00 già impostato. Modifica solo quello che cambia."
      illustration={<CalendarIllustration />}
      footer={
        <NavFooter
          backHref="/onboarding/step-3"
          onNext={handleNext}
          nextLabel={workMode === 'team' ? 'Avanti →' : 'Vai alla dashboard →'}
          nextLoading={isPending}
        />
      }
    >
      <div className="flex flex-col gap-2">
        {hours.map((row, idx) => (
          <div
            key={row.day_of_week}
            className="flex items-center gap-3 rounded-[12px] border px-4 py-3 transition-colors"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: row.is_open ? '#ffffff' : 'var(--color-bg-secondary)',
            }}
          >
            <span
              className="w-24 text-sm font-medium"
              style={{ color: row.is_open ? 'var(--color-fg)' : 'var(--color-fg-muted)' }}
            >
              {DAY_LABELS[row.day_of_week]}
            </span>

            <button
              type="button"
              onClick={() => updateRow(idx, { is_open: !row.is_open })}
              aria-pressed={row.is_open}
              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: row.is_open ? '#000000' : 'var(--color-bg-tertiary)',
                color: row.is_open ? '#ffffff' : 'var(--color-fg-muted)',
              }}
            >
              {row.is_open ? 'Aperto' : 'Chiuso'}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <input
                type="time"
                disabled={!row.is_open}
                value={row.open_time}
                onChange={(e) => updateRow(idx, { open_time: e.target.value })}
                className="styll-input px-3 py-2 text-sm disabled:opacity-50"
                style={{ width: 110 }}
              />
              <span style={{ color: 'var(--color-fg-muted)' }}>–</span>
              <input
                type="time"
                disabled={!row.is_open}
                value={row.close_time}
                onChange={(e) => updateRow(idx, { close_time: e.target.value })}
                className="styll-input px-3 py-2 text-sm disabled:opacity-50"
                style={{ width: 110 }}
              />
            </div>
          </div>
        ))}
      </div>
      <p
        className="mt-4 text-xs"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        Pause pranzo, ferie e orari speciali si gestiscono dal Calendario.
      </p>
    </OnboardingShell>
  )
}
