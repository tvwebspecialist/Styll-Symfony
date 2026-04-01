import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import { useUIContext } from '../contexts/UIContext'
import type { ProductWithInventory } from '../types/services'
import type { NewProductFormData } from '../lib/utils/validators'

export const useProducts = () => {
  const { tenantId } = useAuth()
  const { showToast } = useUIContext()
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select(`
          *,
          product_inventory(quantity, low_stock_threshold)
        `)
        .eq('tenant_id', tenantId)
        .order('name')

      if (err) throw err
      setProducts((data ?? []) as ProductWithInventory[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento dei prodotti'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: NewProductFormData, locationId: string, initialQuantity = 0) => {
    if (!tenantId) return { error: 'Nessun tenant' }
    try {
      const { data: product, error: err } = await supabase
        .from('products')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          brand: data.brand,
          price_sell: data.price_sell,
          price_cost: data.price_cost,
          sku: data.sku,
          category: data.category,
          is_active: true,
        })
        .select()
        .single()

      if (err) throw err

      // Create inventory record
      await supabase.from('product_inventory').insert({
        tenant_id: tenantId,
        product_id: product!.id,
        location_id: locationId,
        quantity: initialQuantity,
        low_stock_threshold: 5,
      })

      showToast({ type: 'success', title: 'Prodotto aggiunto' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const update = async (id: string, data: Partial<NewProductFormData>) => {
    try {
      const { error: err } = await supabase
        .from('products')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: 'Prodotto aggiornato' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const updateStock = async (productId: string, locationId: string, quantity: number) => {
    try {
      const { error: err } = await supabase
        .from('product_inventory')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('product_id', productId)
        .eq('location_id', locationId)

      if (err) throw err
      showToast({ type: 'success', title: 'Scorta aggiornata' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  return {
    products,
    isLoading,
    error,
    create,
    update,
    updateStock,
    reload: load,
  }
}
