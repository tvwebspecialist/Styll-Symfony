'use client'

import { useCallback, useEffect, useState, useTransition, type CSSProperties } from 'react'
import { getPublicStaffByLocation } from '@/lib/actions/booking-public'
import BookingStep1Locations from './BookingStep1Locations'
import BookingStep2Staff from './BookingStep2Staff'
import type {
  BookingState,
  BookingStep,
  PublicBookingLocation,
  PublicBookingStaffMember,
  PublicBookingTenant,
} from './types'

interface Props {
  tenant: PublicBookingTenant
  initialLocations: PublicBookingLocation[]
}

type TransitionDirection = 'forward' | 'back'

type TransitionState = {
  from: BookingStep
  to: BookingStep
  direction: TransitionDirection
} | null

export default function BookingFlow({ tenant, initialLocations }: Props) {
  const primaryColor = tenant.primary_color
  const initialStep: BookingStep = initialLocations.length === 1 ? 'staff' : 'location'
  const initialLocationId = initialLocations.length === 1 ? initialLocations[0]?.id ?? null : null

  const [state, setState] = useState<BookingState>({
    step: initialStep,
    selectedLocationId: initialLocationId,
    selectedStaffId: null,
    selectedServiceIds: [],
    selectedDate: null,
    selectedSlot: null,
    guestName: null,
    guestPhone: null,
  })
  const [completedSteps, setCompletedSteps] = useState<BookingStep[]>(
    initialLocations.length === 1 ? ['location'] : []
  )
  const [staff, setStaff] = useState<PublicBookingStaffMember[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [transitionState, setTransitionState] = useState<TransitionState>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    if (!state.selectedLocationId) {
      setStaff([])
      setStaffLoading(false)
      return () => {
        cancelled = true
      }
    }

    setStaffLoading(true)
    setStaff([])

    getPublicStaffByLocation(tenant.id, state.selectedLocationId)
      .then((result) => {
        if (cancelled) {
          return
        }

        setStaff(result)
        setStaffLoading(false)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setStaffLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [state.selectedLocationId, tenant.id])

  useEffect(() => {
    if (!transitionState) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setTransitionState(null)
    }, 320)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [transitionState])

  const navigate = useCallback(
    (nextState: BookingState, direction: TransitionDirection) => {
      startTransition(() => {
        if (nextState.step !== state.step) {
          setTransitionState({ from: state.step, to: nextState.step, direction })
        }
        setState(nextState)
      })
    },
    [startTransition, state.step]
  )

  const handleSelectLocation = useCallback(
    (locationId: string) => {
      setCompletedSteps((prev) => (prev.includes('location') ? prev : [...prev, 'location']))
      navigate(
        {
          ...state,
          step: 'staff',
          selectedLocationId: locationId,
          selectedStaffId: null,
          selectedServiceIds: [],
          selectedDate: null,
          selectedSlot: null,
        },
        'forward'
      )
    },
    [navigate, state]
  )

  const handleSelectStaff = useCallback(
    (staffId: string) => {
      setCompletedSteps((prev) => (prev.includes('staff') ? prev : [...prev, 'staff']))
      navigate(
        {
          ...state,
          step: 'service',
          selectedStaffId: staffId,
          selectedServiceIds: [],
          selectedDate: null,
          selectedSlot: null,
        },
        'forward'
      )
    },
    [navigate, state]
  )

  const handleBack = useCallback(() => {
    setCompletedSteps((prev) => prev.filter((s) => s !== 'location'))
    navigate(
      {
        ...state,
        step: 'location',
        selectedLocationId: null,
        selectedStaffId: null,
        selectedServiceIds: [],
        selectedDate: null,
        selectedSlot: null,
      },
      'back'
    )
  }, [navigate, state])

  const handleRestart = useCallback(() => {
    navigate(
      {
        step: initialStep,
        selectedLocationId: initialLocationId,
        selectedStaffId: null,
        selectedServiceIds: [],
        selectedDate: null,
        selectedSlot: null,
        guestName: null,
        guestPhone: null,
      },
      'back'
    )
  }, [initialLocationId, initialStep, navigate])

  const selectedLocation = initialLocations.find((location) => location.id === state.selectedLocationId)

  const containerStyle: CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100dvh',
    background: '#F7F7F7',
    fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
  }

  const panelStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    minHeight: '100dvh',
    background: '#F7F7F7',
  }

  const renderStep = (step: BookingStep) => {
    if (step === 'location') {
      return (
        <BookingStep1Locations
          locations={initialLocations}
          selectedId={state.selectedLocationId}
          onSelect={handleSelectLocation}
          primaryColor={primaryColor}
        />
      )
    }

    if (step === 'staff') {
      return (
        <BookingStep2Staff
          staff={staff}
          loading={staffLoading}
          locationName={selectedLocation?.name ?? ''}
          onSelect={handleSelectStaff}
          onBack={handleBack}
          showBack={initialLocations.length > 1}
          primaryColor={primaryColor}
        />
      )
    }

    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: 'rgba(0, 0, 0, 0.5)' }}>Step {step} — coming soon</p>
        <p style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.35)', marginTop: 8 }}>
          Staff selezionato: {state.selectedStaffId}
        </p>
        <button
          onClick={handleRestart}
          style={{
            marginTop: 24,
            background: primaryColor,
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Ricomincia
        </button>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
        {transitionState ? (
          <>
            <div
              style={{
                ...panelStyle,
                animation:
                  transitionState.direction === 'forward'
                    ? 'booking-slide-out-left 320ms cubic-bezier(0.22, 1, 0.36, 1) both'
                    : 'booking-slide-out-right 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
              }}
            >
              {renderStep(transitionState.from)}
            </div>
            <div
              style={{
                ...panelStyle,
                animation:
                  transitionState.direction === 'forward'
                    ? 'booking-slide-in-right 320ms cubic-bezier(0.22, 1, 0.36, 1) both'
                    : 'booking-slide-in-left 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
              }}
            >
              {renderStep(transitionState.to)}
            </div>
          </>
        ) : (
          <div style={{ minHeight: '100dvh' }}>{renderStep(state.step)}</div>
        )}
      </div>

      <style>{`
        @keyframes booking-slide-in-right {
          from { transform: translate3d(32px, 0, 0); opacity: 0; }
          to { transform: translate3d(0, 0, 0); opacity: 1; }
        }

        @keyframes booking-slide-out-left {
          from { transform: translate3d(0, 0, 0); opacity: 1; }
          to { transform: translate3d(-32px, 0, 0); opacity: 0; }
        }

        @keyframes booking-slide-in-left {
          from { transform: translate3d(-32px, 0, 0); opacity: 0; }
          to { transform: translate3d(0, 0, 0); opacity: 1; }
        }

        @keyframes booking-slide-out-right {
          from { transform: translate3d(0, 0, 0); opacity: 1; }
          to { transform: translate3d(32px, 0, 0); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
