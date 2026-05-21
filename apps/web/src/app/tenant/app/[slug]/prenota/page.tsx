import { notFound, redirect } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getPublicBookingLocations } from '@/lib/actions/booking-public'
import PrenotaLocationClient from './_components/PrenotaLocationClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PrenotaPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const [locations, tp] = await Promise.all([
    getPublicBookingLocations(tenant.tenant_id),
    createTenantPaths(slug),
  ])

  if (locations.length === 1) {
    redirect(tp(`/prenota/barbiere?location=${locations[0].id}&locationName=${encodeURIComponent(locations[0].name)}&_skip=sede`))
  }

  const locationHrefs: Record<string, string> = Object.fromEntries(
    locations.map((loc) => [
      loc.id,
      tp(`/prenota/barbiere?location=${loc.id}&locationName=${encodeURIComponent(loc.name)}`),
    ])
  )

  return (
    <main>
      <PrenotaLocationClient locations={locations} locationHrefs={locationHrefs} />
    </main>
  )
}
