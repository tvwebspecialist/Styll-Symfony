import { notFound, redirect } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getPublicStaffByLocation } from '@/lib/actions/booking-public'
import BarbierStaffClient from './_components/BarbierStaffClient'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function BarbierePage({ params, searchParams }: Props) {
  const [{ slug }, resolvedParams] = await Promise.all([params, searchParams])
  const locationId = readParam(resolvedParams.location)
  const locationName = decodeURIComponent(readParam(resolvedParams.locationName) ?? '')
  const skipParam = readParam(resolvedParams._skip) ?? ''
  const tp = await createTenantPaths(slug)

  if (!locationId) {
    redirect(tp('/prenota'))
  }

  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const allStaff = await getPublicStaffByLocation(tenant.tenant_id, locationId)
  const realStaff = allStaff.filter((s) => s.id !== 'any')

  // Auto-select if only one real staff member
  if (realStaff.length === 1) {
    const newSkip = [...skipParam.split(',').filter(Boolean), 'barbiere'].join(',')
    redirect(tp(`/prenota/servizi?location=${locationId}&staff=${realStaff[0].id}&_skip=${newSkip}`))
  }

  const skipItems = skipParam.split(',').filter(Boolean)
  const showBack = !skipItems.includes('sede')
  const backHref = tp('/prenota')

  const staffToShow = realStaff.length === 0 ? [] : allStaff
  const staffHrefs: Record<string, string> = Object.fromEntries(
    staffToShow.map((s) => [
      s.id,
      tp(`/prenota/servizi?location=${locationId}&staff=${s.id}${skipParam ? `&_skip=${skipParam}` : ''}`),
    ])
  )

  return (
    <main>
      <BarbierStaffClient
        staff={staffToShow}
        locationName={locationName}
        staffHrefs={staffHrefs}
        backHref={backHref}
        showBack={showBack}
      />
    </main>
  )
}
