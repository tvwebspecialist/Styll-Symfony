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

import { getAdminStats, getAdminGlobalOverview } from '@/app/admin/actions'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { SkeletonCard } from '@/components/admin/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { GrowthLineChart, SignupsBarChart } from './dashboard-client'

export const dynamic = 'force-dynamic'

const cardClass = 'admin-card p-5'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  alert = false,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconBg: string
  iconColor: string
  alert?: boolean
}) {
  return (
    <div
      className={`admin-card relative flex flex-col gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lg)] ${
        alert ? 'border-amber-500/30' : ''
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>

      <div className="flex flex-col gap-0.5">
        <span
          className={`text-3xl font-bold tabular-nums leading-none ${alert ? 'text-amber-500' : ''}`}
          style={alert ? undefined : { color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}
        >
          {value}
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--admin-text-subtle)' }}>
          {label}
        </span>
      </div>

      {sub && (
        <span className={`text-xs ${alert ? 'text-amber-500/80' : ''}`} style={alert ? undefined : { color: 'var(--admin-text-muted)' }}>
          {sub}
        </span>
      )}

      {alert && (
        <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/[0.04]" />
      )}
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
  const [res, ovRes] = await Promise.all([getAdminStats(), getAdminGlobalOverview()])
  if (!res.success || !res.data) {
    return (
      <div className={cardClass}>
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span>Impossibile caricare le statistiche: {res.error ?? 'errore sconosciuto'}</span>
        </div>
      </div>
    )
  }

  const s = res.data
  const ov = ovRes.success ? ovRes.data : undefined
  const events = (s.recent_events ?? []).slice(0, 20)

  return (
    <div className="flex flex-col gap-6">
      {/* Global Overview hero — 4 KPI principali */}
      {ov ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Volume d'affari (GMV)"
            value={formatEur(ov.total_revenue)}
            sub="Pagamenti totali ai saloni"
            icon={Euro}
            iconBg="bg-emerald-500/15"
            iconColor="text-emerald-400"
          />
          <StatCard
            label="MRR (Abbonamenti)"
            value={formatEur(s.mrr)}
            sub="Ricavo mensile piattaforma"
            icon={TrendingUp}
            iconBg="bg-emerald-600/15"
            iconColor="text-emerald-300"
          />
          <StatCard
            label="Tenant Attivi"
            value={ov.active_tenants}
            sub="Saloni con stato attivo"
            icon={Building2}
            iconBg="bg-blue-500/15"
            iconColor="text-blue-400"
          />
          <StatCard
            label="Appuntamenti (30g)"
            value={ov.appointments_30d}
            sub="Ultimi 30 giorni globali"
            icon={Activity}
            iconBg="bg-violet-500/15"
            iconColor="text-violet-400"
          />
        </div>
      ) : null}

      {/* Top Tenants */}
      {ov && ov.top_tenants.length > 0 ? (
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Top Tenants</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Per volume vendite (totale incassato)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-[var(--admin-text-subtle)]" />
          </div>
          <div className="divide-y divide-white/5">
            {ov.top_tenants.map((t, idx) => (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="flex items-center gap-3 py-3 hover:bg-white/5 -mx-2 px-2 rounded-xl transition"
              >
                <span className="w-5 text-xs font-semibold text-[var(--admin-text-subtle)] tabular-nums">
                  {idx + 1}
                </span>
                {t.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.logo_url}
                    alt=""
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-[var(--admin-text)]"
                    style={{ backgroundColor: t.primary_color || '#52525b' }}
                  >
                    {t.business_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--admin-text)] truncate">{t.business_name}</div>
                  <div className="text-xs text-[var(--admin-text-muted)]">
                    {t.appointments_30d} appuntamenti negli ultimi 30g
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums text-[var(--admin-text)]">
                  {formatEur(t.total_revenue)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Stats row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Totale tenants"
          value={s.total_tenants}
          sub={`${s.total_plans} piani disponibili`}
          icon={Building2}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Tenants attivi"
          value={s.active_tenants}
          sub={`su ${s.total_tenants} totali`}
          icon={CheckCircle2}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Staff totali"
          value={s.total_staff}
          sub={`${s.total_services} servizi configurati`}
          icon={Users}
          iconBg="bg-indigo-500/15"
          iconColor="text-indigo-400"
        />
        <StatCard
          label="MRR"
          value={formatEur(s.mrr)}
          sub="Ricavo mensile ricorrente"
          icon={Euro}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
        />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Nuovi iscritti (7g)"
          value={s.new_signups_7d}
          sub="Ultimi 7 giorni"
          icon={TrendingUp}
          iconBg="bg-purple-500/15"
          iconColor="text-purple-400"
        />
        <StatCard
          label="Nuovi iscritti (30g)"
          value={s.new_signups_30d}
          sub="Ultimi 30 giorni"
          icon={UserPlus}
          iconBg="bg-purple-500/15"
          iconColor="text-purple-400"
        />
        <StatCard
          label="Tenants sospesi"
          value={s.suspended_tenants}
          sub={s.suspended_tenants > 0 ? 'Richiede attenzione' : 'Tutto in regola'}
          icon={ShieldAlert}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          alert={s.suspended_tenants > 0}
        />
        <StatCard
          label="Senza servizi"
          value={s.tenants_without_services}
          sub={s.tenants_without_services > 0 ? 'Onboarding incompleto' : 'Onboarding ok'}
          icon={Wrench}
          iconBg="bg-orange-500/15"
          iconColor="text-orange-400"
          alert={s.tenants_without_services > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Crescita tenants (12 mesi)</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Tenants cumulativi per mese</p>
            </div>
            <TrendingUp className="h-4 w-4 text-[var(--admin-text-subtle)]" />
          </div>
          <GrowthLineChart data={s.growth_by_month ?? []} />
        </div>
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Nuovi utenti per mese</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Iscrizioni profilo</p>
            </div>
            <UserPlus className="h-4 w-4 text-[var(--admin-text-subtle)]" />
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
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Eventi recenti</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">Ultime attività amministrative</p>
          </div>
          <Bell className="h-4 w-4 text-[var(--admin-text-subtle)]" />
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-subtle)]">Nessun evento</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {events.map((ev) => {
              const Icon = eventIcon(ev.action)
              return (
                <li key={ev.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--admin-surface-2)', color: 'var(--admin-text-subtle)' }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[var(--admin-text)]">{ev.action}</span>
                      <span className="rounded-md bg-[var(--admin-surface-2)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--admin-text-muted)]">
                        {ev.entity_type}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--admin-text-subtle)]">
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
    <div className="relative admin-card border-amber-500/30 p-5">
      <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] bg-amber-500/[0.05]" />
      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500">
          {title}
        </span>
        <Icon className="h-5 w-5 text-amber-500" />
      </div>
      <div className="relative mt-3 flex flex-col gap-1">
        <span className="text-3xl font-bold tabular-nums text-amber-500" style={{ fontFamily: 'var(--font-primary)' }}>
          {count}
        </span>
        <span className="text-xs text-amber-500/80">{description}</span>
      </div>
      <Link
        href="/admin/tenants"
        className="relative mt-3 inline-flex text-xs font-semibold text-amber-500 hover:underline"
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
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}>Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Panoramica della piattaforma Styll</p>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
