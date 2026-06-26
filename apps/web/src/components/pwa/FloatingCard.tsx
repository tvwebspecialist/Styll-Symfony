import { CSSProperties, ReactNode } from 'react'

interface FloatingCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function FloatingCard({ children, className, style }: FloatingCardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'white',
        borderRadius: 44,
        margin: '0 8px',
        padding: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
