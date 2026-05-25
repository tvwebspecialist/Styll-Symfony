'use client'

import { useEffect, useRef } from 'react'
import type { PublicBookingLocation } from './types'
import BookingStepIndicator from './BookingStepIndicator'

interface Props {
  locations: PublicBookingLocation[]
  selectedId: string | null
  onSelect: (locationId: string) => void
  primaryColor?: string
}

export default function BookingStep1Locations({
  locations,
  selectedId,
  onSelect,
  primaryColor,
}: Props) {
  const calledRef = useRef(false)

  useEffect(() => {
    if (locations.length === 1 && !calledRef.current) {
      calledRef.current = true
      onSelect(locations[0].id)
    }
  }, [locations, onSelect])

  if (locations.length === 1) {
    return null
  }

  if (locations.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'rgba(0, 0, 0, 0.4)',
          fontSize: 15,
        }}
      >
        Nessuna sede disponibile al momento.
      </div>
    )
  }

  return (
    <div style={{ background: '#F5F5F0', minHeight: '100vh' }}>
      <BookingStepIndicator
        currentStep="location"
        completedSteps={[]}
        tenantPrimary={primaryColor ?? '#1a1a1a'}
        stickyTopOverride={76}
      />

      <p
        style={{
          margin: 0,
          padding: '16px 20px 4px',
          fontSize: 13,
          color: 'rgba(0,0,0,0.45)',
        }}
      >
        Dove vuoi andare?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '12px 16px 24px',
        }}
      >
        {locations.map((location) => {
          const isSelected = selectedId === location.id

          return (
            <div
              key={location.id}
              role="button"
              aria-label={`Seleziona sede: ${location.name}`}
              tabIndex={0}
              onClick={() => onSelect(location.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(location.id)
                }
              }}
              style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                cursor: 'pointer',
                outline: isSelected
                  ? `3px solid ${primaryColor ?? 'var(--brand-primary, #1a1a1a)'}`
                  : '3px solid transparent',
                outlineOffset: 2,
                transition: 'outline 0.15s, transform 0.15s',
                transform: 'translateZ(0)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {location.cover_image_url ? (
                <img
                  src={location.cover_image_url}
                  alt={location.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 220,
                    background: `linear-gradient(135deg, ${primaryColor ?? '#1a1a1a'} 0%, rgba(0, 0, 0, 0.6) 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '60%',
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.65) 100%)',
                  pointerEvents: 'none',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'white',
                  borderRadius: 9999,
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0a0a0a',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#16a34a',
                    display: 'inline-block',
                    animation: 'pulseDot 1.8s ease-in-out infinite',
                  }}
                />
                Disponibile
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'white',
                    lineHeight: 1.2,
                  }}
                >
                  {location.name}
                </p>
                {(location.city || location.address) && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 13,
                      color: 'rgba(255, 255, 255, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {[location.city, location.address].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
