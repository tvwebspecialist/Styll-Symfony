'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OnboardingShell, NavFooter } from '@/components/onboarding/onboarding-shell'
import { getMemberStep1Context } from '../actions'

export default function MemberStep1Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenant')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    async function validateAndLoad() {
      if (!tenantId) {
        router.push('/dashboard')
        return
      }

      const result = await getMemberStep1Context(tenantId)
      if (!result.success) {
        router.push(result.redirectTo || '/dashboard')
        return
      }

      setFullName(result.fullName || '')
      setHydrated(true)
    }
    validateAndLoad()
  }, [tenantId, router])

  const isValid = fullName.trim().length >= 2

  function handleNext() {
    if (!isValid || !tenantId) return
    // Store data in sessionStorage
    sessionStorage.setItem(
      'member_onboarding',
      JSON.stringify({ fullName, phone })
    )
    router.push(`/onboarding/member/step-2?tenant=${tenantId}`)
  }

  if (!hydrated || !tenantId) return null

  return (
    <OnboardingShell
      stepNumber={1}
      totalSteps={3}
      stepLabel="Informazioni personali"
      title="Come ti chiami?"
      subtitle="Completa il tuo profilo per iniziare"
      footer={
        <NavFooter
          nextDisabled={!isValid}
          onNext={handleNext}
          backHref={undefined}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="fullName"
            className="mb-1.5 block text-xs font-semibold"
            style={{ color: 'var(--color-fg)' }}
          >
            Nome completo <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="es. Mario Rossi"
            className="styll-input w-full px-4 py-3.5 text-base"
            autoComplete="name"
            autoCapitalize="words"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-xs font-semibold"
            style={{ color: 'var(--color-fg)' }}
          >
            Telefono
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 ..."
            className="styll-input w-full px-4 py-3.5 text-base"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
      </div>
    </OnboardingShell>
  )
}
