'use client'

import { useRouter } from 'next/navigation'
import BookingStep4DateTime from '@/components/pwa/booking/BookingStep4DateTime'
import type { GetAvailableSlotsResult } from '@/lib/actions/booking-slots'
import type { PublicStaffMember } from '@/lib/actions/public-booking'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface Props {
  slug: string
  locationId: string
  staffId: string
  serviceIds: string[]
  skip: string
  slotsByDate: Record<string, GetAvailableSlotsResult>
  staff: PublicStaffMember | null
  selectedServiceNames: string[]
  totalDurationMinutes?: number
  primaryColor?: string
}

export function DataSelector({ slug, locationId, staffId, serviceIds, skip, slotsByDate, staff, selectedServiceNames, totalDurationMinutes, primaryColor }: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)

  function handleBack() {
    const params = new URLSearchParams({
      location: locationId,
      staff: staffId,
    })
    if (skip) params.set('_skip', skip)
    router.push(tenantPath(`/prenota/servizi?${params}`))
  }

  function handleSelect(date: string, time: string) {
    const params = new URLSearchParams({
      location: locationId,
      staff: staffId,
      services: serviceIds.join(','),
      date,
      time,
    })
    if (skip) params.set('_skip', skip)
    router.push(tenantPath(`/prenota/conferma?${params}`))
  }

  return (
    <BookingStep4DateTime
      staff={staff}
      staffId={staffId}
      selectedServiceNames={selectedServiceNames}
      totalDurationMinutes={totalDurationMinutes}
      slotsByDate={slotsByDate}
      onBack={handleBack}
      onSelect={handleSelect}
      primaryColor={primaryColor}
    />
  )
}
