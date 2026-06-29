import Link from 'next/link'

interface AppointmentPillProps {
  startTime: string
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

export function AppointmentPill({ startTime, detailHref }: AppointmentPillProps) {
  const timeStr = formatTime(startTime)

  return (
    <Link
      href={detailHref}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 10px 10px 10px',
        borderRadius: 16,
        background: '#fff',
        textDecoration: 'none',
        minHeight: 68,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Date box */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f3',
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
            color: '#999',
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
            color: '#111',
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
            color: '#999',
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
            color: '#999',
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
            color: '#111',
            margin: '2px 0 0',
            lineHeight: 1,
          }}
        >
          {timeStr}
        </p>
      </div>

      {/* Right arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 999,
          background: 'var(--brand-primary)',
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </div>
    </Link>
  )
}
