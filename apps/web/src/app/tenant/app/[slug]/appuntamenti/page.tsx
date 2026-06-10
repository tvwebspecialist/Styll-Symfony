import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

interface Props {
  params: Promise<{ slug: string }>
}

type AppStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'

const STATUS_LABELS: Record<AppStatus, string> = {
  confirmed: 'Confermato',
  pending: 'In attesa',
  completed: 'Completato',
  cancelled: 'Cancellato',
  no_show: 'Non presentato',
}

const STATUS_STYLES: Record<AppStatus, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-neutral-100 text-neutral-600',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-red-50 text-red-400',
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

export default async function AppuntamentiPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
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
      <main className="min-h-screen bg-white px-5 pt-6">
        <p className="text-sm text-neutral-500">Nessun profilo associato a questo salone.</p>
      </main>
    )
  }

  const now = new Date().toISOString()
  const [upcomingRes, pastRes] = await Promise.all([
    db
      .from('appointments')
      .select('id, start_time, status, appointment_services(services(name))')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', now)
      .order('start_time', { ascending: true }),
    db
      .from('appointments')
      .select('id, start_time, status, appointment_services(services(name))')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .not('status', 'in', '("confirmed","pending")')
      .order('start_time', { ascending: false })
      .limit(20),
  ])

  const upcoming = upcomingRes.data ?? []
  const past = pastRes.data ?? []

  function getServiceNames(row: { appointment_services: { services: { name: string | null } | { name: string | null }[] | null }[] | null }): string {
    const services = row.appointment_services ?? []
    return services
      .map((as) => {
        const s = as.services
        if (!s) return null
        if (Array.isArray(s)) return s[0]?.name
        return s.name
      })
      .filter(Boolean)
      .join(', ') || 'Appuntamento'
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-xl px-5 pt-4">
        <div className="mb-6 flex items-center gap-2">
          <Link href={tp('/profilo')} className="flex items-center gap-1 text-sm text-neutral-500 active:opacity-60">
            <ChevronLeft className="size-4" />
            Profilo
          </Link>
        </div>

        <h1 className="text-2xl font-extrabold text-neutral-950 mb-6">I miei appuntamenti</h1>

        {/* Prossimi */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Prossimi</h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-5 py-8 text-center">
              <p className="text-sm text-neutral-400">Nessun appuntamento in programma</p>
              <Link
                href={tp('/prenota')}
                className="mt-3 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white active:opacity-80"
                style={{ backgroundColor: tenant.primary_color ?? '#1a1a1a' }}
              >
                Prenota ora
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map((apt) => (
                <div key={apt.id} className="rounded-2xl bg-white border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{getServiceNames(apt as Parameters<typeof getServiceNames>[0])}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{formatDate(apt.start_time)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[apt.status as AppStatus] ?? 'bg-neutral-100 text-neutral-500'}`}>
                      {STATUS_LABELS[apt.status as AppStatus] ?? apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Passati */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Storico</h2>
            <div className="flex flex-col gap-3">
              {past.map((apt) => (
                <div key={apt.id} className="rounded-2xl bg-white border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{getServiceNames(apt as Parameters<typeof getServiceNames>[0])}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{formatDate(apt.start_time)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[apt.status as AppStatus] ?? 'bg-neutral-100 text-neutral-500'}`}>
                      {STATUS_LABELS[apt.status as AppStatus] ?? apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
