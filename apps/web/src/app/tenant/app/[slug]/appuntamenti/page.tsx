import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { AppuntamentiClient } from './_components/AppuntamentiClient'
import type { AppointmentItem, AppStatus } from './_components/AppuntamentiClient'

interface Props {
  params: Promise<{ slug: string }>
}

type RawApt = {
  id: string
  start_time: string
  status: string
  staff_id: string | null
  location_id: string | null
  appointment_services: Array<{
    service_id: string | null
    price_at_booking: number | null
    applied_promotion_id: string | null
    services: { name: string | null; price: number | null } | Array<{ name: string | null; price: number | null }> | null
    promotions: { title: string | null } | Array<{ title: string | null }> | null
  }> | null
  staff: {
    profile: { full_name: string | null } | Array<{ full_name: string | null }> | null
  } | Array<{
    profile: { full_name: string | null } | Array<{ full_name: string | null }> | null
  }> | null
  locations: { name: string | null; address: string | null } | Array<{ name: string | null; address: string | null }> | null
}

function readRel<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function parseApt(raw: RawApt): AppointmentItem {
  const services = raw.appointment_services ?? []
  const serviceNames = services
    .map((s) => {
      const svc = readRel(s.services)
      return svc?.name ?? null
    })
    .filter(Boolean)
    .join(', ') || 'Appuntamento'

  const serviceIds = services.map((s) => s.service_id).filter((id): id is string => Boolean(id))

  const totalPrice = services.reduce((sum, s) => sum + (s.price_at_booking ?? 0), 0)
  const staffRel = readRel(raw.staff)
  const staffName = readRel(staffRel?.profile)?.full_name ?? null
  const locationRel = readRel(raw.locations)
  const locationName = locationRel?.name ?? null
  const locationAddress = locationRel?.address ?? null

  const serviceDetails = services.map((s) => {
    const svc = readRel(s.services)
    const promo = readRel(s.promotions)
    return {
      serviceId: s.service_id ?? '',
      name: svc?.name ?? '',
      priceAtBooking: s.price_at_booking ?? 0,
      originalPrice: (svc as any)?.price ?? null,
      appliedPromotionId: s.applied_promotion_id ?? null,
      promotionTitle: promo?.title ?? null,
    }
  })

  return {
    id: raw.id,
    start_time: raw.start_time,
    status: raw.status as AppStatus,
    serviceNames,
    staffName,
    locationName,
    locationAddress,
    totalPrice: totalPrice > 0 ? totalPrice : null,
    staffId: raw.staff_id,
    locationId: raw.location_id,
    serviceIds,
    serviceDetails,
  }
}

export default async function AppuntamentiPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <p className="text-sm text-neutral-500">Accedi per vedere i tuoi appuntamenti.</p>
      </main>
    )
  }

  const db = createAdminClient()
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenant.tenant_id)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) {
    return (
      <main className="min-h-screen bg-[#F8F8F8] px-4 pt-6">
        <p className="text-sm text-neutral-500">Nessun profilo associato a questo salone.</p>
      </main>
    )
  }

  const SELECT = 'id, start_time, status, staff_id, location_id, appointment_services(service_id, price_at_booking, applied_promotion_id, services(name, price), promotions(title)), staff:staff_members(profile:profiles(full_name)), locations(name, address)'
  const now = new Date().toISOString()

  const [upcomingRes, pastRes] = await Promise.all([
    db
      .from('appointments')
      .select(SELECT)
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', (client as { id: string }).id)
      .is('deleted_at', null)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', now)
      .order('start_time', { ascending: true }),
    db
      .from('appointments')
      .select(SELECT)
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', (client as { id: string }).id)
      .is('deleted_at', null)
      .not('status', 'in', '("confirmed","pending")')
      .order('start_time', { ascending: false })
      .limit(20),
  ])

  const upcoming = (upcomingRes.data ?? []).map((r) => parseApt(r as unknown as RawApt))
  const past = (pastRes.data ?? []).map((r) => parseApt(r as unknown as RawApt))

  return (
    <main className="min-h-screen bg-[#F8F8F8] pb-24">
      <div className="mx-auto max-w-xl px-4 pt-4">
        <AppuntamentiClient
          upcoming={upcoming}
          past={past}
          tenantId={tenant.tenant_id}
          slug={slug}
          primaryColor={tenant.primary_color ?? '#1a1a1a'}
          prenotaPath={tp('/prenota')}
        />
      </div>
    </main>
  )
}
