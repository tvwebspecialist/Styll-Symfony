'use server'

import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffMemberRow {
  id: string
  profileId: string | null
  role: 'owner' | 'manager' | 'staff' | 'receptionist'
  isActive: boolean
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  locationNames: string[]
  serviceCount: number
}

export interface TeamData {
  staffMembers: StaffMemberRow[]
  allServices: { id: string; name: string; category: string | null; is_active: boolean }[]
  currentStaff: { staffId: string; role: string } | null
}

// ─── getTeamData ──────────────────────────────────────────────────────────────

export async function getTeamData(): Promise<TeamData> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { staffMembers: [], allServices: [], currentStaff: null }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const db = createAdminClient()

  const [staffRes, locsRes, allServicesRes, currentStaffRes] = await Promise.all([
    db
      .from('staff_members')
      .select('id, profile_id, role, is_active, profiles(full_name, email, avatar_url)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('role', { ascending: true }),
    db.from('locations').select('id, name').eq('tenant_id', tenantId).eq('is_active', true),
    db
      .from('services')
      .select('id, name, category, is_active')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true }),
    user
      ? db
          .from('staff_members')
          .select('id, role')
          .eq('tenant_id', tenantId)
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rawStaff = staffRes.data ?? []
  const locations = locsRes.data ?? []
  const allServices = allServicesRes.data ?? []

  const staffIds = rawStaff.map((sm) => sm.id)
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]))

  // Load staff_locations and staff_services without tenant_id (join tables)
  const [staffLocsRes, staffServicesRes] = await Promise.all([
    staffIds.length > 0
      ? db.from('staff_locations').select('staff_id, location_id').in('staff_id', staffIds)
      : Promise.resolve({ data: [] }),
    staffIds.length > 0
      ? db.from('staff_services').select('staff_id, service_id').in('staff_id', staffIds)
      : Promise.resolve({ data: [] }),
  ])

  const staffLocs = staffLocsRes.data ?? []
  const staffServices = staffServicesRes.data ?? []

  const staffMembers: StaffMemberRow[] = rawStaff.map((sm) => {
    const profile = (sm.profiles as any) ?? {}
    const myLocs = (staffLocs as any[])
      .filter((sl) => sl.staff_id === sm.id)
      .map((sl) => locMap.get(sl.location_id) ?? '')
      .filter(Boolean)
    const myServiceCount = (staffServices as any[]).filter((ss) => ss.staff_id === sm.id).length
    return {
      id: sm.id,
      profileId: sm.profile_id ?? null,
      role: sm.role as StaffMemberRow['role'],
      isActive: (sm as any).is_active ?? true,
      fullName: profile.full_name ?? null,
      email: profile.email ?? null,
      avatarUrl: profile.avatar_url ?? null,
      locationNames: myLocs as string[],
      serviceCount: myServiceCount,
    }
  })

  const currentStaffData = currentStaffRes.data as any
  const currentStaff = currentStaffData
    ? { staffId: currentStaffData.id as string, role: currentStaffData.role as string }
    : null

  return {
    staffMembers,
    allServices: (allServices ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      category: (s as any).category ?? null,
      is_active: (s as any).is_active ?? true,
    })),
    currentStaff,
  }
}

// ─── getStaffServices ─────────────────────────────────────────────────────────

export async function getStaffServices(staffId: string): Promise<{ serviceIds: string[] }> {
  const db = createAdminClient()
  const { data } = await db.from('staff_services').select('service_id').eq('staff_id', staffId)
  return { serviceIds: (data ?? []).map((r: any) => r.service_id) }
}

// ─── setStaffServices ─────────────────────────────────────────────────────────

export async function setStaffServices(
  staffId: string,
  serviceIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  await db.from('staff_services').delete().eq('staff_id', staffId)

  if (serviceIds.length > 0) {
    const rows = serviceIds.map((sid) => ({
      staff_id: staffId,
      service_id: sid,
    }))
    const { error } = await db.from('staff_services').insert(rows)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

// ─── inviteTeamMember ─────────────────────────────────────────

export async function inviteTeamMember(
  email: string,
  role: 'owner' | 'manager' | 'staff' | 'receptionist'
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getActiveTenantId()
    if (!tenantId) return { success: false, error: 'Tenant non trovato' }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Non autenticato' }

    const db = createAdminClient()

    // Verify user is owner or manager
  const { data: staffData, error: staffError } = await db
    .from('staff_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (staffError || !staffData || !['owner', 'manager'].includes(staffData.role)) {
    return { success: false, error: 'Non hai i permessi per invitare membri' }
  }

  // Check if there's already a pending invitation for this email
  const { data: existingInvite } = await db
    .from('team_invitations')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInvite) {
    return { success: false, error: 'Un invito è già stato inviato a questo email' }
  }

  // Check if user already exists as staff member
  let profiles = null
  try {
    const result = await db
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()
    profiles = result.data
  } catch (e) {
    // Profile not found, that's ok
  }

  if (profiles) {
    const { data: existingStaff } = await db
      .from('staff_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('profile_id', profiles.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingStaff) {
      return { success: false, error: 'Questo utente è già membro del team' }
    }
  }

  // Generate invitation token
  const token = randomBytes(32).toString('hex')

  // Create invitation record
  const { data: invitationData, error: invitationError } = await db
    .from('team_invitations')
    .insert({
      tenant_id: tenantId,
      email: email.toLowerCase(),
      token,
      role,
      created_by: user.id,
      status: 'pending',
    })
    .select('id, expires_at')
    .single()

  if (invitationError) {
    console.error('[inviteTeamMember] Invitation creation error:', invitationError)
    return { success: false, error: 'Errore nella creazione dell\'invito' }
  }

  // Get tenant name and inviter name for email
  const { data: tenantData } = await db
    .from('tenants')
    .select('business_name')
    .eq('id', tenantId)
    .single()

  const { data: profileData } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const tenantName = tenantData?.business_name || 'Styll'
  const inviterName = profileData?.full_name || 'Un membro del team'

  // Send invitation email
  const { sendInvitationEmail } = await import('@/lib/email')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const invitationLink = `${appUrl}/invite?token=${token}`

  const emailResult = await sendInvitationEmail({
    recipientEmail: email.toLowerCase(),
    tenantName,
    inviterName,
    role,
    invitationToken: token,
    invitationLink,
  })

  if (!emailResult.success) {
    // Delete the invitation if email fails
    await db.from('team_invitations').delete().eq('id', invitationData.id)
    return { success: false, error: `Errore nell'invio dell'email: ${emailResult.error}` }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
  } catch (error) {
    console.error('[inviteTeamMember] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto durante l\'invio'
    return { success: false, error: errorMessage }
  }
}
