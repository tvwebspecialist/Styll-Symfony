'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OnboardingShell, NavFooter } from '@/components/onboarding/onboarding-shell'

interface WorkingHour {
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
}

const DAY_LABELS: Record<number, string> = {
  0: 'Lunedì',
  1: 'Martedì',
  2: 'Mercoledì',
  3: 'Giovedì',
  4: 'Venerdì',
  5: 'Sabato',
  6: 'Domenica',
}

const DEFAULT_HOURS: WorkingHour[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  day_of_week: d,
  is_open: d !== 6,
  open_time: '09:00',
  close_time: '19:00',
}))

export default function MemberStep3Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenant')

  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  function toggleDay(day: number) {
    setWorkingHours((prev) =>
      prev.map((h) =>
        h.day_of_week === day ? { ...h, is_open: !h.is_open } : h
      )
    )
  }

  function updateTime(day: number, field: 'open_time' | 'close_time', value: string) {
    setWorkingHours((prev) =>
      prev.map((h) =>
        h.day_of_week === day ? { ...h, [field]: value } : h
      )
    )
  }

  async function handleNext() {
    if (!tenantId) return
    setLoading(true)

    try {
      // Get data from sessionStorage
      const memberData = JSON.parse(
        sessionStorage.getItem('member_onboarding') || '{}'
      )

      // Import action
      const { completeMemberOnboarding } = await import('../actions')

      const result = await completeMemberOnboarding(tenantId, {
        fullName: memberData.fullName || '',
        phone: memberData.phone,
        services: memberData.selectedServices || [],
        workingHours,
      })

      if (result.success) {
        // Clear session storage
        sessionStorage.removeItem('member_onboarding')
        router.push(`/onboarding/member/complete?tenant=${tenantId}`)
      } else {
        alert(result.error || 'Errore nel completamento dell\'onboarding')
      }
    } catch (error) {
      console.error('[handleNext]', error)
      alert('Errore nel salvataggio dei dati')
    } finally {
      setLoading(false)
    }
  }

  if (!hydrated || !tenantId) return null

  return (
    <OnboardingShell
      stepNumber={3}
      totalSteps={3}
      stepLabel="Disponibilità"
      title="Quando lavori?"
      subtitle="Imposta i tuoi orari di lavoro settimanali"
      footer={
        <NavFooter
          onNext={handleNext}
          backHref={`/onboarding/member/step-2?tenant=${tenantId}`}
          nextDisabled={loading}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {workingHours.map((day) => (
          <div
            key={day.day_of_week}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: day.is_open ? '12px' : 0,
              }}
            >
              <input
                type="checkbox"
                checked={day.is_open}
                onChange={() => toggleDay(day.day_of_week)}
                style={{ cursor: 'pointer' }}
              />
              <label
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--color-fg)',
                }}
              >
                {DAY_LABELS[day.day_of_week]}
              </label>
            </div>

            {day.is_open && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}
              >
                <div>
                  <label
                    htmlFor={`open_${day.day_of_week}`}
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--color-fg-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Inizio
                  </label>
                  <input
                    id={`open_${day.day_of_week}`}
                    type="time"
                    value={day.open_time}
                    onChange={(e) =>
                      updateTime(day.day_of_week, 'open_time', e.target.value)
                    }
                    className="styll-input w-full px-2 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`close_${day.day_of_week}`}
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--color-fg-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Fine
                  </label>
                  <input
                    id={`close_${day.day_of_week}`}
                    type="time"
                    value={day.close_time}
                    onChange={(e) =>
                      updateTime(day.day_of_week, 'close_time', e.target.value)
                    }
                    className="styll-input w-full px-2 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </OnboardingShell>
  )
}
