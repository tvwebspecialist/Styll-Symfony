'use client'

import * as React from 'react'

export interface DashboardTenant {
  tenantId: string
  slug: string
  businessName: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  fontFamily: string | null
  status: string
  settings: Record<string, unknown> | null
}

export interface TenantContextState {
  tenantId: string
  tenant: DashboardTenant
}

const TenantContext = React.createContext<TenantContextState | null>(null)

export function TenantProvider({
  value,
  children,
}: {
  value: TenantContextState
  children: React.ReactNode
}) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenantContext(): TenantContextState {
  const ctx = React.useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenantContext must be used within TenantProvider')
  }
  return ctx
}
