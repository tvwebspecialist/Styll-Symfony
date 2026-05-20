'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { PwaPageHeader } from './PwaPageHeader'

const STEP_KEYS = ['sede', 'barbiere', 'servizi', 'data', 'conferma'] as const
type StepKey = (typeof STEP_KEYS)[number]

const STEP_TITLES: Record<StepKey, string> = {
  sede: 'Scegli la sede',
  barbiere: 'Scegli il barbiere',
  servizi: 'Scegli i servizi',
  data: 'Data e ora',
  conferma: 'Conferma',
}

const PAGE_TITLES: Record<string, string> = {
  prodotti: 'Prodotti',
  profilo: 'Profilo',
  punti: 'Punti fedeltà',
  loyalty: 'Loyalty',
  book: 'Prenota',
  accesso: 'Accesso',
}

function getCurrentStepKey(pathname: string): StepKey {
  if (pathname.includes('/conferma')) return 'conferma'
  if (pathname.includes('/data')) return 'data'
  if (pathname.includes('/servizi')) return 'servizi'
  if (pathname.includes('/barbiere')) return 'barbiere'
  return 'sede'
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
  primaryColor,
  fontFamily,
  clientName,
  clientAvatarUrl,
  slug,
}: PwaTopBarProps) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantPath = useTenantPath(slug)

  const homePath = tenantPath('')
  const isHome = pathname === homePath
  const isInSuccesso = pathname.startsWith(tenantPath('/prenota/successo'))
  const isInPrenota = pathname.startsWith(tenantPath('/prenota')) && !isInSuccesso

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
    const skipParam = searchParams.get('_skip') ?? ''
    const skippedSet = new Set(skipParam.split(',').filter(Boolean))
    const visibleKeys = STEP_KEYS.filter((k) => !skippedSet.has(k))
    const currentKey = getCurrentStepKey(pathname)
    const effectiveIndex = visibleKeys.indexOf(currentKey)
    const stepNumber = effectiveIndex >= 0 ? effectiveIndex + 1 : 1
    const effectiveTotal = visibleKeys.length
    const progressPct = Math.round((stepNumber / effectiveTotal) * 100)

    return (
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 10,
          paddingBottom: 12,
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Torna indietro"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color="#111111" strokeWidth={1.8} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: '#222222',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: fontFamily ?? 'inherit',
              }}
            >
              {STEP_TITLES[currentKey]}
            </p>
            <span style={{ fontSize: 12, color: '#888888', flexShrink: 0, marginLeft: 8 }}>
              {stepNumber}/{effectiveTotal}
            </span>
          </div>
          <div
            style={{ height: 3, borderRadius: 100, background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 100,
                background: primaryColor ?? '#222222',
                width: `${progressPct}%`,
                transition: 'width 300ms ease',
              }}
            />
          </div>
        </div>
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

