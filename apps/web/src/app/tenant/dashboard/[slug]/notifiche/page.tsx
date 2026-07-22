import { notFound, redirect } from 'next/navigation'
import { getActiveTenantId, resolveActiveProfile } from '@/lib/tenant-context'
import { getNotifications } from '@/lib/actions/notifiche'
import { NotificheClient } from '@/components/dashboard/notifiche/NotificheClient'

export const dynamic = 'force-dynamic'

export default async function NotifichePage({ params }: { params: Promise<{ slug: string }> }) {
  await params
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const tenantId = await getActiveTenantId()
  if (!tenantId) notFound()

  const notifications = await getNotifications(tenantId)

  return <NotificheClient initialNotifications={notifications} tenantId={tenantId} />
}
