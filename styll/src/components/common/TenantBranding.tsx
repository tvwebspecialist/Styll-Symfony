import React from 'react'
import { useTenant } from '../../hooks/useTenant'

export const TenantBranding: React.FC = () => {
  const { tenant } = useTenant()

  if (!tenant) return null

  return (
    <style>{`
      :root {
        --color-primary: ${tenant.primary_color ?? '#1a1a2e'};
        --color-primary-dark: ${adjustColor(tenant.primary_color ?? '#1a1a2e', -20)};
        --color-secondary: ${tenant.secondary_color ?? '#e94560'};
        --font-family: ${tenant.font_family ?? 'Inter'}, system-ui, sans-serif;
      }
    `}</style>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
