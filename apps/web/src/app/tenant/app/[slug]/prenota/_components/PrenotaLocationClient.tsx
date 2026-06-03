// CHANGES: rimosso div sticky "Prenota" | glass overlay card → gradiente from-bottom
'use client'

import { useRouter } from 'next/navigation'
import BookingStep1Locations from '@/components/pwa/booking/BookingStep1Locations'
import type { PublicBookingLocation } from '@/components/pwa/booking/types'

interface Props {
  locations: PublicBookingLocation[]
  locationHrefs: Record<string, string>
}

export default function PrenotaLocationClient({ locations, locationHrefs }: Props) {
  const router = useRouter()
  return (
    <BookingStep1Locations
      locations={locations}
      selectedId={null}
      onSelect={(id) => router.push(locationHrefs[id] ?? '#')}
    />
  )
}
