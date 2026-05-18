import type { CSSProperties, ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'

const FONT_MAP: Record<string, string> = {
  outfit: 'var(--font-outfit)',
  poppins: 'var(--font-poppins)',
  inter: 'var(--font-inter)',
}

interface Props {
  params: Promise<{ slug: string }>
  children: ReactNode
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    return {
      title: 'Landing page | Styll',
      description: 'Scopri l’app cliente Styll.',
    }
  }

  return {
    title: `${tenant.business_name} | Prenota con Styll`,
    description: `Scopri i servizi di ${tenant.business_name}, le promozioni attive e come installare la web app sul tuo telefono.`,
    manifest: `/tenant/app/${slug}/manifest.webmanifest`,
    themeColor: tenant.primary_color ?? '#1a1a1a',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: tenant.business_name,
    },
  }
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Viewport> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  return {
    themeColor: tenant?.primary_color ?? '#1a1a1a',
  }
}

export default async function LandingLayout({ params, children }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const fontFamily = FONT_MAP[tenant.font_family?.toLowerCase() ?? ''] ?? FONT_MAP.outfit
  const brandVars = {
    '--brand-primary': tenant.primary_color ?? '#1a1a1a',
    '--brand-secondary': tenant.secondary_color ?? '#666666',
    '--color-primary': tenant.primary_color ?? '#1a1a1a',
    '--font-active': fontFamily,
  } as CSSProperties

  return (
    <div
      style={brandVars}
      className="min-h-screen bg-background text-foreground [font-family:var(--font-active)]"
    >
      {children}
    </div>
  )
}
