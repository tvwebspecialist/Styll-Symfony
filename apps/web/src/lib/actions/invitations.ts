'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string; tenantId?: string }> {
  const db = createAdminClient()
  const supabase = await createClient()

  // Get the invitation by token
  const { data: invitationData, error: invError } = await db
    .from('team_invitations')
    .select('id, tenant_id, email, role, expires_at, status')
    .eq('token', token)
    .maybeSingle()

  if (invError || !invitationData) {
    return { success: false, error: 'Invito non trovato' }
  }

  // Check if expired
  if (invitationData.status !== 'pending') {
    return { success: false, error: 'Questo invito non è più valido' }
  }

  if (new Date(invitationData.expires_at) < new Date()) {
    // Mark as expired
    await db
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationData.id)

    return { success: false, error: 'Questo invito è scaduto' }
  }

  // Get user profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Non autenticato' }
  }

  // Check if email matches
  if (user.email?.toLowerCase() !== invitationData.email.toLowerCase()) {
    return { success: false, error: `L'invito è destinato a ${invitationData.email}, ma sei loggato con ${user.email}` }
  }

  // Check if already staff member
  const { data: existingStaff } = await db
    .from('staff_members')
    .select('id')
    .eq('tenant_id', invitationData.tenant_id)
    .eq('profile_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (existingStaff) {
    return { success: false, error: 'Sei già membro di questo team' }
  }

  // Create staff member record
  const { data: staffData, error: staffError } = await db
    .from('staff_members')
    .insert({
      tenant_id: invitationData.tenant_id,
      profile_id: userId,
      role: invitationData.role,
      is_active: true,
    })
    .select('id')
    .single()

  if (staffError) {
    // Unique constraint violation → a concurrent request already created the row.
    // Treat as success: fetch the existing record so we can continue.
    if ((staffError as any).code === '23505') {
      const { data: concurrent } = await db
        .from('staff_members')
        .select('id')
        .eq('tenant_id', invitationData.tenant_id)
        .eq('profile_id', userId)
        .is('deleted_at', null)
        .maybeSingle()
      if (!concurrent) {
        return { success: false, error: 'Errore nella creazione del profilo staff' }
      }
      // Fall through with the existing row — mark invitation accepted below.
    } else {
      console.error('[acceptInvitation] Staff member creation error:', staffError)
      return { success: false, error: 'Errore nella creazione del profilo staff' }
    }
  }

  // Update invitation status
  const { error: updateError } = await db
    .from('team_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitationData.id)

  if (updateError) {
    console.error('[acceptInvitation] Invitation update error:', updateError)
    // Still return success since the staff member was created
  }

  revalidatePath('/onboarding/member')
  revalidatePath('/dashboard/team')

  return { success: true, tenantId: invitationData.tenant_id }
}

export async function getInvitationDetails(
  token: string
): Promise<{ success: boolean; tenantName?: string; role?: string; error?: string }> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('team_invitations')
    .select('role, status, expires_at, tenants(business_name)')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) {
    return { success: false, error: 'Invito non trovato' }
  }

  if (data.status !== 'pending') {
    return { success: false, error: 'Questo invito non è più valido' }
  }

  if (new Date(data.expires_at) < new Date()) {
    return { success: false, error: 'Questo invito è scaduto' }
  }

  const tenantName = (data.tenants as any)?.business_name ?? ''

  return {
    success: true,
    tenantName,
    role: data.role,
  }
}
