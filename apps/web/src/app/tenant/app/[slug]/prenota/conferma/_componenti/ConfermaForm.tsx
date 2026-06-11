'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingStep5Confirm from '@/components/pwa/booking/BookingStep5Confirm'
import BookingSuccessModal from '@/components/pwa/booking/BookingSuccessModal'
import { ToastProvider } from '@/components/pwa/ui/Toast'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { cancelAppointmentForReschedule } from '@/lib/actions/pwa-client-actions'
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
  logoUrl?: string | null
  businessName?: string
  initialFullName?: string
  initialPhone?: string
  initialEmail?: string
  isLoggedIn?: boolean
  clientId?: string
  googleLogin?: boolean
  cancelAppointmentId?: string
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
  location, staff, services, primaryColor, logoUrl, businessName = '',
  initialFullName = '', initialPhone = '', initialEmail = '',
  isLoggedIn = false, clientId, googleLogin = false, cancelAppointmentId,
}: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null)
  const [hasAuthenticated, setHasAuthenticated] = useState(false)

  useEffect(() => {
    if (!googleLogin) return
    const url = new URL(window.location.href)
    url.searchParams.delete('google_login')
    window.history.replaceState(null, '', url.toString())
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
    if (cancelAppointmentId) params.set('cancelAppointmentId', cancelAppointmentId)
    router.push(tenantPath(`/prenota/data?${params}`))
  }

  function handleSuccess(appointmentId: string) {
    if (cancelAppointmentId) {
      void cancelAppointmentForReschedule(tenantId, cancelAppointmentId).catch((e) => {
        console.error('cancelAppointmentForReschedule failed:', e)
      })
    }
    setSuccessAppointmentId(appointmentId)
  }

  return (
    <ToastProvider>
      <BookingStep5Confirm
        googleLogin={googleLogin}
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
        logoUrl={logoUrl}
        businessName={businessName}
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
    </ToastProvider>
  )
}
