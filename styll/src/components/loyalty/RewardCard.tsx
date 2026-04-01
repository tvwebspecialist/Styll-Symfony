import React from 'react'
import { Gift } from 'lucide-react'
import { Button } from '../ui/Button'
import { formatPoints } from '../../lib/utils/loyalty'
import type { Reward } from '../../types/loyalty'

interface RewardCardProps {
  reward: Reward
  availablePoints: number
  onRedeem?: (rewardId: string) => void
  isLoading?: boolean
}

export const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  availablePoints,
  onRedeem,
  isLoading = false,
}) => {
  const canRedeem = availablePoints >= reward.points_cost
  const progressPercent = Math.min(100, (availablePoints / reward.points_cost) * 100)

  return (
    <div className={`
      border rounded-xl p-4 transition-all
      ${canRedeem ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${canRedeem ? 'bg-green-100' : 'bg-gray-100'}
          `}>
            <Gift className={`w-5 h-5 ${canRedeem ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{reward.name}</p>
            {reward.description && (
              <p className="text-xs text-gray-500 mt-0.5">{reward.description}</p>
            )}
            <p className="text-xs font-medium text-gray-700 mt-1">
              {formatPoints(reward.points_cost)} punti
            </p>
          </div>
        </div>

        {onRedeem && (
          <Button
            size="sm"
            variant={canRedeem ? 'primary' : 'outline'}
            disabled={!canRedeem}
            onClick={() => onRedeem(reward.id)}
            isLoading={isLoading}
          >
            {canRedeem ? 'Riscatta' : 'Mancano ' + formatPoints(reward.points_cost - availablePoints)}
          </Button>
        )}
      </div>

      {!canRedeem && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
