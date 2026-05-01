'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OnboardingShell, NavFooter } from '@/components/onboarding/onboarding-shell'
import { getMemberOnboardingContext } from '../actions'

interface Service {
  id: string
  name: string
  category?: string
}

export default function MemberStep2Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenant')

  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    async function loadServices() {
      if (!tenantId) return

      const result = await getMemberOnboardingContext(tenantId)
      if (result.success && result.services) {
        setServices(result.services)
      }
      setHydrated(true)
      setLoading(false)
    }
    loadServices()
  }, [tenantId])

  function toggleService(serviceId: string) {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  function handleNext() {
    if (!tenantId) return
    // Store selected services in sessionStorage
    const current = JSON.parse(sessionStorage.getItem('member_onboarding') || '{}')
    sessionStorage.setItem(
      'member_onboarding',
      JSON.stringify({ ...current, selectedServices })
    )
    router.push(`/onboarding/member/step-3?tenant=${tenantId}`)
  }

  if (!hydrated || !tenantId || !services) return null

  return (
    <OnboardingShell
      stepNumber={2}
      totalSteps={3}
      stepLabel="Servizi"
      title="Quali servizi offri?"
      subtitle="Seleziona i servizi che eroghi. Potrai cambiarli in seguito."
      footer={
        <NavFooter
          onNext={handleNext}
          backHref={`/onboarding/member/step-1?tenant=${tenantId}`}
        />
      }
    >
      <div className="flex flex-col gap-3">
        {services.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-fg-muted)',
              fontSize: '14px',
              padding: '20px',
            }}
          >
            Nessun servizio disponibile nel catalogo del tuo team.
          </p>
        ) : (
          services.map((service) => (
            <label
              key={service.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                backgroundColor: selectedServices.includes(service.id)
                  ? 'var(--color-bg-secondary)'
                  : 'transparent',
                transition: 'background-color 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={selectedServices.includes(service.id)}
                onChange={() => toggleService(service.id)}
                style={{ cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-fg)' }}>
                  {service.name}
                </div>
                {service.category && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-fg-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {service.category}
                  </div>
                )}
              </div>
            </label>
          ))
        )}
      </div>
    </OnboardingShell>
  )
}
