import { Suspense } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Euro,
  MapPin,
  Plus,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react'

import { getAdminStats } from '@/app/admin/actions'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { SkeletonCard } from '@/components/admin/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { GrowthLineChart, SignupsBarChart } from './dashboard-client'

export const dynamic = 'force-dynamic'

const cardClass =
  'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  alert = false,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  alert?: boolean
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon
          className={
            alert
              ? 'h-5 w-5 text-amber-500'
              : 'h-5 w-5 text-muted-foreground/70'
          }
        />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <span
          className={
            alert
              ? 'text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400'
              : 'text-3xl font-bold tabular-nums'
          }
        >
          {value}
        </span>
        {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
      </div>
    </div>
  )
}

function eventIcon(action: string) {
  const a = action.toLowerCase()
  if (a.includes('create') || a.includes('insert')) return Plus
  if (a.includes('delete')) return AlertTriangle
  if (a.includes('suspend') || a.includes('block')) return ShieldAlert
  if (a.includes('login') || a.includes('signin')) return UserPlus
  if (a.includes('update') || a.includes('edit')) return Wrench
  return Activity
}

function formatEur(value: number) {
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `€ ${value.toFixed(0)}`
  }
}

async function DashboardContent() {
  const res = await getAdminStats()
  if (!res.success || !res.data) {
    return (
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span>Impossibile caricare le statistiche: {res.error ?? 'errore sconosciuto'}</span>
        </div>
      </div>
    )
  }

  const s = res.data
  const events = (s.recent_events ?? []).slice(0, 20)

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Totale tenants"
          value={s.total_tenants}
          sub={`${s.total_plans} piani disponibili`}
          icon={Building2}
        />
        <StatCard
          label="Tenants attivi"
          value={s.active_tenants}
          sub={`su ${s.total_tenants} totali`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Utenti totali"
          value={s.total_users}
          sub={`${s.total_services} servizi configurati`}
          icon={Users}
        />
        <StatCard
          label="MRR"
          value={formatEur(s.mrr)}
          sub="Ricavo mensile ricorrente"
          icon={Euro}
        />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Nuovi iscritti (7g)"
          value={s.new_signups_7d}
          sub="Ultimi 7 giorni"
          icon={TrendingUp}
        />
        <StatCard
          label="Nuovi iscritti (30g)"
          value={s.new_signups_30d}
          sub="Ultimi 30 giorni"
          icon={UserPlus}
        />
        <StatCard
          label="Tenants sospesi"
          value={s.suspended_tenants}
          sub={s.suspended_tenants > 0 ? 'Richiede attenzione' : 'Tutto in regola'}
          icon={ShieldAlert}
          alert={s.suspended_tenants > 0}
        />
        <StatCard
          label="Tenants senza servizi"
          value={s.tenants_without_services}
          sub={s.tenants_without_services > 0 ? 'Onboarding incompleto' : 'Onboarding ok'}
          icon={Wrench}
          alert={s.tenants_without_services > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Crescita tenants (12 mesi)</h2>
              <p className="text-xs text-muted-foreground">Tenants cumulativi per mese</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <GrowthLineChart data={s.growth_by_month ?? []} />
        </div>
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Nuovi utenti per mese</h2>
              <p className="text-xs text-muted-foreground">Iscrizioni profilo</p>
            </div>
            <UserPlus className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <SignupsBarChart data={s.signups_by_month ?? []} />
        </div>
      </div>

      {/* Alerts grid */}
      {(s.tenants_without_services > 0 ||
        s.tenants_without_hours > 0 ||
        s.tenants_without_locations > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {s.tenants_without_services > 0 ? (
            <AlertCard
              icon={Wrench}
              title="Tenants senza servizi"
              count={s.tenants_without_services}
              description="Onboarding incompleto: nessun servizio configurato."
            />
          ) : null}
          {s.tenants_without_hours > 0 ? (
            <AlertCard
              icon={Clock}
              title="Tenants senza orari"
              count={s.tenants_without_hours}
              description="Mancano gli orari di apertura."
            />
          ) : null}
          {s.tenants_without_locations > 0 ? (
            <AlertCard
              icon={MapPin}
              title="Tenants senza sedi"
              count={s.tenants_without_locations}
              description="Nessuna sede registrata."
            />
          ) : null}
        </div>
      )}

      {/* Recent events */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Eventi recenti</h2>
            <p className="text-xs text-muted-foreground">Ultime attività amministrative</p>
          </div>
          <Bell className="h-4 w-4 text-muted-foreground/70" />
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun evento</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {events.map((ev) => {
              const Icon = eventIcon(ev.action)
              return (
                <li key={ev.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{ev.action}</span>
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {ev.entity_type}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString('it-IT')}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/admin/tenants" className={buttonVariants({ size: 'lg' })}>
          <Plus className="h-4 w-4" />
          Nuovo tenant
        </Link>
        <Link href="/admin/users" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          <UserPlus className="h-4 w-4" />
          Invita utente
        </Link>
        <Link href="/admin/tenants" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          <AlertTriangle className="h-4 w-4" />
          Vedi tutti gli alert
        </Link>
      </div>
    </div>
  )
}

function AlertCard({
  icon: Icon,
  title,
  count,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count: number
  description: string
}) {
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          {title}
        </span>
        <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <span className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
          {count}
        </span>
        <span className="text-xs text-amber-700/80 dark:text-amber-300/80">{description}</span>
      </div>
      <Link
        href="/admin/tenants"
        className="mt-3 inline-flex text-xs font-medium text-amber-800 hover:underline dark:text-amber-300"
      >
        Vedi tenants →
      </Link>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
    </div>
  )
}

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Panoramica della piattaforma Styll
          </p>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
