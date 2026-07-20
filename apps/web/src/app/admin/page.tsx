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
  ShieldAlert,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react'

import { getAdminStats, getAdminGlobalOverview } from '@/app/admin/actions'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { SkeletonCard } from '@/components/admin/skeleton'
import { GrowthLineChart, SignupsBarChart } from './dashboard-client'

export const dynamic = 'force-dynamic'

// ─── Feed filter ──────────────────────────────────────────────
const FEED_EXCLUDED = new Set([
  'tenant.impersonation_started',
  'tenant.impersonation_stopped',
  'user.password_reset',
  'shadow.profile.update',
  'shadow.profile.upload_avatar',
])

const ACTION_LABEL: Record<string, string> = {
  'user.invited': 'Utente invitato',
  'user.created': 'Nuovo utente registrato',
  'tenant.created': 'Nuovo tenant creato',
  'tenant.suspended': 'Tenant sospeso',
  'tenant.activated': 'Tenant riattivato',
  'tenant.owner_assigned_by_email': 'Owner assegnato al tenant',
  'tenant.status_changed': 'Stato tenant cambiato',
  'client.seeded': 'Clienti importati',
}

// ─── Helpers ──────────────────────────────────────────────────
function formatEur(v: number) {
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(v)
  } catch {
    return `€${v}`
  }
}

function trimLeadingZeros(data: { month: string; count: number }[]) {
  const first = data.findIndex((d) => d.count > 0)
  const start = first <= 0 ? 0 : first - 1
  return data.slice(start).slice(-8)
}

// ─── Fascia 1 — Big stat card ─────────────────────────────────
function BigStatCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor = 'var(--admin-accent)',
  alert = false,
  href,
  valueNode,
}: {
  label: string
  value?: string | number
  sub?: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
  accentColor?: string
  alert?: boolean
  href?: string
  valueNode?: React.ReactNode
}) {
  const inner = (
    <div
      className={`admin-card relative flex flex-col gap-3 p-5 transition-shadow hover:shadow-[var(--shadow-lg)] ${
        alert ? 'border-amber-400/40' : ''
      }`}
      style={alert ? { background: 'rgba(251,191,36,0.035)' } : undefined}
    >
      {/* Accent bar */}
      <div
        className="h-0.5 w-8 rounded-full"
        style={{ backgroundColor: alert ? '#F59E0B' : accentColor }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--admin-text-subtle)' }}
          >
            {label}
          </span>

          {valueNode ?? (
            <span
              className="text-4xl font-bold tabular-nums leading-none"
              style={{
                color: alert ? '#F59E0B' : 'var(--admin-text)',
                fontFamily: 'var(--font-primary)',
              }}
            >
              {value}
            </span>
          )}

          {sub && (
            <span
              className="text-xs leading-snug"
              style={{ color: alert ? 'rgba(245,158,11,0.75)' : 'var(--admin-text-muted)' }}
            >
              {sub}
            </span>
          )}
        </div>

        <Icon
          size={18}
          style={{ color: alert ? '#F59E0B' : accentColor, opacity: 0.65 }}
          className="shrink-0 mt-0.5"
        />
      </div>

      {href && (
        <span
          className="mt-auto pt-1 text-[11px] font-semibold"
          style={{ color: alert ? '#F59E0B' : accentColor }}
        >
          Vedi tutti →
        </span>
      )}
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

// ─── Fascia 4 — Action alert card ─────────────────────────────
function ActionAlertCard({
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
    <Link href="/admin/tenants" className="block">
      <div className="relative admin-card border-amber-400/25 p-4 transition-shadow hover:shadow-[var(--shadow-md)]">
        <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] bg-amber-500/[0.04]" />
        <div className="relative flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
            {title}
          </span>
          <Icon className="h-4 w-4 shrink-0 text-amber-500" />
        </div>
        <div className="relative mt-2.5 flex flex-col gap-0.5">
          <span
            className="text-3xl font-bold tabular-nums text-amber-500"
            style={{ fontFamily: 'var(--font-primary)' }}
          >
            {count}
          </span>
          <span className="text-xs text-amber-500/75">{description}</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Main async content ───────────────────────────────────────
async function DashboardContent() {
  const [res, ovRes] = await Promise.all([getAdminStats(), getAdminGlobalOverview()])

  if (!res.success || !res.data) {
    return (
      <div className="admin-card p-5">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span>Impossibile caricare le statistiche: {res.error ?? 'errore sconosciuto'}</span>
        </div>
      </div>
    )
  }

  const s = res.data
  const ov = ovRes.success ? ovRes.data : undefined

  const totalAlerts =
    s.suspended_tenants +
    s.tenants_without_hours +
    s.tenants_without_services +
    s.tenants_without_owner

  const alertSub = [
    s.suspended_tenants > 0 && `${s.suspended_tenants} sospesi`,
    s.tenants_without_owner > 0 && `${s.tenants_without_owner} senza owner`,
    s.tenants_without_services > 0 && `${s.tenants_without_services} senza servizi`,
    s.tenants_without_hours > 0 && `${s.tenants_without_hours} senza orari`,
  ]
    .filter(Boolean)
    .join(' · ')

  const filteredFeed = (s.recent_events ?? [])
    .filter((e) => !FEED_EXCLUDED.has(e.action) && !e.action.startsWith('shadow.'))
    .slice(0, 10)

  const growthData = trimLeadingZeros(s.growth_by_month ?? [])
  const signupsData = trimLeadingZeros(s.signups_by_month ?? [])

  const hasActionAlerts =
    s.suspended_tenants > 0 ||
    s.tenants_without_owner > 0 ||
    s.tenants_without_services > 0 ||
    s.tenants_without_hours > 0

  return (
    <div className="flex flex-col gap-6">

      {/* ── FASCIA 1: Salute piattaforma ────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <BigStatCard
          label="Tenant attivi"
          value={s.active_tenants}
          sub={`su ${s.total_tenants} totali`}
          icon={Building2}
          accentColor="#3B82F6"
          href="/admin/tenants"
        />
        <BigStatCard
          label="Nuovi iscritti (30g)"
          value={s.new_signups_30d}
          sub="Ultimi 30 giorni"
          icon={UserPlus}
          accentColor="var(--admin-accent)"
        />
        <BigStatCard
          label="Appuntamenti (30g)"
          value={ov?.appointments_30d ?? '—'}
          sub="Volume operativo piattaforma"
          icon={Activity}
          accentColor="#8B5CF6"
        />
        {totalAlerts === 0 ? (
          <BigStatCard
            label="Stato piattaforma"
            icon={CheckCircle2}
            accentColor="#10B981"
            valueNode={
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
                <span
                  className="text-sm font-semibold text-emerald-600"
                  style={{ fontFamily: 'var(--font-primary)' }}
                >
                  Tutto in ordine
                </span>
              </div>
            }
            sub="Nessun alert attivo"
          />
        ) : (
          <BigStatCard
            label="Richiedono attenzione"
            value={totalAlerts}
            sub={alertSub}
            icon={AlertTriangle}
            alert
            href="/admin/tenants"
          />
        )}
      </div>

      {/* ── FASCIA 2: Revenue + dati secondari ──────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Revenue — coming soon */}
        <div
          className="admin-card flex items-center gap-4 p-4"
          style={{ opacity: 0.75 }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--admin-surface-2)' }}
          >
            <Euro size={16} style={{ color: 'var(--admin-text-subtle)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--admin-text-subtle)' }}
              >
                GMV · MRR
              </span>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  borderColor: 'var(--admin-border)',
                  color: 'var(--admin-text-subtle)',
                  fontFamily: 'var(--font-primary)',
                }}
              >
                Tracking in arrivo
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Collega i pagamenti per attivare il tracking del fatturato
            </p>
          </div>
        </div>

        {/* Platform summary */}
        <div className="admin-card p-4">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--admin-text-subtle)' }}
          >
            Dati piattaforma
          </span>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: 'Staff totali', value: s.total_staff },
              { label: 'Servizi', value: s.total_services },
              { label: 'Piani', value: s.total_plans },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span
                  className="text-xl font-bold tabular-nums leading-none"
                  style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}
                >
                  {value}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FASCIA 3: Charts ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="admin-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--admin-text)' }}
              >
                Crescita tenants
              </h2>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Cumulativo — ultimi {growthData.length} mesi
              </p>
            </div>
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--admin-text-subtle)' }} />
          </div>
          <GrowthLineChart data={growthData} />
        </div>

        <div className="admin-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--admin-text)' }}
              >
                Nuovi utenti per mese
              </h2>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Iscrizioni profilo — ultimi {signupsData.length} mesi
              </p>
            </div>
            <UserPlus className="h-4 w-4" style={{ color: 'var(--admin-text-subtle)' }} />
          </div>
          <SignupsBarChart data={signupsData} />
        </div>
      </div>

      {/* ── FASCIA 4a: Action items ──────────────────────── */}
      {hasActionAlerts && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {s.suspended_tenants > 0 && (
            <ActionAlertCard
              icon={ShieldAlert}
              title="Sospesi"
              count={s.suspended_tenants}
              description="Verifica il motivo."
            />
          )}
          {s.tenants_without_owner > 0 && (
            <ActionAlertCard
              icon={Users}
              title="Senza owner"
              count={s.tenants_without_owner}
              description="Onboarding incompleto."
            />
          )}
          {s.tenants_without_services > 0 && (
            <ActionAlertCard
              icon={Wrench}
              title="Senza servizi"
              count={s.tenants_without_services}
              description="Nessun servizio configurato."
            />
          )}
          {s.tenants_without_hours > 0 && (
            <ActionAlertCard
              icon={Clock}
              title="Senza orari"
              count={s.tenants_without_hours}
              description="Orari di apertura mancanti."
            />
          )}
        </div>
      )}

      {/* ── FASCIA 4b: Filtered event feed ──────────────── */}
      <div className="admin-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ color: 'var(--admin-text)' }}
            >
              Attività recente
            </h2>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Impersonation e log tecnici esclusi
            </p>
          </div>
          <Bell className="h-4 w-4" style={{ color: 'var(--admin-text-subtle)' }} />
        </div>

        {filteredFeed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 size={22} className="text-emerald-400 opacity-50" />
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Nessuna attività rilevante da segnalare
            </p>
          </div>
        ) : (
          <ul
            className="divide-y"
            style={{ borderColor: 'var(--admin-border)' }}
          >
            {filteredFeed.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 py-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: 'var(--admin-surface-2)',
                    color: 'var(--admin-text-subtle)',
                  }}
                >
                  <Activity className="h-3 w-3" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {ACTION_LABEL[ev.action] ?? ev.action}
                  </span>
                  {ev.entity_type && (
                    <span
                      className="inline-block w-fit rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                      style={{
                        background: 'var(--admin-surface-2)',
                        color: 'var(--admin-text-subtle)',
                      }}
                    >
                      {ev.entity_type}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--admin-text-subtle)' }}>
                    {new Date(ev.created_at).toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-36" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="h-72" />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]} />
        <h1
          className="mt-1 text-2xl font-bold tracking-tight"
          style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}
        >
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Panoramica della piattaforma Styll
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
