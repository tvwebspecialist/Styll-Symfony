'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Activity,
  Globe,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  CalendarCheck,
  LogIn,
  MousePointerClick,
  TrendingUp,
  Clock,
} from 'lucide-react'
import type { SiteAnalyticsDailyRow as DailyRow } from '@/lib/site-analytics/daily'

// ── Types ────────────────────────────────────────────────────────

interface Props {
  tenantName: string
  period: number
  websiteDaily: DailyRow[]
  pwaDaily: DailyRow[]
  lastLoginAt: string | null
  appointmentsInPeriod: number
}

// ── Palette ──────────────────────────────────────────────────────
const BLUE = '#3B82F6'
const ACCENT = '#E94560'
const PURPLE = '#8B5CF6'
const EMERALD = '#10B981'

// ── Helpers ──────────────────────────────────────────────────────

function sum(rows: DailyRow[], key: keyof DailyRow): number {
  return rows.reduce((s, r) => s + (r[key] as number), 0)
}

function fmtNum(n: number): string {
  return n.toLocaleString('it-IT')
}

function fmtPct(n: number, d = 1): string {
  return `${(n * 100).toFixed(d)}%`
}

function fmtDate(dateStr: string): string {
  const p = dateStr.split('-')
  return p.length === 3 ? `${parseInt(p[2])}/${parseInt(p[1])}` : dateStr
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function fmtLastLogin(iso: string | null): string {
  if (!iso) return 'Mai registrato'
  const d = daysSince(iso)
  if (d === null) return '—'
  if (d === 0) return 'Oggi'
  if (d === 1) return 'Ieri'
  return `${d} giorni fa`
}

function healthColor(iso: string | null): string {
  const d = daysSince(iso)
  if (d === null) return '#9CA3AF'
  if (d <= 7) return EMERALD
  if (d <= 21) return '#F59E0B'
  return '#EF4444'
}

// ── Period Tabs ──────────────────────────────────────────────────

const PERIODS = [
  { label: '7 giorni', value: 7 },
  { label: '30 giorni', value: 30 },
  { label: '90 giorni', value: 90 },
] as const

function PeriodTabs({ current }: { current: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <div
      className="flex items-center gap-1 rounded-xl p-1"
      style={{ background: 'var(--admin-surface-2)' }}
      role="tablist"
      aria-label="Periodo"
    >
      {PERIODS.map(({ label, value }) => {
        const active = current === value
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={pending}
            onClick={() => startTransition(() => router.push(`?days=${value}`))}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
            style={{
              outlineColor: ACCENT,
              background: active ? 'var(--admin-surface)' : 'transparent',
              color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Metric Card ──────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: string
}

function MetricCard({ label, value, sub, icon: Icon, accent = ACCENT }: MetricCardProps) {
  return (
    <div className="admin-card flex flex-col gap-2.5 p-4">
      <div className="h-0.5 w-6 rounded-full" style={{ backgroundColor: accent }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--admin-text-subtle)' }}
          >
            {label}
          </span>
          <span
            className="text-3xl font-bold tabular-nums leading-none"
            style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}
          >
            {value}
          </span>
          {sub && (
            <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              {sub}
            </span>
          )}
        </div>
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent, opacity: 0.55 }} aria-hidden />
      </div>
    </div>
  )
}

// ── Section Header ───────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ElementType
  title: string
  subtitle: string
  accentColor: string
}

function SectionHeader({ icon: Icon, title, subtitle, accentColor }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${accentColor}14` }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color: accentColor }} aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}>
          {title}
        </h2>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

// ── Tooltip style ────────────────────────────────────────────────

const TT_STYLE = {
  background: 'var(--admin-surface)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--admin-text)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

// ── Empty chart state ────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
      <TrendingUp className="h-6 w-6 opacity-15" style={{ color: 'var(--admin-text-muted)' }} aria-hidden />
      <p className="text-xs" style={{ color: 'var(--admin-text-subtle)' }}>{message}</p>
    </div>
  )
}

// ── Section: Dashboard barbiere ──────────────────────────────────

function DashboardSection({
  lastLoginAt,
  appointmentsInPeriod,
  period,
}: {
  lastLoginAt: string | null
  appointmentsInPeriod: number
  period: number
}) {
  const loginColor = healthColor(lastLoginAt)
  const loginLabel = fmtLastLogin(lastLoginAt)

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        icon={Activity}
        title="Dashboard barbiere"
        subtitle="Utilizzo del pannello di gestione da parte del barbiere e dello staff"
        accentColor={PURPLE}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="admin-card flex flex-col gap-2.5 p-4">
          <div className="h-0.5 w-6 rounded-full" style={{ backgroundColor: loginColor }} />
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-subtle)' }}>
                Ultimo accesso
              </span>
              <span
                className="text-2xl font-bold leading-tight"
                style={{ color: loginColor, fontFamily: 'var(--font-primary)' }}
              >
                {loginLabel}
              </span>
            </div>
            <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: loginColor, opacity: 0.55 }} aria-hidden />
          </div>
        </div>
        <MetricCard
          label={`Appuntamenti (${period}gg)`}
          value={fmtNum(appointmentsInPeriod)}
          sub="creati nel periodo"
          icon={CalendarCheck}
          accent={PURPLE}
        />
        <div
          className="admin-card flex flex-col justify-center gap-1 p-4 text-center sm:hidden"
          style={{ background: 'var(--admin-surface-2)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-subtle)' }}>
            Tracking avanzato
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Login staff, azioni CRM — in arrivo
          </p>
        </div>
        <div
          className="admin-card hidden flex-col justify-center gap-1 p-4 text-center sm:flex"
          style={{ background: 'var(--admin-surface-2)', opacity: 0.7 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-subtle)' }}>
            Tracking avanzato
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Login staff, azioni CRM — in arrivo
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Section: Sito pubblico ───────────────────────────────────────

function WebsiteSection({ daily, period }: { daily: DailyRow[]; period: number }) {
  const totalSessions = sum(daily, 'sessions')
  const totalPageViews = sum(daily, 'page_views')
  const totalBookings = sum(daily, 'booking_completed')
  const convRate = totalSessions > 0 ? totalBookings / totalSessions : 0
  const hasData = daily.length > 0

  const chartData = daily.map((r) => ({ ...r, date_label: fmtDate(r.date) }))

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        icon={Globe}
        title="Sito pubblico"
        subtitle="Traffico di acquisizione pre-prenotazione — funnel visita → booking"
        accentColor={BLUE}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Sessioni" value={fmtNum(totalSessions)} sub={`${period} giorni`} icon={TrendingUp} accent={BLUE} />
        <MetricCard label="Pagine viste" value={fmtNum(totalPageViews)} sub="visite totali" icon={ArrowUpRight} accent={BLUE} />
        <MetricCard label="Prenotazioni" value={fmtNum(totalBookings)} sub="completate dal sito" icon={CalendarCheck} accent={BLUE} />
        <MetricCard
          label="Conversione"
          value={fmtPct(convRate)}
          sub="visita → prenotazione"
          icon={MousePointerClick}
          accent={convRate < 0.03 && totalSessions > 20 ? '#F59E0B' : BLUE}
        />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-5 pb-3 pt-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Andamento sessioni e prenotazioni
          </h3>
        </div>
        {hasData ? (
          <div className="h-48 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad-web-sessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-web-bookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                <XAxis dataKey="date_label" tick={{ fontSize: 10, fill: 'var(--admin-text-subtle)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-subtle)' }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip contentStyle={TT_STYLE} />
                <Area type="monotone" dataKey="sessions" name="Sessioni" stroke={BLUE} strokeWidth={2} fill="url(#grad-web-sessions)" dot={false} activeDot={{ r: 4, fill: BLUE }} />
                <Area type="monotone" dataKey="booking_completed" name="Prenotazioni" stroke={ACCENT} strokeWidth={2} fill="url(#grad-web-bookings)" dot={false} activeDot={{ r: 4, fill: ACCENT }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Nessuna visita al sito pubblico nel periodo selezionato" />
        )}
      </div>
    </section>
  )
}

// ── Section: App PWA ─────────────────────────────────────────────

function PwaSection({ daily, period }: { daily: DailyRow[]; period: number }) {
  const totalSessions = sum(daily, 'sessions')
  const totalPageViews = sum(daily, 'page_views')
  const totalLogins = sum(daily, 'logins')
  const totalSignups = sum(daily, 'new_signups')
  const hasData = daily.length > 0

  const chartData = daily.map((r) => ({ ...r, date_label: fmtDate(r.date) }))

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        icon={Smartphone}
        title="App PWA"
        subtitle="Utilizzo post-prenotazione — sessioni, accessi, engagement clienti nell'app installata"
        accentColor={ACCENT}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Sessioni" value={fmtNum(totalSessions)} sub={`${period} giorni`} icon={TrendingUp} accent={ACCENT} />
        <MetricCard label="Pagine viste" value={fmtNum(totalPageViews)} sub="nell'app" icon={ArrowDownRight} accent={ACCENT} />
        <MetricCard label="Accessi" value={fmtNum(totalLogins)} sub="login cliente" icon={LogIn} accent={ACCENT} />
        <MetricCard label="Nuovi account" value={fmtNum(totalSignups)} sub="registrazioni" icon={ArrowUpRight} accent={EMERALD} />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-5 pb-3 pt-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Andamento sessioni e accessi
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            La conversion rate non è mostrata: l&apos;obiettivo nella PWA è l&apos;engagement, non l&apos;acquisizione
          </p>
        </div>
        {hasData ? (
          <div className="h-48 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad-pwa-sessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-pwa-logins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={EMERALD} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={EMERALD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                <XAxis dataKey="date_label" tick={{ fontSize: 10, fill: 'var(--admin-text-subtle)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-subtle)' }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip contentStyle={TT_STYLE} />
                <Area type="monotone" dataKey="sessions" name="Sessioni" stroke={ACCENT} strokeWidth={2} fill="url(#grad-pwa-sessions)" dot={false} activeDot={{ r: 4, fill: ACCENT }} />
                <Area type="monotone" dataKey="logins" name="Accessi" stroke={EMERALD} strokeWidth={2} fill="url(#grad-pwa-logins)" dot={false} activeDot={{ r: 4, fill: EMERALD }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Nessuna sessione PWA nel periodo selezionato" />
        )}
      </div>
    </section>
  )
}

// ── Root client component ────────────────────────────────────────

export function TenantAnalyticsClient({
  tenantName,
  period,
  websiteDaily,
  pwaDaily,
  lastLoginAt,
  appointmentsInPeriod,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      {/* Period selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodTabs current={period} />
        <p className="text-xs" style={{ color: 'var(--admin-text-subtle)' }}>
          {tenantName} · dati aggiornati ogni notte
        </p>
      </div>

      <DashboardSection
        lastLoginAt={lastLoginAt}
        appointmentsInPeriod={appointmentsInPeriod}
        period={period}
      />

      <div className="h-px" style={{ background: 'var(--admin-border)' }} />

      <WebsiteSection daily={websiteDaily} period={period} />

      <div className="h-px" style={{ background: 'var(--admin-border)' }} />

      <PwaSection daily={pwaDaily} period={period} />
    </div>
  )
}
