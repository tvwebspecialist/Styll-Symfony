import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import type { ClientWithAnalytics } from '../types/clients'

export const useChurn = () => {
  const { tenantId } = useAuth()
  const [churnClients, setChurnClients] = useState<ClientWithAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('clients')
        .select(`
          *,
          client_analytics!inner(churn_status, vip_score, days_since_last_visit, average_days_between_visits)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .in('client_analytics.churn_status', ['yellow', 'red'])
        .order('client_analytics(days_since_last_visit)', { ascending: false })

      setChurnClients((data ?? []) as ClientWithAnalytics[])
    } catch (err: unknown) {
      console.error('Error loading churn clients:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  return {
    churnClients,
    isLoading,
    reload: load,
  }
}
