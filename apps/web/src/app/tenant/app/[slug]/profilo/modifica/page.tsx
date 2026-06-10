import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { ModificaProfiloClient } from './_components/ModificaProfiloClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ModificaProfiloPage({ params }: Props) {
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
    db.from('profiles').select('full_name, phone, email, avatar_url').eq('id', user.id).maybeSingle(),
    db.from('clients').select('full_name, phone, email, date_of_birth').eq('tenant_id', tenant.tenant_id).eq('profile_id', user.id).is('deleted_at', null).maybeSingle(),
  ])

  const profile = profileRes.data
  const client = clientRes.data

  return (
    <main className="min-h-screen bg-[#F8F8F8] pb-28">
      <div className="mx-auto max-w-xl">
        <ModificaProfiloClient
          tenantId={tenant.tenant_id}
          userId={user.id}
          initialData={{
            fullName: profile?.full_name ?? client?.full_name ?? '',
            phone: profile?.phone ?? client?.phone ?? '',
            email: profile?.email ?? client?.email ?? user.email ?? '',
            avatarUrl: profile?.avatar_url ?? null,
            dateOfBirth: (client as { date_of_birth?: string | null } | null)?.date_of_birth ?? null,
          }}
          primaryColor={tenant.primary_color ?? '#1a1a1a'}
          profiloPath={tp('/profilo')}
        />
      </div>
    </main>
  )
}
