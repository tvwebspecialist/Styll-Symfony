'use server'

import { revalidatePath } from 'next/cache'

import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'
import type { ActionResult } from '@/app/admin/actions'

function actionError(error: unknown): string {
  if (error instanceof SymfonyAdminApiError) {
    if (error.details.body) {
      try {
        const parsed = JSON.parse(error.details.body) as { error?: string }
        if (parsed.error) return parsed.error
      } catch {}
    }
  }

  return error instanceof Error ? error.message : 'Errore sconosciuto.'
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
  try {
    const data = await fetchSymfonyAdminJson<{ success: boolean; id: string }>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/products`,
      {
        method: 'POST',
        body: input,
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/products`)
    return { success: true, id: data.id }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/products/${encodeURIComponent(productId)}`,
      {
        method: 'PATCH',
        body: input,
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/products`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function toggleProductActive(
  tenantId: string,
  productId: string,
  is_active: boolean
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/products/${encodeURIComponent(productId)}`,
      {
        method: 'PATCH',
        body: { is_active },
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/products`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}
