import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { PreferenzeClient } from './_components/PreferenzeClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PreferenzePage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(tp('/profilo'))
  }

  const db = createAdminClient()
  const [profileRes, clientRes] = await Promise.all([
    db.from('profiles').select('notification_preferences').eq('id', user.id).maybeSingle(),
    db.from('clients').select('marketing_consent, churn_profiling_objected_at').eq('tenant_id', tenant.tenant_id).eq('profile_id', user.id).is('deleted_at', null).maybeSingle(),
  ])

  const notifPrefs = (profileRes.data?.notification_preferences as Record<string, boolean>) ?? {}
  const marketingConsent = clientRes.data?.marketing_consent ?? false
  const churnObjected = clientRes.data?.churn_profiling_objected_at !== null &&
    clientRes.data?.churn_profiling_objected_at !== undefined

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-xl">
        <PreferenzeClient
          tenantId={tenant.tenant_id}
          dataRightsPath={tp('/profilo/dati')}
          initialNotifPrefs={notifPrefs}
          initialMarketingConsent={marketingConsent}
          initialChurnObjected={churnObjected}
          primaryColor={tenant.primary_color ?? '#1a1a1a'}
          cookiePath={tp('/cookie')}
          privacyPath={tp('/privacy')}
          termsPath={tp('/termini')}
        />
      </div>
    </main>
  )
}
