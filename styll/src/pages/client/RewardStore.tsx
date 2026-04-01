import React from 'react'
import { useLoyalty } from '../../hooks/useLoyalty'
import { RewardCard } from '../../components/loyalty/RewardCard'
import { PageSpinner } from '../../components/ui/Spinner'

const RewardStore: React.FC = () => {
  const { rewards, clientLoyalty, isLoading } = useLoyalty()

  if (isLoading) return <PageSpinner />

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">🎁 Negozio premi</h1>
        {clientLoyalty && (
          <p className="text-sm text-gray-500 mt-1">
            Hai <span className="font-semibold text-gray-900">{clientLoyalty.available_points}</span> punti disponibili
          </p>
        )}
      </div>

      {rewards.map(reward => (
        <RewardCard
          key={reward.id}
          reward={reward}
          availablePoints={clientLoyalty?.available_points ?? 0}
        />
      ))}
    </div>
  )
}

export default RewardStore
