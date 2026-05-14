'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServizioRow {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  color: string | null
  display_order: number
  is_active: boolean
}

export interface ProdottoRow {
  id: string
  name: string
  brand: string | null
  description: string | null
  price_sell: number
  price_cost: number | null
  category: string | null
  sku: string | null
  is_active: boolean
  photo_url: string | null
  totalStock: number
  lowStock: boolean
}

export interface LocationRow {
  id: string
  name: string
}

export interface InventoryEntry {
  location_id: string
  quantity: number
}

export interface ServiceCategoryRow {
  name: string
  color: string | null
}

// ─── getCatalogoData ──────────────────────────────────────────────────────────

export async function getCatalogoData(): Promise<{
  servizi: ServizioRow[]
  prodotti: ProdottoRow[]
  locations: LocationRow[]
  dbCategories: ServiceCategoryRow[]
  tenantId: string | null
}> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { servizi: [], prodotti: [], locations: [], dbCategories: [], tenantId: null }

  const db = createAdminClient()

  const [serviziRes, prodottiRes, inventoryRes, locationsRes] = await Promise.all([
    db
      .from('services')
      .select('id, name, description, price, duration_minutes, category, color, display_order, is_active')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('products')
      .select('id, name, brand, description, price_sell, price_cost, category, sku, is_active, photo_url')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
    db
      .from('product_inventory')
      .select('product_id, location_id, quantity')
      .eq('tenant_id', tenantId),
    db
      .from('locations')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  const rawServizi   = serviziRes.data   ?? []
  const rawProdotti  = prodottiRes.data  ?? []
  const inventory    = inventoryRes.data ?? []
  const rawLocations = locationsRes.data ?? []

  // Aggregate inventory per product
  const stockByProduct = new Map<string, number>()
  for (const inv of inventory) {
    const current = stockByProduct.get(inv.product_id) ?? 0
    stockByProduct.set(inv.product_id, current + (inv.quantity ?? 0))
  }

  const servizi: ServizioRow[] = rawServizi.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    price: Number(s.price ?? 0),
    duration_minutes: Number(s.duration_minutes ?? 0),
    category: s.category ?? null,
    color: (s.color ?? null) as string | null,
    display_order: Number(s.display_order ?? 0),
    is_active: s.is_active ?? true,
  }))

  const prodotti: ProdottoRow[] = rawProdotti.map((p) => {
    const total = stockByProduct.get(p.id) ?? 0
    return {
      id: p.id,
      name: p.name,
      brand: (p.brand ?? null) as string | null,
      description: p.description ?? null,
      price_sell: Number(p.price_sell ?? 0),
      price_cost: p.price_cost != null ? Number(p.price_cost) : null,
      category: p.category ?? null,
      sku: p.sku ?? null,
      is_active: p.is_active ?? true,
      photo_url: p.photo_url ?? null,
      totalStock: total,
      lowStock: total < 5,
    }
  })

  const locations: LocationRow[] = rawLocations.map((l) => ({
    id: l.id,
    name: l.name ?? '',
  }))

  // Derive categories from services (unique name → first color found)
  const categoryColorMap = new Map<string, string | null>()
  for (const s of rawServizi) {
    if (s.category && !categoryColorMap.has(s.category)) {
      categoryColorMap.set(s.category, s.color ?? null)
    }
  }
  const dbCategories: ServiceCategoryRow[] = Array.from(categoryColorMap.entries())
    .map(([name, color]) => ({ name, color }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { servizi, prodotti, locations, dbCategories, tenantId }
}

// ─── upsertServizio ───────────────────────────────────────────────────────────

export async function upsertServizio(data: {
  id?: string
  name: string
  description?: string | null
  price: number
  duration_minutes: number
  category?: string | null
  color?: string | null
  is_active: boolean
}): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const now = new Date().toISOString()

  if (data.id) {
    const { error } = await db
      .from('services')
      .update({
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        duration_minutes: data.duration_minutes,
        category: data.category ?? null,
        color: data.color ?? null,
        is_active: data.is_active,
        updated_at: now,
      })
      .eq('id', data.id)
      .eq('tenant_id', tenantId)
    if (error) return { success: false, error: error.message }
  } else {
    const { data: existing } = await db
      .from('services')
      .select('display_order')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextOrder = ((existing?.display_order ?? -1) as number) + 1

    const { error } = await db.from('services').insert({
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      duration_minutes: data.duration_minutes,
      category: data.category ?? null,
      color: data.color ?? null,
      is_active: data.is_active,
      display_order: nextOrder,
      created_at: now,
      updated_at: now,
    })
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/catalogo')
  return { success: true }
}

// ─── deleteServizio ───────────────────────────────────────────────────────────

export async function deleteServizio(id: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const { error } = await db
    .from('services')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/catalogo')
  return { success: true }
}

// ─── reorderServizi ───────────────────────────────────────────────────────────

export async function reorderServizi(ids: string[]): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const updates = ids.map((id, index) =>
    db
      .from('services')
      .update({ display_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { success: false, error: failed.error.message }

  revalidatePath('/dashboard/catalogo')
  return { success: true }
}

// ─── upsertProdotto ───────────────────────────────────────────────────────────

export async function upsertProdotto(
  data: {
    id?: string
    name: string
    brand?: string | null
    description?: string | null
    price_sell: number
    price_cost?: number | null
    category?: string | null
    sku?: string | null
    is_active: boolean
    photo_url?: string | null
  },
  inventoryEntries: InventoryEntry[]
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const now = new Date().toISOString()
  let productId = data.id

  if (productId) {
    const { error } = await db
      .from('products')
      .update({
        name: data.name,
        brand: data.brand ?? null,
        description: data.description ?? null,
        price_sell: data.price_sell,
        price_cost: data.price_cost ?? null,
        category: data.category ?? null,
        sku: data.sku ?? null,
        is_active: data.is_active,
        photo_url: data.photo_url ?? null,
        updated_at: now,
      })
      .eq('id', productId)
      .eq('tenant_id', tenantId)
    if (error) return { success: false, error: error.message }
  } else {
    const { data: inserted, error } = await db
      .from('products')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        brand: data.brand ?? null,
        description: data.description ?? null,
        price_sell: data.price_sell,
        price_cost: data.price_cost ?? null,
        category: data.category ?? null,
        sku: data.sku ?? null,
        is_active: data.is_active,
        photo_url: data.photo_url ?? null,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    productId = inserted.id
  }

  // Upsert inventory entries
  if (inventoryEntries.length > 0) {
    const rows = inventoryEntries.map((e) => ({
      product_id: productId,
      location_id: e.location_id,
      tenant_id: tenantId,
      quantity: e.quantity,
    }))

    const { error: invError } = await db
      .from('product_inventory')
      .upsert(rows, { onConflict: 'product_id,location_id' })
    if (invError) return { success: false, error: invError.message }
  }

  // For new products: create missing inventory rows (qty=0) for unspecified locations
  if (!data.id) {
    const providedLocationIds = new Set(inventoryEntries.map((e) => e.location_id))
    const { data: allLocs } = await db
      .from('locations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    const missingRows = (allLocs ?? [])
      .filter((l) => !providedLocationIds.has(l.id))
      .map((l) => ({
        product_id: productId,
        location_id: l.id,
        tenant_id: tenantId,
        quantity: 0,
      }))

    if (missingRows.length > 0) {
      await db.from('product_inventory').upsert(missingRows, { onConflict: 'product_id,location_id' })
    }
  }

  revalidatePath('/dashboard/catalogo')
  return { success: true }
}

// ─── bulkUpdateCategory ───────────────────────────────────────────────────────

export async function bulkUpdateCategory(
  oldName: string,
  newName: string,
  color: string | null
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }
  const db = createAdminClient()
  const trimmed = newName.trim() || oldName
  const { error } = await db
    .from('services')
    .update({ category: trimmed, color: color ?? null, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('category', oldName)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/catalogo')
  return { success: true }
}

// ─── deleteCategory ───────────────────────────────────────────────────────────
// Removes the category string from all services that use it (sets category = NULL).

export async function deleteCategory(
  name: string
): Promise<{ success: boolean; error?: string; serviceCount?: number }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }
  const db = createAdminClient()
  // Count services using this category
  const { count } = await db
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('category', name)
  const serviceCount = count ?? 0
  if (serviceCount > 0) {
    return { success: false, serviceCount, error: `${serviceCount} servizi usano questa categoria` }
  }
  // Category is unused — nothing to delete from DB (it's just a string)
  revalidatePath('/dashboard/catalogo')
  return { success: true }
}

// ─── deleteProdotto ───────────────────────────────────────────────────────────

export async function deleteProdotto(id: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  // Delete inventory first (cascade may not exist)
  await db.from('product_inventory').delete().eq('product_id', id).eq('tenant_id', tenantId)

  const { error } = await db
    .from('products')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/catalogo')
  return { success: true }
}
