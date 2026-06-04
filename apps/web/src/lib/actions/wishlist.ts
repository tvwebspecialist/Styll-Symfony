'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function toggleWishlist(params: {
  tenantId: string
  clientId: string
  productId: string
  currentState: boolean
}): Promise<{ success: boolean; newState: boolean }> {
  const { tenantId, clientId, productId, currentState } = params
  const db = createAdminClient()

  try {
    if (currentState) {
      await db
        .from('client_product_wishlist')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('product_id', productId)
    } else {
      await db.from('client_product_wishlist').insert({
        tenant_id: tenantId,
        client_id: clientId,
        product_id: productId,
      })
    }
    return { success: true, newState: !currentState }
  } catch {
    return { success: false, newState: currentState }
  }
}
