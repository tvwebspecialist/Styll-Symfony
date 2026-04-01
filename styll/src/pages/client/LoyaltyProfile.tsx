import React from 'react'
import { useLoyalty } from '../../hooks/useLoyalty'
import { useAuth } from '../../hooks/useAuth'
import { PointsDisplay } from '../../components/loyalty/PointsDisplay'
import { RewardCard } from '../../components/loyalty/RewardCard'
import { StreakCounter } from '../../components/loyalty/StreakCounter'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Star } from 'lucide-react'

const LoyaltyProfile: React.FC = () => {
  const { user } = useAuth()
  // In a real app, we'd look up the client record for this user
  const { clientLoyalty, rewards, isLoading } = useLoyalty()

  if (isLoading) return <PageSpinner />

  if (!clientLoyalty) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon={<Star className="w-12 h-12" />}
          title="Programma fedeltà"
          message="Prenota il tuo primo appuntamento per iniziare a guadagnare punti!"
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">🏆 I tuoi punti</h1>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <PointsDisplay loyalty={clientLoyalty} showProgress />
        <div className="mt-4 pt-4 border-t border-gray-100">
          <StreakCounter
            streak={clientLoyalty.current_streak}
            longestStreak={clientLoyalty.longest_streak}
            thresholdDays={45}
          />
        </div>
      </div>

      {rewards.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Ricompense</h2>
          <div className="space-y-3">
            {rewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                availablePoints={clientLoyalty.available_points}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LoyaltyProfile
