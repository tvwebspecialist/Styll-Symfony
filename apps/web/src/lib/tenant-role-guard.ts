import { createAdminClient } from '@/lib/supabase/admin'
import { MANAGER_ROLES, type StaffRoleValue } from '@/lib/constants'
import {
  getOptionalSymfonyStaffMe,
  listSymfonyStaffMemberships,
} from '@/lib/symfony/staff-context'
import { getActiveTenantId } from '@/lib/tenant-context'
import { forbidden } from 'next/navigation'

export type TenantRole = StaffRoleValue | 'superadmin'
export const OWNER_MANAGER_TENANT_ROLES = ['owner', 'manager'] as const
export type OwnerManagerTenantRole = typeof OWNER_MANAGER_TENANT_ROLES[number]
export const INBOX_TENANT_ROLES = ['owner', 'manager', 'receptionist', 'staff'] as const
export type InboxTenantRole = typeof INBOX_TENANT_ROLES[number]

export const TENANT_PERMISSIONS = {
  MANAGE_MARKETING: 'manage_marketing',
  MANAGE_CATALOG: 'manage_catalog',
  MANAGE_APP: 'manage_app',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SALES: 'view_sales',
} as const

export type TenantPermission =
  typeof TENANT_PERMISSIONS[keyof typeof TENANT_PERMISSIONS]

export const FORBIDDEN_ERROR_DIGEST = 'NEXT_HTTP_ERROR_FALLBACK;403'

export interface TenantRoleContext {
  tenantId: string
  userId: string
  role: TenantRole
  db: ReturnType<typeof createAdminClient>
}

const TENANT_PERMISSION_ROLES: Record<TenantPermission, readonly OwnerManagerTenantRole[]> = {
  [TENANT_PERMISSIONS.MANAGE_MARKETING]: OWNER_MANAGER_TENANT_ROLES,
  [TENANT_PERMISSIONS.MANAGE_CATALOG]: OWNER_MANAGER_TENANT_ROLES,
  [TENANT_PERMISSIONS.MANAGE_APP]: OWNER_MANAGER_TENANT_ROLES,
  [TENANT_PERMISSIONS.MANAGE_SETTINGS]: OWNER_MANAGER_TENANT_ROLES,
  [TENANT_PERMISSIONS.VIEW_SALES]: OWNER_MANAGER_TENANT_ROLES,
}

export function throwForbidden(): never {
  forbidden()
}

export function isForbiddenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return (
    error.message === 'Forbidden'
    || (error as Error & { digest?: string }).digest === FORBIDDEN_ERROR_DIGEST
  )
}

export function isOwnerManagerRole(role: TenantRole): boolean {
  return hasTenantRole(role, OWNER_MANAGER_TENANT_ROLES)
}

export function hasTenantRole(
  role: TenantRole,
  allowedRoles: readonly StaffRoleValue[]
): boolean {
  return role === 'superadmin' || allowedRoles.includes(role as StaffRoleValue)
}

export function hasTenantPermission(
  role: TenantRole,
  permission: TenantPermission
): boolean {
  if (role === 'superadmin') return true

  const allowedRoles = TENANT_PERMISSION_ROLES[permission]
  return allowedRoles.includes(role as OwnerManagerTenantRole)
}

export async function getTenantRoleContext(
  explicitTenantId?: string
): Promise<TenantRoleContext | null> {
  const tenantId = explicitTenantId ?? (await getActiveTenantId())
  if (!tenantId) return null

  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant?.slug) {
    return null
  }

  const me = await getOptionalSymfonyStaffMe(tenant.slug)
  if (!me) {
    return null
  }

  const membership = listSymfonyStaffMemberships(me)
    .find((entry) => entry.tenant.id === tenantId)

  if (membership?.role) {
    return {
      tenantId,
      userId: me.user.id,
      role: membership.role as TenantRole,
      db,
    }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', me.user.id)
    .maybeSingle()

  if (!profile?.is_superadmin) return null

  return {
    tenantId,
    userId: me.user.id,
    role: 'superadmin',
    db,
  }
}

export async function requireTenantRole(
  allowedRoles: readonly StaffRoleValue[],
  explicitTenantId?: string
): Promise<TenantRoleContext> {
  const ctx = await getTenantRoleContext(explicitTenantId)
  if (!ctx || !hasTenantRole(ctx.role, allowedRoles)) {
    throwForbidden()
  }
  return ctx
}

export async function requireTenantPermission(
  permission: TenantPermission,
  explicitTenantId?: string
): Promise<TenantRoleContext> {
  const ctx = await getTenantRoleContext(explicitTenantId)
  if (!ctx || !hasTenantPermission(ctx.role, permission)) {
    throwForbidden()
  }
  return ctx
}

export async function requireOwnerManagerTenantContext(
  explicitTenantId?: string
): Promise<TenantRoleContext> {
  return requireTenantRole(OWNER_MANAGER_TENANT_ROLES, explicitTenantId)
}

export async function requireInboxTenantContext(
  explicitTenantId?: string
): Promise<TenantRoleContext> {
  return requireTenantRole(INBOX_TENANT_ROLES, explicitTenantId)
}
