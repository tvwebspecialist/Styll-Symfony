'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { IMPERSONATE_STAFF_COOKIE } from '@/lib/tenant-context'
import { MANAGER_ROLES } from '@/lib/constants'

export interface ActionResult {
  success: boolean
  error?: string
}

export async function startStaffImpersonation(staffMemberId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione non valida.' }

  const db = createAdminClient()

  const { data: targetStaff } = await db
    .from('staff_members')
    .select('id, profile_id, tenant_id, role')
    .eq('id', staffMemberId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!targetStaff) return { success: false, error: 'Membro del team non trovato.' }
  if (targetStaff.profile_id === user.id) return { success: false, error: 'Non puoi impersonare te stesso.' }
  if (targetStaff.role === 'owner') return { success: false, error: 'Non puoi impersonare un owner.' }

  const { data: callerStaff } = await db
    .from('staff_members')
    .select('role')
    .eq('tenant_id', targetStaff.tenant_id)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!callerStaff || !MANAGER_ROLES.includes(callerStaff.role as typeof MANAGER_ROLES[number])) {
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
