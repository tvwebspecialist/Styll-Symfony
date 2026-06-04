'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { UpsellProduct } from './public-booking'

export async function getUpsellProductsAction(params: {
  tenantId: string
  locationId: string
  serviceCategories: string[]
  clientId?: string
  limit?: number
}): Promise<UpsellProduct[]> {
  const { tenantId, locationId, serviceCategories, clientId, limit = 6 } = params
  const db = createAdminClient()

  const [productRes, inventoryRes, wishlistRes] = await Promise.all([
    db
      .from('products')
      .select('id, name, brand, price_sell, photo_url, category, description, display_order, is_new')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('show_on_site', true)
      .order('display_order', { ascending: true })
      .limit(30),
    db
      .from('product_inventory')
      .select('product_id, quantity')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId),
    clientId
      ? db
          .from('client_product_wishlist')
          .select('product_id')
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
      : Promise.resolve({ data: [] as Array<{ product_id: string }> }),
  ])

  if (!productRes.data?.length) return []

  const inventoryMap = new Map<string, number>()
  for (const row of (inventoryRes.data ?? []) as Array<{ product_id: string; quantity: number }>) {
    inventoryMap.set(row.product_id, (inventoryMap.get(row.product_id) ?? 0) + row.quantity)
  }

  const wishlistSet = new Set(
    ((wishlistRes as { data: Array<{ product_id: string }> | null }).data ?? []).map(
      (r) => r.product_id,
    ),
  )

  const categorySet = new Set(serviceCategories)

  type RawProduct = {
    id: string
    name: string
    brand: string | null
    price_sell: number
    photo_url: string | null
    category: string | null
    description: string | null
    display_order: number
    is_new: boolean
  }

  const products = (productRes.data as unknown as RawProduct[]).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price_sell: Number(p.price_sell ?? 0),
    photo_url: p.photo_url,
    category: p.category,
    description: p.description,
    is_new: p.is_new,
    is_favourite: wishlistSet.has(p.id),
    available: (inventoryMap.get(p.id) ?? 0) > 0,
    display_order: p.display_order,
  }))

  function priority(p: (typeof products)[0]): number {
    if (p.is_favourite) return 1
    if (p.category && categorySet.has(p.category)) return 2
    return 3
  }

  return products
    .sort((a, b) => priority(a) - priority(b) || a.display_order - b.display_order)
    .slice(0, limit)
    .map(({ display_order: _d, ...rest }) => rest)
}
