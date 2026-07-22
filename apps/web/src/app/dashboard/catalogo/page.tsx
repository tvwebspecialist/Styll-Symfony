import { getCatalogoData } from '@/lib/actions/catalogo'
import { CatalogoClient } from '@/components/dashboard/catalogo/CatalogoClient'
import { requireTenantPermission, TENANT_PERMISSIONS } from '@/lib/tenant-role-guard'

export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  await requireTenantPermission(TENANT_PERMISSIONS.MANAGE_CATALOG)

  const { servizi, prodotti, locations, dbCategories, inventoryByProduct } = await getCatalogoData()

  return <CatalogoClient servizi={servizi} prodotti={prodotti} locations={locations} dbCategories={dbCategories} inventoryByProduct={inventoryByProduct} />
}
