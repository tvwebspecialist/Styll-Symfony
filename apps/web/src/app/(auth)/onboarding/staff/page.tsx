'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { NavFooter, OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { TeamIllustration } from '@/components/illustrations'
import { onboardingStorage, totalSteps } from '@/lib/onboarding-storage'
import { finalizeOnboarding } from '@/app/(auth)/onboarding/actions'
import { buildPathWithTrialIntent, normalizeTrialIntent } from '@/lib/trial-intent'
import type { StaffRole } from '@/types/database'

interface Member {
  name: string
  email: string
  role: StaffRole
}

const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'staff', label: 'Barbiere' },
  { value: 'manager', label: 'Manager' },
  { value: 'receptionist', label: 'Receptionist' },
]

const EMPTY_MEMBER: Member = { name: '', email: '', role: 'staff' }

export default function OnboardingStaffPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hydrated, setHydrated] = useState(false)
  const [members, setMembers] = useState<Member[]>([EMPTY_MEMBER])
  const [isPending, startTransition] = useTransition()
  const intent = normalizeTrialIntent(searchParams.get('intent'))

  useEffect(() => {
    const s = onboardingStorage.read()
    if (s.step2.work_mode !== 'team') {
      router.replace(buildPathWithTrialIntent('/onboarding/step-2', intent))
      return
    }
    if (!s.step1.name.trim() || s.step3.services.length === 0) {
      router.replace(buildPathWithTrialIntent('/onboarding/step-1', intent))
      return
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setMembers(s.staff.members.length > 0 ? s.staff.members : [EMPTY_MEMBER])
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [intent, router])

  function update(idx: number, patch: Partial<Member>) {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))
  }
  function add() {
    if (members.length >= 10) return
    setMembers((prev) => [...prev, EMPTY_MEMBER])
  }
  function remove(idx: number) {
    setMembers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  function finalize(filtered: Member[]) {
    onboardingStorage.set('staff', { members: filtered })
    startTransition(async () => {
      const state = onboardingStorage.read()
      const res = await finalizeOnboarding({
        step1: state.step1,
        step2: state.step2,
        step3: {
          services: state.step3.services.map(({ name, price, duration_minutes }) => ({
            name,
            price,
            duration_minutes,
          })),
        },
        step4: state.step4,
        staff: state.staff,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Impossibile completare. Riprova.')
        return
      }
      onboardingStorage.clear()
      window.location.href = buildPathWithTrialIntent('/onboarding/complete', intent)
    })
  }

  function handleNext() {
    const valid = members.filter((m) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim())
    )
    finalize(valid)
  }

  function handleSkip() {
    finalize([])
  }

  if (!hydrated) return null

  return (
    <OnboardingShell
      stepNumber={5}
      totalSteps={totalSteps('team')}
      stepLabel="Staff"
      title="Chi lavora con te?"
      subtitle="Invita i tuoi collaboratori. Riceveranno un'email per accedere."
      illustration={<TeamIllustration />}
      footer={
        <NavFooter
          backHref={buildPathWithTrialIntent('/onboarding/step-4', intent)}
          onNext={handleNext}
          nextLabel="Vai alla dashboard →"
          nextLoading={isPending}
        />
      }
    >
      <div className="flex flex-col">
        {members.map((m, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center sm:gap-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <input
              value={m.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              placeholder="Nome"
              autoComplete="name"
              autoCapitalize="words"
              className="styll-input flex-1 px-3 py-3 text-base"
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              value={m.email}
              onChange={(e) => update(idx, { email: e.target.value })}
              placeholder="email@esempio.com"
              className="styll-input flex-[1.4] px-3 py-3 text-base"
            />
            <select
              value={m.role}
              onChange={(e) => update(idx, { role: e.target.value as StaffRole })}
              className="styll-input px-3 py-3 text-base"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(idx)}
              disabled={members.length === 1}
              aria-label="Rimuovi membro"
              className="rounded-md p-2 transition-colors styll-hover-color-bg-secondary disabled:opacity-30"
              style={{ color: 'var(--color-fg-secondary)' }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={members.length >= 10}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed py-3 text-sm font-medium transition-colors styll-hover-color-bg-secondary disabled:opacity-50"
        style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-fg)' }}
      >
        <Plus className="h-4 w-4" /> Aggiungi membro
      </button>

      <p
        className="mt-4 text-xs"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        Puoi saltare e invitare lo staff in seguito dal pannello Team.
      </p>

      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Salta per ora
        </button>
      </div>
    </OnboardingShell>
  )
}
