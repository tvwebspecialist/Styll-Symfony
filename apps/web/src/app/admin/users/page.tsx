import { createAdminClient } from '@/lib/supabase/admin'
import { UsersClient } from './users-client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const db = createAdminClient()
  const [usersRes, tenantsRes] = await Promise.all([
    db
      .from('profiles')
      .select('id, full_name, email, is_superadmin, onboarding_completed, created_at')
      .eq('is_superadmin', true)
      .order('created_at', { ascending: false }),
    db
      .from('tenants')
      .select('id, business_name, slug')
      .order('business_name', { ascending: true }),
  ])

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: 'var(--font-primary)' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>Team Styll</h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Gestisci i profili interni della piattaforma.
        </p>
      </div>
      <UsersClient
        initialUsers={(usersRes.data ?? []) as never}
        initialTenants={(tenantsRes.data ?? []) as never}
      />
    </div>
  )
}
