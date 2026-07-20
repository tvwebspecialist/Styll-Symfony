'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { setAdminShadowCookie } from '@/lib/admin-shadow-cookie'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json, TablesUpdate, TablesInsert } from '@/types'

import { bumpAdmin, requireSuperadmin, type ActionResult } from './actions'

async function logAdminAction(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  tenantId: string | null = null,
  details: Record<string, unknown> = {}
) {
  try {
    const db = createAdminClient()
    await db.from('admin_audit_log').insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      tenant_id: tenantId,
      details: details as unknown as Json,
    })
  } catch {
    // best-effort
  }
}

// =====================================================
// PROFILES (USERS)
// =====================================================

export async function updateProfile(
  id: string,
  input: { full_name?: string | null; is_superadmin?: boolean }
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const payload: TablesUpdate<'profiles'> = {}
  if (input.full_name !== undefined) payload.full_name = input.full_name
  if (input.is_superadmin !== undefined) payload.is_superadmin = input.is_superadmin
  const { error } = await db.from('profiles').update(payload).eq('id', id)
  if (error) return { success: false, error: error.message }
  bumpAdmin()
  return { success: true }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  if (auth.id === id) return { success: false, error: 'Non puoi eliminare te stesso.' }
  const db = createAdminClient()
  const { error } = await db.auth.admin.deleteUser(id)
  if (error) return { success: false, error: error.message }
  bumpAdmin()
  return { success: true }
}

// =====================================================
// USER MANAGEMENT (invite / reset / impersonate)
// =====================================================

export async function inviteUser(input: {
  email: string
  fullName?: string | null
  isSuperadmin?: boolean
  tenantId?: string
  role?: string
}): Promise<ActionResult & { userId?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const { data: invited, error } = await db.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName ?? null, user_type: 'staff' },
  })
  if (error) return { success: false, error: error.message }
  const userId = invited?.user?.id
  if (!userId) return { success: false, error: 'Utente non creato.' }

  await db
    .from('profiles')
    .upsert({
      id: userId,
      email: input.email,
      full_name: input.fullName ?? null,
      is_superadmin: input.isSuperadmin ?? false,
      user_type: 'staff',
    } as TablesInsert<'profiles'>)

  if (input.tenantId) {
    const { data: existingMember } = await db
      .from('staff_members')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('profile_id', userId)
      .is('deleted_at', null)
      .maybeSingle()
    if (!existingMember) {
      await db.from('staff_members').insert({
        tenant_id: input.tenantId,
        profile_id: userId,
        role: input.role ?? 'staff',
        is_active: true,
      })
    }
  }

  await logAdminAction(auth.id, 'user.invited', 'user', userId, input.tenantId ?? null, {
    email: input.email,
    is_superadmin: input.isSuperadmin ?? false,
  })

  revalidatePath('/admin/users')
  return { success: true, userId }
}

export async function resetUserPassword(
  userId: string
): Promise<ActionResult & { tempPassword?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const tempPassword = `Styll-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`
  const { error } = await db.auth.admin.updateUserById(userId, { password: tempPassword })
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'user.password_reset', 'user', userId)
  return { success: true, tempPassword }
}

export async function impersonateUser(
  userId: string
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()

  const { data: membership } = await db
    .from('staff_members')
    .select('tenant_id, tenant:tenants(id, business_name)')
    .eq('profile_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const tenantId = membership?.tenant_id as string | undefined
  if (!tenantId) {
    return {
      success: false,
      error: "L'utente non ha un tenant attivo da impersonare.",
    }
  }

  const tenantRel = (membership?.tenant ?? null) as
    | { id: string; business_name: string }
    | { id: string; business_name: string }[]
    | null
  const tenant = Array.isArray(tenantRel) ? tenantRel[0] : tenantRel

  const cookieStore = await cookies()
  setAdminShadowCookie(cookieStore, tenantId, auth.id)

  await logAdminAction(auth.id, 'user.impersonated', 'user', userId, tenantId, {
    business_name: tenant?.business_name ?? null,
  })
  return { success: true }
}

export async function getUserTenants(
  userId: string
): Promise<{
  success: boolean
  data?: Array<{
    staff_id: string
    role: string
    is_active: boolean
    tenant: { id: string; business_name: string; slug: string }
  }>
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('staff_members')
    .select('id, role, is_active, tenant:tenants(id, business_name, slug)')
    .eq('profile_id', userId)
  if (error) return { success: false, error: error.message }
  return {
    success: true,
    data: (data ?? []).map(
      (r: {
        id: string
        role: string
        is_active: boolean
        tenant: { id: string; business_name: string; slug: string }[] | { id: string; business_name: string; slug: string } | null
      }) => {
        const t = Array.isArray(r.tenant) ? r.tenant[0] : r.tenant
        return {
          staff_id: r.id,
          role: r.role,
          is_active: r.is_active,
          tenant: t ?? { id: '', business_name: '—', slug: '' },
        }
      }
    ),
  }
}

// =====================================================
// TENANT READ-ONLY HELPERS (owner)
// =====================================================

export async function getTenantOwner(
  tenantId: string
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: { profile_id: string } | null
                error: { message: string } | null
              }>
            }
          }
        }
      }
    }
  }
  const { data, error } = await db
    .from('staff_members')
    .select('profile_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!data?.profile_id) return { success: false, error: 'Nessun owner trovato per questo tenant.' }
  return { success: true, profileId: data.profile_id }
}
