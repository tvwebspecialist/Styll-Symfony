'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { OnboardingShell, NavFooter } from '@/components/onboarding/onboarding-shell'

export default function MemberStep1Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenant')

  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    async function validateAndLoad() {
      if (!tenantId) {
        router.push('/dashboard')
        return
      }

      // Validate user is staff in this tenant
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const db = createAdminClient()
      const { data: staffMember } = await db
        .from('staff_members')
        .select('id, is_active')
        .eq('tenant_id', tenantId)
        .eq('profile_id', user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!staffMember || !staffMember.is_active) {
        router.push('/dashboard')
        return
      }

      setUser(user)
      setFullName(user?.user_metadata?.full_name || '')
      setHydrated(true)
      setLoading(false)
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
