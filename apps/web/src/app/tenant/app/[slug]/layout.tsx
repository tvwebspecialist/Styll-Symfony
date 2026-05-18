import type { CSSProperties, ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { PwaShell } from '@/components/pwa/PwaShell'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

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
      title: 'App cliente | Styll',
      description: 'Prenota i tuoi appuntamenti con Styll.',
    }
  }

  const tp = await createTenantPaths(slug)

  return {
    title: `${tenant.business_name} | App cliente`,
    description: `Apri l'app di ${tenant.business_name} per prenotare, scoprire promozioni e gestire il tuo profilo.`,
    manifest: tp('/manifest.webmanifest'),
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

export default async function AppLayout({ params, children }: Props) {
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
      style={{ ...brandVars, background: '#F7F7F7', minHeight: '100dvh' }}
      className="text-foreground [font-family:var(--font-active)]"
    >
      <PwaShell
        slug={slug}
        businessName={tenant.business_name}
        logoUrl={tenant.logo_url}
        primaryColor={tenant.primary_color}
      >
        {children}
      </PwaShell>
    </div>
  )
}
