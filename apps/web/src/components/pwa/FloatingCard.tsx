import { CSSProperties, ReactNode } from 'react'

/** Shell-only: bg + radius + shadow. No margin/padding — for motion.div sheets that manage their own layout. */
export const floatingCardShellStyle = {
  background: 'white',
  borderRadius: 44,
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
} as const satisfies CSSProperties

/** Full style including margin + padding. For static <FloatingCard> usage. */
export const floatingCardStyle = {
  ...floatingCardShellStyle,
  margin: '0 8px',
  padding: 24,
} as const satisfies CSSProperties

interface FloatingCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function FloatingCard({ children, className, style }: FloatingCardProps) {
  return (
    <div
      className={className}
      style={{ ...floatingCardStyle, ...style }}
    >
      {children}
    </div>
  )
}
