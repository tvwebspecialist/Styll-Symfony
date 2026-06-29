import { createAdminClient } from '@/lib/supabase/admin'
import { UsersClient } from './users-client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const db = createAdminClient()
  const [usersRes, tenantsRes] = await Promise.all([
    db
      .from('profiles')
      .select('id, full_name, email, is_superadmin, onboarding_completed, created_at')
      .or('user_type.eq.staff,is_superadmin.eq.true')
      .order('created_at', { ascending: false }),
    db
      .from('tenants')
      .select('id, business_name, slug')
      .order('business_name', { ascending: true }),
  ])

  return (
    <UsersClient
      initialUsers={(usersRes.data ?? []) as never}
      initialTenants={(tenantsRes.data ?? []) as never}
    />
  )
}
