import React from 'react'
import type { ChurnStatus } from '../../types/clients'
import { getChurnEmoji, getChurnLabel, getChurnColor } from '../../lib/utils/churn'

interface ChurnIndicatorProps {
  status: ChurnStatus
  daysSince?: number | null
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export const ChurnIndicator: React.FC<ChurnIndicatorProps> = ({
  status,
  daysSince,
  showLabel = true,
  size = 'md',
}) => {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`${size === 'sm' ? 'text-base' : 'text-lg'}`}
        aria-label={`Stato churn: ${getChurnLabel(status)}`}
      >
        {getChurnEmoji(status)}
      </span>
      {showLabel && (
        <div>
          <span
            className={`${textSize} font-medium`}
            style={{ color: getChurnColor(status) }}
          >
            {getChurnLabel(status)}
          </span>
          {daysSince !== undefined && daysSince !== null && (
            <span className="text-xs text-gray-400 ml-1">
              ({daysSince}gg)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
