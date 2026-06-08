'use client'

import * as React from 'react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { CalendarPanel } from './CalendarPanel'
import { GreetingHeader } from './GreetingHeader'
import { TodayKpiStrip } from './TodayKpiStrip'
import { ChurnAlertCard } from './ChurnAlertCard'
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
  const { staffName, todayAppointments, weekAppointments, yesterdayStats, atRiskClients, workingHours } = data
  const firstName  = staffName?.split(' ')[0] ?? null
  const totalPrice = todayAppointments.reduce((s, a) => s + a.total_price, 0)

  const { setHomeData } = useDashboardHomeStore()
  React.useEffect(() => {
    setHomeData(
      firstName ? `Ciao ${firstName}` : 'Ciao',
      getDynamicSummary(todayAppointments.length, totalPrice),
    )
  }, [firstName, todayAppointments.length, totalPrice, setHomeData])

  return (
    <>
      <div className="home-v2-root">

        {/* ── LEFT — Scrollable content column ──────────────────── */}
        <div className="home-v2-main">

          <div className="home-main-card" style={{
            background: 'var(--card-bg)',
            borderRadius: 'var(--card-radius)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {/* Greeting + divider — hidden on mobile (topbar handles it) */}
            <div className="home-v2-greeting-block" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <GreetingHeader staffName={staffName} appointments={todayAppointments} />
              <div style={{ height: 1, background: 'var(--divider)' }} />
            </div>
            <TodayKpiStrip appointments={todayAppointments} yesterdayStats={yesterdayStats} />
            {atRiskClients.length > 0 && (
              <ChurnAlertCard clients={atRiskClients} basePath={basePath} />
            )}
          </div>

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

    </>
  )
}
