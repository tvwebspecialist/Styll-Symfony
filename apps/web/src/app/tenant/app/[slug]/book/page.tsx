import { notFound } from 'next/navigation'
import { getPublicTenantBySlug, getPublicBookingLocations } from '@/lib/actions/booking-public'
import BookingFlow from '@/components/pwa/booking/BookingFlow'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params

  const tenant = await getPublicTenantBySlug(slug)
  if (!tenant) notFound()

  const locations = await getPublicBookingLocations(tenant.id)
  if (locations.length === 0) notFound()

  return <BookingFlow tenant={tenant} initialLocations={locations} slug={slug} />
}
