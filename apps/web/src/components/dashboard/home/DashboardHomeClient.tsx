'use client'

import * as React from 'react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { KPIRow } from './KPIRow'
import { NextAppointmentCard } from './NextAppointmentCard'
import { AgendaList } from './AgendaList'
import { ChurnAlert } from './ChurnAlert'
import { WeekHeatmap } from './WeekHeatmap'
import { WeekStats } from './WeekStats'

interface Props {
  data: DashboardHomeData
  basePath: string
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function todayFull(): string {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function DashboardHomeClient({ data, basePath }: Props) {
  const { staffName, todayAppointments, weekSlots, weekStats, atRiskClients } = data

  // Next upcoming appointment (not yet completed/cancelled)
  const nextAppt =
    todayAppointments.find(
      (a) => a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.start_time) > new Date(),
    ) ?? todayAppointments.find((a) => a.status !== 'completed' && a.status !== 'cancelled') ?? null

  const hasChurn = atRiskClients.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Greeting */}
      <div>
        <p
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: '#222222',
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {getGreeting()}{staffName ? `, ${staffName}` : ''}
        </p>
        <p style={{ fontSize: 14, color: '#B0B0B0', margin: '4px 0 0', fontFamily: 'Outfit, sans-serif', textTransform: 'capitalize' }}>
          {capitalize(todayFull())}
        </p>
      </div>

      {/* KPI row */}
      <KPIRow appointments={todayAppointments} />

      {/* Row 2: Next appointment + Agenda */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <NextAppointmentCard appointment={nextAppt} basePath={basePath} />
        <AgendaList appointments={todayAppointments} basePath={basePath} />
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
