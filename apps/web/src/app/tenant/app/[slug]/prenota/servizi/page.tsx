import { notFound, redirect } from 'next/navigation'
import { ServiziSelector } from './_componenti/ServiziSelector'
import { getServicesForStaff, type ServiceForStaff } from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

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

  const { services } = await getServicesForStaff(tenant.tenant_id, staffId)

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <ServiziSelector
        slug={slug}
        locationId={locationId}
        staffId={staffId}
        skip={skipParam}
        groups={groupServices(services)}
      />
    </main>
  )
}
