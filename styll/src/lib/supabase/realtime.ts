import { supabase } from '../../config/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const subscribeToAppointments = (
  tenantId: string,
  callback: (payload: unknown) => void
): RealtimeChannel => {
  return supabase
    .channel(`appointments:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `tenant_id=eq.${tenantId}`,
      },
      callback
    )
    .subscribe()
}

export const subscribeToNotifications = (
  tenantId: string,
  staffId: string,
  callback: (payload: unknown) => void
): RealtimeChannel => {
  return supabase
    .channel(`notifications:${tenantId}:${staffId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'staff_notifications',
        filter: `tenant_id=eq.${tenantId}`,
      },
      callback
    )
    .subscribe()
}

export const unsubscribe = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel)
}
