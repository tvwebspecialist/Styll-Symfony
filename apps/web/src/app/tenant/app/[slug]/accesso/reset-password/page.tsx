import { notFound } from 'next/navigation'
import { ResetPasswordForm } from '@/components/pwa/auth/ResetPasswordForm'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ResetPasswordPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  return <ResetPasswordForm slug={slug} />
}
