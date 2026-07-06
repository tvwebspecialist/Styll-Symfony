import { notFound, redirect } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getClientNotifications } from '@/lib/actions/client-notifications'
import { NotificheClient } from './_components/NotificheClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function NotifichePage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const tp = await createTenantPaths(slug)
  if (!user) redirect(tp('/profilo'))

  const notifications = await getClientNotifications(tenant.tenant_id)

  return (
    <main style={{ minHeight: '100vh', background: '#F2F2F7', paddingBottom: 100 }}>
      <NotificheClient
        notifications={notifications}
        tenantId={tenant.tenant_id}
      />
    </main>
  )
}
