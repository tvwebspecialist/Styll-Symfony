import { cookies, headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MANAGER_ROLES } from '@/lib/constants'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
const DASHBOARD_SUFFIX = '-dashboard'

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null
}

function dashboardSlugFromHost(hostValue: string | null): string | null {
  const host = firstHeaderValue(hostValue)?.toLowerCase()
  if (!host) return null

  let subdomain: string | null = null
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1))
  } else if (host.endsWith('.localhost:3000')) {
    subdomain = host.slice(0, -'.localhost:3000'.length)
  }

  if (!subdomain?.endsWith(DASHBOARD_SUFFIX)) return null
  const slug = subdomain.slice(0, -DASHBOARD_SUFFIX.length)
  return slug || null
}

function dashboardSlugFromUrlLike(value: string | null): string | null {
  if (!value) return null

  const pathMatch = value.match(/\/tenant\/dashboard\/([^/?#]+)/)
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1])

  const queryIndex = value.indexOf('?')
  if (queryIndex === -1) return null
  const query = value.slice(queryIndex + 1).split('#')[0]
  const params = new URLSearchParams(query)
  if (params.get('_tenant_type') !== 'dashboard') return null
  return params.get('_tenant_slug')
}

async function getDashboardSlugFromRequest(): Promise<string | null> {
  const headerStore = await headers()

  const hostSlug =
    dashboardSlugFromHost(headerStore.get('host')) ??
    dashboardSlugFromHost(headerStore.get('x-forwarded-host')) ??
    dashboardSlugFromHost(headerStore.get('x-original-host'))
  if (hostSlug) return hostSlug

  const urlHeaders = [
    'next-url',
    'x-invoke-path',
    'x-matched-path',
    'x-original-url',
    'x-url',
    'referer',
  ]

  for (const name of urlHeaders) {
    const slug = dashboardSlugFromUrlLike(headerStore.get(name))
    if (slug) return slug
  }

  return null
}

async function userCanAccessTenant(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { data: staffRow } = await db
    .from('staff_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (staffRow) return true

  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', userId)
    .maybeSingle()

  return !!profile?.is_superadmin
}

async function getDashboardTenantIdFromRequest(
  db: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ matchedDashboardUrl: boolean; tenantId: string | null }> {
  const slug = await getDashboardSlugFromRequest()
  if (!slug) return { matchedDashboardUrl: false, tenantId: null }

  const { data: tenant } = await db
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  const tenantId = tenant?.id as string | undefined
  if (!tenantId) return { matchedDashboardUrl: true, tenantId: null }

  return {
    matchedDashboardUrl: true,
    tenantId: (await userCanAccessTenant(db, userId, tenantId)) ? tenantId : null,
  }
}

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

  if (!callerStaff || !MANAGER_ROLES.includes(callerStaff.role as typeof MANAGER_ROLES[number])) return none

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
 * - On tenant dashboard routes, the URL slug is the source of truth.
 * - If no dashboard slug is present and a `styll_impersonate_tenant` cookie is
 *   set AND the current user is a superadmin, return the cookie value.
 * - Otherwise, fall back to the user's primary `staff_members.tenant_id`.
 */
export async function getActiveTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const tenantFromDashboardUrl = await getDashboardTenantIdFromRequest(db, user.id)
  if (tenantFromDashboardUrl.matchedDashboardUrl) {
    return tenantFromDashboardUrl.tenantId
  }

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
  const tenantFromDashboardUrl = await getDashboardTenantIdFromRequest(db, user.id)
  const shadowTenantId = tenantFromDashboardUrl.matchedDashboardUrl
    ? tenantFromDashboardUrl.tenantId
    : impersonation.tenantId

  if (!shadowTenantId) {
    return {
      profileId: user.id,
      realUserId: user.id,
      isShadow: false,
      tenantId: null,
    }
  }

  const { data: ownerStaff } = await db
    .from('staff_members')
    .select('profile_id')
    .eq('tenant_id', shadowTenantId)
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
    tenantId: shadowTenantId,
  }
}

/**
 * Resolve the active profile for a known dashboard tenant.
 *
 * This is used by `/tenant/dashboard/[slug]` so shadow mode cannot leak a
 * different tenant's owner/profile into a dashboard selected by URL slug.
 */
export async function resolveActiveProfileForTenant(
  tenantId: string
): Promise<ActiveProfileResolution | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const impersonation = await getImpersonationState()
  if (!impersonation.active) {
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
    .eq('tenant_id', tenantId)
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
    tenantId,
  }
}
