import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  return { title: tenant?.business_name ?? slug }
}

export default async function LandingLayout({ params, children }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant) notFound()

  return (
    <div
      style={{
        '--brand-primary': tenant.primary_color,
        '--brand-secondary': tenant.secondary_color,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
