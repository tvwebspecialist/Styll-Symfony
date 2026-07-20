'use client'

import { useEffect, useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import type { PublicBookingLocation } from './types'

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
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      <p
        style={{
          margin: 0,
          padding: '24px 20px 8px',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--color-fg)',
          lineHeight: 1.2,
        }}
      >
        Scegli una sede
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

              {/* Mini FloatingCard overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  right: 10,
                  background: 'white',
                  borderRadius: 20,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#222222', lineHeight: 1.3 }}>
                    {location.name}
                  </p>
                  {(location.city || location.address) && (
                    <p style={{ margin: '1px 0 0', fontSize: 14, color: '#71717A', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[location.city, location.address].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} color="#A1A1AA" style={{ flexShrink: 0, marginLeft: 8 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
