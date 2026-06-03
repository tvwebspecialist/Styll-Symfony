// GLASS OVERLAY STANDARD v2: griglia 2 colonne quadrate 1:1 — pattern da BookingStep1Locations
// card barbiere: aspect-ratio 1/1, immagine full-field, glass overlay, no bottone Scegli
'use client'

import { useState } from 'react'
import type { PublicBookingStaffMember } from './types'

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

interface Props {
  staff: PublicBookingStaffMember[]
  loading?: boolean
  locationName: string
  onSelect: (staffId: string) => void
  onBack?: () => void
  showBack?: boolean
  primaryColor?: string
}

export default function BookingStep2Staff({
  staff,
  loading = false,
  onSelect,
  primaryColor,
}: Props) {
  const [pressedId, setPressedId] = useState<string | null>(null)
  const brandColor = primaryColor ?? '#1a1a1a'

  const realStaff = staff.filter((m) => m.id !== 'any')

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', paddingBottom: 24 }}>
      <p
        style={{
          margin: '0 0 16px',
          padding: '24px 16px 0',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-fg)',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
        }}
      >
        Scegli il tuo barbiere
      </p>

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            padding: '0 16px',
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 20,
                background: '#ebebeb',
                animation: 'shimmer 1.5s ease-in-out infinite alternate',
              }}
            />
          ))}
        </div>
      ) : realStaff.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'rgba(0, 0, 0, 0.4)',
            fontSize: 15,
          }}
        >
          Nessun barbiere disponibile in questa sede.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            padding: '0 16px',
          }}
        >
          {realStaff.map((member) => {
            const isPressed = pressedId === member.id
            const initials = getInitials(member.full_name)

            return (
              <div
                key={member.id}
                role="button"
                aria-label={`Seleziona barbiere: ${member.full_name ?? 'Barbiere'}`}
                tabIndex={0}
                onPointerDown={() => setPressedId(member.id)}
                onPointerUp={() => setPressedId(null)}
                onPointerLeave={() => setPressedId(null)}
                onClick={() => onSelect(member.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(member.id)
                  }
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 20,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                  transform: isPressed ? 'scale(0.97)' : 'translateZ(0)',
                  transition: 'transform 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Immagine o fallback iniziali */}
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.full_name ?? 'Barbiere'}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: brandColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: '#ffffff',
                        userSelect: 'none',
                      }}
                    >
                      {initials}
                    </span>
                  </div>
                )}

                {/* Layer 1 — gradient lungo e morbido */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 28%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0) 75%)',
                    borderRadius: 'inherit',
                  }}
                />

                {/* Layer 2 — blur leggero con dissolvenza graduale */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    maskImage:
                      'linear-gradient(to top, black 30%, rgba(0,0,0,0.4) 65%, transparent 100%)',
                    WebkitMaskImage:
                      'linear-gradient(to top, black 30%, rgba(0,0,0,0.4) 65%, transparent 100%)',
                    borderRadius: 'inherit',
                  }}
                />

                {/* Testo sovrapposto */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 14px 16px',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.2,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {member.full_name ?? 'Barbiere'}
                  </p>
                  {member.service_count > 0 && (
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 12,
                        color: 'rgba(255, 255, 255, 0.75)',
                        lineHeight: 1.3,
                      }}
                    >
                      {member.service_count}{' '}
                      {member.service_count === 1 ? 'servizio' : 'servizi'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          from { opacity: 1; }
          to { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}
