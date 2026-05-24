'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { PwaPageHeader } from './PwaPageHeader'

const PAGE_TITLES: Record<string, string> = {
  prodotti: 'Prodotti',
  profilo: 'Profilo',
  punti: 'Punti fedeltà',
  loyalty: 'Loyalty',
  book: 'Prenota',
  accesso: 'Accesso',
}

export interface PwaTopBarProps {
  businessName: string
  logoUrl?: string | null
  primaryColor?: string | null
  fontFamily?: string | null
  clientName?: string | null
  clientAvatarUrl?: string | null
  slug: string
}

function TopBarInner({
  businessName: _businessName,
  logoUrl: _logoUrl,
  primaryColor: _primaryColor,
  fontFamily,
  clientName,
  clientAvatarUrl,
  slug,
}: PwaTopBarProps) {
  const pathname = usePathname() ?? ''
  const tenantPath = useTenantPath(slug)
  const router = useRouter()

  const homePath = tenantPath('')
  const isHome = pathname === homePath
  const isInSuccesso = pathname.startsWith(tenantPath('/prenota/successo'))
  const isInPrenota = pathname.startsWith(tenantPath('/prenota')) && !isInSuccesso
  // /book route: BookingFlow renders its own top bar — opt out of the shell's bar
  const isInBook = pathname.startsWith(tenantPath('/book'))

  if (isInBook) return null

  if (isHome) {
    return (
      <PwaPageHeader
        variant="home"
        clientName={clientName}
        clientAvatarUrl={clientAvatarUrl}
        hasUnreadNotifications={false}
        onNotificationsPress={() => {}}
        fontFamily={fontFamily}
      />
    )
  }

  if (isInSuccesso) {
    return <PwaPageHeader variant="page" title="Prenotazione confermata" fontFamily={fontFamily} />
  }

  if (isInPrenota) {
    const prenotaBase = tenantPath('/prenota')
    const isPrenotaRoot = pathname === prenotaBase || pathname === `${prenotaBase}/`

    // Step 1 (location selection): no top bar — the step component shows its own title
    if (isPrenotaRoot) return null

    // Step 2+ (barbiere, servizi, data, conferma): sticky header with back button
    const BOOKING_STEP_TITLES: Record<string, string> = {
      barbiere: 'Barbiere',
      servizi: 'Servizi',
      data: 'Quando',
      conferma: 'Conferma',
    }
    const segment = pathname.slice(prenotaBase.length + 1).split('/')[0] ?? ''
    const title = BOOKING_STEP_TITLES[segment] ?? 'Prenota'

    return (
      <div style={{ position: 'sticky', top: 0, zIndex: 60, background: '#F7F7F7' }}>
        <PwaPageHeader
          variant="page-with-actions"
          title={title}
          leftAction={{
            icon: <ArrowLeft size={20} color="#111111" strokeWidth={2} />,
            onPress: () => router.back(),
            ariaLabel: 'Torna indietro',
          }}
          fontFamily={fontFamily}
        />
      </div>
    )
  }

  // All other routes: simple page bar with title derived from path
  const base = homePath === '/' ? 0 : homePath.length
  const relative = pathname.slice(base).replace(/^\//, '')
  const segment = relative.split('/')[0] ?? ''
  const title = PAGE_TITLES[segment] ?? ''
  return <PwaPageHeader variant="page" title={title} fontFamily={fontFamily} />
}

export function PwaTopBar(props: PwaTopBarProps) {
  return (
    <Suspense fallback={<div style={{ height: 56 }} />}>
      <TopBarInner {...props} />
    </Suspense>
  )
}

