'use client'

import { useMemo, useState } from 'react'
import type { PublicStaffMember, ServiceForStaff } from '@/lib/actions/public-booking'
import { applyBestPromotion, formatDiscount, type PromotionServicePricing } from '@/lib/utils/offer-pricing'

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
  initialSelectedIds?: string[]
  /** True when both sede and barbiere are skipped — this step is the first, so bottom nav is visible */
  isFirstStep?: boolean
  /** Map of serviceId → eligible promotions for this client (server-fetched) */
  offersByServiceId?: Record<string, PromotionServicePricing[]>
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

function getRoleLabel(role: string | null | undefined): string {
  if (role === 'owner') return 'Titolare'
  if (role === 'manager') return 'Manager'
  return 'Barbiere'
}

export default function BookingStep3Services({
  staff,
  staffId,
  groups,
  onBack,
  onContinue,
  primaryColor,
  initialSelectedIds,
  isFirstStep = false,
  offersByServiceId = {},
}: Props) {
  const brandColor = primaryColor ?? '#1a1a1a'
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? [])
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
  const totalPrice = selectedServices.reduce((total, service) => {
    const items = offersByServiceId[service.id] ?? []
    const { discountedPrice } = applyBestPromotion(Number(service.price ?? 0), items)
    return total + discountedPrice
  }, 0)

  function toggleService(serviceId: string) {
    setSelectedIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    )
  }

  const heroPhoto = staffId !== 'any' ? (staff?.photo_url ?? null) : null
  const heroName = staffId === 'any' ? 'Primo disponibile' : (staff?.full_name ?? 'Barbiere')
  const heroRole = staffId === 'any' ? 'Ti assegneremo il primo professionista disponibile' : getRoleLabel((staff as { role?: string } | null)?.role)
  const heroInitials = getInitials(heroName)

  const ctaBottom = isFirstStep
    ? 'calc(var(--bottom-nav-height, 80px) + max(16px, env(safe-area-inset-bottom, 16px)))'
    : 'max(16px, env(safe-area-inset-bottom, 16px))'

  const listPaddingBottom = isFirstStep
    ? 'calc(88px + var(--bottom-nav-height, 80px) + max(16px, env(safe-area-inset-bottom, 0px)))'
    : 'calc(88px + max(16px, env(safe-area-inset-bottom, 0px)))'

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* HERO — foto barbiere sticky */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 61,
          width: '100%',
          height: '300px',
          overflow: 'hidden',
          borderRadius: '0 0 36px 36px',
          flexShrink: 0,
          transform: 'translateZ(0)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Torna indietro"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: 16,
            zIndex: 10,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10), 0 0px 1px rgba(0,0,0,0.06)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#111111"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt={heroName}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: brandColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              userSelect: 'none',
            }}
          >
            {heroInitials}
          </div>
        )}

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(
                to top,
                rgba(0,0,0,0.85) 0%,
                rgba(0,0,0,0.75) 10%,
                rgba(0,0,0,0.60) 20%,
                rgba(0,0,0,0.40) 35%,
                rgba(0,0,0,0.20) 50%,
                rgba(0,0,0,0.08) 65%,
                rgba(0,0,0,0.02) 78%,
                rgba(0,0,0,0) 88%
              )
            `,
            borderRadius: 'inherit',
          }}
        />
      </div>

      {/* Blur layer — sticky sibling solidale con hero */}
      <div
        aria-hidden="true"
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          height: '300px',
          marginTop: '-300px',
          flexShrink: 0,
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          maskImage: 'linear-gradient(to top, black 30%, rgba(0,0,0,0.4) 55%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to top, black 30%, rgba(0,0,0,0.4) 55%, transparent 70%)',
          zIndex: 62,
          pointerEvents: 'none',
          borderRadius: '0 0 36px 36px',
        }}
      />

      {/* Testo hero */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '300px',
          marginTop: '-300px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '20px 20px 24px',
          zIndex: 63,
          pointerEvents: 'none',
        }}
      >
        <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.4px' }}>
          {heroName}
        </p>
        <p style={{ margin: '5px 0 0', fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.75)' }}>
          {heroRole}
        </p>
      </div>

      {/* Lista servizi */}
      <div style={{ padding: '0 12px', paddingTop: 20, paddingBottom: listPaddingBottom }}>
        {groups.map((group) => (
          <div key={group.category}>
            {/* Label categoria */}
            <p
              style={{
                margin: '20px 4px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#9CA3AF',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {group.category}
            </p>

            {/* Card singole per servizio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                      padding: 16,
                      background: 'white',
                      borderRadius: 20,
                      border: `2px solid ${isSelected ? brandColor : 'transparent'}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                      transition: 'transform 150ms ease, border-color 150ms ease',
                      textAlign: 'left',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {/* Radio circle */}
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: `2px solid ${isSelected ? brandColor : 'rgba(0,0,0,0.18)'}`,
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 150ms ease',
                      }}
                    >
                      {isSelected && (
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: brandColor,
                          }}
                        />
                      )}
                    </span>

                    {/* Nome + durata */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#222222',
                          lineHeight: 1.3,
                        }}
                      >
                        {service.name}
                      </p>
                      <p
                        style={{
                          margin: '3px 0 0',
                          fontSize: 13,
                          fontWeight: 400,
                          color: '#9CA3AF',
                        }}
                      >
                        {service.duration_minutes} min
                      </p>
                    </div>

                    {/* Prezzo */}
                    {(() => {
                      const servicePromos = offersByServiceId[service.id] ?? []
                      const { discountedPrice, appliedPromotionId } = applyBestPromotion(Number(service.price ?? 0), servicePromos)
                      const hasDiscount = appliedPromotionId !== null
                      const appliedPromo = servicePromos.find((p) => p.promotionId === appliedPromotionId) ?? null
                      return hasDiscount ? (
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {appliedPromo && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', borderRadius: 100, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                              {formatDiscount(appliedPromo)}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>
                            {formatCurrency(service.price)}
                          </span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#16A34A', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                            {formatCurrency(discountedPrice)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ flexShrink: 0, fontSize: 16, fontWeight: 700, color: '#222222', letterSpacing: '-0.3px' }}>
                          {formatCurrency(service.price)}
                        </span>
                      )
                    })()}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. CTA pill fisso */}
      <button
        type="button"
        onClick={() => { if (selectedIds.length > 0) onContinue(selectedIds) }}
        disabled={selectedIds.length === 0}
        style={{
          position: 'fixed',
          bottom: ctaBottom,
          left: 8,
          right: 8,
          zIndex: 50,
          height: 56,
          borderRadius: 44,
          background: brandColor,
          color: 'white',
          fontWeight: 700,
          fontSize: 16,
          border: 'none',
          cursor: selectedIds.length === 0 ? 'default' : 'pointer',
          opacity: selectedIds.length === 0 ? 0.45 : 1,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          transition: 'opacity 200ms',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {selectedIds.length > 0
          ? `Continua · ${formatCurrency(totalPrice)} · ${totalDuration} min`
          : 'Seleziona un servizio'}
      </button>
    </div>
  )
}
