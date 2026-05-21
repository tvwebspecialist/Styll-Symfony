'use client'

import { useMemo, useState } from 'react'
import BookingStepIndicator from './BookingStepIndicator'
import { BottomCTA } from '../ui/BottomCTA'
import type { GetAvailableSlotsResult } from '@/lib/actions/booking-slots'
import type { PublicStaffMember } from '@/lib/actions/public-booking'

interface Props {
  staff: PublicStaffMember | null
  staffId: string
  selectedServiceNames: string[]
  slotsByDate: Record<string, GetAvailableSlotsResult>
  onBack: () => void
  onSelect: (date: string, time: string) => void
  primaryColor?: string
  skipLocationStep?: boolean
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

function formatDayParts(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  return {
    dayName: new Intl.DateTimeFormat('it-IT', { weekday: 'short', timeZone: 'UTC' })
      .format(date)
      .replace('.', '')
      .slice(0, 3)
      .toUpperCase(),
    dayNumber: new Intl.DateTimeFormat('it-IT', { day: 'numeric', timeZone: 'UTC' }).format(date),
    dayMonth: new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
      .format(date)
      .replace('.', ''),
  }
}

function LoadingPill() {
  return (
    <div
      style={{
        minHeight: 44,
        borderRadius: 12,
        background: '#E7E7E2',
        animation: 'bookingPulse 1.2s ease-in-out infinite alternate',
      }}
    />
  )
}

export default function BookingStep4DateTime({
  staff,
  staffId,
  selectedServiceNames,
  slotsByDate,
  onBack,
  onSelect,
  primaryColor,
  skipLocationStep = false,
}: Props) {
  const brandColor = primaryColor ?? '#1a1a1a'
  const dates = useMemo(() => Object.keys(slotsByDate), [slotsByDate])
  const firstAvailableDate =
    dates.find((date) => (slotsByDate[date]?.slots ?? []).some((slot) => slot.available)) ?? dates[0] ?? ''
  const [selectedDate, setSelectedDate] = useState(firstAvailableDate)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const selectedResult = selectedDate ? slotsByDate[selectedDate] : undefined
  const availableSlots = useMemo(
    () => (selectedResult?.slots ?? []).filter((slot) => slot.available),
    [selectedResult]
  )
  const servicesSummary = selectedServiceNames.join(' · ') || 'Servizi selezionati'
  const initials = getInitials(staff?.full_name ?? 'Primo disponibile')

  function handleDateSelect(date: string, disabled: boolean) {
    if (disabled) return
    setSelectedDate(date)
    setSelectedTime(null)
  }

  function handleSlotSelect(time: string) {
    setSelectedTime(time)
  }

  function handleConfirmSlot() {
    if (selectedTime) {
      onSelect(selectedDate, selectedTime)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', paddingBottom: 24 }}>
      <BookingStepIndicator
        currentStep="datetime"
        completedSteps={skipLocationStep ? ['staff', 'service'] : ['location', 'staff', 'service']}
        tenantPrimary={brandColor}
        skipLocationStep={skipLocationStep}
        stickyTopOverride={76}
      />

      <div
        style={{
          margin: '12px 16px',
          padding: '12px 16px',
          borderRadius: 16,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        {staff?.photo_url ? (
          <img
            src={staff.photo_url}
            alt={staff.full_name ?? 'Barbiere'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: brandColor,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {staffId === 'any' ? '★' : initials}
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>
            {staffId === 'any' ? 'Primo disponibile' : staff?.full_name ?? 'Barbiere'}
          </p>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 12,
              color: 'rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {servicesSummary}
          </p>
        </div>
      </div>

      <h2 style={{ margin: 0, padding: '16px 16px 8px', fontSize: 16, fontWeight: 600, color: '#111' }}>
        Scegli la data
      </h2>

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '0 16px 4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {dates.map((date) => {
          const parts = formatDayParts(date)
          const result = slotsByDate[date]
          const hasSlots = (result?.slots ?? []).some((slot) => slot.available)
          const disabled = result?.isWorkingDay === false || !hasSlots
          const isSelected = selectedDate === date

          return (
            <button
              key={date}
              type="button"
              onClick={() => handleDateSelect(date, disabled)}
              disabled={disabled}
              style={{
                minWidth: 72,
                padding: '10px 8px',
                borderRadius: 14,
                border: 'none',
                background: isSelected ? brandColor : 'white',
                color: isSelected ? 'white' : '#111',
                opacity: disabled ? 0.4 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                cursor: disabled ? 'default' : 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: isSelected ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.45)',
                }}
              >
                {parts.dayName}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{parts.dayNumber}</span>
              <span
                style={{
                  fontSize: 11,
                  color: isSelected ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.45)',
                }}
              >
                {parts.dayMonth}
              </span>
              <span
                aria-hidden="true"
                style={{
                  marginTop: 4,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isSelected ? 'transparent' : hasSlots ? '#22C55E' : 'transparent',
                }}
              />
            </button>
          )
        })}
      </div>

      <h2 style={{ margin: 0, padding: '16px 16px 8px', fontSize: 16, fontWeight: 600, color: '#111' }}>
        Scegli l'orario
      </h2>

      <div style={{ padding: '0 16px 16px' }}>
        {dates.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <LoadingPill />
            <LoadingPill />
            <LoadingPill />
            <LoadingPill />
            <LoadingPill />
            <LoadingPill />
          </div>
        ) : availableSlots.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {availableSlots.map((slot) => {
              const isSelected = selectedTime === slot.time

              return (
                <button
                  key={`${selectedDate}-${slot.time}`}
                  type="button"
                  onClick={() => handleSlotSelect(slot.time)}
                  style={{
                    minHeight: 44,
                    borderRadius: 12,
                    border: `1.5px solid ${brandColor}`,
                    background: isSelected ? brandColor : `${brandColor}10`,
                    color: isSelected ? 'white' : brandColor,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {slot.time}
                </button>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              color: 'rgba(0,0,0,0.45)',
              fontSize: 14,
            }}
          >
            {selectedResult?.isWorkingDay === false
              ? selectedResult.reason ?? 'Giorno chiuso'
              : 'Nessun orario disponibile per questa data.'}
          </div>
        )}
      </div>

      <style>{`
        @keyframes bookingPulse {
          from { opacity: 1; }
          to { opacity: 0.45; }
        }
      `}</style>

      <BottomCTA
        primary={{
          label: selectedTime ? `Conferma orario · ${selectedTime}` : 'Scegli un orario',
          onClick: handleConfirmSlot,
          disabled: !selectedTime,
        }}
        tenantPrimary={brandColor}
      />
    </div>
  )
}
