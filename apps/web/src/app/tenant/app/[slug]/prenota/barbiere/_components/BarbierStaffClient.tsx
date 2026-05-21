'use client'

import { useRouter } from 'next/navigation'
import BookingStep2Staff from '@/components/pwa/booking/BookingStep2Staff'
import type { PublicBookingStaffMember } from '@/components/pwa/booking/types'

interface Props {
  staff: PublicBookingStaffMember[]
  locationName: string
  staffHrefs: Record<string, string>
  backHref: string
  showBack: boolean
}

export default function BarbierStaffClient({
  staff,
  locationName,
  staffHrefs,
  backHref,
  showBack,
}: Props) {
  const router = useRouter()
  return (
    <BookingStep2Staff
      staff={staff}
      locationName={locationName}
      onSelect={(id) => router.push(staffHrefs[id] ?? '#')}
      onBack={() => router.push(backHref)}
      showBack={showBack}
    />
  )
}
