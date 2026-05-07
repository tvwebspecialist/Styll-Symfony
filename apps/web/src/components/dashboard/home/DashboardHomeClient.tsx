'use client'

import * as React from 'react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { KPIRow } from './KPIRow'
import { MiniCalendar } from './MiniCalendar'
import { NextAppointmentCard } from './NextAppointmentCard'
import { AgendaList } from './AgendaList'
import { ChurnAlert } from './ChurnAlert'
import { WeekHeatmap } from './WeekHeatmap'
import { WeekStats } from './WeekStats'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'

interface Props {
  data: DashboardHomeData
  basePath: string
}

function getDynamicSummary(appointmentsCount: number, totalPrice: number): string {
  const apptPart =
    appointmentsCount === 0
      ? 'Nessun appuntamento oggi'
      : appointmentsCount === 1
        ? '1 appuntamento oggi'
        : `${appointmentsCount} appuntamenti oggi`
  const revPart = totalPrice > 0 ? `, €${totalPrice} ricavi stimati` : ''
  return apptPart + revPart
}

export function DashboardHomeClient({ data, basePath }: Props) {
  const { staffName, todayAppointments, weekAppointments, weekSlots, weekStats, atRiskClients } = data
  const firstName = staffName ? staffName.split(' ')[0] : null
  const totalPrice = todayAppointments.reduce((s, a) => s + a.total_price, 0)

  // Populate the TopBarHome store so the mobile glass topbar shows real data
  const { setHomeData } = useDashboardHomeStore()
  React.useEffect(() => {
    const greeting = firstName ? `Ciao ${firstName}` : 'Ciao'
    const subtitle = getDynamicSummary(todayAppointments.length, totalPrice)
    setHomeData(greeting, subtitle)
  }, [firstName, todayAppointments.length, totalPrice, setHomeData])

  // Next upcoming appointment (not yet completed/cancelled)
  const nextAppt =
    todayAppointments.find(
      (a) => a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.start_time) > new Date(),
    ) ?? todayAppointments.find((a) => a.status !== 'completed' && a.status !== 'cancelled') ?? null

  const hasChurn = atRiskClients.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Greeting — hidden on mobile (shown in TopBarHome glass topbar instead) */}
      <div className="dashboard-home-greeting">
        <p
          className="dashboard-greeting-title"
          style={{
            fontSize: 50,
            fontWeight: 800,
            color: '#222222',
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-1.25px',
            lineHeight: 1.1,
          }}
        >
          {firstName ? `Ciao ${firstName}` : 'Ciao'}
        </p>
        <p
          className="dashboard-greeting-sub"
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: '#222222',
            margin: '4px 0 0',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.9px',
            lineHeight: '125.735%',
          }}
        >
          {getDynamicSummary(todayAppointments.length, totalPrice)}
        </p>
      </div>

      {/* KPI row */}
      <KPIRow appointments={todayAppointments} />

      {/* Row 2: Mini calendar + Next appointment */}
      <div className="dashboard-row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <MiniCalendar weekAppointments={weekAppointments} basePath={basePath} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <NextAppointmentCard appointment={nextAppt} basePath={basePath} />
          <AgendaList appointments={todayAppointments} basePath={basePath} />
        </div>
      </div>

      {/* Row 3: Churn + Heatmap */}
      {hasChurn && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ChurnAlert clients={atRiskClients} basePath={basePath} />
          <WeekHeatmap slots={weekSlots} />
        </div>
      )}
      {!hasChurn && <WeekHeatmap slots={weekSlots} />}

      {/* Row 4: Week stats */}
      <WeekStats stats={weekStats} />
    </div>
  )
}
