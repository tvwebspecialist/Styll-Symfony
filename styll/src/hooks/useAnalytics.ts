import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'

interface DashboardMetrics {
  todayAppointments: number
  weekRevenue: number
  activeClients: number
  churnAlerts: number
  completedToday: number
  pendingToday: number
}

export const useAnalytics = () => {
  const { tenantId } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayAppointments: 0,
    weekRevenue: 0,
    activeClients: 0,
    churnAlerts: 0,
    completedToday: 0,
    pendingToday: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [
        { count: todayCount },
        { count: completedCount },
        { count: pendingCount },
        { count: clientsCount },
        { count: churnCount },
        { data: revenueData },
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('start_time', `${todayStr}T00:00:00`)
          .lt('start_time', `${todayStr}T23:59:59`)
          .is('deleted_at', null),

        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('start_time', `${todayStr}T00:00:00`)
          .lt('start_time', `${todayStr}T23:59:59`)
          .is('deleted_at', null),

        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['pending', 'confirmed'])
          .gte('start_time', `${todayStr}T00:00:00`)
          .lt('start_time', `${todayStr}T23:59:59`)
          .is('deleted_at', null),

        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),

        supabase
          .from('client_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('churn_status', 'red'),

        supabase
          .from('payments')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('paid_at', weekAgo),
      ])

      const weekRevenue = (revenueData ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)

      setMetrics({
        todayAppointments: todayCount ?? 0,
        weekRevenue,
        activeClients: clientsCount ?? 0,
        churnAlerts: churnCount ?? 0,
        completedToday: completedCount ?? 0,
        pendingToday: pendingCount ?? 0,
      })
    } catch (err: unknown) {
      console.error('Error loading analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  return {
    metrics,
    isLoading,
    reload: load,
  }
}
