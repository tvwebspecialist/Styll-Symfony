import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { ProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const data = await fetchSymfonyAdminJson<{
    products: Array<{
      id: string
      name: string
      brand: string | null
      category: string | null
      price_sell: number
      price_cost: number | null
      sku: string | null
      is_active: boolean
    }>
    locations: Array<{ id: string; name: string }>
    inventory: Array<{
      product_id: string
      location_id: string
      quantity: number
      low_stock_threshold: number
    }>
  }>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/products`)

  const locationList = data.locations ?? []

  const productsWithInventory = (data.products ?? []).map((p) => {
    const inv = (data.inventory ?? [])
      .filter((r) => r.product_id === p.id)
      .map((r) => {
        const loc = locationList.find((l) => l.id === r.location_id)
        return {
          location_id: r.location_id,
          location_name: loc?.name ?? r.location_id,
          quantity: r.quantity,
          low_stock_threshold: r.low_stock_threshold,
        }
      })
    return { ...p, inventory: inv }
  })

  return (
    <ProductsClient
      tenantId={tenantId}
      initial={productsWithInventory}
      locations={locationList}
    />
  )
}
