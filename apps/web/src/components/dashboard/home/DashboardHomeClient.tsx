'use client'

import * as React from 'react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { CalendarPanel } from './CalendarPanel'
import { GreetingHeader } from './GreetingHeader'
import { KpiCard } from './KpiCard'
import { ChurnAlertCard } from './ChurnAlertCard'
import { SlotVuotiCard } from './SlotVuotiCard'
import { ProssimoAppCard } from './ProssimoAppCard'
import { BentoGrid } from './BentoGrid'
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
  const { staffName, todayAppointments, weekAppointments, weekStats, atRiskClients } = data
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
    <div className="home-v2-root">

      {/* ── LEFT — Greeting + Bento Grid ─────────────────────── */}
      <div className="home-v2-main">
        <GreetingHeader staffName={staffName} appointments={todayAppointments} />

        <BentoGrid>
          {/* Card 1 — KPI Settimanali */}
          <KpiCard stats={weekStats} />

          {/* Card 2 — Clienti a Rischio Churn */}
          <ChurnAlertCard clients={atRiskClients} basePath={basePath} />

          {/* Card 3 — Slot Vuoti Oggi */}
          <SlotVuotiCard appointments={todayAppointments} />

          {/* Card 4 — Prossimo Appuntamento */}
          <ProssimoAppCard appointment={nextAppt} basePath={basePath} />
        </BentoGrid>
      </div>

      {/* ── RIGHT — Calendar Panel (desktop only) ────────────── */}
      <div className="home-v2-calendar">
        <CalendarPanel
          todayAppointments={todayAppointments}
          weekAppointments={weekAppointments}
          basePath={basePath}
        />
      </div>

    </div>
  )
}
