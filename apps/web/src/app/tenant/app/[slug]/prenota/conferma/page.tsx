import { notFound, redirect } from 'next/navigation'
import { ConfermaForm } from './_componenti/ConfermaForm'
import {
  getPublicLocationById,
  getPublicServicesByIds,
  getPublicStaffMemberById,
} from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function ConfermaPage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const locationId = readParam(resolvedSearchParams.location)
  const servicesParam = readParam(resolvedSearchParams.services)
  const staffId = readParam(resolvedSearchParams.staff)
  const date = readParam(resolvedSearchParams.date)
  const time = readParam(resolvedSearchParams.time)
  const serviceIds = servicesParam?.split(',').filter(Boolean) ?? []

  if (!locationId) {
    redirect(`/tenant/app/${slug}/prenota`)
  }

  if (!staffId) {
    redirect(`/tenant/app/${slug}/prenota`)
  }

  if (serviceIds.length === 0) {
    redirect(
      `/tenant/app/${slug}/prenota/servizi?location=${locationId}&staff=${staffId}`
    )
  }

  if (!date || !time) {
    redirect(
      `/tenant/app/${slug}/prenota/data?location=${locationId}&services=${serviceIds.join(',')}&staff=${staffId}`
    )
  }

  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const [services, location, staffMember] = await Promise.all([
    getPublicServicesByIds(tenant.tenant_id, serviceIds),
    getPublicLocationById(tenant.tenant_id, locationId),
    getPublicStaffMemberById(tenant.tenant_id, staffId),
  ])

  if (!location || !staffMember || services.length === 0) {
    notFound()
  }

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <ConfermaForm
        slug={slug}
        tenantId={tenant.tenant_id}
        locationId={locationId}
        staffId={staffId}
        serviceIds={serviceIds}
        date={date}
        time={time}
        location={location}
        staff={staffMember}
        services={services}
      />
    </main>
  )
}
