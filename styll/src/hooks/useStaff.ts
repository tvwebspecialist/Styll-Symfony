import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import { useUIContext } from '../contexts/UIContext'
import type { StaffMember } from '../types/auth'

export const useStaff = () => {
  const { tenantId } = useAuth()
  const { showToast } = useUIContext()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('staff_members')
        .select('*, profiles(full_name, phone, avatar_url)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at')

      setStaff((data ?? []) as StaffMember[])
    } catch (err: unknown) {
      console.error('Error loading staff:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error: err } = await supabase
        .from('staff_members')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: isActive ? 'Staff attivato' : 'Staff sospeso' })
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
        .from('staff_members')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
        })
        .eq('id', id)

      if (err) throw err
      showToast({ type: 'success', title: 'Membro del team rimosso' })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  return {
    staff,
    isLoading,
    toggleActive,
    softDelete,
    reload: load,
  }
}
