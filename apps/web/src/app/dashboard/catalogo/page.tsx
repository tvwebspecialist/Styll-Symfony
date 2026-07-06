import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCatalogoData } from '@/lib/actions/catalogo'
import { CatalogoClient } from '@/components/dashboard/catalogo/CatalogoClient'
import { requireOwnerManagerTenantContext } from '@/lib/tenant-role-guard'

export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await requireOwnerManagerTenantContext()

  const { servizi, prodotti, locations, dbCategories, inventoryByProduct } = await getCatalogoData()

  return <CatalogoClient servizi={servizi} prodotti={prodotti} locations={locations} dbCategories={dbCategories} inventoryByProduct={inventoryByProduct} />
}
