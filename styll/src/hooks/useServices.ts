import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import { useUIContext } from '../contexts/UIContext'
import type { Service } from '../types/services'
import type { NewServiceFormData } from '../lib/utils/validators'

export const useServices = () => {
  const { tenantId } = useAuth()
  const { showToast } = useUIContext()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order')

      if (err) throw err
      setServices(data ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento dei servizi'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: NewServiceFormData) => {
    if (!tenantId) return { error: 'Nessun tenant' }
    try {
      const maxOrder = services.reduce((max, s) => Math.max(max, s.display_order), 0)
      const { error: err } = await supabase
        .from('services')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description,
          price: data.price,
          duration_minutes: data.duration_minutes,
          category: data.category,
          display_order: maxOrder + 1,
          is_active: true,
        })

      if (err) throw err
      showToast({ type: 'success', title: 'Servizio aggiunto' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const update = async (id: string, data: Partial<NewServiceFormData>) => {
    try {
      const { error: err } = await supabase
        .from('services')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: 'Servizio aggiornato' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error: err } = await supabase
        .from('services')
        .update({ is_active: isActive })
        .eq('id', id)

      if (err) throw err
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  return {
    services,
    isLoading,
    error,
    create,
    update,
    toggleActive,
    reload: load,
  }
}
