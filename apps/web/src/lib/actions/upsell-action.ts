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
  const { tenantId, locationId, clientId } = params
  const db = createAdminClient()

  const [productRes, inventoryRes, wishlistRes] = await Promise.all([
    db
      .from('products')
      .select('id, name, brand, price_sell, photo_url, category, description, display_order, is_new')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('show_on_site', true)
      .order('display_order', { ascending: true })
      .limit(50),
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

  // Only products with stock > 0
  const available = (productRes.data as unknown as RawProduct[])
    .filter((p) => (inventoryMap.get(p.id) ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price_sell: Number(p.price_sell ?? 0),
      photo_url: p.photo_url,
      category: p.category,
      description: p.description,
      is_new: p.is_new,
      is_favourite: wishlistSet.has(p.id),
      available: true as const,
      display_order: p.display_order,
    }))

  const wishlistItems = available.filter((p) => p.is_favourite)
  const rest = available.filter((p) => !p.is_favourite)

  // Fisher-Yates shuffle for random fill
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j]!, rest[i]!]
  }

  // Wishlist first (up to 4), fill remainder with random non-wishlist
  const result = [...wishlistItems.slice(0, 4), ...rest].slice(0, 4)

  return result.map(({ display_order: _d, ...r }) => r)
}
