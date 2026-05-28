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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://styll.it'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    return {
      title: 'Barbiere non trovato',
      robots: { index: false },
    }
  }

  const url = `${SITE_URL}/${slug}`
  const ogImageUrl = `${SITE_URL}/tenant/landing/${slug}/opengraph-image`
  const title = `${tenant.business_name} — Prenota online`
  const description = `Prenota il tuo appuntamento da ${tenant.business_name}. Scegli servizio, data e ora in pochi secondi. Fedeltà premiata.`

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    manifest: `/tenant/app/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: tenant.business_name,
    },
    openGraph: {
      title,
      description: `Prenota il tuo appuntamento da ${tenant.business_name} in pochi secondi.`,
      url,
      type: 'website',
      locale: 'it_IT',
      siteName: tenant.business_name,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: tenant.business_name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `Prenota il tuo appuntamento da ${tenant.business_name} in pochi secondi.`,
      images: [ogImageUrl],
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
