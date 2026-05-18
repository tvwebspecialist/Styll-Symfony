'use client'

import * as React from 'react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { TodayCalendarView } from './TodayCalendarView'
import { GreetingWidget } from './GreetingWidget'
import { KPIGridWidget } from './KPIGridWidget'
import { NextAppointmentCard } from './NextAppointmentCard'
import { AgendaTimeline } from './AgendaTimeline'
import { ChurnAlert } from './ChurnAlert'
import { QuickActionsWidget } from './QuickActionsWidget'
import { WeekStats } from './WeekStats'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'

interface Props {
  data: DashboardHomeData
  basePath: string
}

function getDynamicSummary(count: number, total: number): string {
  const apptPart =
    count === 0
      ? 'Nessun appuntamento oggi'
      : count === 1
        ? '1 appuntamento oggi'
        : `${count} appuntamenti oggi`
  return apptPart + (total > 0 ? ` · €${total} ricavi stimati` : '')
}

function findNextAppointment(
  appointments: DashboardHomeData['todayAppointments'],
): DashboardHomeData['todayAppointments'][0] | null {
  const now = new Date()
  return (
    [...appointments]
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .find(
        (a) =>
          new Date(a.end_time) > now &&
          a.status !== 'completed' &&
          a.status !== 'cancelled',
      ) ?? null
  )
}

export function DashboardHomeClient({ data, basePath }: Props) {
  const { staffName, todayAppointments, weekStats, atRiskClients } = data
  const firstName = staffName?.split(' ')[0] ?? null
  const totalPrice = todayAppointments.reduce((s, a) => s + a.total_price, 0)
  const nextAppt = findNextAppointment(todayAppointments)

  const { setHomeData } = useDashboardHomeStore()
  React.useEffect(() => {
    setHomeData(
      firstName ? `Ciao ${firstName}` : 'Ciao',
      getDynamicSummary(todayAppointments.length, totalPrice),
    )
  }, [firstName, todayAppointments.length, totalPrice, setHomeData])

  return (
    <div className="home-bicolonna-root">

      {/* ── LEFT — Calendario oggi (desktop only) ────────── */}
      <div className="home-bicolonna-left">
        <TodayCalendarView appointments={todayAppointments} basePath={basePath} />
      </div>

      {/* ── RIGHT — Widget stack ──────────────────────────── */}
      <div className="home-bicolonna-right dashboard-sidebar-right">

        <div className="dash-widget" style={{ animationDelay: '0ms' }}>
          <GreetingWidget staffName={staffName} appointments={todayAppointments} />
        </div>

        <div className="dash-widget" style={{ animationDelay: '50ms' }}>
          <KPIGridWidget appointments={todayAppointments} />
        </div>

        <div className="dash-widget" style={{ animationDelay: '100ms' }}>
          <NextAppointmentCard appointment={nextAppt} basePath={basePath} />
        </div>

        <div className="dash-widget" style={{ animationDelay: '150ms' }}>
          <AgendaTimeline appointments={todayAppointments} basePath={basePath} />
        </div>

        {atRiskClients.length > 0 && (
          <div className="dash-widget" style={{ animationDelay: '200ms' }}>
            <ChurnAlert clients={atRiskClients} basePath={basePath} />
          </div>
        )}

        <div className="dash-widget" style={{ animationDelay: '250ms' }}>
          <QuickActionsWidget basePath={basePath} />
        </div>

        <div className="dash-widget" style={{ animationDelay: '300ms' }}>
          <WeekStats stats={weekStats} />
        </div>

      </div>
    </div>
  )
}
