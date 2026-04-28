'use client'

import * as React from 'react'

const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  borderRadius: 'var(--card-radius)',
  border: '1px solid var(--card-border)',
  padding: 'var(--card-padding)',
  boxShadow: 'var(--card-shadow)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const valueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginTop: 8,
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>
}

export function KpiLabel({ children }: { children: React.ReactNode }) {
  return <div style={labelStyle}>{children}</div>
}

export function KpiValue({ children }: { children: React.ReactNode }) {
  return <div style={valueStyle}>{children}</div>
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
