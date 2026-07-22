'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { IMPERSONATE_STAFF_COOKIE } from '@/lib/tenant-context'
import { MANAGER_ROLES } from '@/lib/constants'
import {
  getOptionalSymfonyStaffMe,
  listSymfonyStaffMemberships,
} from '@/lib/symfony/staff-context'

export interface ActionResult {
  success: boolean
  error?: string
}

export async function startStaffImpersonation(staffMemberId: string): Promise<ActionResult> {
  const me = await getOptionalSymfonyStaffMe()
  if (!me) return { success: false, error: 'Sessione non valida.' }

  const db = createAdminClient()

  const { data: targetStaff } = await db
    .from('staff_members')
    .select('id, profile_id, tenant_id, role')
    .eq('id', staffMemberId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!targetStaff) return { success: false, error: 'Membro del team non trovato.' }
  if (targetStaff.profile_id === me.user.id) return { success: false, error: 'Non puoi impersonare te stesso.' }
  if (targetStaff.role === 'owner') return { success: false, error: 'Non puoi impersonare un owner.' }

  const callerMembership = listSymfonyStaffMemberships(me)
    .find((membership) => membership.tenant.id === targetStaff.tenant_id)

  if (!callerMembership || !MANAGER_ROLES.includes(callerMembership.role as typeof MANAGER_ROLES[number])) {
    return { success: false, error: 'Permessi insufficienti.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATE_STAFF_COOKIE, staffMemberId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4,
  })

  return { success: true }
}

export async function stopStaffImpersonation(): Promise<ActionResult> {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATE_STAFF_COOKIE)
  return { success: true }
}
