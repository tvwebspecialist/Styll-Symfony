import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './useAuth'
import { useUIContext } from '../contexts/UIContext'
import type { LoyaltyConfig, Reward, ClientLoyalty, LoyaltyTransaction } from '../types/loyalty'

export const useLoyalty = (clientId?: string) => {
  const { tenantId, staffMember } = useAuth()
  const { showToast } = useUIContext()
  const [config, setConfig] = useState<LoyaltyConfig | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [clientLoyalty, setClientLoyalty] = useState<ClientLoyalty | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setIsLoading(true)
    try {
      // Load config
      const { data: configData } = await supabase
        .from('loyalty_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('ended_at', null)
        .single()

      setConfig(configData)

      // Load rewards
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order')

      setRewards(rewardsData ?? [])

      // If clientId, load client loyalty and transactions
      if (clientId) {
        const { data: loyaltyData } = await supabase
          .from('client_loyalty')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .single()

        setClientLoyalty(loyaltyData)

        const { data: txData } = await supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(20)

        setTransactions(txData ?? [])
      }
    } catch (err: unknown) {
      console.error('Error loading loyalty:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, clientId])

  useEffect(() => {
    load()
  }, [load])

  const assignPoints = async (
    targetClientId: string,
    points: number,
    description: string,
    appointmentId?: string
  ) => {
    if (!tenantId || !staffMember) return { error: 'Non autorizzato' }
    try {
      const { error: err } = await supabase.from('loyalty_transactions').insert({
        tenant_id: tenantId,
        client_id: targetClientId,
        type: 'bonus',
        points,
        description,
        appointment_id: appointmentId,
        staff_id: staffMember.id,
        loyalty_config_version: config?.version,
      })

      if (err) throw err

      // Update client_loyalty totals
      if (clientLoyalty) {
        await supabase
          .from('client_loyalty')
          .update({
            total_points: clientLoyalty.total_points + points,
            available_points: clientLoyalty.available_points + points,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientLoyalty.id)
      }

      showToast({ type: 'success', title: `${points} punti assegnati` })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  const redeemReward = async (targetClientId: string, rewardId: string) => {
    if (!tenantId || !staffMember) return { error: 'Non autorizzato' }
    const reward = rewards.find(r => r.id === rewardId)
    if (!reward) return { error: 'Ricompensa non trovata' }
    if (!clientLoyalty || clientLoyalty.available_points < reward.points_cost) {
      return { error: 'Punti insufficienti' }
    }

    try {
      // Record redemption
      await supabase.from('reward_redemptions').insert({
        tenant_id: tenantId,
        client_id: targetClientId,
        reward_id: rewardId,
        points_spent: reward.points_cost,
        confirmed_by: staffMember.id,
      })

      // Record transaction
      await supabase.from('loyalty_transactions').insert({
        tenant_id: tenantId,
        client_id: targetClientId,
        type: 'redeem',
        points: -reward.points_cost,
        description: `Riscatto: ${reward.name}`,
        staff_id: staffMember.id,
      })

      // Update available points
      await supabase
        .from('client_loyalty')
        .update({
          available_points: clientLoyalty.available_points - reward.points_cost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientLoyalty.id)

      showToast({ type: 'success', title: `Ricompensa riscattata: ${reward.name}` })
      await load()
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Qualcosa non ha funzionato. Riproviamo?'
      showToast({ type: 'error', title: 'Errore', message: msg })
      return { error: msg }
    }
  }

  return {
    config,
    rewards,
    clientLoyalty,
    transactions,
    isLoading,
    assignPoints,
    redeemReward,
    reload: load,
  }
}
