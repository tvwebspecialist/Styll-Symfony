import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CalendarDays, Gift, UserRound } from 'lucide-react'
import { getMyClientRecord } from '@/lib/actions/client-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ClientProfileForm } from '@/components/pwa/auth/ClientProfileForm'
import { LogoutButton } from '@/components/pwa/auth/LogoutButton'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

interface Props {
  params: Promise<{ slug: string }>
}

type Relation<T> = T | T[] | null | undefined

type StaffRelation = {
  profile: Relation<{ full_name: string | null }>
} | null

type AppointmentServiceRelation = {
  services: Relation<{ name: string | null }>
} | null

type AppointmentRow = {
  id: string
  start_time: string
  status: string
  staff: Relation<StaffRelation>
  appointment_services: AppointmentServiceRelation[] | null
}

function getInitials(value: string | null | undefined): string {
  return (
    (value ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CL'
  )
}

function readRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getServiceNames(appointment: AppointmentRow): string {
  const names = (appointment.appointment_services ?? [])
    .map((item) => readRelation(item?.services)?.name)
    .filter(Boolean)

  return names.length > 0 ? names.join(' + ') : 'Servizio'
}

function getStaffName(appointment: AppointmentRow): string {
  const staff = readRelation(appointment.staff)
  const profile = readRelation(staff?.profile)
  return profile?.full_name ?? 'Staff'
}

export default async function ProfiloPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const tp = await createTenantPaths(slug)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(tp('/accesso?mode=login&return_to=/profilo'))
  }

  const clientRecord = await getMyClientRecord(tenant.tenant_id)

  if (!clientRecord) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h1 className="text-lg font-extrabold">Profilo non collegato</h1>
          <p className="mt-2 text-sm leading-6">
            Il tuo account è attivo, ma non è ancora collegato a una scheda cliente di {tenant.business_name}.
          </p>
        </div>
      </main>
    )
  }

  const db = createAdminClient()
  const now = new Date().toISOString()
  const [nextAppointmentRes, recentAppointmentsRes] = await Promise.all([
    db
      .from('appointments')
      .select('id, start_time, status, staff:staff_members(profile:profiles(full_name)), appointment_services(services(name))')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', clientRecord.id)
      .is('deleted_at', null)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
    db
      .from('appointments')
      .select('id, start_time, status, staff:staff_members(profile:profiles(full_name)), appointment_services(services(name))')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', clientRecord.id)
      .is('deleted_at', null)
      .lt('start_time', now)
      .order('start_time', { ascending: false })
      .limit(5),
  ])

  const nextAppointment = nextAppointmentRes.data as AppointmentRow | null
  const recentAppointments = (recentAppointmentsRes.data ?? []) as AppointmentRow[]

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
      <section className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-2xl font-extrabold text-white">
          {getInitials(clientRecord.fullName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-extrabold text-neutral-950">{clientRecord.fullName}</p>
          <p className="mt-1 truncate text-sm text-neutral-500">{clientRecord.email ?? clientRecord.phone}</p>
          <div className="mt-2 inline-flex rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--brand-primary)]">
            {clientRecord.tier} · {clientRecord.points} punti
          </div>
        </div>
      </section>

      <ClientProfileForm
        tenantId={tenant.tenant_id}
        fullName={clientRecord.fullName}
        email={clientRecord.email ?? ''}
        phone={clientRecord.phone ?? ''}
      />

      <section className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-[var(--brand-primary)]" />
          <h2 className="text-base font-extrabold text-neutral-950">Prossimo appuntamento</h2>
        </div>
        {nextAppointment ? (
          <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
            <p className="text-sm font-bold text-neutral-950">{formatDate(nextAppointment.start_time)}</p>
            <p className="mt-1 text-sm text-neutral-500">{getServiceNames(nextAppointment)}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              con {getStaffName(nextAppointment)}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
            Nessun appuntamento in programma.
            <Link href={tp('/prenota')} className="ml-1 font-bold text-[var(--brand-primary)]">
              Prenota ora
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <UserRound className="size-5 text-[var(--brand-primary)]" />
          <h2 className="text-base font-extrabold text-neutral-950">Ultimi appuntamenti</h2>
        </div>
        <div className="mt-4 divide-y divide-neutral-100">
          {recentAppointments.length > 0 ? (
            recentAppointments.map((appointment) => (
              <div key={appointment.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-bold text-neutral-950">{formatDate(appointment.start_time)}</p>
                <p className="mt-1 text-sm text-neutral-500">{getServiceNames(appointment)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500">Non hai ancora appuntamenti nello storico.</p>
          )}
        </div>
      </section>

      <Link
        href={tp('/punti')}
        className="flex min-h-14 items-center justify-between rounded-3xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-3 text-sm font-bold text-[var(--brand-primary)]"
      >
        <span className="inline-flex items-center gap-2">
          <Gift className="size-5" />
          Vai a punti e premi
        </span>
        <span>›</span>
      </Link>

      <div className="rounded-3xl border border-neutral-100 bg-white px-4 shadow-sm">
        <LogoutButton basePath={tp('')} />
      </div>
    </main>
  )
}
