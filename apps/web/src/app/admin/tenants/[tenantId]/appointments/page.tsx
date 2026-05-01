import {
  listTenantAppointmentsDetailed,
  getAppointmentFormOptions,
} from '@/app/admin/actions'
import { TenantAppointmentsClient } from './appointments-client'

export const dynamic = 'force-dynamic'

export default async function TenantAppointmentsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const [list, opts] = await Promise.all([
    listTenantAppointmentsDetailed(tenantId),
    getAppointmentFormOptions(tenantId),
  ])

  if (list.error) {
    return (
      <div className="rounded-xl border bg-white p-5 ">
        <h2 className="text-sm font-semibold">Appuntamenti</h2>
        <p className="mt-3 text-sm text-red-600">{list.error}</p>
      </div>
    )
  }

  return (
    <TenantAppointmentsClient
      tenantId={tenantId}
      appointments={list.data ?? []}
      options={
        opts.data ?? { clients: [], staff: [], services: [], locations: [] }
      }
      optionsError={opts.error ?? null}
    />
  )
}
