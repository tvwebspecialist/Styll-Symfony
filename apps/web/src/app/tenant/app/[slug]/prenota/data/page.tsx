import { notFound, redirect } from 'next/navigation'
import { DataSelector } from './_componenti/DataSelector'
import { getAvailableSlots, type GetAvailableSlotsResult } from '@/lib/actions/booking-slots'
import {
  getPublicServicesByIds,
  getPublicStaffMemberById,
  getTenantTimezone,
} from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'
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

function getTodayInTimeZone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(new Date())
  const map = new Map(parts.map((part) => [part.type, part.value]))

  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`
}

function addDays(date: string, amount: number): string {
  const current = new Date(`${date}T12:00:00Z`)
  current.setUTCDate(current.getUTCDate() + amount)
  return current.toISOString().slice(0, 10)
}

export default async function DataPage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const locationId = readParam(resolvedSearchParams.location)
  const servicesParam = readParam(resolvedSearchParams.services)
  const staffId = readParam(resolvedSearchParams.staff)
  const skipParam = readParam(resolvedSearchParams._skip) ?? ''
  const serviceIds = servicesParam?.split(',').filter(Boolean) ?? []
  const tp = await createTenantPaths(slug)

  if (!locationId) {
    redirect(tp('/prenota'))
  }

  if (!staffId) {
    redirect(
      tp(`/prenota/barbiere?location=${locationId}${skipParam ? `&_skip=${skipParam}` : ''}`)
    )
  }

  if (serviceIds.length === 0) {
    redirect(
      tp(`/prenota/servizi?location=${locationId}&staff=${staffId}${skipParam ? `&_skip=${skipParam}` : ''}`)
    )
  }

  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const [timezone, staffMember, selectedServices] = await Promise.all([
    getTenantTimezone(tenant.tenant_id),
    getPublicStaffMemberById(tenant.tenant_id, staffId),
    getPublicServicesByIds(tenant.tenant_id, serviceIds),
  ])
  const today = getTodayInTimeZone(timezone)
  const dates = Array.from({ length: 14 }, (_, index) => addDays(today, index))
  const slots = await Promise.all(
    dates.map((date) =>
      getAvailableSlots({
        tenantId: tenant.tenant_id,
        staffId,
        serviceIds,
        date,
        timezone,
      })
    )
  )

  const slotsByDate: Record<string, GetAvailableSlotsResult> = Object.fromEntries(
    dates.map((date, index) => [date, slots[index]])
  )

  const totalDurationMinutes = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)

  return (
    <DataSelector
      slug={slug}
      locationId={locationId}
      staffId={staffId}
      serviceIds={serviceIds}
      skip={skipParam}
      slotsByDate={slotsByDate}
      staff={staffMember}
      selectedServiceNames={selectedServices.map((service) => service.name)}
      totalDurationMinutes={totalDurationMinutes}
      primaryColor={tenant.primary_color}
    />
  )
}
