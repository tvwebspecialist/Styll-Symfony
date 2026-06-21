import { notFound, redirect } from 'next/navigation'
import { ServiziSelector } from './_componenti/ServiziSelector'
import {
  getPublicStaffMemberById,
  getServicesForStaff,
  type ServiceForStaff,
} from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveOffersForBooking } from '@/lib/actions/offers'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

interface ServiceGroup {
  category: string
  services: ServiceForStaff[]
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function groupServices(services: ServiceForStaff[]): ServiceGroup[] {
  const groups = new Map<string, ServiceForStaff[]>()

  for (const service of services) {
    const category = service.category?.trim() || 'Servizi principali'
    const current = groups.get(category) ?? []
    current.push(service)
    groups.set(category, current)
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    services: items,
  }))
}

export default async function ServiziPage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const locationId = readParam(resolvedSearchParams.location)
  const staffId = readParam(resolvedSearchParams.staff)
  const skipParam = readParam(resolvedSearchParams._skip) ?? ''
  const servicesParam = readParam(resolvedSearchParams.services)
  const cancelAppointmentId = readParam(resolvedSearchParams.cancelAppointmentId) ?? undefined
  const initialServiceIds = servicesParam?.split(',').filter(Boolean) ?? []
  const tp = await createTenantPaths(slug)

  if (!locationId) {
    redirect(tp('/prenota'))
  }

  if (!staffId) {
    redirect(
      tp(`/prenota/barbiere?location=${locationId}${skipParam ? `&_skip=${skipParam}` : ''}`)
    )
  }

  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const [{ services }, staffMember] = await Promise.all([
    getServicesForStaff(tenant.tenant_id, staffId),
    getPublicStaffMemberById(tenant.tenant_id, staffId),
  ])

  // Resolve logged-in client for offer pricing (graceful degradation on any error)
  let clientId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      const db = createAdminClient()
      const { data: clientRow } = await db
        .from('clients')
        .select('id')
        .eq('tenant_id', tenant.tenant_id)
        .eq('profile_id', user.id)
        .is('deleted_at', null)
        .maybeSingle()
      clientId = (clientRow as { id: string } | null)?.id ?? null
    }
  } catch { /* no offers without auth — harmless */ }

  const allServiceIds = services.map((s) => s.id)
  const offersByServiceId = allServiceIds.length > 0
    ? await getActiveOffersForBooking(tenant.tenant_id, allServiceIds, clientId).catch(() => ({}))
    : {}

  return (
    <ServiziSelector
      slug={slug}
      locationId={locationId}
      staffId={staffId}
      skip={skipParam}
      groups={groupServices(services)}
      staff={staffMember}
      primaryColor={tenant.primary_color}
      initialServiceIds={initialServiceIds}
      cancelAppointmentId={cancelAppointmentId}
      offersByServiceId={offersByServiceId}
    />
  )
}
