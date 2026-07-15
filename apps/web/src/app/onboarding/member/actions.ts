'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface MemberOnboardingData {
  fullName: string
  photoUrl?: string
  phone?: string
  services: string[]
  workingHours: Array<{
    day_of_week: number
    is_open: boolean
    open_time: string
    close_time: string
  }>
}

export async function getMemberStep1Context(tenantId: string): Promise<{
  success: boolean
  fullName?: string
  redirectTo?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, redirectTo: '/login' }
  }

  const db = createAdminClient()
  const { data: staffMember } = await db
    .from('staff_members')
    .select('id, is_active')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!staffMember?.is_active) {
    return { success: false, redirectTo: '/dashboard' }
  }

  return {
    success: true,
    fullName: user.user_metadata?.full_name || '',
  }
}

export async function completeMemberOnboarding(
  tenantId: string,
  data: MemberOnboardingData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Non autenticato' }
  }

  const db = createAdminClient()

  try {
    // Update profile
    const { error: profileError } = await db
      .from('profiles')
      .update({
        full_name: data.fullName,
        avatar_url: data.photoUrl || null,
        phone: data.phone || null,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('[completeMemberOnboarding] Profile update error:', profileError)
      return { success: false, error: 'Errore nell\'aggiornamento del profilo' }
    }

    // Get or verify staff member
    const { data: staffData, error: staffError } = await db
      .from('staff_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (staffError || !staffData) {
      console.error('[completeMemberOnboarding] Staff member not found:', staffError)
      return { success: false, error: 'Profilo staff non trovato' }
    }

    // Set staff services
    if (data.services.length > 0) {
      // Delete existing services
      await db.from('staff_services').delete().eq('staff_id', staffData.id)

      // Insert new services
      const rows = data.services.map((serviceId) => ({
        tenant_id: tenantId,
        staff_id: staffData.id,
        service_id: serviceId,
      }))
      const { error: servicesError } = await db.from('staff_services').insert(rows)
      if (servicesError) {
        console.error('[completeMemberOnboarding] Services error:', servicesError)
        return { success: false, error: 'Errore nell\'assegnazione dei servizi' }
      }
    }

    // Ensure staff_locations is set for all tenant locations (booking flow requires this)
    const { data: tenantLocations } = await db
      .from('locations')
      .select('id')
      .eq('tenant_id', tenantId)
    const { data: existingLocLinks } = await db
      .from('staff_locations')
      .select('location_id')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffData.id)
    const linkedLocationIds = new Set((existingLocLinks ?? []).map((r) => r.location_id))
    const missingLocRows = (tenantLocations ?? [])
      .filter((l) => !linkedLocationIds.has(l.id))
      .map((l) => ({ tenant_id: tenantId, staff_id: staffData.id, location_id: l.id }))
    if (missingLocRows.length > 0) {
      const { error: locError } = await db.from('staff_locations').insert(missingLocRows)
      if (locError) {
        console.error('[completeMemberOnboarding] staff_locations error:', locError)
      }
    }

    // Set working hours
    if (data.workingHours && data.workingHours.length > 0) {
      // Delete existing working hours
      await db.from('working_hours').delete().eq('staff_id', staffData.id)

      // Resolve default location for this tenant (auto-assign when single location)
      const { data: tenantLocationsForHours } = await db
        .from('locations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(2)
      const defaultLocId =
        (tenantLocationsForHours ?? []).length === 1
          ? (tenantLocationsForHours![0].id as string)
          : null

      // Insert new working hours
      const rows = data.workingHours
        .filter((h) => h.is_open)
        .map((h) => ({
          tenant_id: tenantId,
          staff_id: staffData.id,
          day_of_week: h.day_of_week,
          start_time: h.open_time,
          end_time: h.close_time,
          location_id: defaultLocId,
        }))

      if (rows.length > 0) {
        const { error: hoursError } = await db.from('working_hours').insert(rows)
        if (hoursError) {
          console.error('[completeMemberOnboarding] Working hours error:', hoursError)
          return { success: false, error: 'Errore nell\'impostazione degli orari' }
        }
      }
    }

    revalidatePath('/dashboard/team')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[completeMemberOnboarding] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    }
  }
}

export async function getMemberOnboardingContext(tenantId: string): Promise<{
  success: boolean
  services?: Array<{ id: string; name: string; category?: string }>
  error?: string
}> {
  const db = createAdminClient()

  const { data: services, error } = await db
    .from('services')
    .select('id, name, category')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getMemberOnboardingContext] Error:', error)
    return { success: false, error: 'Errore nel caricamento dei servizi' }
  }

  return { success: true, services: (services || []).map(s => ({ ...s, category: s.category ?? undefined })) }
}
