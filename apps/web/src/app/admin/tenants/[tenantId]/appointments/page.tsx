import { listTenantAppointments } from '@/app/admin/actions'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  no_show: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export default async function TenantAppointmentsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const res = await listTenantAppointments(tenantId)
  const rows = res.data ?? []

  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Appuntamenti</h2>
        <span className="text-xs text-muted-foreground">{rows.length} risultati (max 200)</span>
      </div>
      {res.error ? (
        <p className="mt-3 text-sm text-red-600">{res.error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nessun appuntamento.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Data / ora</th>
                <th className="px-3 py-2 font-semibold">Cliente</th>
                <th className="px-3 py-2 font-semibold">Stato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cls = STATUS_BADGE[r.status] ?? STATUS_BADGE.completed
                return (
                  <tr key={r.id} className="border-t dark:border-zinc-800">
                    <td className="px-3 py-2 tabular-nums">
                      {new Date(r.starts_at).toLocaleString('it-IT')}
                    </td>
                    <td className="px-3 py-2">{r.client_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
