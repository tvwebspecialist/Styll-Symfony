import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const IMPERSONATE_STAFF_COOKIE = 'styll_impersonate_staff'

export interface StaffImpersonationState {
  active: boolean
  staffMemberId: string | null
  staffName: string | null
  staffRole: string | null
}

/**
 * Returns the impersonated staff_member from the cookie,
 * but only if the current user is an owner or manager of the same tenant.
 */
export async function getStaffImpersonationState(): Promise<StaffImpersonationState> {
  const none: StaffImpersonationState = { active: false, staffMemberId: null, staffName: null, staffRole: null }

  const cookieStore = await cookies()
  const staffMemberId = cookieStore.get(IMPERSONATE_STAFF_COOKIE)?.value ?? null
  if (!staffMemberId) return none

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return none

  const db = createAdminClient()

  const { data: targetStaff } = await db
    .from('staff_members')
    .select('tenant_id, role, profiles(full_name)')
    .eq('id', staffMemberId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!targetStaff) return none

  const { data: callerStaff } = await db
    .from('staff_members')
    .select('role')
    .eq('tenant_id', targetStaff.tenant_id)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!callerStaff || !(['owner', 'manager'] as string[]).includes(callerStaff.role)) return none

  const profile = targetStaff.profiles as { full_name?: string | null } | null
  return {
    active: true,
    staffMemberId,
    staffName: profile?.full_name ?? null,
    staffRole: targetStaff.role,
  }
}

export const IMPERSONATE_COOKIE = 'styll_impersonate_tenant'

/**
 * Resolve the active tenant id for the current request.
 *
 * - If a `styll_impersonate_tenant` cookie is set AND the current user is a
 *   superadmin, return the cookie value (admin shadow mode).
 * - Otherwise, fall back to the user's primary `staff_members.tenant_id`.
 */
export async function getActiveTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const cookieStore = await cookies()
  const impersonatedTenant = cookieStore.get(IMPERSONATE_COOKIE)?.value

  if (impersonatedTenant) {
    const { data: profile } = await db
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.is_superadmin) return impersonatedTenant
  }

  const { data } = await db
    .from('staff_members')
    .select('tenant_id')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return data?.tenant_id ?? null
}

/**
 * Returns whether the current request is in tenant-impersonation shadow mode,
 * along with the impersonated tenant's display info.
 */
export async function getImpersonationState(): Promise<{
  active: boolean
  tenantId: string | null
  businessName: string | null
}> {
  const cookieStore = await cookies()
  const tenantId = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null
  if (!tenantId) return { active: false, tenantId: null, businessName: null }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { active: false, tenantId: null, businessName: null }

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_superadmin) return { active: false, tenantId: null, businessName: null }

  const { data: tenant } = await db
    .from('tenants')
    .select('business_name')
    .eq('id', tenantId)
    .maybeSingle()
  return {
    active: true,
    tenantId,
    businessName: tenant?.business_name ?? null,
  }
}

export interface ActiveProfileResolution {
  /** The profile id that "owns" the current dashboard view. */
  profileId: string
  /** Real authenticated user id (the admin in shadow mode). */
  realUserId: string
  /** True when the resolved profile belongs to the impersonated tenant's owner. */
  isShadow: boolean
  /** Impersonated tenant id, when in shadow mode. */
  tenantId: string | null
}

/**
 * Resolve which profile the dashboard should display and operate on.
 *
 * - In shadow mode (admin impersonating a tenant): returns the tenant owner's
 *   `profile_id` from `staff_members` (role = 'owner').
 * - Otherwise: returns the authenticated user's id.
 *
 * Returns `null` only when there is no authenticated user. If shadow mode is
 * active but the tenant has no active owner row, falls back to the real user.
 */
export async function resolveActiveProfile(): Promise<ActiveProfileResolution | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const impersonation = await getImpersonationState()
  if (!impersonation.active || !impersonation.tenantId) {
    return {
      profileId: user.id,
      realUserId: user.id,
      isShadow: false,
      tenantId: null,
    }
  }

  const db = createAdminClient()
  const { data: ownerStaff } = await db
    .from('staff_members')
    .select('profile_id')
    .eq('tenant_id', impersonation.tenantId)
    .eq('role', 'owner')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return {
    profileId: ownerStaff?.profile_id ?? user.id,
    realUserId: user.id,
    isShadow: ownerStaff?.profile_id != null,
    tenantId: impersonation.tenantId,
  }
}
