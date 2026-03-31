import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import { useUIContext } from '../contexts/UIContext'
import type { ClientWithAnalytics, NewClient } from '../types/clients'

export const useClients = (search?: string) => {
  const { tenantId } = useAuth()
  const { showToast } = useUIContext()
  const [clients, setClients] = useState<ClientWithAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('clients')
        .select(`
          *,
          client_analytics(churn_status, vip_score, total_visits, last_visit_date, days_since_last_visit, average_days_between_visits),
          client_loyalty(total_points, available_points, current_tier, current_streak)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('full_name')

      if (search) {
        query = query.ilike('full_name', `%${search}%`)
      }

      const { data, error: err } = await query
      if (err) throw err
      setClients((data ?? []) as ClientWithAnalytics[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento dei clienti'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, search])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: NewClient) => {
    if (!tenantId) return { error: 'Nessun tenant' }
    try {
      const { data: client, error: err } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenantId,
          ...data,
          tags: data.tags ?? [],
        })
        .select()
        .single()

      if (err) throw err

      // Create analytics record
      await supabase.from('client_analytics').insert({
        tenant_id: tenantId,
        client_id: client!.id,
      })

      // Create loyalty record
      await supabase.from('client_loyalty').insert({
        tenant_id: tenantId,
        client_id: client!.id,
        tier_year: new Date().getFullYear(),
      })

      showToast({ type: 'success', title: 'Cliente aggiunto' })
      await load()
      return { error: null, data: client }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const update = async (id: string, data: Partial<NewClient>) => {
    try {
      const { error: err } = await supabase
        .from('clients')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: 'Cliente aggiornato' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const softDelete = async (id: string, deletedBy: string) => {
    try {
      const { error: err } = await supabase
        .from('clients')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
        })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: 'Cliente rimosso' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  return {
    clients,
    isLoading,
    error,
    create,
    update,
    softDelete,
    reload: load,
  }
}
