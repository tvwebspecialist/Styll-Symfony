'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

type NotifInsertPayload = {
  is_read: boolean
  profile_id: string | null
}

type NotifUpdatePayload = {
  is_read: boolean
  profile_id: string | null
}

/**
 * Keeps the unread notification count in sync via Supabase Realtime.
 *
 * The initial count comes from the server (SSR layout); Realtime applies
 * incremental deltas without a full refetch:
 *   - INSERT with is_read=false → +1
 *   - UPDATE with is_read false→true → -1  (requires REPLICA IDENTITY FULL)
 *
 * The count re-syncs with the server value on each navigation (when the
 * layout Server Component re-renders and passes a fresh initialCount).
 *
 * @param initialCount  SSR-computed unread count from layout.tsx
 * @param tenantId      Tenant to subscribe for (used as Realtime filter)
 * @param profileId     Current staff profile id (client-side profile_id filter)
 * @param channelKey    Unique suffix to avoid channel-name collisions when
 *                      multiple components subscribe (e.g. "desktop", "mobile")
 */
export function useNotificationCount(
  initialCount: number,
  tenantId: string,
  profileId: string,
  channelKey: string,
): number {
  const [count, setCount] = React.useState(initialCount)

  // Re-sync when server re-renders on navigation
  React.useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  React.useEffect(() => {
    if (!tenantId || !profileId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-${channelKey}:${tenantId}`)
      .on<NotifInsertPayload>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new
          const isForMe = row.profile_id === null || row.profile_id === profileId
          if (!row.is_read && isForMe) {
            setCount((c) => c + 1)
          }
        }
      )
      .on<NotifUpdatePayload>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const oldRow = payload.old as NotifUpdatePayload
          const newRow = payload.new
          const isForMe = newRow.profile_id === null || newRow.profile_id === profileId
          if (isForMe && oldRow.is_read === false && newRow.is_read === true) {
            setCount((c) => Math.max(0, c - 1))
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tenantId, profileId, channelKey])

  return count
}
