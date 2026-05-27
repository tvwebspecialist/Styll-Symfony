import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { NotificheClient } from '@/components/dashboard/notifiche/NotificheClient'

export const dynamic = 'force-dynamic'

export default async function NotifichePage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  return <NotificheClient />
}
