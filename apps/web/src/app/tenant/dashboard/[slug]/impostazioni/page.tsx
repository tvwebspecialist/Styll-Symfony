import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getImpostazioniData } from '@/lib/actions/impostazioni'
import { ImpostazioniClient } from '@/components/dashboard/impostazioni/ImpostazioniClient'

export const dynamic = 'force-dynamic'

export default async function ImpostazioniPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const data = await getImpostazioniData()
  return <ImpostazioniClient data={data} />
}
