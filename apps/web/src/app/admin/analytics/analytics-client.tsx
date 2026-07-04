'use client'

interface TenantTrafficRow {
  tenant_id: string
  business_name: string
  slug: string
  total_sessions: number
  total_booking_completed: number
  avg_conversion_rate: number
  days_with_data: number
}

interface TenantHealthRow {
  tenant_id: string
  business_name: string
  slug: string
  last_login_at: string | null
  appointments_this_month: number
  active_clients_count: number
}

interface Props {
  trafficRows: TenantTrafficRow[]
  healthRows: TenantHealthRow[]
}

function churnSignal(lastLoginAt: string | null): { emoji: string; label: string } {
  if (!lastLoginAt) return { emoji: '⚫', label: 'Mai loggato' }
  const daysSince = Math.floor((Date.now() - new Date(lastLoginAt).getTime()) / 86400000)
  if (daysSince <= 7) return { emoji: '🟢', label: `${daysSince}g fa` }
  if (daysSince <= 21) return { emoji: '🟡', label: `${daysSince}g fa` }
  return { emoji: '🔴', label: `${daysSince}g fa` }
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function AdminAnalyticsClient({ trafficRows, healthRows }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics cross-tenant</h1>
        <p className="text-sm text-zinc-500 mt-1">Ultimi 30 giorni · solo tenant con dati</p>
      </div>

      {/* Traffic table */}
      <section>
        <h2 className="text-base font-semibold mb-3">Traffico per tenant</h2>
        {trafficRows.length === 0 ? (
          <p className="text-sm text-zinc-400">Nessun dato. I dati appaiono dopo la prima notte di riconciliazione.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Tenant</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">Sessioni</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">Prenotazioni</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">Conv. rate</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">Giorni dati</th>
                </tr>
              </thead>
              <tbody>
                {trafficRows.map((row) => {
                  const isLowConversion = row.total_sessions > 50 && row.avg_conversion_rate < 0.05
                  return (
                    <tr key={row.tenant_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <a
                          href={`/admin/tenants/${row.tenant_id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {row.business_name}
                        </a>
                        <span className="ml-2 text-xs text-zinc-400">{row.slug}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.total_sessions}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.total_booking_completed}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={isLowConversion ? 'text-orange-600 font-semibold' : ''}>
                          {formatPct(row.avg_conversion_rate)}
                        </span>
                        {isLowConversion && (
                          <span className="ml-1 text-xs text-orange-500" title="Traffico alto ma conversione bassa — possibile occasione di upsell">⚠️</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">{row.days_with_data}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Health / Churn detector */}
      <section>
        <h2 className="text-base font-semibold mb-1">Silent Churn Detector</h2>
        <p className="text-xs text-zinc-400 mb-3">
          Basato su <code>tenant_activity_log.last_login_at</code>. 🟢 ≤7gg · 🟡 ≤21gg · 🔴 &gt;21gg
        </p>
        {healthRows.length === 0 ? (
          <p className="text-sm text-zinc-400">Nessun dato di attività registrato.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Ultimo accesso</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">Appt. mese</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">Clienti attivi</th>
                </tr>
              </thead>
              <tbody>
                {healthRows.map((row) => {
                  const { emoji, label } = churnSignal(row.last_login_at)
                  return (
                    <tr key={row.tenant_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <a
                          href={`/admin/tenants/${row.tenant_id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {row.business_name}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="mr-1">{emoji}</span>
                        <span className="text-zinc-600">{label}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.appointments_this_month}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.active_clients_count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
