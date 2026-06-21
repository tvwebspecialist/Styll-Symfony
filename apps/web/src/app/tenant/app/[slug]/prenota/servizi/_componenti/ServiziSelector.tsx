'use client'

import { useRouter } from 'next/navigation'
import BookingStep3Services from '@/components/pwa/booking/BookingStep3Services'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import type { PublicStaffMember, ServiceForStaff } from '@/lib/actions/public-booking'
import type { OfferForPricing } from '@/lib/utils/offer-pricing'

interface ServiceGroup {
  category: string
  services: ServiceForStaff[]
}

interface Props {
  slug: string
  locationId: string
  staffId: string
  skip: string
  groups: ServiceGroup[]
  staff: PublicStaffMember | null
  primaryColor?: string
  initialServiceIds?: string[]
  cancelAppointmentId?: string
  offersByServiceId?: Record<string, OfferForPricing[]>
}

export function ServiziSelector({ slug, locationId, staffId, skip, groups, staff, primaryColor, initialServiceIds, cancelAppointmentId, offersByServiceId }: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)

  function handleBack() {
    if (skip.includes('barbiere')) {
      router.push(tenantPath('/prenota'))
    } else {
      const params = new URLSearchParams({ location: locationId })
      if (skip) params.set('_skip', skip)
      router.push(tenantPath(`/prenota/barbiere?${params}`))
    }
  }

  function handleContinue(serviceIds: string[]) {
    const params = new URLSearchParams({
      location: locationId,
      staff: staffId,
      services: serviceIds.join(','),
    })
    if (skip) params.set('_skip', skip)
    if (cancelAppointmentId) params.set('cancelAppointmentId', cancelAppointmentId)
    router.push(tenantPath(`/prenota/data?${params}`))
  }

  const skipLocationStep = skip.includes('sede')
  const skipStaffStep = skip.includes('barbiere')
  const isFirstStep = skipLocationStep && skipStaffStep

  return (
    <BookingStep3Services
      staff={staff}
      staffId={staffId}
      groups={groups}
      onBack={handleBack}
      onContinue={handleContinue}
      primaryColor={primaryColor}
      skipLocationStep={skipLocationStep}
      isFirstStep={isFirstStep}
      initialSelectedIds={initialServiceIds}
      offersByServiceId={offersByServiceId}
    />
  )
}
