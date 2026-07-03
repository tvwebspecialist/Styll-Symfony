import type { Metadata } from 'next'
import { CookieBanner } from '@/components/shared/CookieBanner'

export const metadata: Metadata = {
  title: 'Styll — Il sistema di retention per barbieri',
  description:
    'Styll aiuta i barbieri italiani a far tornare i clienti con prenotazioni online, loyalty gamificata e zero commissioni. Il tuo negozio, il tuo brand, i tuoi clienti.',
  openGraph: {
    title: 'Styll — Il sistema di retention per barbieri',
    description:
      'Prenotazioni, fidelizzazione, loyalty gamificata. Zero commissioni. Pensato per barbieri italiani.',
  },
  twitter: {
    title: 'Styll — Il sistema di retention per barbieri',
    description:
      'Prenotazioni, fidelizzazione, loyalty gamificata. Zero commissioni. Pensato per barbieri italiani.',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="min-h-screen">{children}</div>
      <CookieBanner privacyPath="/cookie" />
    </>
  )
}
