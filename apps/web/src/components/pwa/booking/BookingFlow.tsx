'use client'

import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from 'react'
import { getPublicStaffByLocation } from '@/lib/actions/booking-public'
import BookingStep1Locations from './BookingStep1Locations'
import BookingStep2Staff from './BookingStep2Staff'
import BookingTopBar from './BookingTopBar'
import { BottomNavPWA } from '../BottomNavPWA'
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
  slug: string
  fontFamily?: string | null
}

const STEP_TITLES: Partial<Record<BookingStep, string>> = {
  staff: 'Barbiere',
  service: 'Servizi',
  datetime: 'Quando',
  confirm: 'Conferma',
}

type TransitionDirection = 'forward' | 'back'

type TransitionState = {
  from: BookingStep
  to: BookingStep
  direction: TransitionDirection
} | null

export default function BookingFlow({ tenant, initialLocations, slug, fontFamily }: Props) {
  const primaryColor = tenant.primary_color
  const skipLocation = initialLocations.length === 1
  const initialStep: BookingStep = skipLocation ? 'staff' : 'location'
  const initialLocationId = skipLocation ? (initialLocations[0]?.id ?? null) : null

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
    skipLocation ? ['location'] : []
  )
  const [staff, setStaff] = useState<PublicBookingStaffMember[]>([])
  // Start as true when skipLocation so the firstVisibleStep effect waits for the real load
  const [staffLoading, setStaffLoading] = useState(skipLocation)
  const [transitionState, setTransitionState] = useState<TransitionState>(null)
  const [, startTransition] = useTransition()

  // --- firstVisibleStep ---
  // Computed once: 'location' | 'staff' | 'service'.
  // When skipLocation=true it may be updated a single time (to 'service') after staff loads.
  const [firstVisibleStep, setFirstVisibleStep] = useState<BookingStep>(
    skipLocation ? 'staff' : 'location'
  )
  // Already finalised when skipLocation=false; deferred until first staff load otherwise.
  const firstVisibleStepFinalizedRef = useRef(!skipLocation)

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

  // After staff loads for the single-location case: finalise firstVisibleStep.
  // If there is exactly 1 active staff member, skip the staff step and jump straight to service.
  useEffect(() => {
    if (firstVisibleStepFinalizedRef.current) return
    if (staffLoading) return

    firstVisibleStepFinalizedRef.current = true

    if (staff.length === 1 && staff[0]) {
      setFirstVisibleStep('service')
      setCompletedSteps(['location', 'staff'])
      setState((prev) => ({
        ...prev,
        step: 'service',
        selectedStaffId: staff[0]!.id,
        selectedServiceIds: [],
        selectedDate: null,
        selectedSlot: null,
      }))
    }
    // else: firstVisibleStep remains 'staff'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffLoading, staff])

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
        step: firstVisibleStep,
        selectedLocationId: initialLocationId,
        // Keep staff pre-selected when the first visible step is 'service' (1-staff auto-advance)
        selectedStaffId: firstVisibleStep === 'service' ? state.selectedStaffId : null,
        selectedServiceIds: [],
        selectedDate: null,
        selectedSlot: null,
        guestName: null,
        guestPhone: null,
      },
      'back'
    )
  }, [firstVisibleStep, initialLocationId, state.selectedStaffId, navigate])

  const handleTopBarBack = useCallback(() => {
    if (state.step === 'staff') {
      handleBack()
    }
    // TODO: handle back for service, datetime, confirm when those steps are implemented
  }, [state.step, handleBack])

  const selectedLocation = initialLocations.find((location) => location.id === state.selectedLocationId)

  // showBottomNav = true only on the first visible step (landing experience)
  // showTopBar / showBottomCTA = true on all subsequent steps
  const showBottomNav = state.step === firstVisibleStep
  const showTopBar = !showBottomNav
  // Height of BookingTopBar — used as sticky offset for step indicators below it
  const topBarOffset = showTopBar ? 56 : 0

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
          showBack={!skipLocation}
          primaryColor={primaryColor}
          stickyTopOverride={topBarOffset}
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
      {showTopBar && (
        <BookingTopBar
          title={STEP_TITLES[state.step] ?? ''}
          onBack={state.step === 'staff' && !skipLocation ? handleTopBarBack : undefined}
        />
      )}

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

      {showBottomNav && (
        <BottomNavPWA slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
      )}

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
