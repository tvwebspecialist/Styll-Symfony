import Link from 'next/link'

interface AppointmentPillProps {
  startTime: string
  isToday: boolean
  detailHref: string
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value)
  )
}

function formatWeekday(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(new Date(value)).toUpperCase()
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric' }).format(new Date(value))
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(new Date(value)).toUpperCase()
}

export function AppointmentPill({ startTime, isToday, detailHref }: AppointmentPillProps) {
  const timeStr = formatTime(startTime)
  const whenLabel = isToday ? 'Oggi' : 'Domani'

  return (
    <Link
      href={detailHref}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 10px 10px 10px',
        borderRadius: 16,
        background: 'var(--brand-primary)',
        textDecoration: 'none',
        minHeight: 68,
        boxShadow:
          '0 6px 24px color-mix(in srgb, var(--brand-primary) 35%, transparent), 0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Date box */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.20)',
          borderRadius: 10,
          padding: '6px 10px',
          flexShrink: 0,
          minWidth: 48,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.5px',
            lineHeight: 1,
          }}
        >
          {formatWeekday(startTime)}
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.1,
            margin: '1px 0',
          }}
        >
          {formatDay(startTime)}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.5px',
            lineHeight: 1,
          }}
        >
          {formatMonth(startTime)}
        </span>
      </div>

      {/* Center text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            margin: 0,
          }}
        >
          Prossimo appuntamento
        </p>
        <p
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '2px 0 0',
            lineHeight: 1,
          }}
        >
          {timeStr}
        </p>
      </div>

      {/* Right badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(0,0,0,0.22)',
          borderRadius: 999,
          padding: '8px 12px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
          {whenLabel}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}
