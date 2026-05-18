'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ServiceForStaff } from '@/lib/actions/public-booking'

interface ServiceGroup {
  category: string
  services: ServiceForStaff[]
}

interface ServiziSelectorProps {
  slug: string
  locationId: string
  staffId: string
  skip: string
  groups: ServiceGroup[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ServiziSelector({ slug, locationId, staffId, skip, groups }: ServiziSelectorProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const selectedServices = useMemo(() => {
    const flatServices = groups.flatMap((group) => group.services)
    return flatServices.filter((service) => selectedIds.includes(service.id))
  }, [groups, selectedIds])

  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.duration_minutes,
    0
  )
  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0)

  function toggleService(serviceId: string) {
    setSelectedIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    )
  }

  function handleContinue() {
    if (selectedIds.length === 0) {
      return
    }

    const params = new URLSearchParams({
      location: locationId,
      staff: staffId,
      services: selectedIds.join(','),
    })

    if (skip) params.set('_skip', skip)

    router.push(`/tenant/app/${slug}/prenota/data?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Scegli i servizi</h1>
        <p className="text-sm text-muted-foreground">Puoi selezionare uno o più servizi.</p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.category} className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--brand-primary)]">{group.category}</h2>
            <div className="space-y-3">
              {group.services.map((service) => {
                const isSelected = selectedIds.includes(service.id)

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      'flex min-h-[44px] w-full items-start justify-between gap-4 rounded-3xl border bg-card px-4 py-4 text-left transition-colors',
                      isSelected
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                        : 'border-border'
                    )}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{service.name}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{service.duration_minutes} min</span>
                        <span>{formatCurrency(service.price)}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full border text-sm',
                        isSelected
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                          : 'border-border text-transparent'
                      )}
                    >
                      ✓
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-4 space-y-3 rounded-3xl border border-border bg-background/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>{selectedIds.length} servizi selezionati</span>
          <span>
            {totalDuration} min · {formatCurrency(totalPrice)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selectedIds.length === 0}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continua
        </button>
      </div>
    </div>
  )
}
