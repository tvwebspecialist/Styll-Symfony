'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Smartphone, UserMinus, MessageSquare, Tag, Star, Info, X, type LucideIcon } from 'lucide-react'
import { Social } from './tabs/Social'
import { Retention } from './tabs/Retention'
import { Messaggi } from './tabs/Messaggi'
import { Promozioni } from './tabs/Promozioni'
import { Reputazione } from './tabs/Reputazione'

type TabKey = 'social' | 'retention' | 'messaggi' | 'promozioni' | 'reputazione'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'social',      label: 'Social',      icon: Smartphone    },
  { key: 'retention',   label: 'Retention',   icon: UserMinus     },
  { key: 'messaggi',    label: 'Messaggi',    icon: MessageSquare },
  { key: 'promozioni',  label: 'Promozioni',  icon: Tag           },
  { key: 'reputazione', label: 'Reputazione', icon: Star          },
]

interface MarketingTabsProps {
  tenantId: string
  allowedTabs?: readonly TabKey[]
  defaultTab?: TabKey
  inboxOnly?: boolean
}

function PulseInfoRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3 }} />
      <div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#222222' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#888888' }}>{' '}— {desc}</span>
      </div>
    </div>
  )
}

export function MarketingTabs({
  tenantId,
  allowedTabs,
  defaultTab,
  inboxOnly = false,
}: MarketingTabsProps) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const tabParam    = (searchParams.get('tab') as TabKey | null) ?? 'social'
  const visibleTabs = allowedTabs?.length
    ? TABS.filter((tab) => allowedTabs.includes(tab.key))
    : TABS
  const fallbackTab = (defaultTab && visibleTabs.some((tab) => tab.key === defaultTab))
    ? defaultTab
    : (visibleTabs[0]?.key ?? 'messaggi')
  const active: TabKey = visibleTabs.some((t) => t.key === tabParam) ? tabParam : fallbackTab

  const [infoOpen, setInfoOpen] = React.useState(false)
  const infoRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!infoOpen) return
    function handler(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [infoOpen])

  // Close popup when changing tab
  React.useEffect(() => { setInfoOpen(false) }, [active])

  const setTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    router.push(`?${params.toString()}`)
  }

  return (
    <div>
      {/* Header */}
      <div
        className="vendite-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="dashboard-page-title" style={{ fontSize: 28, fontWeight: 700, color: '#222222', margin: 0 }}>
            Marketing
          </h1>
          <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 4, margin: 0 }}>
            Fai crescere il tuo salone con strumenti intelligenti.
          </p>
        </div>

        {/* Info button — visible only on Retention tab */}
        {active === 'retention' && (
          <div ref={infoRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              aria-label="Come funziona Pulse"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: infoOpen ? '#F0F0F0' : 'transparent',
                border: '1px solid #E5E5E5',
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
            >
              <Info size={14} color="#888888" />
              <span style={{ fontSize: 12, color: '#888888', fontWeight: 500 }}>Come funziona</span>
            </button>

            {infoOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 280,
                  background: '#FFFFFF',
                  border: '1px solid #E5E5E5',
                  borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  padding: 16,
                  zIndex: 200,
                }}
              >
                {/* Popup header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Image src="/img/Churn_yellow.png" alt="" width={18} height={18} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>Come funziona Pulse</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoOpen(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', lineHeight: 1 }}
                  >
                    <X size={14} color="#AAAAAA" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#555555', lineHeight: 1.6 }}>
                    Pulse analizza il <strong>ritmo di visita</strong> di ogni cliente: confronta i giorni dall&apos;ultima visita con la sua frequenza media storica.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <PulseInfoRow color="#F59E0B" label="A rischio"      desc="Non torna da oltre 1,4× la sua media" />
                    <PulseInfoRow color="#EF4444" label="Da recuperare"  desc="Assente da oltre 2× la sua media" />
                    <PulseInfoRow color="#6B7280" label="Perso"          desc="Assente da oltre 3× la sua media" />
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: '#AAAAAA', lineHeight: 1.5 }}>
                    I segmenti si aggiornano ogni notte in automatico.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab pills — identici a VenditeTabs */}
      <div className="vendite-tabs-row" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {visibleTabs.map((tab) => {
          const isActive = active === tab.key
          const Icon     = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                background: isActive ? '#222222' : '#FFFFFF',
                color:      isActive ? '#FFFFFF' : '#222222',
                border:     isActive ? '1px solid #222222' : '1px solid #E9E9E9',
                transition: 'all 120ms ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content — animato da tabFadeIn in globals.css */}
      <div key={active} className="tab-content">
        {active === 'social'      && <Social      tenantId={tenantId} />}
        {active === 'retention'   && <Retention   tenantId={tenantId} />}
        {active === 'messaggi'    && <Messaggi    tenantId={tenantId} inboxOnly={inboxOnly} />}
        {active === 'promozioni'  && <Promozioni  tenantId={tenantId} />}
        {active === 'reputazione' && <Reputazione tenantId={tenantId} />}
      </div>
    </div>
  )
}
