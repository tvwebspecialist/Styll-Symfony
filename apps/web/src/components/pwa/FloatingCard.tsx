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
        borderRadius: 24,
        margin: '0 12px',
        padding: 20,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
