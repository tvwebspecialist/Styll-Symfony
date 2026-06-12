'use client'

export interface BottomCTAPrimary {
  label: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

export interface BottomCTASecondary {
  label: string
  onClick: () => void
}

export interface BottomCTAProps {
  primary: BottomCTAPrimary
  secondary?: BottomCTASecondary
  tenantPrimary?: string
  /** CSS length to raise the bar above a visible bottom nav, e.g. 'calc(var(--bottom-nav-height, 80px) + 16px)' */
  bottomOffset?: string
}

export function BottomCTA({ primary, secondary, tenantPrimary, bottomOffset }: BottomCTAProps) {
  const brandColor = tenantPrimary ?? '#1a1a1a'
  const isDisabled = primary.disabled === true || primary.loading === true
  const spacerHeight = bottomOffset
    ? `calc(76px + max(12px, env(safe-area-inset-bottom, 0px)) + ${bottomOffset})`
    : 'calc(76px + max(12px, env(safe-area-inset-bottom, 0px)))'

  return (
    <>
      {/* Spacer so scrollable content clears the fixed bar */}
      <div aria-hidden="true" style={{ height: spacerHeight }} />

      <div
        style={{
          position: 'fixed',
          bottom: bottomOffset ?? 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          gap: 10,
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          background: 'rgba(247,247,247,0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
        }}
      >
        {secondary ? (
          <button
            type="button"
            onClick={secondary.onClick}
            style={{
              flex: '0 0 28%',
              minHeight: 52,
              border: 'none',
              borderRadius: 14,
              background: 'transparent',
              color: 'rgba(0,0,0,0.45)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {secondary.label}
          </button>
        ) : null}

        <button
          type="button"
          onClick={isDisabled ? undefined : primary.onClick}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          style={{
            flex: 1,
            minHeight: 52,
            border: 'none',
            borderRadius: 14,
            background: brandColor,
            color: 'white',
            fontSize: 15,
            fontWeight: 700,
            cursor: isDisabled ? 'default' : 'pointer',
            opacity: isDisabled ? 0.45 : 1,
            transition: 'opacity 200ms',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {primary.loading ? (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ animation: 'bottomCtaSpin 0.75s linear infinite', flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              {primary.label}
            </>
          ) : (
            primary.label
          )}
        </button>
      </div>

      <style>{`@keyframes bottomCtaSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
