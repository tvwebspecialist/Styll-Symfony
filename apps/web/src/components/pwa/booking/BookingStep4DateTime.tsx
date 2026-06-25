// pill giorni: 72x80px | background: #ffffff | hero barbiere come step Servizi
// con pill servizi sotto il nome | PwaTopBar nascosta
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomCTA } from '../ui/BottomCTA'
import type { GetAvailableSlotsResult } from '@/lib/actions/booking-slots'
import type { PublicStaffMember } from '@/lib/actions/public-booking'

interface Props {
  staff: PublicStaffMember | null
  staffId: string
  selectedServiceNames: string[]
  totalDurationMinutes?: number
  slotsByDate: Record<string, GetAvailableSlotsResult>
  onBack: () => void
  onSelect: (date: string, time: string) => void
  primaryColor?: string
  isLoading?: boolean
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

function formatDayParts(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  return {
    dayName: new Intl.DateTimeFormat('it-IT', { weekday: 'short', timeZone: 'UTC' })
      .format(date)
      .replace('.', '')
      .slice(0, 3)
      .toUpperCase(),
    dayNumber: new Intl.DateTimeFormat('it-IT', { day: 'numeric', timeZone: 'UTC' }).format(date),
  }
}

// Pure minute-math: no Date object, aligned with backend slot generation
function addMinutesToTime(time: string, minutes: number): string {
  const [hStr, mStr] = time.split(':')
  const total = parseInt(hStr ?? '0', 10) * 60 + parseInt(mStr ?? '0', 10) + minutes
  const endH = Math.floor(total / 60) % 24
  const endM = total % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

function LoadingRow() {
  return (
    <div
      style={{
        height: 56,
        borderRadius: 14,
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
  totalDurationMinutes,
  slotsByDate,
  onBack,
  onSelect,
  primaryColor,
  isLoading = false,
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
  const hasDuration = (totalDurationMinutes ?? 0) > 0

  // Hero vars — identical pattern to BookingStep3Services
  const heroPhoto = staffId !== 'any' ? (staff?.photo_url ?? null) : null
  const heroName = staffId === 'any' ? 'Primo disponibile' : (staff?.full_name ?? 'Barbiere')
  const heroRole =
    staffId === 'any'
      ? 'Ti assegneremo il primo professionista disponibile'
      : getRoleLabel((staff as { role?: string } | null)?.role)
  const heroInitials = getInitials(heroName)

  // Drag scroll state (refs to avoid re-renders)
  const stripRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const scrollStartX = useRef(0)

  // Scroll selected date into view whenever it changes
  useEffect(() => {
    const el = pillRefs.current.get(selectedDate)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDate])

  function onStripMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    isDragging.current = true
    dragStartX.current = e.clientX
    scrollStartX.current = stripRef.current?.scrollLeft ?? 0
  }

  function onStripMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging.current || !stripRef.current) return
    e.preventDefault()
    stripRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current)
  }

  function onStripMouseUp() {
    isDragging.current = false
  }

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

  function formatSlotLabel(time: string): string {
    if (!hasDuration) return time
    return `${time} — ${addMinutesToTime(time, totalDurationMinutes!)}`
  }

  const ctaLabel = isLoading
    ? 'Modifica in corso…'
    : selectedTime
      ? `Conferma · ${formatSlotLabel(selectedTime)}`
      : 'Scegli un orario'

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* HERO — foto barbiere sticky (sostituisce PwaTopBar per questo step) */}
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
        {/* Floating back button */}
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

        {/* OVERLAY v3 — gradient 8-stop puro, no backdrop-filter */}
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

      {/* Layer blur — sticky sibling, solidale con la hero durante lo scroll */}
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

      {/* Testo hero — sticky sibling al di sopra del blur (zIndex 63 > 62) */}
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
        <p
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.2,
            letterSpacing: '-0.4px',
          }}
        >
          {heroName}
        </p>
        <p
          style={{
            margin: '5px 0 8px',
            fontSize: '14px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          {heroRole}
        </p>
        {/* Service pills */}
        {selectedServiceNames.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selectedServiceNames.map((name) => (
              <span
                key={name}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(255,255,255,0.18)',
                  borderRadius: 20,
                  padding: '3px 10px',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content: date strip + slot orari */}
      <div style={{ paddingTop: 20, paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
        <h2 style={{ margin: 0, padding: '0 16px 8px', fontSize: 16, fontWeight: 600, color: '#111' }}>
          Scegli la data
        </h2>

        {/* strip date: pill 72x80px, drag scroll nativo, snap center, giorno selezionato emergente */}
        <div
          ref={stripRef}
          className="booking-date-strip"
          onMouseDown={onStripMouseDown}
          onMouseMove={onStripMouseMove}
          onMouseUp={onStripMouseUp}
          onMouseLeave={onStripMouseUp}
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '6px 16px 10px',
            scrollbarWidth: 'none',
            scrollSnapType: 'x mandatory',
            userSelect: 'none',
            cursor: 'grab',
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
                ref={(el) => {
                  if (el) pillRefs.current.set(date, el)
                  else pillRefs.current.delete(date)
                }}
                type="button"
                onClick={() => handleDateSelect(date, disabled)}
                disabled={disabled}
                style={{
                  width: 72,
                  height: 80,
                  borderRadius: 18,
                  border: 'none',
                  background: isSelected ? brandColor : 'white',
                  color: isSelected ? 'white' : '#111',
                  opacity: disabled ? 0.4 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: disabled ? 'default' : 'pointer',
                  boxShadow: isSelected
                    ? `0 4px 14px ${brandColor}55`
                    : '0 1px 4px rgba(0,0,0,0.06)',
                  WebkitTapHighlightColor: 'transparent',
                  flexShrink: 0,
                  scrollSnapAlign: 'center',
                  transform: isSelected ? 'scale(1.10)' : 'scale(1)',
                  transition: 'transform 200ms ease, background 150ms ease, box-shadow 200ms ease',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    lineHeight: 1,
                    color: isSelected ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.4)',
                  }}
                >
                  {parts.dayName}
                </span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: isSelected ? 'white' : '#111',
                  }}
                >
                  {parts.dayNumber}
                </span>
                {/* availability dot */}
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isSelected
                      ? 'rgba(255,255,255,0.5)'
                      : hasSlots
                        ? '#22C55E'
                        : 'transparent',
                  }}
                />
              </button>
            )
          })}
        </div>

        <h2 style={{ margin: 0, padding: '16px 16px 8px', fontSize: 16, fontWeight: 600, color: '#111' }}>
          Scegli l'orario
        </h2>

        {/* Slot rows */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dates.length === 0 ? (
            <>
              <LoadingRow />
              <LoadingRow />
              <LoadingRow />
              <LoadingRow />
              <LoadingRow />
            </>
          ) : availableSlots.length > 0 ? (
            availableSlots.map((slot) => {
              const isSelected = selectedTime === slot.time

              return (
                <button
                  key={`${selectedDate}-${slot.time}`}
                  type="button"
                  onClick={() => handleSlotSelect(slot.time)}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    border: 'none',
                    background: isSelected ? brandColor : 'white',
                    color: isSelected ? 'white' : '#111',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    paddingLeft: 16,
                    paddingRight: 16,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'background 150ms ease, color 150ms ease',
                  }}
                >
                  {/* Radio circle */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'rgba(255,255,255,0.85)' : brandColor}`,
                      background: 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.85)',
                        }}
                      />
                    )}
                  </span>
                  {/* Time label */}
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {formatSlotLabel(slot.time)}
                  </span>
                </button>
              )
            })
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
      </div>

      <style>{`
        @keyframes bookingPulse {
          from { opacity: 1; }
          to { opacity: 0.45; }
        }
        .booking-date-strip { -webkit-overflow-scrolling: touch; }
        .booking-date-strip::-webkit-scrollbar { display: none; }
      `}</style>

      <BottomCTA
        primary={{
          label: ctaLabel,
          onClick: handleConfirmSlot,
          disabled: !selectedTime || isLoading,
        }}
        tenantPrimary={brandColor}
      />
    </div>
  )
}
