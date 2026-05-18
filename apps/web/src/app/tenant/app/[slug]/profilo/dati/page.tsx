import { notFound, redirect } from 'next/navigation'
import { EditProfileForm } from '@/components/pwa/auth/EditProfileForm'
import { getClientProfile } from '@/lib/actions/pwa-auth'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DatiProfiloPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const tp = await createTenantPaths(slug)
  const profile = await getClientProfile(tenant.tenant_id)

  if (!profile) {
    redirect(tp('/profilo'))
  }

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <EditProfileForm
        tenantId={tenant.tenant_id}
        basePath={tp('')}
        initialValues={{
          fullName: profile.fullName ?? '',
          email: profile.email ?? '',
          dateOfBirth: profile.dateOfBirth ?? '',
          preferredContactChannel: profile.preferredContactChannel ?? 'push',
        }}
      />
    </main>
  )
}
