import * as React from 'react'

interface Props {
  children: React.ReactNode
}

export function BentoGrid({ children }: Props) {
  return (
    <div className="home-bento-grid">
      {children}
    </div>
  )
}
