import React from 'react'
import { ProgressBar } from '../ui/ProgressBar'
import { getLoyaltyProgress } from '../../lib/utils/loyalty'
import { formatPoints } from '../../lib/utils/loyalty'
import { TIER_INFO } from '../../config/constants'
import type { ClientLoyalty } from '../../types/loyalty'

interface PointsDisplayProps {
  loyalty: ClientLoyalty
  showProgress?: boolean
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
  loyalty,
  showProgress = true,
}) => {
  const progress = getLoyaltyProgress(
    loyalty.available_points,
    loyalty.tier_points_this_year
  )
  const tier = TIER_INFO[loyalty.current_tier as keyof typeof TIER_INFO]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatPoints(loyalty.available_points)}
            </span>
            <span className="text-sm text-gray-500">punti</span>
          </div>
          <p className="text-xs text-gray-400">
            {formatPoints(loyalty.total_points)} totali
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-xl">{tier?.emoji}</span>
            <span className="text-sm font-semibold" style={{ color: tier?.color }}>
              {tier?.label}
            </span>
          </div>
        </div>
      </div>

      {showProgress && progress.nextTier && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Verso {progress.nextTier.emoji} {progress.nextTier.label}</span>
            <span>{formatPoints(progress.pointsToNextTier ?? 0)} punti mancanti</span>
          </div>
          <ProgressBar
            value={progress.progressPercent}
            max={100}
            size="sm"
            color={tier?.color}
          />
        </div>
      )}
    </div>
  )
}
