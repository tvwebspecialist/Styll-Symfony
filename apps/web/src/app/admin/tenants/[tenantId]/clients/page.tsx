import { listTenantClients } from '@/app/admin/actions'

export const dynamic = 'force-dynamic'

export default async function TenantClientsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const res = await listTenantClients(tenantId)
  const clients = res.data ?? []

  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Clienti</h2>
        <span className="text-xs text-muted-foreground">
          {clients.length} risultati (max 200)
        </span>
      </div>
      {res.error ? (
        <p className="mt-3 text-sm text-red-600">{res.error}</p>
      ) : clients.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nessun cliente.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Telefono</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Creato</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t dark:border-zinc-800">
                  <td className="px-3 py-2">{c.full_name ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
