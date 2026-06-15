'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationCountState {
  count: number
  ring: boolean
}

const NotificationCountCtx = React.createContext<NotificationCountState>({
  count: 0,
  ring: false,
})

interface ProviderProps {
  children: React.ReactNode
  initialCount: number
  tenantId: string
  profileId: string
}

export function NotificationCountProvider({
  children,
  initialCount,
  tenantId,
  profileId,
}: ProviderProps) {
  const [count, setCount] = React.useState(initialCount)
  const [ring, setRing] = React.useState(false)

  // Re-sync with server count on each navigation (layout re-render)
  React.useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  React.useEffect(() => {
    if (!tenantId || !profileId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notif-badge:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as { is_read: boolean; profile_id: string | null }
          const isForMe = row.profile_id === null || row.profile_id === profileId
          if (!row.is_read && isForMe) {
            setCount((c) => c + 1)
            setRing(true)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const oldRow = payload.old as { is_read: boolean; profile_id: string | null }
          const newRow = payload.new as { is_read: boolean; profile_id: string | null }
          const isForMe = newRow.profile_id === null || newRow.profile_id === profileId
          // REPLICA IDENTITY FULL required for oldRow.is_read to be populated
          if (isForMe && oldRow.is_read === false && newRow.is_read === true) {
            setCount((c) => Math.max(0, c - 1))
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tenantId, profileId])

  // Auto-reset ring after animation completes
  React.useEffect(() => {
    if (!ring) return
    const timer = setTimeout(() => setRing(false), 650)
    return () => clearTimeout(timer)
  }, [ring])

  return (
    <NotificationCountCtx.Provider value={{ count, ring }}>
      {children}
    </NotificationCountCtx.Provider>
  )
}

export function useNotificationCount(): NotificationCountState {
  return React.useContext(NotificationCountCtx)
}
