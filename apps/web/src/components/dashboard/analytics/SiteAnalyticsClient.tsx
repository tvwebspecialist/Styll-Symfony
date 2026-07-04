'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DailyRow {
  day: string
  sessions: number
  page_views: number
  unique_visitors: number
  booking_started: number
  booking_completed: number
  conversion_rate: number
  new_signups: number
  mobile_sessions: number
  desktop_sessions: number
}

interface BookingSource {
  source: string
  count: number
}

interface Props {
  tenantId: string
  daily: DailyRow[]
  bookingSources: BookingSource[]
  totalClients: number
  clientsWithAccount: number
}

function formatDay(value: string): string {
  const d = new Date(value)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--fg-muted, #9ca3af)' }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg, #111)' }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--fg-muted, #9ca3af)' }}>{sub}</span>}
    </div>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  pwa: 'App clienti',
  dashboard_owner: 'Dashboard (owner)',
  dashboard_manager: 'Dashboard (manager)',
  dashboard_staff: 'Dashboard (staff)',
  dashboard_receptionist: 'Dashboard (reception)',
  walk_in: 'Walk-in',
  phone: 'Telefono',
  whatsapp: 'WhatsApp',
}

const TOOLTIP_STYLE = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 8,
  fontSize: 12,
}

export function SiteAnalyticsClient({
  daily,
  bookingSources,
  totalClients,
  clientsWithAccount,
}: Props) {
  const totalSessions = daily.reduce((s, d) => s + d.sessions, 0)
  const totalPageViews = daily.reduce((s, d) => s + d.page_views, 0)
  const totalBookingCompleted = daily.reduce((s, d) => s + d.booking_completed, 0)
  const totalNewSignups = daily.reduce((s, d) => s + d.new_signups, 0)
  const avgConversion = daily.length
    ? daily.reduce((s, d) => s + d.conversion_rate, 0) / daily.length
    : 0
  const accountRatio = totalClients > 0 ? clientsWithAccount / totalClients : 0

  const chartData = daily.map((d) => ({
    ...d,
    day_label: formatDay(d.day),
    conversion_pct: Math.round(d.conversion_rate * 1000) / 10,
  }))

  const hasData = daily.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '4px 0' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Analytics del sito</h2>
        <p style={{ fontSize: 13, color: 'var(--fg-muted, #9ca3af)', marginTop: 4 }}>
          Ultimi 30 giorni · dati aggregati ogni notte
        </p>
      </div>

      {/* Quick wins — zero tracciamento aggiuntivo */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--fg-muted, #6b7280)' }}>
          QUICK WINS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <KpiCard label="Sessioni" value={totalSessions} sub="30 giorni" />
          <KpiCard label="Pagine viste" value={totalPageViews} sub="30 giorni" />
          <KpiCard label="Prenotazioni online" value={totalBookingCompleted} sub="dalla PWA" />
          <KpiCard label="Nuovi account" value={totalNewSignups} sub="registrazioni" />
          <KpiCard
            label="Conversion rate"
            value={formatPercent(avgConversion)}
            sub="booking/sessioni"
          />
          <KpiCard
            label="Clienti con account"
            value={`${Math.round(accountRatio * 100)}%`}
            sub={`${clientsWithAccount} / ${totalClients}`}
          />
        </div>
      </div>

      {/* Booking source breakdown */}
      {bookingSources.length > 0 && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>
            Origine prenotazioni (30 gg)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookingSources.map(({ source, count }) => {
              const total = bookingSources.reduce((s, b) => s + b.count, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={source} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 140, fontSize: 13, color: 'var(--fg, #111)', flexShrink: 0 }}>
                    {SOURCE_LABELS[source] ?? source}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: 'var(--card-border, #e5e7eb)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'var(--brand-primary, #1a1a1a)',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 40, textAlign: 'right' }}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Andamento visite */}
      {hasData ? (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 20px' }}>
            Andamento visite
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-sessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand-primary, #1a1a1a)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--brand-primary, #1a1a1a)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
              <XAxis dataKey="day_label" tick={{ fontSize: 11 }} stroke="none" />
              <YAxis tick={{ fontSize: 11 }} stroke="none" allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessioni"
                stroke="var(--brand-primary, #1a1a1a)"
                strokeWidth={2}
                fill="url(#grad-sessions)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
            color: 'var(--fg-muted, #9ca3af)',
            fontSize: 14,
          }}
        >
          Nessun dato ancora — i grafici appariranno dopo le prime visite alla tua app.
        </div>
      )}

      {/* Funnel conversione */}
      {hasData && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 20px' }}>
            Funnel prenotazione
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
              <XAxis dataKey="day_label" tick={{ fontSize: 11 }} stroke="none" />
              <YAxis tick={{ fontSize: 11 }} stroke="none" allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="booking_started" name="Avviate" fill="var(--brand-secondary, #c9a96e)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="booking_completed" name="Completate" fill="var(--brand-primary, #1a1a1a)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Device breakdown */}
      {hasData && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>
            Device
          </h3>
          {(() => {
            const mob = daily.reduce((s, d) => s + d.mobile_sessions, 0)
            const desk = daily.reduce((s, d) => s + d.desktop_sessions, 0)
            const tot = mob + desk
            const mobPct = tot > 0 ? Math.round((mob / tot) * 100) : 0
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Mobile', count: mob, pct: mobPct },
                  { label: 'Desktop', count: desk, pct: 100 - mobPct },
                ].map(({ label, count, pct }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 64, fontSize: 13 }}>{label}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--card-border, #e5e7eb)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand-primary, #1a1a1a)', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, width: 50, textAlign: 'right' }}>{count} ({pct}%)</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
