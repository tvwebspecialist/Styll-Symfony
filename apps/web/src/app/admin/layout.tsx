import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/admin-shell'
import { signOutAction } from '@/app/admin/actions'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [tenantsCount, usersCount] = await Promise.all([
    db.from('tenants').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  return (
    <AdminShell
      email={user.email ?? null}
      onSignOut={signOutAction}
      counts={{
        tenants: tenantsCount.count ?? 0,
        users: usersCount.count ?? 0,
      }}
    >
      {children}
    </AdminShell>
  )
}
