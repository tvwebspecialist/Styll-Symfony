'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { Appointment } from '@/types'

/**
 * Options accepted by {@link useRealtimeAppointments}.
 */
export interface UseRealtimeAppointmentsOptions {
  /** Optional tenant filter applied to the initial SELECT and, when possible, to Realtime events. */
  tenantId?: string
  /** Optional location filter applied to the initial SELECT and, when possible, to Realtime events. */
  locationId?: string
  /** Optional staff filter applied to the initial SELECT and, when possible, to Realtime events. */
  staffId?: string
  /** Optional inclusive start date (`YYYY-MM-DD`) used to limit the initial SELECT and local payload handling. */
  startDate?: string
  /** Optional exclusive end date (`YYYY-MM-DD`) used to limit the initial SELECT and local payload handling. */
  endDate?: string
  /** Optional callback invoked after a matching INSERT, UPDATE or DELETE event is received. */
  onDataChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE') => void | Promise<void>
  /** Optional callback invoked whenever the hook receives a load or subscription error. */
  onError?: (error: Error) => void
}

/**
 * State returned by {@link useRealtimeAppointments}.
 */
export interface UseRealtimeAppointmentsResult {
  /** Appointments sorted by appointment start timestamp. */
  appointments: Appointment[]
  /** True while the initial appointments query is running. */
  loading: boolean
  /** Last loading or Realtime subscription error, if any. */
  error: Error | null
  /** True when the Supabase Realtime channel is subscribed through WebSocket. */
  isConnected: boolean
}

/**
 * Converts any thrown/subscription value into a real Error instance.
 */
function toError(value: unknown, fallbackMessage: string): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string' && value.length > 0) return new Error(value)
  return new Error(fallbackMessage)
}

/**
 * Keeps the appointments list ordered chronologically.
 *
 * The current generated database type stores the date and time in `start_time`
 * / `end_time`, so sorting by `start_time` is equivalent to date + time ASC.
 */
function sortAppointments(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => a.start_time.localeCompare(b.start_time))
}

/**
 * Checks whether an appointment belongs to the active hook filters.
 *
 * NOTE: Supabase Realtime sends `timestamptz` columns in PostgreSQL native
 * format ("2024-06-18 07:00:00+00" with a space), NOT ISO-8601 ("T") like
 * PostgREST does. Raw string comparison breaks when the appointment date
 * equals startDate (space < T in ASCII), so we always parse through Date.
 */
function matchesFilters(
  appointment: Partial<Appointment>,
  tenantId?: string,
  locationId?: string,
  staffId?: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (tenantId && appointment.tenant_id && appointment.tenant_id !== tenantId) return false
  if (locationId && appointment.location_id && appointment.location_id !== locationId) return false
  if (staffId && appointment.staff_id && appointment.staff_id !== staffId) return false
  if (startDate && appointment.start_time) {
    // Replace the PostgreSQL space separator with 'T' before parsing so that
    // both "2024-06-18 07:00:00+00" and "2024-06-18T07:00:00+00:00" parse correctly.
    const apptMs = new Date(appointment.start_time.replace(' ', 'T')).getTime()
    if (apptMs < new Date(`${startDate}T00:00:00Z`).getTime()) return false
  }
  if (endDate && appointment.start_time) {
    const apptMs = new Date(appointment.start_time.replace(' ', 'T')).getTime()
    if (apptMs >= new Date(`${endDate}T00:00:00Z`).getTime()) return false
  }
  return true
}

/**
 * Builds the single server-side Realtime filter supported by Supabase
 * postgres_changes. If both filters are provided, the broader location filter
 * runs server-side and the staff filter is enforced in the local payload guard.
 */
function buildRealtimeFilter(
  tenantId?: string,
  locationId?: string,
  staffId?: string
): string | undefined {
  if (tenantId) return `tenant_id=eq.${tenantId}`
  if (locationId) return `location_id=eq.${locationId}`
  if (staffId) return `staff_id=eq.${staffId}`
  return undefined
}

/**
 * Loads appointments from Supabase and keeps them synchronized through
 * Supabase Realtime postgres_changes events.
 *
 * @param options Optional filters and error callback.
 * @returns Sorted appointments plus loading, error and WebSocket connection state.
 *
 * @example
 * const { appointments, isConnected, loading, error } = useRealtimeAppointments({
 *   locationId: 'uuid-123',
 * })
 */
export function useRealtimeAppointments(
  options: UseRealtimeAppointmentsOptions = {}
): UseRealtimeAppointmentsResult {
  const { tenantId, locationId, staffId, startDate, endDate } = options

  console.log('🔍 useRealtimeAppointments called with:', { tenantId, locationId, staffId, startDate, endDate })

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Keep callbacks in refs so the main useEffect never needs to re-subscribe
  // just because a caller recreated an inline function.
  const onErrorRef = useRef(options.onError)
  const onDataChangeRef = useRef(options.onDataChange)
  useEffect(() => {
    onErrorRef.current = options.onError
    onDataChangeRef.current = options.onDataChange
  })  // intentionally no dep array — runs after every render to stay current

  // Collapse all primitive filter values into one memoized reference so the
  // subscription effect has a single stable dep and won't re-run when the
  // caller re-renders with the same string values.
  const filters = useMemo(
    () => ({ tenantId, locationId, staffId, startDate, endDate }),
    [tenantId, locationId, staffId, startDate, endDate]
  )

  const reportError = useCallback((nextError: Error) => {
    setError(nextError)
    onErrorRef.current?.(nextError)
  }, [])

  const notifyDataChange = useCallback((event: 'INSERT' | 'UPDATE' | 'DELETE') => {
    try {
      const result = onDataChangeRef.current?.(event)
      if (result instanceof Promise) {
        result.catch((caught) => {
          reportError(toError(caught, 'Errore durante il refresh degli appuntamenti.'))
        })
      }
    } catch (caught) {
      reportError(toError(caught, 'Errore durante il refresh degli appuntamenti.'))
    }
  }, [reportError])

  useEffect(() => {
    const { tenantId, locationId, staffId, startDate, endDate } = filters
    const supabase = createClient()
    let isActive = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function loadInitialAppointments() {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('appointments')
          .select('*')
          .order('start_time', { ascending: true })

        if (tenantId) {
          query = query.eq('tenant_id', tenantId)
        }

        if (locationId) {
          query = query.eq('location_id', locationId)
        }

        if (staffId) {
          query = query.eq('staff_id', staffId)
        }

        if (startDate) {
          query = query.gte('start_time', `${startDate}T00:00:00Z`)
        }

        if (endDate) {
          query = query.lt('start_time', `${endDate}T00:00:00Z`)
        }

        const { data, error: queryError } = await query

        if (!isActive) return

        if (queryError) {
          throw queryError
        }

        setAppointments(sortAppointments(data ?? []))
      } catch (caught) {
        if (!isActive) return
        reportError(toError(caught, 'Errore durante il caricamento degli appuntamenti.'))
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    function subscribeToRealtime() {
      if (!tenantId) {
        console.error('❌ tenantId è undefined/null! Realtime non può connettersi')
        setIsConnected(false)
        reportError(new Error('tenantId mancante'))
        return
      }
      console.log('✅ tenantId ok:', tenantId)

      const realtimeFilter = buildRealtimeFilter(tenantId, locationId, staffId)

      try {
        channel = supabase
          .channel(`calendar:appointments:${tenantId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'appointments',
              ...(realtimeFilter ? { filter: realtimeFilter } : {}),
            },
            (payload) => {
              if (!isActive) return
              console.log('📡 Realtime event ricevuto:', payload)
              if (payload.eventType === 'INSERT') {
                const newAppointment = payload.new as Appointment
                if (!matchesFilters(newAppointment, tenantId, locationId, staffId, startDate, endDate)) return

                setAppointments((current) => {
                  if (current.some((appointment) => appointment.id === newAppointment.id)) {
                    return current
                  }

                  return sortAppointments([...current, newAppointment])
                })
                notifyDataChange('INSERT')
              }

              if (payload.eventType === 'UPDATE') {
                const updatedAppointment = payload.new as Appointment
                const previousAppointment = payload.old as Partial<Appointment>
                const affectedCurrentRange =
                  matchesFilters(updatedAppointment, tenantId, locationId, staffId, startDate, endDate) ||
                  matchesFilters(previousAppointment, tenantId, locationId, staffId, startDate, endDate)

                if (!affectedCurrentRange) return

                setAppointments((current) => {
                  if (!matchesFilters(updatedAppointment, tenantId, locationId, staffId, startDate, endDate)) {
                    return current.filter(
                      (appointment) => appointment.id !== updatedAppointment.id
                    )
                  }

                  const exists = current.some(
                    (appointment) => appointment.id === updatedAppointment.id
                  )

                  if (!exists) {
                    return sortAppointments([...current, updatedAppointment])
                  }

                  return sortAppointments(
                    current.map((appointment) =>
                      appointment.id === updatedAppointment.id ? updatedAppointment : appointment
                    )
                  )
                })
                notifyDataChange('UPDATE')
              }

              if (payload.eventType === 'DELETE') {
                const deletedAppointment = payload.old as Partial<Appointment> & Pick<Appointment, 'id'>
                if (!matchesFilters(deletedAppointment, tenantId, locationId, staffId, startDate, endDate)) return

                setAppointments((current) =>
                  current.filter((appointment) => appointment.id !== deletedAppointment.id)
                )
                notifyDataChange('DELETE')
              }
            }
          )
          .subscribe((status, subscriptionError) => {
            if (!isActive) return

            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime SUBSCRIBED')
              setIsConnected(true)
              setError(null)
              return
            }

            // CLOSED during normal cleanup — not an error
            if (status === 'CLOSED') {
              setIsConnected(false)
              return
            }

            // Only CHANNEL_ERROR and TIMED_OUT are real failures
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ Realtime status:', status, subscriptionError)
              setIsConnected(false)
              reportError(
                toError(
                  subscriptionError,
                  `Errore connessione Realtime appointments: ${status}.`
                )
              )
            }
          })
      } catch (caught) {
        setIsConnected(false)
        reportError(toError(caught, 'Errore durante la subscription Realtime appointments.'))
      }
    }

    void loadInitialAppointments()
    subscribeToRealtime()

    return () => {
      isActive = false
      setIsConnected(false)

      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [filters, reportError, notifyDataChange])

  return { appointments, loading, error, isConnected }
}
