import { Activity } from 'lucide-react'

import { getAuditLog } from '@/app/admin/actions'

export const dynamic = 'force-dynamic'

export default async function TenantAuditPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const res = await getAuditLog({ tenantId, limit: 200 })
  const entries = res.data ?? []

  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Audit log</h2>
        <span className="text-xs text-muted-foreground">{entries.length} eventi</span>
      </div>

      {res.error ? (
        <p className="mt-3 text-sm text-red-600">{res.error}</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nessun evento registrato.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {entries.map((e) => {
            const hasDetails = e.details && Object.keys(e.details).length > 0
            return (
              <li
                key={e.id}
                className="flex gap-3 rounded-lg border p-3 dark:border-zinc-800"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{e.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString('it-IT')}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {e.entity_type}
                    {e.entity_id ? (
                      <span className="ml-1 font-mono">#{e.entity_id.slice(0, 8)}</span>
                    ) : null}
                  </div>
                  {hasDetails ? (
                    <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 text-[11px] leading-relaxed">
                      {JSON.stringify(e.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
