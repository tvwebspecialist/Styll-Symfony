'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutDashboard, Calendar, Package, CreditCard, type LucideIcon } from 'lucide-react'
import { Riepilogo } from './tabs/Riepilogo'
import { Appuntamenti } from './tabs/Appuntamenti'
import { Prodotti } from './tabs/Prodotti'
import { Pagamenti } from './tabs/Pagamenti'

type TabKey = 'riepilogo' | 'appuntamenti' | 'prodotti' | 'pagamenti'
type Period = 'oggi' | 'settimana' | 'mese'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'riepilogo', label: 'Riepilogo', icon: LayoutDashboard },
  { key: 'appuntamenti', label: 'Appuntamenti', icon: Calendar },
  { key: 'prodotti', label: 'Prodotti', icon: Package },
  { key: 'pagamenti', label: 'Pagamenti', icon: CreditCard },
]

const PERIODS: { key: Period; label: string }[] = [
  { key: 'oggi', label: 'Oggi' },
  { key: 'settimana', label: 'Settimana' },
  { key: 'mese', label: 'Mese' },
]

export function VenditeTabs({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') as TabKey | null) ?? 'riepilogo'
  const active: TabKey = TABS.some((t) => t.key === tabParam) ? tabParam : 'riepilogo'
  const periodParam = (searchParams.get('period') as Period | null) ?? 'mese'
  const period: Period = PERIODS.some((p) => p.key === periodParam) ? periodParam : 'mese'

  const setTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    router.push(`?${params.toString()}`)
  }

  const setPeriod = (key: Period) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', key)
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
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#222222', margin: 0 }}>
            Vendite
          </h1>
          <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 4, margin: 0 }}>
            Monitora ricavi, appuntamenti, prodotti e pagamenti.
          </p>
        </div>

        <div className="vendite-period-row" style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map((p) => {
            const isActive = p.key === period
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: isActive ? '#222222' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#222222',
                  border: isActive ? '1px solid #222222' : '1px solid #E9E9E9',
                  transition: 'all 120ms ease',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="vendite-tabs-row" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const isActive = active === tab.key
          const Icon = tab.icon
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
                color: isActive ? '#FFFFFF' : '#222222',
                border: isActive ? '1px solid #222222' : '1px solid #E9E9E9',
                transition: 'all 120ms ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content with animation */}
      <div key={active} className="tab-content">
        {active === 'riepilogo' && <Riepilogo tenantId={tenantId} />}
        {active === 'appuntamenti' && <Appuntamenti tenantId={tenantId} />}
        {active === 'prodotti' && <Prodotti tenantId={tenantId} />}
        {active === 'pagamenti' && <Pagamenti tenantId={tenantId} />}
      </div>
    </div>
  )
}
