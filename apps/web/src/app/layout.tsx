import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter, Outfit, Poppins } from 'next/font/google'
import { ConsentAwareVercelAnalytics } from '@/components/shared/ConsentAwareVercelAnalytics'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  preload: false,
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

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
      className={`${outfit.variable} ${poppins.variable} ${inter.variable} h-full antialiased`}
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
