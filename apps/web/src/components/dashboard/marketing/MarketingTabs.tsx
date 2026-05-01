'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Smartphone, UserMinus, MessageSquare, Tag, Star, type LucideIcon } from 'lucide-react'
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
}

export function MarketingTabs({ tenantId }: MarketingTabsProps) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const tabParam    = (searchParams.get('tab') as TabKey | null) ?? 'social'
  const active: TabKey = TABS.some((t) => t.key === tabParam) ? tabParam : 'social'

  const setTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    router.push(`?${params.toString()}`)
  }

  return (
    <div>
      {/* Header — identico a VenditeTabs */}
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
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#222222', margin: 0 }}>
            Marketing
          </h1>
          <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 4, margin: 0 }}>
            Fai crescere il tuo salone con strumenti intelligenti.
          </p>
        </div>
      </div>

      {/* Tab pills — identici a VenditeTabs */}
      <div className="vendite-tabs-row" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
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
        {active === 'messaggi'    && <Messaggi    tenantId={tenantId} />}
        {active === 'promozioni'  && <Promozioni  tenantId={tenantId} />}
        {active === 'reputazione' && <Reputazione tenantId={tenantId} />}
      </div>
    </div>
  )
}
