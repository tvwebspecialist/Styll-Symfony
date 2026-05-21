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

function buildSplashUrl(slug: string, w: number, h: number): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://styll.it'
  return `${base}/api/pwa-splash?slug=${encodeURIComponent(slug)}&w=${w}&h=${h}`
}

const IOS_SPLASH_SIZES = [
  // iPhone 15 Pro Max / 15 Plus
  { w: 1290, h: 2796, media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 15 Pro / 15 / 14 Pro
  { w: 1179, h: 2556, media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 14 Plus / 13 Pro Max / 12 Pro Max
  { w: 1284, h: 2778, media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 13 / 13 Pro / 14 / 12 / 12 Pro
  { w: 1170, h: 2532, media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 13 mini / 12 mini
  { w: 1080, h: 2340, media: '(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 11 Pro Max / XS Max
  { w: 1242, h: 2688, media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 11 / XR
  { w: 828,  h: 1792, media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
  // iPhone 11 Pro / X / XS
  { w: 1125, h: 2436, media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 8 Plus / 7 Plus / 6s Plus
  { w: 1242, h: 2208, media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)' },
  // iPhone 8 / 7 / 6s / SE 2nd & 3rd gen
  { w: 750,  h: 1334, media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
  // iPhone SE 1st gen
  { w: 640,  h: 1136, media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad Pro 12.9"
  { w: 2048, h: 2732, media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad Pro 11" / Air 4
  { w: 1668, h: 2388, media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad 10th gen
  { w: 1640, h: 2360, media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)' },
  // iPad mini 6
  { w: 1488, h: 2266, media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2)' },
] as const

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

      {/* Apple Touch Startup Images — splash screen nativo iOS */}
      {IOS_SPLASH_SIZES.map(({ w, h, media }) => (
        <link
          key={`splash-${w}-${h}`}
          rel="apple-touch-startup-image"
          href={buildSplashUrl(slug, w, h)}
          media={media}
        />
      ))}
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
