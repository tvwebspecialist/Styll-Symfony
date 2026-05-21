'use client'

interface Props {
  title: string
  onBack?: () => void
}

export default function BookingTopBar({ title, onBack }: Props) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        height: 56,
        background: '#F7F7F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        boxSizing: 'border-box',
      }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Torna indietro"
          style={{
            position: 'absolute',
            left: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.07)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#111"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : (
        <div style={{ position: 'absolute', left: 16, width: 36 }} />
      )}

      <span
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: '#0a0a0a',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>
    </div>
  )
}
