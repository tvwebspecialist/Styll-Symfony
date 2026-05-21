import type { CSSProperties, ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { PwaShell } from '@/components/pwa/PwaShell'
import { PwaSplash } from '@/components/pwa/PwaSplash'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getClientProfile } from '@/lib/actions/pwa-auth'

const FONT_MAP: Record<string, string> = {
  outfit:     'var(--font-outfit)',
  poppins:    'var(--font-poppins)',
  inter:      'var(--font-inter)',
  playfair:   '"Playfair Display", serif',
  montserrat: '"Montserrat", sans-serif',
}

const GOOGLE_FONT_URLS: Record<string, string> = {
  playfair:   'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
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
  const iconVersion = tenant.logo_url
    ? encodeURIComponent(tenant.logo_url).slice(-8)
    : '0'
  const appleTouchIcon = `/api/pwa-icon?slug=${encodeURIComponent(slug)}&v=${iconVersion}&size=180`

  return {
    title: `${tenant.business_name} | App cliente`,
    description: `Apri l'app di ${tenant.business_name} per prenotare, scoprire promozioni e gestire il tuo profilo.`,
    manifest: tp('/manifest.webmanifest'),
    themeColor: tenant.primary_color ?? '#1a1a1a',
    icons: {
      apple: [
        {
          url: appleTouchIcon,
          sizes: '180x180',
          type: 'image/png',
        },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: tenant.business_name,
    },
    other: {
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': tenant.business_name,
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
    viewportFit: 'cover',
  }
}

export default async function AppLayout({ params, children }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const fontSlug = tenant.font_family?.toLowerCase() ?? 'outfit'
  const fontFamily = FONT_MAP[fontSlug] ?? FONT_MAP.outfit
  const googleFontUrl = GOOGLE_FONT_URLS[fontSlug] ?? null
  const clientProfile = await getClientProfile(tenant.tenant_id).catch(() => null)
  const brandVars = {
    '--brand-primary': tenant.primary_color ?? '#1a1a1a',
    '--brand-secondary': tenant.secondary_color ?? '#666666',
    '--color-primary': tenant.primary_color ?? '#1a1a1a',
    '--font-active': fontFamily,
  } as CSSProperties

  return (
    <>
      {googleFontUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={googleFontUrl} />
        </>
      )}
      <div
        style={{ ...brandVars, background: '#F7F7F7', minHeight: '100dvh' }}
        className="text-foreground [font-family:var(--font-active)]"
      >
        <PwaSplash
          businessName={tenant.business_name}
          primaryColor={tenant.primary_color ?? '#1A1A1A'}
          logoUrl={tenant.logo_url}
        />
        <PwaShell
          slug={slug}
          businessName={tenant.business_name}
          logoUrl={tenant.logo_url}
          primaryColor={tenant.primary_color}
          fontFamily={fontFamily}
          clientName={clientProfile?.fullName ?? null}
          clientAvatarUrl={clientProfile?.avatarUrl ?? null}
        >
          {children}
        </PwaShell>
      </div>
    </>
  )
}
