import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClienti } from '@/lib/actions/clienti'
import { ClientiClient } from '@/components/dashboard/clienti/ClientiClient'

export const dynamic = 'force-dynamic'

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getClienti({
    page: typeof params.page === 'string' ? params.page : null,
    pageSize: typeof params.pageSize === 'string' ? params.pageSize : null,
    query: typeof params.query === 'string' ? params.query : null,
    filter: typeof params.filter === 'string' ? params.filter : null,
  })

  return <ClientiClient {...data} />
}
