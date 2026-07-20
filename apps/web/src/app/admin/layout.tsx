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
  const [profileRes, tenantsCount, usersCount, unreadNotifRes] = await Promise.all([
    db.from('profiles').select('is_superadmin').eq('id', user.id).maybeSingle(),
    db.from('tenants').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).or('user_type.eq.staff,is_superadmin.eq.true'),
    db.from('platform_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
  ])

  if (!profileRes.data?.is_superadmin) redirect('/dashboard')

  return (
    <AdminShell
      email={user.email ?? null}
      onSignOut={signOutAction}
      counts={{
        tenants: tenantsCount.count ?? 0,
        users: usersCount.count ?? 0,
      }}
      initialUnreadCount={unreadNotifRes.count ?? 0}
    >
      {children}
    </AdminShell>
  )
}
