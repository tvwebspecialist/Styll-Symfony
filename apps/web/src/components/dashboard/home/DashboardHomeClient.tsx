'use client'

import * as React from 'react'
import type { DashboardHomeData } from '@/lib/actions/dashboard-home'
import { KPIRow } from './KPIRow'
import { MiniCalendar } from './MiniCalendar'
import { AgendaTimeline } from './AgendaTimeline'
import { ChurnAlert } from './ChurnAlert'
import { FreeSlotsCard } from './FreeSlotsCard'
import { WeekHeatmap } from './WeekHeatmap'
import { WeekStats } from './WeekStats'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'

interface Props {
  data: DashboardHomeData
  basePath: string
}

function getDynamicSummary(count: number, total: number): string {
  const apptPart =
    count === 0 ? 'Nessun appuntamento oggi'
    : count === 1 ? '1 appuntamento oggi'
    : `${count} appuntamenti oggi`
  return apptPart + (total > 0 ? ` · €${total} ricavi stimati` : '')
}

function todayDateLabel(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardHomeClient({ data, basePath }: Props) {
  const { staffName, todayAppointments, weekAppointments, weekSlots, weekStats, atRiskClients } = data
  const firstName = staffName?.split(' ')[0] ?? null
  const totalPrice = todayAppointments.reduce((s, a) => s + a.total_price, 0)

  const { setHomeData } = useDashboardHomeStore()
  React.useEffect(() => {
    setHomeData(
      firstName ? `Ciao ${firstName}` : 'Ciao',
      getDynamicSummary(todayAppointments.length, totalPrice),
    )
  }, [firstName, todayAppointments.length, totalPrice, setHomeData])

  return (
    <div className="home-root">

      {/* ── 1. HERO GREETING — desktop only ────────────────────── */}
      <div className="dashboard-home-greeting">
        <p
          className="dashboard-greeting-title"
          style={{
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            lineHeight: 1.0,
            letterSpacing: '-1.2px',
            fontSize: 48,
            fontWeight: 400,
            color: '#6B7280',
            display: 'inline',
          }}
        >
          {'Ciao, '}
        </p>
        <p
          className="dashboard-greeting-title"
          style={{
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            lineHeight: 1.0,
            letterSpacing: '-1.2px',
            fontSize: 48,
            fontWeight: 800,
            color: '#111111',
            display: 'inline',
          }}
        >
          {firstName ?? 'benvenuto'}
        </p>
        <p
          style={{
            fontSize: 18,
            fontWeight: 400,
            color: '#9CA3AF',
            margin: '8px 0 4px',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.2px',
            lineHeight: 1.4,
          }}
        >
          {getDynamicSummary(todayAppointments.length, totalPrice)}
        </p>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#CBD5E1',
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {todayDateLabel()}
        </p>
      </div>

      {/* ── 2. KPI STRIP — horizontal scroll on mobile ─────────── */}
      <div className="home-kpi-scroll">
        <KPIRow appointments={todayAppointments} />
      </div>

      {/* ── 3. CALENDAR — right col desktop / after KPIs mobile ── */}
      <div className="home-area-calendar">
        <div className="home-calendar-sticky">
          <MiniCalendar weekAppointments={weekAppointments} basePath={basePath} />
        </div>
      </div>

      {/* ── 4. TODAY'S TIMELINE — desktop only ───────────────────── */}
      <div className="home-desktop-only">
        <AgendaTimeline appointments={todayAppointments} basePath={basePath} />
      </div>

      {/* ── 5. SPLIT ROW: Clienti a rischio + Slot liberi ────────── */}
      <div className="home-split-row">
        {atRiskClients.length > 0 ? (
          <ChurnAlert clients={atRiskClients} basePath={basePath} />
        ) : (
          /* Keep grid balanced even with no at-risk clients on desktop */
          <div
            className="home-desktop-only"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 120,
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>✅</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', margin: 0, fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>
              Nessun cliente a rischio
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>
              La retention è ottima!
            </p>
          </div>
        )}
        <FreeSlotsCard appointments={todayAppointments} />
      </div>

      {/* ── 6. WEEK HEATMAP + STATS — desktop only ───────────────── */}
      <div className="home-desktop-only">
        <WeekHeatmap slots={weekSlots} />
      </div>
      <div className="home-desktop-only">
        <WeekStats stats={weekStats} />
      </div>

    </div>
  )
}
