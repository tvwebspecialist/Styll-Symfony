import { listTenantClientsDetailed } from '@/app/admin/actions'
import { TenantClientsClient } from './clients-client'

export const dynamic = 'force-dynamic'

export default async function TenantClientsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const res = await listTenantClientsDetailed(tenantId)

  if (res.error) {
    return (
      <div className="rounded-xl border bg-white p-5 ">
        <h2 className="text-sm font-semibold">Clienti</h2>
        <p className="mt-3 text-sm text-red-600">{res.error}</p>
      </div>
    )
  }

  return <TenantClientsClient tenantId={tenantId} clients={res.data ?? []} />
}
