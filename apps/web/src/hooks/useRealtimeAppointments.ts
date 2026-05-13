'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { Appointment } from '@/types'

/**
 * Options accepted by {@link useRealtimeAppointments}.
 */
export interface UseRealtimeAppointmentsOptions {
  /** Optional location filter applied to the initial SELECT and, when possible, to Realtime events. */
  locationId?: string
  /** Optional staff filter applied to the initial SELECT and, when possible, to Realtime events. */
  staffId?: string
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
 */
function matchesFilters(
  appointment: Appointment,
  locationId?: string,
  staffId?: string
): boolean {
  if (locationId && appointment.location_id !== locationId) return false
  if (staffId && appointment.staff_id !== staffId) return false
  return true
}

/**
 * Builds the single server-side Realtime filter supported by Supabase
 * postgres_changes. If both filters are provided, the broader location filter
 * runs server-side and the staff filter is enforced in the local payload guard.
 */
function buildRealtimeFilter(locationId?: string, staffId?: string): string | undefined {
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
  const { locationId, staffId } = options
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const onErrorRef = useRef(options.onError)

  useEffect(() => {
    onErrorRef.current = options.onError
  }, [options.onError])

  const reportError = useCallback((nextError: Error) => {
    setError(nextError)
    onErrorRef.current?.(nextError)
  }, [])

  useEffect(() => {
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

        if (locationId) {
          query = query.eq('location_id', locationId)
        }

        if (staffId) {
          query = query.eq('staff_id', staffId)
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
      const realtimeFilter = buildRealtimeFilter(locationId, staffId)

      try {
        channel = supabase
          .channel('realtime:appointments')
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

              if (payload.eventType === 'INSERT') {
                const newAppointment = payload.new as Appointment
                if (!matchesFilters(newAppointment, locationId, staffId)) return

                setAppointments((current) => {
                  if (current.some((appointment) => appointment.id === newAppointment.id)) {
                    return current
                  }

                  return sortAppointments([...current, newAppointment])
                })
              }

              if (payload.eventType === 'UPDATE') {
                const updatedAppointment = payload.new as Appointment

                setAppointments((current) => {
                  if (!matchesFilters(updatedAppointment, locationId, staffId)) {
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
              }

              if (payload.eventType === 'DELETE') {
                const deletedAppointment = payload.old as Pick<Appointment, 'id'>

                setAppointments((current) =>
                  current.filter((appointment) => appointment.id !== deletedAppointment.id)
                )
              }
            }
          )
          .subscribe((status, subscriptionError) => {
            if (!isActive) return

            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
              setError(null)
              return
            }

            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setIsConnected(false)
              reportError(
                toError(
                  subscriptionError,
                  `Errore connessione Realtime appointments: ${status}.`
                )
              )
              return
            }

            if (status === 'CLOSED') {
              setIsConnected(false)
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
  }, [locationId, staffId, reportError])

  return { appointments, loading, error, isConnected }
}
