import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClienti } from '@/lib/actions/clienti'
import { ClientiClient } from '@/components/dashboard/clienti/ClientiClient'

export const dynamic = 'force-dynamic'

export default async function ClientiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { clienti } = await getClienti()

  return <ClientiClient clienti={clienti} />
}
