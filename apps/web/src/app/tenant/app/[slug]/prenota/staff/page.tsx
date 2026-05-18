import { redirect } from 'next/navigation'
import { createTenantPaths } from '@/lib/pwa-redirect'

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

export default async function OldStaffPage({ params, searchParams }: Props) {
  const [{ slug }, resolvedParams] = await Promise.all([params, searchParams])
  const locationId = readParam(resolvedParams.location)
  const tp = await createTenantPaths(slug)

  if (locationId) {
    redirect(tp(`/prenota/barbiere?location=${locationId}`))
  }

  redirect(tp('/prenota'))
}
