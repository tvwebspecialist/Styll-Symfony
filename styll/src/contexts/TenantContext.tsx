import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import type { Database } from '../types/database'

type Tenant = Database['public']['Tables']['tenants']['Row']
type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
type TenantSubscription = Database['public']['Tables']['tenant_subscriptions']['Row']

interface FeatureFlags {
  bookings: boolean
  loyalty_basic: boolean
  churn_detector: boolean
  gamification: boolean
  qr_walkin: boolean
  win_back_auto: boolean
  ai_coach: boolean
  multi_location: boolean
}

interface TenantContextValue {
  tenant: Tenant | null
  plan: SubscriptionPlan | null
  subscription: TenantSubscription | null
  featureFlags: FeatureFlags
  isLoading: boolean
  loadTenant: (tenantId: string) => Promise<void>
  loadTenantBySlug: (slug: string) => Promise<void>
}

const defaultFlags: FeatureFlags = {
  bookings: true,
  loyalty_basic: true,
  churn_detector: false,
  gamification: false,
  qr_walkin: false,
  win_back_auto: false,
  ai_coach: false,
  multi_location: false,
}

const TenantContext = createContext<TenantContextValue | null>(null)

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(defaultFlags)
  const [isLoading, setIsLoading] = useState(false)

  const applyBranding = (t: Tenant) => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', t.primary_color || '#1a1a2e')
    root.style.setProperty('--color-primary-dark', adjustColor(t.primary_color || '#1a1a2e', -20))
    root.style.setProperty('--color-secondary', t.secondary_color || '#e94560')
    if (t.font_family) {
      root.style.setProperty('--font-family', t.font_family)
    }
  }

  const adjustColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + amount))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  const resolveFeatureFlags = (planFlags: Record<string, boolean>, overrides: Record<string, boolean>): FeatureFlags => {
    return { ...defaultFlags, ...planFlags, ...overrides } as FeatureFlags
  }

  const loadTenantData = async (tenantData: Tenant) => {
    setTenant(tenantData)
    applyBranding(tenantData)

    // Load subscription and plan
    const { data: subData } = await supabase
      .from('tenant_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('tenant_id', tenantData.id)
      .in('status', ['trial', 'active', 'past_due'])
      .single()

    if (subData) {
      setSubscription(subData)
      const planData = (subData as unknown as { subscription_plans: SubscriptionPlan }).subscription_plans
      if (planData) {
        setPlan(planData)
        const planFlags = (planData.feature_flags as Record<string, boolean>) ?? {}
        const overrides = (tenantData.feature_flag_overrides as Record<string, boolean>) ?? {}
        setFeatureFlags(resolveFeatureFlags(planFlags, overrides))
      }
    }
  }

  const loadTenant = async (tenantId: string) => {
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (data) await loadTenantData(data)
    } catch (err) {
      console.error('Error loading tenant:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTenantBySlug = async (slug: string) => {
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (data) await loadTenantData(data)
    } catch (err) {
      console.error('Error loading tenant by slug:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TenantContext.Provider
      value={{
        tenant,
        plan,
        subscription,
        featureFlags,
        isLoading,
        loadTenant,
        loadTenantBySlug,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export const useTenantContext = (): TenantContextValue => {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenantContext must be used within TenantProvider')
  return ctx
}
