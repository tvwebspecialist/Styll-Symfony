'use client'

/**
 * useRealtimeAppointments
 *
 * Subscribes to Supabase Realtime postgres_changes on the `appointments`
 * table and keeps the local state in sync without polling.
 *
 * Two usage modes
 * ---------------
 * 1. **Standalone** — no `onDataChange` provided.
 *    The hook fetches initial raw appointment rows and maintains them in
 *    state, merging INSERT / UPDATE / DELETE events as they arrive.
 *    Best for: BookingPage / PWA slot-availability checks.
 *
 * 2. **Trigger-only** — `onDataChange` provided.
 *    The hook skips the internal fetch entirely and calls `onDataChange`
 *    whenever a relevant change arrives.  The caller is responsible for
 *    fetching the full (possibly joined) data.
 *    Best for: CalendarioClient, where appointments need client names and
 *    service details that require a server-side query.
 *
 * @example Standalone — BookingPage
 * ```tsx
 * const { appointments, isConnected } = useRealtimeAppointments({
 *   tenantId,
 *   locationId,
 *   weekStart,
 *   weekEnd,
 * })
 * ```
 *
 * @example Trigger-only — CalendarioClient
 * ```tsx
 * const { isConnected } = useRealtimeAppointments({
 *   tenantId,
 *   weekStart,
 *   weekEnd,
 *   staffId: selectedStaffId,
 *   onDataChange: refetchAppointments,
 * })
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

/** Raw row from the `appointments` table (no joins). */
export interface RealtimeAppointment {
  id: string
  tenant_id: string
  client_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  booking_source: string
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface UseRealtimeAppointmentsOptions {
  /** Tenant to subscribe to (required). */
  tenantId: string
  /** Narrow subscription to a specific staff member. */
  staffId?: string | null
  /** Narrow subscription to a specific location. */
  locationId?: string | null
  /**
   * Lower-bound date for start_time (inclusive, YYYY-MM-DD).
   * Used both as a query filter and to ignore out-of-range realtime events.
   */
  weekStart?: string | null
  /**
   * Upper-bound date for start_time (exclusive, YYYY-MM-DD).
   * Used both as a query filter and to ignore out-of-range realtime events.
   */
  weekEnd?: string | null
  /**
   * Called whenever a relevant change arrives on the appointments table.
   * When provided the hook does NOT maintain its own appointments state —
   * use this to trigger a custom refetch (e.g. a server action returning
   * joined data).
   */
  onDataChange?: () => void
  /** Optional error handler called on fetch or subscription errors. */
  onError?: (error: Error) => void
}

export interface UseRealtimeAppointmentsResult {
  /**
   * Raw appointment rows.  Only populated in standalone mode
   * (i.e. when `onDataChange` is NOT provided).
   */
  appointments: RealtimeAppointment[]
  /** True while the initial fetch is in progress (standalone mode only). */
  loading: boolean
  /** Last error encountered during fetch or subscription setup. */
  error: Error | null
  /** True when the Supabase Realtime WebSocket channel is connected. */
  isConnected: boolean
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Real-time appointments hook.
 *
 * Lifecycle
 * ---------
 * 1. On mount: if standalone, run an initial SELECT via the browser client.
 * 2. Subscribe to `postgres_changes` on `appointments` filtered by tenant_id.
 * 3. On INSERT/UPDATE/DELETE (standalone): merge the event into local state.
 *    On any change (trigger-only): call `onDataChange()`.
 * 4. On unmount: remove the channel to prevent memory leaks.
 *
 * RLS requirement
 * ---------------
 * The Supabase browser client uses the anonymous/publishable key and is
 * subject to Row Level Security.  A SELECT policy on `appointments` must
 * exist for authenticated staff users (see rls_realtime_appointments.sql).
 * Supabase Realtime verifies RLS before broadcasting events to a subscriber.
 */
export function useRealtimeAppointments({
  tenantId,
  staffId,
  locationId,
  weekStart,
  weekEnd,
  onDataChange,
  onError,
}: UseRealtimeAppointmentsOptions): UseRealtimeAppointmentsResult {
  const isTriggerMode = Boolean(onDataChange)

  const [appointments, setAppointments] = useState<RealtimeAppointment[]>([])
  const [loading, setLoading] = useState(!isTriggerMode) // only load in standalone
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Stable refs so that callbacks passed by the caller never cause the
  // effect to re-run when they change identity between renders.
  const onDataChangeRef = useRef(onDataChange)
  const onErrorRef = useRef(onError)
  useEffect(() => { onDataChangeRef.current = onDataChange }, [onDataChange])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const handleError = useCallback((err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err))
    setError(e)
    onErrorRef.current?.(e)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    // ── 1. Initial fetch (standalone mode only) ─────────────────────────
    if (!isTriggerMode) {
      setLoading(true)
      setError(null)

      ;(async () => {
        try {
          let query = supabase
            .from('appointments')
            .select('*')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .order('start_time', { ascending: true })

          if (staffId)    query = query.eq('staff_id', staffId)
          if (locationId) query = query.eq('location_id', locationId)
          if (weekStart)  query = query.gte('start_time', `${weekStart}T00:00:00`)
          if (weekEnd)    query = query.lt('start_time', `${weekEnd}T00:00:00`)

          const { data, error: fetchErr } = await query

          if (cancelled) return
          if (fetchErr) throw new Error(fetchErr.message)
          setAppointments((data ?? []) as RealtimeAppointment[])
        } catch (err) {
          if (!cancelled) handleError(err)
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }

    // ── 2. Realtime subscription ────────────────────────────────────────
    // Channel name encodes the filter so each unique combination gets its
    // own channel and avoids cross-contamination between tabs/components.
    const channelName = [
      'appointments',
      tenantId,
      staffId    ?? 'all-staff',
      locationId ?? 'all-locs',
      weekStart  ?? 'any-start',
      weekEnd    ?? 'any-end',
    ].join(':')

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          // Server-side filter: only events for this tenant are broadcast.
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (cancelled) return

          // Determine the row carrying the start_time for range filtering.
          // For DELETE, payload.old may only contain the PK — handle gracefully.
          const record =
            payload.eventType === 'DELETE'
              ? (payload.old as Partial<RealtimeAppointment>)
              : (payload.new as RealtimeAppointment)

          const changeDate = record.start_time?.slice(0, 10)

          // Ignore events outside the requested date window.
          if (weekStart && changeDate && changeDate < weekStart) return
          if (weekEnd   && changeDate && changeDate >= weekEnd)  return

          // ── Trigger-only mode ────────────────────────────────────────
          if (onDataChangeRef.current) {
            onDataChangeRef.current()
            return
          }

          // ── Standalone mode: merge event into local state ────────────
          const newRow = payload.new as RealtimeAppointment
          const oldRow = payload.old as RealtimeAppointment

          if (payload.eventType === 'INSERT') {
            // Apply in-memory client-side filters (server filter only checks tenant).
            if (staffId    && newRow.staff_id    !== staffId)    return
            if (locationId && newRow.location_id !== locationId) return

            setAppointments((prev) => {
              // Deduplicate: skip if already present (can happen on reconnect).
              if (prev.some((a) => a.id === newRow.id)) return prev
              return [...prev, newRow].sort((a, b) =>
                a.start_time.localeCompare(b.start_time)
              )
            })
          } else if (payload.eventType === 'UPDATE') {
            setAppointments((prev) =>
              prev.map((a) => (a.id === newRow.id ? newRow : a))
            )
          } else if (payload.eventType === 'DELETE') {
            setAppointments((prev) => prev.filter((a) => a.id !== oldRow.id))
          }
        }
      )
      .subscribe((status, err) => {
        if (cancelled) return

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          if (err) handleError(new Error(`Realtime: ${status}`))
        } else {
          // TIMED_OUT, etc. — keep previous isConnected state; Supabase
          // will attempt to reconnect automatically.
          setIsConnected(false)
        }
      })

    // ── 3. Cleanup ───────────────────────────────────────────────────────
    return () => {
      cancelled = true
      setIsConnected(false)
      supabase.removeChannel(channel)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, staffId, locationId, weekStart, weekEnd, isTriggerMode])
  // Note: isTriggerMode (derived from !!onDataChange) is included so the
  // effect re-runs if the caller switches between standalone and trigger mode.
  // onDataChange / onError identity changes are handled via refs above.

  return { appointments, loading, error, isConnected }
}
