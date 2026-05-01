import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClienteDettaglio } from '@/lib/actions/clienti'
import { ClienteDettaglioClient } from '@/components/dashboard/clienti/ClienteDettaglioClient'

export const dynamic = 'force-dynamic'

export default async function ClienteDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getClienteDettaglio(id)
  if (!data) notFound()

  return <ClienteDettaglioClient data={data} />
}
