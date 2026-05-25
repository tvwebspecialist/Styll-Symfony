'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { PwaPageHeader } from './PwaPageHeader'

const PAGE_TITLES: Record<string, string> = {
  prodotti: 'Prodotti',
  profilo: 'Profilo',
  punti: 'Punti fedeltà',
  loyalty: 'Loyalty',
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
  const searchParams = useSearchParams()
  const skipItems = (searchParams?.get('_skip') ?? '').split(',').filter(Boolean)

  const homePath = tenantPath('')
  const isHome = pathname === homePath
  const isInSuccesso = pathname.startsWith(tenantPath('/prenota/successo'))
  const isInPrenota = pathname.startsWith(tenantPath('/prenota')) && !isInSuccesso

  if (isHome) {    return (
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
    const segment = isPrenotaRoot ? '' : (pathname.slice(prenotaBase.length + 1).split('/')[0] ?? '')

    const STEP_TITLES: Record<string, string> = {
      '': 'Sede',
      barbiere: 'Barbiere',
      servizi: 'Servizi',
      data: 'Quando',
      conferma: 'Conferma',
    }
    const title = STEP_TITLES[segment] ?? 'Prenota'

    // First visible step: show title with no back arrow (nothing before this in the funnel)
    const isFirstStep =
      isPrenotaRoot ||
      (segment === 'barbiere' && skipItems.includes('sede')) ||
      (segment === 'servizi' && skipItems.includes('sede') && skipItems.includes('barbiere'))

    if (isFirstStep) {
      return (
        <div style={{ position: 'sticky', top: 0, zIndex: 60, background: '#F7F7F7' }}>
          <PwaPageHeader variant="page-with-actions" title={title} fontFamily={fontFamily} />
        </div>
      )
    }

    // Subsequent steps: explicit back navigation — never uses router.back()
    const location = searchParams?.get('location') ?? ''
    const staff = searchParams?.get('staff') ?? ''
    const services = searchParams?.get('services') ?? ''
    const rawSkip = searchParams?.get('_skip') ?? ''
    const skipSuffix = rawSkip ? `&_skip=${rawSkip}` : ''

    let backUrl: string
    if (segment === 'barbiere') {
      backUrl = tenantPath('/prenota')
    } else if (segment === 'servizi') {
      backUrl = skipItems.includes('barbiere')
        ? tenantPath('/prenota')
        : tenantPath(`/prenota/barbiere?location=${location}${skipSuffix}`)
    } else if (segment === 'data') {
      backUrl = tenantPath(`/prenota/servizi?location=${location}&staff=${staff}${skipSuffix}`)
    } else if (segment === 'conferma') {
      backUrl = tenantPath(`/prenota/data?location=${location}&staff=${staff}&services=${services}${skipSuffix}`)
    } else {
      backUrl = tenantPath('/prenota')
    }

    return (
      <div style={{ position: 'sticky', top: 0, zIndex: 60, background: '#F7F7F7' }}>
        <PwaPageHeader
          variant="page-with-actions"
          title={title}
          leftAction={{
            icon: <ArrowLeft size={20} color="#111111" strokeWidth={2} />,
            onPress: () => router.push(backUrl),
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

