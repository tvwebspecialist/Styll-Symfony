import { notFound, redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getTenantBySlug } from '@/lib/tenant'
import { getNotifications } from '@/lib/actions/notifiche'
import { NotificheClient } from '@/components/dashboard/notifiche/NotificheClient'

export const dynamic = 'force-dynamic'

export default async function NotifichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const tenant = await getTenantBySlug(slug)
  if (!tenant) notFound()

  const notifications = await getNotifications(tenant.tenant_id)

  return <NotificheClient initialNotifications={notifications} tenantId={tenant.tenant_id} />
}
