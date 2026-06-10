import { notFound, redirect } from 'next/navigation'
import { ConfermaForm } from './_componenti/ConfermaForm'
import {
  getPublicLocationById,
  getPublicServicesByIds,
  getPublicStaffMemberById,
} from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getMyClientRecord } from '@/lib/actions/client-auth'

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
  const googleLogin = readParam(resolvedSearchParams.google_login) === '1'
  const serviceIds = servicesParam?.split(',').filter(Boolean) ?? []
  const tp = await createTenantPaths(slug)

  if (!locationId) redirect(tp('/prenota'))
  if (!staffId) redirect(tp('/prenota'))
  if (serviceIds.length === 0) {
    redirect(tp(`/prenota/servizi?location=${locationId}&staff=${staffId}`))
  }
  if (!date || !time) {
    redirect(tp(`/prenota/data?location=${locationId}&services=${serviceIds.join(',')}&staff=${staffId}`))
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const [services, location, staffMember, clientRecord] = await Promise.all([
    getPublicServicesByIds(tenant.tenant_id, serviceIds),
    getPublicLocationById(tenant.tenant_id, locationId),
    getPublicStaffMemberById(tenant.tenant_id, staffId),
    getMyClientRecord(tenant.tenant_id),
  ])

  if (!location || !staffMember || services.length === 0) notFound()

  return (
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
      primaryColor={tenant.primary_color}
      logoUrl={tenant.logo_url}
      businessName={tenant.business_name}
      initialFullName={clientRecord?.fullName ?? ''}
      initialPhone={clientRecord?.phone ?? ''}
      initialEmail={clientRecord?.email ?? ''}
      isLoggedIn={clientRecord !== null}
      clientId={clientRecord?.id ?? undefined}
      googleLogin={googleLogin}
    />
  )
}
