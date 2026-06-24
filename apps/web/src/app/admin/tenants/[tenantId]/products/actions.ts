'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/app/admin/actions'
import type { TablesUpdate } from '@/types'

async function requireSuperadmin(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessione non valida.' }
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_superadmin) return { error: 'Permessi insufficienti.' }
  return { id: user.id }
}

export interface InventoryEntry {
  location_id: string
  quantity: number
  low_stock_threshold: number
}

export interface ProductInput {
  name: string
  brand?: string | null
  category?: string | null
  price_sell: number
  price_cost?: number | null
  sku?: string | null
  is_active?: boolean
  inventory: InventoryEntry[]
}

export async function createProduct(
  tenantId: string,
  input: ProductInput
): Promise<ActionResult & { id?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()

  const { data, error } = await db
    .from('products')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      brand: input.brand ?? null,
      category: input.category ?? null,
      price_sell: input.price_sell,
      price_cost: input.price_cost ?? null,
      sku: input.sku ?? null,
      is_active: input.is_active ?? true,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  if (input.inventory.length > 0) {
    const { error: invError } = await db.from('product_inventory').upsert(
      input.inventory.map((e) => ({
        tenant_id: tenantId,
        product_id: data.id,
        location_id: e.location_id,
        quantity: e.quantity,
        low_stock_threshold: e.low_stock_threshold,
      })),
      { onConflict: 'product_id,location_id' }
    )
    if (invError) return { success: false, error: invError.message }
  }

  revalidatePath(`/admin/tenants/${tenantId}/products`)
  return { success: true, id: data.id }
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()

  const { name, brand, category, price_sell, price_cost, sku, is_active, inventory } = input

  const patch: TablesUpdate<'products'> = {}
  if (name !== undefined) patch.name = name
  if (brand !== undefined) patch.brand = brand ?? null
  if (category !== undefined) patch.category = category ?? null
  if (price_sell !== undefined) patch.price_sell = price_sell
  if (price_cost !== undefined) patch.price_cost = price_cost ?? null
  if (sku !== undefined) patch.sku = sku ?? null
  if (is_active !== undefined) patch.is_active = is_active

  if (Object.keys(patch).length > 0) {
    const { error } = await db
      .from('products')
      .update(patch)
      .eq('id', productId)
      .eq('tenant_id', tenantId)
    if (error) return { success: false, error: error.message }
  }

  if (inventory && inventory.length > 0) {
    const { error: invError } = await db.from('product_inventory').upsert(
      inventory.map((e) => ({
        tenant_id: tenantId,
        product_id: productId,
        location_id: e.location_id,
        quantity: e.quantity,
        low_stock_threshold: e.low_stock_threshold,
      })),
      { onConflict: 'product_id,location_id' }
    )
    if (invError) return { success: false, error: invError.message }
  }

  revalidatePath(`/admin/tenants/${tenantId}/products`)
  return { success: true }
}

export async function toggleProductActive(
  tenantId: string,
  productId: string,
  is_active: boolean
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()
  const { error } = await db
    .from('products')
    .update({ is_active })
    .eq('id', productId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/products`)
  return { success: true }
}
