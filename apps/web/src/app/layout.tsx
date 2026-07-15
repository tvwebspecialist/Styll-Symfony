import type { Metadata, Viewport } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import { ConsentAwareVercelAnalytics } from '@/components/shared/ConsentAwareVercelAnalytics'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const fontVariables = {
  '--font-outfit': '"Outfit"',
  '--font-poppins': '"Poppins"',
  '--font-inter': '"Inter"',
} as CSSProperties

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://styll.it'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Styll — Il tuo salone, organizzato.',
    template: '%s — Styll',
  },
  description:
    'La piattaforma all-in-one per barbieri e parrucchieri: prenotazioni, team e fidelizzazione clienti.',
  keywords: [
    'gestionale barbieri',
    'app barbiere',
    'fidelizzazione clienti barber',
    'software prenotazioni barbiere',
    'loyalty barbiere',
    'prenotazioni barbiere online',
    'gestionale parrucchiere',
  ],
  authors: [{ name: 'Styll', url: SITE_URL }],
  creator: 'Styll',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: SITE_URL,
    siteName: 'Styll',
    title: 'Styll — Il tuo salone, organizzato.',
    description:
      'La piattaforma all-in-one per barbieri e parrucchieri: prenotazioni, team e fidelizzazione clienti.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Styll — La piattaforma per barbieri e parrucchieri',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Styll — Il tuo salone, organizzato.',
    description:
      'La piattaforma all-in-one per barbieri e parrucchieri: prenotazioni, team e fidelizzazione clienti.',
    images: ['/opengraph-image'],
    creator: '@styllapp',
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', sizes: '32x32' },
      { url: '/icon.svg', sizes: '64x64' },
    ],
    apple: [{ url: '/icon.svg', sizes: '180x180' }],
    shortcut: '/icon.svg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Styll',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#222222',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="it"
      className="h-full antialiased"
      style={fontVariables}
    >
      <body
        className="min-h-full flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-fg)',
        }}
      >
        {children}
        <Toaster position="top-center" richColors />
        <ConsentAwareVercelAnalytics />
      </body>
    </html>
  )
}
