import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import { useUIContext } from '../contexts/UIContext'
import type { AppointmentWithDetails, NewAppointment } from '../types/appointments'

export const useAppointments = (date?: string) => {
  const { tenantId } = useAuth()
  const { showToast } = useUIContext()
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    setError(null)
    try {
      const targetDate = date ?? new Date().toISOString().split('T')[0]
      const { data, error: err } = await supabase
        .from('appointments')
        .select(`
          *,
          clients(full_name, phone),
          staff_members(id, profiles(full_name, avatar_url)),
          appointment_services(*, services(name, duration_minutes)),
          appointment_products(*, products(name)),
          payments(id, amount, payment_method, status)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('start_time', `${targetDate}T00:00:00`)
        .lt('start_time', `${targetDate}T23:59:59`)
        .order('start_time')

      if (err) throw err
      setAppointments((data ?? []) as AppointmentWithDetails[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento degli appuntamenti'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, date])

  useEffect(() => {
    load()
  }, [load])

  const create = async (data: NewAppointment) => {
    if (!tenantId) return { error: 'Nessun tenant' }
    try {
      const totalDuration = 30 // Default, should be computed from services
      const start = new Date(data.start_time)
      const end = new Date(start.getTime() + totalDuration * 60 * 1000)

      const { data: appt, error: err } = await supabase
        .from('appointments')
        .insert({
          tenant_id: tenantId,
          client_id: data.client_id,
          staff_id: data.staff_id,
          location_id: data.location_id,
          start_time: data.start_time,
          end_time: data.end_time,
          status: 'confirmed',
          booking_source: data.booking_source ?? 'dashboard_owner',
          notes: data.notes,
        })
        .select()
        .single()

      if (err) throw err

      // Add services
      if (data.service_ids.length > 0) {
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, price')
          .in('id', data.service_ids)

        const serviceInserts = (servicesData ?? []).map(s => ({
          tenant_id: tenantId,
          appointment_id: appt!.id,
          service_id: s.id,
          price_at_booking: s.price,
        }))

        await supabase.from('appointment_services').insert(serviceInserts)
      }

      showToast({ type: 'success', title: 'Appuntamento creato' })
      await load()
      return { error: null, data: appt }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error: err } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: 'Appuntamento aggiornato' })
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
        .from('appointments')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
          status: 'cancelled',
        })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: 'Appuntamento cancellato' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  return {
    appointments,
    isLoading,
    error,
    create,
    updateStatus,
    softDelete,
    reload: load,
  }
}
