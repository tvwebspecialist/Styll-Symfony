'use client'

import './BookingStepIndicator.css'
import type { BookingStep } from './types'

// ── Step metadata ────────────────────────────────────────────────────────────

interface StepData {
  id: Exclude<BookingStep, 'success'>
  label: string
}

const ALL_STEPS: StepData[] = [
  { id: 'location', label: 'Sede' },
  { id: 'staff', label: 'Barbiere' },
  { id: 'service', label: 'Servizi' },
  { id: 'datetime', label: 'Quando' },
  { id: 'confirm', label: 'Conferma' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BookingStepIndicatorProps {
  currentStep: BookingStep
  completedSteps: BookingStep[]
  tenantPrimary: string
  /** When true, the 'location' step is hidden and 4 steps are shown instead of 5 */
  skipLocationStep?: boolean
  stickyTopOverride?: number
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BookingStepIndicator({
  currentStep,
  completedSteps,
  tenantPrimary,
  skipLocationStep = false,
  stickyTopOverride,
}: BookingStepIndicatorProps) {
  const primary = tenantPrimary || '#1a1a1a'

  const STEPS = skipLocationStep
    ? ALL_STEPS.filter((s) => s.id !== 'location')
    : ALL_STEPS

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const effectiveIndex = currentStepIndex === -1 ? STEPS.length - 1 : currentStepIndex

  return (
    <div
      style={{
        background: '#F7F7F7',
        position: 'sticky',
        top: stickyTopOverride ?? 56,
        zIndex: 50,
      }}
      role="progressbar"
      aria-valuenow={effectiveIndex + 1}
      aria-valuemin={1}
      aria-valuemax={STEPS.length}
      aria-label={`Passo ${effectiveIndex + 1} di ${STEPS.length}`}
    >
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 16px' }}>
        {STEPS.map((step, index) => {
          const isActive =
            step.id === currentStep ||
            (currentStepIndex === -1 && index === STEPS.length - 1)
          const isCompleted = completedSteps.includes(step.id)

          return (
            <div
              key={step.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                alignItems: 'center',
              }}
            >
              {/* Label */}
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? primary
                    : isCompleted
                      ? 'rgba(0,0,0,0.5)'
                      : 'rgba(0,0,0,0.28)',
                  textAlign: 'center',
                  letterSpacing: '0.01em',
                  transition: 'color 300ms',
                }}
              >
                {step.label}
              </p>

              {/* Bar track */}
              <div
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 9999,
                  background: 'rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}
              >
                {isCompleted && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: primary,
                      borderRadius: 9999,
                    }}
                  />
                )}
                {isActive && !isCompleted && (
                  <div
                    key={`bar-${currentStep}`}
                    className="booking-bar-fill"
                    style={{
                      height: '100%',
                      background: primary,
                      borderRadius: 9999,
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
