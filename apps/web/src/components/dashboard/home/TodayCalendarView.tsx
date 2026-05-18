'use client'

import * as React from 'react'
import Link from 'next/link'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

const HOUR_HEIGHT = 80 // px per hour
const START_HOUR = 8
const END_HOUR = 20
const TOTAL_HOURS = END_HOUR - START_HOUR
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

function calcNowTop(): number {
  const now = new Date()
  return (now.getHours() - START_HOUR + now.getMinutes() / 60) * HOUR_HEIGHT
}

function isNowInRange(): boolean {
  const h = new Date().getHours()
  return h >= START_HOUR && h < END_HOUR
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function fmtTime(t: string): string {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function apptTop(start_time: string): number {
  const d = new Date(start_time)
  return (d.getHours() - START_HOUR + d.getMinutes() / 60) * HOUR_HEIGHT
}

function apptHeight(start_time: string, end_time: string): number {
  const s = new Date(start_time)
  const e = new Date(end_time)
  const diffH = (e.getTime() - s.getTime()) / 3_600_000
  return Math.max(HOUR_HEIGHT / 4, diffH * HOUR_HEIGHT)
}

function apptColors(status: string): {
  bg: string
  textPrimary: string
  textSecondary: string
  border: string
  opacity: number
} {
  if (status === 'completed') {
    return {
      bg: '#F3F4F6',
      textPrimary: '#9CA3AF',
      textSecondary: '#9CA3AF',
      border: 'none',
      opacity: 0.65,
    }
  }
  if (status === 'pending') {
    return {
      bg: '#FFFBEB',
      textPrimary: '#92400E',
      textSecondary: '#B45309',
      border: '1.5px dashed #D97706',
      opacity: 1,
    }
  }
  // confirmed and others
  return {
    bg: '#111827',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.65)',
    border: 'none',
    opacity: 1,
  }
}

interface Props {
  appointments: TodayAppointment[]
  basePath: string
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

export function TodayCalendarView({ appointments, basePath }: Props) {
  const [nowTop, setNowTop] = React.useState(0)
  const [showNow, setShowNow] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const update = () => {
      setNowTop(calcNowTop())
      setShowNow(isNowInRange())
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll to show time just before current hour
  React.useEffect(() => {
    if (scrollRef.current && showNow) {
      const target = Math.max(0, nowTop - 120)
      scrollRef.current.scrollTop = target
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNow])

  const visible = appointments.filter((a) => a.status !== 'cancelled')

  const today = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const count = visible.length
  const totalRevenue = visible.reduce((s, a) => s + a.total_price, 0)

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E9E9E9',
        boxShadow: '0 1px 3px rgba(10,13,18,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ───────────────────────────────────── */}
      <div
        style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid #F0F0F0',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <p
            suppressHydrationWarning
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: '#222222',
              fontFamily: 'Outfit, sans-serif',
              textTransform: 'capitalize',
              lineHeight: 1.2,
            }}
          >
            {today}
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: '#B0B0B0',
              fontFamily: 'Outfit, sans-serif',
              lineHeight: 1,
            }}
          >
            {count > 0
              ? `${count} appuntament${count === 1 ? 'o' : 'i'}${totalRevenue > 0 ? ` · €${totalRevenue} stimati` : ''}`
              : 'Nessun appuntamento oggi'}
          </p>
        </div>
        <Link
          href={`${basePath}/calendario`}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            padding: '6px 12px',
            border: '1px solid #E9E9E9',
            borderRadius: 8,
            fontFamily: 'Outfit, sans-serif',
            flexShrink: 0,
          }}
        >
          Calendario completo →
        </Link>
      </div>

      {/* ── Time grid ────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="home-cal-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: TOTAL_HEIGHT,
            display: 'flex',
          }}
        >
          {/* Time label column */}
          <div style={{ width: 52, flexShrink: 0, position: 'relative' }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: (h - START_HOUR) * HOUR_HEIGHT,
                  left: 0,
                  width: 52,
                  paddingTop: 5,
                  paddingLeft: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#CCCCCC',
                    fontFamily: 'ui-monospace, monospace',
                    lineHeight: 1,
                  }}
                >
                  {fmtHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Grid + appointments */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              borderLeft: '1px solid #F5F5F5',
            }}
          >
            {/* Hour grid lines */}
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: (h - START_HOUR) * HOUR_HEIGHT,
                  left: 0,
                  right: 0,
                  borderTop: '1px solid #F5F5F5',
                }}
              />
            ))}

            {/* Appointment blocks */}
            {visible.map((appt) => {
              const top = apptTop(appt.start_time)
              const height = apptHeight(appt.start_time, appt.end_time)
              const colors = apptColors(appt.status)

              return (
                <div
                  key={appt.id}
                  style={{
                    position: 'absolute',
                    top: top + 2,
                    left: 6,
                    right: 6,
                    height: height - 4,
                    background: colors.bg,
                    border: colors.border,
                    borderRadius: 8,
                    opacity: colors.opacity,
                    padding: '6px 10px',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      fontFamily: 'Outfit, sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    {appt.client_name}
                  </p>
                  {height >= 36 && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 10,
                        color: colors.textSecondary,
                        fontFamily: 'Outfit, sans-serif',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                      }}
                    >
                      {fmtTime(appt.start_time)}
                      {appt.service_names[0] ? ` · ${appt.service_names[0]}` : ''}
                    </p>
                  )}
                </div>
              )
            })}

            {/* "Now" red line */}
            {showNow && (
              <div
                style={{
                  position: 'absolute',
                  top: nowTop,
                  left: -6,
                  right: 0,
                  height: 2,
                  background: '#EF4444',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#EF4444',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
