'use client'

import * as React from 'react'

export interface ShadowModeState {
  active: boolean
  tenantId: string | null
  tenantName: string | null
  adminName: string | null
}

const ShadowModeContext = React.createContext<ShadowModeState>({
  active: false,
  tenantId: null,
  tenantName: null,
  adminName: null,
})

export function ShadowModeProvider({
  value,
  children,
}: {
  value: ShadowModeState
  children: React.ReactNode
}) {
  return <ShadowModeContext.Provider value={value}>{children}</ShadowModeContext.Provider>
}

/**
 * Read the current shadow-mode state in a client component. The state is
 * derived server-side and passed through `ShadowModeProvider`; no Supabase
 * calls happen here.
 */
export function useShadowMode(): ShadowModeState {
  return React.useContext(ShadowModeContext)
}
