import { createAdminClient } from '@/lib/supabase/admin'
import { ProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const db = createAdminClient()

  const [{ data: products }, { data: locations }, { data: inventory }] = await Promise.all([
    db
      .from('products')
      .select('id, name, brand, category, price_sell, price_cost, sku, is_active')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
    db
      .from('locations')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    db
      .from('product_inventory')
      .select('product_id, location_id, quantity, low_stock_threshold')
      .eq('tenant_id', tenantId),
  ])

  const locationList = locations ?? []

  const productsWithInventory = (products ?? []).map((p) => {
    const inv = (inventory ?? [])
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
