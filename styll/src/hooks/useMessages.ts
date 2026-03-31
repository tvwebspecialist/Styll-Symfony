import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import { useUIContext } from '../contexts/UIContext'
import type { Database } from '../types/database'

type StaffNotification = Database['public']['Tables']['staff_notifications']['Row']

export const useMessages = () => {
  const { tenantId, staffMember } = useAuth()
  const { showToast } = useUIContext()
  const [notifications, setNotifications] = useState<StaffNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId || !staffMember) return
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('staff_notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`staff_id.eq.${staffMember.id},staff_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50)

      const notifs = data ?? []
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.is_read).length)
    } catch (err: unknown) {
      console.error('Error loading notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, staffMember])

  useEffect(() => {
    load()
  }, [load])

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('staff_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
      await load()
    } catch (err: unknown) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    if (!tenantId || !staffMember) return
    try {
      await supabase
        .from('staff_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('is_read', false)
        .or(`staff_id.eq.${staffMember.id},staff_id.is.null`)
      await load()
      showToast({ type: 'success', title: 'Tutte le notifiche lette' })
    } catch (err: unknown) {
      console.error('Error marking all as read:', err)
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    reload: load,
  }
}
