import { notFound } from 'next/navigation'
import { ClientAccessForm } from '@/components/pwa/auth/ClientAccessForm'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function AccessoPage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const mode = readParam(resolvedSearchParams.mode) === 'register' ? 'register' : 'login'

  return (
    <ClientAccessForm
      tenantId={tenant.tenant_id}
      tenantSlug={slug}
      tenantName={tenant.business_name}
      tenantLogoUrl={tenant.logo_url}
      initialMode={mode}
      initialEmail={readParam(resolvedSearchParams.email)}
      returnTo={readParam(resolvedSearchParams.return_to)}
      urlError={readParam(resolvedSearchParams.error)}
      urlWelcome={readParam(resolvedSearchParams.welcome) === 'true'}
    />
  )
}
