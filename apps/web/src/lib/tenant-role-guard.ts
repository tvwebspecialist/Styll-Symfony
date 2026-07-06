import { createAdminClient } from '@/lib/supabase/admin'
import { MANAGER_ROLES, type StaffRoleValue } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'

export type TenantRole = StaffRoleValue | 'superadmin'

export interface TenantRoleContext {
  tenantId: string
  userId: string
  role: TenantRole
  db: ReturnType<typeof createAdminClient>
}

export function throwForbidden(): never {
  const error = new Error('Forbidden')
  ;(error as Error & { digest?: string }).digest = 'NEXT_HTTP_ERROR_FALLBACK;403'
  throw error
}

export function isOwnerManagerRole(role: TenantRole): boolean {
  return role === 'superadmin' || MANAGER_ROLES.includes(role as typeof MANAGER_ROLES[number])
}

export async function getTenantRoleContext(
  explicitTenantId?: string
): Promise<TenantRoleContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const tenantId = explicitTenantId ?? (await getActiveTenantId())
  if (!tenantId) return null

  const db = createAdminClient()
  const { data: staffRow } = await db
    .from('staff_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (staffRow?.role) {
    return {
      tenantId,
      userId: user.id,
      role: staffRow.role as TenantRole,
      db,
    }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_superadmin) return null

  return {
    tenantId,
    userId: user.id,
    role: 'superadmin',
    db,
  }
}

export async function requireOwnerManagerTenantContext(
  explicitTenantId?: string
): Promise<TenantRoleContext> {
  const ctx = await getTenantRoleContext(explicitTenantId)
  if (!ctx || !isOwnerManagerRole(ctx.role)) {
    throwForbidden()
  }
  return ctx
}
