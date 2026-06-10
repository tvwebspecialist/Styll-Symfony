'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingStep5Confirm from '@/components/pwa/booking/BookingStep5Confirm'
import BookingSuccessModal from '@/components/pwa/booking/BookingSuccessModal'
import { Toast } from '@/components/pwa/ui/Toast'
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
  businessName?: string
  initialFullName?: string
  initialPhone?: string
  initialEmail?: string
  isLoggedIn?: boolean
  clientId?: string
  googleLogin?: boolean
}

function formatBookingDate(date: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

export function ConfermaForm({
  slug, tenantId, locationId, staffId, serviceIds, date, time,
  location, staff, services, primaryColor, businessName = '',
  initialFullName = '', initialPhone = '', initialEmail = '',
  isLoggedIn = false, clientId, googleLogin = false,
}: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null)
  const [hasAuthenticated, setHasAuthenticated] = useState(false)
  const [googleToastVisible, setGoogleToastVisible] = useState(false)

  useEffect(() => {
    if (!googleLogin) return
    const url = new URL(window.location.href)
    url.searchParams.delete('google_login')
    window.history.replaceState(null, '', url.toString())
    const showTimer = setTimeout(() => setGoogleToastVisible(true), 50)
    const hideTimer = setTimeout(() => setGoogleToastVisible(false), 3000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalDuration = useMemo(
    () => services.reduce((total, service) => total + Number(service.duration_minutes ?? 0), 0),
    [services],
  )

  function handleBack() {
    const params = new URLSearchParams({
      location: locationId,
      staff: staffId,
      services: serviceIds.join(','),
    })
    router.push(tenantPath(`/prenota/data?${params}`))
  }

  function handleSuccess(appointmentId: string) {
    setSuccessAppointmentId(appointmentId)
  }

  return (
    <>
      <Toast
        type="success"
        message="Accesso effettuato con Google"
        visible={googleToastVisible}
        onClose={() => setGoogleToastVisible(false)}
      />

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
        onAuthComplete={() => setHasAuthenticated(true)}
        primaryColor={primaryColor}
        initialFullName={initialFullName}
        initialPhone={initialPhone}
        initialEmail={initialEmail}
        isLoggedIn={isLoggedIn}
        clientId={clientId}
      />

      {successAppointmentId !== null && (
        <BookingSuccessModal
          appointmentId={successAppointmentId}
          formattedDate={formatBookingDate(date)}
          formattedTime={time.slice(0, 5)}
          totalDuration={totalDuration}
          date={date}
          time={time}
          businessName={businessName || location.name}
          locationName={location.name}
          locationAddress={location.address}
          locationCity={location.city}
          primaryColor={primaryColor ?? '#1a1a1a'}
          slug={slug}
          isLoggedIn={isLoggedIn || hasAuthenticated}
        />
      )}
    </>
  )
}
