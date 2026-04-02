import React from 'react'
import { getVipScoreLabel, getVipScoreColor } from '../../lib/utils/vipScore'

interface VipScoreBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export const VipScoreBadge: React.FC<VipScoreBadgeProps> = ({
  score,
  showLabel = true,
  size = 'md',
}) => {
  const color = getVipScoreColor(score)
  const label = getVipScoreLabel(score)
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const scoreSize = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${scoreSize} font-bold`}
        style={{ color }}
      >
        {score}
      </div>
      {showLabel && (
        <span className={`${textSize} text-gray-500`}>{label}</span>
      )}
    </div>
  )
}
