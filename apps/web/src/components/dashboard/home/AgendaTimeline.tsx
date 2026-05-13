'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  appointments: TodayAppointment[]
  basePath: string
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

const AVATAR_BG = ['#dbeafe', '#ede9fe', '#dcfce7', '#ffedd5', '#fce7f3', '#e0f2fe']
const AVATAR_TEXT = ['#1e40af', '#6d28d9', '#15803d', '#c2410c', '#be185d', '#0369a1']
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_BG.length
  return { bg: AVATAR_BG[idx]!, text: AVATAR_TEXT[idx]! }
}

function statusLeft(status: string): string {
  if (status === 'confirmed') return '#22c55e'
  if (status === 'completed') return '#22c55e'
  if (status === 'pending') return '#f59e0b'
  if (status === 'cancelled') return '#ef4444'
  return '#e2e8f0'
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    confirmed:  { label: 'Confermato', bg: '#dcfce7', color: '#15803d' },
    completed:  { label: 'Completato', bg: '#f0fdf4', color: '#16a34a' },
    pending:    { label: 'In attesa',  bg: '#fef3c7', color: '#b45309' },
    cancelled:  { label: 'Cancellato', bg: '#fee2e2', color: '#dc2626' },
    no_show:    { label: 'No show',    bg: '#f1f5f9', color: '#64748b' },
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
      }}
    >
      {s.label}
    </span>
  )
}

const CARD_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
}

export function AgendaTimeline({ appointments, basePath }: Props) {
  const router = useRouter()
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  const label = todayLabel()

  // ── Empty state ─────────────────────────────────────────────
  if (sorted.length === 0) {
    return (
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111111', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
            Oggi
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, textTransform: 'capitalize', fontFamily: 'Outfit, sans-serif' }}>
            {label}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '36px 0' }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>📅</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#6B7280', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
            Nessun appuntamento oggi
          </p>
          <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, fontFamily: 'Outfit, sans-serif', textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>
            La tua agenda è libera. Aggiungine uno per iniziare.
          </p>
          <button
            type="button"
            onClick={() => router.push(`${basePath}/calendario`)}
            style={{
              marginTop: 8,
              padding: '0 24px',
              height: 44,
              background: '#111827',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Aggiungi appuntamento
          </button>
        </div>
      </div>
    )
  }

  // ── Timeline ─────────────────────────────────────────────────
  return (
    <div style={CARD_STYLE}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111111', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
          Oggi
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, textTransform: 'capitalize', fontFamily: 'Outfit, sans-serif' }}>
          {label}
        </p>
      </div>

      {/* Appointment rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((appt) => {
          const av = avatarColor(appt.client_name)
          const faded = appt.status === 'completed' || appt.status === 'cancelled'
          const borderColor = statusLeft(appt.status)

          return (
            <div
              key={appt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px 10px 12px',
                borderRadius: 12,
                borderLeft: `3px solid ${borderColor}`,
                background: faded ? 'transparent' : '#FAFAFA',
                opacity: faded ? 0.45 : 1,
                minHeight: 52,
                cursor: 'pointer',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => {
                if (!faded) (e.currentTarget as HTMLDivElement).style.background = '#F3F4F6'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = faded ? 'transparent' : '#FAFAFA'
              }}
            >
              {/* Time range */}
              <div style={{ width: 54, flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', margin: 0, fontFamily: 'ui-monospace, monospace', lineHeight: 1.2 }}>
                  {fmt(appt.start_time)}
                </p>
                <p style={{ fontSize: 10, color: '#CBD5E1', margin: '2px 0 0', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
                  {fmt(appt.end_time)}
                </p>
              </div>

              {/* Avatar */}
              <div
                style={{
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
                }}
              >
                {getInitials(appt.client_name)}
              </div>

              {/* Name + service */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif', lineHeight: 1.3 }}>
                  {appt.client_name}
                </p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                  {appt.service_names.join(' + ') || 'Servizio non specificato'}
                  {appt.total_price > 0 ? ` · €${appt.total_price}` : ''}
                </p>
              </div>

              {/* Status */}
              <StatusPill status={appt.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
