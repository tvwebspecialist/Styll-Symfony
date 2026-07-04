'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Building2,
  MousePointerClick,
  TrendingUp,
} from 'lucide-react'
import type { AdminSiteAnalyticsData, TenantAnalyticsRow } from '@/lib/admin/site-analytics-queries'

// ── Palette ─────────────────────────────────────────────────────
const ACCENT = '#E94560'
const BLUE = '#3B82F6'
const PURPLE = '#8B5CF6'
const WARNING = '#F59E0B'
const EMERALD = '#10B981'
const RED = '#EF4444'

// ── Pure helpers ─────────────────────────────────────────────────

function formatNum(n: number): string {
  return n.toLocaleString('it-IT')
}

function formatPct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return (current - prev) / prev
}

function formatDayLabel(dayStr: string): string {
  const parts = dayStr.split('-')
  if (parts.length !== 3) return dayStr
  return `${parseInt(parts[2])}/${parseInt(parts[1])}`
}

interface HealthSignal {
  label: string
  bgColor: string
  textColor: string
  dotColor: string
}

function healthSignal(lastLoginAt: string | null): HealthSignal {
  if (!lastLoginAt) {
    return { label: 'N/D', bgColor: 'rgba(156,163,175,0.1)', textColor: '#9CA3AF', dotColor: '#9CA3AF' }
  }
  const days = Math.floor((Date.now() - new Date(lastLoginAt).getTime()) / 86400000)
  if (days <= 7) {
    return { label: `${days}g fa`, bgColor: 'rgba(16,185,129,0.1)', textColor: '#059669', dotColor: EMERALD }
  }
  if (days <= 21) {
    return { label: `${days}g fa`, bgColor: 'rgba(245,158,11,0.1)', textColor: '#D97706', dotColor: WARNING }
  }
  return { label: `${days}g fa`, bgColor: 'rgba(239,68,68,0.1)', textColor: '#DC2626', dotColor: RED }
}

// ── Period Tabs ─────────────────────────────────────────────────

const PERIOD_OPTIONS = [
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
      aria-label="Periodo di analisi"
    >
      {PERIOD_OPTIONS.map(({ label, value }) => {
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

// ── Delta badge ─────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const positive = delta >= 0
  const label = `${positive ? '+' : ''}${(delta * 100).toFixed(1)}%`
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className="flex items-center gap-0.5 text-xs font-semibold tabular-nums"
      style={{ color: positive ? EMERALD : RED }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}

// ── Summary Card ────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string
  sub?: string
  delta?: number | null
  accentColor?: string
  warning?: boolean
  icon: React.ElementType
}

function SummaryCard({
  label,
  value,
  sub,
  delta,
  accentColor = ACCENT,
  warning = false,
  icon: Icon,
}: SummaryCardProps) {
  return (
    <div
      className="admin-card flex flex-col gap-3 p-5"
      style={
        warning
          ? { background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.25)' }
          : undefined
      }
    >
      <div
        className="h-0.5 w-8 rounded-full"
        style={{ backgroundColor: warning ? WARNING : accentColor }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: warning ? '#D97706' : 'var(--admin-text-subtle)' }}
          >
            {label}
          </span>
          <span
            className="text-4xl font-bold tabular-nums leading-none"
            style={{
              color: warning ? WARNING : 'var(--admin-text)',
              fontFamily: 'var(--font-primary)',
            }}
          >
            {value}
          </span>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {delta !== undefined && <DeltaBadge delta={delta} />}
            {sub && (
              <span
                className="text-xs"
                style={{ color: warning ? 'rgba(245,158,11,0.7)' : 'var(--admin-text-muted)' }}
              >
                {sub}
              </span>
            )}
          </div>
        </div>
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: warning ? WARNING : accentColor, opacity: 0.6 }} aria-hidden />
      </div>
    </div>
  )
}

// ── Area Chart ──────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = {
  background: 'var(--admin-surface)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--admin-text)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

interface PlatformAreaChartProps {
  daily: AdminSiteAnalyticsData['daily']
  sessionDelta: number | null
  insightText: string
}

function PlatformAreaChart({ daily, sessionDelta, insightText }: PlatformAreaChartProps) {
  const isEmpty = daily.length === 0
  const positiveSession = sessionDelta !== null && sessionDelta >= 0

  const chartData = daily.map((d) => ({
    ...d,
    day_label: formatDayLabel(d.day),
  }))

  return (
    <div className="admin-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Andamento visite
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Sessioni e prenotazioni completate, aggregate per giorno
          </p>
        </div>
        {sessionDelta !== null && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums"
            style={{
              background: positiveSession ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: positiveSession ? EMERALD : RED,
            }}
            aria-label={`Variazione sessioni: ${sessionDelta >= 0 ? '+' : ''}${(sessionDelta * 100).toFixed(1)}%`}
          >
            {positiveSession ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            )}
            {sessionDelta >= 0 ? '+' : ''}
            {(sessionDelta * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Chart or empty */}
      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <BarChart2 className="h-8 w-8 opacity-15" style={{ color: 'var(--admin-text-muted)' }} aria-hidden />
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Nessun dato nel periodo selezionato
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-text-subtle)' }}>
            I grafici appaiono dopo la prima riconciliazione notturna
          </p>
        </div>
      ) : (
        <>
          <div className="h-52 px-2 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad-admin-sessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-admin-bookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--admin-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day_label"
                  tick={{ fontSize: 10, fill: 'var(--admin-text-subtle)' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--admin-text-subtle)' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessioni"
                  stroke={BLUE}
                  strokeWidth={2}
                  fill="url(#grad-admin-sessions)"
                  dot={false}
                  activeDot={{ r: 4, fill: BLUE, stroke: BLUE }}
                />
                <Area
                  type="monotone"
                  dataKey="booking_completed"
                  name="Prenotazioni"
                  stroke={ACCENT}
                  strokeWidth={2}
                  fill="url(#grad-admin-bookings)"
                  dot={false}
                  activeDot={{ r: 4, fill: ACCENT, stroke: ACCENT }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Insight box */}
          <div
            className="mx-4 mb-4 mt-1 rounded-xl p-3.5"
            style={{
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(233,69,96,0.04) 100%)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                Insight ·{' '}
              </span>
              {insightText}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Device Donut ────────────────────────────────────────────────

const DONUT_COLORS = [PURPLE, BLUE]

interface DeviceItem {
  name: string
  value: number
}

function DeviceDonut({ mobile, desktop }: { mobile: number; desktop: number }) {
  const total = mobile + desktop
  const items: DeviceItem[] = [
    { name: 'Mobile', value: mobile },
    { name: 'Desktop', value: desktop },
  ]

  return (
    <div className="admin-card flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Dispositivi
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Sessioni per tipo di device
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-subtle)' }}>
            Nessun dato
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center" aria-hidden>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={items}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {items.map((_, idx) => (
                    <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-2.5" role="list" aria-label="Breakdown dispositivi">
            {items.map((item, idx) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3"
                  role="listitem"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                      aria-hidden
                    />
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="tabular-nums text-xs font-semibold"
                      style={{ color: 'var(--admin-text)' }}
                    >
                      {formatNum(item.value)}
                    </span>
                    <span
                      className="min-w-[34px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums"
                      style={{
                        background: 'var(--admin-surface-2)',
                        color: 'var(--admin-text-subtle)',
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              )
            })}

            <div
              className="mt-0.5 flex items-center justify-between border-t pt-2"
              style={{ borderColor: 'var(--admin-border)' }}
            >
              <span className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                Totale
              </span>
              <span
                className="tabular-nums text-xs font-bold"
                style={{ color: 'var(--admin-text)' }}
              >
                {formatNum(total)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tenant Table ─────────────────────────────────────────────────

type SortCol = keyof Pick<
  TenantAnalyticsRow,
  'business_name' | 'sessions' | 'page_views' | 'booking_completed' | 'avg_conversion_rate'
>

interface ColHeaderProps {
  col: SortCol
  label: string
  sortCol: SortCol
  sortAsc: boolean
  right?: boolean
  onSort: (col: SortCol) => void
}

function ColHeader({ col, label, sortCol, sortAsc, right = true, onSort }: ColHeaderProps) {
  const active = sortCol === col
  const ariaSort = active ? (sortAsc ? 'ascending' : 'descending') : 'none'
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-4 py-3 ${right ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:rounded ${right ? 'ml-auto' : ''}`}
        style={{
          outlineColor: ACCENT,
          color: active ? ACCENT : 'var(--admin-text-subtle)',
        }}
      >
        {label}
        <span className="opacity-50" aria-hidden>
          {active ? (sortAsc ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}

interface TenantTableProps {
  tenants: TenantAnalyticsRow[]
  atRiskThreshold: number
  medianSessions: number
}

function TenantTable({ tenants, atRiskThreshold, medianSessions }: TenantTableProps) {
  const [sortCol, setSortCol] = useState<SortCol>('sessions')
  const [sortAsc, setSortAsc] = useState(false)

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortAsc((v) => !v)
    } else {
      setSortCol(col)
      setSortAsc(col === 'business_name')
    }
  }

  const sorted = [...tenants].sort((a, b) => {
    let diff = 0
    if (sortCol === 'business_name') {
      diff = a.business_name.localeCompare(b.business_name, 'it')
    } else {
      diff = a[sortCol] - b[sortCol]
    }
    return sortAsc ? diff : -diff
  })

  if (tenants.length === 0) {
    return (
      <div className="admin-card flex flex-col items-center gap-3 p-12 text-center">
        <BarChart2
          className="h-8 w-8 opacity-15"
          style={{ color: 'var(--admin-text-muted)' }}
          aria-hidden
        />
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Nessun tenant con dati nel periodo
        </p>
        <p className="text-xs" style={{ color: 'var(--admin-text-subtle)' }}>
          I rollup appaiono dopo la prima riconciliazione notturna (pg_cron 02:00)
        </p>
      </div>
    )
  }

  const colHeaderProps = { sortCol, sortAsc, onSort: handleSort }

  return (
    <div className="admin-card overflow-hidden">
      <div
        className="border-b px-5 py-4"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Performance per tenant
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenant'} con dati · clicca sulle intestazioni per ordinare
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Performance per tenant">
          <thead>
            <tr
              style={{
                background: 'var(--admin-surface-2)',
                borderBottom: '1px solid var(--admin-border)',
              }}
            >
              <ColHeader col="business_name" label="Tenant" right={false} {...colHeaderProps} />
              <ColHeader col="sessions" label="Sessioni" {...colHeaderProps} />
              <ColHeader col="page_views" label="Pagine" {...colHeaderProps} />
              <ColHeader col="booking_completed" label="Prenotazioni" {...colHeaderProps} />
              <ColHeader col="avg_conversion_rate" label="Conversione" {...colHeaderProps} />
              <th
                scope="col"
                className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--admin-text-subtle)' }}
              >
                Salute
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const isAtRisk =
                row.sessions > medianSessions && row.avg_conversion_rate < atRiskThreshold
              const { label: healthLabel, bgColor, textColor, dotColor } = healthSignal(
                row.last_login_at,
              )
              const isLast = idx === sorted.length - 1
              return (
                <tr
                  key={row.tenant_id}
                  style={{
                    borderBottom: isLast ? undefined : '1px solid var(--admin-border)',
                    background: isAtRisk ? 'rgba(245,158,11,0.025)' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/tenants/${row.tenant_id}`}
                      className="font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:rounded"
                      style={{ color: 'var(--admin-text)', outlineColor: ACCENT }}
                    >
                      {row.business_name}
                    </a>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[10px]" style={{ color: 'var(--admin-text-subtle)' }}>
                        {row.slug}
                      </span>
                      {isAtRisk && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: 'rgba(245,158,11,0.12)',
                            color: '#B45309',
                          }}
                        >
                          Upsell
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {formatNum(row.sessions)}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    {formatNum(row.page_views)}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {formatNum(row.booking_completed)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          isAtRisk
                            ? WARNING
                            : 'var(--admin-text)',
                      }}
                    >
                      {formatPct(row.avg_conversion_rate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ background: bgColor, color: textColor }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: dotColor }}
                        aria-hidden
                      />
                      {healthLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Root client component ────────────────────────────────────────

export function AdminAnalyticsClient({ data }: { data: AdminSiteAnalyticsData }) {
  const { summary, daily, tenants, period_days, insight_text } = data
  const sessionDelta = pctChange(summary.total_sessions, summary.prev_total_sessions)
  const convDelta = pctChange(summary.avg_conversion_rate, summary.prev_avg_conversion_rate)

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodTabs current={period_days} />
        <p className="text-xs" style={{ color: 'var(--admin-text-subtle)' }}>
          Aggiornato ogni notte · pg_cron 02:00
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Visite totali"
          value={formatNum(summary.total_sessions)}
          sub={`ultimi ${period_days} giorni`}
          delta={sessionDelta}
          accentColor={BLUE}
          icon={TrendingUp}
        />
        <SummaryCard
          label="Conversione media"
          value={formatPct(summary.avg_conversion_rate)}
          sub="booking / sessioni"
          delta={convDelta}
          accentColor={ACCENT}
          icon={MousePointerClick}
        />
        <SummaryCard
          label="Top tenant"
          value={
            summary.top_tenant ? formatNum(summary.top_tenant.sessions) : '—'
          }
          sub={summary.top_tenant?.name ?? 'Nessun dato'}
          accentColor={PURPLE}
          icon={Building2}
        />
        <SummaryCard
          label="A rischio upsell"
          value={String(summary.at_risk_count)}
          sub="traffico alto, conv. bassa"
          warning={summary.at_risk_count > 0}
          icon={AlertTriangle}
        />
      </div>

      {/* Chart (2/3) + Donut (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlatformAreaChart
            daily={daily}
            sessionDelta={sessionDelta}
            insightText={insight_text}
          />
        </div>
        <DeviceDonut
          mobile={summary.mobile_sessions}
          desktop={summary.desktop_sessions}
        />
      </div>

      {/* Tenant table */}
      <TenantTable
        tenants={tenants}
        atRiskThreshold={summary.at_risk_threshold}
        medianSessions={summary.median_sessions}
      />
    </div>
  )
}
