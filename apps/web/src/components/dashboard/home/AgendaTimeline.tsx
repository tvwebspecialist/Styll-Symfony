'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  appointments: TodayAppointment[]
  basePath: string
}

const WORK_START = 8
const WORK_END = 20
const MIN_FREE_SLOT = 30

type Item =
  | { type: 'appt'; appt: TodayAppointment }
  | { type: 'free'; startMin: number; durationMin: number }

function buildItems(appointments: TodayAppointment[]): Item[] {
  const sorted = [...appointments]
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const items: Item[] = []
  let cursor = WORK_START * 60

  for (const appt of sorted) {
    const startMin = new Date(appt.start_time).getHours() * 60 + new Date(appt.start_time).getMinutes()
    const endMin = new Date(appt.end_time).getHours() * 60 + new Date(appt.end_time).getMinutes()
    const gap = startMin - cursor
    if (gap >= MIN_FREE_SLOT) items.push({ type: 'free', startMin: cursor, durationMin: gap })
    items.push({ type: 'appt', appt })
    cursor = Math.max(cursor, endMin)
  }

  const trailing = WORK_END * 60 - cursor
  if (trailing >= MIN_FREE_SLOT) items.push({ type: 'free', startMin: cursor, durationMin: trailing })

  return items
}

function toTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function durLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

function fmt(t: string) {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function todayLabel(): string {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_BG  = ['#dbeafe', '#ede9fe', '#dcfce7', '#ffedd5', '#fce7f3', '#e0f2fe']
const AVATAR_COL = ['#1e40af', '#6d28d9', '#15803d', '#c2410c', '#be185d', '#0369a1']

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_BG.length
  return { bg: AVATAR_BG[idx]!, text: AVATAR_COL[idx]! }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    confirmed: { label: 'Confermato', bg: '#dcfce7', color: '#15803d' },
    completed: { label: 'Completato', bg: '#F3F4F6', color: '#6B7280' },
    pending:   { label: 'In attesa',  bg: '#fef3c7', color: '#b45309' },
    cancelled: { label: 'Cancellato', bg: '#fee2e2', color: '#dc2626' },
    no_show:   { label: 'No show',    bg: '#f1f5f9', color: '#64748b' },
  }
  const s = map[status] ?? { label: status, bg: '#f1f5f9', color: '#64748b' }
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 99,
        background: s.bg,
        color: s.color,
        flexShrink: 0,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      {s.label}
    </span>
  )
}

function statusAccent(status: string): string {
  if (status === 'confirmed') return '#22c55e'
  if (status === 'completed') return '#9CA3AF'
  if (status === 'pending')   return '#f59e0b'
  if (status === 'cancelled') return '#ef4444'
  return '#e2e8f0'
}

export function AgendaTimeline({ appointments, basePath }: Props) {
  const router = useRouter()
  const [label, setLabel] = React.useState('')

  React.useEffect(() => {
    setLabel(todayLabel())
  }, [])

  const items = buildItems(appointments)

  const allAppts = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #F0F0F0',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
        <p style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#111111',
          margin: 0,
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.2px',
        }}>
          Agenda di oggi
        </p>
        <p suppressHydrationWarning style={{
          fontSize: 11,
          color: '#9CA3AF',
          margin: 0,
          textTransform: 'capitalize',
          fontFamily: 'Outfit, sans-serif',
        }}>
          {label}
        </p>
      </div>

      {/* Empty state */}
      {allAppts.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          padding: '32px 0',
        }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>📅</span>
          <p style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#6B7280',
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
          }}>
            Nessun appuntamento oggi
          </p>
          <button
            type="button"
            onClick={() => router.push(`${basePath}/calendario`)}
            style={{
              marginTop: 4,
              padding: '0 20px',
              height: 40,
              background: '#111827',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Aggiungi appuntamento
          </button>
        </div>
      )}

      {/* Scrollable list */}
      {allAppts.length > 0 && (
        <div style={{ overflowY: 'auto', maxHeight: 400, scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item, i) => {
              if (item.type === 'free') {
                return (
                  <div
                    key={`free-${i}`}
                    style={{
                      border: '1px dashed #E5E7EB',
                      borderRadius: 10,
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span style={{
                      fontSize: 12,
                      color: '#CBD5E1',
                      fontFamily: 'Outfit, sans-serif',
                    }}>
                      ⬜ {toTime(item.startMin)} – {toTime(item.startMin + item.durationMin)}&nbsp;·&nbsp;Slot libero
                    </span>
                    <button
                      type="button"
                      disabled
                      title="Disponibile nel piano Pro"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#CBD5E1',
                        background: 'none',
                        border: '1px solid #E9E9E9',
                        borderRadius: 6,
                        cursor: 'not-allowed',
                        padding: '4px 10px',
                        flexShrink: 0,
                        fontFamily: 'Outfit, sans-serif',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Notifica clienti
                    </button>
                  </div>
                )
              }

              const { appt } = item
              const av = avatarColor(appt.client_name)
              const faded = appt.status === 'completed'
              const accent = statusAccent(appt.status)
              const durationMin = Math.round(
                (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000,
              )

              return (
                <div
                  key={appt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`${basePath}/clienti/${appt.client_id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`${basePath}/clienti/${appt.client_id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px 10px 10px',
                    borderRadius: 10,
                    borderLeft: `3px solid ${accent}`,
                    background: '#FAFAFA',
                    opacity: faded ? 0.55 : 1,
                    minHeight: 52,
                    cursor: 'pointer',
                    transition: 'background 120ms',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F3F4F6' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA' }}
                >
                  {/* Time */}
                  <div style={{ width: 50, flexShrink: 0 }}>
                    <p style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#6B7280',
                      margin: 0,
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1.2,
                    }}>
                      {fmt(appt.start_time)}
                    </p>
                    <p style={{
                      fontSize: 10,
                      color: '#CBD5E1',
                      margin: '2px 0 0',
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1,
                    }}>
                      {durLabel(durationMin)}
                    </p>
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: av.bg,
                    color: av.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    fontFamily: 'Outfit, sans-serif',
                  }}>
                    {getInitials(appt.client_name)}
                  </div>

                  {/* Name + services */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111111',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1.3,
                    }}>
                      {appt.client_name}
                    </p>
                    <p style={{
                      fontSize: 11,
                      color: '#9CA3AF',
                      margin: '2px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1,
                    }}>
                      {appt.service_names.join(' + ') || 'Servizio non specificato'}
                      {appt.total_price > 0 ? ` · €${appt.total_price}` : ''}
                    </p>
                  </div>

                  {/* Status badge */}
                  <StatusPill status={appt.status} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
