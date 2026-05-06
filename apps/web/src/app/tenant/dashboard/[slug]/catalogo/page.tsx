import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCatalogoData } from '@/lib/actions/catalogo'
import { CatalogoClient } from '@/components/dashboard/catalogo/CatalogoClient'

export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { servizi, prodotti, locations } = await getCatalogoData()

  return <CatalogoClient servizi={servizi} prodotti={prodotti} locations={locations} />
}
