'use client'

import * as React from 'react'

export const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '12px 16px',
  background: '#F9F9F9',
  borderRadius: 12,
  marginBottom: 16,
  flexWrap: 'wrap',
  alignItems: 'flex-end',
}

export const filterInputStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #e5e5e5',
  fontSize: 15,
  background: '#fafafa',
  color: '#222222',
  outline: 'none',
}

export const filterLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  color: '#B0B0B0',
  letterSpacing: '0.06em',
  fontWeight: 500,
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="vendite-filter-bar" style={filterBarStyle}>
      {children}
    </div>
  )
}

export function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={filterLabelStyle}>{label}</span>
      {children}
    </div>
  )
}

export interface EmptyStateProps {
  Icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  subtitle?: string
  cta?: { label: string; href: string }
}

export function EmptyState({ Icon, title, subtitle, cta }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <Icon size={64} color="#E0E0E0" />
      <div style={{ fontSize: 16, fontWeight: 600, color: '#222222' }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 14, color: '#B0B0B0', maxWidth: 360 }}>{subtitle}</div>
      )}
      {cta && (
        <a
          href={cta.href}
          style={{
            marginTop: 8,
            padding: '10px 18px',
            borderRadius: 100,
            background: '#222222',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {cta.label}
        </a>
      )}
    </div>
  )
}
