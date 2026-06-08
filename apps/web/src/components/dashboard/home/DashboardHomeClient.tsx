'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { CalendarPanel } from './CalendarPanel'
import { GreetingHeader } from './GreetingHeader'
import { TodayKpiStrip } from './TodayKpiStrip'
import { AgendaTimeline } from './AgendaTimeline'
import { ChurnAlertCard } from './ChurnAlertCard'
import { QuickActionsWidget } from './QuickActionsWidget'
import { MobileHero } from './MobileHero'
import { MobileAppointmentList } from './MobileAppointmentList'
import { MobileChurnBanner } from './MobileChurnBanner'
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
  const { staffName, todayAppointments, weekAppointments, yesterdayStats, atRiskClients } = data
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

          {/* ── DESKTOP layout — hidden on mobile ─── */}
          <div
            className="desktop-only"
            style={{ flexDirection: 'column', gap: 20 }}
          >
            <GreetingHeader staffName={staffName} appointments={todayAppointments} />
            <TodayKpiStrip appointments={todayAppointments} yesterdayStats={yesterdayStats} />
            <AgendaTimeline appointments={todayAppointments} basePath={basePath} />
            {atRiskClients.length > 0 && (
              <ChurnAlertCard clients={atRiskClients} basePath={basePath} />
            )}
            <QuickActionsWidget basePath={basePath} />
          </div>

          {/* ── MOBILE layout — hidden on desktop ─── */}
          <div
            className="mobile-only"
            style={{ flexDirection: 'column', gap: 20 }}
          >
            <MobileHero
              staffName={staffName}
              appointments={todayAppointments}
            />
            <MobileAppointmentList
              appointments={todayAppointments}
              basePath={basePath}
            />
            {atRiskClients.length > 0 && (
              <MobileChurnBanner clients={atRiskClients} basePath={basePath} />
            )}
          </div>

        </div>

        {/* ── RIGHT — Sticky calendar panel (desktop only) ──────── */}
        <div className="home-v2-calendar">
          <div className="home-v2-calendar-sticky">
            <CalendarPanel
              todayAppointments={todayAppointments}
              weekAppointments={weekAppointments}
              basePath={basePath}
            />
          </div>
        </div>

      </div>

      {/* ── FAB — nuovo appuntamento (mobile only) ────────────── */}
      <Link
        href={`${basePath}/calendario?new=1`}
        className="mobile-only"
        aria-label="Aggiungi appuntamento"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height, 80px) + 16px)',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--sidebar-item-active-bg, #222222)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.28)',
          zIndex: 40,
        }}
      >
        <Plus size={28} strokeWidth={2} />
      </Link>
    </>
  )
}
