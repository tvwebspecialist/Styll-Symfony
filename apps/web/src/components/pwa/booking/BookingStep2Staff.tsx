'use client'

import { useState } from 'react'
import type { PublicBookingStaffMember } from './types'
import BookingStepIndicator from './BookingStepIndicator'

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 20,
        padding: 16,
        margin: '0 16px 12px',
        display: 'flex',
        gap: 16,
        boxShadow: '0 1px 6px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          background: '#ebebeb',
          flexShrink: 0,
          animation: 'shimmer 1.5s ease-in-out infinite alternate',
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            height: 16,
            borderRadius: 8,
            background: '#ebebeb',
            width: '60%',
            animation: 'shimmer 1.5s ease-in-out infinite alternate',
          }}
        />
        <div
          style={{
            height: 13,
            borderRadius: 6,
            background: '#ebebeb',
            width: '40%',
            animation: 'shimmer 1.5s ease-in-out infinite alternate 0.1s',
          }}
        />
        <div
          style={{
            height: 13,
            borderRadius: 6,
            background: '#ebebeb',
            width: '50%',
            animation: 'shimmer 1.5s ease-in-out infinite alternate 0.2s',
          }}
        />
      </div>
    </div>
  )
}

function getInitials(name: string | null): string {
  if (!name) {
    return '?'
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatNextAvailable(isoDatetime: string | null): { label: string; isToday: boolean } | null {
  if (!isoDatetime) {
    return null
  }

  const datetime = new Date(isoDatetime)
  const now = new Date()
  const todayDate = now.toDateString()
  const tomorrowDate = new Date(now.getTime() + 86400000).toDateString()
  const targetDate = datetime.toDateString()
  const timeLabel = datetime.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (targetDate === todayDate) {
    return { label: `Disponibile oggi alle ${timeLabel}`, isToday: true }
  }

  if (targetDate === tomorrowDate) {
    return { label: 'Disponibile domani', isToday: false }
  }

  return {
    label: `Disponibile ${datetime.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })}`,
    isToday: false,
  }
}

interface Props {
  staff: PublicBookingStaffMember[]
  loading?: boolean
  locationName: string
  onSelect: (staffId: string) => void
  onBack?: () => void
  showBack?: boolean
  primaryColor?: string
  /** Overrides the default sticky top offset (76) for the step indicator. Pass 0 when this is the first visible step. */
  stickyTopOverride?: number
}

export default function BookingStep2Staff({
  staff,
  loading = false,
  locationName,
  onSelect,
  onBack,
  showBack = true,
  primaryColor,
  stickyTopOverride,
}: Props) {
  const [pressedId, setPressedId] = useState<string | null>(null)
  const brandColor = primaryColor ?? '#1a1a1a'

  return (
    <div style={{ background: '#F5F5F0', minHeight: '100vh' }}>
      <BookingStepIndicator
        currentStep="staff"
        completedSteps={showBack ? ['location'] : []}
        tenantPrimary={brandColor}
        skipLocationStep={!showBack}
        stickyTopOverride={stickyTopOverride ?? 76}
      />

      {locationName ? (
        <p style={{ margin: 0, padding: '16px 20px 4px', fontSize: 13, color: 'rgba(0, 0, 0, 0.45)' }}>
          Disponibili presso {locationName}
        </p>
      ) : null}

      {loading ? (
        <div style={{ paddingTop: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : staff.length === 0 ? (
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
        <div style={{ paddingTop: 8, paddingBottom: 24 }}>
          {staff.map((member) => {
            const isAny = member.id === 'any'
            const availability = formatNextAvailable(member.next_available)
            const initials = getInitials(member.full_name)
            const isPressed = pressedId === member.id

            return (
              <div
                key={member.id}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  padding: 16,
                  margin: '0 16px 12px',
                  boxShadow: isAny
                    ? `0 2px 16px rgba(0,0,0,0.08), 0 0 0 1.5px ${brandColor}44`
                    : '0 1px 6px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                  transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                  transition: 'transform 150ms ease, box-shadow 150ms ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flexShrink: 0 }}>
                    {isAny ? (
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 16,
                          background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}11 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={brandColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                    ) : member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name ?? 'Staff'}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 16,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 16,
                          background: `${brandColor}22`,
                          color: brandColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          fontWeight: 700,
                        }}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0a0a0a' }}>
                        {member.full_name ?? 'Barbiere'}
                      </p>
                      {isAny && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            color: brandColor,
                            background: `${brandColor}18`,
                            borderRadius: 9999,
                            padding: '3px 8px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          Consigliato
                        </span>
                      )}
                    </div>

                    {!isAny && (
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(0, 0, 0, 0.45)' }}>
                        {member.role === 'owner'
                          ? 'Titolare'
                          : member.role === 'manager'
                            ? 'Manager'
                            : 'Barbiere'}
                      </p>
                    )}

                    {isAny && member.bio && (
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 13,
                          color: 'rgba(0, 0, 0, 0.55)',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {member.bio}
                      </p>
                    )}

                    {!isAny && member.service_count > 0 && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 6,
                          fontSize: 11,
                          color: 'rgba(0, 0, 0, 0.5)',
                          background: 'transparent',
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 9999,
                          padding: '2px 8px',
                          fontWeight: 500,
                        }}
                      >
                        {member.service_count} {member.service_count === 1 ? 'servizio' : 'servizi'}
                      </span>
                    )}

                    {!isAny && availability && (
                      <p
                        style={{
                          margin: '5px 0 0',
                          fontSize: 12,
                          color: availability.isToday ? '#16a34a' : 'rgba(0, 0, 0, 0.45)',
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
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        {availability.label}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onPointerDown={() => setPressedId(member.id)}
                  onPointerUp={() => setPressedId(null)}
                  onPointerLeave={() => setPressedId(null)}
                  onClick={() => {
                    onSelect(member.id)
                  }}
                  style={{
                    marginTop: 14,
                    width: '100%',
                    background: brandColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '11px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                    opacity: isPressed ? 0.85 : 1,
                    minHeight: 44,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Scegli
                </button>
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
