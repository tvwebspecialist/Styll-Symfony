'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function getAuthenticatedClientId(tenantId: string): Promise<{ clientId: string; userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return null
  return { clientId: (client as { id: string }).id, userId: user.id }
}

export async function cancelClientAppointment(
  tenantId: string,
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await getAuthenticatedClientId(tenantId)
    if (!ctx) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()

    // Verify this appointment belongs to this client
    const { data: apt } = await db
      .from('appointments')
      .select('id, status, start_time, client_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .eq('client_id', ctx.clientId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!apt) return { ok: false, error: 'Appuntamento non trovato' }
    if (!['confirmed', 'pending'].includes(apt.status)) {
      return { ok: false, error: 'Appuntamento non cancellabile' }
    }
    if (new Date(apt.start_time) <= new Date()) {
      return { ok: false, error: 'Impossibile cancellare un appuntamento già passato' }
    }

    const { error } = await db
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)

    if (error) return { ok: false, error: error.message }

    revalidatePath(`/tenant/app`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateClientProfileData(
  tenantId: string,
  data: {
    fullName?: string
    phone?: string | null
    dateOfBirth?: string | null
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.fullName !== undefined) updates.full_name = data.fullName
    if (data.phone !== undefined) updates.phone = data.phone
    if (data.dateOfBirth !== undefined) updates.date_of_birth = data.dateOfBirth || null

    // Update profiles table
    const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.fullName !== undefined) profileUpdates.full_name = data.fullName
    if (data.phone !== undefined) profileUpdates.phone = data.phone

    await Promise.all([
      db.from('clients').update(updates).eq('tenant_id', tenantId).eq('profile_id', user.id).is('deleted_at', null),
      db.from('profiles').update(profileUpdates).eq('id', user.id),
    ])

    revalidatePath(`/tenant/app`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateNotificationPreferences(
  preferences: Record<string, boolean>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()
    const { data: profile } = await db
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .maybeSingle()

    const current = (profile?.notification_preferences as Record<string, boolean>) ?? {}
    const merged = { ...current, ...preferences }

    const { error } = await db
      .from('profiles')
      .update({ notification_preferences: merged, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateMarketingConsent(
  tenantId: string,
  consent: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()
    const { error } = await db
      .from('clients')
      .update({ marketing_consent: consent, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .is('deleted_at', null)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}
