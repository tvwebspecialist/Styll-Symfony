'use client'

import * as React from 'react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { CalendarPanel } from './CalendarPanel'
import { GreetingHeader } from './GreetingHeader'
import { TodayKpiStrip } from './TodayKpiStrip'
import { CollapsibleSection } from './CollapsibleSection'
import { ChurnAlertCard } from './ChurnAlertCard'
import { WeekStats } from './WeekStats'
import { TopClientsWidget } from './TopClientsWidget'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'

interface Props {
  data: DashboardHomeData
  basePath: string
}

function getDynamicSummary(count: number, total: number): string {
  const part =
    count === 0
      ? 'Nessun appuntamento oggi'
      : count === 1
        ? '1 appuntamento oggi'
        : `${count} appuntamenti oggi`
  return part + (total > 0 ? ` · €${total} ricavi stimati` : '')
}

export function DashboardHomeClient({ data, basePath }: Props) {
  const {
    staffName,
    todayAppointments,
    weekAppointments,
    weekStats,
    yesterdayStats,
    atRiskClients,
    workingHours,
  } = data

  const firstName  = staffName?.split(' ')[0] ?? null
  const totalPrice = todayAppointments.reduce((s, a) => s + a.total_price, 0)

  const { setHomeData } = useDashboardHomeStore()
  React.useEffect(() => {
    setHomeData(
      firstName ? `Ciao ${firstName}` : 'Ciao',
      getDynamicSummary(todayAppointments.length, totalPrice),
    )
  }, [firstName, todayAppointments.length, totalPrice, setHomeData])

  const weekSubtitle = weekStats.revenue > 0
    ? `€${weekStats.revenue} · ${weekStats.client_count} client${weekStats.client_count === 1 ? 'e' : 'i'}`
    : weekStats.client_count > 0
      ? `${weekStats.client_count} client${weekStats.client_count === 1 ? 'e' : 'i'} questa settimana`
      : 'Nessun dato ancora'

  return (
    <div className="home-v2-root">

      {/* ── LEFT — Scrollable content column ──────────────────── */}
      <div className="home-v2-main">

        {/* Greeting — desktop only (mobile: TopBar handles it) */}
        <div className="home-v2-greeting-block">
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: 'var(--card-radius)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
            padding: '20px 24px',
          }}>
            <GreetingHeader staffName={staffName} appointments={todayAppointments} />
          </div>
        </div>

        {/* KPI Grid — 4 cards, 2×2 */}
        <TodayKpiStrip
          appointments={todayAppointments}
          yesterdayStats={yesterdayStats}
          basePath={basePath}
        />

        {/* Settimana — collapsible */}
        <CollapsibleSection
          title="Questa settimana"
          subtitle={weekSubtitle}
          defaultOpen
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <WeekStats stats={weekStats} />
            <TopClientsWidget weekAppointments={weekAppointments} basePath={basePath} />
          </div>
        </CollapsibleSection>

        {/* Clienti a rischio — collapsible, hidden if empty */}
        {atRiskClients.length > 0 && (
          <CollapsibleSection
            title="Clienti a rischio"
            subtitle="Non tornano da tempo — contattali"
            badge={atRiskClients.length}
            badgeVariant="red"
            defaultOpen={false}
          >
            <ChurnAlertCard clients={atRiskClients} basePath={basePath} />
          </CollapsibleSection>
        )}

      </div>

      {/* ── RIGHT — Sticky calendar panel (desktop only) ──────── */}
      <div className="home-v2-calendar">
        <div className="home-v2-calendar-sticky">
          <CalendarPanel
            todayAppointments={todayAppointments}
            weekAppointments={weekAppointments}
            workingHours={workingHours}
            basePath={basePath}
          />
        </div>
      </div>

    </div>
  )
}
