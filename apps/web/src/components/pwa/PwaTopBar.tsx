// REDESIGN: altezza 75px, glass blur apple-style, border-radius bottom 20px,
// shadow leggera, titolo 17px/600 — applicato globalmente su tutta la PWA
'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
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

// safe area: background esteso, contenuto centrato nei 75px sotto status bar
// glassShell = solo background + paddingTop safe area (non gestisce flex/altezza)
const glassShell = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 60,
  paddingTop: 'env(safe-area-inset-top, 0px)',
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(28px) saturate(200%)',
  WebkitBackdropFilter: 'blur(28px) saturate(200%)',
  borderBottomLeftRadius: '40px',
  borderBottomRightRadius: '40px',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(0, 0, 0, 0.04)',
}

// contentBar = inner 75px dove vive il contenuto (flex centrato)
const contentBar = {
  height: 75,
  display: 'flex',
  alignItems: 'center',
} as const

// action buttons: background white + shadow leggera
const backBtnStyle = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: '#ffffff',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.10), 0 0px 1px rgba(0, 0, 0, 0.06)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
} as const

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

  const titleStyle = {
    position: 'absolute' as const,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 24,
    fontWeight: 600,
    color: '#111111',
    fontFamily: fontFamily ?? 'inherit',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    maxWidth: 'calc(100% - 140px)',
  }

  // ── Home ──────────────────────────────────────────────────────────────────
  if (isHome) {
    return (
      <div style={glassShell}>
        <div style={contentBar}>
          <div style={{ flex: 1 }}>
            <PwaPageHeader
              variant="home"
              clientName={clientName}
              clientAvatarUrl={clientAvatarUrl}
              hasUnreadNotifications={false}
              onNotificationsPress={() => {}}
              fontFamily={fontFamily}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Successo ──────────────────────────────────────────────────────────────
  if (isInSuccesso) {
    return (
      <div style={glassShell}>
        <div style={{ ...contentBar, justifyContent: 'center' }}>
          <span style={{ fontSize: 24, fontWeight: 600, color: '#111111', fontFamily: fontFamily ?? 'inherit' }}>
            Prenotazione confermata
          </span>
        </div>
      </div>
    )
  }

  // ── Prenota steps ─────────────────────────────────────────────────────────
  if (isInPrenota) {
    const prenotaBase = tenantPath('/prenota')
    const isPrenotaRoot = pathname === prenotaBase || pathname === `${prenotaBase}/`
    const segment = isPrenotaRoot ? '' : (pathname.slice(prenotaBase.length + 1).split('/')[0] ?? '')

    if (segment === 'servizi') return null
    if (segment === 'data') return null

    const STEP_TITLES: Record<string, string> = {
      '': 'Sede',
      barbiere: 'Barbiere',
      data: 'Quando',
      conferma: 'Conferma',
    }
    const title = STEP_TITLES[segment] ?? 'Prenota'

    const isFirstStep =
      isPrenotaRoot ||
      (segment === 'barbiere' && skipItems.includes('sede')) ||
      (segment === 'servizi' && skipItems.includes('sede') && skipItems.includes('barbiere'))

    // First visible step — no back button
    if (isFirstStep) {
      return (
        <div style={glassShell}>
          <div style={{ ...contentBar, justifyContent: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 600, color: '#111111', fontFamily: fontFamily ?? 'inherit' }}>
              {title}
            </span>
          </div>
        </div>
      )
    }

    // Subsequent steps — explicit back navigation
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
      <div style={glassShell}>
        <div style={{ ...contentBar, paddingLeft: '20px', paddingRight: '20px' }}>
          <button
            type="button"
            style={backBtnStyle}
            onClick={() => router.push(backUrl)}
            aria-label="Torna indietro"
          >
            <ChevronLeft size={20} color="#111111" strokeWidth={2.5} />
          </button>
          <span style={titleStyle}>{title}</span>
          <div style={{ width: 44, flexShrink: 0, marginLeft: 'auto' }} />
        </div>
      </div>
    )
  }

  // ── Sub-pages with back button ────────────────────────────────────────────
  const base = homePath === '/' ? 0 : homePath.length
  const relative = pathname.slice(base).replace(/^\//, '')
  const segments = relative.split('/')
  const segment = segments[0] ?? ''
  const subSegment = segments[1] ?? ''

  // Product detail — back button to /prodotti list
  if (segment === 'prodotti' && subSegment) {
    return (
      <div style={glassShell}>
        <div style={{ ...contentBar, paddingLeft: '20px', paddingRight: '20px' }}>
          <button
            type="button"
            style={backBtnStyle}
            onClick={() => router.push(tenantPath('/prodotti'))}
            aria-label="Torna ai prodotti"
          >
            <ChevronLeft size={20} color="#111111" strokeWidth={2.5} />
          </button>
          <div style={{ width: 44, flexShrink: 0, marginLeft: 'auto' }} />
        </div>
      </div>
    )
  }

  // Pages that need a back button
  const SUB_PAGES: Record<string, { title: string; backTo: string }> = {
    'appuntamenti': { title: 'Appuntamenti', backTo: tenantPath('/profilo') },
    'preferiti': { title: 'Preferiti', backTo: tenantPath('/profilo') },
  }
  const PROFILO_SUB_PAGES: Record<string, { title: string; backTo: string }> = {
    'modifica': { title: 'Modifica profilo', backTo: tenantPath('/profilo') },
    'preferenze': { title: 'Preferenze', backTo: tenantPath('/profilo') },
  }

  const subPage = SUB_PAGES[segment] ?? (segment === 'profilo' ? PROFILO_SUB_PAGES[subSegment] : null)

  if (subPage) {
    return (
      <div style={glassShell}>
        <div style={{ ...contentBar, paddingLeft: '20px', paddingRight: '20px' }}>
          <button
            type="button"
            style={backBtnStyle}
            onClick={() => router.push(subPage.backTo)}
            aria-label="Torna indietro"
          >
            <ChevronLeft size={20} color="#111111" strokeWidth={2.5} />
          </button>
          <span style={titleStyle}>{subPage.title}</span>
          <div style={{ width: 44, flexShrink: 0, marginLeft: 'auto' }} />
        </div>
      </div>
    )
  }

  // ── All other routes ──────────────────────────────────────────────────────
  const title = PAGE_TITLES[segment] ?? ''

  return (
    <div style={glassShell}>
      <div style={{ ...contentBar, justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: '#111111', fontFamily: fontFamily ?? 'inherit' }}>
          {title}
        </span>
      </div>
    </div>
  )
}

export function PwaTopBar(props: PwaTopBarProps) {
  return (
    <Suspense fallback={<div style={{ height: 'calc(75px + env(safe-area-inset-top, 0px))' }} />}>
      <TopBarInner {...props} />
    </Suspense>
  )
}
