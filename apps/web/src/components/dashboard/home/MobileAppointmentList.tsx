'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

const WORK_START = 8
const WORK_END   = 20
const MIN_FREE_SLOT = 30

type Item =
  | { type: 'appt'; appt: TodayAppointment }
  | { type: 'free'; startMin: number; endMin: number }

function buildItems(appointments: TodayAppointment[]): Item[] {
  const sorted = [...appointments]
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const items: Item[] = []
  let cursor = WORK_START * 60

  for (const appt of sorted) {
    const startMin = new Date(appt.start_time).getHours() * 60 + new Date(appt.start_time).getMinutes()
    const endMin   = new Date(appt.end_time).getHours()   * 60 + new Date(appt.end_time).getMinutes()
    if (startMin - cursor >= MIN_FREE_SLOT) {
      items.push({ type: 'free', startMin: cursor, endMin: startMin })
    }
    items.push({ type: 'appt', appt })
    cursor = Math.max(cursor, endMin)
  }

  if (WORK_END * 60 - cursor >= MIN_FREE_SLOT) {
    items.push({ type: 'free', startMin: cursor, endMin: WORK_END * 60 })
  }

  return items
}

function toTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function fmt(t: string) {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Confermato', bg: '#dcfce7', color: '#15803d' },
  completed: { label: 'Completato', bg: '#F3F4F6', color: '#6B7280' },
  pending:   { label: 'In attesa',  bg: '#fef3c7', color: '#b45309' },
  cancelled: { label: 'Cancellato', bg: '#fee2e2', color: '#dc2626' },
  no_show:   { label: 'No show',    bg: '#f1f5f9', color: '#64748b' },
}

const AVATAR_BG  = ['#dbeafe', '#ede9fe', '#dcfce7', '#ffedd5', '#fce7f3', '#e0f2fe']
const AVATAR_COL = ['#1e40af', '#6d28d9', '#15803d', '#c2410c', '#be185d', '#0369a1']

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_BG.length
  return { bg: AVATAR_BG[idx]!, text: AVATAR_COL[idx]! }
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

interface Props {
  appointments: TodayAppointment[]
  basePath: string
}

export function MobileAppointmentList({ appointments, basePath }: Props) {
  const router = useRouter()
  const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const items  = buildItems(active)

  return (
    <div>
      {/* Section label */}
      <p style={{
        margin: '0 0 10px',
        fontSize: 13,
        fontWeight: 700,
        color: '#111111',
        fontFamily: 'Outfit, sans-serif',
        letterSpacing: '-0.1px',
      }}>
        Agenda di oggi
      </p>

      {active.length === 0 ? (
        /* Empty state */
        <div style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #F0F0F0',
          padding: '28px 16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>📅</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#6B7280', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>
            Nessun appuntamento oggi
          </p>
          <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            Usa il pulsante + per aggiungerne uno
          </p>
        </div>
      ) : (
        /* List — scrolls with document, no nested overflow */
        <div style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #F0F0F0',
          overflow: 'hidden',
        }}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            const borderBottom = isLast ? 'none' : '1px solid #F5F5F5'

            if (item.type === 'free') {
              return (
                <div
                  key={`free-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 16px',
                    background: '#FAFAFA',
                    borderBottom,
                    minHeight: 44,
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>⬜</span>
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    color: '#CBD5E1',
                    fontFamily: 'Outfit, sans-serif',
                    lineHeight: 1.3,
                  }}>
                    Slot libero {toTime(item.startMin)}–{toTime(item.endMin)}
                  </p>
                </div>
              )
            }

            const { appt } = item
            const av     = avatarColor(appt.client_name)
            const status = STATUS_CFG[appt.status] ?? { label: appt.status, bg: '#f1f5f9', color: '#64748b' }
            const faded  = appt.status === 'completed'

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
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom,
                  minHeight: 72,
                  cursor: 'pointer',
                  opacity: faded ? 0.6 : 1,
                  outline: 'none',
                  WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                  transition: 'background 80ms',
                  background: 'transparent',
                  boxSizing: 'border-box',
                }}
                onTouchStart={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB' }}
                onTouchEnd={(e)   => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                onTouchCancel={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {/* Time */}
                <div style={{ width: 44, flexShrink: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#111111',
                    fontFamily: 'Outfit, sans-serif',
                    lineHeight: 1.2,
                    letterSpacing: '-0.2px',
                  }}>
                    {fmt(appt.start_time)}
                  </p>
                </div>

                {/* Avatar */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: av.bg,
                  color: av.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  {getInitials(appt.client_name)}
                </div>

                {/* Name + service */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#111111',
                    fontFamily: 'Outfit, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}>
                    {appt.client_name}
                  </p>
                  <p style={{
                    margin: '2px 0 0',
                    fontSize: 13,
                    color: '#9CA3AF',
                    fontFamily: 'Outfit, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}>
                    {appt.service_names[0] ?? 'Servizio'}
                    {appt.service_names.length > 1 ? ` +${appt.service_names.length - 1}` : ''}
                  </p>
                </div>

                {/* Badge + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 99,
                    background: status.bg,
                    color: status.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                    fontFamily: 'Outfit, sans-serif',
                  }}>
                    {status.label}
                  </span>
                  <ChevronRight size={16} color="#D1D5DB" strokeWidth={2} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
