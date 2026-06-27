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
        padding: '8px 8px 8px 14px',
        borderRadius: 999,
        background: 'var(--brand-primary)',
        textDecoration: 'none',
        minHeight: 64,
        boxShadow:
          '0 6px 24px color-mix(in srgb, var(--brand-primary) 35%, transparent), 0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Left icon circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ✂️
      </div>

      {/* Center text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.65)',
            textTransform: 'uppercase',
            letterSpacing: '0.7px',
            margin: 0,
          }}
        >
          Appuntamento
        </p>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#FFFFFF',
            margin: '3px 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {whenLabel} · {timeStr}
        </p>
      </div>

      {/* Right badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'rgba(0,0,0,0.22)',
          borderRadius: 999,
          padding: '9px 14px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
          {isToday ? 'Oggi 🔔' : 'Domani'}
        </span>
        <svg
          width="12"
          height="12"
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
