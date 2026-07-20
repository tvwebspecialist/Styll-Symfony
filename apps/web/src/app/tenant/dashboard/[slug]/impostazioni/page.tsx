import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getImpostazioniData } from '@/lib/actions/impostazioni'
import { ImpostazioniClient } from '@/components/dashboard/impostazioni/ImpostazioniClient'
import { requireTenantPermission, TENANT_PERMISSIONS } from '@/lib/tenant-role-guard'

export const dynamic = 'force-dynamic'

export default async function ImpostazioniPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')
  await requireTenantPermission(TENANT_PERMISSIONS.MANAGE_SETTINGS)

  const data = await getImpostazioniData()
  return <ImpostazioniClient data={data} />
}
