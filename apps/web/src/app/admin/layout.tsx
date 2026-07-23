import { redirect } from 'next/navigation'

import { AdminShell } from '@/components/admin/admin-shell'
import { signOutAction } from '@/app/admin/actions'
import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'
import { getOptionalSymfonyStaffMe } from '@/lib/symfony/staff-context'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getOptionalSymfonyStaffMe()
  if (!me) redirect('/login')

  let bootstrap: {
    email: string | null
    counts: { tenants?: number; users?: number }
    unreadNotifications: number
  }
  try {
    bootstrap = await fetchSymfonyAdminJson('/api/admin/bootstrap')
  } catch (error) {
    if (error instanceof SymfonyAdminApiError && error.code === 'forbidden') {
      redirect('/dashboard')
    }
    throw error
  }

  return (
    <AdminShell
      email={bootstrap.email ?? me.user.email ?? null}
      onSignOut={signOutAction}
      counts={bootstrap.counts}
      initialUnreadCount={bootstrap.unreadNotifications ?? 0}
    >
      {children}
    </AdminShell>
  )
}
