'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { GetAvailableSlotsResult } from '@/lib/actions/booking-slots'

interface DataSelectorProps {
  slug: string
  locationId: string
  staffId: string
  serviceIds: string[]
  skip: string
  slotsByDate: Record<string, GetAvailableSlotsResult>
}

function formatDayLabel(value: string): { dayName: string; dayNumber: string } {
  const date = new Date(`${value}T12:00:00Z`)
  return {
    dayName: new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(date),
    dayNumber: new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(date),
  }
}

export function DataSelector({ slug, locationId, staffId, serviceIds, skip, slotsByDate }: DataSelectorProps) {
  const router = useRouter()
  const dates = Object.keys(slotsByDate)
  const firstAvailableDate =
    dates.find((date) => slotsByDate[date]?.slots.some((s) => s.available)) ?? dates[0]
  const [selectedDate, setSelectedDate] = useState(firstAvailableDate)

  const selectedResult = slotsByDate[selectedDate]
  const selectedSlots = useMemo(
    () => (selectedResult?.slots ?? []).filter((s) => s.available),
    [selectedResult]
  )

  function handleSelect(time: string) {
    const params = new URLSearchParams({
      location: locationId,
      services: serviceIds.join(','),
      staff: staffId,
      date: selectedDate,
      time,
    })

    if (skip) params.set('_skip', skip)

    router.push(`/tenant/app/${slug}/prenota/conferma?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Scegli data e ora</h1>
        <p className="text-sm text-muted-foreground">Scorri i prossimi 14 giorni e seleziona l&apos;orario che preferisci.</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {dates.map((date) => {
          const label = formatDayLabel(date)
          const isActive = selectedDate === date
          const result = slotsByDate[date]
          const hasSlots = result?.slots.some((s) => s.available) ?? false

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={cn(
                'relative flex min-h-[44px] min-w-[92px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center transition-colors',
                isActive
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                  : 'border-border bg-card text-foreground'
              )}
            >
              <span className="text-xs uppercase">{label.dayName}</span>
              <span className="text-sm font-semibold">{label.dayNumber}</span>
              {!isActive && (
                <span
                  className={cn(
                    'mt-1 h-1.5 w-1.5 rounded-full',
                    hasSlots ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {selectedSlots.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {selectedSlots.map((slot) => (
            <button
              key={`${selectedDate}-${slot.time}`}
              type="button"
              onClick={() => handleSelect(slot.time)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 px-4 py-3 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white"
            >
              {slot.time}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          {selectedResult?.isWorkingDay === false
            ? selectedResult.reason ?? 'Giorno chiuso'
            : 'Nessun orario disponibile per questo giorno. Prova a cambiare data o torna indietro per scegliere un altro professionista.'}
        </div>
      )}
    </div>
  )
}
