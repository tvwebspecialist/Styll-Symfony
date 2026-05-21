'use client'

import { useRouter } from 'next/navigation'
import BookingStep3Services from '@/components/pwa/booking/BookingStep3Services'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import type { PublicStaffMember, ServiceForStaff } from '@/lib/actions/public-booking'

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
}

export function ServiziSelector({ slug, locationId, staffId, skip, groups, staff, primaryColor }: Props) {
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
    router.push(tenantPath(`/prenota/data?${params}`))
  }

  const skipLocationStep = skip.includes('sede')

  return (
    <BookingStep3Services
      staff={staff}
      staffId={staffId}
      groups={groups}
      onBack={handleBack}
      onContinue={handleContinue}
      primaryColor={primaryColor}
      skipLocationStep={skipLocationStep}
    />
  )
}
