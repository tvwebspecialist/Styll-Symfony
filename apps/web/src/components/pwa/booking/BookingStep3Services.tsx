'use client'

import { useMemo, useState } from 'react'
import BookingStepIndicator from './BookingStepIndicator'
import { BottomCTA } from '../ui/BottomCTA'
import type { PublicStaffMember, ServiceForStaff } from '@/lib/actions/public-booking'

interface ServiceGroup {
  category: string
  services: ServiceForStaff[]
}

interface Props {
  staff: PublicStaffMember | null
  staffId: string
  groups: ServiceGroup[]
  onBack: () => void
  onContinue: (serviceIds: string[]) => void
  primaryColor?: string
  skipLocationStep?: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function BookingStep3Services({
  staff,
  staffId,
  groups,
  onBack,
  onContinue,
  primaryColor,
  skipLocationStep = false,
}: Props) {
  const brandColor = primaryColor ?? '#1a1a1a'
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pressedId, setPressedId] = useState<string | null>(null)

  const flatServices = useMemo(() => groups.flatMap((group) => group.services), [groups])
  const selectedServices = useMemo(
    () => flatServices.filter((service) => selectedIds.includes(service.id)),
    [flatServices, selectedIds]
  )
  const totalDuration = selectedServices.reduce(
    (total, service) => total + Number(service.duration_minutes ?? 0),
    0
  )
  const totalPrice = selectedServices.reduce((total, service) => total + Number(service.price ?? 0), 0)
  const title = staffId === 'any' ? 'Primo disponibile' : staff?.full_name ?? 'Barbiere'
  const subtitle =
    staffId === 'any'
      ? 'Ti assegneremo il primo professionista disponibile'
      : staff?.bio?.trim() || 'Seleziona uno o più servizi per continuare'
  const heroHasPhoto = Boolean(staff?.photo_url) && staffId !== 'any'

  function toggleService(serviceId: string) {
    setSelectedIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0' }}>
      <div
        style={{
          position: 'relative',
          height: 220,
          overflow: 'hidden',
          background: heroHasPhoto
            ? '#d9d9d9'
            : `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}CC 100%)`,
        }}
      >
        {heroHasPhoto ? (
          <img
            src={staff?.photo_url ?? ''}
            alt={title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : null}

        {!heroHasPhoto ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at top right, ${brandColor}66 0%, transparent 48%)`,
            }}
          />
        ) : null}

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 75%)',
          }}
        />

        <button
          type="button"
          onClick={onBack}
          aria-label="Torna indietro"
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#111"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 16,
            color: 'white',
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <BookingStepIndicator
        currentStep="service"
        completedSteps={skipLocationStep ? ['staff'] : ['location', 'staff']}
        tenantPrimary={brandColor}
        skipLocationStep={skipLocationStep}
        stickyTopOverride={76}
      />

      <p style={{ margin: 0, padding: '16px 20px', fontSize: 16, color: '#111' }}>
        Seleziona uno o più servizi
      </p>

      <div style={{ paddingBottom: 120 }}>
        {groups.map((group) => (
          <section key={group.category} style={{ marginBottom: 18 }}>
            <p
              style={{
                margin: 0,
                padding: '0 16px 8px',
                fontSize: 12,
                fontWeight: 700,
                color: brandColor,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {group.category}
            </p>

            <div style={{ padding: '0 16px' }}>
              {group.services.map((service) => {
                const isSelected = selectedIds.includes(service.id)
                const isPressed = pressedId === service.id

                return (
                  <button
                    key={service.id}
                    type="button"
                    onPointerDown={() => setPressedId(service.id)}
                    onPointerUp={() => setPressedId(null)}
                    onPointerLeave={() => setPressedId(null)}
                    onClick={() => toggleService(service.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '16px 14px',
                      marginBottom: 10,
                      background: 'white',
                      borderRadius: 16,
                      border: `2px solid ${isSelected ? brandColor : 'transparent'}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                      transition: 'transform 150ms ease, border-color 150ms ease',
                      textAlign: 'left',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: `1.5px solid ${isSelected ? brandColor : 'rgba(0,0,0,0.14)'}`,
                        background: isSelected ? brandColor : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>
                        {service.name}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 13,
                          color: 'rgba(0,0,0,0.52)',
                        }}
                      >
                        {service.duration_minutes} min
                      </p>
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: isSelected ? brandColor : '#111',
                      }}
                    >
                      {formatCurrency(service.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <BottomCTA
        primary={{
          label:
            selectedIds.length > 0
              ? `Continua · ${formatCurrency(totalPrice)} · ${totalDuration} min`
              : 'Seleziona un servizio',
          onClick: () => onContinue(selectedIds),
          disabled: selectedIds.length === 0,
        }}
        tenantPrimary={brandColor}
      />
    </div>
  )
}
