'use server'

import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { MANAGER_ROLES } from '@/lib/constants'
import type { TablesUpdate } from '@/types'

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
  currentStaff: { staffId: string; role: string } | null
}

type TeamRole = StaffMemberRow['role']
type TeamActorRole = TeamRole | 'superadmin'

type CurrentStaffRow = {
  id: string
  role: TeamActorRole
}

type TargetStaffRow = {
  id: string
  role: TeamRole
}

async function getTeamActorContext(): Promise<{
  tenantId: string
  db: ReturnType<typeof createAdminClient>
  currentStaff: CurrentStaffRow
} | null> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: currentStaff } = await db
    .from('staff_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!currentStaff) {
    const { data: profile } = await db
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_superadmin) return null

    return {
      tenantId,
      db,
      currentStaff: {
        id: user.id,
        role: 'superadmin',
      },
    }
  }

  return {
    tenantId,
    db,
    currentStaff: currentStaff as CurrentStaffRow,
  }
}

async function getTargetStaffInTenant(
  db: ReturnType<typeof createAdminClient>,
  tenantId: string,
  staffId: string,
): Promise<TargetStaffRow | null> {
  const { data: targetStaff } = await db
    .from('staff_members')
    .select('id, role')
    .eq('id', staffId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  return (targetStaff as TargetStaffRow | null) ?? null
}

function isOwnerRole(role: TeamRole): boolean {
  return role === 'owner'
}

function canAssignOwnerRole(
  currentStaff: CurrentStaffRow,
  role: TeamRole,
): boolean {
  return !isOwnerRole(role) || currentStaff.role === 'owner' || currentStaff.role === 'superadmin'
}

function hasTeamManagementPermissions(currentStaff: CurrentStaffRow): boolean {
  return currentStaff.role === 'superadmin'
    || MANAGER_ROLES.includes(currentStaff.role as typeof MANAGER_ROLES[number])
}

function canManageTargetStaff(
  currentStaff: CurrentStaffRow,
  targetStaff: TargetStaffRow,
  allowStaffSelf = false,
): boolean {
  if (currentStaff.role === 'owner' || currentStaff.role === 'superadmin') {
    return true
  }

  if (currentStaff.role === 'manager') {
    return !isOwnerRole(targetStaff.role)
  }

  return allowStaffSelf && currentStaff.role === 'staff' && currentStaff.id === targetStaff.id
}

async function validateServiceIdsForTenant(
  db: ReturnType<typeof createAdminClient>,
  tenantId: string,
  serviceIds: string[],
): Promise<boolean> {
  if (serviceIds.length === 0) return true

  const { data: services } = await db
    .from('services')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', serviceIds)

  return (services?.length ?? 0) === new Set(serviceIds).size
}

async function validateLocationIdsForTenant(
  db: ReturnType<typeof createAdminClient>,
  tenantId: string,
  locationIds: string[],
): Promise<boolean> {
  if (locationIds.length === 0) return true

  const { data: locations } = await db
    .from('locations')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', locationIds)

  return (locations?.length ?? 0) === new Set(locationIds).size
}

// ─── getTeamData ──────────────────────────────────────────────────────────────

export async function getTeamData(): Promise<TeamData> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { staffMembers: [], currentStaff: null }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const db = createAdminClient()

  const [staffRes, locsRes, currentStaffRes, currentProfileRes] = await Promise.all([
    db
      .from('staff_members')
      .select('id, profile_id, role, is_active, photo_url, profiles(full_name, email, avatar_url)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('role', { ascending: true }),
    db.from('locations').select('id, name').eq('tenant_id', tenantId).eq('is_active', true),
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
    user
      ? db
          .from('profiles')
          .select('is_superadmin')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rawStaff = staffRes.data ?? []
  const locations = locsRes.data ?? []

  const staffIds = rawStaff.map((sm) => sm.id)
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]))

  const staffLocsRes = staffIds.length > 0
    ? await db.from('staff_locations').select('staff_id, location_id').in('staff_id', staffIds)
    : { data: [] }

  const staffLocs = staffLocsRes.data ?? []

  const staffMembers: StaffMemberRow[] = rawStaff.map((sm) => {
    const profile = (sm.profiles as any) ?? {}
    const myLocs = (staffLocs as any[])
      .filter((sl) => sl.staff_id === sm.id)
      .map((sl) => locMap.get(sl.location_id) ?? '')
      .filter(Boolean)
    return {
      id: sm.id,
      profileId: sm.profile_id ?? null,
      role: sm.role as StaffMemberRow['role'],
      isActive: (sm as any).is_active ?? true,
      fullName: profile.full_name ?? null,
      email: profile.email ?? null,
      avatarUrl: (sm as any).photo_url || profile.avatar_url || null,
      locationNames: myLocs as string[],
      serviceCount: 0,
    }
  })

  const currentStaffData = currentStaffRes.data as any
  const currentStaff = currentStaffData
    ? { staffId: currentStaffData.id as string, role: currentStaffData.role as string }
    : (currentProfileRes.data as { is_superadmin?: boolean } | null)?.is_superadmin
      ? { staffId: user!.id, role: 'superadmin' }
    : null

  return { staffMembers, currentStaff }
}

// ─── getStaffServices ─────────────────────────────────────────────────────────

export async function getStaffServices(staffId: string): Promise<{ serviceIds: string[] }> {
  const ctx = await getTeamActorContext()
  if (!ctx) return { serviceIds: [] }

  const targetStaff = await getTargetStaffInTenant(ctx.db, ctx.tenantId, staffId)
  if (!targetStaff || !canManageTargetStaff(ctx.currentStaff, targetStaff, true)) {
    return { serviceIds: [] }
  }

  const { data } = await ctx.db
    .from('staff_services')
    .select('service_id')
    .eq('tenant_id', ctx.tenantId)
    .eq('staff_id', staffId)

  return { serviceIds: (data ?? []).map((r: any) => r.service_id) }
}

// ─── setStaffServices ─────────────────────────────────────────────────────────

export async function setStaffServices(
  staffId: string,
  serviceIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getTeamActorContext()
  if (!ctx) return { success: false, error: 'Non autorizzato' }

  const targetStaff = await getTargetStaffInTenant(ctx.db, ctx.tenantId, staffId)
  if (!targetStaff || !canManageTargetStaff(ctx.currentStaff, targetStaff, true)) {
    return { success: false, error: 'Non autorizzato' }
  }

  const servicesBelongToTenant = await validateServiceIdsForTenant(ctx.db, ctx.tenantId, serviceIds)
  if (!servicesBelongToTenant) {
    return { success: false, error: 'Non autorizzato' }
  }

  await ctx.db
    .from('staff_services')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('staff_id', staffId)

  if (serviceIds.length > 0) {
    const rows = serviceIds.map((sid) => ({
      staff_id: staffId,
      service_id: sid,
      tenant_id: ctx.tenantId,
    }))
    const { error } = await ctx.db.from('staff_services').insert(rows)
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
    const ctx = await getTeamActorContext()
    if (!ctx) return { success: false, error: 'Non autorizzato' }
    if (!hasTeamManagementPermissions(ctx.currentStaff)) {
      return { success: false, error: 'Non hai i permessi per invitare membri' }
    }
    if (!canAssignOwnerRole(ctx.currentStaff, role)) {
      return { success: false, error: 'Solo il titolare può invitare un altro titolare' }
    }

    const tenantId = ctx.tenantId
    const db = ctx.db
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Non autenticato' }

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
     // Profile not found during team member removal — non-critical
     console.warn('[team] Profile lookup failed during removal:', e)
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

// ─── updateStaffRole ──────────────────────────────────────────────────────────

export async function updateStaffRole(
  staffId: string,
  role: 'owner' | 'manager' | 'staff' | 'receptionist',
  isActive?: boolean
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getTeamActorContext()
  if (!ctx) return { success: false, error: 'Non autorizzato' }

  const targetStaff = await getTargetStaffInTenant(ctx.db, ctx.tenantId, staffId)
  if (!targetStaff) {
    return { success: false, error: 'Non autorizzato' }
  }

  if (!hasTeamManagementPermissions(ctx.currentStaff)) {
    return { success: false, error: 'Non hai i permessi per modificare i membri' }
  }
  if (!canManageTargetStaff(ctx.currentStaff, targetStaff)) {
    return { success: false, error: 'Solo il titolare può modificare un titolare' }
  }
  if (!canAssignOwnerRole(ctx.currentStaff, role)) {
    return { success: false, error: 'Solo il titolare può assegnare il ruolo di titolare' }
  }

  const updates: TablesUpdate<'staff_members'> = {
    role,
    ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
  }

  const { error } = await ctx.db
    .from('staff_members')
    .update(updates)
    .eq('id', staffId)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/team')
  return { success: true }
}

// ─── removeStaffMember ────────────────────────────────────────────────────────

export async function removeStaffMember(staffId: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await getTeamActorContext()
  if (!ctx) return { success: false, error: 'Non autorizzato' }

  const targetStaff = await getTargetStaffInTenant(ctx.db, ctx.tenantId, staffId)
  if (!targetStaff) return { success: false, error: 'Non autorizzato' }

  if (ctx.currentStaff.role !== 'owner' && ctx.currentStaff.role !== 'superadmin') {
    return { success: false, error: 'Solo il titolare o il superadmin possono rimuovere i membri' }
  }
  if (ctx.currentStaff.id === staffId) {
    return { success: false, error: 'Non puoi rimuovere te stesso' }
  }

  const { error } = await ctx.db
    .from('staff_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', staffId)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/team')
  return { success: true }
}

// ─── getStaffAvailability ─────────────────────────────────────────────────────

// day_of_week DB convention: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
// Display order: [1,2,3,4,5,6,0]

export interface AvailabilityDay {
  day_of_week: number // DB value: 0=Sun, 1=Mon … 6=Sat
  is_active: boolean
  start_time: string
  end_time: string
  location_id: string | null
}

export interface StaffAvailabilityData {
  days: AvailabilityDay[]
  locations: Array<{ id: string; name: string }>
}

export async function getStaffAvailability(staffId: string): Promise<StaffAvailabilityData> {
  const ctx = await getTeamActorContext()
  if (!ctx) return { days: [], locations: [] }

  const targetStaff = await getTargetStaffInTenant(ctx.db, ctx.tenantId, staffId)
  if (!targetStaff || !canManageTargetStaff(ctx.currentStaff, targetStaff, true)) {
    return { days: [], locations: [] }
  }

  const [whRes, locsRes] = await Promise.all([
    ctx.db
      .from('working_hours')
      .select('day_of_week, start_time, end_time, location_id')
      .eq('staff_id', staffId)
      .eq('tenant_id', ctx.tenantId),
    ctx.db
      .from('locations')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  const wh = (whRes.data ?? []) as Array<{
    day_of_week: number; start_time: string; end_time: string; location_id: string | null
  }>
  const locations = (locsRes.data ?? []) as Array<{ id: string; name: string }>
  const defaultLocationId = locations.length === 1 ? locations[0].id : null

  // Build rows in display order: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
  const displayOrder = [1, 2, 3, 4, 5, 6, 0]
  const days: AvailabilityDay[] = displayOrder.map((d) => {
    const row = wh.find((r) => r.day_of_week === d)
    return {
      day_of_week: d,
      is_active: !!row,
      start_time: row?.start_time ?? '09:00',
      end_time: row?.end_time ?? '18:00',
      location_id: row?.location_id ?? defaultLocationId,
    }
  })

  return { days, locations }
}

// ─── saveStaffAvailability ────────────────────────────────────────────────────

export async function saveStaffAvailability(
  staffId: string,
  days: AvailabilityDay[]
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getTeamActorContext()
  if (!ctx) return { success: false, error: 'Non autorizzato' }

  const targetStaff = await getTargetStaffInTenant(ctx.db, ctx.tenantId, staffId)
  if (!targetStaff || !canManageTargetStaff(ctx.currentStaff, targetStaff, true)) {
    return { success: false, error: 'Non autorizzato' }
  }

  const locationIds = days
    .map((d) => d.location_id)
    .filter((id): id is string => id !== null)

  const locationsBelongToTenant = await validateLocationIdsForTenant(ctx.db, ctx.tenantId, locationIds)
  if (!locationsBelongToTenant) {
    return { success: false, error: 'Non autorizzato' }
  }

  // Delete all existing hours then re-insert active ones (clean approach)
  const { error: delErr } = await ctx.db
    .from('working_hours')
    .delete()
    .eq('staff_id', staffId)
    .eq('tenant_id', ctx.tenantId)
  if (delErr) return { success: false, error: delErr.message }

  const activeDays = days.filter((d) => d.is_active)
  if (activeDays.length > 0) {
    const { error: insErr } = await ctx.db.from('working_hours').insert(
      activeDays.map((d) => ({
        tenant_id: ctx.tenantId,
        staff_id: staffId,
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        location_id: d.location_id,
      }))
    )
    if (insErr) return { success: false, error: insErr.message }
  }

  // Sync staff_locations: keep only locations used in at least one active day
  const usedLocationIds = [
    ...new Set(activeDays.map((d) => d.location_id).filter((id): id is string => id !== null)),
  ]

  const { data: currentLinks } = await ctx.db
    .from('staff_locations')
    .select('id, location_id')
    .eq('staff_id', staffId)
    .eq('tenant_id', ctx.tenantId)

  const currentLocIds = ((currentLinks ?? []) as Array<{ id: string; location_id: string }>).map(
    (r) => r.location_id
  )
  const toAdd = usedLocationIds.filter((id) => !currentLocIds.includes(id))
  const toRemove = currentLocIds.filter((id) => !usedLocationIds.includes(id))

  if (toRemove.length > 0) {
    await ctx.db
      .from('staff_locations')
      .delete()
      .eq('staff_id', staffId)
      .eq('tenant_id', ctx.tenantId)
      .in('location_id', toRemove)
  }
  if (toAdd.length > 0) {
    await ctx.db.from('staff_locations').insert(
      toAdd.map((locId) => ({ tenant_id: ctx.tenantId, staff_id: staffId, location_id: locId }))
    )
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

// ─── startStaffView ───────────────────────────────────────────────────────────

const STAFF_VIEW_COOKIE = 'styll_staff_view'

export async function startStaffView(
  staffId: string,
  staffName: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getTeamActorContext()
  if (!ctx) return { success: false, error: 'Non autorizzato' }

  const targetStaff = await getTargetStaffInTenant(ctx.db, ctx.tenantId, staffId)
  if (!targetStaff) return { success: false, error: 'Non autorizzato' }

  if (ctx.currentStaff.role !== 'owner' && ctx.currentStaff.role !== 'superadmin') {
    return { success: false, error: 'Solo il titolare o il superadmin possono attivare la staff view' }
  }

  const cookieStore = await cookies()
  cookieStore.set(STAFF_VIEW_COOKIE, JSON.stringify({ staffId, staffName, tenantId: ctx.tenantId }), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 ore
    path: '/',
  })

  revalidatePath('/dashboard')
  return { success: true }
}

// ─── stopStaffView ────────────────────────────────────────────────────────────

export async function stopStaffView(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(STAFF_VIEW_COOKIE)
  revalidatePath('/dashboard')
}
