'use client'

import { useRouter } from 'next/navigation'
import BookingStep5Confirm from '@/components/pwa/booking/BookingStep5Confirm'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import type { PublicLocation, PublicService, PublicStaffMember } from '@/lib/actions/public-booking'

interface Props {
  slug: string
  tenantId: string
  locationId: string
  staffId: string
  serviceIds: string[]
  date: string
  time: string
  location: PublicLocation
  staff: PublicStaffMember
  services: PublicService[]
  primaryColor?: string
  initialFullName?: string
  initialPhone?: string
  initialEmail?: string
  isLoggedIn?: boolean
  clientId?: string
}

export function ConfermaForm({
  slug, tenantId, locationId, staffId, serviceIds, date, time,
  location, staff, services, primaryColor,
  initialFullName = '', initialPhone = '', initialEmail = '',
  isLoggedIn = false, clientId,
}: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)

  function handleBack() {
    const params = new URLSearchParams({
      location: locationId,
      staff: staffId,
      services: serviceIds.join(','),
    })
    router.push(tenantPath(`/prenota/data?${params}`))
  }

  function handleSuccess(appointmentId: string) {
    router.replace(tenantPath(`/prenota/successo?appointment=${appointmentId}`))
  }

  return (
    <BookingStep5Confirm
      slug={slug}
      tenantId={tenantId}
      locationId={locationId}
      staffId={staffId}
      staff={staff}
      location={location}
      services={services}
      date={date}
      time={time}
      onBack={handleBack}
      onSuccess={handleSuccess}
      primaryColor={primaryColor}
      initialFullName={initialFullName}
      initialPhone={initialPhone}
      initialEmail={initialEmail}
      isLoggedIn={isLoggedIn}
      clientId={clientId}
    />
  )
}
